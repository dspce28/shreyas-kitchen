"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Parallax } from "@/components/ui/Parallax";
import { Engraving } from "@/components/ui/Engraving";

/**
 * Meal of the Day, built as four parallax layers rather than a WebGL scene.
 *
 * This band used to mount the procedural 3D thali. The keyed photograph is
 * simply a better plate — real brass, real dal, real roti — and moving it in
 * layers gives the same depth for a fraction of the cost. It also frees a
 * WebGL context: browsers cap how many a page may hold, and the page already
 * spends one on the parallax band.
 *
 * Layers, slowest to fastest:
 *   1  engraving + glow          barely moves
 *   2  the thali, slowly turning
 *   3  near flecks               beans and mint, 2–3x the plate's travel
 */

/** Foreground flecks. Hand-placed so nothing lands on the plate's centre. */
const FLECKS = [
  { src: "p13", top: "6%", left: "4%", size: 58, distance: -150, delay: 0 },
  { src: "p09", top: "18%", left: "86%", size: 66, distance: -190, delay: 0.6 },
  { src: "p10", top: "70%", left: "2%", size: 52, distance: -130, delay: 1.2 },
  { src: "p03", top: "84%", left: "72%", size: 46, distance: -170, delay: 0.3 },
  { src: "p11", top: "44%", left: "94%", size: 44, distance: -110, delay: 1.6 },
  { src: "p05", top: "88%", left: "34%", size: 40, distance: -145, delay: 0.9 },
  { src: "p06", top: "2%", left: "56%", size: 38, distance: -125, delay: 1.4 },
] as const;

export function SignatureBand() {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  return (
    <section className="relative overflow-hidden border-y border-white/[0.07]">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-24 sm:px-6 sm:py-28 lg:grid-cols-2">
        {/* ── Copy ───────────────────────────────────────────────── */}
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

        {/* ── Layered plate ──────────────────────────────────────── */}
        <div
          className="relative aspect-square w-full"
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          {/* Layer 1 — engraving and glow, almost static */}
          <Engraving
            kind="spices"
            width={420}
            distance={26}
            opacity={0.09}
            className="inset-x-0 top-[8%] mx-auto w-[85%]"
          />
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(48%_48%_at_50%_50%,rgba(201,171,129,0.2),transparent_70%)]"
            aria-hidden
          />

          {/* Layer 2 — the plate. Rotates continuously; hovering speeds it
              up. A photograph shot from above can turn in its own plane
              without giving away that it is flat. */}
          <Parallax distance={44} className="absolute inset-0 grid place-items-center">
            <motion.div
              className="relative w-[82%]"
              animate={reduced ? {} : { rotate: 360 }}
              transition={
                reduced
                  ? {}
                  : { duration: hovered ? 26 : 110, ease: "linear", repeat: Infinity }
              }
            >
              <Image
                src="/menu/cutout/thali-plate.webp"
                alt="A brass thali — dal, two sabzis, rice, roti and pickle"
                width={900}
                height={401}
                sizes="(max-width: 1024px) 80vw, 40vw"
                className="h-auto w-full drop-shadow-[0_28px_50px_rgba(0,0,0,0.55)]"
              />
            </motion.div>
          </Parallax>

          {/* Layer 3 — near flecks, travelling furthest.
              Placed as percentages so the scatter holds its composition at
              any width, and given a slow idle bob on top of the scroll
              parallax so they still feel alive when the page is still. */}
          {FLECKS.map((f) => (
            <div
              key={f.src + f.left}
              className="pointer-events-none absolute z-10"
              style={{ top: f.top, left: f.left, width: f.size }}
            >
              <Parallax distance={f.distance}>
                <motion.div
                  animate={reduced ? {} : { y: [0, -9, 0], rotate: [0, 8, 0] }}
                  transition={
                    reduced
                      ? {}
                      : {
                          duration: 7 + f.size / 12,
                          delay: f.delay,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }
                  }
                >
                  <Image
                    src={`/menu/particle/${f.src}.webp`}
                    alt=""
                    width={f.size}
                    height={f.size}
                    aria-hidden
                    className="h-auto w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]"
                  />
                </motion.div>
              </Parallax>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
