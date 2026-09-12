"use client";

import dynamic from "next/dynamic";

/**
 * Client-only wrapper for the WebGL hero.
 *
 * The scene is ~150 kB of three.js that the server cannot render and that no
 * one needs before first paint, so it is split out and loaded after
 * hydration. Until it arrives — and permanently, for anyone whose device or
 * browser has no WebGL — the fallback below stands in: a CSS-only cup
 * silhouette with the same warm glow, so the hero never shows a hole.
 */
const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <HeroFallback />,
});

export function HeroFallback() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
      <div className="relative h-64 w-64">
        <div className="absolute inset-0 animate-pulse rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(216,184,102,0.26),transparent_62%)] blur-2xl" />
        <div className="absolute bottom-10 left-1/2 h-28 w-40 -translate-x-1/2 rounded-b-[5rem] rounded-t-xl bg-gradient-to-b from-cream/85 to-cream-dim/35" />
        <div className="absolute bottom-[8.5rem] left-1/2 h-2 w-40 -translate-x-1/2 rounded-full bg-brass/70" />
        <div className="absolute bottom-8 left-1/2 h-3 w-56 -translate-x-1/2 rounded-[100%] bg-black/60 blur-md" />
      </div>
    </div>
  );
}

export default function Hero3D({ className }: { className?: string }) {
  return <HeroScene className={className} />;
}
