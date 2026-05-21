import { getCards } from "@/lib/actions";
import { ButtonLink } from "@/components/ui/button-link";
import { PlusCircleIcon } from "lucide-react";
import { CardGrid } from "@/components/cards/card-grid";
import { GenreTabs } from "@/components/cards/genre-tabs";
import { RefreshAllButton } from "@/components/cards/refresh-all-button";

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const { genre } = await searchParams;
  const cards = await getCards(genre);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Cards</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{cards.length} {cards.length === 1 ? "card" : "cards"}</p>
        </div>
        <div className="flex gap-2">
          <RefreshAllButton />
          <ButtonLink href="/cards/add">
            <PlusCircleIcon className="h-4 w-4" /> Add Card
          </ButtonLink>
        </div>
      </div>

      {/* Genre filter tabs */}
      <GenreTabs activeGenre={genre ?? "all"} />

      {/* Cards grid with select/batch-delete */}
      <CardGrid cards={cards} />
    </div>
  );
}
