"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { Sheet } from "./ui/Sheet";
import { Button } from "./ui/Button";
import { useCart, toCartPayload } from "@/lib/cart-store";
import { rupees, cn } from "@/lib/utils";

interface Quote {
  subtotal_paise: number;
  delivery_fee_paise: number;
  total_paise: number;
  settings: { free_delivery_above_paise: number; is_accepting_orders: boolean };
}

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { lines, setQty, remove, subtotalHint } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  /**
   * Re-price against the server whenever the drawer opens or the cart
   * changes. The local `unitHint` totals are only a placeholder while this
   * is in flight — the server's number is the one that counts.
   */
  useEffect(() => {
    if (!open || lines.length === 0) {
      setQuote(null);
      setProblem(null);
      return;
    }
    const controller = new AbortController();
    setQuoting(true);

    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: toCartPayload(lines) }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not price your cart.");
        setQuote(data);
        setProblem(null);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setQuote(null);
        setProblem(err.message);
      })
      .finally(() => setQuoting(false));

    return () => controller.abort();
  }, [open, lines]);

  const displaySubtotal = quote?.subtotal_paise ?? subtotalHint();
  const freeAt = quote?.settings.free_delivery_above_paise ?? 39900;
  const toFree = Math.max(0, freeAt - displaySubtotal);

  return (
    <Sheet open={open} onClose={onClose} title="Your order" side="right">
      {lines.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white/[0.03]">
            <ShoppingBag size={24} className="text-stone" aria-hidden />
          </div>
          <div>
            <p className="font-display text-xl text-cream">Nothing here yet</p>
            <p className="mt-1 text-sm text-stone">
              Start with a chilla, or something from the tea counter.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              onClose();
              router.push("/menu");
            }}
          >
            Browse the menu
          </Button>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="flex-1 divide-y divide-white/[0.06] px-6">
            <AnimatePresence initial={false}>
              {lines.map((l) => (
                <motion.li
                  key={l.key}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] text-cream">{l.name}</p>
                      {l.detailHint && (
                        <p className="mt-0.5 text-xs leading-snug text-stone">{l.detailHint}</p>
                      )}
                      <p className="tnum mt-1.5 text-sm text-sand">{rupees(l.unitHint)}</p>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => remove(l.key)}
                        aria-label={`Remove ${l.name}`}
                        className="-m-1.5 rounded-lg p-1.5 text-stone transition hover:text-danger"
                      >
                        <Trash2 size={15} />
                      </button>

                      <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
                        <button
                          onClick={() => setQty(l.key, l.qty - 1)}
                          aria-label="Decrease quantity"
                          className="grid h-7 w-7 place-items-center rounded-lg text-sand transition hover:bg-white/10 hover:text-cream"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="tnum w-6 text-center text-sm text-cream">{l.qty}</span>
                        <button
                          onClick={() => setQty(l.key, l.qty + 1)}
                          disabled={l.qty >= 20}
                          aria-label="Increase quantity"
                          className="grid h-7 w-7 place-items-center rounded-lg text-sand transition hover:bg-white/10 hover:text-cream disabled:opacity-30"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="sticky bottom-0 border-t border-white/[0.07] bg-ink-800/95 px-6 pb-6 pt-4 backdrop-blur-xl">
            {problem && (
              <p className="mb-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {problem}
              </p>
            )}

            {toFree > 0 && !problem && (
              <p className="mb-3 text-xs text-sage-300">
                Add {rupees(toFree)} more for free delivery.
              </p>
            )}

            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-sand">
                <dt>Subtotal</dt>
                <dd className="tnum">{rupees(displaySubtotal)}</dd>
              </div>
              <div className="flex justify-between text-sand">
                <dt>Delivery</dt>
                <dd className={cn("tnum", quote?.delivery_fee_paise === 0 && "text-sage-300")}>
                  {quote ? (quote.delivery_fee_paise === 0 ? "Free" : rupees(quote.delivery_fee_paise)) : "—"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-white/[0.07] pt-2 text-cream">
                <dt className="font-display text-lg">Total</dt>
                <dd className="price-script text-[1.75rem]">
                  {quoting && !quote ? (
                    <Loader2 size={16} className="animate-spin" aria-label="Calculating" />
                  ) : (
                    rupees(quote?.total_paise ?? displaySubtotal)
                  )}
                </dd>
              </div>
            </dl>

            <Button
              size="lg"
              className="mt-4 w-full"
              disabled={Boolean(problem) || lines.length === 0}
              onClick={() => {
                onClose();
                router.push("/checkout");
              }}
            >
              Checkout
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
