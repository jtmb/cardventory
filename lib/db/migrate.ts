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
  try { sqlite.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'"); } catch {}
  try { sqlite.exec("ALTER TABLE cards ADD COLUMN status TEXT NOT NULL DEFAULT 'owned'"); } catch {}

  // Additional indexes for new columns
  try { sqlite.exec("CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status)"); } catch {}

  // Banned users table
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS banned_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        ip_address TEXT,
        banned_at INTEGER NOT NULL,
        banned_by_user_id TEXT,
        reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_banned_users_email ON banned_users(email);
      CREATE INDEX IF NOT EXISTS idx_banned_users_ip ON banned_users(ip_address);
    `);
  } catch {}

  // New tables: notifications and user_login_logs
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        card_id TEXT REFERENCES cards(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS user_login_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip_address TEXT NOT NULL,
        login_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
      CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs(user_id);
    `);
  } catch {}
}
