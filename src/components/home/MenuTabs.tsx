"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Engraving } from "@/components/ui/Engraving";
import { CATEGORIES } from "@/data/menu";
import { dishImageWithAlias, categoryBanner } from "@/lib/dish-image";
import { rupees, cn } from "@/lib/utils";

/**
 * The menu, browsable by course without leaving the home page.
 *
 * Rows use a dotted leader between the dish and its price — the oldest trick
 * in menu typesetting, and it still beats a plain two-column table because
 * the eye can track a long gap without losing its line.
 *
 * This reads from the static menu file rather than the database: the home
 * page must render instantly and identically before Supabase is connected.
 * The live, orderable menu is /menu.
 */

const TABS = [
  { slug: "breakfast", label: "Breakfast" },
  { slug: "evening-snacks", label: "Snacks" },
  { slug: "rice-and-meals", label: "Meals" },
  { slug: "juices-shakes", label: "Drinks" },
] as const;

export function MenuTabs() {
  const [active, setActive] = useState<string>(TABS[0].slug);
  const reduced = useReducedMotion();

  const category = CATEGORIES.find((c) => c.slug === active);
  const banner = categoryBanner(active);
  // Six is what fits beside the image without the column running long.
  const items = (category?.items ?? []).slice(0, 6);

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Ghosted section word, the same device as the hero. */}
      <span
        className="outline-word pointer-events-none absolute -right-10 top-10 -z-10 text-[14vw] opacity-70"
        aria-hidden
      >
        Menu
      </span>

      <Engraving kind="berries" width={380} distance={-70} className="-left-20 top-24 w-[24rem]" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="eyebrow-script">Special selection</p>
          <h2 className="mt-2 text-[2rem] sm:text-5xl">
            <span className="text-cream">From our </span>
            <span className="text-tan">menu</span>
          </h2>
        </Reveal>

        {/* ── Tabs ───────────────────────────────────────────────── */}
        <Reveal delay={0.1}>
          <div
            role="tablist"
            aria-label="Menu sections"
            className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          >
            {TABS.map((t) => {
              const on = t.slug === active;
              return (
                <button
                  key={t.slug}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActive(t.slug)}
                  className={cn(
                    "relative pb-2 font-display text-sm uppercase tracking-[0.22em] transition-colors",
                    on ? "text-tan" : "text-stone hover:text-cream",
                  )}
                >
                  {t.label}
                  {on && (
                    <motion.span
                      layoutId="menu-tab-underline"
                      className="absolute inset-x-0 bottom-0 h-px bg-tan"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* ── Panel ──────────────────────────────────────────────── */}
        <div className="mt-14 grid items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${active}-img`}
              initial={{ opacity: 0, scale: reduced ? 1 : 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.2 : 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative aspect-[4/3] w-full overflow-hidden lg:aspect-[3/4]"
            >
              {banner?.wide && (
                <Image
                  src={banner.wide}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  placeholder="blur"
                  blurDataURL={banner.blur}
                  className="object-cover"
                />
              )}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
              <span className="pointer-events-none absolute inset-3 border border-white/15" />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.ul
              key={`${active}-list`}
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -12 }}
              transition={{ duration: reduced ? 0.2 : 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {items.map((item, i) => {
                const img = dishImageWithAlias(item.slug);
                return (
                  <motion.li
                    key={item.slug}
                    initial={{ opacity: 0, x: reduced ? 0 : 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: reduced ? 0.2 : 0.6,
                      delay: reduced ? 0 : i * 0.07,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="group flex items-start gap-4"
                  >
                    {img?.dish && (
                      <div className="relative hidden h-14 w-14 shrink-0 overflow-hidden rounded-full sm:block">
                        <Image
                          src={img.dish}
                          alt=""
                          fill
                          sizes="56px"
                          placeholder="blur"
                          blurDataURL={img.blur}
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      {/* The leader: name, a dotted rule that absorbs the
                          slack, then the price. */}
                      <div className="flex items-baseline gap-3">
                        <h3 className="shrink-0 text-base tracking-[0.06em] text-cream transition-colors group-hover:text-tan-300">
                          {item.name}
                        </h3>
                        <span
                          className="h-px min-w-4 flex-1 translate-y-[-2px] border-b border-dotted border-white/20"
                          aria-hidden
                        />
                        <span className="price-script shrink-0 text-3xl">
                          {rupees(Math.round(item.price * 100))}
                        </span>
                      </div>
                      <p className="mt-1 text-[0.8125rem] leading-relaxed text-stone">
                        {item.description}
                      </p>
                    </div>
                  </motion.li>
                );
              })}

              <li className="pt-2">
                <Link
                  href={`/menu#${active}`}
                  className="group inline-flex items-center gap-2.5 border-b border-tan/40 pb-1.5 text-[0.8125rem] uppercase tracking-[0.2em] text-tan transition-colors hover:border-tan hover:text-tan-300"
                >
                  Order from {category?.name.toLowerCase()}
                  <ArrowRight
                    size={14}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </li>
            </motion.ul>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
