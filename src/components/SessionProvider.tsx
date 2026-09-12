"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LoginSheet } from "./LoginSheet";

export interface Customer {
  id: string;
  phone: string;
  name: string | null;
}

interface SessionValue {
  customer: Customer | null;
  isAdmin: boolean;
  /** False until the first /api/auth/me has resolved. */
  ready: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  setCustomer: (c: Customer | null) => void;
  /** Opens the login sheet; resolves true once signed in, false if dismissed. */
  requireLogin: () => Promise<boolean>;
  loginOpen: boolean;
  closeLogin: (signedIn: boolean) => void;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer ?? null);
        setIsAdmin(Boolean(data.isAdmin));
      }
    } catch {
      // Offline or the API is down — treat as signed out rather than crashing
      // the shell. The next action the customer takes will surface the error.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requireLogin = useCallback(async () => {
    if (customer) return true;
    setLoginOpen(true);
    return new Promise<boolean>((resolve) => setResolver(() => resolve));
  }, [customer]);

  const closeLogin = useCallback(
    (signedIn: boolean) => {
      setLoginOpen(false);
      resolver?.(signedIn);
      setResolver(null);
    },
    [resolver],
  );

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCustomer(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      customer,
      isAdmin,
      ready,
      refresh,
      signOut,
      setCustomer,
      requireLogin,
      loginOpen,
      closeLogin,
    }),
    [customer, isAdmin, ready, refresh, signOut, requireLogin, loginOpen, closeLogin],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Rendered here so `requireLogin()` works from anywhere in the tree. */}
      <LoginSheet />
    </Ctx.Provider>
  );
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside <SessionProvider>.");
  return v;
}
