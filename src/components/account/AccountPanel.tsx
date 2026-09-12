"use client";

import { useCallback, useEffect, useState } from "react";
import { LogOut, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { AddressForm } from "@/components/AddressForm";
import { toast } from "@/components/ui/Toaster";
import { prettyPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { Address } from "@/lib/types";

export function AccountPanel() {
  const { customer, ready, requireLogin, signOut, setCustomer } = useSession();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editing, setEditing] = useState<Address | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (ready && !customer) void requireLogin();
  }, [ready, customer, requireLogin]);

  useEffect(() => {
    setName(customer?.name ?? "");
  }, [customer?.name]);

  const load = useCallback(async () => {
    const res = await fetch("/api/addresses", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setAddresses(data.addresses);
  }, []);

  useEffect(() => {
    if (customer) void load();
  }, [customer, load]);

  async function saveName() {
    setSavingName(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCustomer(data.customer);
      toast.success("Saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingName(false);
    }
  }

  async function makeDefault(a: Address) {
    await fetch(`/api/addresses/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_default: true }),
    });
    void load();
  }

  async function remove(a: Address) {
    if (!confirm(`Remove the ${a.label.toLowerCase()} address?`)) return;
    const res = await fetch(`/api/addresses/${a.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.info("Address removed.");
      void load();
    } else {
      toast.error("Could not remove that address.");
    }
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-md px-6 py-28 text-center">
        <h1 className="font-display text-2xl text-cream">Sign in to manage your account</h1>
        <Button className="mt-5" onClick={() => void requireLogin()}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow">Your account</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">{customer.name ?? "Welcome"}</h1>
      <p className="tnum mt-2 text-sm text-stone">{prettyPhone(customer.phone)}</p>

      {/* ── Profile ─────────────────────────────────────────── */}
      <section className="glass mt-10 rounded-[1.75rem] p-6">
        <h2 className="font-display text-xl text-cream">Profile</h2>
        <div className="mt-4 flex items-end gap-3">
          <Field
            label="Name"
            className="flex-1"
            placeholder="What should we call you?"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            variant="secondary"
            loading={savingName}
            disabled={name === (customer.name ?? "")}
            onClick={() => void saveName()}
          >
            Save
          </Button>
        </div>
        <p className="mt-3 text-xs text-stone">
          Your mobile number is your login and cannot be changed here. Call the kitchen if it
          needs updating.
        </p>
      </section>

      {/* ── Addresses ───────────────────────────────────────── */}
      <section className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl text-cream">Delivery addresses</h2>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 text-sm text-brass-300 transition hover:text-brass"
          >
            <Plus size={14} aria-hidden />
            Add
          </button>
        </div>

        {addresses.length === 0 ? (
          <button
            onClick={() => setCreating(true)}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/15 px-4 py-7 text-left transition hover:border-brass/40"
          >
            <MapPin size={18} className="text-brass" aria-hidden />
            <span className="text-sm text-sand">
              No addresses saved yet. Add one to speed up checkout.
            </span>
          </button>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {addresses.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "rounded-2xl border px-4 py-4 transition",
                  a.is_default
                    ? "border-brass/35 bg-brass/[0.06]"
                    : "border-white/[0.08] bg-white/[0.03]",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-cream">{a.label}</span>
                      {a.is_default && (
                        <span className="inline-flex items-center gap-1 rounded border border-brass/30 px-1.5 text-[0.625rem] uppercase tracking-wider text-brass-300">
                          <Star size={9} aria-hidden />
                          Default
                        </span>
                      )}
                    </div>
                    {a.contact_name && (
                      <p className="mt-0.5 text-xs text-stone">For {a.contact_name}</p>
                    )}
                    <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-sand">
                      {[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}
                      <br />
                      {a.city} {a.pincode}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    {!a.is_default && (
                      <button
                        onClick={() => void makeDefault(a)}
                        title="Make default"
                        aria-label={`Make ${a.label} the default address`}
                        className="rounded-lg p-2 text-stone transition hover:bg-white/5 hover:text-brass-300"
                      >
                        <Star size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(a)}
                      aria-label={`Edit ${a.label} address`}
                      className="rounded-lg p-2 text-stone transition hover:bg-white/5 hover:text-cream"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => void remove(a)}
                      aria-label={`Remove ${a.label} address`}
                      className="rounded-lg p-2 text-stone transition hover:bg-white/5 hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button
        variant="ghost"
        className="mt-10"
        onClick={() => {
          void signOut();
          toast.info("Signed out.");
        }}
      >
        <LogOut size={15} aria-hidden />
        Sign out
      </Button>

      <Sheet
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        side="center"
        title={editing ? "Edit address" : "New address"}
      >
        <div className="px-6 pb-7">
          <AddressForm
            existing={editing ?? undefined}
            onSaved={() => {
              setCreating(false);
              setEditing(null);
              void load();
            }}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        </div>
      </Sheet>
    </div>
  );
}
