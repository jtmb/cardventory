// Browser-only analytics client — do NOT import from server components

const SESSION_KEY = "cv_sid";
const UTM_KEY = "cv_utm";
const FLUSH_INTERVAL_MS = 5_000;
const FLUSH_BATCH_SIZE = 10;

export type TrackEvent = {
  sessionId: string;
  eventType: string;
  eventName?: string;
  path: string;
  referrer?: string;
  properties?: Record<string, unknown>;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  viewport?: string;
  ts: number;
};

// ── Session ID ────────────────────────────────────────────────────────────────

export function getOrCreateSessionId(): string {
  if (typeof sessionStorage === "undefined") return "";
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

// ── UTM capture ───────────────────────────────────────────────────────────────

type UTMParams = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

export function captureUTM(): UTMParams {
  if (typeof sessionStorage === "undefined") return {};
  const stored = sessionStorage.getItem(UTM_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch {}
  }
  const params = new URLSearchParams(window.location.search);
  const utm: UTMParams = {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    utmContent: params.get("utm_content") ?? undefined,
    utmTerm: params.get("utm_term") ?? undefined,
  };
  if (utm.utmSource) sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  return utm;
}

// ── Event queue ───────────────────────────────────────────────────────────────

let queue: TrackEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function viewport(): string {
  return `${window.innerWidth}x${window.innerHeight}`;
}

function enqueue(event: Omit<TrackEvent, "sessionId" | "ts" | "viewport">) {
  const sid = getOrCreateSessionId();
  if (!sid) return;
  const utm = captureUTM();
  queue.push({
    ...event,
    ...utm,
    sessionId: sid,
    viewport: viewport(),
    ts: Date.now(),
  });
  if (queue.length >= FLUSH_BATCH_SIZE) flush();
}

async function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0);
  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
    });
  } catch {
    // re-queue on failure (best effort — drop if too many)
    if (queue.length < 100) queue.unshift(...batch);
  }
}

function flushBeacon() {
  if (queue.length === 0) return;
  const batch = queue.splice(0);
  navigator.sendBeacon(
    "/api/analytics/event",
    new Blob([JSON.stringify({ events: batch })], { type: "application/json" })
  );
}

export function startFlushLoop() {
  if (flushTimer) return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      trackCustomEvent("session_end", {});
      flushBeacon();
    }
  });
}

export function stopFlushLoop() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function trackPageview(path: string, title?: string) {
  enqueue({ eventType: "pageview", path, properties: { title } });
}

export function trackClick(element: string, text: string, href: string, x: number, y: number) {
  enqueue({
    eventType: "click",
    path: window.location.pathname,
    properties: { element, text: text.slice(0, 100), href, x, y },
  });
}

export function trackScrollDepth(depth: 25 | 50 | 75 | 100) {
  enqueue({
    eventType: "scroll_depth",
    path: window.location.pathname,
    properties: { depth },
  });
}

export function trackFormInteraction(formId: string, action: "start" | "submit" | "abandon") {
  enqueue({
    eventType: action === "start" ? "form_start" : action === "submit" ? "form_submit" : "form_abandon",
    eventName: formId,
    path: window.location.pathname,
  });
}

export function trackCustomEvent(name: string, properties: Record<string, unknown>) {
  enqueue({ eventType: "custom", eventName: name, path: window.location.pathname, properties });
}
