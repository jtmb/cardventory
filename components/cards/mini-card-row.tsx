import Link from "next/link";
import Image from "next/image";
import type { Card } from "@/lib/db/schema";

const GENRE_LABELS: Record<string, string> = {
  basketball: "Basketball", baseball: "Baseball", football: "Football",
  soccer: "Soccer", hockey: "Hockey", pokemon: "Pokémon",
  yugioh: "Yu-Gi-Oh!", magic: "MTG", other: "Other",
};

export function MiniCardRow({ card }: { card: Card }) {
  return (
    <Link href={`/cards/${card.id}`}>
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:border-border/60 transition-colors">
        <div className="w-10 h-14 rounded overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
          {card.photoUrl ? (
            <Image src={card.photoUrl} alt={card.name} width={40} height={56} className="object-contain" unoptimized={card.photoUrl.startsWith("http")} />
          ) : (
            <span className="text-lg">🃏</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{card.name}</p>
          <p className="text-xs text-muted-foreground truncate">{[card.year, card.setName].filter(Boolean).join(" · ")}</p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{GENRE_LABELS[card.sportGenre] ?? card.sportGenre}</span>
      </div>
    </Link>
  );
}
