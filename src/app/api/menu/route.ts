import { apiError, ok } from "@/lib/api";
import { db } from "@/lib/supabase";
import { getStoreSettings } from "@/lib/pricing";
import { istMinutesNow, isWindowOpen } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The whole menu in one request. It is small (≈50 items) and every page needs
 * it, so paginating would cost more round trips than it saves bytes.
 */
export async function GET() {
  try {
    const supabase = db();
    const now = istMinutesNow();

    const [{ data: categories, error: catErr }, { data: combos, error: comboErr }, settings] =
      await Promise.all([
        supabase
          .from("categories")
          .select(
            "id, slug, name, blurb, window_label, available_from, available_to, sort_order, " +
              "menu_items(id, slug, name, description, note, options, price_paise, is_favourite, is_available, sort_order)",
          )
          .eq("is_active", true)
          .order("sort_order"),
        supabase.from("combos").select("*").order("sort_order"),
        getStoreSettings(),
      ]);

    if (catErr) throw catErr;
    if (comboErr) throw comboErr;

    type RawCategory = {
      sort_order: number;
      available_from: number | null;
      available_to: number | null;
      menu_items: { sort_order: number }[];
    };

    const shaped = ((categories ?? []) as unknown as RawCategory[])
      .map((c) => ({
        ...c,
        // Supabase does not order nested selects, so sort the items here.
        items: [...(c.menu_items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
        menu_items: undefined,
        is_open_now: isWindowOpen(c.available_from, c.available_to, now),
      }))
      .sort((a, b) => a.sort_order - b.sort_order);

    const shapedCombos = ((combos ?? []) as { available_from: number | null; available_to: number | null }[]).map(
      (c) => ({ ...c, is_open_now: isWindowOpen(c.available_from, c.available_to, now) }),
    );

    return ok({
      categories: shaped,
      combos: shapedCombos,
      settings,
      serverMinutes: now,
    });
  } catch (err) {
    return apiError(err);
  }
}
