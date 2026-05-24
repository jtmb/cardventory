import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tradeRequests, notifications, users, cards } from "@/lib/db/schema";
import { eq, or, and, desc } from "drizzle-orm";

/** GET /api/trade-requests — returns all trade requests for the current user (incoming + outgoing) */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const rows = await db
    .select({
      id: tradeRequests.id,
      fromUserId: tradeRequests.fromUserId,
      toUserId: tradeRequests.toUserId,
      targetCardId: tradeRequests.targetCardId,
      offeredCardIds: tradeRequests.offeredCardIds,
      status: tradeRequests.status,
      message: tradeRequests.message,
      responseMessage: tradeRequests.responseMessage,
      createdAt: tradeRequests.createdAt,
      updatedAt: tradeRequests.updatedAt,
      fromUserName: users.name,
      fromUserUsername: users.username,
      cardName: cards.name,
      cardPhotoUrl: cards.photoUrl,
      cardSetName: cards.setName,
      cardYear: cards.year,
      cardGradeCompany: cards.gradeCompany,
      cardGradeValue: cards.gradeValue,
    })
    .from(tradeRequests)
    .leftJoin(users, eq(tradeRequests.fromUserId, users.id))
    .leftJoin(cards, eq(tradeRequests.targetCardId, cards.id))
    .where(or(eq(tradeRequests.fromUserId, userId), eq(tradeRequests.toUserId, userId)))
    .orderBy(desc(tradeRequests.createdAt))
    .all();

  return NextResponse.json(rows);
}

/** POST /api/trade-requests — create a new trade request */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const fromUserId = session.user.id;

  const body = await req.json() as {
    targetCardId?: string;
    toUserId?: string;
    offeredCardIds?: string[];
    message?: string;
  };

  if (!body.targetCardId || !body.toUserId) {
    return NextResponse.json({ error: "targetCardId and toUserId are required" }, { status: 400 });
  }
  if (body.toUserId === fromUserId) {
    return NextResponse.json({ error: "Cannot request a trade with yourself" }, { status: 400 });
  }

  const offeredCardIds = Array.isArray(body.offeredCardIds) ? body.offeredCardIds : [];

  // Verify the target card belongs to toUserId and is trade bait
  const [targetCard] = await db
    .select({ id: cards.id, userId: cards.userId, isTradeBait: cards.isTradeBait })
    .from(cards)
    .where(and(eq(cards.id, body.targetCardId), eq(cards.userId, body.toUserId)))
    .limit(1)
    .all();

  if (!targetCard) {
    return NextResponse.json({ error: "Target card not found" }, { status: 404 });
  }

  // Check for existing pending request
  const [existing] = await db
    .select({ id: tradeRequests.id })
    .from(tradeRequests)
    .where(
      and(
        eq(tradeRequests.fromUserId, fromUserId),
        eq(tradeRequests.targetCardId, body.targetCardId),
        eq(tradeRequests.status, "pending"),
      )
    )
    .limit(1)
    .all();

  if (existing) {
    return NextResponse.json({ error: "You already have a pending request for this card" }, { status: 409 });
  }

  const [newRequest] = await db
    .insert(tradeRequests)
    .values({
      fromUserId,
      toUserId: body.toUserId,
      targetCardId: body.targetCardId,
      offeredCardIds: JSON.stringify(offeredCardIds),
      message: body.message ?? null,
    })
    .returning();

  // Get sender's name for the notification message
  const [fromUser] = await db
    .select({ name: users.name, username: users.username })
    .from(users)
    .where(eq(users.id, fromUserId))
    .limit(1)
    .all();

  // Notify the recipient
  await db.insert(notifications).values({
    userId: body.toUserId,
    message: `${fromUser?.name ?? "Someone"} wants to trade for your card: ${targetCard ? "" : ""}${body.targetCardId}`,
    cardId: body.targetCardId,
    type: "trade_request",
    read: false,
  });

  // Reload with card name for better notification
  const [cardInfo] = await db
    .select({ name: cards.name })
    .from(cards)
    .where(eq(cards.id, body.targetCardId))
    .limit(1)
    .all();

  if (cardInfo) {
    // Update notification message with card name
    await db
      .update(notifications)
      .set({ message: `${fromUser?.name ?? "Someone"} wants to trade for your **${cardInfo.name}**` })
      .where(
        and(
          eq(notifications.userId, body.toUserId),
          eq(notifications.cardId, body.targetCardId),
          eq(notifications.type, "trade_request"),
        )
      );
  }

  return NextResponse.json(newRequest, { status: 201 });
}
