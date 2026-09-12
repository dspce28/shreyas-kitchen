"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MapPin, Phone, RefreshCw, StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextArea } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toaster";
import { StatusPill } from "@/components/orders/StatusPill";
import { rupees, formatTime, cn } from "@/lib/utils";
import { NEXT_STATUSES, STATUS_LABEL, type Order, type OrderStatus } from "@/lib/types";

const POLL_MS = 8000;

type AdminOrder = Order & { customers?: { name: string | null; phone: string } | null };

/**
 * The kitchen queue. Oldest first — the order things should be cooked in.
 *
 * New orders arrive by polling. An audible chime fires on the first sight of
 * a new pending order, because nobody is going to watch a screen while
 * they're at the stove.
 */
export function OrderQueue() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [scope, setScope] = useState<"live" | "all">("live");
  const [rejecting, setRejecting] = useState<AdminOrder | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const knownPending = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const load = useCallback(
    async (which: "live" | "all") => {
      try {
        const res = await fetch(`/api/admin/orders?scope=${which}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const next: AdminOrder[] = data.orders;
        const pending = next.filter((o) => o.status === "pending");

        // Chime only for orders we have not seen before, and never on the
        // very first render (that would fire on every page load).
        const fresh = pending.filter((o) => !knownPending.current.has(o.id));
        if (!firstLoad.current && fresh.length > 0) {
          chime();
          toast.info(`${fresh.length} new order${fresh.length === 1 ? "" : "s"}.`);
        }
        knownPending.current = new Set(pending.map((o) => o.id));
        firstLoad.current = false;

        setOrders(next);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load orders.");
      }
    },
    [],
  );

  useEffect(() => {
    void load(scope);
    const timer = setInterval(() => {
      if (!document.hidden) void load(scope);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [scope, load]);

  async function setStatus(order: AdminOrder, status: OrderStatus, rejectReason?: string) {
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${order.order_no} → ${STATUS_LABEL[status]}`);
      await load(scope);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the order.");
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = orders?.filter((o) => o.status === "pending").length ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Kitchen queue</p>
          <h1 className="mt-2 text-4xl">
            {pendingCount > 0 ? (
              <>
                <span className="tnum text-sage-300">{pendingCount}</span> awaiting you
              </>
            ) : (
              "All caught up"
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
            {(["live", "all"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs capitalize transition",
                  scope === s ? "bg-sage/20 text-sage-300" : "text-sand hover:text-cream",
                )}
              >
                {s === "live" ? "In progress" : "Everything"}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            loading={refreshing}
            onClick={async () => {
              setRefreshing(true);
              await load(scope);
              setRefreshing(false);
            }}
          >
            <RefreshCw size={14} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      {!orders ? (
        <div className="mt-10 grid gap-4 lg:grid-cols-2" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-[1.5rem] bg-white/[0.04]" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="mt-20 text-center text-sand">
          {scope === "live" ? "Nothing in the queue right now." : "No orders yet."}
        </p>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <AnimatePresence initial={false}>
            {orders.map((order) => (
              <motion.article
                key={order.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "flex flex-col rounded-[1.5rem] border p-5",
                  order.status === "pending"
                    ? "border-ember/35 bg-ember/[0.05] shadow-[0_0_0_1px_rgba(217,139,82,0.1)]"
                    : "border-white/[0.08] bg-white/[0.03]",
                )}
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="tnum font-display text-xl text-cream">
                        {order.order_no}
                      </span>
                      <StatusPill status={order.status} pulse />
                    </div>
                    <p className="tnum mt-1 text-xs text-stone">
                      {formatTime(order.placed_at)} ·{" "}
                      {order.customers?.name ?? "Guest"} · {order.ship_phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="price-script text-[1.75rem]">
                      {rupees(order.total_paise)}
                    </p>
                    <p
                      className={cn(
                        "text-[0.625rem] uppercase tracking-wider",
                        order.payment_method === "cod"
                          ? "text-sand"
                          : order.payment_status === "paid"
                            ? "text-sage-300"
                            : "text-danger",
                      )}
                    >
                      {order.payment_method === "cod"
                        ? "Cash on delivery"
                        : `Online · ${order.payment_status}`}
                    </p>
                  </div>
                </header>

                <ul className="mt-4 space-y-1.5 border-y border-white/[0.07] py-3.5 text-sm">
                  {order.order_items?.map((l) => (
                    <li key={l.id} className="flex gap-2.5">
                      <span className="tnum shrink-0 font-medium text-sage-300">{l.qty}×</span>
                      <span className="min-w-0 flex-1">
                        <span className="text-cream">{l.name_snapshot}</span>
                        {l.detail && (
                          <span className="block text-xs text-stone">{l.detail}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {order.customer_note && (
                  <p className="mt-3 flex gap-2 rounded-xl border border-sage/20 bg-sage/[0.07] px-3 py-2 text-xs leading-relaxed text-cream-dim">
                    <StickyNote size={13} className="mt-0.5 shrink-0 text-sage-300" aria-hidden />
                    {order.customer_note}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone">
                  <span className="inline-flex items-start gap-1.5">
                    <MapPin size={12} className="mt-0.5 shrink-0" aria-hidden />
                    {[order.ship_line1, order.ship_landmark].filter(Boolean).join(", ")},{" "}
                    {order.ship_pincode}
                  </span>
                  <a
                    href={`tel:${order.ship_phone}`}
                    className="inline-flex items-center gap-1.5 transition hover:text-sage-300"
                  >
                    <Phone size={12} aria-hidden />
                    Call
                  </a>
                </div>

                {/* Actions: exactly the transitions the state machine allows. */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {order.status === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        loading={busyId === order.id}
                        onClick={() => void setStatus(order, "accepted")}
                      >
                        <Check size={14} aria-hidden />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === order.id}
                        onClick={() => {
                          setRejecting(order);
                          setReason("");
                        }}
                      >
                        <X size={14} aria-hidden />
                        Reject
                      </Button>
                    </>
                  ) : (
                    NEXT_STATUSES[order.status].map((next) => (
                      <Button
                        key={next}
                        size="sm"
                        variant={next === "cancelled" ? "danger" : "secondary"}
                        loading={busyId === order.id}
                        onClick={() => {
                          if (next === "cancelled" && !confirm(`Cancel ${order.order_no}?`)) return;
                          void setStatus(order, next, next === "cancelled" ? "Cancelled by the kitchen" : undefined);
                        }}
                      >
                        {STATUS_LABEL[next]}
                      </Button>
                    ))
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Sheet
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        side="center"
        title={`Reject ${rejecting?.order_no ?? ""}`}
        subtitle="The customer sees this reason on their tracking page."
      >
        <div className="space-y-4 px-6 pb-7">
          <TextArea
            data-autofocus
            label="Reason"
            placeholder="Out of fresh moong today — sorry!"
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {[
              "Out of stock for this item",
              "Outside our delivery area",
              "Kitchen is at capacity right now",
            ].map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-sand transition hover:border-sage/45 hover:text-sage-300"
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button
              variant="danger"
              className="flex-1"
              disabled={!reason.trim()}
              loading={busyId === rejecting?.id}
              onClick={async () => {
                if (!rejecting) return;
                await setStatus(rejecting, "rejected", reason.trim());
                setRejecting(null);
              }}
            >
              Reject order
            </Button>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Keep it
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

/** A short two-tone chime, synthesised so there is no audio file to ship. */
function chime() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    // Autoplay policy blocked it — the toast still shows.
  }
}
