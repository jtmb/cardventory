"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { FilterIcon } from "lucide-react";

const GENRES = [
  { value: "all",        label: "All Cards" },
  { value: "basketball", label: "🏀 Basketball" },
  { value: "baseball",   label: "⚾ Baseball" },
  { value: "football",   label: "🏈 Football" },
  { value: "soccer",     label: "⚽ Soccer" },
  { value: "hockey",     label: "🏒 Hockey" },
  { value: "pokemon",    label: "⚡ Pokémon" },
  { value: "yugioh",     label: "🌟 Yu-Gi-Oh!" },
  { value: "magic",      label: "🔮 Magic" },
  { value: "other",      label: "📦 Other" },
];

export function GenreTabs({
  activeGenre,
  currentSearch,
  activeGenres,
  basePath = "/cards",
}: {
  activeGenre: string;
  currentSearch?: string;
  activeGenres?: string[];
  basePath?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isFiltered = activeGenre !== "all";
  const activeLabel = GENRES.find((g) => g.value === activeGenre)?.label;

  const visibleGenres = GENRES.filter(
    (g) => g.value === "all" || !activeGenres || activeGenres.includes(g.value)
  );

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function hrefFor(value: string) {
    const params = new URLSearchParams();
    if (value !== "all") params.set("genre", value);
    if (currentSearch) params.set("q", currentSearch);
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium border transition-colors ${
          isFiltered
            ? "bg-primary/10 text-primary border-primary/30"
            : "text-muted-foreground border-border hover:text-foreground hover:bg-muted"
        }`}
      >
        <FilterIcon className="h-4 w-4" />
        <span>{isFiltered ? activeLabel : "Filter"}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl p-1.5 z-50 flex flex-col min-w-44">
          {visibleGenres.map(({ value, label }) => {
            const active = value === activeGenre;
            return (
              <Link
                key={value}
                href={hrefFor(value)}
                onClick={() => setOpen(false)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
