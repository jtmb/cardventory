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

  const [referrers, utmSources, utmMediums, newVsReturning] = await Promise.all([
    rawSqlite.prepare(`
      SELECT
        CASE
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          WHEN referrer LIKE '%google%' THEN 'Google'
          WHEN referrer LIKE '%twitter%' OR referrer LIKE '%t.co%' THEN 'Twitter/X'
          WHEN referrer LIKE '%facebook%' THEN 'Facebook'
          WHEN referrer LIKE '%reddit%' THEN 'Reddit'
          ELSE referrer
        END AS source,
        COUNT(*) AS sessions
      FROM analytics_sessions
      WHERE started_at >= ? AND has_consent = 1
      GROUP BY source
      ORDER BY sessions DESC
      LIMIT 10
    `).all(since) as { source: string; sessions: number }[],

    rawSqlite.prepare(`
      SELECT
        COALESCE(utm_source, 'none') AS source,
        COUNT(*) AS sessions
      FROM analytics_sessions
      WHERE started_at >= ? AND has_consent = 1 AND utm_source IS NOT NULL
      GROUP BY source
      ORDER BY sessions DESC
      LIMIT 10
    `).all(since) as { source: string; sessions: number }[],

    rawSqlite.prepare(`
      SELECT
        COALESCE(utm_medium, 'none') AS medium,
        COUNT(*) AS sessions
      FROM analytics_sessions
      WHERE started_at >= ? AND has_consent = 1 AND utm_medium IS NOT NULL
      GROUP BY medium
      ORDER BY sessions DESC
      LIMIT 10
    `).all(since) as { medium: string; sessions: number }[],

    rawSqlite.prepare(`
      SELECT
        CASE
          WHEN s.user_id IS NULL THEN 'anonymous'
          WHEN s.started_at <= (u.created_at * 1000 + 86400000) THEN 'new'
          ELSE 'returning'
        END AS type,
        COUNT(*) AS sessions
      FROM analytics_sessions s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.started_at >= ? AND s.has_consent = 1
      GROUP BY type
    `).all(since) as { type: string; sessions: number }[],
  ]);

  return NextResponse.json({ referrers, utmSources, utmMediums, newVsReturning });
  } catch (err) {
    console.error("[analytics/acquisition] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
