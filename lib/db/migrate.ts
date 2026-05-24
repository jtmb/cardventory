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
  try { sqlite.exec("ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0"); } catch {}

  // Additional indexes for new columns
  try { sqlite.exec("CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status)"); } catch {}

  // Public profiles + trade bait
  try { sqlite.exec("ALTER TABLE users ADD COLUMN username TEXT"); } catch {}
  try { sqlite.exec("ALTER TABLE users ADD COLUMN profile_public INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { sqlite.exec("ALTER TABLE cards ADD COLUMN is_trade_bait INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL"); } catch {}
  try { sqlite.exec("CREATE INDEX IF NOT EXISTS idx_cards_trade_bait ON cards(is_trade_bait)"); } catch {}

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

  // Trade requests table
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS trade_requests (
        id TEXT PRIMARY KEY,
        from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        offered_card_ids TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'pending',
        message TEXT,
        response_message TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_trade_requests_from ON trade_requests(from_user_id);
      CREATE INDEX IF NOT EXISTS idx_trade_requests_to ON trade_requests(to_user_id);
      CREATE INDEX IF NOT EXISTS idx_trade_requests_status ON trade_requests(status);
    `);
  } catch {}

  // Analytics tables
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS analytics_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        started_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        ended_at INTEGER,
        page_count INTEGER NOT NULL DEFAULT 0,
        event_count INTEGER NOT NULL DEFAULT 0,
        entry_path TEXT NOT NULL DEFAULT '/',
        exit_path TEXT,
        device TEXT,
        browser TEXT,
        os TEXT,
        viewport TEXT,
        country TEXT,
        region TEXT,
        city TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        referrer TEXT,
        has_consent INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        event_type TEXT NOT NULL,
        event_name TEXT,
        path TEXT NOT NULL,
        referrer TEXT,
        properties TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS analytics_consent (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        session_id TEXT NOT NULL,
        analytics_consent INTEGER NOT NULL DEFAULT 0,
        performance_consent INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        ip_hash TEXT,
        consent_version TEXT NOT NULL DEFAULT '1.0'
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events(path);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user ON analytics_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started ON analytics_sessions(started_at);
      CREATE INDEX IF NOT EXISTS idx_analytics_sessions_country ON analytics_sessions(country);
    `);
  } catch {}
}
