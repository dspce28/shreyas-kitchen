"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Phone } from "lucide-react";
import { STORE, CATEGORIES } from "@/data/menu";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="relative mt-24 border-t border-white/[0.07] pb-24 pt-14 sm:pb-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-display text-3xl text-cream">{STORE.name}</p>
            <p className="eyebrow mt-2">{STORE.tagline}</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-sand">{STORE.promise}</p>
          </div>

          <div>
            <p className="eyebrow mb-3">The menu</p>
            <ul className="space-y-2 text-sm">
              {CATEGORIES.slice(0, 5).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/menu#${c.slug}`}
                    className="text-sand underline-offset-4 transition hover:text-cream hover:underline"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/combos"
                  className="text-sand underline-offset-4 transition hover:text-cream hover:underline"
                >
                  Combos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3">Find us</p>
            <ul className="space-y-3 text-sm text-sand">
              <li className="flex gap-2.5">
                <MapPin size={15} className="mt-0.5 shrink-0 text-brass" aria-hidden />
                <span>{STORE.location}</span>
              </li>
              <li className="flex gap-2.5">
                <Phone size={15} className="mt-0.5 shrink-0 text-brass" aria-hidden />
                <a
                  href={`tel:${STORE.phone}`}
                  className="tnum underline-offset-4 transition hover:text-cream hover:underline"
                >
                  {STORE.phoneDisplay}
                </a>
              </li>
            </ul>
            <p className="mt-4 text-xs text-stone">
              Breakfast 8–11 AM · Snacks 3–6 PM
              <br />
              Everything else, all day.
            </p>
          </div>
        </div>

        <div className="rule my-10" />

        <div className="flex flex-col gap-2 text-xs text-stone sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {STORE.name} · {STORE.owner}
          </p>
          <p className="italic">Made fresh, for the way you work.</p>
        </div>
      </div>
    </footer>
  );
}
