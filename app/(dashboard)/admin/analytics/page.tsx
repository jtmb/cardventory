import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AnalyticsDashboard, type AnalyticsData } from "@/components/dashboard/analytics-dashboard";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)).get();
  if (!me || me.role !== "admin") redirect("/dashboard");

  const raw = await getAnalyticsData(session.user.id);

  const analyticsData: AnalyticsData = {
    users: raw.users,
    cards: { owned: raw.cards.owned, wanted: raw.cards.wanted },
    byGenre: raw.byGenre,
    priceHistory: {
      total: raw.priceHistory.total,
      lastRefreshStr: raw.priceHistory.lastRefresh
        ? new Date(raw.priceHistory.lastRefresh).toLocaleString()
        : "Never",
    },
    perUser: raw.perUser.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      cardCount: u.cardCount,
    })),
    cardsPerDay: raw.cardsPerDay,
    security: {
      logsPerDay: raw.security.logsPerDay,
      topIps: raw.security.topIps,
      recentBans: raw.security.recentBans.map((b) => ({
        id: b.id,
        email: b.email,
        ipAddress: b.ipAddress,
        reason: b.reason,
        bannedAt: b.bannedAt ? new Date(b.bannedAt).toISOString() : null,
      })),
      registrationsPerDay: raw.security.registrationsPerDay,
    },
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Instance-wide metrics, usage overview, and security monitoring.
        </p>
      </div>
      <AnalyticsDashboard data={analyticsData} />
    </div>
  );
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getAnalyticsData(_adminId: string) {
  const {
    users: usersTable,
    cards: cardsTable,
    priceHistory: phTable,
    userLoginLogs: logsTable,
    bannedUsers: bansTable,
  } = await import("@/lib/db/schema");
  const { sql, desc, and, eq: eqFn } = await import("drizzle-orm");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const userStats = await db
    .select({ status: usersTable.status, count: sql<number>`count(*)` })
    .from(usersTable)
    .groupBy(usersTable.status)
    .all();

  const lockedCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(sql`locked_at IS NOT NULL`)
    .get();

  const cardStats = await db
    .select({ status: cardsTable.status, count: sql<number>`count(*)` })
    .from(cardsTable)
    .groupBy(cardsTable.status)
    .all();

  const byGenre = await db
    .select({ genre: cardsTable.sportGenre, count: sql<number>`count(*)` })
    .from(cardsTable)
    .where(eqFn(cardsTable.status, "owned"))
    .groupBy(cardsTable.sportGenre)
    .orderBy(desc(sql`count(*)`))
    .all();

  const priceHistoryCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(phTable)
    .get();

  const lastRefresh = await db
    .select({ fetchedAt: phTable.fetchedAt })
    .from(phTable)
    .orderBy(desc(phTable.fetchedAt))
    .limit(1)
    .get();

  const perUser = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      status: usersTable.status,
      createdAt: usersTable.createdAt,
      cardCount: sql<number>`count(${cardsTable.id})`,
    })
    .from(usersTable)
    .leftJoin(cardsTable, and(eqFn(cardsTable.userId, usersTable.id), eqFn(cardsTable.status, "owned")))
    .groupBy(usersTable.id)
    .orderBy(desc(sql`count(${cardsTable.id})`))
    .all();

  const cardsPerDay = await db
    .select({
      day: sql<string>`date(created_at / 1000, 'unixepoch')`,
      count: sql<number>`count(*)`,
    })
    .from(cardsTable)
    .where(sql`created_at >= ${thirtyDaysAgo.getTime()}`)
    .groupBy(sql`date(created_at / 1000, 'unixepoch')`)
    .orderBy(sql`date(created_at / 1000, 'unixepoch')`)
    .all();

  // ── Security data ────────────────────────────────────────────────────────

  // Login events per day (last 30 days)
  const logsPerDay = await db
    .select({
      day: sql<string>`date(login_at / 1000, 'unixepoch')`,
      count: sql<number>`count(*)`,
    })
    .from(logsTable)
    .where(sql`login_at >= ${thirtyDaysAgo.getTime()}`)
    .groupBy(sql`date(login_at / 1000, 'unixepoch')`)
    .orderBy(sql`date(login_at / 1000, 'unixepoch')`)
    .all();

  // Top source IPs by login volume (all time, capped at 25)
  const topIps = await db
    .select({
      ip: logsTable.ipAddress,
      total: sql<number>`count(*)`,
      uniqueUsers: sql<number>`count(distinct user_id)`,
    })
    .from(logsTable)
    .groupBy(logsTable.ipAddress)
    .orderBy(desc(sql`count(*)`))
    .limit(25)
    .all();

  // Recent bans (latest 15)
  const recentBans = await db
    .select({
      id: bansTable.id,
      email: bansTable.email,
      ipAddress: bansTable.ipAddress,
      reason: bansTable.reason,
      bannedAt: bansTable.bannedAt,
    })
    .from(bansTable)
    .orderBy(desc(bansTable.bannedAt))
    .limit(15)
    .all();

  // New user registrations per day (last 30 days)
  const registrationsPerDay = await db
    .select({
      day: sql<string>`date(created_at / 1000, 'unixepoch')`,
      count: sql<number>`count(*)`,
    })
    .from(usersTable)
    .where(sql`created_at >= ${thirtyDaysAgo.getTime()}`)
    .groupBy(sql`date(created_at / 1000, 'unixepoch')`)
    .orderBy(sql`date(created_at / 1000, 'unixepoch')`)
    .all();

  const totalUsers = userStats.reduce((s, r) => s + r.count, 0);

  return {
    users: {
      total: totalUsers,
      active: userStats.find((r) => r.status === "active")?.count ?? 0,
      pending: userStats.find((r) => r.status === "pending")?.count ?? 0,
      locked: lockedCount?.count ?? 0,
    },
    cards: {
      total: cardStats.reduce((s, r) => s + r.count, 0),
      owned: cardStats.find((r) => r.status === "owned")?.count ?? 0,
      wanted: cardStats.find((r) => r.status === "wanted")?.count ?? 0,
    },
    byGenre,
    priceHistory: {
      total: priceHistoryCount?.count ?? 0,
      lastRefresh: lastRefresh?.fetchedAt ?? null,
    },
    perUser,
    cardsPerDay,
    security: {
      logsPerDay,
      topIps,
      recentBans,
      registrationsPerDay,
    },
  };
}

