import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu/MenuBrowser";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Tea and filter coffee, breakfast chillas, soups, salads, evening chaat, pulavs and cold-pressed juices — made fresh through the day.",
};

export default function MenuPage() {
  return <MenuBrowser />;
}
