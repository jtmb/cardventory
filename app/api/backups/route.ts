import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createBackup, listBackups, initBackupSchedulerFromDb } from "@/lib/backup";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Lazily start the scheduler on first request
  initBackupSchedulerFromDb();
  return NextResponse.json(listBackups());
}

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const info = await createBackup("manual");
    return NextResponse.json(info);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Backup failed" },
      { status: 500 }
    );
  }
}
