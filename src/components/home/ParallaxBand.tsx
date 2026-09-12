"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

/**
 * The three-layer parallax band.
 *
 * The canvas is client-only and code-split — it is the heaviest thing on the
 * page and nobody needs it before first paint. Until it arrives (and
 * permanently, without WebGL) the CSS fallback below holds the same slate
 * ground and gold glow, so the band never shows a hole.
 */
const ParallaxScene = dynamic(() => import("@/components/three/ParallaxScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[#1e242b]">
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_45%,rgba(201,171,129,0.16),transparent_70%)]" />
    </div>
  ),
});

export function ParallaxBand() {
  return (
    <section className="relative isolate min-h-[88dvh] overflow-hidden">
      <ParallaxScene className="absolute inset-0 -z-10" />

      {/* Feathers the slate band into the page's green at both edges, so the
          section reads as a change of light rather than a pasted rectangle. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-[9] h-28 bg-gradient-to-b from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-[9] h-28 bg-gradient-to-t from-ink to-transparent" />
      {/* Keeps the copy legible over whichever cutout drifts behind it. */}
      <div className="pointer-events-none absolute inset-0 -z-[9] bg-[radial-gradient(70%_55%_at_50%_50%,rgba(30,36,43,0.88),transparent_75%)]" />

      <div className="relative mx-auto flex min-h-[88dvh] max-w-4xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <Reveal>
          <p className="eyebrow-script">Made to order</p>
          <h2 className="mt-2 text-[2rem] sm:text-5xl lg:text-6xl">
            <span className="text-cream">Nothing sits, </span>
            <span className="text-tan">nothing waits</span>
          </h2>
          <p className="mx-auto mt-7 max-w-lg text-pretty text-[0.9375rem] leading-relaxed text-cream-dim">
            Every plate is assembled when the order lands. Grains soaked the night before,
            vegetables cut that morning, dal tempered to order — which is why it tastes like
            someone cooked it for you, because someone did.
          </p>
          <Link
            href="/menu"
            className="group mt-9 inline-flex h-13 items-center gap-2.5 border border-tan/40 px-8 text-[0.8125rem] uppercase tracking-[0.2em] text-tan transition-all duration-300 hover:border-tan hover:bg-tan/10"
          >
            Start an order
            <ArrowRight
              size={15}
              className="transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
