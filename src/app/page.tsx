import Link from "next/link";
import { ArrowRight, Clock, Leaf, Sparkles } from "lucide-react";
import { STORE, CATEGORIES, COMBOS } from "@/data/menu";
import { Hero } from "@/components/home/Hero";
import { Reveal } from "@/components/ui/Reveal";

/**
 * The landing page is deliberately static: it reads from data/menu.ts, not
 * the database, so it renders instantly and still looks finished before
 * Supabase is connected. Live prices live on /menu.
 */

const PILLARS = [
  {
    icon: Leaf,
    title: "Cooked through the day",
    body: "Nothing is batch-made at dawn and reheated. Chillas hit the pan when you order; juices are pressed, not poured.",
  },
  {
    icon: Clock,
    title: "Quick, because you're working",
    body: "Breakfast from 8, snacks from 3, everything else all day. Built around the rhythm of Fortune Business Hub.",
  },
  {
    icon: Sparkles,
    title: "Honest portions",
    body: "Light and clean does not mean small. A meal of the day is two sabzis, four fulka, dal and rice.",
  },
];

export default function HomePage() {
  const favourites = CATEGORIES.flatMap((c) =>
    c.items.filter((i) => i.favourite).map((i) => ({ ...i, category: c.name })),
  );

  return (
    <>
      <Hero />

      {/* ── Pillars ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal>
          <p className="eyebrow text-center">Why people come back</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance text-center text-4xl leading-[1.1] sm:text-5xl">
            Food that keeps up with a working day
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <article className="glass h-full rounded-[1.75rem] p-7 transition-colors duration-500 hover:border-brass/25">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-brass/25 bg-brass/10">
                  <p.icon size={19} className="text-brass-300" aria-hidden />
                </div>
                <h3 className="mt-5 text-xl text-cream">{p.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-sand">{p.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── House favourites ────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass/25 to-transparent" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">House favourites</p>
                <h2 className="mt-3 text-4xl sm:text-5xl">
                  The ones we&rsquo;re known for
                </h2>
              </div>
              <Link
                href="/menu"
                className="group inline-flex items-center gap-2 text-sm text-brass-300 transition hover:text-brass"
              >
                See all {CATEGORIES.reduce((n, c) => n + c.items.length, 0)} dishes
                <ArrowRight
                  size={15}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {favourites.map((f, i) => (
              <Reveal key={f.slug} delay={i * 0.07}>
                <Link
                  href={`/menu#${f.slug}`}
                  className="group relative block h-full overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.055] to-transparent p-6 transition-all duration-500 hover:border-brass/30 hover:shadow-[var(--shadow-brass)]"
                >
                  {/* Brass wash that lifts on hover. */}
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(216,184,102,0.14),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative">
                    <p className="eyebrow text-[0.5625rem] text-brass/70">{f.category}</p>
                    <h3 className="mt-3 text-2xl leading-tight text-cream">{f.name}</h3>
                    <p className="mt-2 text-[0.8125rem] leading-relaxed text-sand">
                      {f.description}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Combos ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal>
          <div className="glass-brass relative overflow-hidden rounded-[2rem] px-7 py-12 sm:px-14 sm:py-16">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brass/10 blur-3xl" />
            <div className="relative max-w-2xl">
              <p className="eyebrow text-brass/80">{COMBOS.length} pairings</p>
              <h2 className="mt-3 text-balance text-4xl leading-[1.1] sm:text-5xl">
                A little more, for a little less
              </h2>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-cream-dim">
                Thoughtful pairings for a working day — a breakfast with your chai, a soup with
                your salad. Each combo is priced below the items bought separately.
              </p>
              <Link
                href="/combos"
                className="group mt-7 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-brass-300 to-brass-600 px-6 py-3 text-sm font-medium text-ink shadow-[0_1px_0_0_rgba(255,255,255,0.45)_inset,0_12px_28px_-12px_rgba(216,184,102,0.75)] transition-all hover:brightness-105"
              >
                Explore combos
                <ArrowRight
                  size={15}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Closing note ────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 pb-8 text-center sm:px-6">
        <Reveal>
          <p className="font-display text-2xl italic leading-relaxed text-cream-dim sm:text-3xl">
            &ldquo;Every dish is prepared fresh, with care, for the way you work and live.&rdquo;
          </p>
          <p className="eyebrow mt-6">
            {STORE.owner} · {STORE.phoneDisplay}
          </p>
        </Reveal>
      </section>
    </>
  );
}
