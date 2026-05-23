"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/app-logo";
import { ArrowRightIcon } from "lucide-react";

interface LandingNavProps {
  isLoggedIn: boolean;
  /** When true, hides the "Sign In" link (used on the login page itself) */
  hideSignIn?: boolean;
}

export function LandingNav({ isLoggedIn, hideSignIn = false }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <AppLogo size="md" />
          <span className="font-bold text-base tracking-tight">Cardventory</span>
        </Link>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors"
            >
              Go to Dashboard <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              {!hideSignIn && (
                <Link
                  href="/login"
                  className="h-9 px-4 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
              )}
              <Link
                href="/register"
                className="inline-flex items-center h-9 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
