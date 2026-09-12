"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Plus } from "lucide-react";
import { useMenu } from "@/lib/use-menu";
import { useCart } from "@/lib/cart-store";
import { PreviewBanner } from "./PreviewBanner";
import { Reveal } from "@/components/ui/Reveal";
import { rupees, cn } from "@/lib/utils";
import type { ApiCombo, ApiCategory, ApiMenuItem, ApiComboSlot } from "@/lib/types";

export function CombosBrowser() {
  const { data, status, isPreview } = useMenu();
  const ordering = Boolean(data?.settings.is_accepting_orders) && !isPreview;

  // Flat slug → item lookup so a slot can resolve its choices in one hop.
  const itemBySlug = useMemo(() => {
    const m = new Map<string, ApiMenuItem & { categorySlug: string }>();
    for (const c of data?.categories ?? []) {
      for (const i of c.items) m.set(i.slug, { ...i, categorySlug: c.slug });
    }
    return m;
  }, [data]);

  return (
    <div className="pb-20">
      <header className="relative overflow-hidden border-b border-white/[0.07] px-4 pb-10 pt-14 sm:px-6 sm:pb-14 sm:pt-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(156,191,143,0.11),transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="eyebrow">Combos</p>
          <h1 className="mt-4 text-5xl sm:text-7xl">
            <span className="text-cream">A little more, for </span>
            <span className="foil">a little less</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[0.9375rem] leading-relaxed text-cream-dim">
            Thoughtful pairings for a working day. Each one is priced below the same items
            ordered separately.
          </p>
        </div>
      </header>

      {isPreview && <PreviewBanner />}

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 px-4 sm:grid-cols-2 sm:px-6">
        {status === "loading" &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-[1.75rem] bg-white/[0.04]" aria-hidden />
          ))}

        {(data?.combos ?? []).map((combo, i) => (
          <Reveal key={combo.slug} delay={i * 0.06}>
            <ComboCard
              combo={combo}
              categories={data!.categories}
              itemBySlug={itemBySlug}
              disabled={!ordering}
            />
          </Reveal>
        ))}
      </div>

      <p className="mx-auto mt-12 max-w-xl px-6 text-center text-sm italic leading-relaxed text-stone">
        Prefer to ask at the counter? That works too — the same pairings are available in store.
      </p>
    </div>
  );
}

function ComboCard({
  combo,
  categories,
  itemBySlug,
  disabled,
}: {
  combo: ApiCombo & { is_open_now?: boolean };
  categories: ApiCategory[];
  itemBySlug: Map<string, ApiMenuItem & { categorySlug: string }>;
  disabled: boolean;
}) {
  const add = useCart((s) => s.add);
  const slots = combo.slots ?? [];

  // One chosen slug per "choose" slot, defaulted to the first eligible item.
  const [choices, setChoices] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    slots.forEach((slot, i) => {
      if (slot.kind !== "choose") return;
      const options = eligible(slot, categories);
      if (options[0]) init[String(i)] = options[0].slug;
    });
    return init;
  });
  const [justAdded, setJustAdded] = useState(false);

  const closed = combo.is_open_now === false;
  const unavailable = disabled || closed || !combo.is_available;

  // The saving is computed from live prices, so it can never overstate itself.
  const partsTotal = slots.reduce((sum, slot, i) => {
    const slug = slot.kind === "fixed" ? slot.item! : choices[String(i)];
    return sum + (itemBySlug.get(slug ?? "")?.price_paise ?? 0);
  }, 0);
  const saving = partsTotal - combo.price_paise;

  function onAdd() {
    if (unavailable) return;
    const detail = slots
      .map((slot, i) => {
        const slug = slot.kind === "fixed" ? slot.item! : choices[String(i)];
        return itemBySlug.get(slug ?? "")?.name ?? slug;
      })
      .join(" + ");

    add({
      kind: "combo",
      slug: combo.slug,
      name: combo.name,
      choices,
      detailHint: detail,
      unitHint: combo.price_paise,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  }

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.055] to-transparent p-6 transition-all duration-500",
        unavailable ? "opacity-55" : "hover:border-sage/35 hover:shadow-[var(--shadow-sage)]",
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sage/[0.07] opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-[0.5625rem] text-tan/70">{combo.code}</p>
          <h2 className="mt-2 text-2xl leading-tight text-cream">{combo.name}</h2>
        </div>
        <div className="text-right">
          <p className="price-script text-[2rem]">{rupees(combo.price_paise)}</p>
          {saving > 0 && (
            <p className="tnum mt-0.5 text-[0.6875rem] text-sage-300">save {rupees(saving)}</p>
          )}
        </div>
      </div>

      <div className="relative mt-5 flex-1 space-y-3">
        {slots.map((slot, i) => {
          if (slot.kind === "fixed") {
            const item = itemBySlug.get(slot.item!);
            return (
              <div key={i} className="flex items-baseline gap-2.5">
                <span className="text-sage/50" aria-hidden>
                  ◆
                </span>
                <div>
                  <p className="text-[0.9375rem] text-cream">{item?.name ?? slot.item}</p>
                  {item?.description && (
                    <p className="text-xs leading-snug text-stone">{item.description}</p>
                  )}
                </div>
              </div>
            );
          }

          const options = eligible(slot, categories);
          return (
            <div key={i}>
              <div className="flex items-baseline gap-2.5">
                <span className="text-sage/50" aria-hidden>
                  ◆
                </span>
                <p className="text-[0.8125rem] text-sand">{slot.label}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                {options.map((o) => {
                  const selected = choices[String(i)] === o.slug;
                  return (
                    <button
                      key={o.slug}
                      disabled={unavailable || !o.is_available}
                      onClick={() => setChoices((c) => ({ ...c, [String(i)]: o.slug }))}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-xs transition disabled:opacity-40",
                        selected
                          ? "border-sage/50 bg-sage/15 text-sage-300"
                          : "border-white/10 text-sand hover:border-white/25 hover:text-cream",
                      )}
                    >
                      {o.name}
                      {o.note ? ` (${o.note})` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative mt-6 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs",
            closed ? "text-ember" : "text-stone",
          )}
        >
          <Clock size={12} aria-hidden />
          {combo.window_label}
        </span>

        <motion.button
          whileTap={unavailable ? undefined : { scale: 0.95 }}
          onClick={onAdd}
          disabled={unavailable}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-xl border px-3.5 text-[0.8125rem] transition-all duration-300",
            justAdded
              ? "border-sage/50 bg-sage/20 text-sage-300"
              : "border-white/12 bg-white/[0.04] text-cream hover:border-sage/50 hover:bg-sage/12 hover:text-sage-300",
            unavailable && "pointer-events-none",
          )}
        >
          {justAdded ? <Check size={15} /> : <Plus size={15} />}
          {justAdded ? "Added" : "Add combo"}
        </motion.button>
      </div>
    </article>
  );
}

/** Items a "choose" slot will accept, by explicit list or by category. */
function eligible(slot: ApiComboSlot, categories: ApiCategory[]): ApiMenuItem[] {
  if (slot.fromItems) {
    const wanted = new Set(slot.fromItems);
    return categories.flatMap((c) => c.items.filter((i) => wanted.has(i.slug)));
  }
  return categories.find((c) => c.slug === slot.fromCategory)?.items ?? [];
}
