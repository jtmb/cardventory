import { getCards, getActiveGenres, countCards, getAllSettings, getDuplicateGroups } from "@/lib/actions";
import { LayersIcon } from "lucide-react";
import { CardGrid } from "@/components/cards/card-grid";
import { PaginationControls } from "@/components/cards/pagination-controls";
import { CardsPageShell } from "@/components/cards/cards-page-shell";
import { DuplicatesBanner } from "@/components/cards/duplicates-banner";

const DEFAULT_PAGE_SIZE = 24;

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; q?: string; sort?: string; page?: string; pageSize?: string; grade?: string; view?: string }>;
}) {
  const { genre, q, sort, page: pageStr, pageSize: pageSizeStr, grade, view } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const pageSize = [18, 24, 30].includes(parseInt(pageSizeStr ?? "")) ? parseInt(pageSizeStr!) : DEFAULT_PAGE_SIZE;

  const [cardsPage, total, activeGenres, userSettings, duplicateGroups] = await Promise.all([
    getCards(genre, q, sort, page, pageSize, grade, "owned"),
    countCards(genre, q, grade, "owned"),
    getActiveGenres(),
    getAllSettings(),
    getDuplicateGroups(),
  ]);
  const showRefreshWheel = userSettings.show_refresh_wheel !== "false";

  // In duplicate view, flatten all duplicated cards and show only them
  const isDuplicateView = view === "duplicates";
  const duplicateCardIds = isDuplicateView
    ? new Set(duplicateGroups.flat().map((c) => c.id))
    : null;
  const displayCards = isDuplicateView && duplicateCardIds
    ? cardsPage.filter((c) => duplicateCardIds.has(c.id))
    : cardsPage;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportHref = `/api/cards/export?status=owned${genre && genre !== "all" ? `&genre=${genre}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}${grade && grade !== "all" ? `&grade=${grade}` : ""}`;

  return (
    <CardsPageShell
      header={<><LayersIcon className="h-6 w-6 text-primary" /><span className="text-2xl font-bold">My Cards</span></>}
      total={total}
      basePath="/cards"
      addHref="/cards/add"
      addLabel="Add Card"
      exportHref={exportHref}
      activeGenres={activeGenres}
      q={q}
      genre={genre}
      sort={sort}
      grade={grade}
      showRefresh={showRefreshWheel}
      tourId="tour-cards-toolbar"
    >
      <div data-tour-id="tour-cards-grid" className="p-6 max-w-7xl mx-auto">
        {!isDuplicateView && <DuplicatesBanner count={duplicateGroups.length} basePath="/cards" />}
        {isDuplicateView && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
              Showing {duplicateGroups.length} duplicate {duplicateGroups.length === 1 ? "group" : "groups"} ({duplicateGroups.flat().length} cards)
            </p>
            <a href="/cards" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">
              Show all cards
            </a>
          </div>
        )}
        <CardGrid cards={displayCards} exportHref={exportHref} />
        {!isDuplicateView && (
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
          />
        )}
      </div>
    </CardsPageShell>
  );
}

