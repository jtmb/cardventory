"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const PAGE_SIZE_OPTIONS = [18, 24, 30];

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
}: PaginationControlsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildHref(p: number, ps?: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p > 1) {
      params.set("page", String(p));
    } else {
      params.delete("page");
    }
    if (ps !== undefined) {
      if (ps === 24) {
        params.delete("pageSize");
      } else {
        params.set("pageSize", String(ps));
      }
    }
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }
  if (totalPages <= 1 && totalItems <= Math.min(...PAGE_SIZE_OPTIONS)) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  // Build a window of page numbers to show
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4">
      <p className="text-sm text-muted-foreground">
        {totalItems === 0 ? "No cards" : `Showing ${start}–${end} of ${totalItems} cards`}
      </p>

      <div className="flex items-center gap-3">
        {/* Page size selector */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Per page:</span>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <Link
              key={size}
              href={buildHref(1, size)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                pageSize === size
                  ? "bg-primary/15 text-primary"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {size}
            </Link>
          ))}
        </div>

        {/* Prev / page numbers / Next */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Link
              href={buildHref(page - 1)}
              aria-disabled={page <= 1}
              className={`flex items-center justify-center h-8 w-8 rounded transition-colors ${
                page <= 1
                  ? "text-muted-foreground/30 pointer-events-none"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Link>

            {pages.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={buildHref(p)}
                  className={`flex items-center justify-center h-8 w-8 rounded text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-primary/15 text-primary"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {p}
                </Link>
              )
            )}

            <Link
              href={buildHref(page + 1)}
              aria-disabled={page >= totalPages}
              className={`flex items-center justify-center h-8 w-8 rounded transition-colors ${
                page >= totalPages
                  ? "text-muted-foreground/30 pointer-events-none"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
