import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { isNull, eq, and } from "drizzle-orm";

const BANNER_KEY = "app_banner_url";
const MAX_BYTES = 512 * 1024; // 512 KB

export async function GET(_req: NextRequest) {
  const row = await db
    .select()
    .from(settings)
    .where(and(isNull(settings.userId), eq(settings.key, BANNER_KEY)))
    .get();

  return NextResponse.json({ url: row?.value ?? null });
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
