import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Oswald, Bebas_Neue, Inter, Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ThemeApplicator from "@/components/theme-applicator";
import { preinit } from "react-dom";
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
  let iconUrl = "/logo.png";
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
  // Applies saved theme colors + font before first paint to prevent FOUC.
  // preinit injects a <script> into the SSR <head> without adding a React-managed
  // script element to the component tree, so React 19 does not warn about it.
  preinit("/theme-init.js", { as: "script" });

  // Font CSS variables must live on <html> so applyFontTheme (which sets
  // document.documentElement.style.fontFamily) can resolve var(--font-xxx).
  // CSS custom properties only cascade down, not up from <body>.
  const fontVars = [
    jakartaSans.variable, jetbrainsMono.variable, oswald.variable,
    bebasNeue.variable, inter.variable, nunito.variable,
  ].join(" ");

  return (
    <html lang="en" className={`dark ${fontVars}`} suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        <ThemeApplicator />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
