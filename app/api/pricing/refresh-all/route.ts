import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cards, priceHistory, settings } from "@/lib/db/schema";
import { eq, and, isNotNull, desc } from "drizzle-orm";
import { fetchAllPrices } from "@/lib/scrapers";

const REFRESH_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// Bulk refresh all cards for the current user
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const isAdmin = session.user.role === "admin";

  // Rate-limit non-admin users to one manual refresh per 24 hours
  if (!isAdmin) {
    const lastRow = await db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, userId), eq(settings.key, "manual_refresh_last")))
      .get();

    if (lastRow) {
      const lastMs = new Date(lastRow.value).getTime();
      const nextAllowedMs = lastMs + REFRESH_COOLDOWN_MS;
      if (Date.now() < nextAllowedMs) {
        return NextResponse.json(
          { error: "Rate limited", nextAllowedAt: new Date(nextAllowedMs).toISOString() },
          { status: 429 }
        );
      }
    }
  }

  const allCards = await db
    .select()
    .from(cards)
    .where(eq(cards.userId, session.user.id))
    .all();

  // Snapshot prev max prices per card
  const prevPriceMap = new Map<string, number>();
  for (const card of allCards) {
    const rows = await db
      .select({ price: priceHistory.price })
      .from(priceHistory)
      .where(and(eq(priceHistory.cardId, card.id), isNotNull(priceHistory.price)))
      .orderBy(desc(priceHistory.fetchedAt))
      .all();
    const recentRows = rows.slice(0, 8);
    if (recentRows.length > 0) {
      prevPriceMap.set(card.id, Math.max(...recentRows.map((r) => r.price!)));
    }
  }

  let refreshed = 0;
  let up = 0;
  let down = 0;
  let unchanged = 0;

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

      // Track price diff
      const newPrices = results.filter((r) => r.price !== null).map((r) => r.price!);
      if (newPrices.length > 0) {
        const newMax = Math.max(...newPrices);
        const prevMax = prevPriceMap.get(card.id);
        if (prevMax !== undefined) {
          if (newMax > prevMax) up++;
          else if (newMax < prevMax) down++;
          else unchanged++;
        }
      }

      refreshed++;
    } catch {
      // Continue on individual card failure
    }
  }

  // Record timestamp for non-admin rate limiting
  if (!isAdmin) {
    const nowIso = new Date().toISOString();
    const existing = await db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, userId), eq(settings.key, "manual_refresh_last")))
      .get();
    if (existing) {
      await db.update(settings).set({ value: nowIso })
        .where(and(eq(settings.userId, userId), eq(settings.key, "manual_refresh_last")));
    } else {
      await db.insert(settings).values({ userId, key: "manual_refresh_last", value: nowIso });
    }
  }

  return NextResponse.json({ success: true, refreshed, total: allCards.length, changes: { up, down, unchanged } });
}
