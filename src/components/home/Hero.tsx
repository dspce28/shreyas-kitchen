"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import Hero3D from "@/components/three/Hero3D";
import { STORE } from "@/data/menu";

/**
 * The first screen. The WebGL cup sits behind the type rather than beside it,
 * so the layout holds at every width without a separate mobile composition.
 */
export function Hero() {
  const reduced = useReducedMotion();

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 26 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0.2 : 1, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section className="relative isolate flex min-h-[92dvh] flex-col justify-center overflow-hidden px-4 pb-16 pt-10 sm:px-6">
      {/* The 3D scene, centred and pushed behind the copy. */}
      <Hero3D className="pointer-events-none absolute inset-0 -z-10 translate-y-[8%] sm:translate-y-0" />

      {/* Keeps the type legible over the brightest part of the render:
          a soft wash behind the copy column, not the whole frame. */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(85%_70%_at_28%_50%,rgba(10,9,6,0.88),transparent_70%)] sm:bg-[radial-gradient(55%_70%_at_22%_50%,rgba(10,9,6,0.9),transparent_72%)]" />

      <div className="mx-auto w-full max-w-6xl text-center sm:text-left">
        <motion.p {...rise(0.1)} className="eyebrow">
          {STORE.tagline}
        </motion.p>

        <motion.h1
          {...rise(0.2)}
          className="mt-6 text-balance text-[3.25rem] leading-[0.94] tracking-[-0.03em] sm:text-[5.5rem] lg:text-[6.5rem]"
        >
          <span className="foil">Shreya&rsquo;s</span>
          <br />
          <span className="text-cream">Kitchen</span>
        </motion.h1>

        <motion.p
          {...rise(0.34)}
          className="mx-auto mt-7 max-w-md text-pretty text-[0.9375rem] leading-relaxed text-cream-dim sm:mx-0 sm:text-lg"
        >
          {STORE.promise}
        </motion.p>

        <motion.div
          {...rise(0.46)}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-start"
        >
          <Link
            href="/menu"
            className="group inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-brass-300 to-brass-600 px-8 text-[0.9375rem] font-medium text-ink shadow-[0_1px_0_0_rgba(255,255,255,0.45)_inset,0_16px_40px_-14px_rgba(216,184,102,0.8)] transition-all duration-300 hover:brightness-105 active:translate-y-px sm:w-auto"
          >
            Order now
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
          <Link
            href="/combos"
            className="glass inline-flex h-13 w-full items-center justify-center rounded-2xl px-8 text-[0.9375rem] text-cream transition-all duration-300 hover:border-brass/40 sm:w-auto"
          >
            See the combos
          </Link>
        </motion.div>

        <motion.p
          {...rise(0.58)}
          className="mt-9 inline-flex items-center gap-2 text-xs text-stone"
        >
          <MapPin size={13} className="text-brass/70" aria-hidden />
          {STORE.location}
        </motion.p>
      </div>

      {/* Scroll cue */}
      {!reduced && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center"
        >
          <motion.span
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="h-10 w-px bg-gradient-to-b from-transparent via-brass/50 to-transparent"
          />
        </motion.div>
      )}
    </section>
  );
}
