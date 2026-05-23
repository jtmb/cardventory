import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rawSqlite } from "@/lib/db";
import { getClientIp } from "@/lib/analytics/server";
import { lookupGeo } from "@/lib/analytics/geoip";
import { parseUA } from "@/lib/analytics/ua-parser";

// In-memory rate limiter: max 120 events per minute per IP
const rl = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const max = 120;
  const hits = (rl.get(ip) ?? []).filter((t) => now - t < window);
  hits.push(now);
  rl.set(ip, hits);
  return hits.length > max;
}

type RawEvent = {
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

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { events: RawEvent[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body?.events)) {
    return NextResponse.json({ error: "events must be an array" }, { status: 400 });
  }

  const events = body.events.slice(0, 50); // hard cap per batch
  if (events.length === 0) return NextResponse.json({ ok: true });

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const ua = request.headers.get("user-agent") ?? "";
  const { browser, os, device } = parseUA(ua);
  const geo = lookupGeo(ip);
  const now = Date.now();

  // Collect unique session IDs to check consent
  const sessionIds = [...new Set(events.map((e) => e.sessionId).filter(Boolean))];

  // Check consent for each session — SQLite synchronous
  const consentedSessions = new Set<string>();
  for (const sid of sessionIds) {
    const row = rawSqlite
      .prepare("SELECT has_consent FROM analytics_sessions WHERE id = ?")
      .get(sid) as { has_consent: number } | undefined;
    if (row?.has_consent) consentedSessions.add(sid);
  }

  const insert = rawSqlite.prepare(`
    INSERT OR IGNORE INTO analytics_events
      (id, session_id, user_id, event_type, event_name, path, referrer, properties,
       utm_source, utm_medium, utm_campaign, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const upsertSession = rawSqlite.prepare(`
    INSERT INTO analytics_sessions
      (id, user_id, started_at, last_seen_at, page_count, event_count,
       entry_path, device, browser, os, viewport, country, region, city,
       utm_source, utm_medium, utm_campaign, referrer, has_consent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(id) DO UPDATE SET
      last_seen_at = excluded.last_seen_at,
      page_count   = analytics_sessions.page_count + CASE WHEN excluded.page_count > 0 THEN 1 ELSE 0 END,
      event_count  = analytics_sessions.event_count + 1,
      exit_path    = excluded.entry_path,
      user_id      = COALESCE(analytics_sessions.user_id, excluded.user_id)
  `);

  const insertAll = rawSqlite.transaction(() => {
    for (const ev of events) {
      const sid = ev.sessionId;
      if (!sid) continue;

      const isPageview = ev.eventType === "pageview";
      const firstEv = events.indexOf(ev) === 0;

      // Upsert session row (creates it if first event in session)
      upsertSession.run(
        sid,
        userId,
        ev.ts ?? now,
        ev.ts ?? now,
        isPageview ? 1 : 0, // increments page_count only for pageviews
        1,
        ev.path ?? "/",
        device,
        browser,
        os,
        ev.viewport ?? null,
        geo?.country ?? null,
        geo?.region ?? null,
        geo?.city ?? null,
        ev.utmSource ?? null,
        ev.utmMedium ?? null,
        ev.utmCampaign ?? null,
        ev.referrer ?? null
      );

      // Only store event if session has consent
      if (!consentedSessions.has(sid)) continue;

      insert.run(
        crypto.randomUUID(),
        sid,
        userId,
        ev.eventType,
        ev.eventName ?? null,
        ev.path,
        ev.referrer ?? null,
        ev.properties ? JSON.stringify(ev.properties) : null,
        ev.utmSource ?? null,
        ev.utmMedium ?? null,
        ev.utmCampaign ?? null,
        ev.ts ?? now
      );
    }
  });

  try {
    insertAll();
  } catch (err) {
    console.error("[analytics/event] DB error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
