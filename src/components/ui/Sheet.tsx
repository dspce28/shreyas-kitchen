"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** "right" is a desktop drawer; on small screens both slide up from the bottom. */
  side?: "right" | "center";
  className?: string;
}

/**
 * Modal surface used for the cart, login and address forms.
 *
 * Handles the things a raw <div> overlay gets wrong: focus is moved in and
 * trapped, Escape closes, the page behind cannot scroll, and the panel is
 * announced as a dialog.
 */
export function Sheet({ open, onClose, title, subtitle, children, side = "right", className }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow, paddingRight } = document.body.style;
    // Compensate for the scrollbar so the page does not jump on open.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;

      const focusables = panel.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input:not([type="hidden"]),select,[tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    const id = requestAnimationFrame(() => {
      const preferred = panel.current?.querySelector<HTMLElement>("[data-autofocus]");
      if (preferred) preferred.focus();
      else panel.current?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKey, true);
      cancelAnimationFrame(id);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const isDrawer = side === "right";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90]">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ opacity: 0, y: 40, x: 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className={cn(
              "absolute flex flex-col overflow-hidden bg-ink-800/95 shadow-[var(--shadow-lift)] backdrop-blur-2xl",
              "border-t border-white/10 outline-none",
              // Bottom sheet on phones, regardless of `side`.
              "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[1.75rem]",
              isDrawer
                ? "sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:rounded-l-[1.75rem] sm:border-l sm:border-t-0"
                : "sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[88dvh] sm:max-w-lg sm:rounded-[1.75rem] sm:border",
              className,
            )}
          >
            {/* Drag affordance for the mobile sheet. */}
            <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" />

            {(title || subtitle) && (
              <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
                <div>
                  {title && <h2 className="font-display text-2xl text-cream">{title}</h2>}
                  {subtitle && <p className="mt-0.5 text-sm text-stone">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="-m-2 rounded-full p-2 text-stone transition hover:bg-white/5 hover:text-cream"
                >
                  <X size={18} />
                </button>
              </header>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
