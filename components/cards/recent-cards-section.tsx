"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutGridIcon, LayoutListIcon, ListIcon, PanelBottomIcon } from "lucide-react";
import { MiniCardRow } from "./mini-card-row";
import { CardRow } from "./card-row";
import type { Card } from "@/lib/db/schema";

type ViewMode = "row" | "grid" | "compact";
const LS_KEY = "cv_dash_recent_view";
const OVERLAY_LS_KEY = "cv_dash_recent_overlay";

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
  const [gridPage, setGridPage] = useState(1);
  const [overlayInfo, setOverlayInfo] = useState(false);

  const ROW_PAGE_SIZE = 4;
  const GRID_PAGE_SIZE = 16;
  const rowPageCount = Math.max(1, Math.ceil(cards.length / ROW_PAGE_SIZE));
  const gridPageCount = Math.max(1, Math.ceil(cards.length / GRID_PAGE_SIZE));
  const rowSlice = cards.slice((rowPage - 1) * ROW_PAGE_SIZE, rowPage * ROW_PAGE_SIZE);
  const gridSlice = cards.slice((gridPage - 1) * GRID_PAGE_SIZE, gridPage * GRID_PAGE_SIZE);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY) as ViewMode | null;
    if (stored) setView(stored);
    const storedOverlay = localStorage.getItem(OVERLAY_LS_KEY);
    if (storedOverlay !== null) setOverlayInfo(storedOverlay === "true");
  }, []);

  function setViewMode(v: ViewMode) {
    setView(v);
    setRowPage(1);
    setGridPage(1);
    localStorage.setItem(LS_KEY, v);
  }

  const btnBase = "flex items-center justify-center h-6 w-6 rounded transition-colors";
  const btnActive = "bg-background text-foreground shadow-sm";
  const btnInactive = "text-muted-foreground hover:text-foreground";

  function toggleOverlay() {
    setOverlayInfo((v) => {
      localStorage.setItem(OVERLAY_LS_KEY, String(!v));
      return !v;
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Recently Added</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Overlay info toggle — grid only */}
            {view === "grid" && (
              <button
                onClick={toggleOverlay}
                title={overlayInfo ? "Show info panel below" : "Pin info to image bottom"}
                className={`${btnBase} ${overlayInfo ? btnActive : btnInactive}`}
              >
                <PanelBottomIcon className="h-3.5 w-3.5" />
              </button>
            )}
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
        <>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {gridSlice.map((card) => (
              <CardRow key={card.id} card={card} layout="grid" infoOverlay={overlayInfo} />
            ))}
          </div>
          {gridPageCount > 1 && (
            <div className="flex items-center justify-between mt-3 px-0.5">
              <span className="text-xs text-muted-foreground">
                {(gridPage - 1) * GRID_PAGE_SIZE + 1}–{Math.min(gridPage * GRID_PAGE_SIZE, cards.length)} of {cards.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setGridPage((p) => Math.max(1, p - 1))}
                  disabled={gridPage === 1}
                  className="h-6 px-2.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <span className="text-xs text-muted-foreground px-1">{gridPage} / {gridPageCount}</span>
                <button
                  onClick={() => setGridPage((p) => Math.min(gridPageCount, p + 1))}
                  disabled={gridPage === gridPageCount}
                  className="h-6 px-2.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
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
