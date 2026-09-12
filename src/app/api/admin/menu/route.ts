import { apiError, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/supabase";
import { CartError } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Patch {
  kind: "item" | "combo";
  id: string;
  /** Rupees, as typed in the admin form. Converted to paise here. */
  price?: number;
  is_available?: boolean;
}

/**
 * Bulk price / availability editor.
 *
 * Setting a price also sets `price_locked`, which is what stops a later
 * `npm run seed` from overwriting real prices with the placeholders in
 * data/menu.ts.
 */
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { changes } = await readJson<{ changes?: Patch[] }>(req);

    if (!Array.isArray(changes) || changes.length === 0) {
      throw new CartError("Nothing to save.");
    }
    if (changes.length > 200) throw new CartError("Too many changes at once.");

    const supabase = db();
    const now = new Date().toISOString();
    let updated = 0;

    for (const c of changes) {
      const table = c.kind === "combo" ? "combos" : "menu_items";
      const patch: Record<string, unknown> = { updated_at: now };

      if (c.price !== undefined) {
        const price = Number(c.price);
        if (!Number.isFinite(price) || price < 0 || price > 100000) {
          throw new CartError(`"${price}" is not a valid price.`);
        }
        patch.price_paise = Math.round(price * 100);
        patch.price_locked = true;
      }
      if (c.is_available !== undefined) patch.is_available = Boolean(c.is_available);

      // Only `updated_at` would change — skip the round trip.
      if (Object.keys(patch).length === 1) continue;

      const { error } = await supabase.from(table).update(patch).eq("id", c.id);
      if (error) throw error;
      updated++;
    }

    return ok({ updated });
  } catch (err) {
    return apiError(err);
  }
}

/** Store-wide switches: accepting orders, delivery fee, free-delivery threshold. */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await readJson<{
      is_accepting_orders?: boolean;
      closed_message?: string;
      delivery_fee?: number;
      free_delivery_above?: number;
    }>(req);

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.is_accepting_orders !== undefined) {
      patch.is_accepting_orders = Boolean(body.is_accepting_orders);
    }
    if (body.closed_message !== undefined) {
      patch.closed_message = String(body.closed_message).slice(0, 300);
    }
    if (body.delivery_fee !== undefined) {
      patch.delivery_fee_paise = Math.max(0, Math.round(Number(body.delivery_fee) * 100));
    }
    if (body.free_delivery_above !== undefined) {
      patch.free_delivery_above_paise = Math.max(
        0,
        Math.round(Number(body.free_delivery_above) * 100),
      );
    }

    const { data, error } = await db()
      .from("store_settings")
      .update(patch)
      .eq("id", 1)
      .select("is_accepting_orders, closed_message, delivery_fee_paise, free_delivery_above_paise")
      .single();
    if (error) throw error;

    return ok({ settings: data });
  } catch (err) {
    return apiError(err);
  }
}
