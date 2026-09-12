"use client";

import Image from "next/image";
import { Parallax } from "./Parallax";
import { cn } from "@/lib/utils";

/**
 * Decorative botanical engraving, drifting on scroll.
 *
 * The reference template hangs small ornaments off its sections and moves
 * them against the page; these are the same idea with a spice-drawer motif.
 *
 * Kept deliberately faint. At full strength white line art on a dark ground
 * competes with the headline it is supposed to frame, and the section starts
 * to look like a wallpaper sample.
 */
export function Engraving({
  kind = "spices",
  className,
  distance = 60,
  opacity = 0.07,
  width = 420,
}: {
  kind?: "spices" | "berries";
  className?: string;
  distance?: number;
  opacity?: number;
  width?: number;
}) {
  return (
    <Parallax
      distance={distance}
      className={cn("pointer-events-none absolute -z-10 select-none", className)}
    >
      <Image
        src={`/menu/cutout/engraving-${kind}.webp`}
        alt=""
        width={width}
        height={Math.round(width * 0.86)}
        aria-hidden
        style={{ opacity }}
        className="h-auto w-full"
      />
    </Parallax>
  );
}
