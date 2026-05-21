import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { restoreBackup } from "@/lib/backup";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { name } = await params;
    await restoreBackup(name);
    return NextResponse.json({
      success: true,
      message:
        "Backup restored successfully. Restart the server to reload the database.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Restore failed" },
      { status: 500 }
    );
  }
}
