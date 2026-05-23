import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cards, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { TradeBoardClient } from "./trade-board-client";
import { ArrowRightLeftIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Trade Board · Cardventory" };

export default async function TradeBoardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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

  const trade = rows.filter((r) => r.userId !== session.user!.id);

  // Fetch own user record for profile link
  const ownUser = await db
    .select({ username: users.username, profilePublic: users.profilePublic })
    .from(users)
    .where(eq(users.id, session.user!.id))
    .get();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ArrowRightLeftIcon className="h-6 w-6 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Trade Board</h1>
          <p className="text-sm text-muted-foreground">Cards other collectors are willing to trade</p>
        </div>
        {ownUser?.profilePublic && ownUser?.username && (
          <Link
            href={`/u/${ownUser.username}`}
            target="_blank"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ExternalLinkIcon className="h-4 w-4" />
            My Profile
          </Link>
        )}
      </div>
      <TradeBoardClient trade={trade} />
    </div>
  );
}
