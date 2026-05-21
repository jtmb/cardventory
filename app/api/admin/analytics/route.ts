import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, cards, priceHistory } from "@/lib/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin
  const me = await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)).get();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Total users by status
  const userStats = await db
    .select({
      status: users.status,
      count: sql<number>`count(*)`,
    })
    .from(users)
    .groupBy(users.status)
    .all();

  const lockedCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(sql`locked_at IS NOT NULL`)
    .get();

  // Total cards by status across all users
  const cardStats = await db
    .select({
      status: cards.status,
      count: sql<number>`count(*)`,
    })
    .from(cards)
    .groupBy(cards.status)
    .all();

  // Cards by genre across all users
  const genreStats = await db
    .select({
      genre: cards.sportGenre,
      count: sql<number>`count(*)`,
    })
    .from(cards)
    .where(eq(cards.status, "owned"))
    .groupBy(cards.sportGenre)
    .orderBy(desc(sql`count(*)`))
    .all();

  // Price history stats
  const priceHistoryCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(priceHistory)
    .get();

  const lastRefresh = await db
    .select({ fetchedAt: priceHistory.fetchedAt })
    .from(priceHistory)
    .orderBy(desc(priceHistory.fetchedAt))
    .limit(1)
    .get();

  // Per-user card counts
  const perUser = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      cardCount: sql<number>`count(${cards.id})`,
    })
    .from(users)
    .leftJoin(cards, and(eq(cards.userId, users.id), eq(cards.status, "owned")))
    .groupBy(users.id)
    .orderBy(desc(sql`count(${cards.id})`))
    .all();

  // Cards added per day (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const cardsPerDay = await db
    .select({
      day: sql<string>`date(created_at / 1000, 'unixepoch')`,
      count: sql<number>`count(*)`,
    })
    .from(cards)
    .where(sql`created_at >= ${thirtyDaysAgo.getTime()}`)
    .groupBy(sql`date(created_at / 1000, 'unixepoch')`)
    .orderBy(sql`date(created_at / 1000, 'unixepoch')`)
    .all();

  const totalUsers = userStats.reduce((s, r) => s + r.count, 0);
  const activeUsers = userStats.find((r) => r.status === "active")?.count ?? 0;
  const pendingUsers = userStats.find((r) => r.status === "pending")?.count ?? 0;
  const totalCards = cardStats.reduce((s, r) => s + r.count, 0);
  const ownedCards = cardStats.find((r) => r.status === "owned")?.count ?? 0;

  return NextResponse.json({
    users: {
      total: totalUsers,
      active: activeUsers,
      pending: pendingUsers,
      locked: lockedCount?.count ?? 0,
    },
    cards: {
      total: totalCards,
      owned: ownedCards,
      wanted: cardStats.find((r) => r.status === "wanted")?.count ?? 0,
    },
    byGenre: genreStats,
    priceHistory: {
      total: priceHistoryCount?.count ?? 0,
      lastRefresh: lastRefresh?.fetchedAt ?? null,
    },
    perUser,
    cardsPerDay,
  });
}
