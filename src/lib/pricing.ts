import { db } from "./supabase";
import { isWindowOpen } from "./utils";
import type { ApiComboSlot, StoreSettings } from "./types";

/**
 * Server-side cart pricing.
 *
 * The client sends only WHAT was ordered — slugs, quantities and choices.
 * Every price, name and availability check is resolved here against the
 * database. A tampered client can change what it asks for, never what it pays.
 */

export interface CartLineInput {
  kind: "item" | "combo";
  slug: string;
  qty: number;
  /** For items with variants, e.g. "Red sauce". */
  option?: string;
  /** For combos: slot index → chosen item slug. */
  choices?: Record<string, string>;
}

export interface PricedLine {
  kind: "item" | "combo";
  ref_slug: string;
  name_snapshot: string;
  detail: string | null;
  unit_paise: number;
  qty: number;
  line_paise: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotal_paise: number;
  delivery_fee_paise: number;
  total_paise: number;
  settings: StoreSettings;
}

export class CartError extends Error {}

const MAX_QTY_PER_LINE = 20;
const MAX_LINES = 40;

const ITEM_SELECT =
  "slug, name, note, options, price_paise, is_available, categories(slug, name, available_from, available_to)";
const COMBO_SELECT =
  "slug, code, name, price_paise, slots, is_available, available_from, available_to, window_label";

interface ItemRow {
  slug: string;
  name: string;
  note: string | null;
  options: string[];
  price_paise: number;
  is_available: boolean;
  categories: {
    slug: string;
    name: string;
    available_from: number | null;
    available_to: number | null;
  } | null;
}

interface ComboRow {
  slug: string;
  code: string;
  name: string;
  price_paise: number;
  slots: ApiComboSlot[];
  is_available: boolean;
  available_from: number | null;
  available_to: number | null;
  window_label: string | null;
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const { data } = await db()
    .from("store_settings")
    .select("is_accepting_orders, closed_message, delivery_fee_paise, free_delivery_above_paise")
    .eq("id", 1)
    .maybeSingle();

  return (
    (data as StoreSettings | null) ?? {
      is_accepting_orders: true,
      closed_message: null,
      delivery_fee_paise: Number(process.env.DELIVERY_FEE_RUPEES ?? 30) * 100,
      free_delivery_above_paise: Number(process.env.FREE_DELIVERY_ABOVE_RUPEES ?? 399) * 100,
    }
  );
}

export async function priceCart(input: CartLineInput[]): Promise<PricedCart> {
  if (!Array.isArray(input) || input.length === 0) {
    throw new CartError("Your cart is empty.");
  }
  if (input.length > MAX_LINES) {
    throw new CartError("That's a very large order — please call us to place it.");
  }

  const supabase = db();
  const settings = await getStoreSettings();

  const itemSlugs = new Set<string>();
  const comboSlugs = new Set<string>();
  for (const l of input) {
    if (!l?.slug || typeof l.slug !== "string") throw new CartError("Malformed cart.");
    const qty = Number(l.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      throw new CartError(`Quantity for ${l.slug} must be between 1 and ${MAX_QTY_PER_LINE}.`);
    }
    if (l.kind === "combo") comboSlugs.add(l.slug);
    else itemSlugs.add(l.slug);
    // Combo choices resolve to menu items, so they need looking up too.
    for (const chosen of Object.values(l.choices ?? {})) itemSlugs.add(chosen);
  }

  // One round trip each, rather than a query per line.
  const [itemRes, comboRes] = await Promise.all([
    itemSlugs.size
      ? supabase.from("menu_items").select(ITEM_SELECT).in("slug", [...itemSlugs])
      : Promise.resolve({ data: [] }),
    comboSlugs.size
      ? supabase.from("combos").select(COMBO_SELECT).in("slug", [...comboSlugs])
      : Promise.resolve({ data: [] }),
  ]);

  const items = new Map<string, ItemRow>(
    ((itemRes.data ?? []) as unknown as ItemRow[]).map((r) => [r.slug, r]),
  );
  const combos = new Map<string, ComboRow>(
    ((comboRes.data ?? []) as unknown as ComboRow[]).map((r) => [r.slug, r]),
  );

  const lines: PricedLine[] = [];

  for (const l of input) {
    if (l.kind === "combo") {
      const c = combos.get(l.slug);
      if (!c) throw new CartError(`"${l.slug}" is no longer on the menu.`);
      if (!c.is_available) throw new CartError(`${c.name} is unavailable right now.`);
      if (!isWindowOpen(c.available_from, c.available_to)) {
        throw new CartError(`${c.name} is only served ${c.window_label ?? "at set times"}.`);
      }

      const slots = c.slots ?? [];
      const parts: string[] = [];

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot.kind === "fixed") {
          const fi = items.get(slot.item!) ?? (await fetchItem(slot.item!));
          if (!fi) throw new CartError(`${c.name} is misconfigured — please tell the kitchen.`);
          if (!fi.is_available) throw new CartError(`${fi.name} in ${c.name} is unavailable.`);
          parts.push(fi.name);
        } else {
          const chosen = l.choices?.[String(i)];
          if (!chosen) throw new CartError(`Choose an option for "${slot.label}" in ${c.name}.`);
          const ci = items.get(chosen);
          if (!ci) throw new CartError(`That choice is no longer available in ${c.name}.`);
          if (!ci.is_available) throw new CartError(`${ci.name} is unavailable right now.`);
          // The chosen item must actually be eligible for this slot.
          const eligible = slot.fromItems
            ? slot.fromItems.includes(chosen)
            : ci.categories?.slug === slot.fromCategory;
          if (!eligible) throw new CartError(`${ci.name} is not a valid choice for ${c.name}.`);
          parts.push(ci.name);
        }
      }

      const unit = c.price_paise;
      lines.push({
        kind: "combo",
        ref_slug: l.slug,
        name_snapshot: `${c.name} (${c.code})`,
        detail: parts.join(" + "),
        unit_paise: unit,
        qty: l.qty,
        line_paise: unit * l.qty,
      });
      continue;
    }

    const it = items.get(l.slug);
    if (!it) throw new CartError(`"${l.slug}" is no longer on the menu.`);
    if (!it.is_available) throw new CartError(`${it.name} is sold out right now.`);
    if (!isWindowOpen(it.categories?.available_from, it.categories?.available_to)) {
      throw new CartError(`${it.name} is only served during ${it.categories?.name} hours.`);
    }
    if (it.options?.length) {
      if (!l.option) throw new CartError(`Choose an option for ${it.name}.`);
      if (!it.options.includes(l.option)) throw new CartError(`"${l.option}" is not offered for ${it.name}.`);
    }

    const detail = [l.option, it.note].filter(Boolean).join(" · ") || null;
    lines.push({
      kind: "item",
      ref_slug: l.slug,
      name_snapshot: it.name,
      detail,
      unit_paise: it.price_paise,
      qty: l.qty,
      line_paise: it.price_paise * l.qty,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.line_paise, 0);
  const deliveryFee =
    subtotal >= settings.free_delivery_above_paise ? 0 : settings.delivery_fee_paise;

  return {
    lines,
    subtotal_paise: subtotal,
    delivery_fee_paise: deliveryFee,
    total_paise: subtotal + deliveryFee,
    settings,
  };
}

/** A combo's fixed items are not in the requested slug set, so fetch on demand. */
async function fetchItem(slug: string): Promise<ItemRow | null> {
  const { data } = await db().from("menu_items").select(ITEM_SELECT).eq("slug", slug).maybeSingle();
  return (data as unknown as ItemRow) ?? null;
}
