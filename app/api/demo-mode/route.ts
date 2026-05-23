import { NextResponse } from "next/server";
import { rawSqlite } from "@/lib/db";

export async function GET() {
  try {
    const row = rawSqlite
      .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = 'demo_mode' LIMIT 1")
      .get() as { value: string } | undefined;
    return NextResponse.json({ enabled: row?.value === "true" });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
