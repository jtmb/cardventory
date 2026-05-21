"use server";

import { auth } from "@/auth";
import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { cards, priceHistory, settings } from "@/lib/db/schema";
import { eq, and, desc, sql, isNotNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { NewCard } from "@/lib/db/schema";
const DDG_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchFirstCardImage(query: string): Promise<string | null> {
  try {
    const homeRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      { headers: { "User-Agent": DDG_UA, "Accept-Language": "en-US,en;q=0.9" }, signal: AbortSignal.timeout(8000) }
    );
    if (!homeRes.ok) return null;
    const html = await homeRes.text();
    const vqd = html.match(/vqd=["']?([\d-]+)["']?/)?.[1];
    if (!vqd) return null;
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&p=1&l=us-en&o=json`,
      { headers: { "User-Agent": DDG_UA, "Accept": "application/json", "Referer": "https://duckduckgo.com/" }, signal: AbortSignal.timeout(8000) }
    );
    if (!imgRes.ok) return null;
    const data = (await imgRes.json()) as { results?: Array<{ image: string }> };
    const url = data.results?.find((r) => r.image && !r.image.endsWith(".gif"))?.image ?? null;
    return url;
  } catch {
    return null;
  }
}

function requireAuth(session: Session | null) {
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ─── Cards ─────────────────────────────────────────────────────────────────

export async function getCards(genre?: string) {
  const session = await auth();
  const userId = requireAuth(session);

  const query = db
    .select()
    .from(cards)
    .where(
      genre && genre !== "all"
        ? and(eq(cards.userId, userId), eq(cards.sportGenre, genre))
        : eq(cards.userId, userId)
    )
    .orderBy(desc(cards.createdAt));

  return query.all();
}

export async function getCard(id: string) {
  const session = await auth();
  const userId = requireAuth(session);

  return db
    .select()
    .from(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
    .get();
}

export async function createCard(data: Omit<NewCard, "id" | "userId" | "createdAt" | "updatedAt">) {
  const session = await auth();
  const userId = requireAuth(session);

  const [card] = await db
    .insert(cards)
    .values({ ...data, userId })
    .returning();

  revalidatePath("/cards");
  return card;
}

export async function updateCard(
  id: string,
  data: Partial<Omit<NewCard, "id" | "userId" | "createdAt">>
) {
  const session = await auth();
  const userId = requireAuth(session);

  const [card] = await db
    .update(cards)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
    .returning();

  revalidatePath("/cards");
  revalidatePath(`/cards/${id}`);
  return card;
}

export async function deleteCard(id: string) {
  const session = await auth();
  const userId = requireAuth(session);

  await db
    .delete(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)));

  revalidatePath("/cards");
}

export async function deleteCards(ids: string[]) {
  if (!ids.length) return;
  const session = await auth();
  const userId = requireAuth(session);

  await db
    .delete(cards)
    .where(and(inArray(cards.id, ids), eq(cards.userId, userId)));

  revalidatePath("/cards");
}

// ─── Price History ──────────────────────────────────────────────────────────

export async function getCardPriceHistory(cardId: string) {
  const session = await auth();
  const userId = requireAuth(session);

  // Verify card belongs to user
  const card = await getCard(cardId);
  if (!card) throw new Error("Card not found");

  return db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.cardId, cardId))
    .orderBy(desc(priceHistory.fetchedAt))
    .all();
}

export async function getLatestPrices(cardId: string) {
  const session = await auth();
  requireAuth(session);

  // Get most recent non-null price per source
  const rows = await db
    .select()
    .from(priceHistory)
    .where(and(eq(priceHistory.cardId, cardId), isNotNull(priceHistory.price)))
    .orderBy(desc(priceHistory.fetchedAt))
    .all();

  const latestBySource = new Map<string, typeof rows[0]>();
  for (const row of rows) {
    if (!latestBySource.has(row.source)) {
      latestBySource.set(row.source, row);
    }
  }

  return Array.from(latestBySource.values());
}

// ─── Dashboard Stats ────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const session = await auth();
  const userId = requireAuth(session);

  const allCards = await db
    .select()
    .from(cards)
    .where(eq(cards.userId, userId))
    .all();

  const totalPurchaseValue = allCards.reduce((sum, c) => sum + (c.purchasePrice ?? 0), 0);

  // Get latest prices for all cards
  const cardIds = allCards.map((c) => c.id);

  let totalCurrentValue = 0;
  const cardCurrentValues: Record<string, number | null> = {};

  if (cardIds.length > 0) {
    for (const cardId of cardIds) {
      const latest = await getLatestPrices(cardId);
      const prices = latest.map((p) => p.price).filter((p): p is number => p !== null);
      const highest = prices.length > 0 ? Math.max(...prices) : null;
      cardCurrentValues[cardId] = highest;
      if (highest !== null) totalCurrentValue += highest;
    }
  }

  // By genre
  const genreMap = new Map<string, { count: number; purchaseValue: number; currentValue: number }>();
  for (const card of allCards) {
    const genre = card.sportGenre;
    const existing = genreMap.get(genre) ?? { count: 0, purchaseValue: 0, currentValue: 0 };
    const cv = cardCurrentValues[card.id] ?? 0;
    genreMap.set(genre, {
      count: existing.count + 1,
      purchaseValue: existing.purchaseValue + (card.purchasePrice ?? 0),
      currentValue: existing.currentValue + cv,
    });
  }

  return {
    totalCards: allCards.length,
    totalPurchaseValue,
    totalCurrentValue,
    gain: totalCurrentValue - totalPurchaseValue,
    gainPercent: totalPurchaseValue > 0
      ? ((totalCurrentValue - totalPurchaseValue) / totalPurchaseValue) * 100
      : 0,
    byGenre: Array.from(genreMap.entries()).map(([genre, stats]) => ({
      genre,
      ...stats,
    })),
    recentCards: allCards.slice(0, 8),
  };
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const session = await auth();
  const userId = requireAuth(session);

  const row = await db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, key)))
    .get();

  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const session = await auth();
  const userId = requireAuth(session);

  const existing = await db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, key)))
    .get();

  if (existing) {
    await db
      .update(settings)
      .set({ value })
      .where(and(eq(settings.userId, userId), eq(settings.key, key)));
  } else {
    await db.insert(settings).values({ userId, key, value });
  }
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const session = await auth();
  const userId = requireAuth(session);

  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .all();

  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ─── Seed Test Data ──────────────────────────────────────────────────────────

export async function seedTestData() {
  const session = await auth();
  const userId = requireAuth(session);

  const testCards: Omit<NewCard, "id" | "userId" | "createdAt" | "updatedAt">[] = [
    {
      name: "LeBron James",
      setName: "Topps Chrome",
      year: 2003,
      sportGenre: "basketball",
      cardNumber: "111",
      variant: "Refractor",
      gradeCompany: "PSA",
      gradeValue: "9",
      condition: null,
      purchasePrice: 400,
      notes: "Rookie card refractor",
      photoUrl: null,
    },
    {
      name: "Patrick Mahomes",
      setName: "Panini Prizm",
      year: 2017,
      sportGenre: "football",
      cardNumber: "269",
      variant: "Silver Prizm",
      gradeCompany: null,
      gradeValue: null,
      condition: "near_mint",
      purchasePrice: 300,
      notes: null,
      photoUrl: null,
    },
    {
      name: "Mike Trout",
      setName: "Topps Update",
      year: 2011,
      sportGenre: "baseball",
      cardNumber: "US175",
      variant: null,
      gradeCompany: "BGS",
      gradeValue: "9.5",
      condition: null,
      purchasePrice: 280,
      notes: "Rookie card",
      photoUrl: null,
    },
    {
      name: "Luka Dončić",
      setName: "Panini Prizm",
      year: 2018,
      sportGenre: "basketball",
      cardNumber: "280",
      variant: "Silver Prizm",
      gradeCompany: "PSA",
      gradeValue: "10",
      condition: null,
      purchasePrice: 500,
      notes: null,
      photoUrl: null,
    },
    {
      name: "Connor McDavid",
      setName: "Upper Deck Young Guns",
      year: 2015,
      sportGenre: "hockey",
      cardNumber: "201",
      variant: null,
      gradeCompany: "PSA",
      gradeValue: "10",
      condition: null,
      purchasePrice: 600,
      notes: "Rookie card",
      photoUrl: null,
    },
    {
      name: "Shohei Ohtani",
      setName: "Topps Chrome",
      year: 2018,
      sportGenre: "baseball",
      cardNumber: "150",
      variant: "Refractor",
      gradeCompany: "PSA",
      gradeValue: "10",
      condition: null,
      purchasePrice: 200,
      notes: "Angels rookie",
      photoUrl: null,
    },
    {
      name: "Bulbasaur",
      setName: "Mega Evolution: Black Star Promo",
      year: 2026,
      sportGenre: "pokemon",
      cardNumber: "037",
      variant: "Holo First Partner Collection",
      gradeCompany: null,
      gradeValue: null,
      condition: "near_mint",
      purchasePrice: 30,
      notes: null,
      photoUrl: "https://images.production.sportscardinvestor.com/images/m_card/11723754?ts=1777492353070",
    },
    {
      name: "Roman Anthony",
      setName: "Topps",
      year: 2026,
      sportGenre: "baseball",
      cardNumber: "189",
      variant: null,
      gradeCompany: null,
      gradeValue: null,
      condition: "near_mint",
      purchasePrice: 2,
      notes: "Rookie Card",
      photoUrl: "https://storage.googleapis.com/images.pricecharting.com/dj2q7bbl72tmpjec/1600.jpg",
    },
  ];

  const inserted = await db
    .insert(cards)
    .values(testCards.map((c) => ({ ...c, userId })))
    .returning();

  // Seed eBay prices for sports cards only — these are representative values
  // based on recent sold listings. Other sources (SportsCardInvestor, CardLadder,
  // SportscardsPro) are not seeded because those sites do not expose data without
  // authentication or from non-residential IPs. Their prices will populate once a
  // live refresh runs.
  const ebayPrices: (number | null)[] = [650, 420, 315, 850, 920, 310, null, null];
  // SCI prices: seeded for Bulbasaur (Pokémon — no eBay sold data; SCI is the
  // primary source). Price is the Last Sale from SportsCardInvestor.
  const sciPrices: (number | null)[] = [null, null, null, null, null, null, 46.25, null];
  const sciUrls: (string | null)[] = [
    null, null, null, null, null, null,
    "https://www.sportscardinvestor.com/cards/bulbasaur-pokemon/2026-mega-evolution-black-star-promo-holo-first-partner-collection-037",
    null,
  ];
  // SCP prices: seeded for Roman Anthony (ungraded market value from SportsCardsPro).
  const scpPrices: (number | null)[] = [null, null, null, null, null, null, null, 1.75];
  const scpUrls: (string | null)[] = [
    null, null, null, null, null, null, null,
    "https://www.sportscardspro.com/game/baseball-cards-2026-topps/roman-anthony-189",
  ];

  const now = new Date();
  for (let i = 0; i < inserted.length; i++) {
    const card = inserted[i];
    const q = [card.name, card.year, card.setName, card.cardNumber].filter(Boolean).join(" ");

    if (ebayPrices[i] !== null) {
      await db.insert(priceHistory).values({
        cardId: card.id,
        source: "ebay",
        price: ebayPrices[i],
        currency: "USD",
        url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Sold=1&_sop=13`,
        fetchedAt: now,
      });
    }

    if (sciPrices[i] !== null) {
      await db.insert(priceHistory).values({
        cardId: card.id,
        source: "sportscardinvestor",
        price: sciPrices[i],
        currency: "USD",
        url: sciUrls[i],
        fetchedAt: now,
      });
    }

    if (scpPrices[i] !== null) {
      await db.insert(priceHistory).values({
        cardId: card.id,
        source: "sportscardspro",
        price: scpPrices[i],
        currency: "USD",
        url: scpUrls[i],
        fetchedAt: now,
      });
    }
  }

  // Fetch card images via DuckDuckGo image search (skip cards that already have a photo)
  for (const card of inserted) {
    if (card.photoUrl) continue;
    const parts = [card.name, card.year?.toString(), card.setName, card.cardNumber, card.variant, card.gradeCompany, card.gradeValue].filter(Boolean);
    const query = `${parts.join(" ")} trading card`;
    const imageUrl = await fetchFirstCardImage(query);
    if (imageUrl) {
      await db.update(cards).set({ photoUrl: imageUrl }).where(eq(cards.id, card.id));
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/cards");
  return { count: inserted.length };
}

