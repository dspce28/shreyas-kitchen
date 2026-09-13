"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { dishImage } from "@/lib/dish-image";

/**
 * Full-bleed photograph that scrolls slower than the page, with the copy
 * riding over it.
 *
 * The reference template does this with `background-attachment: fixed`. That
 * is one line, and it is broken on iOS — Safari pins the image to the
 * viewport and the whole band judders. Translating an oversized image on a
 * damped spring gives the same read and behaves on a phone.
 *
 * The image is deliberately taller than the section (130%) so there is
 * travel to spend; at 100% the parallax would expose the band's own
 * background at one end or the other.
 */
export function ScenePanel({
  slug,
  script,
  head,
  body,
  href,
  cta,
}: {
  slug: string;
  script: string;
  /** Split so exactly one half can take the tan. */
  head: [string, string];
  body: string;
  href: string;
  cta: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const image = dishImage(slug);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const raw = useTransform(scrollYProgress, [0, 1], ["-11%", "11%"]);
  const y = useSpring(raw, { stiffness: 80, damping: 26, mass: 0.4 });

  return (
    <section ref={ref} className="relative isolate flex min-h-[70dvh] items-center overflow-hidden">
      <motion.div
        className="absolute inset-x-0 -top-[15%] -z-20 h-[130%]"
        style={reduced ? undefined : { y }}
      >
        {image?.wide && (
          <Image
            src={image.wide}
            alt=""
            fill
            sizes="100vw"
            placeholder="blur"
            blurDataURL={image.blur}
            className="object-cover"
          />
        )}
      </motion.div>

      {/* Two scrims again, both fading out rather than both ending opaque:
          one anchors the band into the page top and bottom, one darkens the
          middle so the headline holds over whatever is behind it. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink via-transparent to-ink" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(65%_60%_at_50%_50%,rgba(18,26,22,0.9),transparent_75%)]" />

      <div className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
        <Reveal>
          <p className="eyebrow-script">{script}</p>
          <h2 className="mt-2 text-[2rem] sm:text-5xl">
            <span className="text-cream">{head[0]} </span>
            <span className="text-tan">{head[1]}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-pretty text-[0.9375rem] leading-relaxed text-cream-dim">
            {body}
          </p>
          <Link
            href={href}
            className="group mt-9 inline-flex h-13 items-center gap-2.5 border border-tan/40 px-8 text-[0.8125rem] uppercase tracking-[0.2em] text-tan transition-all duration-300 hover:border-tan hover:bg-tan/10"
          >
            {cta}
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
