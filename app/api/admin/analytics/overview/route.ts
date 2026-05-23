import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rawSqlite } from "@/lib/db";
import { redirect } from "next/navigation";

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

  const [
    totals,
    dailyTrend,
    topPages,
    bounceStats,
  ] = await Promise.all([
    // Totals
    rawSqlite.prepare(`
      SELECT
        COUNT(DISTINCT id) AS sessions,
        SUM(page_count) AS pageviews,
        COUNT(DISTINCT user_id) AS visitors,
        AVG(CASE WHEN ended_at IS NOT NULL THEN (ended_at - started_at) / 1000.0 ELSE NULL END) AS avgDuration
      FROM analytics_sessions
      WHERE started_at >= ? AND has_consent = 1
    `).get(since) as { sessions: number; pageviews: number; visitors: number; avgDuration: number | null },

    // Daily trend (sessions + pageviews per day)
    rawSqlite.prepare(`
      SELECT
        date(started_at / 1000, 'unixepoch') AS day,
        COUNT(*) AS sessions,
        SUM(page_count) AS pageviews
      FROM analytics_sessions
      WHERE started_at >= ? AND has_consent = 1
      GROUP BY day
      ORDER BY day
    `).all(since) as { day: string; sessions: number; pageviews: number }[],

    // Top pages
    rawSqlite.prepare(`
      SELECT path, COUNT(*) AS views
      FROM analytics_events
      WHERE event_type = 'pageview' AND created_at >= ?
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10
    `).all(since) as { path: string; views: number }[],

    // Bounce rate (sessions with page_count = 1)
    rawSqlite.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN page_count <= 1 THEN 1 ELSE 0 END) AS bounced
      FROM analytics_sessions
      WHERE started_at >= ? AND has_consent = 1
    `).get(since) as { total: number; bounced: number },
  ]);

  const bounceRate = bounceStats.total > 0
    ? Math.round((bounceStats.bounced / bounceStats.total) * 100)
    : 0;

  return NextResponse.json({
    sessions: totals.sessions ?? 0,
    pageviews: totals.pageviews ?? 0,
    visitors: totals.visitors ?? 0,
    avgDuration: Math.round(totals.avgDuration ?? 0),
    bounceRate,
    dailyTrend,
    topPages,
  });
  } catch (err) {
    console.error("[analytics/overview] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
