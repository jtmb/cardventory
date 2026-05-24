import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { users, cards, settings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { PublicCollectionClient } from "./public-collection-client";
import { AppBanner } from "@/components/app-banner";
import { AppLogo } from "@/components/app-logo";
import { LayersIcon, ArrowRightLeftIcon, SparklesIcon } from "lucide-react";

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
  return { title: `@${username}'s Collection · Cardventory` };
}

export default async function PublicProfilePage(
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const session = await auth();
  const isSignedIn = !!session?.user;

  const user = await db
    .select({ id: users.id, name: users.name, username: users.username, profilePublic: users.profilePublic })
    .from(users)
    .where(eq(users.username, username))
    .get();

  if (!user || !user.profilePublic) notFound();

  const isOwner = session?.user?.id === user.id;

  const allCards = await db
    .select()
    .from(cards)
    .where(and(eq(cards.userId, user.id), eq(cards.status, "owned")))
    .all();

  const tradeBaitOnlySetting = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.userId, user.id), eq(settings.key, "profile_trade_bait_only")))
    .get();
  const tradeBaitOnly = tradeBaitOnlySetting?.value === "true";

  const collection = tradeBaitOnly ? allCards.filter((c) => c.isTradeBait) : allCards;
  // Passed to client: owners see all cards; visitors only see the filtered set
  const clientCards = isOwner ? allCards : collection;

  const tradeBaitCount = collection.filter((c) => c.isTradeBait).length;
  const genres = [...new Set(collection.map((c) => c.sportGenre).filter(Boolean))];
  const initials = (user.username ?? username).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-dvh" style={{ background: "oklch(0.08 0.01 260)" }}>
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b" style={{ borderColor: "oklch(0.2 0.01 260)", background: "oklch(0.08 0.01 260 / 0.85)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold tracking-tight">
            <AppBanner logoSize="sm" textStyle={{ color: "oklch(0.914 0 0)" }} maxSize="2xl" />
          </Link>
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all hover:opacity-90 active:scale-95"
              style={{ background: "oklch(0.55 0.18 260)", color: "oklch(0.98 0.01 260)" }}
            >
              Go to app
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all hover:opacity-90 active:scale-95"
              style={{ background: "oklch(0.55 0.18 260)", color: "oklch(0.98 0.01 260)" }}
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.12 0.04 260) 0%, oklch(0.10 0.06 280) 50%, oklch(0.09 0.03 240) 100%)" }}>
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "repeating-linear-gradient(0deg, white 0px, white 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, white 0px, white 1px, transparent 1px, transparent 40px)" }} />
        <div className="relative max-w-6xl mx-auto px-5 py-12">
          <div className="flex items-center gap-6">
            <div
              className="shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl"
              style={{ background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.45 0.15 280))", boxShadow: "0 0 0 2px oklch(0.4 0.12 260), 0 8px 32px oklch(0.03 0.05 260)" }}
            >
              <span style={{ color: "oklch(0.98 0.01 260)" }}>{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-black tracking-tight leading-none" style={{ color: "oklch(0.97 0.01 260)" }}>@{user.username}</h1>
              <div className="flex flex-wrap gap-2 mt-4">
                <StatChip icon={<LayersIcon className="h-3.5 w-3.5" />} label={`${collection.length} ${collection.length === 1 ? "card" : "cards"}`} />
                {tradeBaitCount > 0 && (
                  <StatChip icon={<ArrowRightLeftIcon className="h-3.5 w-3.5" />} label={`${tradeBaitCount} for trade`} accent />
                )}
                {genres.length > 0 && (
                  <StatChip icon={<SparklesIcon className="h-3.5 w-3.5" />} label={genres.slice(0, 3).join(" · ")} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-5 py-8 pb-20">
        <PublicCollectionClient
          cards={clientCards}
          isOwner={isOwner}
          tradeBaitOnly={tradeBaitOnly}
          isSignedIn={isSignedIn}
          ownerUsername={username}
        />
      </main>

      <footer className="border-t py-10 text-center" style={{ borderColor: "oklch(0.16 0.01 260)" }}>
        <Link href="/" className="inline-flex items-center gap-2 transition-opacity hover:opacity-80" style={{ color: "oklch(0.55 0.04 260)" }}>
          <AppLogo size="sm" />
          <span className="text-xs font-medium">Powered by Cardventory</span>
        </Link>
      </footer>
    </div>
  );
}

function StatChip({ icon, label, accent }: { icon: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
      style={accent
        ? { background: "oklch(0.22 0.12 160 / 0.4)", borderColor: "oklch(0.45 0.18 160 / 0.5)", color: "oklch(0.75 0.18 160)" }
        : { background: "oklch(0.14 0.02 260)", borderColor: "oklch(0.22 0.02 260)", color: "oklch(0.65 0.04 260)" }
      }
    >
      {icon}{label}
    </span>
  );
}
