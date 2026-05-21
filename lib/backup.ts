import path from "path";
import fs from "fs";
import { rawSqlite } from "@/lib/db";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "cardventory.db");

export const BACKUPS_DIR =
  process.env.BACKUPS_DIR ?? path.join(process.cwd(), "data", "backups");

export interface BackupInfo {
  name: string;
  size: number;   // bytes
  createdAt: string; // ISO string
}

export async function createBackup(prefix = "backup"): Promise<BackupInfo> {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const name = `${prefix}-${ts}.db`;
  const dest = path.join(BACKUPS_DIR, name);
  // better-sqlite3's backup() is WAL-safe and works on a live database
  await rawSqlite.backup(dest);
  const stat = fs.statSync(dest);
  return { name, size: stat.size, createdAt: new Date().toISOString() };
}

export function listBackups(): BackupInfo[] {
  try {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    return fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.endsWith(".db"))
      .map((name) => {
        const p = path.join(BACKUPS_DIR, name);
        const stat = fs.statSync(p);
        return { name, size: stat.size, createdAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

/** Resolve and validate a backup file path (prevents path traversal). */
export function resolveBackupPath(name: string): string {
  const safeName = path.basename(name);
  if (!safeName.endsWith(".db") || safeName !== name) {
    throw new Error("Invalid backup name");
  }
  return path.join(BACKUPS_DIR, safeName);
}

export function deleteBackup(name: string): void {
  const p = resolveBackupPath(name);
  fs.unlinkSync(p);
}

export async function restoreBackup(name: string): Promise<void> {
  const backupPath = resolveBackupPath(name);
  if (!fs.existsSync(backupPath)) throw new Error("Backup not found");
  // Create a safety snapshot before overwriting
  await createBackup("pre-restore");
  // Overwrite the live DB file — server restart needed to reload in-process cache
  fs.copyFileSync(backupPath, DB_PATH);
}

/** Remove oldest regular (non-pre-restore) backups beyond `max`. */
export function pruneOldBackups(max: number): void {
  if (max <= 0) return;
  const regular = listBackups().filter((b) => !b.name.startsWith("pre-restore"));
  const excess = regular.slice(max);
  for (const b of excess) {
    try { deleteBackup(b.name); } catch { /* ignore */ }
  }
}

// ─── Auto-backup scheduler (module-level, lives for the process lifetime) ────

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let schedulerToken = 0;
let schedulerInitialized = false;

export function startAutoBackupScheduler(intervalHours: number, maxCount: number) {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  if (intervalHours <= 0) return;

  const token = ++schedulerToken;
  schedulerTimer = setInterval(async () => {
    if (schedulerToken !== token) return; // stale after reconfigure
    try {
      await createBackup("auto");
      pruneOldBackups(maxCount);
    } catch (err) {
      console.error("[backup] Auto-backup failed:", err);
    }
  }, intervalHours * 60 * 60 * 1000);
}

/**
 * Read auto-backup config from the DB and start the scheduler.
 * Safe to call multiple times — only initializes once per process.
 */
export function initBackupSchedulerFromDb() {
  if (schedulerInitialized) return;
  schedulerInitialized = true;
  try {
    const intervalRow = rawSqlite
      .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = 'auto_backup_interval_hours'")
      .get() as { value: string } | undefined;
    const maxRow = rawSqlite
      .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = 'auto_backup_max_count'")
      .get() as { value: string } | undefined;
    const hours = parseInt(intervalRow?.value ?? "0", 10);
    const max = parseInt(maxRow?.value ?? "10", 10);
    startAutoBackupScheduler(hours, max);
  } catch (err) {
    console.error("[backup] Scheduler init failed:", err);
  }
}
