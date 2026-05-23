"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useConsent } from "./consent-provider";

const COOKIE_NAME = "cv_consent";
const CONSENT_VERSION = "1.0";

/**
 * Silently auto-consents admins on first visit so their activity is tracked
 * without requiring the consent banner. Renders nothing — place inside
 * SessionProvider (e.g. the dashboard layout).
 */
export function AdminConsentInit() {
  const { data: session } = useSession();
  const { resolved } = useConsent();

  useEffect(() => {
    if (resolved) return;
    if (session?.user?.role !== "admin") return;

    // Set cookie directly so it persists across refreshes
    const val = JSON.stringify({ version: CONSENT_VERSION, analytics: true, performance: true });
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(val)};path=/;max-age=${365 * 86_400};SameSite=Lax`;

    // Force ConsentProvider to re-read the cookie by dispatching a storage event.
    // ConsentProvider reads the cookie on mount only, so trigger a page reload-free
    // re-init by updating state directly via a custom event.
    window.dispatchEvent(new CustomEvent("cv:consent-updated"));
  }, [session?.user?.role, resolved]);

  return null;
}
