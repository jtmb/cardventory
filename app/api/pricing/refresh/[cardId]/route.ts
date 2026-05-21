import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cards, priceHistory } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
    .where(and(eq(cards.id, cardId), eq(cards.userId, session.user.id)))
    .get();

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

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

  return NextResponse.json({ success: true, results });
}
