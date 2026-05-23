"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SmartCardImage } from "@/components/cards/smart-card-image";
import { UserIcon } from "lucide-react";

type TradeCard = {
  id: string;
  userId: string;
  name: string;
  setName: string | null;
  year: number | null;
  sportGenre: string;
  cardNumber: string | null;
  variant: string | null;
  gradeCompany: string | null;
  gradeValue: string | null;
  condition: string | null;
  photoUrl: string | null;
  isTradeBait: boolean;
  ownerName: string;
  ownerUsername: string | null;
};

const GENRES = [
  { value: "all",        label: "All" },
  { value: "basketball", label: "🏀 Basketball" },
  { value: "baseball",   label: "⚾ Baseball" },
  { value: "football",   label: "🏈 Football" },
  { value: "soccer",     label: "⚽ Soccer" },
  { value: "hockey",     label: "🏒 Hockey" },
  { value: "pokemon",    label: "⚡ Pokémon" },
  { value: "yugioh",     label: "🌟 Yu-Gi-Oh!" },
  { value: "magic",      label: "🔮 Magic" },
  { value: "other",      label: "📦 Other" },
];

const GRADE_COLORS: Record<string, string> = {
  PSA: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  BGS: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Beckett: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  CGC: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  CSG: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  SGC: "bg-red-500/15 text-red-400 border-red-500/30",
  HGA: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

export function TradeBoardClient({ trade }: { trade: TradeCard[] }) {
  const [activeGenre, setActiveGenre] = useState("all");
  const [search, setSearch] = useState("");

  const activeGenres = useMemo(() => [...new Set(trade.map((c) => c.sportGenre))], [trade]);
  const visibleGenres = GENRES.filter((g) => g.value === "all" || activeGenres.includes(g.value));

  const filtered = useMemo(() => {
    return trade.filter((c) => {
      if (activeGenre !== "all" && c.sportGenre !== activeGenre) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [trade, activeGenre, search]);

  if (trade.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <div className="text-4xl">🔄</div>
        <h2 className="text-lg font-semibold">No trade bait yet</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          When collectors mark cards as available to trade and make their collection public, they'll appear here.
        </p>
        <Link
          href="/cards"
          className="mt-2 text-sm text-primary hover:underline"
        >
          Go to your collection →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {visibleGenres.map((g) => (
            <button
              key={g.value}
              onClick={() => setActiveGenre(g.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                activeGenre === g.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search cards…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-full sm:w-48 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} card{filtered.length !== 1 ? "s" : ""} available</p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-12 text-center">No cards match your filter.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((card) => (
            <div key={card.id} className="group">
              <div className="relative aspect-[5/7] rounded-xl overflow-hidden border border-border bg-muted">
                <SmartCardImage
                  src={card.photoUrl ?? undefined}
                  alt={card.name}
                  containerClassName="w-full h-full"
                  fitMode="cover"
                />
                <div className="absolute top-1.5 right-1.5">
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Trade
                  </span>
                </div>
              </div>
              <div className="mt-2 space-y-0.5">
                <p className="text-xs font-semibold leading-tight truncate">{card.name}</p>
                {(card.year || card.setName) && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {[card.year, card.setName].filter(Boolean).join(" · ")}
                  </p>
                )}
                {card.gradeCompany && card.gradeValue ? (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${GRADE_COLORS[card.gradeCompany] ?? "bg-muted text-muted-foreground border-border"}`}>
                    {card.gradeCompany} {card.gradeValue}
                  </span>
                ) : card.condition ? (
                  <span className="inline-flex text-[10px] text-muted-foreground">
                    {card.condition.replace(/_/g, " ")}
                  </span>
                ) : null}
                {card.ownerUsername ? (
                  <Link
                    href={`/u/${card.ownerUsername}`}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                  >
                    <UserIcon className="h-2.5 w-2.5" />
                    <span className="truncate">{card.ownerName}</span>
                  </Link>
                ) : (
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                    <UserIcon className="h-2.5 w-2.5" />
                    <span className="truncate">{card.ownerName}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
