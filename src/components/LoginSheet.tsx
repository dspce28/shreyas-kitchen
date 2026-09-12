"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { Sheet } from "./ui/Sheet";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";
import { toast } from "./ui/Toaster";
import { useSession } from "./SessionProvider";
import { prettyPhone } from "@/lib/phone";

/**
 * Phone → OTP → signed in. Two steps, no passwords, no email.
 *
 * In dev mode the API returns the code and we show it inline, so the whole
 * flow is usable before Meta approves the WhatsApp sender.
 */
export function LoginSheet() {
  const { loginOpen, closeLogin, refresh, setCustomer } = useSession();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [e164, setE164] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  // Reset to a clean slate whenever the sheet reopens.
  useEffect(() => {
    if (loginOpen) {
      setStep("phone");
      setCode("");
      setDevCode(null);
      setError(null);
    }
  }, [loginOpen]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode(resend = false) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send the code.");

      setE164(data.phone);
      setDevCode(data.devCode ?? null);
      setStep("code");
      setCooldown(45);
      setTimeout(() => codeRef.current?.focus(), 260);

      if (!data.devCode) toast.success(`Code sent on WhatsApp to ${prettyPhone(data.phone)}`);
      if (resend) toast.info("New code sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(submitted: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164, code: submitted, name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not verify the code.");

      setCustomer(data.customer);
      await refresh();
      toast.success(`Welcome${data.customer?.name ? `, ${data.customer.name}` : ""}.`);
      closeLogin(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCode("");
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={loginOpen}
      onClose={() => closeLogin(false)}
      side="center"
      title={step === "phone" ? "Sign in to order" : "Enter your code"}
      subtitle={
        step === "phone"
          ? "Your mobile number is all we need."
          : `Sent to ${prettyPhone(e164)}`
      }
    >
      <div className="px-6 pb-7">
        <AnimatePresence mode="wait" initial={false}>
          {step === "phone" ? (
            <motion.form
              key="phone"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void sendCode();
              }}
            >
              <Field
                data-autofocus
                label="Mobile number"
                prefix="+91"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="96010 50241"
                maxLength={14}
                value={phone}
                error={error ?? undefined}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/[^\d\s]/g, ""));
                  setError(null);
                }}
              />

              <Field
                label="Your name"
                hint="Optional — so we know who to greet at the door."
                autoComplete="name"
                placeholder="Shreya"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Button type="submit" size="lg" loading={busy} className="w-full">
                <MessageCircle size={17} aria-hidden />
                Send code on WhatsApp
              </Button>

              <p className="flex items-start gap-2 text-xs leading-relaxed text-stone">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-sage" aria-hidden />
                We use your number only to confirm orders and deliver them. No marketing
                messages, ever.
              </p>
            </motion.form>
          ) : (
            <motion.form
              key="code"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void verify(code);
              }}
            >
              {devCode && (
                <div className="glass-sage rounded-xl px-4 py-3 text-sm">
                  <p className="eyebrow mb-1 text-sage-300">Development mode</p>
                  <p className="text-cream-dim">
                    WhatsApp delivery is off, so here is your code:{" "}
                    <strong className="tnum tracking-[0.3em] text-sage-300">{devCode}</strong>
                  </p>
                </div>
              )}

              <Field
                ref={codeRef}
                data-autofocus
                label="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                className="tnum text-center text-2xl tracking-[0.5em]"
                value={code}
                error={error ?? undefined}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(v);
                  setError(null);
                  // Submit the moment the sixth digit lands — nobody should
                  // have to reach for a button after typing a code.
                  if (v.length === 6 && !busy) void verify(v);
                }}
              />

              <Button type="submit" size="lg" loading={busy} className="w-full">
                Verify &amp; continue
              </Button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="text-stone underline-offset-4 transition hover:text-cream hover:underline"
                >
                  Change number
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || busy}
                  onClick={() => void sendCode(true)}
                  className="text-sage-300 underline-offset-4 transition hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </Sheet>
  );
}
