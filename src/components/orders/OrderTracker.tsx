"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, MapPin, Phone, X, ChefHat, Bike, PackageCheck, Clock } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { StatusPill } from "./StatusPill";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { rupees, formatWhen, formatTime, cn } from "@/lib/utils";
import {
  STATUS_BLURB,
  STATUS_FLOW,
  STATUS_LABEL,
  TERMINAL_STATUSES,
  type Order,
  type OrderStatus,
} from "@/lib/types";
import { STORE } from "@/data/menu";

const POLL_MS = 6000;

const STEP_ICON: Partial<Record<OrderStatus, typeof Check>> = {
  pending: Clock,
  accepted: Check,
  preparing: ChefHat,
  ready: PackageCheck,
  out_for_delivery: Bike,
  delivered: Check,
};

/**
 * Live order tracking.
 *
 * Polls rather than subscribing: the app authenticates with its own session
 * cookie, not a Supabase JWT, so a browser-side Realtime subscription would
 * need the anon key and RLS policies we deliberately do not have. A 6-second
 * poll on one small row is cheap, and it stops the moment the order reaches a
 * terminal state or the tab goes to the background.
 */
export function OrderTracker({ orderNo }: { orderNo: string }) {
  const { customer, ready, requireLogin } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const lastStatus = useRef<OrderStatus | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderNo}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load this order.");

      setOrder(data.order);
      setError(null);

      // Announce transitions the customer did not trigger themselves.
      const next = data.order.status as OrderStatus;
      if (lastStatus.current && lastStatus.current !== next) {
        if (next === "accepted") toast.success("Your order was accepted.");
        else if (next === "rejected") toast.error("Your order was not accepted.");
        else toast.info(STATUS_LABEL[next]);
      }
      lastStatus.current = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }, [orderNo]);

  useEffect(() => {
    if (ready && !customer) void requireLogin();
  }, [ready, customer, requireLogin]);

  useEffect(() => {
    if (!customer) return;
    void load();

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (!document.hidden) void load();
      }, POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    start();
    const onVisible = () => {
      if (document.hidden) stop();
      else {
        void load();
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [customer, load]);

  // Nothing more will change — stop polling.
  useEffect(() => {
    if (order && TERMINAL_STATUSES.includes(order.status)) lastStatus.current = order.status;
  }, [order]);

  async function cancel() {
    if (!confirm("Cancel this order? This cannot be undone.")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${orderNo}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.info("Order cancelled.");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel.");
    } finally {
      setCancelling(false);
    }
  }

  if (error && !order) {
    return (
      <div className="mx-auto max-w-md px-6 py-28 text-center">
        <h1 className="font-display text-2xl text-cream">{error}</h1>
        <Link
          href="/orders"
          className="mt-5 inline-flex text-sm text-sage-300 underline-offset-4 hover:underline"
        >
          Back to your orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6" aria-hidden>
        <div className="h-8 w-40 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-8 h-64 animate-pulse rounded-[1.75rem] bg-white/[0.04]" />
      </div>
    );
  }

  const rejected = order.status === "rejected" || order.status === "cancelled";
  const currentIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <Link
        href="/orders"
        className="text-xs text-stone underline-offset-4 transition hover:text-cream hover:underline"
      >
        ← All orders
      </Link>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Order</p>
          <h1 className="tnum mt-2 text-4xl sm:text-5xl">{order.order_no}</h1>
          <p className="mt-2 text-sm text-stone">{formatWhen(order.placed_at)}</p>
        </div>
        <StatusPill status={order.status} pulse className="mt-2" />
      </header>

      {/* ── Status headline ─────────────────────────────────── */}
      <div
        className={cn(
          "mt-8 rounded-[1.75rem] border p-6",
          rejected ? "border-danger/25 bg-danger/[0.07]" : "glass-sage",
        )}
      >
        <p className="font-display text-2xl text-cream">{STATUS_LABEL[order.status]}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-cream-dim">
          {STATUS_BLURB[order.status]}
        </p>

        {order.reject_reason && (
          <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-sand">
            {order.reject_reason}
          </p>
        )}

        {order.status === "pending" && order.payment_method === "cod" && (
          <Button
            variant="danger"
            size="sm"
            className="mt-4"
            loading={cancelling}
            onClick={() => void cancel()}
          >
            <X size={14} aria-hidden />
            Cancel order
          </Button>
        )}
      </div>

      {/* ── Timeline ────────────────────────────────────────── */}
      {!rejected && (
        <ol className="mt-10 space-y-0">
          {STATUS_FLOW.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            const Icon = STEP_ICON[step] ?? Check;
            const event = order.order_events?.find((e) => e.status === step);

            return (
              <li key={step} className="relative flex gap-4 pb-8 last:pb-0">
                {i < STATUS_FLOW.length - 1 && (
                  <span
                    className={cn(
                      "absolute left-[1.1875rem] top-10 h-[calc(100%-1.5rem)] w-px",
                      done ? "bg-sage/45" : "bg-white/10",
                    )}
                    aria-hidden
                  />
                )}

                <motion.span
                  initial={false}
                  animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={{ duration: 2.2, repeat: active ? Infinity : 0, ease: "easeInOut" }}
                  className={cn(
                    "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors",
                    done && "border-sage/45 bg-sage/20 text-sage-300",
                    active && "border-sage bg-sage text-ink-900 shadow-[0_0_0_6px_rgba(156,191,143,0.16)]",
                    !done && !active && "border-white/10 bg-white/[0.03] text-stone",
                  )}
                >
                  <Icon size={16} aria-hidden />
                </motion.span>

                <div className="min-w-0 flex-1 pt-1.5">
                  <p
                    className={cn(
                      "text-[0.9375rem]",
                      done || active ? "text-cream" : "text-stone",
                    )}
                  >
                    {STATUS_LABEL[step]}
                  </p>
                  {event && (
                    <p className="tnum mt-0.5 text-xs text-stone">
                      {formatTime(event.created_at)}
                      {event.note ? ` · ${event.note}` : ""}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* ── Items ───────────────────────────────────────────── */}
      <section className="glass mt-10 rounded-[1.75rem] p-6">
        <h2 className="font-display text-xl text-cream">What&rsquo;s coming</h2>
        <ul className="mt-4 space-y-3 border-b border-white/[0.07] pb-4">
          {order.order_items?.map((l) => (
            <li key={l.id} className="flex gap-3 text-sm">
              <span className="tnum shrink-0 text-stone">{l.qty}×</span>
              <span className="min-w-0 flex-1">
                <span className="block text-cream">{l.name_snapshot}</span>
                {l.detail && <span className="block text-xs text-stone">{l.detail}</span>}
              </span>
              <span className="tnum shrink-0 text-sand">{rupees(l.line_paise)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-sand">
            <dt>Subtotal</dt>
            <dd className="tnum">{rupees(order.subtotal_paise)}</dd>
          </div>
          <div className="flex justify-between text-sand">
            <dt>Delivery</dt>
            <dd className="tnum">
              {order.delivery_fee_paise === 0 ? "Free" : rupees(order.delivery_fee_paise)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-white/[0.07] pt-2.5">
            <dt className="font-display text-lg text-cream">
              Total
              <span className="ml-2 text-xs uppercase tracking-wider text-stone">
                {order.payment_method === "cod"
                  ? "Cash on delivery"
                  : order.payment_status === "paid"
                    ? "Paid online"
                    : `Online · ${order.payment_status}`}
              </span>
            </dt>
            <dd className="price-script text-[2rem]">
              {rupees(order.total_paise)}
            </dd>
          </div>
        </dl>

        {order.customer_note && (
          <p className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm italic text-sand">
            &ldquo;{order.customer_note}&rdquo;
          </p>
        )}
      </section>

      {/* ── Delivery + help ─────────────────────────────────── */}
      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="glass rounded-[1.5rem] p-5">
          <p className="eyebrow mb-2.5">Delivering to</p>
          <p className="flex gap-2.5 text-sm leading-relaxed text-sand">
            <MapPin size={15} className="mt-0.5 shrink-0 text-tan" aria-hidden />
            <span>
              {order.ship_name && (
                <>
                  <span className="text-cream">{order.ship_name}</span>
                  <br />
                </>
              )}
              {[order.ship_line1, order.ship_line2, order.ship_landmark].filter(Boolean).join(", ")}
              <br />
              {order.ship_city} {order.ship_pincode}
            </span>
          </p>
        </div>

        <div className="glass rounded-[1.5rem] p-5">
          <p className="eyebrow mb-2.5">Need to change something?</p>
          <a
            href={`tel:${STORE.phone}`}
            className="inline-flex items-center gap-2.5 text-sm text-cream transition hover:text-sage-300"
          >
            <Phone size={15} className="text-tan" aria-hidden />
            <span className="tnum">{STORE.phoneDisplay}</span>
          </a>
          <p className="mt-2 text-xs leading-relaxed text-stone">
            Call the kitchen directly — {STORE.owner} will sort it out.
          </p>
        </div>
      </section>
    </div>
  );
}
