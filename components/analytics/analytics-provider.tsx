"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useConsent } from "./consent-provider";
import {
  getOrCreateSessionId,
  captureUTM,
  startFlushLoop,
  stopFlushLoop,
  trackPageview,
  trackClick,
  trackScrollDepth,
  trackCustomEvent,
} from "@/lib/analytics/client";

// Scroll sentinels — one per depth bucket
const DEPTHS: (25 | 50 | 75 | 100)[] = [25, 50, 75, 100];

export function AnalyticsProvider() {
  const { analyticsConsent, resolved } = useConsent();
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);
  const observersRef = useRef<IntersectionObserver[]>([]);
  const sentinelRefs = useRef<HTMLDivElement[]>([]);
  const clickHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  // Wait until consent is resolved before initialising
  useEffect(() => {
    if (!resolved || !analyticsConsent) return;

    // Initialise session
    getOrCreateSessionId();
    captureUTM();

    // Track session start
    trackCustomEvent("session_start", {});
    startFlushLoop();

    // Click tracking (delegated)
    const clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const el = target.closest("a, button, [data-track]") as HTMLElement | null;
      if (!el) return;
      const rect = document.documentElement.getBoundingClientRect();
      const x = Math.round((e.clientX / window.innerWidth) * 100);
      const y = Math.round((e.clientY / window.innerHeight) * 100);
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim().slice(0, 80) ?? "";
      const href = (el as HTMLAnchorElement).href ?? "";
      trackClick(tag, text, href, x, y);
    };
    clickHandlerRef.current = clickHandler;
    document.addEventListener("click", clickHandler, { passive: true });

    // Scroll depth sentinels
    DEPTHS.forEach((depth) => {
      const div = document.createElement("div");
      div.style.cssText = `position:absolute;top:${depth}%;left:0;width:1px;height:1px;pointer-events:none;`;
      document.body.appendChild(div);
      sentinelRefs.current.push(div);

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            trackScrollDepth(depth);
            obs.disconnect(); // fire once per page
          }
        },
        { threshold: 0 }
      );
      obs.observe(div);
      observersRef.current.push(obs);
    });

    return () => {
      stopFlushLoop();
      if (clickHandlerRef.current) {
        document.removeEventListener("click", clickHandlerRef.current);
      }
      observersRef.current.forEach((o) => o.disconnect());
      sentinelRefs.current.forEach((d) => d.remove());
      observersRef.current = [];
      sentinelRefs.current = [];
    };
  }, [resolved, analyticsConsent]);

  // Pageview tracking on route change
  useEffect(() => {
    if (!resolved || !analyticsConsent) return;
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;
    trackPageview(pathname, document.title);
  }, [pathname, resolved, analyticsConsent]);

  return null;
}
