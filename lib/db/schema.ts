import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "user"] })
    .notNull()
    .default("user"),
  lockedAt: integer("locked_at", { mode: "timestamp" }),
  status: text("status", { enum: ["active", "pending"] }).notNull().default("active"),
  sessionVersion: integer("session_version").notNull().default(0),
  username: text("username").unique(),
  profilePublic: integer("profile_public", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const cards = sqliteTable("cards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  setName: text("set_name"),
  year: integer("year"),
  sportGenre: text("sport_genre").notNull().default("other"),
  cardNumber: text("card_number"),
  variant: text("variant"),
  gradeCompany: text("grade_company"), // PSA, BGS, CGC, SGC, raw
  gradeValue: text("grade_value"), // 10, 9.5, 9, etc.
  condition: text("condition"), // mint, near_mint, excellent, etc.
  purchasePrice: real("purchase_price").notNull().default(0),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  status: text("status").notNull().default("owned"), // 'owned' | 'wanted'
  isTradeBait: integer("is_trade_bait", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const priceHistory = sqliteTable("price_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  source: text("source").notNull(), // ebay | sportscardinvestor | cardladder | sportscardspro
  price: real("price"),
  currency: text("currency").notNull().default("USD"),
  url: text("url"),
  imageUrl: text("image_url"),
  fetchedAt: integer("fetched_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const settings = sqliteTable("settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  cardId: text("card_id").references(() => cards.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["new_high", "price_change"] }).notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const userLoginLogs = sqliteTable("user_login_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address").notNull(),
  loginAt: integer("login_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const bannedUsers = sqliteTable("banned_users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  ipAddress: text("ip_address"),
  bannedAt: integer("banned_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  bannedByUserId: text("banned_by_user_id"),
  reason: text("reason"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type NewPriceHistory = typeof priceHistory.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type UserLoginLog = typeof userLoginLogs.$inferSelect;
export type NewUserLoginLog = typeof userLoginLogs.$inferInsert;
export type BannedUser = typeof bannedUsers.$inferSelect;

// ── Analytics ─────────────────────────────────────────────────────────────────

export const analyticsSessions = sqliteTable("analytics_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  startedAt: integer("started_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
  endedAt: integer("ended_at"),
  pageCount: integer("page_count").notNull().default(0),
  eventCount: integer("event_count").notNull().default(0),
  entryPath: text("entry_path").notNull().default("/"),
  exitPath: text("exit_path"),
  device: text("device"), // desktop | mobile | tablet
  browser: text("browser"),
  os: text("os"),
  viewport: text("viewport"), // "1920x1080"
  country: text("country"),
  region: text("region"),
  city: text("city"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  referrer: text("referrer"),
  hasConsent: integer("has_consent", { mode: "boolean" }).notNull().default(false),
});

export const analyticsEvents = sqliteTable("analytics_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(), // pageview | click | scroll_depth | form_start | form_submit | form_abandon | custom
  eventName: text("event_name"), // for custom events
  path: text("path").notNull(),
  referrer: text("referrer"),
  properties: text("properties"), // JSON string
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  createdAt: integer("created_at").notNull(),
});

export const analyticsConsent = sqliteTable("analytics_consent", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: text("session_id").notNull(),
  analyticsConsent: integer("analytics_consent", { mode: "boolean" }).notNull().default(false),
  performanceConsent: integer("performance_consent", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  ipHash: text("ip_hash"),
  consentVersion: text("consent_version").notNull().default("1.0"),
});

export type AnalyticsSession = typeof analyticsSessions.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type AnalyticsConsent = typeof analyticsConsent.$inferSelect;
