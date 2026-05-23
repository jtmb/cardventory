import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, cards } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { rawSqlite } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)).get();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {

  // Step 1: Registered users
  const [{ total: step1 }] = await db.select({ total: count() }).from(users).all();

  // Step 2: Had at least one analytics session (any)
  const step2Row = rawSqlite.prepare(`
    SELECT COUNT(DISTINCT user_id) AS cnt
    FROM analytics_sessions WHERE user_id IS NOT NULL
  `).get() as { cnt: number };
  const step2 = step2Row.cnt;

  // Step 3: Added at least one card
  const step3Row = rawSqlite.prepare(`
    SELECT COUNT(DISTINCT user_id) AS cnt FROM cards
  `).get() as { cnt: number };
  const step3 = step3Row.cnt;

  // Step 4: Return visit (2+ sessions)
  const step4Row = rawSqlite.prepare(`
    SELECT COUNT(DISTINCT user_id) AS cnt
    FROM analytics_sessions
    WHERE user_id IS NOT NULL
    GROUP BY user_id HAVING COUNT(*) >= 2
  `).get() as { cnt: number } | undefined;
  const step4 = rawSqlite.prepare(`
    SELECT COUNT(*) AS cnt FROM (
      SELECT user_id FROM analytics_sessions
      WHERE user_id IS NOT NULL
      GROUP BY user_id HAVING COUNT(*) >= 2
    )
  `).get() as { cnt: number };

  // Step 5: 5+ cards added
  const step5Row = rawSqlite.prepare(`
    SELECT COUNT(*) AS cnt FROM (
      SELECT user_id FROM cards GROUP BY user_id HAVING COUNT(*) >= 5
    )
  `).get() as { cnt: number };

  const steps = [
    { label: "Registered",    count: step1,    pct: 100 },
    { label: "First session", count: step2,    pct: step1 > 0 ? Math.round((step2 / step1) * 100) : 0 },
    { label: "Card added",    count: step3,    pct: step1 > 0 ? Math.round((step3 / step1) * 100) : 0 },
    { label: "Return visit",  count: step4.cnt, pct: step1 > 0 ? Math.round((step4.cnt / step1) * 100) : 0 },
    { label: "5+ cards",      count: step5Row.cnt, pct: step1 > 0 ? Math.round((step5Row.cnt / step1) * 100) : 0 },
  ];

  return NextResponse.json({ steps });
  } catch (err) {
    console.error("[analytics/funnels] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
