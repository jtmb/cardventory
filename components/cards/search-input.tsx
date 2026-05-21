"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchIcon } from "lucide-react";

type Suggestion = {
  id: string;
  name: string;
  setName: string | null;
  year: number | null;
  sportGenre: string;
  gradeCompany: string | null;
  gradeValue: string | null;
  photoUrl: string | null;
  maxPrice: number | null;
};

const GENRE_EMOJI: Record<string, string> = {
  basketball: "🏀", baseball: "⚾", football: "🏈", soccer: "⚽",
  hockey: "🏒", pokemon: "⚡", yugioh: "🌟", magic: "🔮", other: "📦",
};

export function SearchInput({
  defaultValue,
  genre,
}: {
  defaultValue?: string;
  genre?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback((q: string) => {
    if (q.trim().length < 1) { setSuggestions([]); setOpen(false); return; }
    fetch(`/api/cards/suggestions?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data: Suggestion[]) => { setSuggestions(data); setOpen(data.length > 0); })
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setValue(q);
    setActiveIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 200);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    const params = new URLSearchParams();
    if (genre && genre !== "all") params.set("genre", genre);
    if (value.trim()) params.set("q", value.trim());
    const qs = params.toString();
    router.push(`/cards${qs ? `?${qs}` : ""}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      router.push(`/cards/${suggestions[activeIdx].id}`);
      setOpen(false);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <form onSubmit={handleSubmit} className="relative flex items-center shrink-0">
        {genre && genre !== "all" && <input type="hidden" name="genre" value={genre} />}
        <SearchIcon className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          name="q"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search cards..."
          autoComplete="off"
          className="h-8 w-52 rounded-md bg-background border border-border pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          {suggestions.map((s, idx) => (
            <Link
              key={s.id}
              href={`/cards/${s.id}`}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                idx === activeIdx ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {/* Thumbnail */}
              <div className="w-8 h-10 shrink-0 rounded bg-muted overflow-hidden flex items-center justify-center text-base">
                {s.photoUrl
                  ? <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover" />
                  : <span>{GENRE_EMOJI[s.sportGenre] ?? "🃏"}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[s.year, s.setName, s.gradeCompany && `${s.gradeCompany} ${s.gradeValue}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              {s.maxPrice != null && (
                <span className="text-xs font-medium shrink-0 tabular-nums">
                  ${s.maxPrice.toFixed(2)}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

