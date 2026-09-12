"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote, AlertTriangle } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

/**
 * Customer quotes.
 *
 * IMPORTANT: the entries below are PLACEHOLDERS, not real reviews. Inventing
 * testimonials and presenting them as genuine would mislead customers, so
 * while `USING_PLACEHOLDERS` is true the section renders a visible notice
 * saying so.
 *
 * To go live: replace QUOTES with real, attributable feedback and set
 * `USING_PLACEHOLDERS` to false. The notice disappears on its own.
 */

const USING_PLACEHOLDERS = true;

interface Quote {
  text: string;
  name: string;
  role: string;
}

const QUOTES: Quote[] = [
  {
    text: "Replace this with something a real customer said about the food. Two or three lines is the right length — long enough to be specific, short enough to read.",
    name: "Customer name",
    role: "Fortune Business Hub",
  },
  {
    text: "A second quote goes here. The most persuasive ones mention a specific dish and a specific reason, rather than saying the food was good.",
    name: "Customer name",
    role: "Fortune Business Hub",
  },
  {
    text: "And a third. Ask a few regulars after their order and use their words verbatim, including the imperfect bits — polished copy reads as written by the business.",
    name: "Customer name",
    role: "Fortune Business Hub",
  },
];

const INTERVAL = 7000;

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  const step = useCallback((by: number) => {
    setIndex((i) => (i + by + QUOTES.length) % QUOTES.length);
  }, []);

  useEffect(() => {
    if (reduced || paused) return;
    const t = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % QUOTES.length);
    }, INTERVAL);
    return () => clearInterval(t);
  }, [reduced, paused]);

  const q = QUOTES[index];

  return (
    <section
      className="relative overflow-hidden border-y border-white/[0.07] py-24 sm:py-32"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <span
        className="outline-word pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-[16vw] opacity-60"
        aria-hidden
      >
        Guests
      </span>

      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Reveal>
          <p className="eyebrow-script">Kind words</p>
          <h2 className="mt-2 text-[2rem] sm:text-5xl">
            <span className="text-cream">What our </span>
            <span className="text-tan">guests say</span>
          </h2>
        </Reveal>

        {USING_PLACEHOLDERS && (
          <Reveal delay={0.08}>
            <p className="mx-auto mt-7 inline-flex max-w-xl items-start gap-2.5 border border-ember/30 bg-ember/10 px-4 py-2.5 text-left text-xs leading-relaxed text-ember">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                <strong className="font-medium">Placeholder quotes.</strong> These are not real
                reviews. Replace them with genuine customer feedback in{" "}
                <code className="text-[0.6875rem]">Testimonials.tsx</code> before launch.
              </span>
            </p>
          </Reveal>
        )}

        <Reveal delay={0.14}>
          <div className="relative mt-12 min-h-[16rem] sm:min-h-[14rem]">
            <Quote
              size={40}
              className="mx-auto mb-7 text-tan/30"
              aria-hidden
              strokeWidth={1}
            />

            <AnimatePresence mode="wait">
              <motion.blockquote
                key={index}
                initial={{ opacity: 0, y: reduced ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : -16 }}
                transition={{ duration: reduced ? 0.2 : 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="text-pretty text-lg font-light italic leading-relaxed text-cream-dim sm:text-xl">
                  &ldquo;{q.text}&rdquo;
                </p>
                <footer className="mt-8">
                  <p className="font-display text-sm uppercase tracking-[0.22em] text-cream">
                    {q.name}
                  </p>
                  <p className="mt-1.5 text-xs text-stone">{q.role}</p>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>
        </Reveal>

        {/* ── Controls ───────────────────────────────────────────── */}
        <div className="mt-10 flex items-center justify-center gap-6">
          <button
            onClick={() => step(-1)}
            aria-label="Previous quote"
            className="grid h-10 w-10 place-items-center border border-white/12 text-sand transition hover:border-tan/50 hover:text-tan"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex gap-2.5" role="tablist" aria-label="Choose a quote">
            {QUOTES.map((_, i) => (
              // Padded to a real touch target; the rule inside stays 1px.
              <button
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={`Quote ${i + 1}`}
                onClick={() => setIndex(i)}
                className="group flex h-11 items-center"
              >
                <span
                  className={cn(
                    "block h-px transition-all duration-500 ease-[var(--ease-out-quint)]",
                    i === index ? "w-10 bg-tan" : "w-5 bg-white/25 group-hover:bg-white/50",
                  )}
                />
              </button>
            ))}
          </div>

          <button
            onClick={() => step(1)}
            aria-label="Next quote"
            className="grid h-10 w-10 place-items-center border border-white/12 text-sand transition hover:border-tan/50 hover:text-tan"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
