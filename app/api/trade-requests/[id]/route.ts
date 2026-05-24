import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tradeRequests, notifications, cards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** PATCH /api/trade-requests/[id] — accept or deny a trade request */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  const body = await req.json() as { action: "accept" | "deny"; responseMessage?: string };
  if (!body.action || !["accept", "deny"].includes(body.action)) {
    return NextResponse.json({ error: "action must be 'accept' or 'deny'" }, { status: 400 });
  }

  // Ensure the request belongs to this user as the recipient
  const [request] = await db
    .select()
    .from(tradeRequests)
    .where(and(eq(tradeRequests.id, id), eq(tradeRequests.toUserId, userId)))
    .limit(1)
    .all();

  if (!request) {
    return NextResponse.json({ error: "Trade request not found" }, { status: 404 });
  }
  if (request.status !== "pending") {
    return NextResponse.json({ error: "Trade request is no longer pending" }, { status: 409 });
  }

  const newStatus = body.action === "accept" ? "accepted" : "denied";
  const [updated] = await db
    .update(tradeRequests)
    .set({
      status: newStatus,
      responseMessage: body.responseMessage ?? null,
      updatedAt: new Date(),
    })
    .where(eq(tradeRequests.id, id))
    .returning();

  // Get card name for notification
  const [cardInfo] = await db
    .select({ name: cards.name })
    .from(cards)
    .where(eq(cards.id, request.targetCardId))
    .limit(1)
    .all();

  const cardName = cardInfo?.name ?? "your requested card";
  const emoji = body.action === "accept" ? "✅" : "❌";
  const verb = body.action === "accept" ? "accepted" : "declined";

  // Notify the requester
  await db.insert(notifications).values({
    userId: request.fromUserId,
    message: `${emoji} Your trade request for **${cardName}** was ${verb}`,
    cardId: request.targetCardId,
    type: "trade_request",
    read: false,
  });

  return NextResponse.json(updated);
}
