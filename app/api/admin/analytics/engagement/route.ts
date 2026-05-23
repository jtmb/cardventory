import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rawSqlite } from "@/lib/db";

function rangeMs(range: string): number {
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)).get();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {

  const url = new URL(request.url);
  const since = rangeMs(url.searchParams.get("range") ?? "30d");

  const [scrollDepth, topClicks, durationBuckets, pagesPerSession, heatmapClicks] = await Promise.all([
    // Average scroll depth per page
    rawSqlite.prepare(`
      SELECT
        path,
        AVG(CAST(json_extract(properties, '$.depth') AS REAL)) AS avgDepth,
        COUNT(*) AS events
      FROM analytics_events
      WHERE event_type = 'scroll_depth' AND created_at >= ?
      GROUP BY path ORDER BY events DESC LIMIT 10
    `).all(since) as { path: string; avgDepth: number; events: number }[],

    // Most clicked elements
    rawSqlite.prepare(`
      SELECT
        path,
        json_extract(properties, '$.element') AS element,
        json_extract(properties, '$.text') AS text,
        COUNT(*) AS clicks
      FROM analytics_events
      WHERE event_type = 'click' AND created_at >= ?
      GROUP BY path, element, text
      ORDER BY clicks DESC LIMIT 20
    `).all(since) as { path: string; element: string; text: string; clicks: number }[],

    // Session duration histogram (bucketed in seconds)
    rawSqlite.prepare(`
      SELECT
        CASE
          WHEN (ended_at - started_at) / 1000 < 10   THEN '0-10s'
          WHEN (ended_at - started_at) / 1000 < 30   THEN '10-30s'
          WHEN (ended_at - started_at) / 1000 < 60   THEN '30-60s'
          WHEN (ended_at - started_at) / 1000 < 180  THEN '1-3m'
          WHEN (ended_at - started_at) / 1000 < 600  THEN '3-10m'
          ELSE '10m+'
        END AS bucket,
        COUNT(*) AS sessions
      FROM analytics_sessions
      WHERE started_at >= ? AND has_consent = 1 AND ended_at IS NOT NULL
      GROUP BY bucket
    `).all(since) as { bucket: string; sessions: number }[],

    // Pages per session distribution
    rawSqlite.prepare(`
      SELECT
        CASE
          WHEN page_count = 1 THEN '1'
          WHEN page_count = 2 THEN '2'
          WHEN page_count <= 4 THEN '3-4'
          WHEN page_count <= 7 THEN '5-7'
          ELSE '8+'
        END AS bucket,
        COUNT(*) AS sessions
      FROM analytics_sessions
      WHERE started_at >= ? AND has_consent = 1
      GROUP BY bucket
    `).all(since) as { bucket: string; sessions: number }[],

    // Click heatmap data (x%, y% for selected page — all pages aggregated by default)
    rawSqlite.prepare(`
      SELECT
        path,
        CAST(json_extract(properties, '$.x') AS INTEGER) AS x,
        CAST(json_extract(properties, '$.y') AS INTEGER) AS y,
        COUNT(*) AS count
      FROM analytics_events
      WHERE event_type = 'click' AND created_at >= ?
        AND json_extract(properties, '$.x') IS NOT NULL
      GROUP BY path, x, y
      ORDER BY count DESC LIMIT 500
    `).all(since) as { path: string; x: number; y: number; count: number }[],
  ]);

  // Fix ordering of duration buckets
  const durationOrder = ["0-10s", "10-30s", "30-60s", "1-3m", "3-10m", "10m+"];
  const sortedDuration = [...durationBuckets].sort(
    (a, b) => durationOrder.indexOf(a.bucket) - durationOrder.indexOf(b.bucket)
  );

  return NextResponse.json({
    scrollDepth,
    topClicks,
    durationBuckets: sortedDuration,
    pagesPerSession,
    heatmapClicks,
  });
  } catch (err) {
    console.error("[analytics/engagement] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
