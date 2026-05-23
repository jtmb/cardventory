import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rawSqlite } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)).get();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {

  // Weekly cohorts: group users by the ISO week they registered, track return sessions
  // We use the last 12 weeks for the cohort matrix
  const twelveWeeksAgo = Date.now() - 12 * 7 * 24 * 60 * 60 * 1000;

  // Get user cohorts by registration week
  const cohortUsers = rawSqlite.prepare(`
    SELECT
      id,
      strftime('%Y-W%W', created_at, 'unixepoch') AS cohortWeek,
      CAST(strftime('%s', strftime('%Y-%W-1', created_at, 'unixepoch'), 'unixepoch') AS INTEGER) AS cohortTs
    FROM users
    WHERE created_at >= ?
    ORDER BY created_at
  `).all(Math.floor(twelveWeeksAgo / 1000)) as { id: string; cohortWeek: string; cohortTs: number }[];

  if (cohortUsers.length === 0) {
    return NextResponse.json({ cohorts: [] });
  }

  // For each cohort, count how many users had a session N weeks later
  const cohortMap = new Map<string, { week: string; ts: number; userIds: string[] }>();
  for (const u of cohortUsers) {
    if (!cohortMap.has(u.cohortWeek)) {
      cohortMap.set(u.cohortWeek, { week: u.cohortWeek, ts: u.cohortTs * 1000, userIds: [] });
    }
    cohortMap.get(u.cohortWeek)!.userIds.push(u.id);
  }

  const weeks = [...cohortMap.values()].sort((a, b) => a.ts - b.ts);
  const MAX_FOLLOW_WEEKS = 8;

  const cohorts = weeks.map(({ week, ts, userIds }) => {
    const size = userIds.length;
    const retention: (number | null)[] = [];

    for (let w = 0; w < MAX_FOLLOW_WEEKS; w++) {
      const weekStart = ts + w * 7 * 24 * 60 * 60 * 1000;
      const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;

      if (weekEnd > Date.now() + 24 * 60 * 60 * 1000) {
        retention.push(null); // future — no data
        continue;
      }

      const placeholders = userIds.map(() => "?").join(",");
      const active = rawSqlite.prepare(`
        SELECT COUNT(DISTINCT user_id) AS cnt
        FROM analytics_sessions
        WHERE user_id IN (${placeholders})
          AND started_at >= ? AND started_at < ?
          AND has_consent = 1
      `).get(...userIds, weekStart, weekEnd) as { cnt: number };

      retention.push(size > 0 ? Math.round((active.cnt / size) * 100) : 0);
    }

    return { week, size, retention };
  });

  return NextResponse.json({ cohorts });
  } catch (err) {
    console.error("[analytics/retention] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
