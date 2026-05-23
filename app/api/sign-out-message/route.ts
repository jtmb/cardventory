import { NextResponse } from "next/server";
import { rawSqlite } from "@/lib/db";

/** Public endpoint — only exposes the sign_out_message system setting (no auth required). */
export async function GET() {
  try {
    const row = rawSqlite
      .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = 'sign_out_message' LIMIT 1")
      .get() as { value: string } | undefined;
    return NextResponse.json({ message: row?.value ?? "" });
  } catch {
    return NextResponse.json({ message: "" });
  }
}
