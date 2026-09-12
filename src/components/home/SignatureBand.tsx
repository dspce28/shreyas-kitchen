"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Hero3D from "@/components/three/Hero3D";
import { Reveal } from "@/components/ui/Reveal";

/**
 * The WebGL thali, given its own band.
 *
 * It used to carry the hero; photography does that better now. But the model
 * is the Meal of the Day — the kitchen's signature — so it keeps a stage of
 * its own rather than being deleted. On a dedicated band it can also be the
 * only thing moving, which is when a 3D scene actually reads as craft rather
 * than decoration.
 */
export function SignatureBand() {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.07]">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2">
        <Reveal from="left">
          <p className="eyebrow-script">Our signature</p>
          <h2 className="mt-2 text-[2rem] sm:text-5xl">
            <span className="text-cream">Meal of </span>
            <span className="text-tan">the day</span>
          </h2>
          <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-sand">
            Two seasonal sabzis, four fulka roti, dal and rice — served on brass, the way it
            is served at home. Choose white rice or brown.
          </p>
          <Link
            href="/menu#rice-and-meals"
            className="group mt-8 inline-flex items-center gap-2.5 border-b border-tan/40 pb-1.5 text-[0.8125rem] uppercase tracking-[0.2em] text-tan transition-colors hover:border-tan hover:text-tan-300"
          >
            Order the thali
            <ArrowRight
              size={14}
              className="transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </Reveal>

        {/* The canvas pauses itself when scrolled out of view. */}
        <div className="relative h-[22rem] sm:h-[26rem]">
          <Hero3D className="absolute inset-0" />
        </div>
      </div>
    </section>
  );
}
