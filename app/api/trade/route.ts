import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cards, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: cards.id,
      userId: cards.userId,
      name: cards.name,
      setName: cards.setName,
      year: cards.year,
      sportGenre: cards.sportGenre,
      cardNumber: cards.cardNumber,
      variant: cards.variant,
      gradeCompany: cards.gradeCompany,
      gradeValue: cards.gradeValue,
      condition: cards.condition,
      photoUrl: cards.photoUrl,
      isTradeBait: cards.isTradeBait,
      ownerName: users.name,
      ownerUsername: users.username,
    })
    .from(cards)
    .innerJoin(users, eq(cards.userId, users.id))
    .where(
      and(
        eq(cards.isTradeBait, true),
        eq(cards.status, "owned"),
        eq(users.profilePublic, true),
      )
    )
    .all();

  // Exclude the current user's own cards
  const trade = rows.filter((r) => r.userId !== session.user!.id);

  return NextResponse.json({ trade });
}
