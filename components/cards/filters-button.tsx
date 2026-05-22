"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { SlidersHorizontalIcon, CheckIcon } from "lucide-react";

const GENRE_OPTIONS = [
  { value: "all",        label: "All Sports" },
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

const GRADE_OPTIONS = [
  { value: "all",  label: "All Grades" },
  { value: "PSA",  label: "PSA" },
  { value: "BGS",  label: "BGS" },
  { value: "CGC",  label: "CGC" },
  { value: "SGC",  label: "SGC" },
  { value: "HGA",  label: "HGA" },
  { value: "raw",  label: "Raw / Ungraded" },
];

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest" },
  { value: "oldest",     label: "Oldest" },
  { value: "value_high", label: "Market Value (High → Low)" },
  { value: "value_low",  label: "Market Value (Low → High)" },
  { value: "paid_high",  label: "Paid (High → Low)" },
  { value: "paid_low",   label: "Paid (Low → High)" },
  { value: "gain_high",  label: "Gain / Loss (Best)" },
  { value: "gain_low",   label: "Gain / Loss (Worst)" },
];

export function FiltersButton({
  activeGrade = "all",
  currentSort = "newest",
  genre = "all",
  search,
  basePath = "/cards",
  activeGenres,
}: {
  activeGrade?: string;
  currentSort?: string;
  genre?: string;
  search?: string;
  basePath?: string;
  activeGenres?: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isFiltered =
    (activeGrade && activeGrade !== "all") ||
    (currentSort && currentSort !== "newest") ||
    (genre && genre !== "all");

  const visibleGenres = GENRE_OPTIONS.filter(
    (g) => g.value === "all" || !activeGenres || activeGenres.includes(g.value)
  );

  function genreHref(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("genre");
    else params.set("genre", value);
    params.delete("page");
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  function gradeHref(grade: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (grade === "all") params.delete("grade");
    else params.set("grade", grade);
    params.delete("page");
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  function sortHref(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium border transition-colors ${
          isFiltered
            ? "bg-primary/10 text-primary border-primary/30"
            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <SlidersHorizontalIcon className="h-3.5 w-3.5" />
        Filters
        {isFiltered && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-52 p-1.5 max-h-[80vh] overflow-y-auto">
          {/* Sport / Genre */}
          <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Sport
          </p>
          {visibleGenres.map(({ value, label }) => {
            const active = (genre ?? "all") === value;
            return (
              <Link
                key={value}
                href={genreHref(value)}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {label}
                {active && <CheckIcon className="h-3.5 w-3.5 ml-3 shrink-0" />}
              </Link>
            );
          })}

          <div className="border-t border-border my-1.5" />

          {/* Sort */}
          <p className="px-3 pt-1 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Sort
          </p>
          {SORT_OPTIONS.map((o) => {
            const active = o.value === currentSort;
            return (
              <Link
                key={o.value}
                href={sortHref(o.value)}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {o.label}
                {active && <CheckIcon className="h-3.5 w-3.5 ml-3 shrink-0" />}
              </Link>
            );
          })}

          <div className="border-t border-border my-1.5" />

          {/* Grade */}
          <p className="px-3 pt-1 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Grade
          </p>
          {GRADE_OPTIONS.map(({ value, label }) => {
            const active = activeGrade === value;
            return (
              <Link
                key={value}
                href={gradeHref(value)}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {label}
                {active && <CheckIcon className="h-3.5 w-3.5 ml-3 shrink-0" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

