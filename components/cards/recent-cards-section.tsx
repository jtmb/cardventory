"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutGridIcon, LayoutListIcon, ListIcon } from "lucide-react";
import { MiniCardRow } from "./mini-card-row";
import type { Card } from "@/lib/db/schema";

type ViewMode = "row" | "grid" | "compact";
const LS_KEY = "cv_dash_recent_view";

const GENRE_LABELS: Record<string, string> = {
  basketball: "Basketball", baseball: "Baseball", football: "Football",
  soccer: "Soccer", hockey: "Hockey", pokemon: "Pokémon",
  yugioh: "Yu-Gi-Oh!", magic: "MTG", other: "Other",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

/** Card tile used in grid view — lightweight, no price fetching */
function MiniCardTile({ card }: { card: Card }) {
  return (
    <Link href={`/cards/${card.id}`} className="block group">
      <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200">
        <div className="relative w-full aspect-[5/7] bg-muted/60 overflow-hidden">
          {card.photoUrl ? (
            <Image
              src={card.photoUrl}
              alt={card.name}
              fill
              className="object-contain p-1 group-hover:scale-[1.03] transition-transform duration-300"
              unoptimized={card.photoUrl.startsWith("http")}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-3xl opacity-20">🃏</span>
            </div>
          )}
          {card.gradeCompany && card.gradeValue && (
            <div className="absolute top-1.5 right-1.5 bg-amber-500 text-black text-[10px] font-bold px-1 py-0.5 rounded shadow-md leading-tight">
              {card.gradeCompany} {card.gradeValue}
            </div>
          )}
        </div>
        <div className="p-2 border-t border-border/60">
          <p className="text-xs font-semibold line-clamp-2 leading-tight">{card.name}</p>
          {(card.year || card.setName) && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {[card.year, card.setName].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Dense text-only row used in compact view */
function MiniCardCompact({ card }: { card: Card }) {
  return (
    <Link href={`/cards/${card.id}`}>
      <div className="flex items-center gap-3 px-3 py-2 hover:bg-muted/60 transition-colors">
        <span className="shrink-0 w-20 text-xs text-muted-foreground truncate">
          {GENRE_LABELS[card.sportGenre] ?? card.sportGenre}
        </span>
        <span className="flex-1 text-sm font-medium truncate">{card.name}</span>
        {card.year && (
          <span className="shrink-0 text-xs text-muted-foreground">{card.year}</span>
        )}
        {card.purchasePrice != null && card.purchasePrice > 0 && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {fmt(card.purchasePrice)}
          </span>
        )}
      </div>
    </Link>
  );
}

export function RecentCardsSection({ cards }: { cards: Card[] }) {
  const [view, setView] = useState<ViewMode>("row");
  const [rowPage, setRowPage] = useState(1);

  const ROW_PAGE_SIZE = 4;
  const rowPageCount = Math.max(1, Math.ceil(cards.length / ROW_PAGE_SIZE));
  const rowSlice = cards.slice((rowPage - 1) * ROW_PAGE_SIZE, rowPage * ROW_PAGE_SIZE);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY) as ViewMode | null;
    if (stored) setView(stored);
  }, []);

  function setViewMode(v: ViewMode) {
    setView(v);
    setRowPage(1);
    localStorage.setItem(LS_KEY, v);
  }

  const btnBase = "flex items-center justify-center h-6 w-6 rounded transition-colors";
  const btnActive = "bg-background text-foreground shadow-sm";
  const btnInactive = "text-muted-foreground hover:text-foreground";

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Recently Added</h2>
        <div className="flex items-center gap-3">
          {/* View mode toggle pill */}
          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
            <button
              onClick={() => setViewMode("row")}
              className={`${btnBase} ${view === "row" ? btnActive : btnInactive}`}
              title="Row view"
            >
              <LayoutListIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`${btnBase} ${view === "grid" ? btnActive : btnInactive}`}
              title="Grid view"
            >
              <LayoutGridIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("compact")}
              className={`${btnBase} ${view === "compact" ? btnActive : btnInactive}`}
              title="Compact view"
            >
              <ListIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <Link href="/cards" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
      </div>

      {view === "row" && (
        <>
          <div className="space-y-2">
            {rowSlice.map((card) => (
              <MiniCardRow key={card.id} card={card} />
            ))}
          </div>
          {rowPageCount > 1 && (
            <div className="flex items-center justify-between mt-3 px-0.5">
              <span className="text-xs text-muted-foreground">
                {(rowPage - 1) * ROW_PAGE_SIZE + 1}–{Math.min(rowPage * ROW_PAGE_SIZE, cards.length)} of {cards.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRowPage((p) => Math.max(1, p - 1))}
                  disabled={rowPage === 1}
                  className="h-6 px-2.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <span className="text-xs text-muted-foreground px-1">{rowPage} / {rowPageCount}</span>
                <button
                  onClick={() => setRowPage((p) => Math.min(rowPageCount, p + 1))}
                  disabled={rowPage === rowPageCount}
                  className="h-6 px-2.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {cards.map((card) => (
            <MiniCardTile key={card.id} card={card} />
          ))}
        </div>
      )}

      {view === "compact" && (
        <div className="rounded-lg border border-border bg-card divide-y divide-border/50 overflow-hidden">
          {cards.map((card) => (
            <MiniCardCompact key={card.id} card={card} />
          ))}
        </div>
      )}
    </section>
  );
}
