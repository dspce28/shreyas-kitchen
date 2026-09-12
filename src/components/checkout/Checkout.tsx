"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Banknote, MapPin, Plus, ShieldCheck, Smartphone } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useCart, toCartPayload } from "@/lib/cart-store";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { AddressForm } from "@/components/AddressForm";
import { toast } from "@/components/ui/Toaster";
import { openCheckout } from "@/lib/razorpay-client";
import { rupees, cn } from "@/lib/utils";
import type { Address } from "@/lib/types";

interface Quote {
  lines: { name_snapshot: string; detail: string | null; qty: number; line_paise: number }[];
  subtotal_paise: number;
  delivery_fee_paise: number;
  total_paise: number;
  settings: { is_accepting_orders: boolean; closed_message: string | null };
}

type Method = "razorpay" | "cod";

export function Checkout() {
  const router = useRouter();
  const { customer, ready, requireLogin } = useSession();
  const { lines, note, setNote, clear } = useCart();
  const hydrated = useCart((s) => s.hydrated);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [addressSheet, setAddressSheet] = useState(false);
  const [method, setMethod] = useState<Method>("cod");
  const [placing, setPlacing] = useState(false);
  const [onlineEnabled, setOnlineEnabled] = useState(false);

  // Online payment is only offered when a publishable key actually exists.
  useEffect(() => {
    setOnlineEnabled(Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID));
  }, []);

  // An empty cart has nothing to check out.
  useEffect(() => {
    if (hydrated && lines.length === 0 && !placing) router.replace("/menu");
  }, [hydrated, lines.length, placing, router]);

  // Signing in is required before an address can even be listed.
  useEffect(() => {
    if (ready && !customer) void requireLogin();
  }, [ready, customer, requireLogin]);

  const loadAddresses = useCallback(async () => {
    const res = await fetch("/api/addresses", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setAddresses(data.addresses);
    setAddressId((current) => current ?? data.addresses.find((a: Address) => a.is_default)?.id ?? data.addresses[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (customer) void loadAddresses();
  }, [customer, loadAddresses]);

  // Re-price on every cart change so the figure on screen is the figure charged.
  useEffect(() => {
    if (!hydrated || lines.length === 0) return;
    const controller = new AbortController();

    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: toCartPayload(lines) }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setQuote(data);
        setQuoteError(null);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setQuoteError(err.message ?? "Could not price your order.");
      });

    return () => controller.abort();
  }, [lines, hydrated]);

  async function placeOrder() {
    if (!customer) {
      const signedIn = await requireLogin();
      if (!signedIn) return;
    }
    if (!addressId) {
      toast.error("Choose a delivery address first.");
      setAddressSheet(true);
      return;
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId,
          paymentMethod: method,
          lines: toCartPayload(lines),
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not place your order.");

      const orderNo: string = data.order.order_no;

      if (data.payment?.provider === "razorpay") {
        try {
          const result = await openCheckout({
            keyId: data.payment.keyId,
            razorpayOrderId: data.payment.razorpayOrderId,
            amount: data.payment.amount,
            currency: data.payment.currency,
            orderNo,
            customerName: customer?.name,
            customerPhone: customer?.phone ?? "",
          });

          await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result),
          });
          toast.success("Payment received.");
        } catch (err) {
          // The order exists and is visible on the tracking page as awaiting
          // payment — it is not lost, and the webhook may still settle it.
          toast.info(
            err instanceof Error && err.message === "Payment cancelled."
              ? "Payment cancelled — your order is saved as unpaid."
              : "Payment did not complete. You can retry from your order page.",
          );
        }
      }

      clear();
      router.push(`/orders/${orderNo}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place your order.");
      setPlacing(false);
    }
  }

  if (!hydrated) return <CheckoutSkeleton />;

  const closed = quote && !quote.settings.is_accepting_orders;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow">Almost there</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Checkout</h1>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        {/* ── Left: address, payment, note ───────────────────── */}
        <div className="space-y-8">
          <section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl text-cream">Deliver to</h2>
              <button
                onClick={() => setAddressSheet(true)}
                className="inline-flex items-center gap-1.5 text-sm text-sage-300 transition hover:text-sage"
              >
                <Plus size={14} aria-hidden />
                New address
              </button>
            </div>

            {!customer ? (
              <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-sand">
                Sign in to choose where this goes.
              </p>
            ) : addresses.length === 0 ? (
              <button
                onClick={() => setAddressSheet(true)}
                className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/15 px-4 py-6 text-left transition hover:border-sage/45"
              >
                <MapPin size={18} className="text-tan" aria-hidden />
                <span className="text-sm text-sand">
                  Add your first delivery address to continue.
                </span>
              </button>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {addresses.map((a) => (
                  <li key={a.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 transition",
                        addressId === a.id
                          ? "border-sage/45 bg-sage/[0.08]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/25",
                      )}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={addressId === a.id}
                        onChange={() => setAddressId(a.id)}
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-tan)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium text-cream">{a.label}</span>
                          {a.is_default && (
                            <span className="rounded border border-white/10 px-1.5 text-[0.625rem] uppercase tracking-wider text-stone">
                              Default
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-[0.8125rem] leading-relaxed text-sand">
                          {[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}
                          <br />
                          {a.city} {a.pincode}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-xl text-cream">Payment</h2>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <PaymentOption
                icon={Banknote}
                title="Cash on delivery"
                body="Pay when it reaches you."
                selected={method === "cod"}
                onSelect={() => setMethod("cod")}
              />
              <PaymentOption
                icon={Smartphone}
                title="Pay online"
                body={onlineEnabled ? "UPI, cards, netbanking." : "Not configured yet."}
                selected={method === "razorpay"}
                disabled={!onlineEnabled}
                onSelect={() => setMethod("razorpay")}
              />
            </div>
            {method === "razorpay" && (
              <p className="mt-3 flex items-start gap-2 text-xs text-stone">
                <ShieldCheck size={13} className="mt-0.5 shrink-0 text-sage" aria-hidden />
                Payment is handled by Razorpay. Card and UPI details never touch our servers.
              </p>
            )}
          </section>

          <section>
            <TextArea
              label="Anything we should know?"
              hint="Less spice, no onion, leave at reception — tell us here."
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </section>
        </div>

        {/* ── Right: summary ─────────────────────────────────── */}
        <aside className="glass sticky top-24 rounded-[1.75rem] p-6">
          <h2 className="font-display text-xl text-cream">Your order</h2>

          <ul className="mt-4 space-y-3 border-b border-white/[0.07] pb-4">
            {(quote?.lines ?? lines.map((l) => ({
              name_snapshot: l.name,
              detail: l.detailHint ?? null,
              qty: l.qty,
              line_paise: l.unitHint * l.qty,
            }))).map((l, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="tnum shrink-0 text-stone">{l.qty}×</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-cream">{l.name_snapshot}</span>
                  {l.detail && (
                    <span className="block text-xs leading-snug text-stone">{l.detail}</span>
                  )}
                </span>
                <span className="tnum shrink-0 text-sand">{rupees(l.line_paise)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-sand">
              <dt>Subtotal</dt>
              <dd className="tnum">{rupees(quote?.subtotal_paise ?? 0)}</dd>
            </div>
            <div className="flex justify-between text-sand">
              <dt>Delivery</dt>
              <dd className={cn("tnum", quote?.delivery_fee_paise === 0 && "text-sage-300")}>
                {quote?.delivery_fee_paise === 0 ? "Free" : rupees(quote?.delivery_fee_paise ?? 0)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-white/[0.07] pt-2.5">
              <dt className="font-display text-lg text-cream">Total</dt>
              <dd className="price-script text-[2rem]">
                {rupees(quote?.total_paise ?? 0)}
              </dd>
            </div>
          </dl>

          {quoteError && (
            <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
              {quoteError}
            </p>
          )}

          {closed && (
            <p className="mt-4 rounded-xl border border-ember/30 bg-ember/10 px-3.5 py-2.5 text-xs text-ember">
              {quote?.settings.closed_message ?? "We are not taking orders right now."}
            </p>
          )}

          <Button
            size="lg"
            className="mt-5 w-full"
            loading={placing}
            disabled={Boolean(quoteError) || Boolean(closed) || !quote || !addressId}
            onClick={() => void placeOrder()}
          >
            {method === "cod" ? "Place order" : `Pay ${rupees(quote?.total_paise ?? 0)}`}
          </Button>

          <p className="mt-3 text-center text-xs leading-relaxed text-stone">
            Shreya&rsquo;s Kitchen confirms every order by hand. You&rsquo;ll see it move to{" "}
            <span className="text-sage-300">accepted</span> on the tracking page.
          </p>

          <Link
            href="/menu"
            className="mt-3 block text-center text-xs text-stone underline-offset-4 transition hover:text-cream hover:underline"
          >
            Add something else
          </Link>
        </aside>
      </div>

      <Sheet
        open={addressSheet}
        onClose={() => setAddressSheet(false)}
        side="center"
        title="New delivery address"
        subtitle="We deliver around Fortune Business Hub."
      >
        <div className="px-6 pb-7">
          <AddressForm
            onSaved={(a) => {
              setAddresses((prev) => [...prev, a]);
              setAddressId(a.id);
              setAddressSheet(false);
              void loadAddresses();
            }}
            onCancel={() => setAddressSheet(false)}
          />
        </div>
      </Sheet>
    </div>
  );
}

function PaymentOption({
  icon: Icon,
  title,
  body,
  selected,
  disabled,
  onSelect,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition",
        selected
          ? "border-sage/45 bg-sage/[0.08]"
          : "border-white/10 bg-white/[0.03] hover:border-white/25",
        disabled && "cursor-not-allowed opacity-45 hover:border-white/10",
      )}
    >
      <Icon size={18} className={selected ? "text-sage-300" : "text-sand"} />
      <span>
        <span className="block text-sm text-cream">{title}</span>
        <span className="mt-0.5 block text-xs text-stone">{body}</span>
      </span>
    </button>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6" aria-hidden>
      <div className="h-10 w-44 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-[1.75rem] bg-white/[0.04]" />
      </div>
    </div>
  );
}
