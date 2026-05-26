import cron from "node-cron";
import { db, rawSqlite } from "@/lib/db";
import { cards, priceHistory, settings, users, notifications } from "@/lib/db/schema";
import { eq, and, isNull, lt, max, desc } from "drizzle-orm";
import { fetchAllPrices } from "@/lib/scrapers";
import { sendEmailNotification, sendDiscordNotification, sendDiscordDmNotification } from "@/lib/notifications";
import type { SmtpConfig } from "@/lib/notifications";

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

/** Load all notification-related settings for a user (returns null values if not set) */
async function getUserNotifSettings(userId: string) {
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .all();

  const get = (key: string) => rows.find((r) => r.key === key)?.value ?? null;

  return {
    onNewHigh: get("notif_on_new_high") === "true",
    onPriceChange: get("notif_on_price_change") === "true",
    emailEnabled: get("notif_email_enabled") === "true",
    emailSmtpHost: get("notif_smtp_host") ?? "",
    emailSmtpPort: parseInt(get("notif_smtp_port") ?? "587", 10),
    emailSmtpSecure: get("notif_smtp_secure") === "true",
    emailSmtpUser: get("notif_smtp_user") ?? "",
    emailSmtpPass: get("notif_smtp_pass") ?? "",
    emailFrom: get("notif_email_from") ?? "",
    emailTo: get("notif_email_to") ?? "",
    discordEnabled: get("notif_discord_enabled") === "true",
    discordWebhook: get("notif_discord_webhook") ?? "",
    discordMode: (get("notif_discord_mode") ?? "webhook") as "webhook" | "dm",
    discordBotToken: get("notif_discord_bot_token") ?? "",
    discordUserId: get("notif_discord_user_id") ?? "",
  };
}

async function fireNotifications(
  userId: string,
  cardName: string,
  cardId: string,
  type: "new_high" | "price_change",
  message: string
) {
  // Write in-app notification
  try {
    await db.insert(notifications).values({ userId, cardId, message, type });
  } catch (err) {
    console.error("[cron] Failed to insert notification:", err);
  }

  // Fire outbound notifications (email + Discord) if configured
  try {
    const s = await getUserNotifSettings(userId);

    if (s.emailEnabled && s.emailSmtpHost && s.emailFrom && s.emailTo) {
      const config: SmtpConfig = {
        host: s.emailSmtpHost,
        port: s.emailSmtpPort,
        secure: s.emailSmtpSecure,
        user: s.emailSmtpUser,
        pass: s.emailSmtpPass,
        from: s.emailFrom,
        to: s.emailTo,
      };
      await sendEmailNotification(config, `Cardventory: ${type === "new_high" ? "New Price High" : "Price Change"}`, message);
    }

    if (s.discordEnabled) {
      if (s.discordMode === "dm" && s.discordBotToken && s.discordUserId) {
        await sendDiscordDmNotification(s.discordBotToken, s.discordUserId, message);
      } else if (s.discordWebhook) {
        await sendDiscordNotification(s.discordWebhook, message);
      }
    }
  } catch (err) {
    console.error("[cron] Failed to send outbound notification:", err);
  }
}

async function refreshAllCards() {
  console.log("[cron] Starting scheduled price refresh...");
  const allCards = await db.select().from(cards).all();

  for (const card of allCards) {
    try {
      // Get previous max price before this refresh
      const prevMaxRow = await db
        .select({ prevMax: max(priceHistory.price) })
        .from(priceHistory)
        .where(eq(priceHistory.cardId, card.id))
        .get();
      const prevMax = prevMaxRow?.prevMax ?? null;

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

      // Price event notifications
      const newPrices = results.map((r) => r.price).filter((p): p is number => p !== null && p > 0);
      if (newPrices.length === 0) continue;

      const newMax = Math.max(...newPrices);
      const userSettings = await getUserNotifSettings(card.userId);

      if (userSettings.onNewHigh && prevMax !== null && newMax > prevMax) {
        const msg = `📈 New price high for "${card.name}": $${newMax.toFixed(2)} (was $${prevMax.toFixed(2)})`;
        await fireNotifications(card.userId, card.name, card.id, "new_high", msg);
      } else if (userSettings.onPriceChange && prevMax !== null && newMax !== prevMax) {
        const direction = newMax > prevMax ? "up" : "down";
        const msg = `💰 Price ${direction} for "${card.name}": $${newMax.toFixed(2)} (was $${prevMax.toFixed(2)})`;
        await fireNotifications(card.userId, card.name, card.id, "price_change", msg);
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

  // Analytics retention cleanup: delete events + sessions older than 90 days, runs daily at 03:00
  cron.schedule("0 3 * * *", () => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    try {
      const evDel = rawSqlite.prepare("DELETE FROM analytics_events WHERE created_at < ?").run(cutoff);
      const ssDel = rawSqlite.prepare("DELETE FROM analytics_sessions WHERE started_at < ?").run(cutoff);
      console.log(`[cron] Analytics cleanup: removed ${evDel.changes} events, ${ssDel.changes} sessions older than 90 days`);
    } catch (err) {
      console.error("[cron] Analytics cleanup error:", err);
    }
  });
}
