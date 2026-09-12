"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  // Light sage fill with a lit top edge. A pale button on a dark green ground
  // gives the strongest contrast in the palette, and reads fresh rather than
  // gilded — tan is kept for the wordmark and prices instead.
  primary:
    "bg-gradient-to-b from-sage-300 to-sage-600 text-ink-900 font-medium " +
    "shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_12px_28px_-12px_rgba(156,191,143,0.7)] " +
    "hover:from-sage-300 hover:to-sage hover:shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_16px_36px_-12px_rgba(156,191,143,0.85)] " +
    "active:translate-y-px",
  secondary:
    "glass text-cream hover:border-sage/45 hover:bg-white/[0.07] active:translate-y-px",
  ghost: "text-sand hover:text-cream hover:bg-white/5",
  danger:
    "bg-danger/15 text-danger border border-danger/35 hover:bg-danger/25 active:translate-y-px",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.8125rem] rounded-xl gap-1.5",
  md: "h-11 px-5 text-sm rounded-2xl gap-2",
  lg: "h-13 px-7 text-[0.9375rem] rounded-2xl gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex select-none items-center justify-center whitespace-nowrap",
        "transition-all duration-200 ease-[var(--ease-out-quint)]",
        "disabled:pointer-events-none disabled:opacity-45",
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
