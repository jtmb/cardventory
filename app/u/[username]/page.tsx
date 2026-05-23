import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { users, cards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";
import { PublicCollectionClient } from "./public-collection-client";

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> }
): Promise<Metadata> {
  const { username } = await params;
  const user = await db
    .select({ name: users.name, profilePublic: users.profilePublic })
    .from(users)
    .where(eq(users.username, username))
    .get();
  if (!user?.profilePublic) return { title: "Collection Not Found" };
  return { title: `${user.name}'s Collection · Cardventory` };
}

export default async function PublicProfilePage(
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await db
    .select({ id: users.id, name: users.name, username: users.username, profilePublic: users.profilePublic })
    .from(users)
    .where(eq(users.username, username))
    .get();

  if (!user || !user.profilePublic) notFound();

  const collection = await db
    .select()
    .from(cards)
    .where(and(eq(cards.userId, user.id), eq(cards.status, "owned")))
    .all();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <span className="text-base">🃏</span>
            Cardventory
          </Link>
          <Link
            href="/login"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            @{user.username} · {collection.length} {collection.length === 1 ? "card" : "cards"}
          </p>
        </div>

        <PublicCollectionClient cards={collection} />
      </main>
    </div>
  );
}
