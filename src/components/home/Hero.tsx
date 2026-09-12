"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { STORE } from "@/data/menu";
import { dishImage } from "@/lib/dish-image";
import { cn } from "@/lib/utils";

/**
 * Full-bleed photo hero.
 *
 * Three things carry the look: an oversized ghosted wordmark behind
 * everything, a calligraphic eyebrow over a feather-light uppercase
 * headline, and one word of that headline in tan.
 *
 * The slides cross-fade rather than sliding sideways — a horizontal slide of
 * a full-bleed photograph reads as a carousel widget, where a cross-dissolve
 * reads as a film cut.
 */

interface Slide {
  imageSlug: string;
  script: string;
  /** Split so exactly one word can be tinted. */
  head: [string, string];
  body: string;
  href: string;
  cta: string;
}

const SLIDES: Slide[] = [
  {
    imageSlug: "moong-dal-chilla",
    script: "Welcome to Shreya's",
    head: ["Fresh", "Every Morning"],
    body: "Breakfast from eight. Chillas hit the pan when you order them, never before.",
    href: "/menu#breakfast",
    cta: "See breakfast",
  },
  {
    imageSlug: "meal-of-the-day-white",
    script: "The meal of the day",
    head: ["A Full", "Plate"],
    body: "Two seasonal sabzis, four fulka roti, dal and rice. Cooked the way it is cooked at home.",
    href: "/menu#rice-and-meals",
    cta: "See today's meal",
  },
  {
    imageSlug: "basket-chaat",
    script: "Three till six",
    head: ["The Evening", "Chaat"],
    body: "A crisp edible basket piled high. The three hours the whole building waits for.",
    href: "/menu#evening-snacks",
    cta: "See snacks",
  },
  {
    imageSlug: "category-juices-shakes",
    script: "Pressed to order",
    head: ["Clean", "& Cold"],
    body: "Leafy greens, cold-pressed beetroot, spiced buttermilk. Nothing sits, nothing separates.",
    href: "/menu#juices-shakes",
    cta: "See drinks",
  },
];

const INTERVAL = 6500;

export function Hero() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((next: number) => {
    setIndex(((next % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  // Autoplay, but never while the tab is hidden or the pointer is resting on
  // the hero — a slide changing under the cursor mid-read is infuriating.
  useEffect(() => {
    if (reduced || paused) return;
    timer.current = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [reduced, paused]);

  const slide = SLIDES[index];

  return (
    <section
      className="relative isolate flex min-h-[92dvh] flex-col justify-center overflow-hidden"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Shreya's Kitchen highlights"
    >
      {/* ── Photography ──────────────────────────────────────────────
          Every slide stays mounted and cross-fades on opacity, rather than
          mounting and unmounting through AnimatePresence. Mounting on demand
          meant slide two decoded only at the moment it was needed, so each
          transition flashed its blur placeholder first. Stacked and always
          present, they are all inside the viewport, so the browser fetches
          them up front and every change after the first is instant. */}
      <div className="absolute inset-0 -z-20">
        {SLIDES.map((s, i) => {
          const img = dishImage(s.imageSlug);
          if (!img?.wide) return null;
          const on = i === index;
          return (
            <motion.div
              key={s.imageSlug}
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: on ? 1 : 0, scale: on || reduced ? 1 : 1.06 }}
              transition={{
                opacity: { duration: reduced ? 0.2 : 1.1, ease: "easeInOut" },
                // A very slow push-in across the slide's whole life. Any
                // faster and it becomes a Ken Burns cliché.
                scale: { duration: INTERVAL / 1000 + 1.2, ease: "linear" },
              }}
              aria-hidden={!on}
            >
              <Image
                src={img.wide}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                placeholder="blur"
                blurDataURL={img.blur}
                className="object-cover"
              />
            </motion.div>
          );
        })}
      </div>

      {/* Scrims. These STACK, so both must fade to fully transparent on the
          right — an earlier pair each ended opaque and between them buried
          the photograph completely.
          One darkens the left where the copy sits; one anchors the bottom
          edge into the page. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/75 to-transparent sm:via-ink/55" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-transparent to-transparent" />

      {/* ── Ghosted wordmark ─────────────────────────────────────── */}
      <span
        className="outline-word pointer-events-none absolute left-1/2 top-[42%] -z-10 -translate-x-1/2 -translate-y-1/2 text-[16vw] leading-none sm:text-[15vw]"
        aria-hidden="true"
      >
        Shreya&rsquo;s
      </span>

      {/* ── Copy ─────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-24 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: reduced ? 0 : 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -14 }}
            transition={{ duration: reduced ? 0.2 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <p className="eyebrow-script">{slide.script}</p>

            <h1 className="mt-3 text-[2.75rem] sm:text-6xl lg:text-7xl">
              <span className="text-cream">{slide.head[0]} </span>
              <span className="text-tan">{slide.head[1]}</span>
            </h1>

            <p className="mt-6 max-w-lg text-pretty text-[0.9375rem] leading-relaxed text-cream-dim sm:text-base">
              {slide.body}
            </p>

            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                href={slide.href}
                className="group inline-flex h-13 w-full items-center justify-center gap-2.5 bg-gradient-to-b from-sage-300 to-sage-600 px-8 text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-ink-900 transition-all duration-300 hover:brightness-105 active:translate-y-px sm:w-auto"
              >
                {slide.cta}
                <ArrowRight
                  size={15}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
              <Link
                href="/menu"
                className="inline-flex h-13 w-full items-center justify-center border border-white/15 px-8 text-[0.8125rem] uppercase tracking-[0.18em] text-cream transition-all duration-300 hover:border-tan/50 hover:text-tan-300 sm:w-auto"
              >
                Full menu
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Slide controls ─────────────────────────────────────── */}
        <div className="mt-14 flex items-center gap-5">
          <div className="flex gap-2.5" role="tablist" aria-label="Choose a slide">
            {SLIDES.map((s, i) => (
              // The visible indicator is a hairline, but a 1px tap target is
              // unusable on a phone. The button carries vertical padding to
              // reach a real hit area; the rule inside stays 1px.
              <button
                key={s.imageSlug}
                role="tab"
                aria-selected={i === index}
                aria-label={s.head.join(" ")}
                onClick={() => go(i)}
                className="group flex h-11 items-center"
              >
                <span
                  className={cn(
                    "block h-px transition-all duration-500 ease-[var(--ease-out-quint)]",
                    i === index ? "w-12 bg-tan" : "w-6 bg-white/25 group-hover:bg-white/50",
                  )}
                />
              </button>
            ))}
          </div>
          <span className="tnum text-xs text-stone">
            {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </span>
        </div>

        <p className="mt-8 inline-flex items-center gap-2 text-xs text-stone">
          <MapPin size={13} className="text-tan/70" aria-hidden />
          {STORE.location}
        </p>
      </div>
    </section>
  );
}
