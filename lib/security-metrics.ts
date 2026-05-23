/**
 * In-memory performance ring-buffer.
 * Tracks the last BUFFER_SIZE HTTP requests; zero DB writes, zero async I/O.
 * Resets on process restart — intentional (ephemeral diagnostics).
 */

export interface RequestRecord {
  path: string;
  method: string;
  status: number;
  durationMs: number;
  timestamp: number;
}

const BUFFER_SIZE = 2_000;
const ring = new Array<RequestRecord | undefined>(BUFFER_SIZE).fill(undefined);
let writeIdx = 0;
let totalRecorded = 0;

function normalizePath(raw: string): string {
  return raw
    .split("?")[0]
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/[id]")
    .replace(/\/\d{5,}/g, "/[id]");
}

const SKIP_PREFIXES = ["/_next/", "/favicon", "/uploads/", "/theme-init"];

export function recordRequest(opts: {
  path: string;
  method: string;
  status: number;
  durationMs: number;
}) {
  const path = opts.path.split("?")[0];
  if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return;

  ring[writeIdx % BUFFER_SIZE] = {
    path: normalizePath(path),
    method: opts.method.toUpperCase(),
    status: opts.status,
    durationMs: opts.durationMs,
    timestamp: Date.now(),
  };
  writeIdx++;
  totalRecorded++;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.floor((sorted.length - 1) * p)];
}

export function perfSnapshot() {
  const now = Date.now();
  const WINDOW_MS = 60 * 60_000;

  const all: RequestRecord[] = [];
  for (let i = 0; i < Math.min(totalRecorded, BUFFER_SIZE); i++) {
    const r = ring[i];
    if (r) all.push(r);
  }

  const recent = all.filter((r) => now - r.timestamp < WINDOW_MS);

  const minuteMap = new Map<string, number>();
  for (const r of recent) {
    const d = new Date(r.timestamp);
    const key = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    minuteMap.set(key, (minuteMap.get(key) ?? 0) + 1);
  }
  const requestsPerMinute = Array.from(minuteMap.entries())
    .map(([minute, count]) => ({ minute, count }))
    .sort((a, b) => a.minute.localeCompare(b.minute))
    .slice(-60);

  const routeMap = new Map<string, number[]>();
  for (const r of recent) {
    const key = `${r.method} ${r.path}`;
    const arr = routeMap.get(key) ?? [];
    arr.push(r.durationMs);
    routeMap.set(key, arr);
  }
  const latencyByRoute = Array.from(routeMap.entries())
    .map(([route, durations]) => {
      const sorted = [...durations].sort((a, b) => a - b);
      return {
        route,
        count: durations.length,
        p50: percentile(sorted, 0.5),
        p95: percentile(sorted, 0.95),
        p99: percentile(sorted, 0.99),
        avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      };
    })
    .sort((a, b) => b.p95 - a.p95)
    .slice(0, 20);

  const statusMap = new Map<number, number>();
  for (const r of recent) statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);
  const statusDistribution = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => a.status - b.status);

  const methodMap = new Map<string, number>();
  for (const r of recent) methodMap.set(r.method, (methodMap.get(r.method) ?? 0) + 1);

  const durations = recent.map((r) => r.durationMs).sort((a, b) => a - b);
  const errors = recent.filter((r) => r.status >= 400).length;

  return {
    totalRequests: totalRecorded,
    windowCount: recent.length,
    errorRate: recent.length > 0 ? Math.round((errors / recent.length) * 100) : 0,
    avgMs: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    p99Ms: percentile(durations, 0.99),
    requestsPerMinute,
    latencyByRoute,
    statusDistribution,
    methodDistribution: Array.from(methodMap.entries()).map(([method, count]) => ({ method, count })),
    slowest: [...recent]
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10)
      .map((r) => ({ ...r, timestamp: new Date(r.timestamp).toISOString() })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * In-memory security event counters.
 * Shared across the Node.js process lifetime; reset on process restart.
 */

interface Counters {
  uploadBlocked: number;
  scanBlocked: number;
  registrationBlocked: number;
}

const counters: Counters = {
  uploadBlocked: 0,
  scanBlocked: 0,
  registrationBlocked: 0,
};

export const securityMetrics = {
  increment(key: keyof Counters) {
    counters[key]++;
  },
  snapshot(): Readonly<Counters> {
    return { ...counters };
  },
};

