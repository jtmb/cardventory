"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { CheckIcon, ShieldIcon } from "lucide-react";

const GRADE_OPTIONS = [
  { value: "all", label: "All Grades" },
  { value: "PSA",  label: "PSA" },
  { value: "BGS",  label: "BGS" },
  { value: "CGC",  label: "CGC" },
  { value: "SGC",  label: "SGC" },
  { value: "HGA",  label: "HGA" },
  { value: "raw",  label: "Raw / Ungraded" },
];

export function GradeFilter({
  activeGrade = "all",
}: {
  activeGrade?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function buildHref(grade: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (grade === "all") {
      params.delete("grade");
    } else {
      params.set("grade", grade);
    }
    // Reset to page 1 when changing filter
    params.delete("page");
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }
  const isFiltered = activeGrade !== "all";
  const activeLabel = GRADE_OPTIONS.find((g) => g.value === activeGrade)?.label ?? "Grade";

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
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium border transition-colors ${
          isFiltered
            ? "bg-primary/10 text-primary border-primary/30"
            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <ShieldIcon className="h-3.5 w-3.5" />
        {isFiltered ? activeLabel : "Grade"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl p-1.5 z-50 flex flex-col min-w-44">
          {GRADE_OPTIONS.map(({ value, label }) => (
            <Link
              key={value}
              href={buildHref(value)}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeGrade === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {label}
              {activeGrade === value && <CheckIcon className="h-3.5 w-3.5 ml-3 shrink-0" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
