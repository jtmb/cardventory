import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cards, priceHistory } from "@/lib/db/schema";
import { inArray, desc, eq, and } from "drizzle-orm";

export type BatchPriceEntry = {
  highest: number | null;
  change7d: number | null;
  sparkline: number[];
};

const MAX_IDS = 200;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids");
  if (!idsParam) return NextResponse.json({});

  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);
  if (ids.length === 0) return NextResponse.json({});

  // Security: only return prices for cards owned by this user
  const ownedCards = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(inArray(cards.id, ids), eq(cards.userId, session.user.id)))
    .all();

  const ownedIds = ownedCards.map((c) => c.id);
  if (ownedIds.length === 0) return NextResponse.json({});

  // Single DB query for all price history across all requested cards
  const allHistory = await db
    .select()
    .from(priceHistory)
    .where(inArray(priceHistory.cardId, ownedIds))
    .orderBy(desc(priceHistory.fetchedAt))
    .all();

  // Group rows by card ID
  const historyByCard = new Map<string, typeof allHistory>();
  for (const row of allHistory) {
    if (!historyByCard.has(row.cardId)) historyByCard.set(row.cardId, []);
    historyByCard.get(row.cardId)!.push(row);
  }

  const now = Date.now();
  const cutoff7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const cutoff30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const result: Record<string, BatchPriceEntry> = {};

  for (const id of ownedIds) {
    const history = historyByCard.get(id) ?? [];

    // Latest non-null price per source
    const latestBySource = new Map<string, number>();
    for (const row of history) {
      if (row.price !== null && !latestBySource.has(row.source)) {
        latestBySource.set(row.source, row.price);
      }
    }
    const latestPrices = Array.from(latestBySource.values());
    const highest = latestPrices.length > 0 ? Math.max(...latestPrices) : null;

    // 7-day percent change (newest vs oldest in period)
    const inPeriod7d = history.filter((h) => {
      if (h.price === null) return false;
      const d =
        h.fetchedAt instanceof Date
          ? h.fetchedAt
          : new Date((h.fetchedAt as number) * 1000);
      return d >= cutoff7d;
    });
    let change7d: number | null = null;
    if (inPeriod7d.length >= 2) {
      const oldest = inPeriod7d[inPeriod7d.length - 1].price!;
      const newest = inPeriod7d[0].price!;
      change7d = oldest > 0 ? ((newest - oldest) / oldest) * 100 : null;
    }

    // 30-day daily-max sparkline
    const dayMax = new Map<string, number>();
    for (const row of history) {
      if (row.price === null) continue;
      const d =
        row.fetchedAt instanceof Date
          ? row.fetchedAt
          : new Date((row.fetchedAt as number) * 1000);
      if (d < cutoff30d) continue;
      const key = d.toISOString().slice(0, 10);
      dayMax.set(key, Math.max(dayMax.get(key) ?? 0, row.price as number));
    }
    const sparkline = Array.from(dayMax.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    result[id] = { highest, change7d, sparkline };
  }

  return NextResponse.json(result);
}
