"use client";

import { useEffect, useState, useRef } from "react";
import { useConsent } from "./consent-provider";
import { getOrCreateSessionId } from "@/lib/analytics/client";

type Toggle = { analytics: boolean; performance: boolean };

export function ConsentBanner() {
  const { resolved, analyticsConsent, updateConsent } = useConsent();
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<"summary" | "granular">("summary");
  const [toggles, setToggles] = useState<Toggle>({ analytics: true, performance: true });
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
    // Show banner only after we've read the cookie and there's no existing consent
    if (resolved && !analyticsConsent) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [resolved, analyticsConsent]);

  if (!visible) return null;

  async function accept(analytics: boolean, performance: boolean) {
    setVisible(false);
    await updateConsent(analytics, performance, sessionIdRef.current);
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center"
      style={{ animation: "slideUp 0.3s ease-out" }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl p-5 space-y-4">
        {view === "summary" ? (
          <>
            <div>
              <p className="text-sm font-semibold">We use cookies</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                We use analytics cookies to understand how you use Cardventory and improve your
                experience. You can accept all or customise your preferences.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => accept(true, true)}
                className="flex-1 min-w-[100px] rounded-lg bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 hover:opacity-90 transition-opacity"
              >
                Accept all
              </button>
              <button
                onClick={() => accept(false, false)}
                className="flex-1 min-w-[100px] rounded-lg border border-border text-xs font-medium px-4 py-2 hover:bg-muted/50 transition-colors"
              >
                Reject all
              </button>
              <button
                onClick={() => setView("granular")}
                className="flex-1 min-w-[100px] rounded-lg border border-border text-xs font-medium px-4 py-2 hover:bg-muted/50 transition-colors"
              >
                Manage
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold">Cookie preferences</p>
            <div className="space-y-3">
              {/* Necessary — always on */}
              <ToggleRow
                label="Necessary"
                description="Authentication, session, and security. Required for the app to work."
                checked={true}
                locked
                onChange={() => {}}
              />
              <ToggleRow
                label="Analytics"
                description="Pageviews, clicks, and session behaviour. Helps us understand feature usage."
                checked={toggles.analytics}
                onChange={(v) => setToggles((p) => ({ ...p, analytics: v }))}
              />
              <ToggleRow
                label="Performance"
                description="Server response times and error rates. Helps us detect slowdowns."
                checked={toggles.performance}
                onChange={(v) => setToggles((p) => ({ ...p, performance: v }))}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => accept(toggles.analytics, toggles.performance)}
                className="flex-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 hover:opacity-90 transition-opacity"
              >
                Save preferences
              </button>
              <button
                onClick={() => setView("summary")}
                className="rounded-lg border border-border text-xs font-medium px-4 py-2 hover:bg-muted/50 transition-colors"
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  locked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  locked?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        role="switch"
        aria-checked={checked}
        disabled={locked}
        onClick={() => !locked && onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        } ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      <div>
        <p className="text-xs font-medium leading-tight">
          {label}
          {locked && <span className="ml-1.5 text-[10px] text-muted-foreground">(always on)</span>}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
      </div>
    </div>
  );
}
