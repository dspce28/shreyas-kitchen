"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, COMBOS } from "@/data/menu";
import { isWindowOpen } from "./utils";
import type { ApiCategory, ApiCombo, StoreSettings } from "./types";

export interface MenuData {
  categories: (ApiCategory & { is_open_now: boolean })[];
  combos: (ApiCombo & { is_open_now: boolean })[];
  settings: StoreSettings;
}

type Status = "loading" | "live" | "preview";

/**
 * Loads the live menu from the database.
 *
 * If the API is unreachable — which, realistically, means Supabase has not
 * been configured yet — it falls back to the transcribed menu in
 * data/menu.ts and reports `status: "preview"`. The site then still looks
 * and reads correctly; only ordering is disabled. A blank page during setup
 * would be a much worse first impression than a browsable one.
 */
export function useMenu() {
  const [data, setData] = useState<MenuData | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    fetch("/api/menu", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load the menu.");
        if (!json.categories?.length) throw new Error("The menu has not been seeded yet.");
        return json as MenuData;
      })
      .then((json) => {
        if (!alive) return;
        setData(json);
        setStatus("live");
      })
      .catch((err: Error) => {
        if (!alive) return;
        setData(fallbackMenu());
        setStatus("preview");
        setError(err.message);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { data, status, error, isPreview: status === "preview" };
}

/** Shapes data/menu.ts to look exactly like the API response. */
function fallbackMenu(): MenuData {
  return {
    categories: CATEGORIES.map((c, i) => ({
      id: c.slug,
      slug: c.slug,
      name: c.name,
      blurb: c.blurb,
      window_label: c.window ?? null,
      available_from: c.availableFrom ?? null,
      available_to: c.availableTo ?? null,
      sort_order: i,
      is_open_now: isWindowOpen(c.availableFrom, c.availableTo),
      items: c.items.map((it, j) => ({
        id: it.slug,
        slug: it.slug,
        name: it.name,
        description: it.description,
        note: it.note ?? null,
        options: it.options ?? [],
        price_paise: Math.round(it.price * 100),
        is_favourite: Boolean(it.favourite),
        is_available: true,
        sort_order: j,
      })),
    })),
    combos: COMBOS.map((c, i) => ({
      id: c.slug,
      slug: c.slug,
      code: c.code,
      name: c.name,
      price_paise: Math.round(c.price * 100),
      window_label: c.window,
      available_from: c.availableFrom ?? null,
      available_to: c.availableTo ?? null,
      slots: c.slots,
      is_available: true,
      sort_order: i,
      is_open_now: isWindowOpen(c.availableFrom, c.availableTo),
    })),
    settings: {
      is_accepting_orders: false,
      closed_message: "Ordering switches on once the database is connected.",
      delivery_fee_paise: 3000,
      free_delivery_above_paise: 39900,
    },
  };
}
