import { getCards, getActiveGenres } from "@/lib/actions";
import { ButtonLink } from "@/components/ui/button-link";
import { PlusCircleIcon } from "lucide-react";
import { CardGrid } from "@/components/cards/card-grid";
import { GenreTabs } from "@/components/cards/genre-tabs";
import { RefreshAllButton } from "@/components/cards/refresh-all-button";
import { SearchInput } from "@/components/cards/search-input";
import { SortSelect } from "@/components/cards/sort-select";

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; q?: string; sort?: string }>;
}) {
  const { genre, q, sort } = await searchParams;
  const [cards, activeGenres] = await Promise.all([getCards(genre, q, sort), getActiveGenres()]);

  return (
    <>
      {/* Radarr-style toolbar: bg-card separates it from bg-background below */}
      <div className="bg-card border-b border-border">
        <div data-tour-id="tour-cards-toolbar" className="max-w-7xl mx-auto px-6 flex items-center gap-3 h-14">
          <SearchInput defaultValue={q} genre={genre} />
          <div className="w-px h-5 bg-border/60 shrink-0" />
          <SortSelect currentSort={sort} genre={genre} search={q} />
          <div className="w-px h-5 bg-border/60 shrink-0" />
          <RefreshAllButton />
          <ButtonLink href="/cards/add" data-tour-id="toolbar-add-card">
            <PlusCircleIcon className="h-4 w-4" /> Add Card
          </ButtonLink>
          <div className="ml-auto">
            <GenreTabs activeGenre={genre ?? "all"} currentSearch={q} activeGenres={activeGenres} />
          </div>
        </div>
      </div>

      {/* Content on the darker bg-background */}
      <div data-tour-id="tour-cards-grid" className="p-6 max-w-7xl mx-auto">
        <CardGrid cards={cards} />
      </div>
    </>
  );
}

