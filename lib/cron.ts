import cron from "node-cron";
import { db } from "@/lib/db";
import { cards, priceHistory, settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchAllPrices } from "@/lib/scrapers";

let cronJob: ReturnType<typeof cron.schedule> | null = null;

async function getRefreshIntervalMinutes(): Promise<number> {
  try {
    const row = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "refresh_interval"))
      .get();
    return row ? parseInt(row.value, 10) : 1440; // default 24h
  } catch {
    return 1440;
  }
}

async function refreshAllCards() {
  console.log("[cron] Starting scheduled price refresh...");
  const allCards = await db.select().from(cards).all();

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
      await db.insert(priceHistory).values(
        results.map((r) => ({
          cardId: card.id,
          source: r.source,
          price: r.price,
          url: r.url,
          imageUrl: r.imageUrl,
          fetchedAt: now,
        }))
      );

      if (!card.photoUrl) {
        const firstImage = results.find((r) => r.imageUrl)?.imageUrl;
        if (firstImage) {
          await db
            .update(cards)
            .set({ photoUrl: firstImage, updatedAt: now })
            .where(eq(cards.id, card.id));
        }
      }
    } catch (err) {
      console.error(`[cron] Failed to refresh card ${card.id}:`, err);
    }
  }

  console.log(`[cron] Refreshed ${allCards.length} cards`);
}

export async function startCron() {
  const intervalMinutes = await getRefreshIntervalMinutes();

  if (intervalMinutes === 0) {
    console.log("[cron] Scheduled refresh disabled");
    return;
  }

  // Convert minutes to cron expression
  let cronExpression: string;
  if (intervalMinutes < 60) {
    cronExpression = `*/${intervalMinutes} * * * *`;
  } else {
    const hours = Math.floor(intervalMinutes / 60);
    cronExpression = `0 */${hours} * * *`;
  }

  if (cronJob) {
    cronJob.stop();
  }

  cronJob = cron.schedule(cronExpression, refreshAllCards);
  console.log(`[cron] Scheduled price refresh every ${intervalMinutes} minutes (${cronExpression})`);
}
