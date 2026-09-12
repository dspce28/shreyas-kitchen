import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/supabase";
import { ADMIN_ORDER_SELECT, sortEvents } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIVE: OrderStatus[] = ["pending", "accepted", "preparing", "ready", "out_for_delivery"];

/**
 * The kitchen queue. `?scope=live` (default) returns everything still in
 * flight, oldest first — the order they should be cooked in. `?scope=all`
 * returns recent history, newest first.
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const scope = new URL(req.url).searchParams.get("scope") ?? "live";

    const query = db().from("orders").select(ADMIN_ORDER_SELECT);

    const { data, error } =
      scope === "all"
        ? await query.order("placed_at", { ascending: false }).limit(100)
        : await query.in("status", LIVE).order("placed_at", { ascending: true }).limit(100);

    if (error) throw error;

    const orders = ((data ?? []) as unknown as { order_events?: { created_at: string }[] }[]).map(
      sortEvents,
    );

    return ok({ orders, scope });
  } catch (err) {
    return apiError(err);
  }
}
