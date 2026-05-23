import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { rawSqlite } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const message = typeof body.message === "string" ? body.message.trim() : "";

  // Increment session_version for all users except the admin issuing the command
  const result = rawSqlite
    .prepare("UPDATE users SET session_version = session_version + 1 WHERE id != ?")
    .run(session.user.id);

  // Store or clear the optional sign-out message
  if (message) {
    const existing = rawSqlite
      .prepare("SELECT id FROM settings WHERE user_id IS NULL AND key = 'sign_out_message' LIMIT 1")
      .get() as { id: string } | undefined;
    if (existing) {
      rawSqlite
        .prepare("UPDATE settings SET value = ? WHERE user_id IS NULL AND key = 'sign_out_message'")
        .run(message);
    } else {
      const id = crypto.randomUUID();
      rawSqlite
        .prepare("INSERT INTO settings (id, user_id, key, value) VALUES (?, NULL, 'sign_out_message', ?)")
        .run(id, message);
    }
  } else {
    rawSqlite
      .prepare("DELETE FROM settings WHERE user_id IS NULL AND key = 'sign_out_message'")
      .run();
  }

  return NextResponse.json({ count: result.changes });
}
