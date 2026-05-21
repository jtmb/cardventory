"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { XIcon, ArrowRightIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";

const TOUR_LS_KEY = "cv_tour_done";

type Step = {
  targetId?: string;       // data-tour-id value to spotlight
  title: string;
  body: React.ReactNode;
  tip?: string;            // optional CTA hint
  placement?: "right" | "bottom" | "left" | "center";
  navigateTo?: string;     // route to navigate to when this step activates
  waitForPath?: RegExp;    // auto-advance when pathname matches this pattern
};

const STEPS: Step[] = [
  {
    title: "Welcome to Cardventory!",
    body: "Track your trading card collection, monitor market prices, and see your portfolio value grow. Let's take a quick tour.",
    tip: "Takes about a minute",
  },
  {
    targetId: "tour-add-card",
    title: "Add your first card",
    body: "Click Add Card in the sidebar to log a card from your collection. Fill in the name, set, year, and grade — we'll fetch market prices automatically.",
    placement: "right",
  },
  {
    targetId: "tour-settings-data",
    navigateTo: "/settings?s=data",
    title: "Not sure what to add?",
    body: (
      <>
        Head to{" "}
        <strong className="text-primary font-semibold">Settings → Data</strong>{" "}
        to generate realistic test cards. Perfect for exploring the app before adding your real collection.
      </>
    ),
    placement: "right",
  },
  {
    targetId: "tour-generate-btn",
    title: "Generate sample cards",
    body: "Click 'Add 12 Test Cards' to instantly populate your collection with basketball, baseball, Pokémon cards and more — complete with pre-seeded prices.",
    placement: "bottom",
  },
  {
    targetId: "tour-cards-toolbar",
    navigateTo: "/cards",
    title: "My Cards",
    body: "Browse your full collection here. Use the search bar, sport tabs, or sort by Highest Value, Paid, or Gain/Loss to find exactly what you're looking for.",
    placement: "bottom",
  },
  {
    targetId: "tour-cards-grid",
    navigateTo: "/cards",
    title: "Your collection at a glance",
    body: (
      <>
        Each card shows its <strong>Highest Market Value</strong> (best price across all sources), what you{" "}
        <strong>Paid</strong>, and net <strong>Gain / Loss</strong>. Toggle grid, list, and compact views using the icons in the toolbar.
      </>
    ),
    placement: "center",
  },
  {
    title: "Explore a card's details",
    body: "Each card has a full detail view with pricing, sources, and history. Click Next and we'll open one for you.",
    waitForPath: /^\/cards\/[0-9a-f-]{36}$/,
  },
  {
    targetId: "tour-card-price-summary",
    title: "Price summary",
    body: (
      <>
        <strong>Highest Market Value</strong> is the best price found across all sources.{" "}
        <strong>Paid</strong> is your purchase price. <strong>Gain / Loss</strong> shows the difference with a percentage.
      </>
    ),
    placement: "bottom",
  },
  {
    targetId: "tour-card-sources",
    title: "Prices by source",
    body: "Prices come from eBay, SportsCardInvestor, and SportsCardsPro. The highlighted row has the top price. Tap the ↗ icon next to any source to view the live listing.",
    placement: "bottom",
  },
  {
    targetId: "tour-card-chart",
    title: "Price history chart",
    body: "The chart tracks your card's price over time. Hover over any data point to see the exact price on that date. Use the Refresh button to pull the latest prices.",
    placement: "bottom",
  },
  {
    title: "You're all set!",
    body: "Explore your dashboard, track portfolio value, and refresh prices anytime. Head to Settings → Pricing to configure how often prices auto-update.",
  },
];

type Rect = { x: number; y: number; width: number; height: number };

export function WelcomeTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [spotlight, setSpotlight] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: string } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof localStorage !== "undefined" && !localStorage.getItem(TOUR_LS_KEY)) {
      // Small delay so the layout is fully painted
      const t = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  // Allow external code to start the tour via a custom event
  useEffect(() => {
    function handleStart() {
      setStep(0);
      setActive(true);
    }
    window.addEventListener("cv:start-tour", handleStart);
    return () => window.removeEventListener("cv:start-tour", handleStart);
  }, []);

  const positionForStep = useCallback((stepIndex: number) => {
    const s = STEPS[stepIndex];
    if (!s.targetId) {
      setSpotlight(null);
      setTooltipPos(null);
      return;
    }

    function tryPosition(attempts: number) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 640;

      const el = document.querySelector(`[data-tour-id="${s.targetId}"]`);
      if (!el) {
        if (attempts > 0) {
          setTimeout(() => tryPosition(attempts - 1), 200);
        } else {
          // Element not found (e.g. sidebar collapsed on mobile) — use centred card
          setSpotlight(null);
          setTooltipPos(null);
        }
        return;
      }

      const rect = el.getBoundingClientRect();
      // Skip elements that are invisible or entirely outside the viewport
      if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > vh) {
        setSpotlight(null);
        setTooltipPos(null);
        return;
      }

      const pad = 8;
      const TW = 320;
      const TH = 220;

      // Spotlight cutout
      const spotTop = Math.max(0, rect.top - pad);
      const spotHeight = Math.min(rect.height + pad * 2, vh - spotTop);
      setSpotlight({
        x: rect.left - pad,
        y: spotTop,
        width: rect.width + pad * 2,
        height: spotHeight,
      });

      // On mobile, always use the centred card — no room to anchor tooltips
      if (isMobile || s.placement === "center") {
        setTooltipPos(null);
        return;
      }

      // Auto-fallback: right → bottom → center when space is tight
      let placement = s.placement ?? "right";
      if (placement === "right" && rect.right + 12 + TW + 8 > vw) placement = "bottom";
      if (placement === "bottom" && rect.bottom + 12 + TH + 8 > vh) placement = "center";
      if (placement === "center") { setTooltipPos(null); return; }

      if (placement === "right") {
        const rawTop = rect.top + rect.height / 2;
        setTooltipPos({
          top: Math.min(Math.max(rawTop, TH / 2 + 8), vh - TH / 2 - 8),
          left: Math.min(rect.right + pad + 12, vw - TW - 8),
          placement,
        });
      } else if (placement === "bottom") {
        const belowTop = Math.min(rect.bottom + pad + 12, vh - TH - 8);
        setTooltipPos({
          top: Math.max(belowTop, pad + 8),
          left: Math.min(Math.max(rect.left, 8), vw - TW - 8),
          placement,
        });
      } else {
        setTooltipPos({ top: rect.top + rect.height / 2, left: rect.left - 12, placement });
      }
    }

    tryPosition(12);
  }, []);

  useEffect(() => {
    if (!active) return;
    const s = STEPS[step];
    if (s.navigateTo) {
      router.push(s.navigateTo);
    }
    positionForStep(step);

    function onResize() { positionForStep(step); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, step, positionForStep, router]);

  // Auto-advance when the user navigates to a page matching waitForPath
  useEffect(() => {
    if (!active) return;
    const s = STEPS[step];
    if (s.waitForPath && s.waitForPath.test(pathname)) {
      const t = setTimeout(() => setStep((prev) => prev + 1), 400);
      return () => clearTimeout(t);
    }
  }, [active, step, pathname]);

  function dismiss() {
    localStorage.setItem(TOUR_LS_KEY, "1");
    setActive(false);
  }

  function next() {
    const s = STEPS[step];
    if (s.waitForPath) {
      // Navigate to the first matching card link instead of requiring the user to click one
      const match = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).find((a) => {
        try { return s.waitForPath!.test(new URL(a.href).pathname); } catch { return false; }
      });
      if (match) {
        router.push(new URL(match.href).pathname);
        return; // waitForPath useEffect will advance the step once navigation completes
      }
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  function back() {
    if (step > 0) {
      let target = step - 1;
      // Skip over waitForPath steps — they are transitional and re-trigger immediately
      if (STEPS[target]?.waitForPath) target--;
      if (target >= 0) setStep(target);
    }
  }

  if (!active) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const isWaiting = !!current.waitForPath;

  return (
    <>
      {/* Backdrop with spotlight cutout */}
      <div
        className="fixed inset-0 z-[9998] pointer-events-none"
        aria-hidden="true"
      >
        <svg className="w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlight && (
                <rect
                  x={spotlight.x}
                  y={spotlight.y}
                  width={spotlight.width}
                  height={spotlight.height}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill={isWaiting ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.65)"}
            mask="url(#tour-mask)"
          />
        </svg>
      </div>

      {/* Spotlight ring */}
      {spotlight && (
        <div
          className="fixed z-[9999] rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent pointer-events-none transition-all duration-300"
          style={{
            top: spotlight.y,
            left: spotlight.x,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      {/* Tooltip / card */}
      {tooltipPos ? (
        <div
          ref={tooltipRef}
          className="fixed z-[10000] pointer-events-auto"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: tooltipPos.placement === "bottom" ? undefined : "translateY(-50%)",
            maxWidth: "20rem",
          }}
        >
          <TourCard current={current} step={step} total={STEPS.length} isLast={isLast} isFirst={isFirst} onNext={next} onBack={back} onDismiss={dismiss} />
        </div>
      ) : (
        /* Centred welcome / finish card */
        <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md mx-4">
            <TourCard current={current} step={step} total={STEPS.length} isLast={isLast} isFirst={isFirst} onNext={next} onBack={back} onDismiss={dismiss} />
          </div>
        </div>
      )}
    </>
  );
}

function TourCard({
  current, step, total, isLast, isFirst, onNext, onBack, onDismiss,
}: {
  current: Step;
  step: number;
  total: number;
  isLast: boolean;
  isFirst: boolean;
  onNext: () => void;
  onBack: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-2xl p-5 w-full">
      {/* Step indicator + close */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-primary" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Icon for welcome/finish */}
      {(isFirst || isLast) && (
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-3">
          <SparklesIcon className="h-5 w-5 text-primary" />
        </div>
      )}

      <h3 className="font-bold text-base mb-1">{current.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
      {current.tip && (
        <p className="text-xs text-muted-foreground/70 mt-1.5 italic">{current.tip}</p>
      )}

      <div className="flex items-center gap-2 mt-4">
        {!isFirst && (
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
            Back
          </Button>
        )}
        <Button size="sm" onClick={onNext} className="gap-1.5">
          {isLast ? "Get started" : "Next"}
          {!isLast && <ArrowRightIcon className="h-3.5 w-3.5" />}
        </Button>
        {!isLast && (
          <Button variant="ghost" size="sm" onClick={onDismiss} className="text-muted-foreground ml-auto">
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}
