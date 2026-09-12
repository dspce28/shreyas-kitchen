"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { StatusPill } from "./StatusPill";
import { Button } from "@/components/ui/Button";
import { rupees, formatWhen } from "@/lib/utils";
import { TERMINAL_STATUSES, type Order } from "@/lib/types";

export function OrderHistory() {
  const { customer, ready, requireLogin } = useSession();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!customer) return;
    fetch("/api/orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]));
  }, [customer]);

  if (ready && !customer) {
    return (
      <Empty
        title="Sign in to see your orders"
        body="Your history is tied to your mobile number."
        action={<Button onClick={() => void requireLogin()}>Sign in</Button>}
      />
    );
  }

  if (!orders) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-16 sm:px-6" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-[1.5rem] bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Empty
        title="No orders yet"
        body="When you order, it'll show up here with live status."
        action={
          <Link
            href="/menu"
            className="inline-flex h-11 items-center rounded-2xl bg-gradient-to-b from-sage-300 to-sage-600 px-5 text-sm font-medium text-ink transition hover:brightness-105"
          >
            Browse the menu
          </Link>
        }
      />
    );
  }

  const live = orders.filter((o) => !TERMINAL_STATUSES.includes(o.status));
  const past = orders.filter((o) => TERMINAL_STATUSES.includes(o.status));

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow">Your orders</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">History</h1>

      {live.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-4 text-sage/80">In progress</h2>
          <div className="space-y-3">
            {live.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-4">Earlier</h2>
          <div className="space-y-3">
            {past.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const itemCount = (order.order_items ?? []).reduce((n, l) => n + l.qty, 0);
  const preview = (order.order_items ?? [])
    .slice(0, 3)
    .map((l) => l.name_snapshot)
    .join(", ");

  return (
    <Link
      href={`/orders/${order.order_no}`}
      className="group flex items-center gap-4 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-5 transition-all duration-300 hover:border-sage/35 hover:bg-white/[0.05]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="tnum font-display text-lg text-cream">{order.order_no}</span>
          <StatusPill status={order.status} pulse />
        </div>
        <p className="mt-1.5 truncate text-[0.8125rem] text-sand">
          {itemCount} item{itemCount === 1 ? "" : "s"} · {preview}
          {(order.order_items?.length ?? 0) > 3 ? "…" : ""}
        </p>
        <p className="mt-1 text-xs text-stone">{formatWhen(order.placed_at)}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className="price-script text-[1.75rem]">{rupees(order.total_paise)}</p>
        <p className="mt-0.5 text-[0.6875rem] uppercase tracking-wider text-stone">
          {order.payment_method === "cod" ? "Cash" : order.payment_status}
        </p>
      </div>

      <ChevronRight
        size={18}
        className="shrink-0 text-stone transition-transform duration-300 group-hover:translate-x-1 group-hover:text-tan"
        aria-hidden
      />
    </Link>
  );
}

function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-28 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white/[0.03]">
        <Receipt size={24} className="text-stone" aria-hidden />
      </div>
      <div>
        <h1 className="font-display text-2xl text-cream">{title}</h1>
        <p className="mt-1.5 text-sm text-sand">{body}</p>
      </div>
      {action}
    </div>
  );
}
