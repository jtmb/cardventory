import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userLoginLogs } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getRealIp } from "@/lib/get-real-ip";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Extract IP — prioritise CF-Connecting-IP (Cloudflare Tunnel), then XFF, then X-Real-IP
  const ipAddress = getRealIp(req);

  // Deduplication: skip if same IP was already logged in the last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recent = await db
    .select()
    .from(userLoginLogs)
    .where(eq(userLoginLogs.userId, userId))
    .orderBy(desc(userLoginLogs.loginAt))
    .limit(1)
    .get();

  if (recent && recent.ipAddress === ipAddress && recent.loginAt >= tenMinutesAgo) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Insert new log
  await db.insert(userLoginLogs).values({ userId, ipAddress });

  // Prune to last 10 per user
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(userLoginLogs)
    .where(eq(userLoginLogs.userId, userId))
    .get();

  if (countResult && countResult.count > 10) {
    // Delete oldest entries beyond the 10 most recent
    const oldest = await db
      .select({ id: userLoginLogs.id })
      .from(userLoginLogs)
      .where(eq(userLoginLogs.userId, userId))
      .orderBy(desc(userLoginLogs.loginAt))
      .offset(10)
      .all();

    for (const row of oldest) {
      await db.delete(userLoginLogs).where(eq(userLoginLogs.id, row.id));
    }
  }

  return NextResponse.json({ ok: true });
}
