"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Parallax } from "@/components/ui/Parallax";
import { CountUp } from "@/components/ui/CountUp";
import { Engraving } from "@/components/ui/Engraving";
import { dishImage } from "@/lib/dish-image";
import { STORE, CATEGORIES } from "@/data/menu";

/**
 * The story section: two overlapping photographs on one side, the script
 * eyebrow / light-caps headline pairing on the other.
 *
 * The two images move at slightly different parallax rates, which is what
 * separates them in depth — overlapping two static photos just looks like a
 * layout mistake.
 */
export function About() {
  const primary = dishImage("moong-dal-chilla");
  const secondary = dishImage("filter-coffee");

  const dishes = CATEGORIES.reduce((n, c) => n + c.items.length, 0);

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <Engraving kind="spices" width={440} className="-right-24 top-8 w-[28rem] opacity-100" />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
        {/* ── Images ─────────────────────────────────────────────── */}
        <Reveal from="left" className="order-2 lg:order-1">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md lg:max-w-none">
            <Parallax distance={26} className="absolute inset-0">
              <div className="relative h-full w-full overflow-hidden">
                {primary?.wide && (
                  <Image
                    src={primary.wide}
                    alt="A plate of moong dal chilla with chutneys"
                    fill
                    sizes="(max-width: 1024px) 90vw, 45vw"
                    placeholder="blur"
                    blurDataURL={primary.blur}
                    className="object-cover"
                  />
                )}
              </div>
            </Parallax>

            {/* Inset second frame, moving against the first. */}
            <Parallax
              distance={-46}
              className="absolute -bottom-10 -right-6 z-10 h-44 w-36 sm:h-56 sm:w-44"
            >
              <div className="relative h-full w-full overflow-hidden border-4 border-ink shadow-[var(--shadow-lift)]">
                {secondary?.dish && (
                  <Image
                    src={secondary.dish}
                    alt="Filter coffee in a brass davara"
                    fill
                    sizes="200px"
                    placeholder="blur"
                    blurDataURL={secondary.blur}
                    className="object-cover"
                  />
                )}
              </div>
            </Parallax>

            {/* Tan rule framing the composition. */}
            <span
              className="pointer-events-none absolute -left-5 -top-5 h-24 w-24 border-l border-t border-tan/40"
              aria-hidden
            />
          </div>
        </Reveal>

        {/* ── Copy ───────────────────────────────────────────────── */}
        <Reveal from="right" delay={0.1} className="order-1 lg:order-2">
          <p className="eyebrow-script">Our story</p>

          <h2 className="mt-2 text-[2rem] sm:text-5xl">
            <span className="text-cream">Cooked through </span>
            <span className="text-tan">the day</span>
          </h2>

          <div className="mt-7 space-y-4 text-[0.9375rem] leading-relaxed text-sand">
            <p>
              Shreya&rsquo;s Kitchen sits inside {STORE.location}, feeding the people who work
              in it. Nothing is batch-made at dawn and reheated — chillas hit the pan when you
              order them, juices are pressed rather than poured, and the meal of the day changes
              with what the market had that morning.
            </p>
            <p>
              Light and clean does not mean small. A meal of the day is two seasonal sabzis,
              four fulka roti, dal and rice. Honest portions, for the way you actually work.
            </p>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-6 border-y border-white/[0.08] py-7">
            {[
              { n: dishes, suffix: "", label: "Dishes, made fresh" },
              { n: CATEGORIES.length, suffix: "", label: "Sections on the menu" },
              { n: 10, suffix: "hrs", label: "Open, 8am to 6pm" },
            ].map((s) => (
              <div key={s.label}>
                <dt className="font-display text-3xl font-extralight text-tan sm:text-4xl">
                  <CountUp to={s.n} suffix={s.suffix} />
                </dt>
                <dd className="mt-1.5 text-[0.6875rem] uppercase tracking-[0.16em] text-stone">
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>

          <Link
            href="/menu"
            className="group mt-9 inline-flex items-center gap-2.5 border-b border-tan/40 pb-1.5 text-[0.8125rem] uppercase tracking-[0.2em] text-tan transition-colors hover:border-tan hover:text-tan-300"
          >
            Read the menu
            <ArrowRight
              size={14}
              className="transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
