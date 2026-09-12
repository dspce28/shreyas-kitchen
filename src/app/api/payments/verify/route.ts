import { apiError, ok, readJson } from "@/lib/api";
import { requireSession, ForbiddenError } from "@/lib/session";
import { db } from "@/lib/supabase";
import { verifyCheckoutSignature, PaymentError } from "@/lib/razorpay";
import { markPaid, markPaymentFailed } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called by the browser immediately after Razorpay Checkout succeeds.
 *
 * This is a convenience path — it lets the customer see "paid" without waiting
 * for the webhook. It is still fully verified: an unsigned or mis-signed
 * payload is rejected and the order stays unpaid.
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await readJson<{
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    }>(req);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new PaymentError("Incomplete payment response.");
    }

    // The order must belong to the caller before we touch it.
    const { data: order } = await db()
      .from("orders")
      .select("id, order_no, customer_id")
      .eq("razorpay_order_id", razorpay_order_id)
      .maybeSingle();
    if (!order || order.customer_id !== session.customerId) {
      throw new ForbiddenError("Order not found.");
    }

    if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      await markPaymentFailed(razorpay_order_id);
      throw new PaymentError("Payment could not be verified.");
    }

    await markPaid(razorpay_order_id, razorpay_payment_id);
    return ok({ ok: true, order_no: order.order_no });
  } catch (err) {
    return apiError(err);
  }
}
