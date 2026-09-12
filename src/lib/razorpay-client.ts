"use client";

/**
 * Loads Razorpay Checkout on demand.
 *
 * The script is ~90 kB and only matters to customers who choose online
 * payment, so it is injected at the moment they click "Pay", not on every
 * page load.
 */

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; close: () => void };
  }
}

const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loader: Promise<void> | null = null;

export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Client only."));
  if (window.Razorpay) return Promise.resolve();
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Razorpay failed to load.")));
      return;
    }
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null; // allow a retry on the next attempt
      reject(new Error("Could not reach Razorpay. Check your connection."));
    };
    document.head.appendChild(s);
  });

  return loader;
}

export interface CheckoutArgs {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  orderNo: string;
  customerName?: string | null;
  customerPhone: string;
}

export interface CheckoutResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Opens Checkout and resolves with the handoff payload, or rejects if the
 * customer dismisses the modal. The signature is verified server-side —
 * nothing here is trusted.
 */
export async function openCheckout(args: CheckoutArgs): Promise<CheckoutResult> {
  await loadRazorpay();

  return new Promise<CheckoutResult>((resolve, reject) => {
    let settled = false;

    const rzp = new window.Razorpay!({
      key: args.keyId,
      order_id: args.razorpayOrderId,
      amount: args.amount,
      currency: args.currency,
      name: "Shreya's Kitchen",
      description: `Order ${args.orderNo}`,
      theme: { color: "#d8b866", backdrop_color: "#0a0906" },
      prefill: {
        name: args.customerName ?? undefined,
        contact: args.customerPhone,
      },
      notes: { order_no: args.orderNo },
      handler: (response: CheckoutResult) => {
        settled = true;
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          if (settled) return;
          reject(new Error("Payment cancelled."));
        },
        escape: true,
      },
    });

    rzp.open();
  });
}
