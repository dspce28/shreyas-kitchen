"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * Moves its children at a different rate to the page as they pass through
 * the viewport.
 *
 * The spring is the important part. Binding transform straight to scroll
 * position makes the element feel welded to the scrollbar and stutters on
 * trackpads that emit coarse deltas; a light spring lets it lag and settle,
 * which is what reads as depth.
 */
export function Parallax({
  children,
  /** Total travel in pixels across the element's whole pass. Negative = up. */
  distance = 80,
  axis = "y",
  className,
}: {
  children: React.ReactNode;
  distance?: number;
  axis?: "x" | "y";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const raw = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const smooth = useSpring(raw, { stiffness: 90, damping: 24, mass: 0.35 });

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={axis === "y" ? { y: smooth } : { x: smooth }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Slow zoom on a background image while it is on screen. Used behind
 * section banners, where a static photograph looks like a placeholder.
 */
export function ParallaxZoom({
  children,
  className,
  from = 1.12,
  to = 1,
}: {
  children: React.ReactNode;
  className?: string;
  from?: number;
  to?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [from, to]);
  const smooth = useSpring(scale, { stiffness: 80, damping: 26, mass: 0.4 });

  return (
    <div ref={ref} className={className}>
      <motion.div className="h-full w-full" style={reduced ? undefined : { scale: smooth }}>
        {children}
      </motion.div>
    </div>
  );
}
