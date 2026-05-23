import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, cards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await db
    .select({ id: users.id, name: users.name, username: users.username, profilePublic: users.profilePublic })
    .from(users)
    .where(eq(users.username, username))
    .get();

  if (!user || !user.profilePublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const collection = await db
    .select()
    .from(cards)
    .where(and(eq(cards.userId, user.id), eq(cards.status, "owned")))
    .all();

  return NextResponse.json({
    user: { name: user.name, username: user.username },
    cards: collection,
  });
}
