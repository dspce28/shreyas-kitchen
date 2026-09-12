import type { Metadata, Viewport } from "next";
import { Oswald, Josefin_Sans, Tangerine } from "next/font/google";
import "./globals.css";
import { STORE } from "@/data/menu";
import { SessionProvider } from "@/components/SessionProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Toaster } from "@/components/ui/Toaster";
import { Preloader } from "@/components/ui/Preloader";

// All three are self-hosted at build time by next/font, so there is no
// render-blocking request to Google at runtime and no layout shift.

/** Headlines. 200 is the weight that matters; the rest are for small caps. */
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-oswald",
  display: "swap",
});

/** Everything functional: body copy, navigation, forms, buttons. */
const josefin = Josefin_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-josefin",
  display: "swap",
});

/** Decorative only — script eyebrows and prices. Two weights is all it has. */
const tangerine = Tangerine({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-tangerine",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${STORE.name} · Fresh, wholesome food in Ahmedabad`,
    template: `%s · ${STORE.name}`,
  },
  description: STORE.promise,
  applicationName: STORE.name,
  keywords: [
    "Shreya's Kitchen",
    "Ahmedabad cafe",
    "healthy food Ahmedabad",
    "Fortune Business Hub",
    "office lunch delivery",
  ],
  openGraph: {
    title: STORE.name,
    description: STORE.promise,
    locale: "en_IN",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#121a16",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      className={`${oswald.variable} ${josefin.variable} ${tangerine.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <Preloader />
        <SessionProvider>
          <div className="relative z-10 flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
