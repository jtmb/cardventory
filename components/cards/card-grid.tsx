"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare2Icon, Trash2Icon, XIcon, LayoutGridIcon, LayoutListIcon, ListIcon, DownloadIcon, TagIcon, BookmarkIcon, BookmarkCheckIcon, ActivityIcon, ArrowRightLeftIcon } from "lucide-react";
import { CardRow, CardRowSkeleton } from "./card-row";
import type { Card } from "@/lib/db/schema";
import { Button, buttonVariants } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";
import { PlusCircleIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteCards, updateCardsGenre, updateCardsStatus, updateCardsTradeBait } from "@/lib/actions";
import { toast } from "sonner";

const GENRES = [
  { value: "basketball", label: "Basketball" },
  { value: "baseball", label: "Baseball" },
  { value: "football", label: "Football" },
  { value: "soccer", label: "Soccer" },
  { value: "hockey", label: "Hockey" },
  { value: "pokemon", label: "Pokémon" },
  { value: "yugioh", label: "Yu-Gi-Oh!" },
  { value: "magic", label: "Magic: The Gathering" },
  { value: "other", label: "Other" },
];

type ViewMode = "grid" | "list" | "compact";
const VIEW_LS_KEY = "cv_cards_view";
const SPARKLINE_LS_KEY = "cv_cards_sparkline";
const GRID_SIZE_LS_KEY = "cv_cards_grid_size";

// Maps slider value (2–7) to Tailwind grid-cols class
// Values 2 and 3 apply directly on mobile (no breakpoint prefix) so the slider
// actually does something on small screens. Values 4+ start at 3 cols on mobile.
const GRID_COLS_CLASS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-3 md:grid-cols-4",
  5: "grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
  6: "grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  7: "grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7",
};

export function CardGrid({ cards, exportHref }: { cards: Card[]; exportHref?: string }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<ViewMode>("grid");
  const [genrePickerOpen, setGenrePickerOpen] = useState(false);
  const [showPriceBadges, setShowPriceBadges] = useState(true);
  const [showSparkline, setShowSparkline] = useState(true);
  const [gridSize, setGridSize] = useState(6); // default 6 columns
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_LS_KEY) as ViewMode | null;
    if (stored) setView(stored);
    const storedSparkline = localStorage.getItem(SPARKLINE_LS_KEY);
    if (storedSparkline !== null) setShowSparkline(storedSparkline !== "false");
    const storedSize = localStorage.getItem(GRID_SIZE_LS_KEY);
    if (storedSize) setGridSize(Math.min(7, Math.max(2, Number(storedSize))) || 5);
    // Load price badge preference
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.price_badges !== undefined) setShowPriceBadges(d.price_badges !== "false"); })
      .catch(() => {});
  }, []);

  function setViewMode(v: ViewMode) {
    setView(v);
    localStorage.setItem(VIEW_LS_KEY, v);
  }

  function toggleSparkline() {
    setShowSparkline((v) => {
      localStorage.setItem(SPARKLINE_LS_KEY, String(!v));
      return !v;
    });
  }

  function toggleCard(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(cards.map((c) => c.id)));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
    setGenrePickerOpen(false);
  }

  function handleDeleteSelected() {
    startTransition(async () => {
      await deleteCards([...selectedIds]);
      exitSelectMode();
      router.refresh();
    });
  }

  function handleExportSelected() {
    const ids = [...selectedIds].join(",");
    window.location.href = `/api/cards/export?ids=${encodeURIComponent(ids)}`;
  }

  function handleGenreChange(genre: string) {
    const ids = [...selectedIds];
    startTransition(async () => {
      await updateCardsGenre(ids, genre);
      toast.success(`Genre updated for ${ids.length} ${ids.length === 1 ? "card" : "cards"}`);
      setGenrePickerOpen(false);
      exitSelectMode();
      router.refresh();
    });
  }

  function handleMarkWanted() {
    const ids = [...selectedIds];
    startTransition(async () => {
      await updateCardsStatus(ids, "wanted");
      toast.success(`${ids.length} ${ids.length === 1 ? "card" : "cards"} moved to Watchlist`);
      exitSelectMode();
      router.refresh();
    });
  }

  function handleMarkOwned() {
    const ids = [...selectedIds];
    startTransition(async () => {
      await updateCardsStatus(ids, "owned");
      toast.success(`${ids.length} ${ids.length === 1 ? "card" : "cards"} marked as Owned`);
      exitSelectMode();
      router.refresh();
    });
  }

  function handleToggleTradeBait(isTradeBait: boolean) {
    const ids = [...selectedIds];
    startTransition(async () => {
      await updateCardsTradeBait(ids, isTradeBait);
      toast.success(isTradeBait ? `${ids.length} ${ids.length === 1 ? "card" : "cards"} marked as Trade Bait` : `Trade Bait removed from ${ids.length} ${ids.length === 1 ? "card" : "cards"}`);
      exitSelectMode();
      router.refresh();
    });
  }

  const count = selectedIds.size;
  // Determine if any selected card is "wanted" to decide toggle label
  const selectedCards = cards.filter((c) => selectedIds.has(c.id));
  const allOwned = selectedCards.every((c) => c.status === "owned");
  const allWanted = selectedCards.every((c) => c.status === "wanted");

  return (
    <>
      {/* Select mode toolbar */}
      <div className="flex items-center justify-between min-h-[2rem]">
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <button
                onClick={exitSelectMode}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <XIcon className="h-4 w-4" /> Cancel
              </button>
              <span className="text-sm text-muted-foreground">
                {count === 0 ? "No cards selected" : `${count} ${count === 1 ? "card" : "cards"} selected`}
              </span>
              {count < cards.length && (
                <button onClick={selectAll} className="text-sm text-primary hover:underline">
                  Select all
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setSelectMode(true)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckSquare2Icon className="h-4 w-4" /> Select
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle — hidden on mobile while selecting to save space */}
          <div className={cn("items-center gap-0.5 bg-muted rounded-md p-0.5", selectMode ? "hidden md:flex" : "flex")}>
            {/* Sparkline toggle — leftmost in pill, grid view only */}
            {view === "grid" && (
              <button
                onClick={toggleSparkline}
                title={showSparkline ? "Hide price sparkline" : "Show price sparkline"}
                className={`flex items-center justify-center h-6 w-6 rounded transition-colors ${
                  showSparkline ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ActivityIcon className="h-3.5 w-3.5" />
              </button>
            )}

            {([
              { v: "grid" as const,    icon: <LayoutGridIcon className="h-3.5 w-3.5" />, title: "Grid view" },
              { v: "list" as const,    icon: <LayoutListIcon className="h-3.5 w-3.5" />, title: "List view" },
              { v: "compact" as const, icon: <ListIcon className="h-3.5 w-3.5" />,       title: "Compact view" },
            ] as const).map(({ v, icon, title }) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                title={title}
                className={`flex items-center justify-center h-6 w-6 rounded transition-colors ${
                  view === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {icon}
              </button>
            ))}

            {/* Grid size slider — inside the toggle pill, grid view only */}
            {view === "grid" && !selectMode && (
              <>
                <div className="w-px h-3.5 bg-border/60 mx-0.5" />
                <input
                  type="range"
                  min={2}
                  max={7}
                  step={1}
                  value={gridSize}
                  list="cv-grid-size-ticks"
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setGridSize(v);
                    localStorage.setItem(GRID_SIZE_LS_KEY, String(v));
                  }}
                  title={`Grid: ${gridSize} columns`}
                  className={cn(
                    "w-14 cursor-pointer appearance-none mx-1",
                    "[&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted-foreground/30",
                    "[&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted-foreground/30",
                    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:-mt-[4.5px]",
                    "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
                  )}
                />
                <datalist id="cv-grid-size-ticks">
                  {[2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n} />)}
                </datalist>
              </>
            )}
          </div>

          {/* Bulk actions — desktop only when selecting */}
          {selectMode && count > 0 && (
            <div className="hidden md:contents">
              {/* Export selected */}
              <button
                onClick={handleExportSelected}
                disabled={isPending}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                title="Export selected as CSV"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                Export
              </button>

              {/* Change genre */}
              <div className="relative">
                <button
                  onClick={() => setGenrePickerOpen((v) => !v)}
                  disabled={isPending}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                >
                  <TagIcon className="h-3.5 w-3.5" />
                  Genre
                </button>
                {genrePickerOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-border bg-popover shadow-lg py-1">
                    {GENRES.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => handleGenreChange(value)}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mark wanted / owned toggle */}
              {allOwned && (
                <button
                  onClick={handleMarkWanted}
                  disabled={isPending}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                  title="Move to Watchlist"
                >
                  <BookmarkIcon className="h-3.5 w-3.5" />
                  Watchlist
                </button>
              )}
              {allWanted && (
                <button
                  onClick={handleMarkOwned}
                  disabled={isPending}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                  title="Mark as Owned"
                >
                  <BookmarkCheckIcon className="h-3.5 w-3.5" />
                  Mark Owned
                </button>
              )}
              {/* Trade Bait toggle — only for owned cards */}
              {allOwned && (
                <>
                  {selectedCards.every((c) => c.isTradeBait) ? (
                    <button
                      onClick={() => handleToggleTradeBait(false)}
                      disabled={isPending}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-emerald-500 border-emerald-500/40 hover:bg-emerald-500/10")}
                      title="Remove from Trade Bait"
                    >
                      <ArrowRightLeftIcon className="h-3.5 w-3.5" />
                      Remove Trade Bait
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleTradeBait(true)}
                      disabled={isPending}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                      title="Mark as Trade Bait"
                    >
                      <ArrowRightLeftIcon className="h-3.5 w-3.5" />
                      Trade Bait
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {selectMode && (
            <AlertDialog>
              <AlertDialogTrigger
                disabled={count === 0 || isPending}
                className={cn(buttonVariants({ variant: "destructive", size: "sm" }), "gap-1.5")}
              >
                <Trash2Icon className="h-3.5 w-3.5" />
                Delete {count > 0 ? count : ""}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {count} {count === 1 ? "card" : "cards"}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {count === 1 ? "this card" : `these ${count} cards`} and all associated price history. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSelected}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete {count === 1 ? "card" : `${count} cards`}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="relative">
        {isPending && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[2px]">
            <div className="h-14 w-14 rounded-full border-4 border-border border-t-primary animate-spin" />
          </div>
        )}
        {cards.length > 0 ? (
          view === "grid" ? (
            <div className={`grid ${GRID_COLS_CLASS[gridSize] ?? GRID_COLS_CLASS[5]} gap-4`}>
              {cards.map((card) => (
                <CardRow key={card.id} card={card} layout="grid" selectable={selectMode} selected={selectedIds.has(card.id)} onToggle={toggleCard} showPriceBadges={showPriceBadges} showSparkline={showSparkline} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border/60">
              {cards.map((card) => (
                <CardRow key={card.id} card={card} layout={view} selectable={selectMode} selected={selectedIds.has(card.id)} onToggle={toggleCard} />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground text-lg">No cards in this category</p>
            <ButtonLink href="/cards/add" className="mt-4">
              <PlusCircleIcon className="h-4 w-4" /> Add Card
            </ButtonLink>
          </div>
        )}
      </div>
    </>
  );
}
