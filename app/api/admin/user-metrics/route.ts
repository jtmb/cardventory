import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, userLoginLogs, cards } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .get();
  if (!me || me.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {

  const nowMs = Date.now();
  // loginAt and users.createdAt are stored as Unix seconds (Drizzle mode:"timestamp")
  const d1s   = Math.floor((nowMs - 1   * 86_400_000) / 1000);
  const d7s   = Math.floor((nowMs - 7   * 86_400_000) / 1000);
  const d14s  = Math.floor((nowMs - 14  * 86_400_000) / 1000);
  const d30s  = Math.floor((nowMs - 30  * 86_400_000) / 1000);
  const d365s = Math.floor((nowMs - 365 * 86_400_000) / 1000);

  const [dau, wau, d14au, mau] = await Promise.all([
    db.select({ count: sql<number>`count(distinct user_id)` }).from(userLoginLogs).where(sql`login_at >= ${d1s}`).get(),
    db.select({ count: sql<number>`count(distinct user_id)` }).from(userLoginLogs).where(sql`login_at >= ${d7s}`).get(),
    db.select({ count: sql<number>`count(distinct user_id)` }).from(userLoginLogs).where(sql`login_at >= ${d14s}`).get(),
    db.select({ count: sql<number>`count(distinct user_id)` }).from(userLoginLogs).where(sql`login_at >= ${d30s}`).get(),
  ]);

  const [byHour, byDow, topUsers, monthlyRegs] = await Promise.all([
    db
      .select({
        hour: sql<number>`cast(strftime('%H', login_at, 'unixepoch') as integer)`,
        count: sql<number>`count(*)`,
      })
      .from(userLoginLogs)
      .where(sql`login_at >= ${d30s}`)
      .groupBy(sql`strftime('%H', login_at, 'unixepoch')`)
      .orderBy(sql`hour`)
      .all(),

    db
      .select({
        dow: sql<number>`cast(strftime('%w', login_at, 'unixepoch') as integer)`,
        count: sql<number>`count(*)`,
      })
      .from(userLoginLogs)
      .where(sql`login_at >= ${d30s}`)
      .groupBy(sql`strftime('%w', login_at, 'unixepoch')`)
      .orderBy(sql`dow`)
      .all(),

    db
      .select({
        userId: userLoginLogs.userId,
        name: users.name,
        email: users.email,
        loginCount: sql<number>`count(*)`,
        lastLogin: sql<number>`max(login_at)`,
      })
      .from(userLoginLogs)
      .leftJoin(users, eq(userLoginLogs.userId, users.id))
      .where(sql`login_at >= ${d30s}`)
      .groupBy(userLoginLogs.userId)
      .orderBy(desc(sql`count(*)`))
      .limit(10)
      .all(),

    db
      .select({
        month: sql<string>`strftime('%Y-%m', created_at, 'unixepoch')`,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(sql`created_at >= ${d365s}`)
      .groupBy(sql`strftime('%Y-%m', created_at, 'unixepoch')`)
      .orderBy(sql`month`)
      .all(),
  ]);

  // Cards-per-user distribution
  const cardCounts = await db
    .select({ count: sql<number>`count(*)` })
    .from(cards)
    .where(eq(cards.status, "owned"))
    .groupBy(cards.userId)
    .all();

  const dist: Record<string, number> = {
    "0": 0, "1–5": 0, "6–20": 0, "21–50": 0, "51–100": 0, "100+": 0,
  };
  // Count users with 0 cards: total users minus those with any cards
  const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users).get();
  dist["0"] = Math.max(0, (totalUsers?.count ?? 0) - cardCounts.length);
  for (const { count } of cardCounts) {
    if (count <= 5)        dist["1–5"]++;
    else if (count <= 20)  dist["6–20"]++;
    else if (count <= 50)  dist["21–50"]++;
    else if (count <= 100) dist["51–100"]++;
    else                   dist["100+"]++;
  }

  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return NextResponse.json({
    retention: {
      d1:  dau?.count   ?? 0,
      d7:  wau?.count   ?? 0,
      d14: d14au?.count ?? 0,
      d30: mau?.count   ?? 0,
    },
    byHour: Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${h.toString().padStart(2, "0")}:00`,
      count: byHour.find((r) => r.hour === h)?.count ?? 0,
    })),
    byDow: Array.from({ length: 7 }, (_, d) => ({
      dow: d,
      label: DOW_LABELS[d],
      count: byDow.find((r) => r.dow === d)?.count ?? 0,
    })),
    topUsers: topUsers.map((u) => ({
      ...u,
      lastLogin: u.lastLogin ? new Date(u.lastLogin * 1000).toISOString() : null,
    })),
    monthlyRegs,
    cardDistribution: Object.entries(dist).map(([range, count]) => ({ range, count })),
  });
  } catch (err) {
    console.error("[user-metrics] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
