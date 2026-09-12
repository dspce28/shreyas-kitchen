"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Search, Clock, X } from "lucide-react";
import { useMenu } from "@/lib/use-menu";
import { ItemRow } from "./ItemRow";
import { PreviewBanner } from "./PreviewBanner";
import { categoryBanner } from "@/lib/dish-image";
import { minutesToLabel, cn } from "@/lib/utils";
import type { ApiMenuItem } from "@/lib/types";

export function MenuBrowser() {
  const { data, status, isPreview } = useMenu();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Memoised so the filter below does not re-run on every render just
  // because `?? []` produced a fresh array.
  const categories = useMemo(() => data?.categories ?? [], [data]);
  const ordering = Boolean(data?.settings.is_accepting_orders) && !isPreview;

  // Filter across name AND description — people search "lentil", not "chilla".
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((c) => ({
        ...c,
        items: c.items.filter(
          (i: ApiMenuItem) =>
            i.name.toLowerCase().includes(q) ||
            (i.description ?? "").toLowerCase().includes(q) ||
            (i.note ?? "").toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, query]);

  // Highlight the category rail entry for whatever section is on screen.
  useEffect(() => {
    if (query) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [filtered.length, query]);

  // Keep the active chip in view on the horizontally-scrolling rail.
  useEffect(() => {
    if (!active || !railRef.current) return;
    const chip = railRef.current.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  const totalItems = categories.reduce((n, c) => n + c.items.length, 0);

  return (
    <div className="pb-20">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="relative overflow-hidden border-b border-white/[0.07] px-4 pb-10 pt-14 sm:px-6 sm:pb-14 sm:pt-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(156,191,143,0.10),transparent_70%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="eyebrow">The menu</p>
          <h1 className="mt-4 text-5xl sm:text-7xl">
            <span className="foil">Everything</span>
            <span className="text-cream">, made fresh</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[0.9375rem] leading-relaxed text-cream-dim">
            {status === "loading"
              ? "Loading the kitchen…"
              : `${totalItems} dishes, cooked through the day with clean ingredients and honest portions.`}
          </p>

          <div className="relative mx-auto mt-8 max-w-md">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes, ingredients…"
              aria-label="Search the menu"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-10 text-sm text-cream placeholder:text-stone/70 transition focus:border-sage/50 focus:bg-white/[0.06] focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone transition hover:text-cream"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      {isPreview && <PreviewBanner />}

      {/* ── Category rail ──────────────────────────────────────── */}
      {!query && categories.length > 0 && (
        <div className="sticky top-16 z-30 border-b border-white/[0.07] bg-ink/85 backdrop-blur-xl sm:top-[4.5rem]">
          <div ref={railRef} className="no-scrollbar mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 py-3 sm:px-6">
            {categories.map((c) => (
              <a
                key={c.slug}
                href={`#${c.slug}`}
                data-chip={c.slug}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-[0.8125rem] transition-colors",
                  active === c.slug
                    ? "bg-sage/15 text-sage-300"
                    : "text-sand hover:bg-white/5 hover:text-cream",
                )}
              >
                {c.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Sections ───────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {status === "loading" && <MenuSkeleton />}

        {filtered.length === 0 && status !== "loading" && (
          <p className="py-20 text-center text-sand">
            Nothing matches &ldquo;{query}&rdquo;. Try &ldquo;tea&rdquo;, &ldquo;chilla&rdquo; or
            &ldquo;salad&rdquo;.
          </p>
        )}

        {filtered.map((c) => {
          const closed = !c.is_open_now;
          const banner = categoryBanner(c.slug);
          return (
            <section
              key={c.slug}
              id={c.slug}
              ref={(el) => {
                sectionRefs.current[c.slug] = el;
              }}
              className="scroll-mt-32 pt-14"
            >
              {/* Section banner. The gradient is doing real work: these are
                  bright daylight photos on a dark green page, and without it
                  each one reads as a glowing rectangle. */}
              {banner?.wide && (
                <div className="relative mb-6 h-40 overflow-hidden rounded-[1.5rem] border border-white/[0.08] sm:h-52">
                  <Image
                    src={banner.wide}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    placeholder="blur"
                    blurDataURL={banner.blur}
                    className="object-cover"
                  />
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-ink/10" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="eyebrow text-sage-300/80">{c.items.length} dishes</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-3xl text-cream sm:text-4xl">{c.name}</h2>
                {c.window_label && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs",
                      closed ? "text-ember" : "text-stone",
                    )}
                  >
                    <Clock size={12} aria-hidden />
                    {c.window_label}
                  </span>
                )}
              </div>

              {c.blurb && (
                <p className="mt-2 max-w-prose text-sm italic leading-relaxed text-sand">
                  {c.blurb}
                </p>
              )}

              {closed && c.available_from != null && (
                <p className="mt-3 rounded-xl border border-ember/25 bg-ember/10 px-3.5 py-2 text-xs text-ember">
                  The kitchen serves this from {minutesToLabel(c.available_from)}. You can browse
                  now and order once it opens.
                </p>
              )}

              <div className="rule mt-5" />

              <ul>
                {c.items.map((item: ApiMenuItem) => (
                  <ItemRow
                    key={item.slug}
                    item={item}
                    closed={closed}
                    disabled={!ordering}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-4 pt-14" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start justify-between gap-4 border-b border-white/[0.06] py-5">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-white/[0.07]" />
            <div className="h-3 w-64 animate-pulse rounded bg-white/[0.04]" />
          </div>
          <div className="h-5 w-12 animate-pulse rounded bg-white/[0.07]" />
        </div>
      ))}
    </div>
  );
}
