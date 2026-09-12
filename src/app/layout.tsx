import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import { STORE } from "@/data/menu";
import { SessionProvider } from "@/components/SessionProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Toaster } from "@/components/ui/Toaster";

// The two faces from the printed menu, self-hosted at build time by next/font
// so there is no render-blocking request to Google at runtime.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jost",
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
    <html lang="en-IN" className={`${cormorant.variable} ${jost.variable}`}>
      <body className="min-h-dvh antialiased">
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
