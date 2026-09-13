import Link from "next/link";
import { ArrowRight, Clock, Leaf, Sparkles } from "lucide-react";
import { STORE, COMBOS } from "@/data/menu";
import { Hero } from "@/components/home/Hero";
import { About } from "@/components/home/About";
import { MenuTabs } from "@/components/home/MenuTabs";
import { SignatureBand } from "@/components/home/SignatureBand";
import { ParallaxBand } from "@/components/home/ParallaxBand";
import { ScenePanel } from "@/components/home/ScenePanel";
import { Gallery } from "@/components/home/Gallery";
import { Testimonials } from "@/components/home/Testimonials";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";

/**
 * The landing page is deliberately static: it reads from data/menu.ts, not
 * the database, so it renders instantly and still looks finished before
 * Supabase is connected. Live prices and ordering live on /menu.
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
    body: "Breakfast from eight, snacks from three, everything else all day. Built around the rhythm of Fortune Business Hub.",
  },
  {
    icon: Sparkles,
    title: "Honest portions",
    body: "Light and clean does not mean small. A meal of the day is two sabzis, four fulka, dal and rice.",
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />

      {/* ── Pillars ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <RevealGroup stagger={0.14} className="grid gap-5 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <RevealItem key={p.title} from="up">
              <article className="group h-full border border-white/[0.08] p-8 transition-colors duration-500 hover:border-tan/30">
                <div className="grid h-11 w-11 place-items-center border border-tan/25 bg-tan/[0.07] transition-colors duration-500 group-hover:border-tan/50">
                  <p.icon size={19} className="text-tan" aria-hidden />
                </div>
                <h3 className="mt-6 text-lg text-cream">{p.title}</h3>
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-sand">{p.body}</p>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <MenuTabs />

      <ScenePanel
        slug="scene-chaat"
        script="Three till six"
        head={["The hours the building", "waits for"]}
        body="Baskets fried to order, chutneys ground that morning, and a counter that empties as fast as it fills. Evening snacks run from three until six, and the good stuff goes first."
        href="/menu#evening-snacks"
        cta="See evening snacks"
      />

      <ParallaxBand />
      <SignatureBand />

      {/* ── Combos ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <Reveal zoom>
          <div className="glass-tan relative overflow-hidden px-7 py-14 text-center sm:px-14 sm:py-20">
            <span
              className="outline-word pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[13vw] opacity-70"
              aria-hidden
            >
              Combos
            </span>
            <div className="relative mx-auto max-w-2xl">
              <p className="eyebrow-script">{COMBOS.length} pairings</p>
              <h2 className="mt-2 text-[2rem] sm:text-5xl">
                <span className="text-cream">A little more, for </span>
                <span className="text-tan">a little less</span>
              </h2>
              <p className="mx-auto mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-cream-dim">
                Thoughtful pairings for a working day — a breakfast with your chai, a soup with
                your salad. Each combo is priced below the items bought separately.
              </p>
              <Link
                href="/combos"
                className="group mt-9 inline-flex h-13 items-center gap-2.5 bg-gradient-to-b from-sage-300 to-sage-600 px-8 text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-ink-900 transition-all hover:brightness-105"
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

      <Gallery />

      <ScenePanel
        slug="scene-thali-spread"
        script="Lunch, properly"
        head={["Two sabzis, four", "fulka, dal and rice"]}
        body="The meal of the day changes with what the market had that morning. Order it with white rice or brown, and it arrives the way it leaves the kitchen — hot, and all at once."
        href="/menu#rice-and-meals"
        cta="See the meal of the day"
      />

      <Testimonials />

      {/* ── Closing note ────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <Reveal>
          <p className="text-pretty text-xl font-light italic leading-relaxed text-cream-dim sm:text-2xl">
            &ldquo;Every dish is prepared fresh, with care, for the way you work and live.&rdquo;
          </p>
          <p className="eyebrow-script mt-6">{STORE.owner}</p>
          <p className="tnum mt-1 text-xs tracking-[0.2em] text-stone">{STORE.phoneDisplay}</p>
        </Reveal>
      </section>
    </>
  );
}
