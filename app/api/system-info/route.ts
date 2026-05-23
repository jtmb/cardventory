import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const startedAt = new Date(Date.now() - process.uptime() * 1000).toISOString();
  const uptimeSeconds = Math.floor(process.uptime());

  let dbSizeBytes: number | null = null;
  try {
    const dbPath = process.env.DATABASE_PATH ?? "./data/cardventory.db";
    dbSizeBytes = fs.statSync(dbPath).size;
  } catch {
    // db path not accessible — non-fatal
  }

  return NextResponse.json({
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
    nodeVersion: process.version,
    platform: process.platform,
    startedAt,
    uptimeSeconds,
    dbSizeBytes,
  });
}
