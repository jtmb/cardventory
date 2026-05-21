"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const GENRES = [
  { value: "all", label: "All Cards" },
  { value: "basketball", label: "🏀 Basketball" },
  { value: "baseball", label: "⚾ Baseball" },
  { value: "football", label: "🏈 Football" },
  { value: "soccer", label: "⚽ Soccer" },
  { value: "hockey", label: "🏒 Hockey" },
  { value: "pokemon", label: "⚡ Pokémon" },
  { value: "yugioh", label: "🌟 Yu-Gi-Oh!" },
  { value: "magic", label: "🔮 Magic" },
  { value: "other", label: "📦 Other" },
];

export function GenreTabs({ activeGenre }: { activeGenre: string }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {GENRES.map(({ value, label }) => {
        const active = value === activeGenre;
        return (
          <Link
            key={value}
            href={value === "all" ? "/cards" : `/cards?genre=${value}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
