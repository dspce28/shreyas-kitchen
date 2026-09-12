"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-cream " +
  "placeholder:text-stone/60 transition " +
  "hover:border-white/20 focus:border-sage/60 focus:bg-white/[0.06] focus:outline-none " +
  "disabled:opacity-50";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, prefix, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  const describedBy = error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="block text-[0.8125rem] font-medium text-cream-dim">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone tnum">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(base, prefix && "pl-12", error && "border-danger/60", className)}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${fieldId}-err`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-stone">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

interface AreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, AreaProps>(function TextArea(
  { label, hint, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="block text-[0.8125rem] font-medium text-cream-dim">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        className={cn(base, "min-h-[5rem] resize-y", className)}
        {...rest}
      />
      {hint && <p className="text-xs text-stone">{hint}</p>}
    </div>
  );
});

export function Select({
  label,
  className,
  children,
  id,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="block text-[0.8125rem] font-medium text-cream-dim">
          {label}
        </label>
      )}
      <select
        id={fieldId}
        className={cn(base, "appearance-none bg-ink-700 pr-9", className)}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
