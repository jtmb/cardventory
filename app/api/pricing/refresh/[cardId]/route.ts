import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cards, priceHistory } from "@/lib/db/schema";
import { eq, isNotNull, desc } from "drizzle-orm";
import { fetchAllPrices } from "@/lib/scrapers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cardId } = await params;

  const card = await db
    .select()
    .from(cards)
    .where(eq(cards.id, cardId))
    .get();

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Snapshot prev max price before fetching new data
  const prevRows = await db
    .select({ price: priceHistory.price })
    .from(priceHistory)
    .where(and(eq(priceHistory.cardId, cardId), isNotNull(priceHistory.price)))
    .orderBy(desc(priceHistory.fetchedAt))
    .all();
  const prevMaxPrice = prevRows.length > 0
    ? Math.max(...prevRows.slice(0, 8).map((r) => r.price!))
    : null;

  const results = await fetchAllPrices({
    name: card.name,
    setName: card.setName,
    year: card.year,
    cardNumber: card.cardNumber,
    variant: card.variant,
    gradeCompany: card.gradeCompany,
    gradeValue: card.gradeValue,
    sportGenre: card.sportGenre,
  });

  // Store results in price_history — only persist rows with an actual price
  const now = new Date();
  const inserts = results.filter((r) => r.price !== null).map((r) => ({
    cardId: card.id,
    source: r.source,
    price: r.price,
    url: r.url,
    imageUrl: r.imageUrl,
    fetchedAt: now,
  }));

  if (inserts.length > 0) {
    await db.insert(priceHistory).values(inserts);
  }

  // If card has no photo and we got one, auto-set it
  if (!card.photoUrl) {
    const firstImage = results.find((r) => r.imageUrl)?.imageUrl;
    if (firstImage) {
      await db
        .update(cards)
        .set({ photoUrl: firstImage, updatedAt: now })
        .where(eq(cards.id, card.id));
    }
  }

  // Compute new max price and diff
  const newPrices = results.filter((r) => r.price !== null).map((r) => r.price!);
  const newMaxPrice = newPrices.length > 0 ? Math.max(...newPrices) : null;
  const diff = prevMaxPrice !== null && newMaxPrice !== null
    ? {
        prevPrice: prevMaxPrice,
        newPrice: newMaxPrice,
        changeAmount: newMaxPrice - prevMaxPrice,
        changePercent: prevMaxPrice > 0 ? ((newMaxPrice - prevMaxPrice) / prevMaxPrice) * 100 : null,
      }
    : null;

  return NextResponse.json({ success: true, results, diff });
}
