import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Oswald } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Cardventory",
  description: "Track your card collection value",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Applies saved theme colors before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
        <body className={`${jakartaSans.variable} ${jetbrainsMono.variable} ${oswald.variable} antialiased min-h-screen`}>
        <ThemeApplicator />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
