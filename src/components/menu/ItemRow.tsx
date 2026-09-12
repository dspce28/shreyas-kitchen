"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { dishImageWithAlias } from "@/lib/dish-image";
import { rupees, cn } from "@/lib/utils";
import type { ApiMenuItem } from "@/lib/types";

/**
 * One dish. The row is the whole interaction: pick a variant if there is
 * one, then add. No detail page — for a 50-item menu that would be five
 * taps where one will do.
 *
 * Dishes with a picture get a thumbnail; the rest get a typographic tile
 * built from the dish's initial, so a half-photographed menu still looks
 * deliberate rather than broken.
 */
export function ItemRow({
  item,
  closed,
  disabled,
}: {
  item: ApiMenuItem;
  /** The category's serving window has not opened (or has passed). */
  closed?: boolean;
  /** Ordering is off entirely — preview mode or store closed. */
  disabled?: boolean;
}) {
  const add = useCart((s) => s.add);
  const [option, setOption] = useState(item.options?.[0]);
  const [justAdded, setJustAdded] = useState(false);

  const unavailable = !item.is_available || closed || disabled;
  const image = dishImageWithAlias(item.slug);

  function onAdd() {
    if (unavailable) return;
    add({
      kind: "item",
      slug: item.slug,
      name: item.name,
      option,
      detailHint: [option, item.note].filter(Boolean).join(" · ") || undefined,
      unitHint: item.price_paise,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  }

  return (
    <li
      id={item.slug}
      className={cn(
        "group relative scroll-mt-28 border-b border-white/[0.06] py-4 transition-opacity last:border-0",
        unavailable && "opacity-45",
      )}
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] sm:h-24 sm:w-24">
          {image?.dish ? (
            <Image
              src={image.dish}
              alt={item.name}
              fill
              sizes="96px"
              placeholder="blur"
              blurDataURL={image.blur}
              className="object-cover transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.07]"
            />
          ) : (
            <span
              className="grid h-full w-full place-items-center font-display text-2xl text-sage/35"
              aria-hidden
            >
              {item.name.charAt(0)}
            </span>
          )}
          {/* Keeps the brighter photos from fighting the dark ground. */}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/45 to-transparent" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <h3 className="text-[1.0625rem] leading-snug text-cream">{item.name}</h3>

            {item.note && (
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[0.625rem] uppercase tracking-[0.12em] text-stone">
                {item.note}
              </span>
            )}

            {item.is_favourite && (
              <span className="rounded-md border border-brass/30 bg-brass/10 px-1.5 py-0.5 text-[0.625rem] uppercase tracking-[0.12em] text-brass-300">
                House favourite
              </span>
            )}

            {!item.is_available && (
              <span className="text-[0.625rem] uppercase tracking-[0.12em] text-danger">
                Sold out
              </span>
            )}
          </div>

          {item.description && (
            <p className="mt-1.5 max-w-prose text-[0.8125rem] leading-relaxed text-sand">
              {item.description}
            </p>
          )}

          {item.options?.length > 0 && (
            <div
              className="mt-2.5 flex flex-wrap gap-1.5"
              role="radiogroup"
              aria-label={`${item.name} options`}
            >
              {item.options.map((o) => (
                <button
                  key={o}
                  role="radio"
                  aria-checked={option === o}
                  disabled={unavailable}
                  onClick={() => setOption(o)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs transition",
                    option === o
                      ? "border-sage/50 bg-sage/15 text-sage-300"
                      : "border-white/10 text-sand hover:border-white/25 hover:text-cream",
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2.5">
          <span className="tnum font-display text-xl text-cream">{rupees(item.price_paise)}</span>

          <motion.button
            whileTap={unavailable ? undefined : { scale: 0.92 }}
            onClick={onAdd}
            disabled={unavailable}
            aria-label={`Add ${item.name} to your order`}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl border transition-all duration-300",
              justAdded
                ? "border-sage/50 bg-sage/20 text-sage-300"
                : "border-white/12 bg-white/[0.04] text-sand hover:border-sage/50 hover:bg-sage/12 hover:text-sage-300",
              unavailable && "pointer-events-none",
            )}
          >
            {justAdded ? <Check size={16} /> : <Plus size={16} />}
          </motion.button>
        </div>
      </div>
    </li>
  );
}
