import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

export const SYSTEM_SETTING_KEYS = [
  "oauth_google_client_id",
  "oauth_google_client_secret",
  "oauth_github_client_id",
  "oauth_github_client_secret",
] as const;

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(settings)
    .where(isNull(settings.userId))
    .all();

  const result: Record<string, string> = {};
  for (const row of rows) {
    if ((SYSTEM_SETTING_KEYS as readonly string[]).includes(row.key)) {
      result[row.key] = row.value;
    }
  }
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  for (const [key, value] of Object.entries(body)) {
    if (!(SYSTEM_SETTING_KEYS as readonly string[]).includes(key)) continue;
    if (typeof value !== "string") continue;

    const existing = await db
      .select()
      .from(settings)
      .where(and(isNull(settings.userId), eq(settings.key, key)))
      .get();

    if (existing) {
      await db
        .update(settings)
        .set({ value })
        .where(and(isNull(settings.userId), eq(settings.key, key)));
    } else {
      await db.insert(settings).values({ key, value, userId: null });
    }
  }

  return NextResponse.json({ success: true });
}
