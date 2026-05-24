import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cards, users } from "@/lib/db/schema";
import { eq, and, or, like } from "drizzle-orm";
import { redirect } from "next/navigation";
import { TradeBoardShell } from "./trade-board-client";
import { ArrowRightLeftIcon } from "lucide-react";
import type { Card } from "@/lib/db/schema";

export const metadata = { title: "Trade Board · Cardventory" };

export default async function TradeBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; q?: string; sort?: string; grade?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { genre, q, sort, grade } = await searchParams;

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
      purchasePrice: cards.purchasePrice,
      notes: cards.notes,
      photoUrl: cards.photoUrl,
      status: cards.status,
      isTradeBait: cards.isTradeBait,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt,
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

  // Exclude own cards
  let tradeCards = rows.filter((r) => r.userId !== session.user!.id);

  // Build ownerMap before filtering
  const ownerMap: Record<string, { name: string; username: string | null; userId: string }> = {};
  tradeCards.forEach((r) => {
    ownerMap[r.id] = { name: r.ownerName, username: r.ownerUsername, userId: r.userId };
  });

  // Client-side filtering (genre, search, grade)
  if (genre && genre !== "all") {
    tradeCards = tradeCards.filter((c) => c.sportGenre === genre);
  }
  if (grade && grade !== "all") {
    tradeCards = tradeCards.filter((c) => c.gradeCompany === grade);
  }
  if (q) {
    const lq = q.toLowerCase();
    tradeCards = tradeCards.filter((c) =>
      c.name.toLowerCase().includes(lq) ||
      (c.setName ?? "").toLowerCase().includes(lq) ||
      (c.variant ?? "").toLowerCase().includes(lq)
    );
  }

  // Sort
  if (sort === "name_asc") tradeCards.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "name_desc") tradeCards.sort((a, b) => b.name.localeCompare(a.name));
  else if (sort === "year_asc") tradeCards.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  else if (sort === "year_desc") tradeCards.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  else tradeCards.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); // newest first

  // Collect active genres from all trade cards (before filtering)
  const allTradeCards = rows.filter((r) => r.userId !== session.user!.id);
  const activeGenres = [...new Set(allTradeCards.map((c) => c.sportGenre))];

  return (
    <TradeBoardShell
      cards={tradeCards as Card[]}
      ownerMap={ownerMap}
      total={tradeCards.length}
      activeGenres={activeGenres}
      header={<><ArrowRightLeftIcon className="h-6 w-6 text-primary" /><span className="text-2xl font-bold">Trade Board</span></>}
      q={q}
      genre={genre}
      sort={sort}
      grade={grade}
    />
  );
}

