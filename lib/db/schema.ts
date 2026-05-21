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
