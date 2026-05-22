"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { PlusCircleIcon, ChevronDownIcon } from "lucide-react";
import { RefreshAllButton } from "@/components/cards/refresh-all-button";
import { SearchInput } from "@/components/cards/search-input";
import { FiltersButton } from "@/components/cards/filters-button";
import { CsvToolbar } from "@/components/cards/csv-toolbar";
import { MobileCardActionsMenu } from "@/components/cards/mobile-card-actions";
import { cn } from "@/lib/utils";

export interface CardsToolbarProps {
  /** Icon + label rendered as the page header on the left */
  header: ReactNode;
  /** Total card count shown beside the header */
  total: number;
  /** Base URL path — /cards or /watchlist */
  basePath: string;
  /** href for the primary "Add" button */
  addHref: string;
  /** Label for the primary "Add" button */
  addLabel: string;
  /** Export CSV href */
  exportHref: string;
  /** Genres that have at least one card */
  activeGenres: string[];
  /** Current search query */
  q?: string;
  /** Current active genre tab */
  genre?: string;
  /** Current sort value */
  sort?: string;
  /** Current grade filter */
  grade?: string;
  /** Show the Refresh All Prices button (owned cards only) */
  showRefresh?: boolean;
  /** data-tour-id for e2e / onboarding */
  tourId?: string;
}

export function CardsToolbar({
  header,
  total,
  basePath,
  addHref,
  addLabel,
  exportHref,
  activeGenres,
  q,
  genre,
  sort,
  grade,
  showRefresh = false,
  tourId,
}: CardsToolbarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border-b border-border" data-tour-id={tourId}>
      {/* ── Primary row ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-2 h-12 md:h-14">

        {/* Mobile: title is a toggle button */}
        <button
          type="button"
          className="md:hidden flex items-center gap-1.5 min-w-0"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2 shrink-0">
            {header}
            {total > 0 && <span className="text-xs text-muted-foreground">({total})</span>}
          </div>
          <ChevronDownIcon
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </button>

        {/* Desktop: static title */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {header}
          {total > 0 && <span className="text-xs text-muted-foreground">({total})</span>}
        </div>

        {/* Desktop: full toolbar always visible */}
        <div className="hidden md:flex items-center gap-2 flex-1">
          <div className="w-px h-5 bg-border/60 shrink-0" />
          <Link
            href={addHref}
            data-tour-id={addHref === "/cards/add" ? "toolbar-add-card" : undefined}
            aria-label={addLabel}
            className="flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <PlusCircleIcon className="h-4 w-4" />
          </Link>
          {showRefresh && <RefreshAllButton />}
          <div className="w-px h-5 bg-border/60 shrink-0" />
          <CsvToolbar exportHref={exportHref} />
          <div className="w-px h-5 bg-border/60 shrink-0" />
          <FiltersButton
            activeGrade={grade}
            currentSort={sort}
            genre={genre}
            search={q}
            basePath={basePath}
            activeGenres={activeGenres}
          />
          <div className="ml-auto">
            <SearchInput defaultValue={q} genre={genre} basePath={basePath} />
          </div>
        </div>

        {/* Mobile: + add button always visible on the far right */}
        <Link
          href={addHref}
          data-tour-id={addHref === "/cards/add" ? "toolbar-add-card" : undefined}
          aria-label={addLabel}
          className="md:hidden ml-auto flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <PlusCircleIcon className="h-4 w-4" />
        </Link>
      </div>

      {/* ── Expandable panel (mobile only) ──────────────────── */}
      {expanded && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-2.5">
          <SearchInput defaultValue={q} genre={genre} basePath={basePath} fullWidth />
          <div className="flex items-center gap-2">
            {showRefresh && <RefreshAllButton />}
            <FiltersButton
              activeGrade={grade}
              currentSort={sort}
              genre={genre}
              search={q}
              basePath={basePath}
              activeGenres={activeGenres}
            />
            <MobileCardActionsMenu
              exportHref={exportHref}
              basePath={basePath}
              addHref={addHref}
            />
          </div>
        </div>
      )}
    </div>
  );
}
