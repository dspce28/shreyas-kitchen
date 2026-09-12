import { apiError, ok } from "@/lib/api";
import { requireSession, ForbiddenError } from "@/lib/session";
import { db } from "@/lib/supabase";
import { ORDER_SELECT, sortEvents } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ orderNo: string }> };

/**
 * The tracking page polls this. Scoped to the signed-in customer, so knowing
 * an order number is not enough to read someone else's order.
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { orderNo } = await params;

    const { data, error } = await db()
      .from("orders")
      .select(ORDER_SELECT)
      .eq("order_no", orderNo)
      .eq("customer_id", session.customerId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ForbiddenError("Order not found.");

    return ok({ order: sortEvents(data as unknown as { order_events?: { created_at: string }[] }) });
  } catch (err) {
    return apiError(err);
  }
}
