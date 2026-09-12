"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Branded loading curtain.
 *
 * Deliberately short-lived and self-limiting: it hides on `load`, and a
 * 2.2s hard ceiling means a stalled image can never trap someone behind it.
 * It also does not show at all on repeat visits within a session — a
 * preloader you see on every navigation stops being an entrance and starts
 * being an obstacle.
 */

const SEEN_KEY = "sk-preloaded";

export function Preloader() {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // Private mode or blocked storage — treat as a first visit.
    }
    if (seen || reduced) return;

    setShow(true);
    const done = () => {
      setShow(false);
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* nothing to do */
      }
    };

    const ceiling = setTimeout(done, 2200);
    if (document.readyState === "complete") {
      const floor = setTimeout(done, 650);
      return () => {
        clearTimeout(ceiling);
        clearTimeout(floor);
      };
    }
    window.addEventListener("load", done, { once: true });
    return () => {
      clearTimeout(ceiling);
      window.removeEventListener("load", done);
    };
  }, [reduced]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] grid place-items-center bg-ink"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        >
          <div className="flex flex-col items-center">
            <motion.p
              className="eyebrow-script"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Shreya&rsquo;s
            </motion.p>
            <motion.p
              className="mt-1 font-display text-2xl font-extralight uppercase tracking-[0.42em] text-cream"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              Kitchen
            </motion.p>

            {/* A determinate-looking sweep. It is not tied to real progress —
                pretending to measure bytes would be a lie, and nobody reads
                a percentage that finishes in under two seconds anyway. */}
            <div className="mt-6 h-px w-40 overflow-hidden bg-white/10">
              <motion.div
                className="h-full w-full bg-tan"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
