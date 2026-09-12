"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Save, Power, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import type { ApiCategory, ApiCombo, ApiMenuItem, StoreSettings } from "@/lib/types";

interface Draft {
  price: string;
  is_available: boolean;
}

/**
 * The screen that turns the placeholder prices into real ones.
 *
 * Edits are staged locally and saved in one request, so correcting fifty
 * prices is fifty keystrokes and one click — not fifty round trips. Saving a
 * price also locks it against future `npm run seed` runs.
 */
export function MenuEditor() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [combos, setCombos] = useState<ApiCombo[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/menu", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCategories(data.categories ?? []);
      setCombos(data.combos ?? []);
      setSettings(data.settings);

      const seeded: Record<string, Draft> = {};
      for (const c of data.categories ?? []) {
        for (const i of c.items) {
          seeded[i.id] = { price: String(i.price_paise / 100), is_available: i.is_available };
        }
      }
      for (const c of data.combos ?? []) {
        seeded[c.id] = { price: String(c.price_paise / 100), is_available: c.is_available };
      }
      setDrafts(seeded);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load the menu. Has the database been seeded?",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Only send what actually changed.
  const changes = useMemo(() => {
    const out: { kind: "item" | "combo"; id: string; price?: number; is_available?: boolean }[] = [];

    const check = (kind: "item" | "combo", row: { id: string; price_paise: number; is_available: boolean }) => {
      const d = drafts[row.id];
      if (!d) return;
      const priceChanged = Math.round(Number(d.price) * 100) !== row.price_paise;
      const availChanged = d.is_available !== row.is_available;
      if (!priceChanged && !availChanged) return;
      out.push({
        kind,
        id: row.id,
        ...(priceChanged ? { price: Number(d.price) } : {}),
        ...(availChanged ? { is_available: d.is_available } : {}),
      });
    };

    categories.forEach((c) => c.items.forEach((i) => check("item", i)));
    combos.forEach((c) => check("combo", c));
    return out;
  }, [drafts, categories, combos]);

  async function save() {
    if (changes.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Saved ${data.updated} change${data.updated === 1 ? "" : "s"}.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(patch: Record<string, unknown>) {
    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSettings(data.settings);
      toast.success("Store settings updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 px-4 py-16 sm:px-6" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-28 text-center">
        <h1 className="font-display text-2xl text-cream">{error}</h1>
        <p className="mt-3 text-sm leading-relaxed text-sand">
          Apply <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">supabase/schema.sql</code>{" "}
          then run <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">npm run seed</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-32 pt-10 sm:px-6">
      <p className="eyebrow">Menu &amp; prices</p>
      <h1 className="mt-2 text-4xl">Set your prices</h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-sand">
        The printed menu had no prices, so everything below started as a placeholder. Correct
        them here — a price you save is locked and will never be overwritten by a re-seed.
      </p>

      {/* ── Store switches ─────────────────────────────────── */}
      {settings && (
        <section className="glass mt-8 rounded-[1.5rem] p-5">
          <h2 className="font-display text-lg text-cream">Store</h2>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <button
              onClick={() => void saveSettings({ is_accepting_orders: !settings.is_accepting_orders })}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition",
                settings.is_accepting_orders
                  ? "border-sage/40 bg-sage/12 text-sage-300"
                  : "border-danger/40 bg-danger/12 text-danger",
              )}
            >
              <Power size={15} aria-hidden />
              {settings.is_accepting_orders ? "Accepting orders" : "Closed — not accepting"}
            </button>

            <div className="flex items-end gap-3">
              <Field
                label="Delivery fee (₹)"
                inputMode="decimal"
                className="w-28"
                defaultValue={String(settings.delivery_fee_paise / 100)}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v * 100 !== settings.delivery_fee_paise) {
                    void saveSettings({ delivery_fee: v });
                  }
                }}
              />
              <Field
                label="Free above (₹)"
                inputMode="decimal"
                className="w-28"
                defaultValue={String(settings.free_delivery_above_paise / 100)}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v * 100 !== settings.free_delivery_above_paise) {
                    void saveSettings({ free_delivery_above: v });
                  }
                }}
              />
              <Truck size={16} className="mb-3 text-stone" aria-hidden />
            </div>
          </div>
        </section>
      )}

      {/* ── Items ──────────────────────────────────────────── */}
      {categories.map((c) => (
        <section key={c.id} className="mt-10">
          <h2 className="text-2xl text-cream">{c.name}</h2>
          <div className="rule mt-3" />
          <ul>
            {c.items.map((item: ApiMenuItem) => (
              <EditorRow
                key={item.id}
                name={item.name}
                note={item.note}
                draft={drafts[item.id]}
                dirty={changes.some((ch) => ch.id === item.id)}
                onPrice={(v) => setDrafts((d) => ({ ...d, [item.id]: { ...d[item.id], price: v } }))}
                onToggle={() =>
                  setDrafts((d) => ({
                    ...d,
                    [item.id]: { ...d[item.id], is_available: !d[item.id].is_available },
                  }))
                }
              />
            ))}
          </ul>
        </section>
      ))}

      {combos.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl text-cream">Combos</h2>
          <div className="rule mt-3" />
          <ul>
            {combos.map((c) => (
              <EditorRow
                key={c.id}
                name={c.name}
                note={c.code}
                draft={drafts[c.id]}
                dirty={changes.some((ch) => ch.id === c.id)}
                onPrice={(v) => setDrafts((d) => ({ ...d, [c.id]: { ...d[c.id], price: v } }))}
                onToggle={() =>
                  setDrafts((d) => ({
                    ...d,
                    [c.id]: { ...d[c.id], is_available: !d[c.id].is_available },
                  }))
                }
              />
            ))}
          </ul>
        </section>
      )}

      {/* Save bar — only appears when there is something to save. */}
      {changes.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-sage/30 bg-ink-800/95 px-4 py-3.5 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <p className="text-sm text-cream-dim">
              <span className="tnum font-medium text-sage-300">{changes.length}</span> unsaved
              change{changes.length === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => void load()}>
                Discard
              </Button>
              <Button size="sm" loading={saving} onClick={() => void save()}>
                <Save size={14} aria-hidden />
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditorRow({
  name,
  note,
  draft,
  dirty,
  onPrice,
  onToggle,
}: {
  name: string;
  note: string | null;
  draft?: Draft;
  dirty: boolean;
  onPrice: (v: string) => void;
  onToggle: () => void;
}) {
  if (!draft) return null;

  return (
    <li
      className={cn(
        "flex items-center gap-4 border-b border-white/[0.06] py-3 transition-colors last:border-0",
        dirty && "bg-sage/[0.05]",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[0.9375rem]", draft.is_available ? "text-cream" : "text-stone line-through")}>
          {name}
        </p>
        {note && <p className="text-xs text-stone">{note}</p>}
      </div>

      <div className="relative w-28 shrink-0">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone">
          ₹
        </span>
        <input
          inputMode="decimal"
          value={draft.price}
          onChange={(e) => onPrice(e.target.value.replace(/[^\d.]/g, ""))}
          aria-label={`Price for ${name}`}
          className="tnum h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-7 pr-3 text-right text-cream transition focus:border-sage/60 focus:outline-none"
        />
      </div>

      <button
        onClick={onToggle}
        aria-pressed={draft.is_available}
        className={cn(
          "shrink-0 rounded-xl border px-3 py-2 text-xs transition",
          draft.is_available
            ? "border-sage/35 bg-sage/10 text-sage-300"
            : "border-danger/35 bg-danger/10 text-danger",
        )}
      >
        {draft.is_available ? "Available" : "Sold out"}
      </button>
    </li>
  );
}
