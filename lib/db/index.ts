import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { migrate } from "./migrate";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "cardventory.db");

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;
let _sqlite: InstanceType<typeof Database> | undefined;

function getConnection() {
  if (!_db) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    _sqlite = new Database(dbPath);
    _sqlite.pragma("journal_mode = WAL");
    _sqlite.pragma("foreign_keys = ON");
    migrate(_sqlite);
    _db = drizzle(_sqlite, { schema });
  }
  return { db: _db, sqlite: _sqlite! };
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return getConnection().db[prop as keyof ReturnType<typeof drizzle<typeof schema>>];
  },
});

export const rawSqlite = new Proxy({} as InstanceType<typeof Database>, {
  get(_target, prop) {
    return getConnection().sqlite[prop as keyof InstanceType<typeof Database>];
  },
});

export type DB = typeof db;
