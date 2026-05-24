import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Oswald, Bebas_Neue, Inter, Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ThemeApplicator from "@/components/theme-applicator";
import { ConsentProvider } from "@/components/analytics/consent-provider";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { isNull, eq, and } from "drizzle-orm";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500"],
});
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  let iconUrl = "/logo-default.svg";
  try {
    const row = await db
      .select()
      .from(settings)
      .where(and(isNull(settings.userId), eq(settings.key, "app_logo_url")))
      .get();
    if (row?.value) iconUrl = row.value;
  } catch {
    // DB not ready on first boot — fall back to default
  }
  return {
    title: "Cardventory",
    description: "Track your card collection value",
    icons: { icon: iconUrl },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Font CSS variables must live on <html> so they can be resolved by CSS.
  const fontVars = [
    jakartaSans.variable, jetbrainsMono.variable, oswald.variable,
    bebasNeue.variable, inter.variable, nunito.variable,
  ].join(" ");

  return (
    <html lang="en" className={`dark ${fontVars}`} suppressHydrationWarning>
      <head>
        {/* Inline blocking script — runs synchronously before first paint to prevent FOUC */}
        <script dangerouslySetInnerHTML={{__html: THEME_INIT_SCRIPT}} />
      </head>
      <body className="antialiased min-h-screen">
        <ThemeApplicator />
        <ConsentProvider>
          <AnalyticsProvider />
          {children}
          <ConsentBanner />
        </ConsentProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
