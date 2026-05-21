"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 30_000;

/**
 * Handles two concerns:
 * 1. Log the user's IP on first dashboard load (once per browser session).
 * 2. Poll /api/notifications every 30 s and show persistent toasts for new events.
 */
export function DashboardClientInit() {
  const seenIds = useRef<Set<string>>(new Set());

  // Log IP once per browser session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const alreadyLogged = sessionStorage.getItem("cv_ip_logged");
    if (!alreadyLogged) {
      fetch("/api/auth/log-ip", { method: "POST" })
        .then((r) => { if (r.ok) sessionStorage.setItem("cv_ip_logged", "1"); })
        .catch(() => {});
    }
  }, []);

  // Notification polling
  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const items = (await res.json()) as Array<{
          id: string;
          message: string;
          type: "new_high" | "price_change";
        }>;

        const newItems = items.filter((item) => !seenIds.current.has(item.id));
        if (newItems.length === 0) return;

        // Mark as read server-side
        fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: newItems.map((i) => i.id) }),
        }).catch(() => {});

        // Show persistent toasts
        for (const item of newItems) {
          seenIds.current.add(item.id);
          toast.info(item.message, {
            duration: Infinity,
            dismissible: true,
          });
        }
      } catch {
        // Network error — silently ignore
      }
    }

    poll(); // immediate first poll
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return null;
}
