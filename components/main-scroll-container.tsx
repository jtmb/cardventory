"use client";

import { ScrollFade } from "@/components/ui/scroll-fade";
import type { ReactNode } from "react";

export function MainScrollContainer({ children }: { children: ReactNode }) {
  return (
    <ScrollFade className="pt-14 md:pt-0" fromColor="from-background">
      {children}
    </ScrollFade>
  );
}
