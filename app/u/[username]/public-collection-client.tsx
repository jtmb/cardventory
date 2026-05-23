"use client";

import { useState, useMemo } from "react";
import type { Card } from "@/lib/db/schema";
import { SmartCardImage } from "@/components/cards/smart-card-image";
import { ArrowRightLeftIcon, SearchIcon } from "lucide-react";

const GENRES = [
  { value: "all",        label: "All" },
  { value: "basketball", label: "Basketball" },
  { value: "baseball",   label: "Baseball" },
  { value: "football",   label: "Football" },
  { value: "soccer",     label: "Soccer" },
  { value: "hockey",     label: "Hockey" },
  { value: "pokemon",    label: "Pokémon" },
  { value: "yugioh",     label: "Yu-Gi-Oh!" },
  { value: "magic",      label: "Magic" },
  { value: "other",      label: "Other" },
];

const GRADE_STYLES: Record<string, { bg: string; text: string }> = {
  PSA:     { bg: "oklch(0.22 0.12 240 / 0.6)", text: "oklch(0.75 0.2 240)" },
  BGS:     { bg: "oklch(0.22 0.12 60 / 0.6)",  text: "oklch(0.80 0.18 60)" },
  Beckett: { bg: "oklch(0.22 0.12 60 / 0.6)",  text: "oklch(0.80 0.18 60)" },
  CGC:     { bg: "oklch(0.22 0.10 180 / 0.6)", text: "oklch(0.75 0.15 180)" },
  SGC:     { bg: "oklch(0.22 0.12 20 / 0.6)",  text: "oklch(0.75 0.18 20)" },
  HGA:     { bg: "oklch(0.22 0.12 50 / 0.6)",  text: "oklch(0.78 0.18 50)" },
};

function fmt(n: number | null | undefined) {
  if (!n) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function PublicCollectionClient({ cards }: { cards: Card[] }) {
  const [activeGenre, setActiveGenre] = useState("all");
  const [search, setSearch] = useState("");

  const activeGenres = useMemo(() => new Set(cards.map((c) => c.sportGenre)), [cards]);
  const visibleGenres = GENRES.filter((g) => g.value === "all" || activeGenres.has(g.value));
  const tradeBait = useMemo(() => cards.filter((c) => c.isTradeBait), [cards]);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (activeGenre !== "all" && c.sportGenre !== activeGenre) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [cards, activeGenre, search]);

  return (
    <div className="space-y-8">

      {/* ── Trade Bait carousel ─────────────────────────────────────────── */}
      {tradeBait.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-6 h-6 rounded-md" style={{ background: "oklch(0.22 0.12 160 / 0.4)", color: "oklch(0.7 0.18 160)" }}>
              <ArrowRightLeftIcon className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-bold tracking-wide uppercase" style={{ color: "oklch(0.65 0.03 260)" }}>
              Available to Trade
            </h2>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.22 0.12 160 / 0.4)", color: "oklch(0.7 0.18 160)" }}>
              {tradeBait.length}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tradeBait.map((card) => (
              <div key={card.id} className="shrink-0 w-32 group/tb">
                <div
                  className="relative aspect-[5/7] rounded-xl overflow-hidden"
                  style={{ border: "1px solid oklch(0.3 0.12 160 / 0.5)", boxShadow: "0 0 0 1px oklch(0.5 0.18 160 / 0.2), 0 4px 16px oklch(0.05 0.05 260)" }}
                >
                  <SmartCardImage
                    src={card.photoUrl ?? undefined}
                    alt={card.name}
                    containerClassName="w-full h-full"
                    fitMode="cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {card.gradeCompany && card.gradeValue && (
                    <div className="absolute top-2 right-2 flex flex-col items-center px-1.5 py-0.5 rounded-md backdrop-blur-sm"
                      style={{ background: GRADE_STYLES[card.gradeCompany]?.bg ?? "oklch(0.15 0.02 260 / 0.8)" }}>
                      <span className="text-[9px] font-bold uppercase leading-tight"
                        style={{ color: GRADE_STYLES[card.gradeCompany]?.text ?? "oklch(0.7 0.03 260)" }}>
                        {card.gradeCompany}
                      </span>
                      <span className="text-xs font-black leading-tight text-white">{card.gradeValue}</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-[11px] font-semibold leading-tight text-white line-clamp-2 drop-shadow">{card.name}</p>
                  </div>
                </div>
                <div className="mt-1.5 h-3" />
              </div>
            ))}
          </div>
          <div className="h-px mt-4" style={{ background: "oklch(0.18 0.01 260)" }} />
        </section>
      )}

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex flex-wrap gap-1.5 flex-1">
          {visibleGenres.map((g) => (
            <button
              key={g.value}
              onClick={() => setActiveGenre(g.value)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
              style={activeGenre === g.value
                ? { background: "oklch(0.55 0.18 260)", borderColor: "oklch(0.55 0.18 260)", color: "oklch(0.98 0.01 260)", boxShadow: "0 0 12px oklch(0.55 0.18 260 / 0.4)" }
                : { background: "transparent", borderColor: "oklch(0.25 0.02 260)", color: "oklch(0.55 0.03 260)" }
              }
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: "oklch(0.45 0.02 260)" }} />
          <input
            type="search"
            placeholder="Search cards…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full sm:w-52 rounded-full pl-8 pr-3 text-xs focus:outline-none focus:ring-1"
            style={{ background: "oklch(0.13 0.02 260)", border: "1px solid oklch(0.25 0.02 260)", color: "oklch(0.85 0.02 260)" }}
          />
        </div>
      </div>

      {/* ── Card grid ──────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center" style={{ color: "oklch(0.45 0.02 260)" }}>No cards found.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((card) => <CardTile key={card.id} card={card} />)}
        </div>
      )}
    </div>
  );
}

function CardTile({ card }: { card: Card }) {
  return (
    <div className="group relative">
      {/* Image */}
      <div
        className="relative aspect-[5/7] rounded-xl overflow-hidden transition-all duration-200 group-hover:-translate-y-1"
        style={{
          border: "1px solid oklch(0.22 0.02 260)",
          background: "oklch(0.12 0.02 260)",
          boxShadow: "0 2px 8px oklch(0.04 0.02 260)",
        }}
      >
        <SmartCardImage
          src={card.photoUrl ?? undefined}
          alt={card.name}
          containerClassName="w-full h-full"
          fitMode="cover"
        />

        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Grade badge */}
        {card.gradeCompany && card.gradeValue && (
          <div
            className="absolute top-2 right-2 flex flex-col items-center px-1.5 py-0.5 rounded-md backdrop-blur-sm"
            style={{ background: GRADE_STYLES[card.gradeCompany]?.bg ?? "oklch(0.15 0.02 260 / 0.85)" }}
          >
            <span className="text-[9px] font-bold uppercase leading-tight"
              style={{ color: GRADE_STYLES[card.gradeCompany]?.text ?? "oklch(0.7 0.03 260)" }}>
              {card.gradeCompany}
            </span>
            <span className="text-xs font-black leading-tight text-white">{card.gradeValue}</span>
          </div>
        )}

        {/* Trade badge */}
        {card.isTradeBait && (
          <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full backdrop-blur-sm"
            style={{ background: "oklch(0.22 0.14 160 / 0.8)", border: "1px solid oklch(0.5 0.18 160 / 0.4)" }}>
            <ArrowRightLeftIcon className="h-2.5 w-2.5" style={{ color: "oklch(0.75 0.18 160)" }} />
          </div>
        )}

        {/* Hover: price hidden — no price data on public profile */}
      </div>

      {/* Info */}
      <div className="mt-2 px-0.5 space-y-0.5">
        <p className="text-xs font-semibold leading-tight truncate" style={{ color: "oklch(0.88 0.02 260)" }}>{card.name}</p>
        {(card.year || card.setName) && (
          <p className="text-[10px] truncate" style={{ color: "oklch(0.48 0.02 260)" }}>
            {[card.year, card.setName].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
