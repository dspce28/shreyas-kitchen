import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { markPaid, markPaymentFailed } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay → us, server to server. This is the authoritative record of
 * payment: it arrives even when the customer closes the tab mid-redirect.
 *
 * Configure in the Razorpay dashboard:
 *   URL    https://your-domain/api/payments/webhook
 *   Events payment.captured, payment.failed
 *   Secret must match RAZORPAY_WEBHOOK_SECRET
 *
 * The signature is computed over the RAW body, so it must be read as text
 * before any JSON parsing.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  try {
    if (!verifyWebhookSignature(raw, signature)) {
      console.warn("[webhook] rejected: bad signature");
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }
  } catch (err) {
    console.error("[webhook] cannot verify", err);
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  const entity = event.payload?.payment?.entity;
  const orderId = entity?.order_id;
  const paymentId = entity?.id;

  try {
    if (event.event === "payment.captured" && orderId && paymentId) {
      await markPaid(orderId, paymentId);
    } else if (event.event === "payment.failed" && orderId) {
      await markPaymentFailed(orderId);
    }
  } catch (err) {
    // A 500 makes Razorpay retry, which is what we want for a transient
    // database error — the handlers are idempotent, so a replay is harmless.
    console.error("[webhook] handler failed", err);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
