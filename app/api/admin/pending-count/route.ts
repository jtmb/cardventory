import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ count: 0 }, { status: 403 });
  }

  const [row] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.status, "pending"))
    .all();

  return NextResponse.json({ count: row?.count ?? 0 });
}
