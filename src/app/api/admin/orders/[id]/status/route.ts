import { apiError, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { transitionOrder } from "@/lib/orders";
import { CartError } from "@/lib/pricing";
import type { OrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const VALID: OrderStatus[] = [
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "rejected",
  "cancelled",
];

/**
 * The accept/reject button and every step after it. `transitionOrder`
 * enforces the state machine and writes the timeline event the customer's
 * tracking page reads.
 */
export async function POST(req: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { status, note, reason } = await readJson<{
      status?: OrderStatus;
      note?: string;
      reason?: string;
    }>(req);

    if (!status || !VALID.includes(status)) {
      throw new CartError("Unknown status.");
    }
    if (status === "rejected" && !(reason ?? "").trim()) {
      throw new CartError("Give the customer a reason for the rejection.");
    }

    const result = await transitionOrder({
      orderId: id,
      to: status,
      actor: "admin",
      note: (note ?? "").trim().slice(0, 300) || undefined,
      rejectReason: (reason ?? "").trim().slice(0, 300) || undefined,
    });

    console.info(`[admin] ${admin.phone} set ${result.order_no} → ${result.status}`);
    return ok({ order: result });
  } catch (err) {
    return apiError(err);
  }
}
