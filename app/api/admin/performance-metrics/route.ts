import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { perfSnapshot } from "@/lib/security-metrics";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .get();
  if (!me || me.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(perfSnapshot());
}
