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

  const [devices, browsers, oses, viewports] = await Promise.all([
    rawSqlite.prepare(`
      SELECT COALESCE(device, 'unknown') AS device, COUNT(*) AS sessions
      FROM analytics_sessions WHERE started_at >= ? AND has_consent = 1
      GROUP BY device ORDER BY sessions DESC
    `).all(since) as { device: string; sessions: number }[],

    rawSqlite.prepare(`
      SELECT COALESCE(browser, 'unknown') AS browser, COUNT(*) AS sessions
      FROM analytics_sessions WHERE started_at >= ? AND has_consent = 1
      GROUP BY browser ORDER BY sessions DESC LIMIT 8
    `).all(since) as { browser: string; sessions: number }[],

    rawSqlite.prepare(`
      SELECT COALESCE(os, 'unknown') AS os, COUNT(*) AS sessions
      FROM analytics_sessions WHERE started_at >= ? AND has_consent = 1
      GROUP BY os ORDER BY sessions DESC LIMIT 8
    `).all(since) as { os: string; sessions: number }[],

    rawSqlite.prepare(`
      SELECT COALESCE(viewport, 'unknown') AS viewport, COUNT(*) AS sessions
      FROM analytics_sessions WHERE started_at >= ? AND has_consent = 1
      GROUP BY viewport ORDER BY sessions DESC LIMIT 10
    `).all(since) as { viewport: string; sessions: number }[],
  ]);

  return NextResponse.json({ devices, browsers, oses, viewports });
  } catch (err) {
    console.error("[analytics/devices] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
