import type { Metadata } from "next";
import { CombosBrowser } from "@/components/menu/CombosBrowser";

export const metadata: Metadata = {
  title: "Combos",
  description:
    "Thoughtful pairings for a working day — a breakfast with your chai, a soup with your salad. Each combo is priced below the items bought separately.",
};

export default function CombosPage() {
  return <CombosBrowser />;
}
