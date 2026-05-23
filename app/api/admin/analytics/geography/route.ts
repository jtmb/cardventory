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

  const [countries, cities] = await Promise.all([
    rawSqlite.prepare(`
      SELECT COALESCE(country, 'Unknown') AS country, COUNT(*) AS sessions
      FROM analytics_sessions
      WHERE started_at >= ? AND has_consent = 1
      GROUP BY country ORDER BY sessions DESC LIMIT 20
    `).all(since) as { country: string; sessions: number }[],

    rawSqlite.prepare(`
      SELECT COALESCE(city, 'Unknown') AS city, COALESCE(country, '') AS country, COUNT(*) AS sessions
      FROM analytics_sessions
      WHERE started_at >= ? AND has_consent = 1 AND city IS NOT NULL AND city != ''
      GROUP BY city, country ORDER BY sessions DESC LIMIT 20
    `).all(since) as { city: string; country: string; sessions: number }[],
  ]);

  return NextResponse.json({ countries, cities });
  } catch (err) {
    console.error("[analytics/geography] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
