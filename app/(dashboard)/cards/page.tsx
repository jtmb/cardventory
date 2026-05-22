import { getCards, getActiveGenres, countCards } from "@/lib/actions";
import { ButtonLink } from "@/components/ui/button-link";
import { PlusCircleIcon } from "lucide-react";
import { CardGrid } from "@/components/cards/card-grid";
import { GenreTabs } from "@/components/cards/genre-tabs";
import { RefreshAllButton } from "@/components/cards/refresh-all-button";
import { SearchInput } from "@/components/cards/search-input";
import { SortSelect } from "@/components/cards/sort-select";
import { GradeFilter } from "@/components/cards/grade-filter";
import { PaginationControls } from "@/components/cards/pagination-controls";
import { CsvToolbar } from "@/components/cards/csv-toolbar";
import { MobileCardActionsMenu } from "@/components/cards/mobile-card-actions";

const DEFAULT_PAGE_SIZE = 48;

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; q?: string; sort?: string; page?: string; pageSize?: string; grade?: string }>;
}) {
  const { genre, q, sort, page: pageStr, pageSize: pageSizeStr, grade } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const pageSize = [24, 48, 96].includes(parseInt(pageSizeStr ?? "")) ? parseInt(pageSizeStr!) : DEFAULT_PAGE_SIZE;

  const [cardsPage, total, activeGenres] = await Promise.all([
    getCards(genre, q, sort, page, pageSize, grade, "owned"),
    countCards(genre, q, grade, "owned"),
    getActiveGenres(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportHref = `/api/cards/export?status=owned${genre && genre !== "all" ? `&genre=${genre}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}${grade && grade !== "all" ? `&grade=${grade}` : ""}`;

  return (
    <>
      {/* Radarr-style toolbar: bg-card separates it from bg-background below */}
      <div className="bg-card border-b border-border">
        <div
          data-tour-id="tour-cards-toolbar"
          className="max-w-7xl mx-auto px-4 md:px-6 py-2 md:py-0 flex flex-col md:flex-row md:items-center md:gap-3 md:h-14 gap-2"
        >
          <SearchInput defaultValue={q} genre={genre} />
          <div className="flex items-center gap-2 md:flex-1">
            {/* Add Card — primary action, right after search on desktop */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-px h-5 bg-border/60 shrink-0" />
              <ButtonLink href="/cards/add" data-tour-id="toolbar-add-card">
                <PlusCircleIcon className="h-4 w-4" />
                <span>Add Card</span>
              </ButtonLink>
              <div className="w-px h-5 bg-border/60 shrink-0" />
            </div>
            {/* Refresh + bulk data ops */}
            <RefreshAllButton />
            <div className="hidden md:flex items-center gap-2">
              <CsvToolbar exportHref={exportHref} />
              <div className="w-px h-5 bg-border/60 shrink-0" />
            </div>
            {/* Mobile combo menu */}
            <div className="md:hidden">
              <MobileCardActionsMenu
                exportHref={exportHref}
                currentSort={sort}
                activeGrade={grade}
                genre={genre}
                search={q}
              />
            </div>
            {/* View controls — grade, sort, genre filter */}
            <div className="hidden md:flex items-center gap-2">
              <GradeFilter activeGrade={grade} />
              <SortSelect currentSort={sort} genre={genre} search={q} />
            </div>
            <div className="ml-auto">
              <GenreTabs activeGenre={genre ?? "all"} currentSearch={q} activeGenres={activeGenres} />
            </div>
          </div>
        </div>
      </div>

      {/* Content on the darker bg-background */}
      <div data-tour-id="tour-cards-grid" className="p-6 max-w-7xl mx-auto">
        <CardGrid cards={cardsPage} exportHref={exportHref} />
        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
        />
      </div>
    </>
  );
}

