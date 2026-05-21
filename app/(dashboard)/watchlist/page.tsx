import { getCards, getActiveGenres, countCards } from "@/lib/actions";
import { ButtonLink } from "@/components/ui/button-link";
import { PlusCircleIcon, BookmarkIcon } from "lucide-react";
import { CardGrid } from "@/components/cards/card-grid";
import { GenreTabs } from "@/components/cards/genre-tabs";
import { SearchInput } from "@/components/cards/search-input";
import { SortSelect } from "@/components/cards/sort-select";
import { GradeFilter } from "@/components/cards/grade-filter";
import { PaginationControls } from "@/components/cards/pagination-controls";
import { CsvToolbar } from "@/components/cards/csv-toolbar";

const DEFAULT_PAGE_SIZE = 48;

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; q?: string; sort?: string; page?: string; pageSize?: string; grade?: string }>;
}) {
  const { genre, q, sort, page: pageStr, pageSize: pageSizeStr, grade } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const pageSize = [24, 48, 96].includes(parseInt(pageSizeStr ?? "")) ? parseInt(pageSizeStr!) : DEFAULT_PAGE_SIZE;

  const [cardsPage, total, activeGenres] = await Promise.all([
    getCards(genre, q, sort, page, pageSize, grade, "wanted"),
    countCards(genre, q, grade, "wanted"),
    getActiveGenres(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportHref = `/api/cards/export?status=wanted${genre && genre !== "all" ? `&genre=${genre}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}${grade && grade !== "all" ? `&grade=${grade}` : ""}`;

  return (
    <>
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 md:py-0 flex flex-col md:flex-row md:items-center md:gap-3 md:h-14 gap-2">
          <div className="flex items-center gap-2 mr-auto">
            <BookmarkIcon className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-sm">Watchlist</span>
            {total > 0 && <span className="text-xs text-muted-foreground">({total})</span>}
          </div>
          <SearchInput defaultValue={q} genre={genre} basePath="/watchlist" />
          <div className="flex items-center gap-2">
            <div className="hidden md:block w-px h-5 bg-border/60 shrink-0" />
            <SortSelect currentSort={sort} genre={genre} search={q} basePath="/watchlist" />
            <GradeFilter activeGrade={grade} />
            <div className="hidden md:block w-px h-5 bg-border/60 shrink-0" />
            <CsvToolbar exportHref={exportHref} />
            <ButtonLink href="/cards/add?status=wanted">
              <PlusCircleIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Add to Watchlist</span>
            </ButtonLink>
            <div className="ml-auto">
              <GenreTabs activeGenre={genre ?? "all"} currentSearch={q} activeGenres={activeGenres} basePath="/watchlist" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {cardsPage.length === 0 && total === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BookmarkIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground">Your watchlist is empty</h2>
            <p className="text-muted-foreground/60 mt-2 mb-6">Add cards you want to track or plan to buy</p>
            <ButtonLink href="/cards/add?status=wanted">
              <PlusCircleIcon className="h-4 w-4" /> Add to Watchlist
            </ButtonLink>
          </div>
        ) : (
          <>
            <CardGrid cards={cardsPage} exportHref={exportHref} />
            <PaginationControls
              page={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
            />
          </>
        )}
      </div>
    </>
  );
}
