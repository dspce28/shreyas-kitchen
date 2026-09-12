"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The cart lives entirely in the browser until checkout. It stores WHAT was
 * ordered, never prices — the server re-prices every line when the order is
 * placed, so a stale or edited cart can never buy anything at the wrong price.
 * The `unitHint` field is display-only and is discarded on submit.
 */

export interface CartLine {
  /** Stable identity: same dish + same choices collapses into one line. */
  key: string;
  kind: "item" | "combo";
  slug: string;
  name: string;
  qty: number;
  option?: string;
  /** Combo slot index → chosen item slug. */
  choices?: Record<string, string>;
  /** Human-readable summary of choices, for the cart list. */
  detailHint?: string;
  /** Last known price in paise. Display only — never sent to the server. */
  unitHint: number;
}

export function lineKey(
  kind: string,
  slug: string,
  option?: string,
  choices?: Record<string, string>,
): string {
  const c = choices
    ? Object.keys(choices)
        .sort()
        .map((k) => `${k}=${choices[k]}`)
        .join(",")
    : "";
  return [kind, slug, option ?? "", c].join("|");
}

interface CartState {
  lines: CartLine[];
  note: string;
  /** Guards against rendering persisted state before hydration. */
  hydrated: boolean;
  add: (line: Omit<CartLine, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  increment: (key: string, by: number) => void;
  remove: (key: string) => void;
  setNote: (note: string) => void;
  clear: () => void;
  count: () => number;
  subtotalHint: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      note: "",
      hydrated: false,

      add: (line, qty = 1) => {
        const key = lineKey(line.kind, line.slug, line.option, line.choices);
        set((s) => {
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.key === key ? { ...l, qty: Math.min(20, l.qty + qty), unitHint: line.unitHint } : l,
              ),
            };
          }
          return { lines: [...s.lines, { ...line, key, qty }] };
        });
      },

      setQty: (key, qty) =>
        set((s) => ({
          lines:
            qty <= 0
              ? s.lines.filter((l) => l.key !== key)
              : s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(20, qty) } : l)),
        })),

      increment: (key, by) => {
        const line = get().lines.find((l) => l.key === key);
        if (line) get().setQty(key, line.qty + by);
      },

      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      setNote: (note) => set({ note: note.slice(0, 500) }),
      clear: () => set({ lines: [], note: "" }),

      count: () => get().lines.reduce((n, l) => n + l.qty, 0),
      subtotalHint: () => get().lines.reduce((n, l) => n + l.unitHint * l.qty, 0),
    }),
    {
      name: "sk-cart",
      partialize: (s) => ({ lines: s.lines, note: s.note }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

/** What actually goes to the server: no names, no prices. */
export function toCartPayload(lines: CartLine[]) {
  return lines.map((l) => ({
    kind: l.kind,
    slug: l.slug,
    qty: l.qty,
    option: l.option,
    choices: l.choices,
  }));
}
