"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Parallax } from "@/components/ui/Parallax";
import { Engraving } from "@/components/ui/Engraving";
import { dishImage } from "@/lib/dish-image";

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
 *   3  near flecks               spices, ~2x the plate's travel
 */

/**
 * Foreground flecks — chilli, bay leaf and star anise from the spice
 * scatter. Hand-placed so nothing lands on the plate's centre, and the two
 * chillies sit opposite each other: they are the only saturated colour in
 * the palette, so clustering them would pull the eye off the plate.
 */
const FLECKS = [
  // Corners first. The plate is 74% of this square container and centred,
  // so it fills roughly 13%–87% on both axes; anything inside that lands on
  // the food. The corners are the only generous space a square leaves
  // around an inscribed circle, so that is where these live.
  //
  // Parallax travel is kept under ~100px for the same reason: at the 150–190
  // used earlier, a fleck parked above the rim would drift down onto the
  // roti halfway through the scroll.
  { src: "s00", top: "-4%", left: "-6%", size: 62, distance: -86, delay: 0 },
  { src: "s03", top: "-2%", left: "92%", size: 52, distance: -96, delay: 0.6 },
  { src: "s12", top: "82%", left: "-8%", size: 50, distance: -74, delay: 1.2 },
  { src: "s08", top: "88%", left: "90%", size: 56, distance: -90, delay: 0.3 },
  // Then the four edge midpoints, each pushed clear of the rim.
  { src: "s10", top: "40%", left: "99%", size: 42, distance: -62, delay: 1.6 },
  { src: "s13", top: "44%", left: "-11%", size: 38, distance: -68, delay: 2.1 },
  { src: "s04", top: "-9%", left: "46%", size: 44, distance: -70, delay: 1.4 },
  { src: "s06", top: "95%", left: "42%", size: 40, distance: -80, delay: 0.8 },
] as const;

export function SignatureBand() {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  // A laid table, thrown out of focus behind the plate. The spread shot is
  // the right one: it is busy and warm, so once blurred it reads as a room
  // rather than as one recognisable dish competing with the thali.
  const backdrop = dishImage("thali-spread");

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
            Two seasonal sabzis, four fulka roti, dal and rice — with papad, salad, raita and
            pickle, the way it is served at home. Choose white rice or brown.
          </p>
          <Link
            href="/menu#rice-and-meals"
            className="group mt-8 inline-flex items-center gap-2.5 border-b border-tan/40 pb-1.5 pt-3 text-[0.8125rem] uppercase tracking-[0.2em] text-tan transition-colors hover:border-tan hover:text-tan-300"
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
          // `isolate` pins the negative-z layers below to this box. Without a
          // stacking context they escape upward and paint behind the section
          // itself, where the page ground hides them.
          className="relative isolate aspect-square w-full"
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          {/* Layer 0 — an out-of-focus plate of food behind the sharp one,
              which is what gives the panel depth rather than a flat glow.
              `sizes` deliberately asks for a tiny source: Next serves a
              ~384px file, the browser scales it up, and the CSS blur only
              has to smooth what is already soft. Blurring a full 1600px
              image every frame would cost far more and look no different. */}
          <div
            className="pointer-events-none absolute -inset-[18%] -z-20 overflow-hidden"
            aria-hidden
          >
            <div className="relative h-full w-full opacity-40 [filter:blur(26px)_saturate(1.1)]">
              {backdrop?.wide && (
                <Image
                  src={backdrop.wide}
                  alt=""
                  fill
                  sizes="320px"
                  className="scale-110 object-cover"
                />
              )}
            </div>
            {/* Feathers the blurred plate into the page instead of ending on
                a rectangle edge. */}
            <div className="absolute inset-0 bg-[radial-gradient(closest-side,transparent_35%,var(--color-ink)_85%)]" />
          </div>

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

          {/* Layer 2 — the plate on a turntable.
              This photograph is shot straight down, so the plate is a true
              circle with no perspective on the katori walls. That is the
              whole reason a full revolution works here and did not on the
              previous image, which was taken at about 35° — spinning an
              ellipse in its own plane reads as tumbling, not turning.
              Linear and endless: any easing gives it a visible start and
              stop, where linear reads as something that was already turning
              before you arrived. */}
          <Parallax distance={44} className="absolute inset-0 grid place-items-center">
            {/* Hover lift lives on its own wrapper. Folding a scale into the
                spinning element would share one transition with the rotation
                and restart it on every hover. */}
            <div
              className="w-[74%] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: hovered && !reduced ? "scale(1.05)" : "scale(1)" }}
            >
              <motion.div
                className="relative"
                animate={reduced ? {} : { rotate: 360 }}
                transition={reduced ? {} : { duration: 60, ease: "linear", repeat: Infinity }}
              >
                <Image
                  src="/menu/cutout/thali-plate.webp"
                  alt="A thali — dal, paneer curry, sabzi, steamed rice, roti, papad, salad, raita, pickle and lime"
                  width={1400}
                  height={1350}
                  sizes="(max-width: 1024px) 80vw, 40vw"
                  className="h-auto w-full drop-shadow-[0_28px_50px_rgba(0,0,0,0.55)]"
                />
              </motion.div>
            </div>
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
