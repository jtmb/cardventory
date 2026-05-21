import cron from "node-cron";
import { db } from "@/lib/db";
import { cards, priceHistory, settings, users } from "@/lib/db/schema";
import { eq, and, isNull, lt } from "drizzle-orm";
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

async function autoDenyPendingUsers() {
  try {
    const row = await db
      .select()
      .from(settings)
      .where(and(isNull(settings.userId), eq(settings.key, "auto_deny_after_hours")))
      .get();

    const hours = row ? parseInt(row.value, 10) : 0;
    if (!hours || hours <= 0) return;

    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const expired = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.status, "pending"), lt(users.createdAt, cutoffDate)))
      .all();

    if (expired.length === 0) return;

    for (const u of expired) {
      await db.delete(users).where(eq(users.id, u.id));
    }
    console.log(`[cron] Auto-denied ${expired.length} pending user(s) older than ${hours}h`);
  } catch (err) {
    console.error("[cron] Auto-deny failed:", err);
  }
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

  // Auto-deny check: runs every hour, reads setting each time
  cron.schedule("0 * * * *", autoDenyPendingUsers);
  // Run once on startup to catch any already-expired pending users
  autoDenyPendingUsers().catch(() => {});
}
