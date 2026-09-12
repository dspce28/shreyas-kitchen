"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Field, Select } from "./ui/Field";
import { toast } from "./ui/Toaster";
import type { Address } from "@/lib/types";

const LABELS = ["Home", "Office", "Other"];

/**
 * Create or edit a delivery address. The same form serves both — `existing`
 * decides whether it POSTs or PATCHes.
 */
export function AddressForm({
  existing,
  onSaved,
  onCancel,
}: {
  existing?: Address;
  onSaved: (a: Address) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    label: existing?.label ?? "Home",
    contact_name: existing?.contact_name ?? "",
    line1: existing?.line1 ?? "",
    line2: existing?.line2 ?? "",
    landmark: existing?.landmark ?? "",
    city: existing?.city ?? "Ahmedabad",
    pincode: existing?.pincode ?? "",
    is_default: existing?.is_default ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(existing ? `/api/addresses/${existing.id}` : "/api/addresses", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contact_name: form.contact_name || null,
          line2: form.line2 || null,
          landmark: form.landmark || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the address.");

      toast.success(existing ? "Address updated." : "Address saved.");
      onSaved(data.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Label" value={form.label} onChange={(e) => set("label", e.target.value)}>
          {LABELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>

        <Field
          label="Who's receiving?"
          placeholder="Optional"
          autoComplete="name"
          value={form.contact_name}
          onChange={(e) => set("contact_name", e.target.value)}
        />
      </div>

      <Field
        data-autofocus
        label="Flat / building / office"
        placeholder="A-304, Fortune Business Hub"
        autoComplete="address-line1"
        required
        value={form.line1}
        onChange={(e) => set("line1", e.target.value)}
      />

      <Field
        label="Street / area"
        placeholder="Science City Road"
        autoComplete="address-line2"
        value={form.line2}
        onChange={(e) => set("line2", e.target.value)}
      />

      <Field
        label="Landmark"
        hint="What should the delivery rider look for?"
        placeholder="Opposite the main gate"
        value={form.landmark}
        onChange={(e) => set("landmark", e.target.value)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="City"
          autoComplete="address-level2"
          required
          value={form.city}
          onChange={(e) => set("city", e.target.value)}
        />
        <Field
          label="Pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          required
          placeholder="380060"
          value={form.pincode}
          onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-cream-dim">
        <input
          type="checkbox"
          checked={form.is_default}
          onChange={(e) => set("is_default", e.target.checked)}
          className="h-4 w-4 accent-[var(--color-brass)]"
        />
        Deliver here by default
      </label>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={busy} className="flex-1">
          {existing ? "Save changes" : "Save address"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
