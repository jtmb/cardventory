"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

const MIN_SWIPE_PX = 48;

export function SwipeCardNav({
  prevId,
  nextId,
  basePath = "/cards",
  children,
}: {
  prevId: string | null;
  nextId: string | null;
  basePath?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < MIN_SWIPE_PX) return;
    if (dx < 0 && nextId) router.push(`${basePath}/${nextId}`);
    if (dx > 0 && prevId) router.push(`${basePath}/${prevId}`);
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {children}

      {/* Mobile prev / next pill buttons — only rendered on mobile */}
      {(prevId || nextId) && (
        <div className="md:hidden fixed bottom-6 inset-x-0 flex justify-between px-5 pointer-events-none z-30">
          {prevId ? (
            <Link
              href={`${basePath}/${prevId}`}
              aria-label="Previous card"
              className="pointer-events-auto flex items-center gap-1 h-9 pl-2.5 pr-3.5 rounded-full bg-card/90 border border-border shadow-lg text-sm text-muted-foreground hover:text-foreground backdrop-blur-sm"
            >
              <ChevronLeftIcon className="h-4 w-4 shrink-0" />
              Prev
            </Link>
          ) : (
            <div />
          )}
          {nextId ? (
            <Link
              href={`${basePath}/${nextId}`}
              aria-label="Next card"
              className="pointer-events-auto flex items-center gap-1 h-9 pl-3.5 pr-2.5 rounded-full bg-card/90 border border-border shadow-lg text-sm text-muted-foreground hover:text-foreground backdrop-blur-sm"
            >
              Next
              <ChevronRightIcon className="h-4 w-4 shrink-0" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  );
}
