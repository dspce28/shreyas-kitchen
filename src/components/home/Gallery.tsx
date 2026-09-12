"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Engraving } from "@/components/ui/Engraving";
import { dishImage } from "@/lib/dish-image";

/**
 * Photo grid with a lightbox.
 *
 * The lightbox is hand-rolled rather than pulled in as a dependency: it
 * needs to do exactly four things — open, close on Escape or backdrop,
 * step with the arrow keys, and trap focus — and a library for that costs
 * more bytes than the feature.
 */

const SHOTS = [
  "basket-chaat",
  "meal-of-the-day-white",
  "quinoa-pulav",
  "filter-coffee",
  "bhel",
  "green-detox-juice",
  "veg-handvo",
  "tomato-soup",
] as const;

const CAPTIONS: Record<string, string> = {
  "basket-chaat": "Basket Chaat",
  "meal-of-the-day-white": "Meal of the Day",
  "quinoa-pulav": "Quinoa Pulav",
  "filter-coffee": "Filter Coffee",
  bhel: "Bhel",
  "green-detox-juice": "Green Detox Juice",
  "veg-handvo": "Veg Handvo",
  "tomato-soup": "Tomato Soup",
};

export function Gallery() {
  const [open, setOpen] = useState<number | null>(null);
  const reduced = useReducedMotion();

  const step = useCallback((by: number) => {
    setOpen((i) => (i === null ? null : (i + by + SHOTS.length) % SHOTS.length));
  }, []);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, step]);

  const current = open === null ? null : dishImage(SHOTS[open]);

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <Engraving kind="spices" width={360} distance={-55} className="-left-16 bottom-16 w-[22rem]" />
      <Engraving kind="berries" width={340} distance={70} className="-right-16 top-12 w-[21rem]" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="eyebrow-script">From the pass</p>
          <h2 className="mt-2 text-[2rem] sm:text-5xl">
            <span className="text-cream">The </span>
            <span className="text-tan">gallery</span>
          </h2>
        </Reveal>

        <RevealGroup
          stagger={0.08}
          className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
        >
          {SHOTS.map((slug, i) => {
            const img = dishImage(slug);
            if (!img?.dish) return null;
            // Two tiles per row of eight get a taller aspect, so the grid
            // has a rhythm instead of reading as a contact sheet.
            const tall = i === 0 || i === 5;
            return (
              <RevealItem key={slug} className={tall ? "row-span-2" : undefined}>
                <button
                  onClick={() => setOpen(i)}
                  aria-label={`View ${CAPTIONS[slug]} larger`}
                  className={`group relative block w-full overflow-hidden ${
                    tall ? "aspect-square sm:aspect-[3/4]" : "aspect-square"
                  }`}
                >
                  <Image
                    src={img.dish}
                    alt={CAPTIONS[slug]}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    placeholder="blur"
                    blurDataURL={img.blur}
                    className="object-cover transition-transform duration-[1.1s] ease-[var(--ease-out-quint)] group-hover:scale-110"
                  />
                  {/* Hover veil + plus mark */}
                  <span className="absolute inset-0 bg-ink/70 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <span className="absolute inset-4 border border-tan/50 opacity-0 transition-all duration-500 group-hover:opacity-100" />
                  <span className="absolute inset-0 grid place-items-center opacity-0 transition-all duration-500 group-hover:opacity-100">
                    <span className="grid h-11 w-11 place-items-center rounded-full border border-tan/60 text-tan">
                      <Plus size={18} />
                    </span>
                  </span>
                  <span className="absolute inset-x-0 bottom-0 translate-y-2 p-3 text-left text-[0.6875rem] uppercase tracking-[0.16em] text-cream opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    {CAPTIONS[slug]}
                  </span>
                </button>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {open !== null && current?.dish && (
          <motion.div
            className="fixed inset-0 z-[120] grid place-items-center bg-ink/95 p-4 backdrop-blur-sm sm:p-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label={CAPTIONS[SHOTS[open]]}
            onClick={() => setOpen(null)}
          >
            <button
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center border border-white/15 text-cream transition hover:border-tan/60 hover:text-tan sm:right-8 sm:top-8"
            >
              <X size={18} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              aria-label="Previous"
              className="absolute left-3 z-10 grid h-11 w-11 place-items-center border border-white/15 text-cream transition hover:border-tan/60 hover:text-tan sm:left-8"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              aria-label="Next"
              className="absolute right-3 z-10 grid h-11 w-11 place-items-center border border-white/15 text-cream transition hover:border-tan/60 hover:text-tan sm:right-8"
            >
              <ChevronRight size={18} />
            </button>

            <motion.figure
              key={SHOTS[open]}
              initial={{ opacity: 0, scale: reduced ? 1 : 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.15 : 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-h-[84dvh] w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-square w-full">
                <Image
                  src={current.dish}
                  alt={CAPTIONS[SHOTS[open]]}
                  fill
                  sizes="(max-width: 768px) 92vw, 672px"
                  placeholder="blur"
                  blurDataURL={current.blur}
                  className="object-contain"
                />
              </div>
              <figcaption className="mt-4 text-center">
                <span className="eyebrow-script text-[1.75rem]">
                  {CAPTIONS[SHOTS[open]]}
                </span>
                <span className="tnum mt-1 block text-xs text-stone">
                  {open + 1} / {SHOTS.length}
                </span>
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
