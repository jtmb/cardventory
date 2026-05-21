"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowUpDownIcon, CheckIcon } from "lucide-react";

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

export function SortSelect({
  currentSort = "newest",
  genre,
  search,
}: {
  currentSort?: string;
  genre?: string;
  search?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeLabel = SORT_OPTIONS.find((o) => o.value === currentSort)?.label ?? "Newest";

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function hrefFor(value: string) {
    const params = new URLSearchParams();
    if (genre && genre !== "all") params.set("genre", genre);
    if (search) params.set("q", search);
    if (value !== "newest") params.set("sort", value);
    const qs = params.toString();
    return `/cards${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-8 px-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <ArrowUpDownIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{activeLabel}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl p-1.5 z-50 flex flex-col min-w-52">
          {SORT_OPTIONS.map((o) => {
            const active = o.value === currentSort;
            return (
              <Link
                key={o.value}
                href={hrefFor(o.value)}
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
        </div>
      )}
    </div>
  );
}


