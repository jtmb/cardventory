"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { PlusCircleIcon, ChevronDownIcon } from "lucide-react";
import { SearchInput } from "@/components/cards/search-input";
import { FiltersButton } from "@/components/cards/filters-button";
import { CsvButton } from "@/components/cards/csv-button";
import { cn } from "@/lib/utils";

export interface CardsToolbarProps {
  /** Icon + label rendered as the page header on the left */
  header: ReactNode;
  /** Total card count shown beside the header */
  total: number;
  /** Base URL path — /cards or /watchlist */
  basePath: string;
  /** href for the primary "Add" button — omit to hide the add button */
  addHref?: string;
  /** Label for the primary "Add" button */
  addLabel?: string;
  /** Export CSV href — omit to hide the export button */
  exportHref?: string;
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
  /** data-tour-id for e2e / onboarding */
  tourId?: string;
  /** When provided, renders a button instead of a Link for the Add action */
  onAddClick?: () => void;
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
  tourId,
  onAddClick,
}: CardsToolbarProps) {
  const showAdd = !!(addHref || onAddClick);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="pt-6" data-tour-id={tourId}>
      {/* ── Primary row ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-2 h-12 md:h-14">

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

        {/* Desktop: static title — hidden; rendered inside toolbar flex row instead */}
        <div className="hidden items-center gap-2 shrink-0">
          {header}
          {total > 0 && <span className="text-xs text-muted-foreground">({total})</span>}
        </div>

        {/* Desktop: full toolbar always visible */}
        <div className="hidden md:flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2 shrink-0">
            {header}
            {total > 0 && <span className="text-xs text-muted-foreground">({total})</span>}
          </div>
          <div className="w-px h-5 bg-border/60 shrink-0" />
          <div className="flex-1" />
          <div className="w-px h-5 bg-border/60 shrink-0" />
          <div className="flex items-center gap-1.5">
            <SearchInput defaultValue={q} genre={genre} basePath={basePath} />
            <FiltersButton
              activeGrade={grade}
              currentSort={sort}
              genre={genre}
              search={q}
              basePath={basePath}
              activeGenres={activeGenres}
            />
            <div className="w-px h-5 bg-border/60 shrink-0" />
            {exportHref && <CsvButton exportHref={exportHref} iconOnly />}
            {showAdd && <div className="w-px h-5 bg-border/60 shrink-0" />}
            {showAdd && (onAddClick ? (
              <button
                type="button"
                onClick={onAddClick}
                data-tour-id={addHref === "/cards/add" ? "toolbar-add-card" : undefined}
                aria-label={addLabel}
                className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <PlusCircleIcon className="h-4 w-4" />
              </button>
            ) : addHref ? (
              <Link
                href={addHref}
                data-tour-id={addHref === "/cards/add" ? "toolbar-add-card" : undefined}
                aria-label={addLabel}
                className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <PlusCircleIcon className="h-4 w-4" />
              </Link>
            ) : null)}
          </div>
        </div>

        {/* Mobile: refresh + add button always visible on the far right */}
        <div className="md:hidden ml-auto flex items-center gap-1.5 shrink-0">
          {showAdd && (onAddClick ? (
            <button
              type="button"
              onClick={onAddClick}
              aria-label={addLabel}
              className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <PlusCircleIcon className="h-4 w-4" />
            </button>
          ) : addHref ? (
            <Link
              href={addHref}
              data-tour-id={addHref === "/cards/add" ? "toolbar-add-card" : undefined}
              aria-label={addLabel}
              className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <PlusCircleIcon className="h-4 w-4" />
            </Link>
          ) : null)}
        </div>
      </div>

      {/* ── Expandable panel (mobile only) ──────────────────── */}
      {expanded && (
        <div className="md:hidden border-t border-border px-6 py-3 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <div className="flex-1">
              <SearchInput defaultValue={q} genre={genre} basePath={basePath} fullWidth />
            </div>
            <FiltersButton
              activeGrade={grade}
              currentSort={sort}
              genre={genre}
              search={q}
              basePath={basePath}
              activeGenres={activeGenres}
            />
            {exportHref && <CsvButton exportHref={exportHref} iconOnly />}
          </div>
        </div>
      )}
    </div>
  );
}
