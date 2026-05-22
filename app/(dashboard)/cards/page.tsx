import { getCards, getActiveGenres, countCards, getAllSettings } from "@/lib/actions";
import { LayersIcon } from "lucide-react";
import { CardGrid } from "@/components/cards/card-grid";
import { PaginationControls } from "@/components/cards/pagination-controls";
import { CardsPageShell } from "@/components/cards/cards-page-shell";

const DEFAULT_PAGE_SIZE = 24;

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; q?: string; sort?: string; page?: string; pageSize?: string; grade?: string }>;
}) {
  const { genre, q, sort, page: pageStr, pageSize: pageSizeStr, grade } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const pageSize = [18, 24, 30].includes(parseInt(pageSizeStr ?? "")) ? parseInt(pageSizeStr!) : DEFAULT_PAGE_SIZE;

  const [cardsPage, total, activeGenres, userSettings] = await Promise.all([
    getCards(genre, q, sort, page, pageSize, grade, "owned"),
    countCards(genre, q, grade, "owned"),
    getActiveGenres(),
    getAllSettings(),
  ]);
  const showRefreshWheel = userSettings.show_refresh_wheel !== "false";

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportHref = `/api/cards/export?status=owned${genre && genre !== "all" ? `&genre=${genre}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}${grade && grade !== "all" ? `&grade=${grade}` : ""}`;

  return (
    <CardsPageShell
      header={<><LayersIcon className="h-5 w-5 text-primary" /><span className="text-xl font-bold">My Cards</span></>}
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
        <CardGrid cards={cardsPage} exportHref={exportHref} />
        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
        />
      </div>
    </CardsPageShell>
  );
}

