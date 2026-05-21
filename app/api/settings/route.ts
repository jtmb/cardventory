import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllSettings, setSetting } from "@/lib/actions";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await getAllSettings();
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") {
      await setSetting(key, value);
    }
  }

  return NextResponse.json({ success: true });
}
