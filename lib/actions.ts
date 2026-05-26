"use server";

import { auth } from "@/auth";
import type { Session } from "next-auth";
import { db, rawSqlite } from "@/lib/db";
import { cards, priceHistory, settings } from "@/lib/db/schema";
import { eq, and, desc, asc, sql, isNotNull, inArray, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fetchAllPrices } from "./scrapers";
import type { NewCard, Card } from "@/lib/db/schema";
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

export async function getCards(
  genre?: string,
  search?: string,
  sort?: string,
  page?: number,
  pageSize?: number,
  gradeFilter?: string,
  status = "owned"
) {
  const session = await auth();
  const userId = requireAuth(session);

  const conditions = [eq(cards.userId, userId), eq(cards.status, status)] as ReturnType<typeof eq>[];
  if (genre && genre !== "all") conditions.push(eq(cards.sportGenre, genre));
  if (search) conditions.push(like(cards.name, `%${search}%`));
  if (gradeFilter && gradeFilter !== "all") {
    if (gradeFilter === "raw") {
      conditions.push(sql`(${cards.gradeCompany} IS NULL OR ${cards.gradeCompany} = '')` as unknown as ReturnType<typeof eq>);
    } else {
      conditions.push(eq(cards.gradeCompany, gradeFilter));
    }
  }

  // Correlated subquery: latest maximum price from price_history for each card.
  // In SQLite, NULLs sort last when using DESC (NULL < any value), so cards with
  // no price data naturally fall to the bottom for value/gain sorts.
  const maxPriceSql = sql`(SELECT MAX(ph.price) FROM price_history ph WHERE ph.card_id = ${cards.id})`;
  const gainSql = sql`((SELECT MAX(ph.price) FROM price_history ph WHERE ph.card_id = ${cards.id}) - ${cards.purchasePrice})`;

  const orderClause =
    sort === "oldest"     ? asc(cards.createdAt) :
    sort === "value_high" ? desc(maxPriceSql) :
    sort === "value_low"  ? asc(maxPriceSql) :
    sort === "paid_high"  ? desc(cards.purchasePrice) :
    sort === "paid_low"   ? asc(cards.purchasePrice) :
    sort === "gain_high"  ? desc(gainSql) :
    sort === "gain_low"   ? asc(gainSql) :
    desc(cards.createdAt); // default: newest

  const query = db
    .select()
    .from(cards)
    .where(and(...conditions))
    .orderBy(orderClause);

  if (page !== undefined && pageSize !== undefined) {
    const offset = (page - 1) * pageSize;
    return query.limit(pageSize).offset(offset).all();
  }

  return query.all();
}

export async function countCards(
  genre?: string,
  search?: string,
  gradeFilter?: string,
  status = "owned"
) {
  const session = await auth();
  const userId = requireAuth(session);

  const conditions = [eq(cards.userId, userId), eq(cards.status, status)] as ReturnType<typeof eq>[];
  if (genre && genre !== "all") conditions.push(eq(cards.sportGenre, genre));
  if (search) conditions.push(like(cards.name, `%${search}%`));
  if (gradeFilter && gradeFilter !== "all") {
    if (gradeFilter === "raw") {
      conditions.push(sql`(${cards.gradeCompany} IS NULL OR ${cards.gradeCompany} = '')` as unknown as ReturnType<typeof eq>);
    } else {
      conditions.push(eq(cards.gradeCompany, gradeFilter));
    }
  }

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(cards)
    .where(and(...conditions))
    .get();

  return result?.count ?? 0;
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

export async function getCardNeighbors(id: string, status = "owned") {
  const session = await auth();
  const userId = requireAuth(session);

  const rows = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(eq(cards.userId, userId), eq(cards.status, status)))
    .orderBy(desc(cards.createdAt))
    .all();

  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return { prevId: null as string | null, nextId: null as string | null };
  return {
    prevId: idx > 0 ? rows[idx - 1].id : null as string | null,
    nextId: idx < rows.length - 1 ? rows[idx + 1].id : null as string | null,
  };
}

export async function getActiveGenres(): Promise<string[]> {
  const session = await auth();
  const userId = requireAuth(session);

  const rows = await db
    .selectDistinct({ genre: cards.sportGenre })
    .from(cards)
    .where(eq(cards.userId, userId))
    .orderBy(asc(cards.sportGenre))
    .all();

  return rows.map((r) => r.genre);
}

export async function createCard(data: Omit<NewCard, "id" | "userId" | "createdAt" | "updatedAt">) {
  const session = await auth();
  const userId = requireAuth(session);

  const [card] = await db
    .insert(cards)
    .values({ ...data, userId })
    .returning();

  // Trigger an immediate price lookup for newly-created owned cards.
  // Run synchronously here so the UI shows prices right away after create.
  try {
    if (data.status === "owned") {
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
    }
  } catch (err) {
    // Don't block card creation on flaky scrapers, but surface the error in logs
    console.error("[createCard] Price fetch failed for card", card.id, err);
  }

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
  requireAuth(session);

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

// Look up latest prices by card metadata rather than a specific card ID.
// Searches across ALL cards with matching attributes so trade board panels
// can show prices even when the viewed card hasn't been scraped recently.
export async function getLatestPricesByMeta(
  name: string,
  setName: string | null,
  year: number | null,
  cardNumber: string | null,
  variant: string | null,
  gradeCompany: string | null,
  gradeValue: string | null,
) {
  const session = await auth();
  requireAuth(session);

  // Use SQLite's NULL-safe IS operator to match cards with identical physical attributes.
  // Drizzle's eq() doesn't handle NULL-safe comparison; IS handles both NULL=NULL and value=value.
  const matchingCards = rawSqlite.prepare(`
    SELECT id FROM cards
    WHERE name IS ?
      AND set_name IS ?
      AND year IS ?
      AND card_number IS ?
      AND variant IS ?
      AND grade_company IS ?
      AND grade_value IS ?
  `).all(name, setName, year, cardNumber, variant, gradeCompany, gradeValue) as { id: string }[];

  if (matchingCards.length === 0) return [];

  const cardIds = matchingCards.map((c) => c.id);
  const rows = await db
    .select()
    .from(priceHistory)
    .where(and(inArray(priceHistory.cardId, cardIds), isNotNull(priceHistory.price)))
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
    .where(and(eq(cards.userId, userId), eq(cards.status, "owned")))
    .all();

  const totalPurchaseValue = allCards.reduce((sum, c) => sum + (c.purchasePrice ?? 0), 0);

  const cardCurrentValues: Record<string, number> = {};
  let totalCurrentValue = 0;

  if (allCards.length > 0) {
    const cardIds = allCards.map((c) => c.id);
    const placeholders = cardIds.map(() => "?").join(",");

    // Single query replaces the N+1 per-card loop:
    // For each card, find the most-recent price per source, then take the max across sources.
    const rows = rawSqlite.prepare(`
      SELECT ph.card_id, MAX(ph.price) AS highest_price
      FROM price_history ph
      INNER JOIN (
        SELECT card_id, source, MAX(fetched_at) AS max_fetched
        FROM price_history
        WHERE card_id IN (${placeholders}) AND price IS NOT NULL
        GROUP BY card_id, source
      ) latest
        ON ph.card_id = latest.card_id
       AND ph.source  = latest.source
       AND ph.fetched_at = latest.max_fetched
      GROUP BY ph.card_id
    `).all(...cardIds) as Array<{ card_id: string; highest_price: number }>;

    for (const row of rows) {
      cardCurrentValues[row.card_id] = row.highest_price;
      totalCurrentValue += row.highest_price;
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
    recentCards: allCards.slice(0, 20),
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
    // ── All-3-source cards (eBay + SCI + SCP) ─────────────────────────────────
    {
      name: "Kobe Bryant",
      setName: "Topps Chrome",
      year: 2003,
      sportGenre: "basketball",
      cardNumber: "113",
      variant: null,
      gradeCompany: null,
      gradeValue: null,
      condition: "near_mint",
      purchasePrice: 25,
      notes: null,
      photoUrl: null,
    },
    {
      name: "Tom Brady",
      setName: "Panini Prizm",
      year: 2020,
      sportGenre: "football",
      cardNumber: "101",
      variant: null,
      gradeCompany: null,
      gradeValue: null,
      condition: "near_mint",
      purchasePrice: 10,
      notes: null,
      photoUrl: null,
    },
    {
      name: "Fernando Tatis Jr",
      setName: "Topps Chrome",
      year: 2020,
      sportGenre: "baseball",
      cardNumber: "16",
      variant: null,
      gradeCompany: null,
      gradeValue: null,
      condition: "near_mint",
      purchasePrice: 15,
      notes: null,
      photoUrl: null,
    },
    {
      name: "Caitlin Clark",
      setName: "Panini Prizm",
      year: 2024,
      sportGenre: "basketball",
      cardNumber: "1",
      variant: null,
      gradeCompany: null,
      gradeValue: null,
      condition: "near_mint",
      purchasePrice: 65,
      notes: "Rookie Card",
      photoUrl: null,
    },
  ];

  const inserted = await db
    .insert(cards)
    .values(testCards.map((c) => ({ ...c, userId })))
    .returning();

  // Seed eBay prices for sports cards only — these are representative values
  // based on recent sold listings.
  const ebayPrices: (number | null)[] = [650, 420, 315, 850, 920, 310, null, null, 38, 16, 25, 90];
  // SCI prices: seeded for Bulbasaur + the 4 all-source cards.
  const sciPrices: (number | null)[] = [null, null, null, null, null, null, 46.25, null, 32, 12, 20, 75];
  const sciUrls: (string | null)[] = [
    null, null, null, null, null, null,
    "https://www.sportscardinvestor.com/cards/bulbasaur-pokemon/2026-mega-evolution-black-star-promo-holo-first-partner-collection-037",
    null,
    "https://www.sportscardinvestor.com/cards/kobe-bryant-basketball/2003-topps-chrome-113",
    "https://www.sportscardinvestor.com/cards/tom-brady-football/2020-panini-prizm-101",
    "https://www.sportscardinvestor.com/cards/fernando-tatis-jr-baseball/2020-topps-chrome-16",
    "https://www.sportscardinvestor.com/cards/caitlin-clark-basketball/2024-panini-prizm-1",
  ];
  // SCP prices: seeded for Roman Anthony + the 4 all-source cards.
  const scpPrices: (number | null)[] = [null, null, null, null, null, null, null, 1.75, 24, 9, 16, 58];
  const scpUrls: (string | null)[] = [
    null, null, null, null, null, null, null,
    "https://www.sportscardspro.com/game/baseball-cards-2026-topps/roman-anthony-189",
    "https://www.sportscardspro.com/game/basketball-cards-2003-topps-chrome/kobe-bryant-113",
    "https://www.sportscardspro.com/game/football-cards-2020-panini-prizm/tom-brady-101",
    "https://www.sportscardspro.com/game/baseball-cards-2020-topps-chrome/fernando-tatis-jr-16",
    "https://www.sportscardspro.com/game/basketball-cards-2024-panini-prizm/caitlin-clark-1",
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

// ─── Grade Stats ────────────────────────────────────────────────────────────

export async function getGradeStats() {
  const session = await auth();
  const userId = requireAuth(session);

  const rows = await db
    .select({
      gradeCompany: cards.gradeCompany,
      gradeValue: cards.gradeValue,
      count: sql<number>`count(*)`,
      totalPurchase: sql<number>`sum(${cards.purchasePrice})`,
    })
    .from(cards)
    .where(and(
      eq(cards.userId, userId),
      eq(cards.status, "owned"),
      isNotNull(cards.gradeCompany),
    ))
    .groupBy(cards.gradeCompany, cards.gradeValue)
    .orderBy(desc(sql`count(*)`))
    .all();

  return rows;
}

// ─── Portfolio History ───────────────────────────────────────────────────────

export async function getPortfolioHistory() {
  const session = await auth();
  const userId = requireAuth(session);

  // Use raw SQL to aggregate price_history by week for owned cards belonging to this user.
  // Drizzle stores timestamps as Unix seconds (integer). We group by ISO week.
  const rows = rawSqlite.prepare(`
    SELECT
      strftime('%Y-%m-%d', week_start) as date,
      SUM(max_price) as total_value
    FROM (
      SELECT
        ph.card_id,
        -- Round down to start of the ISO week (Sunday)
        date(ph.fetched_at, 'unixepoch', 'start of day',
             '-' || CAST(strftime('%w', ph.fetched_at, 'unixepoch') AS INTEGER) || ' days') as week_start,
        MAX(ph.price) as max_price
      FROM price_history ph
      JOIN cards c ON c.id = ph.card_id
      WHERE c.user_id = ?
        AND c.status = 'owned'
        AND ph.price IS NOT NULL
        AND ph.fetched_at > strftime('%s', 'now', '-180 days')
      GROUP BY ph.card_id, week_start
    )
    GROUP BY week_start
    ORDER BY week_start ASC
  `).all(userId) as Array<{ date: string; total_value: number }>;

  return rows.map((r) => ({ date: r.date, totalValue: r.total_value }));
}

// ─── Bulk Card Actions ──────────────────────────────────────────────────────

export async function updateCardsGenre(ids: string[], genre: string) {
  if (!ids.length) return;
  const session = await auth();
  const userId = requireAuth(session);

  await db
    .update(cards)
    .set({ sportGenre: genre, updatedAt: new Date() })
    .where(and(inArray(cards.id, ids), eq(cards.userId, userId)));

  revalidatePath("/cards");
  revalidatePath("/watchlist");
}

export async function updateCardsStatus(ids: string[], status: string) {
  if (!ids.length) return;
  const session = await auth();
  const userId = requireAuth(session);

  await db
    .update(cards)
    .set({ status, updatedAt: new Date() })
    .where(and(inArray(cards.id, ids), eq(cards.userId, userId)));

  revalidatePath("/cards");
  revalidatePath("/watchlist");
}

export async function updateCardsTradeBait(ids: string[], isTradeBait: boolean) {
  if (!ids.length) return;
  const session = await auth();
  const userId = requireAuth(session);

  await db
    .update(cards)
    .set({ isTradeBait, updatedAt: new Date() })
    .where(and(inArray(cards.id, ids), eq(cards.userId, userId)));

  revalidatePath("/cards");
}

// ─── Duplicate Detection ────────────────────────────────────────────────────

export async function getDuplicateGroups(): Promise<Card[][]> {
  const session = await auth();
  const userId = requireAuth(session);

  const allCards = await db
    .select()
    .from(cards)
    .where(and(eq(cards.userId, userId), eq(cards.status, "owned")))
    .all();

  // Group by composite key: name (lower) + gradeCompany + gradeValue
  const groups = new Map<string, Card[]>();
  for (const card of allCards) {
    const key = [
      card.name.toLowerCase().trim(),
      card.gradeCompany ?? "",
      card.gradeValue ?? "",
    ].join("|");
    const group = groups.get(key) ?? [];
    group.push(card);
    groups.set(key, group);
  }

  return [...groups.values()].filter((g) => g.length >= 2);
}

export async function checkDuplicate(
  name: string,
  year: number | null,
  setName: string | null,
  gradeCompany: string | null,
  gradeValue: string | null
): Promise<Card | null> {
  const session = await auth();
  const userId = requireAuth(session);

  const conditions = [
    eq(cards.userId, userId),
    like(cards.name, name),
  ] as ReturnType<typeof eq>[];

  if (year) conditions.push(eq(cards.year, year));
  if (setName) conditions.push(like(cards.setName, setName));
  if (gradeCompany) conditions.push(eq(cards.gradeCompany, gradeCompany));
  if (gradeValue) conditions.push(eq(cards.gradeValue, gradeValue));

  const existing = await db
    .select()
    .from(cards)
    .where(and(...conditions))
    .get();

  return existing ?? null;
}

// ─── CSV Import ─────────────────────────────────────────────────────────────

export type ImportRow = {
  name: string;
  year?: string;
  setName?: string;
  cardNumber?: string;
  variant?: string;
  sportGenre?: string;
  gradeCompany?: string;
  gradeValue?: string;
  condition?: string;
  purchasePrice?: string;
  notes?: string;
  status?: string;
};

export async function importCards(rows: ImportRow[]): Promise<{ imported: number; skipped: number; errors: number }> {
  const session = await auth();
  const userId = requireAuth(session);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    if (!row.name?.trim()) { errors++; continue; }

    const name = row.name.trim();
    const year = row.year ? parseInt(row.year) : null;
    const setName = row.setName?.trim() || null;
    const gradeCompany = row.gradeCompany?.trim() || null;
    const gradeValue = row.gradeValue?.trim() || null;

    // Check for duplicate
    const conditions = [eq(cards.userId, userId), like(cards.name, name)] as ReturnType<typeof eq>[];
    if (year) conditions.push(eq(cards.year, year));
    if (setName) conditions.push(like(cards.setName, setName));
    if (gradeCompany) conditions.push(eq(cards.gradeCompany, gradeCompany));

    const existing = await db.select({ id: cards.id }).from(cards).where(and(...conditions)).get();
    if (existing) { skipped++; continue; }

    try {
      await db.insert(cards).values({
        userId,
        name,
        year: isNaN(year as number) ? null : year,
        setName,
        cardNumber: row.cardNumber?.trim() || null,
        variant: row.variant?.trim() || null,
        sportGenre: row.sportGenre?.trim() || "other",
        gradeCompany,
        gradeValue,
        condition: row.condition?.trim() || null,
        purchasePrice: row.purchasePrice ? parseFloat(row.purchasePrice) : 0,
        notes: row.notes?.trim() || null,
        status: row.status?.trim() === "wanted" ? "wanted" : "owned",
        photoUrl: null,
      });
      imported++;
    } catch {
      errors++;
    }
  }

  revalidatePath("/cards");
  revalidatePath("/watchlist");
  return { imported, skipped, errors };
}

