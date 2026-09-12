"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * Scroll-triggered entrance.
 *
 * Directional, long and slow — a split section's left column enters from the
 * left and its right column from the right, over ~1.4s. Short, uniform
 * fade-ups read as a template; the directional pairing is what makes a
 * two-column section feel composed.
 *
 * `once` so content never re-animates on scroll-back, and the whole thing
 * collapses to a plain fade when the system asks for reduced motion.
 */

export type RevealFrom = "up" | "left" | "right" | "down" | "none";

const OFFSET: Record<RevealFrom, { x: number; y: number }> = {
  up: { x: 0, y: 48 },
  down: { x: 0, y: -48 },
  left: { x: -70, y: 0 },
  right: { x: 70, y: 0 },
  none: { x: 0, y: 0 },
};

export function Reveal({
  children,
  from = "up",
  delay = 0,
  duration = 1.4,
  className,
  /** Scale up very slightly as it settles. Off by default. */
  zoom = false,
}: {
  children: React.ReactNode;
  from?: RevealFrom;
  delay?: number;
  duration?: number;
  className?: string;
  zoom?: boolean;
}) {
  const reduced = useReducedMotion();
  const { x, y } = OFFSET[from];

  const variants: Variants = {
    hidden: {
      opacity: 0,
      x: reduced ? 0 : x,
      y: reduced ? 0 : y,
      scale: reduced || !zoom ? 1 : 0.96,
    },
    shown: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        duration: reduced ? 0.2 : duration,
        delay: reduced ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggers its children on entry. Used for card grids, where firing every
 * card at once wastes the effect.
 */
export function RevealGroup({
  children,
  stagger = 0.12,
  className,
}: {
  children: React.ReactNode;
  stagger?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: reduced ? 0 : stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** A single child of RevealGroup. Inherits the group's stagger timing. */
export function RevealItem({
  children,
  from = "up",
  className,
  duration = 1.1,
}: {
  children: React.ReactNode;
  from?: RevealFrom;
  className?: string;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const { x, y } = OFFSET[from];

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, x: reduced ? 0 : x, y: reduced ? 0 : y },
        shown: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: { duration: reduced ? 0.2 : duration, ease: [0.16, 1, 0.3, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
