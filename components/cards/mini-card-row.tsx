"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Card } from "@/lib/db/schema";
import { SmartCardImage } from "@/components/cards/smart-card-image";
import { useCardPanel } from "@/components/cards/card-panel-context";

const GENRE_LABELS: Record<string, string> = {
  basketball: "Basketball", baseball: "Baseball", football: "Football",
  soccer: "Soccer", hockey: "Hockey", pokemon: "Pokémon",
  yugioh: "Yu-Gi-Oh!", magic: "MTG", other: "Other",
};

export function MiniCardRow({ card }: { card: Card }) {
  const { onCardClick } = useCardPanel();
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    if (onCardClick) {
      e.preventDefault();
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        router.push(`/cards/${card.id}`);
      } else {
        onCardClick(card.id);
      }
    }
  }

  return (
    <Link href={`/cards/${card.id}`} onClick={handleClick}>
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:border-border/60 transition-colors">
        <SmartCardImage
          src={card.photoUrl}
          alt={card.name}
          unoptimized={!!card.photoUrl && card.photoUrl.startsWith("http")}
          fitMode="cover"
          containerClassName="relative w-10 h-14 rounded-md overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center"
          placeholder={<span className="text-lg">🃏</span>}
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{card.name}</p>
          <p className="text-xs text-muted-foreground truncate">{[card.year, card.setName].filter(Boolean).join(" · ")}</p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{GENRE_LABELS[card.sportGenre] ?? card.sportGenre}</span>
      </div>
    </Link>
  );
}
