"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

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
    </div>
  );
}
