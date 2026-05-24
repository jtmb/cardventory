import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** GET /api/my-cards — returns the current user's owned cards (for trade request overlay) */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myCards = await db
    .select()
    .from(cards)
    .where(and(eq(cards.userId, session.user.id), eq(cards.status, "owned")))
    .all();

  return NextResponse.json(myCards);
}
