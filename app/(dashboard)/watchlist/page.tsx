import { getCards, getActiveGenres, countCards, getAllSettings } from "@/lib/actions";
import { BookmarkIcon, PlusCircleIcon } from "lucide-react";
import { CardGrid } from "@/components/cards/card-grid";
import { PaginationControls } from "@/components/cards/pagination-controls";
import { CardsPageShell } from "@/components/cards/cards-page-shell";
import { ButtonLink } from "@/components/ui/button-link";

const DEFAULT_PAGE_SIZE = 48;

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; q?: string; sort?: string; page?: string; pageSize?: string; grade?: string }>;
}) {
  const { genre, q, sort, page: pageStr, pageSize: pageSizeStr, grade } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const pageSize = [18, 24, 30].includes(parseInt(pageSizeStr ?? "")) ? parseInt(pageSizeStr!) : DEFAULT_PAGE_SIZE;

  const [cardsPage, total, activeGenres, userSettings] = await Promise.all([
    getCards(genre, q, sort, page, pageSize, grade, "wanted"),
    countCards(genre, q, grade, "wanted"),
    getActiveGenres(),
    getAllSettings(),
  ]);
  const showRefreshWheel = userSettings.show_refresh_wheel !== "false";

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportHref = `/api/cards/export?status=wanted${genre && genre !== "all" ? `&genre=${genre}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}${grade && grade !== "all" ? `&grade=${grade}` : ""}`;

  return (
    <>
      <CardsPageShell
        defaultStatus="wanted"
        header={<><BookmarkIcon className="h-4 w-4 text-amber-500" /><span className="font-semibold text-sm">Watchlist</span></>}
        total={total}
        basePath="/watchlist"
        addHref="/cards/add?status=wanted"
        addLabel="Add to Watchlist"
        exportHref={exportHref}
        activeGenres={activeGenres}
        q={q}
        genre={genre}
        sort={sort}
        grade={grade}
        showRefresh={showRefreshWheel}
      >

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
      </CardsPageShell>
    </>
  );
}
