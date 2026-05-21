import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cards, priceHistory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchAllPrices } from "@/lib/scrapers";

// Bulk refresh all cards for the current user
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allCards = await db
    .select()
    .from(cards)
    .where(eq(cards.userId, session.user.id))
    .all();

  let refreshed = 0;

  for (const card of allCards) {
    try {
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

      if (!card.photoUrl) {
        const firstImage = results.find((r) => r.imageUrl)?.imageUrl;
        if (firstImage) {
          await db
            .update(cards)
            .set({ photoUrl: firstImage, updatedAt: now })
            .where(eq(cards.id, card.id));
        }
      }

      refreshed++;
    } catch {
      // Continue on individual card failure
    }
  }

  return NextResponse.json({ success: true, refreshed, total: allCards.length });
}
