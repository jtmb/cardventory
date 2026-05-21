import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cards, priceHistory } from "@/lib/db/schema";
import { eq, and, like, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json([]);

  const maxPriceSql = sql<number>`(SELECT MAX(ph.price) FROM price_history ph WHERE ph.card_id = ${cards.id})`;

  const results = await db
    .select({
      id: cards.id,
      name: cards.name,
      setName: cards.setName,
      year: cards.year,
      sportGenre: cards.sportGenre,
      gradeCompany: cards.gradeCompany,
      gradeValue: cards.gradeValue,
      photoUrl: cards.photoUrl,
      maxPrice: maxPriceSql,
    })
    .from(cards)
    .where(and(eq(cards.userId, session.user.id), like(cards.name, `%${q}%`)))
    .orderBy(desc(cards.createdAt))
    .limit(6)
    .all();

  return NextResponse.json(results);
}
