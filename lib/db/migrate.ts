import Database from "better-sqlite3";

export function migrate(sqlite: InstanceType<typeof Database>) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      set_name TEXT,
      year INTEGER,
      sport_genre TEXT NOT NULL DEFAULT 'other',
      card_number TEXT,
      variant TEXT,
      grade_company TEXT,
      grade_value TEXT,
      condition TEXT,
      purchase_price REAL NOT NULL DEFAULT 0,
      notes TEXT,
      photo_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      price REAL,
      currency TEXT NOT NULL DEFAULT 'USD',
      url TEXT,
      image_url TEXT,
      fetched_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
    CREATE INDEX IF NOT EXISTS idx_cards_sport_genre ON cards(sport_genre);
    CREATE INDEX IF NOT EXISTS idx_price_history_card_id ON price_history(card_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_source ON price_history(source);
    CREATE INDEX IF NOT EXISTS idx_price_history_fetched_at ON price_history(fetched_at);
    CREATE INDEX IF NOT EXISTS idx_settings_user_key ON settings(user_id, key);
  `);

  // Additive migrations: ALTER TABLE is safe to retry (ignored if column exists)
  try { sqlite.exec("ALTER TABLE users ADD COLUMN locked_at INTEGER"); } catch {}
  try { sqlite.exec("ALTER TABLE cards ADD COLUMN status TEXT NOT NULL DEFAULT 'owned'"); } catch {}

  // Additional indexes for new columns
  try { sqlite.exec("CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status)"); } catch {}
}
