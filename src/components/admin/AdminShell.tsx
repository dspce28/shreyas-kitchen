"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, ListOrdered, LogOut, Store, UtensilsCrossed } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { STORE } from "@/data/menu";

const TABS = [
  { href: "/admin", label: "Orders", icon: ListOrdered },
  { href: "/admin/menu", label: "Menu & prices", icon: UtensilsCrossed },
];

/**
 * Chrome for the kitchen console. Access is gated server-side on every admin
 * API route; this only decides what to draw. A non-admin who navigates here
 * sees the gate, not a broken page.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAdmin, ready, customer, requireLogin, signOut } = useSession();

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center" aria-hidden>
        <div className="h-8 w-32 animate-pulse rounded bg-white/[0.06]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full border border-brass/25 bg-brass/10">
          <ChefHat size={26} className="text-brass-300" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-3xl text-cream">Kitchen console</h1>
          <p className="mt-2 text-sm leading-relaxed text-sand">
            {customer
              ? "This number isn't on the admin list. Add it to ADMIN_PHONES and sign in again."
              : "Sign in with the kitchen's mobile number to manage orders."}
          </p>
        </div>
        {customer ? (
          <Button variant="secondary" onClick={() => void signOut()}>
            Sign in as someone else
          </Button>
        ) : (
          <Button onClick={() => void requireLogin()}>Sign in</Button>
        )}
        <Link
          href="/"
          className="text-xs text-stone underline-offset-4 transition hover:text-cream hover:underline"
        >
          Back to the site
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-ink/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-brass/25 bg-brass/10">
              <ChefHat size={17} className="text-brass-300" aria-hidden />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-lg text-cream">{STORE.name}</span>
              <span className="eyebrow text-[0.5rem]">Kitchen console</span>
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-1">
            {TABS.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-brass/15 text-brass-300"
                      : "text-sand hover:bg-white/5 hover:text-cream",
                  )}
                >
                  <t.icon size={15} aria-hidden />
                  <span className="hidden sm:inline">{t.label}</span>
                </Link>
              );
            })}

            <Link
              href="/"
              title="Customer site"
              className="rounded-xl p-2 text-sand transition hover:bg-white/5 hover:text-cream"
            >
              <Store size={16} />
            </Link>
            <button
              onClick={() => void signOut()}
              title="Sign out"
              className="rounded-xl p-2 text-sand transition hover:bg-white/5 hover:text-danger"
            >
              <LogOut size={16} />
            </button>
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
