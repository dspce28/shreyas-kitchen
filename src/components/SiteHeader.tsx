"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, User, LayoutDashboard } from "lucide-react";
import { useSession } from "./SessionProvider";
import { useCart } from "@/lib/cart-store";
import { CartDrawer } from "./CartDrawer";
import { cn } from "@/lib/utils";
import { STORE } from "@/data/menu";

const LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/combos", label: "Combos" },
  { href: "/orders", label: "Orders" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { customer, isAdmin, requireLogin } = useSession();
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);
  // Computed from `lines` rather than the store's count() so the badge
  // re-renders when quantities change, not only when lines are added.
  const count = hydrated ? lines.reduce((n, l) => n + l.qty, 0) : 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The admin console has its own chrome.
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-500 ease-[var(--ease-out-quint)]",
          scrolled
            ? "border-b border-white/[0.07] bg-ink/80 backdrop-blur-xl"
            : "border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:h-[4.5rem] sm:px-6">
          <Link href="/" className="group mr-auto flex flex-col leading-none">
            <span className="font-display text-[1.35rem] tracking-tight text-cream transition-colors group-hover:text-sage-300 sm:text-2xl">
              {STORE.name}
            </span>
            <span className="eyebrow mt-0.5 hidden text-[0.5625rem] sm:block">
              {STORE.tagline}
            </span>
          </Link>

          <nav className="mr-1 hidden items-center gap-1 sm:flex">
            {LINKS.map((l) => {
              const active = pathname === l.href || pathname?.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative rounded-xl px-3.5 py-2 text-sm transition-colors",
                    active ? "text-cream" : "text-sand hover:text-cream",
                  )}
                >
                  {l.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3.5 -bottom-0.5 h-px bg-sage"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {isAdmin && (
            <Link
              href="/admin"
              title="Kitchen console"
              className="glass-sage hidden h-10 items-center gap-2 rounded-xl px-3 text-xs text-sage-300 transition hover:brightness-125 sm:inline-flex"
            >
              <LayoutDashboard size={15} aria-hidden />
              Kitchen
            </Link>
          )}

          {customer ? (
            <Link
              href="/account"
              className="glass flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-cream-dim transition hover:text-cream"
            >
              <User size={16} aria-hidden />
              <span className="hidden max-w-[9ch] truncate sm:inline">
                {customer.name ?? "Account"}
              </span>
            </Link>
          ) : (
            <button
              onClick={() => void requireLogin()}
              className="glass flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-cream-dim transition hover:text-cream"
            >
              <User size={16} aria-hidden />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}

          <button
            onClick={() => setCartOpen(true)}
            aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
            className="glass relative flex h-10 items-center gap-2 rounded-xl px-3 text-cream transition hover:border-sage/45"
          >
            <ShoppingBag size={17} aria-hidden />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 22 }}
                className="tnum absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-sage px-1 text-[0.6875rem] font-semibold text-ink"
              >
                {count}
              </motion.span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile tab bar — the primary navigation on a phone. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
        <div className="flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex-1 py-3 text-center text-xs transition-colors",
                  active ? "text-sage-300" : "text-stone",
                )}
              >
                {l.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin" className="flex-1 py-3 text-center text-xs text-sage-300">
              Kitchen
            </Link>
          )}
        </div>
      </nav>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
