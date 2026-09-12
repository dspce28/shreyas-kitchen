import { db } from "./supabase";
import { NEXT_STATUSES, type OrderStatus } from "./types";
import { CartError } from "./pricing";

export const ORDER_SELECT =
  "id, order_no, status, payment_method, payment_status, ship_name, ship_phone, ship_line1, " +
  "ship_line2, ship_landmark, ship_city, ship_pincode, subtotal_paise, delivery_fee_paise, " +
  "total_paise, customer_note, reject_reason, razorpay_order_id, placed_at, decided_at, completed_at, " +
  "order_items(id, kind, ref_slug, name_snapshot, detail, unit_paise, qty, line_paise), " +
  "order_events(id, status, note, actor, created_at)";

export const ADMIN_ORDER_SELECT = ORDER_SELECT + ", customers(name, phone)";

/** Events come back unordered from the nested select; the timeline needs them sorted. */
export function sortEvents<T extends { order_events?: { created_at: string }[] }>(order: T): T {
  if (order.order_events) {
    order.order_events = [...order.order_events].sort(
      (a, b) => +new Date(a.created_at) - +new Date(b.created_at),
    );
  }
  return order;
}

/**
 * Moves an order to a new status, enforcing the state machine in types.ts.
 *
 * Only legal transitions are allowed, so a stale admin tab cannot resurrect a
 * delivered order or accept one that was already rejected.
 */
export async function transitionOrder(opts: {
  orderId: string;
  to: OrderStatus;
  actor: "admin" | "customer" | "system";
  note?: string;
  rejectReason?: string;
}): Promise<{ order_no: string; status: OrderStatus }> {
  const supabase = db();

  const { data: current, error: readErr } = await supabase
    .from("orders")
    .select("id, order_no, status, payment_method, payment_status")
    .eq("id", opts.orderId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!current) throw new CartError("Order not found.");

  const from = current.status as OrderStatus;
  if (from === opts.to) {
    return { order_no: current.order_no as string, status: from };
  }
  if (!NEXT_STATUSES[from].includes(opts.to)) {
    throw new CartError(`An order that is "${from}" cannot move to "${opts.to}".`);
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: opts.to };
  if (opts.to === "accepted" || opts.to === "rejected") patch.decided_at = now;
  if (opts.to === "delivered" || opts.to === "rejected" || opts.to === "cancelled") {
    patch.completed_at = now;
  }
  if (opts.to === "rejected") patch.reject_reason = opts.rejectReason ?? null;
  // A delivered COD order is, by definition, paid.
  if (opts.to === "delivered" && current.payment_method === "cod") {
    patch.payment_status = "paid";
  }

  // Compare-and-set on the status we read, so two admins clicking at once
  // cannot both apply a transition.
  const { data: updated, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", opts.orderId)
    .eq("status", from)
    .select("order_no, status")
    .maybeSingle();
  if (error) throw error;
  if (!updated) throw new CartError("This order was just updated elsewhere. Refresh and try again.");

  await supabase.from("order_events").insert({
    order_id: opts.orderId,
    status: opts.to,
    actor: opts.actor,
    note: opts.note ?? opts.rejectReason ?? null,
  });

  return { order_no: updated.order_no as string, status: updated.status as OrderStatus };
}

/**
 * Marks an order paid. Called from both the browser handoff and the webhook,
 * so it must be safe to run twice.
 */
export async function markPaid(razorpayOrderId: string, razorpayPaymentId: string): Promise<void> {
  const supabase = db();

  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();
  if (!order) return;
  if (order.payment_status === "paid") return; // already handled

  await supabase
    .from("orders")
    .update({ payment_status: "paid", razorpay_payment_id: razorpayPaymentId })
    .eq("id", order.id)
    .neq("payment_status", "paid");

  await supabase.from("order_events").insert({
    order_id: order.id,
    status: "pending",
    actor: "system",
    note: "Payment received.",
  });
}

export async function markPaymentFailed(razorpayOrderId: string): Promise<void> {
  const supabase = db();
  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();
  if (!order || order.payment_status === "paid") return;

  await supabase.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
  await supabase.from("order_events").insert({
    order_id: order.id,
    status: "pending",
    actor: "system",
    note: "Payment failed.",
  });
}
