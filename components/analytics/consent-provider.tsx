"use client";

import { createContext, useContext, useEffect, useState } from "react";

const COOKIE_NAME = "cv_consent";
const CONSENT_VERSION = "1.0";

type ConsentState = {
  analyticsConsent: boolean;
  performanceConsent: boolean;
  resolved: boolean; // true once we've read the cookie
};

type ConsentCtx = ConsentState & {
  updateConsent: (analytics: boolean, performance: boolean, sessionId: string) => Promise<void>;
};

const ConsentContext = createContext<ConsentCtx>({
  analyticsConsent: false,
  performanceConsent: false,
  resolved: false,
  updateConsent: async () => {},
});

export function useConsent() {
  return useContext(ConsentContext);
}

function readCookie(): ConsentState {
  try {
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${COOKIE_NAME}=`))
      ?.split("=")
      .slice(1)
      .join("=");
    if (!raw) return { analyticsConsent: false, performanceConsent: false, resolved: false };
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (parsed.version !== CONSENT_VERSION) {
      return { analyticsConsent: false, performanceConsent: false, resolved: false };
    }
    return {
      analyticsConsent: Boolean(parsed.analytics),
      performanceConsent: Boolean(parsed.performance),
      resolved: true,
    };
  } catch {
    return { analyticsConsent: false, performanceConsent: false, resolved: false };
  }
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConsentState>({
    analyticsConsent: false,
    performanceConsent: false,
    resolved: false,
  });

  useEffect(() => {
    setState(readCookie());

    // AdminConsentInit sets the cookie client-side and fires this event
    // so we pick it up without a full page reload.
    function onConsentUpdated() { setState(readCookie()); }
    window.addEventListener("cv:consent-updated", onConsentUpdated);
    return () => window.removeEventListener("cv:consent-updated", onConsentUpdated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateConsent(analytics: boolean, performance: boolean, sessionId: string) {
    try {
      await fetch("/api/analytics/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, analyticsConsent: analytics, performanceConsent: performance }),
      });
    } catch {
      // best-effort
    }
    setState({ analyticsConsent: analytics, performanceConsent: performance, resolved: true });
  }

  return (
    <ConsentContext.Provider value={{ ...state, updateConsent }}>
      {children}
    </ConsentContext.Provider>
  );
}
