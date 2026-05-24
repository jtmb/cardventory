import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cards, priceHistory } from "@/lib/db/schema";
import { eq, gte, desc, isNotNull, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const card = await db
    .select()
    .from(cards)
    .where(eq(cards.id, id))
    .get();

  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const history = await db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.cardId, id))
    .orderBy(desc(priceHistory.fetchedAt))
    .all();

  // Use a separate pre-filtered query for per-source latest prices
  // (same approach as getLatestPrices server action which is known to work)
  const nonNullRows = await db
    .select()
    .from(priceHistory)
    .where(and(eq(priceHistory.cardId, id), isNotNull(priceHistory.price)))
    .orderBy(desc(priceHistory.fetchedAt))
    .all();

  const latestBySource = new Map<string, (typeof nonNullRows)[0]>();
  for (const row of nonNullRows) {
    if (!latestBySource.has(row.source)) latestBySource.set(row.source, row);
  }
  const latest = Array.from(latestBySource.values());
  const prices = latest.map((p) => p.price).filter((p): p is number => p !== null);
  const highest = prices.length > 0 ? Math.max(...prices) : null;

  // 7-day and 30-day changes using earliest vs latest
  function percentChange(days: number): number | null {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const inPeriod = history.filter((h) => {
      const d = h.fetchedAt instanceof Date ? h.fetchedAt : new Date(h.fetchedAt as unknown as number * 1000);
      return d >= cutoff && h.price !== null;
    });
    if (inPeriod.length < 2) return null;
    const oldest = inPeriod[inPeriod.length - 1].price!;
    const newest = inPeriod[0].price!;
    return oldest > 0 ? ((newest - oldest) / oldest) * 100 : null;
  }

  return NextResponse.json({
    highest,
    change7d: percentChange(7),
    change30d: percentChange(30),
    latest,
    sparkline: buildSparkline(history),
    history,
  });
}

function buildSparkline(history: { price: number | null; fetchedAt: Date | unknown }[]): number[] {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dayMax = new Map<string, number>();
  for (const row of history) {
    if (row.price === null) continue;
    const d = row.fetchedAt instanceof Date ? row.fetchedAt : new Date((row.fetchedAt as number) * 1000);
    if (d < thirtyDaysAgo) continue;
    const key = d.toISOString().slice(0, 10);
    dayMax.set(key, Math.max(dayMax.get(key) ?? 0, row.price as number));
  }
  return Array.from(dayMax.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}
