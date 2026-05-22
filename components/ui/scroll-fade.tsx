"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScrollFadeProps {
  className?: string;
  /** Tailwind `from-*` color matching the container background. Default: from-background */
  fromColor?: string;
  children: ReactNode;
}

export function ScrollFade({ className, fromColor = "from-background", children }: ScrollFadeProps) {
  const [hasMore, setHasMore] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  function checkScroll() {
    const el = ref.current;
    if (!el) return;
    setHasMore(el.scrollHeight - el.scrollTop > el.clientHeight + 2);
  }

  useEffect(() => { checkScroll(); }, [children]);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
      <div
        ref={ref}
        onScroll={checkScroll}
        className={cn(
          "flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "pointer-events-none absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t to-transparent transition-opacity duration-300",
          fromColor,
          hasMore ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
