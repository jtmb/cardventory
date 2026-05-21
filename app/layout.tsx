import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Oswald, Bebas_Neue, Inter, Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { migrate } from "@/lib/db/migrate";
import ThemeApplicator from "@/components/theme-applicator";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

try { migrate(); } catch (e) { console.error("Migration failed:", e); }

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

export const metadata: Metadata = {
  title: "Cardventory",
  description: "Track your card collection value",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Font CSS variables must live on <html> so applyFontTheme (which sets
  // document.documentElement.style.fontFamily) can resolve var(--font-xxx).
  // CSS custom properties only cascade down, not up from <body>.
  const fontVars = [
    jakartaSans.variable, jetbrainsMono.variable, oswald.variable,
    bebasNeue.variable, inter.variable, nunito.variable,
  ].join(" ");

  return (
    <html lang="en" className={`dark ${fontVars}`} suppressHydrationWarning>
      <head>
        {/* Applies saved theme colors + font before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased min-h-screen">
        <ThemeApplicator />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
