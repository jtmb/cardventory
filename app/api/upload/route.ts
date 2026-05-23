import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir, statfs } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { eq, and, like, sql } from "drizzle-orm";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB per file
const MIN_DISK_FREE = 500 * 1024 * 1024; // Refuse uploads if < 500 MB free
const MAX_UPLOADS_PER_USER = 500; // Hard cap on stored images per user
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 30; // max uploads per user per hour
const BURST_WINDOW_MS = 60 * 1000; // 1 minute
const BURST_MAX = 10; // max uploads per user per minute

// Magic-byte signatures for allowed image types
const MAGIC: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF....WEBP checked below
];

function detectMime(buf: Buffer): string | null {
  for (const sig of MAGIC) {
    const off = sig.offset ?? 0;
    if (sig.bytes.every((b, i) => buf[off + i] === b)) {
      // Extra WebP check: bytes 8-11 must be "WEBP"
      if (sig.mime === "image/webp") {
        if (buf.length < 12) continue;
        if (buf.slice(8, 12).toString("ascii") !== "WEBP") continue;
      }
      return sig.mime;
    }
  }
  return null;
}

// In-memory per-user rate limiter: { userId -> timestamp[] }
const hourlyBucket = new Map<string, number[]>();
const burstBucket = new Map<string, number[]>();

function checkRate(bucket: Map<string, number[]>, userId: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const timestamps = (bucket.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= max) return false;
  timestamps.push(now);
  bucket.set(userId, timestamps);
  return true;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // ── Rate limiting ────────────────────────────────────────────────────────
  if (!checkRate(burstBucket, userId, BURST_WINDOW_MS, BURST_MAX)) {
    return NextResponse.json(
      { error: "Too many uploads. Please slow down." },
      { status: 429 }
    );
  }
  if (!checkRate(hourlyBucket, userId, RATE_WINDOW_MS, RATE_MAX)) {
    return NextResponse.json(
      { error: "Hourly upload limit reached. Try again later." },
      { status: 429 }
    );
  }

  // ── Disk space guard ──────────────────────────────────────────────────────
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  try {
    const stat = await statfs(uploadDir);
    const freeBytes = stat.bfree * stat.bsize;
    if (freeBytes < MIN_DISK_FREE) {
      return NextResponse.json(
        { error: "Server storage is full. Please contact the administrator." },
        { status: 507 }
      );
    }
  } catch {
    // statfs not available on all platforms — continue without the check
  }

  // ── Per-user upload quota ─────────────────────────────────────────────────
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cards)
    .where(and(eq(cards.userId, userId), like(cards.imageUrl, "/uploads/%")));
  if (count >= MAX_UPLOADS_PER_USER) {
    return NextResponse.json(
      { error: `Upload limit of ${MAX_UPLOADS_PER_USER} images reached. Delete some card images first.` },
      { status: 413 }
    );
  }

  // ── Parse form data ───────────────────────────────────────────────────────
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File size must be under 5 MB" },
      { status: 413 }
    );
  }

  // ── Read buffer & validate magic bytes (not just Content-Type) ────────────
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const detectedMime = detectMime(buffer);

  if (!detectedMime) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, and GIF images are allowed" },
      { status: 400 }
    );
  }

  // ── Write file ────────────────────────────────────────────────────────────
  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  const ext = extMap[detectedMime] ?? "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;

  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
