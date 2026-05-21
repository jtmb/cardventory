import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { isNull, eq, and } from "drizzle-orm";

const LOGO_KEY = "app_logo_url";
const MAX_BYTES = 512 * 1024; // 512 KB

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await db
    .select()
    .from(settings)
    .where(and(isNull(settings.userId), eq(settings.key, LOGO_KEY)))
    .get();

  return NextResponse.json({ url: row?.value ?? null });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("logo");

  if (file === null) {
    // Delete logo
    await db.delete(settings).where(and(isNull(settings.userId), eq(settings.key, LOGO_KEY)));
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
    .where(and(isNull(settings.userId), eq(settings.key, LOGO_KEY)))
    .get();

  if (existing) {
    await db.update(settings).set({ value: dataUrl }).where(and(isNull(settings.userId), eq(settings.key, LOGO_KEY)));
  } else {
    await db.insert(settings).values({ key: LOGO_KEY, value: dataUrl, userId: null });
  }

  return NextResponse.json({ url: dataUrl });
}

export async function DELETE(_req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await db.delete(settings).where(and(isNull(settings.userId), eq(settings.key, LOGO_KEY)));
  return NextResponse.json({ url: null });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const url = body?.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return NextResponse.json({ error: "URL must start with http:// or https://" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(settings)
    .where(and(isNull(settings.userId), eq(settings.key, LOGO_KEY)))
    .get();

  if (existing) {
    await db.update(settings).set({ value: url }).where(and(isNull(settings.userId), eq(settings.key, LOGO_KEY)));
  } else {
    await db.insert(settings).values({ key: LOGO_KEY, value: url, userId: null });
  }

  return NextResponse.json({ url });
}
