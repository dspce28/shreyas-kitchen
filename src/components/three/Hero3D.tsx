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
      {/* A brass thali seen at the same 45° as the WebGL version: an ellipse
          for the plate, three smaller ones for the katoris. Enough to read as
          the same object, so the swap when the real scene loads is not jarring. */}
      <div className="relative h-72 w-72">
        <div className="absolute inset-0 animate-pulse rounded-full bg-[radial-gradient(circle_at_50%_55%,rgba(156,191,143,0.24),transparent_62%)] blur-2xl" />
        <div className="absolute bottom-12 left-1/2 h-28 w-64 -translate-x-1/2 rounded-[100%] bg-gradient-to-b from-brass/55 to-brass-700/35 ring-1 ring-brass/40" />
        <div className="absolute bottom-[5.5rem] left-[30%] h-7 w-16 rounded-[100%] bg-brass-700/45" />
        <div className="absolute bottom-[6rem] left-1/2 h-6 w-14 -translate-x-1/2 rounded-[100%] bg-brass-700/45" />
        <div className="absolute bottom-[5.5rem] right-[28%] h-7 w-16 rounded-[100%] bg-brass-700/45" />
        <div className="absolute bottom-9 left-1/2 h-4 w-72 -translate-x-1/2 rounded-[100%] bg-black/55 blur-md" />
      </div>
    </div>
  );
}

export default function Hero3D({ className }: { className?: string }) {
  return <HeroScene className={className} />;
}
