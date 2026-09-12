"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A three-line toast system. Every network failure in this app surfaces here
 * rather than in a console the customer will never open.
 */

type Tone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (tone: Tone, message: string) => void;
  dismiss: (id: number) => void;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (tone, message) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, tone, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (m: string) => useToastStore.getState().push("success", m),
  error: (m: string) => useToastStore.getState().push("error", m),
  info: (m: string) => useToastStore.getState().push("info", m),
};

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const TONES: Record<Tone, string> = {
  success: "text-sage-300",
  error: "text-danger",
  // Neutral, so it cannot be mistaken for the success tone at a glance.
  info: "text-cream-dim",
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:pr-6"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3 shadow-[var(--shadow-lift)]"
            >
              <Icon size={18} className={cn("mt-0.5 shrink-0", TONES[t.tone])} aria-hidden />
              <p className="flex-1 text-sm leading-snug text-cream">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="-m-1 rounded-full p-1 text-stone transition hover:text-cream"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
