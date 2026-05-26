import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir, statfs } from "fs/promises";
import sharp from "sharp";
import path from "path";
import { db } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { eq, and, like, sql } from "drizzle-orm";
import { securityMetrics } from "@/lib/security-metrics";

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

  // Detect ISO BMFF-based containers (HEIF/HEIC/AVIF) via 'ftyp' box brands
  // Check the 'ftyp' box header (at offset 4) and look for known brands.
  try {
    if (buf.length >= 12) {
      const box = buf.slice(4, 12).toString("ascii").toLowerCase();
      // common brands include: heic, heix, hevc, mif1, avif, miaf
      if (box.includes("heic") || box.includes("heix") || box.includes("hevc") || box.includes("mif1") || box.includes("avif") || box.includes("miaf")) {
        // prefer HEIF/HEIC label; AVIF is similar container but for AV1-coded images
        if (box.includes("avif") || box.includes("mif1")) return "image/avif";
        return "image/heic";
      }
    }
  } catch {
    // ignore and continue
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
    securityMetrics.increment("uploadBlocked");
    return NextResponse.json(
      { error: "Too many uploads. Please slow down." },
      { status: 429 }
    );
  }
  if (!checkRate(hourlyBucket, userId, RATE_WINDOW_MS, RATE_MAX)) {
    securityMetrics.increment("uploadBlocked");
    return NextResponse.json(
      { error: "Hourly upload limit reached. Try again later." },
      { status: 429 }
    );
  }

  // ── Disk space guard ──────────────────────────────────────────────────────
  // Determine the runtime uploads directory. In some deployment setups the
  // host volume is mounted at `/app/public/uploads`, in others at `/app/uploads`.
  // Try `public/uploads` first (matches Next.js `public` static path), then
  // fall back to `uploads` so common docker-compose mounts still work.
  const candidateDirs = [
    path.join(process.cwd(), "public", "uploads"),
    path.join(process.cwd(), "uploads"),
  ];

  let uploadDir: string | null = null;
  for (const d of candidateDirs) {
    try {
      await mkdir(d, { recursive: true });
      uploadDir = d;
      break;
    } catch {
      // try next
    }
  }

  if (!uploadDir) {
    return NextResponse.json({ error: "Server error preparing upload directory" }, { status: 500 });
  }

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
    .where(and(eq(cards.userId, userId), like(cards.photoUrl, "/uploads/%")));
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
  let buffer = Buffer.from(bytes);
  let detectedMime = detectMime(buffer);

  if (!detectedMime) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, GIF, HEIC, and AVIF images are allowed" },
      { status: 400 }
    );
  }

  // If the upload is HEIC/AVIF (common on iPhones), convert to JPEG with sharp
  if (detectedMime === "image/heic" || detectedMime === "image/avif") {
    try {
      const converted = await sharp(buffer).jpeg({ quality: 92 }).toBuffer();
      buffer = Buffer.from(converted);
      detectedMime = "image/jpeg";
    } catch (err) {
      return NextResponse.json({ error: "Failed to convert HEIC/AVIF image. Please try JPG/PNG instead." }, { status: 400 });
    }
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

  const outPath = path.join(uploadDir, filename);
  await writeFile(outPath, buffer);

  // If we wrote to a non-public uploads dir (e.g. /app/uploads), try to ensure
  // Next's expected public path still points to the file by returning the
  // canonical `/uploads/...` URL. Deployments should mount the same host
  // directory where static files are served, but this fallback makes the
  // handler resilient across variants.
  return NextResponse.json({ url: `/uploads/${filename}` });
}
