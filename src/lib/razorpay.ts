import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay integration.
 *
 * Two independent confirmations of payment:
 *   1. The browser handoff — Razorpay Checkout returns a signature we verify
 *      in /api/payments/verify. Fast, but a closed tab loses it.
 *   2. The webhook — Razorpay calls /api/payments/webhook server-to-server.
 *      Authoritative, and the reason an order still gets marked paid when the
 *      customer's connection drops mid-redirect.
 *
 * Both paths are idempotent, so whichever lands first wins and the second is
 * a no-op.
 */

export class PaymentError extends Error {}

export const isRazorpayConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

function credentials() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new PaymentError(
      "Razorpay is not configured. Set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or pay by cash on delivery.",
    );
  }
  return { keyId, keySecret };
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

/**
 * Creates the Razorpay order. Called from the server only, after the cart has
 * been re-priced — `amountPaise` is never taken from the client.
 */
export async function createRazorpayOrder(
  amountPaise: number,
  receipt: string,
  notes: Record<string, string> = {},
): Promise<RazorpayOrder> {
  const { keyId, keySecret } = credentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes,
      payment_capture: 1,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[razorpay] order create failed", res.status, body);
    throw new PaymentError("Could not start the payment. Please try again.");
  }
  return (await res.json()) as RazorpayOrder;
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Verifies the signature Razorpay Checkout hands back in the browser. */
export function verifyCheckoutSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  const { keySecret } = credentials();
  const expected = createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

/** Verifies the X-Razorpay-Signature header on a webhook POST. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new PaymentError("RAZORPAY_WEBHOOK_SECRET is not set — refusing to trust the webhook.");
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
