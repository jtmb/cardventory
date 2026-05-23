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
    // Total portfolio cost (sum of all purchase_price for owned cards)
    const totalRow = rawSqlite.prepare(`
      SELECT
        COALESCE(SUM(purchase_price), 0) AS totalValue,
        COUNT(DISTINCT user_id)          AS usersWithCards,
        COUNT(*)                         AS totalCards,
        COALESCE(AVG(purchase_price), 0) AS avgCardValue
      FROM cards
      WHERE status = 'owned'
    `).get() as { totalValue: number; usersWithCards: number; totalCards: number; avgCardValue: number };

    // Avg cards per active user (users with at least 1 card)
    const avgCardsRow = rawSqlite.prepare(`
      SELECT AVG(cnt) AS avgCards
      FROM (SELECT COUNT(*) AS cnt FROM cards WHERE status = 'owned' GROUP BY user_id)
    `).get() as { avgCards: number | null };

    // Avg portfolio value per user (sum of purchase_price per user, then averaged)
    const avgPortfolioRow = rawSqlite.prepare(`
      SELECT AVG(portfolio) AS avgPortfolio
      FROM (SELECT SUM(purchase_price) AS portfolio FROM cards WHERE status = 'owned' GROUP BY user_id)
    `).get() as { avgPortfolio: number | null };

    return NextResponse.json({
      totalValue:    Math.round((totalRow.totalValue    ?? 0) * 100) / 100,
      usersWithCards: totalRow.usersWithCards ?? 0,
      totalCards:    totalRow.totalCards      ?? 0,
      avgCardValue:  Math.round((totalRow.avgCardValue  ?? 0) * 100) / 100,
      avgCards:      Math.round((avgCardsRow.avgCards   ?? 0) * 10)  / 10,
      avgPortfolio:  Math.round((avgPortfolioRow.avgPortfolio ?? 0) * 100) / 100,
    });
  } catch (err) {
    console.error("[portfolio-stats] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
