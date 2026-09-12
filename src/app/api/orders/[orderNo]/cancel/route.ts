import { apiError, ok, readJson } from "@/lib/api";
import { requireSession, ForbiddenError } from "@/lib/session";
import { db } from "@/lib/supabase";
import { CartError } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ orderNo: string }> };

/**
 * A customer may call off an order only while it is still `pending` — once the
 * kitchen has accepted it, food is being cooked and cancelling is a phone call,
 * not a button.
 */
export async function POST(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { orderNo } = await params;
    const { reason } = await readJson<{ reason?: string }>(req).catch(() => ({ reason: undefined }));

    const { data: order } = await db()
      .from("orders")
      .select("id, status")
      .eq("order_no", orderNo)
      .eq("customer_id", session.customerId)
      .maybeSingle();

    if (!order) throw new ForbiddenError("Order not found.");
    if (order.status !== "pending") {
      throw new CartError(
        "This order has already been accepted. Please call the kitchen to cancel it.",
      );
    }

    // `pending → cancelled` is not in the admin state machine, so apply it
    // directly rather than through transitionOrder's allow-list.
    const now = new Date().toISOString();
    const { data: updated } = await db()
      .from("orders")
      .update({ status: "cancelled", completed_at: now, reject_reason: "Cancelled by customer" })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("order_no, status")
      .maybeSingle();

    if (!updated) {
      throw new CartError("This order was just updated. Refresh and try again.");
    }

    await db().from("order_events").insert({
      order_id: order.id,
      status: "cancelled",
      actor: "customer",
      note: (reason ?? "").trim().slice(0, 200) || "Cancelled by customer.",
    });

    return ok({ order: updated });
  } catch (err) {
    return apiError(err);
  }
}
