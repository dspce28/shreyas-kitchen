"use client";

import { cn } from "@/lib/utils";
import { STATUS_LABEL, type OrderStatus } from "@/lib/types";

const TONE: Record<OrderStatus, string> = {
  pending: "border-ember/35 bg-ember/12 text-ember",
  accepted: "border-sage/35 bg-sage/12 text-sage-300",
  preparing: "border-tan/35 bg-tan/12 text-tan-300",
  ready: "border-tan/45 bg-tan/18 text-tan-300",
  out_for_delivery: "border-tan/45 bg-tan/18 text-tan-300",
  delivered: "border-sage/40 bg-sage/15 text-sage-300",
  rejected: "border-danger/35 bg-danger/12 text-danger",
  cancelled: "border-white/12 bg-white/5 text-stone",
};

export function StatusPill({
  status,
  className,
  pulse,
}: {
  status: OrderStatus;
  className?: string;
  /** Draws attention while the kitchen has not decided yet. */
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] uppercase tracking-[0.1em]",
        TONE[status],
        className,
      )}
    >
      {pulse && status === "pending" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}
