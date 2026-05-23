import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { isNull, eq, and } from "drizzle-orm";

const BANNER_KEY = "app_banner_url";
const BANNER_SIZE_KEY = "app_banner_size";
const BANNER_PADDING_KEY = "app_banner_padding";
const MAX_BYTES = 512 * 1024; // 512 KB
const VALID_SIZES = new Set(["sm", "md", "lg", "2xl", "xl"]);

type BannerOffset = { x: number; y: number };

function parseOffset(raw: string | undefined): BannerOffset {
  try {
    const v = JSON.parse(raw ?? "");
    if (typeof v?.x === "number" && typeof v?.y === "number") return { x: v.x, y: v.y };
  } catch { /* fall through */ }
  return { x: 0, y: 0 };
}

function clampPad(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(48, Math.max(-48, Math.round(n))) : 0;
}

export async function GET(_req: NextRequest) {
  const [urlRow, sizeRow, padRow] = await Promise.all([
    db.select().from(settings).where(and(isNull(settings.userId), eq(settings.key, BANNER_KEY))).get(),
    db.select().from(settings).where(and(isNull(settings.userId), eq(settings.key, BANNER_SIZE_KEY))).get(),
    db.select().from(settings).where(and(isNull(settings.userId), eq(settings.key, BANNER_PADDING_KEY))).get(),
  ]);

  return NextResponse.json({
    url: urlRow?.value ?? null,
    size: sizeRow?.value ?? "sm",
    offset: parseOffset(padRow?.value),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("banner");

  if (file === null) {
    await db.delete(settings).where(and(isNull(settings.userId), eq(settings.key, BANNER_KEY)));
    return NextResponse.json({ url: null });
  }

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 512 KB limit" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  const existing = await db
    .select()
    .from(settings)
    .where(and(isNull(settings.userId), eq(settings.key, BANNER_KEY)))
    .get();

  if (existing) {
    await db.update(settings).set({ value: dataUrl }).where(and(isNull(settings.userId), eq(settings.key, BANNER_KEY)));
  } else {
    await db.insert(settings).values({ key: BANNER_KEY, value: dataUrl, userId: null });
  }

  return NextResponse.json({ url: dataUrl });
}

export async function DELETE(_req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await db.delete(settings).where(and(isNull(settings.userId), eq(settings.key, BANNER_KEY)));
  return NextResponse.json({ url: null });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { size?: string; offset?: Record<string, unknown>; url?: string };

  if (body.url !== undefined) {
    let value: string;
    if (body.url === "") {
      // Empty string = clear the banner
      await db.delete(settings).where(and(isNull(settings.userId), eq(settings.key, BANNER_KEY)));
      return NextResponse.json({ url: null });
    }
    try {
      const parsed = new URL(body.url);
      if (!parsed.protocol.startsWith("http")) {
        return NextResponse.json({ error: "URL must use http or https" }, { status: 400 });
      }
      value = body.url;
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    const existing = await db.select().from(settings)
      .where(and(isNull(settings.userId), eq(settings.key, BANNER_KEY))).get();
    if (existing) {
      await db.update(settings).set({ value }).where(and(isNull(settings.userId), eq(settings.key, BANNER_KEY)));
    } else {
      await db.insert(settings).values({ key: BANNER_KEY, value, userId: null });
    }
    return NextResponse.json({ url: value });
  }

  if (body.size !== undefined) {
    if (!VALID_SIZES.has(body.size)) return NextResponse.json({ error: "Invalid size" }, { status: 400 });
    const existing = await db.select().from(settings)
      .where(and(isNull(settings.userId), eq(settings.key, BANNER_SIZE_KEY))).get();
    if (existing) {
      await db.update(settings).set({ value: body.size })
        .where(and(isNull(settings.userId), eq(settings.key, BANNER_SIZE_KEY)));
    } else {
      await db.insert(settings).values({ key: BANNER_SIZE_KEY, value: body.size, userId: null });
    }
  }

  if (body.offset !== undefined) {
    const off: BannerOffset = {
      x: clampPad(body.offset.x),
      y: clampPad(body.offset.y),
    };
    const value = JSON.stringify(off);
    const existing = await db.select().from(settings)
      .where(and(isNull(settings.userId), eq(settings.key, BANNER_PADDING_KEY))).get();
    if (existing) {
      await db.update(settings).set({ value })
        .where(and(isNull(settings.userId), eq(settings.key, BANNER_PADDING_KEY)));
    } else {
      await db.insert(settings).values({ key: BANNER_PADDING_KEY, value, userId: null });
    }
  }

  return NextResponse.json({ ok: true });
}
