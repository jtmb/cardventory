"use client";

import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AddCardDialog } from "@/components/cards/add-card-dialog";
import { CardsToolbar, type CardsToolbarProps } from "@/components/cards/cards-toolbar";
import { CardPanelContext } from "@/components/cards/card-panel-context";
import { CardDetailPanel } from "@/components/cards/card-detail-panel";

type CardsPageShellProps = Omit<CardsToolbarProps, "onAddClick"> & {
  children: ReactNode;
  defaultStatus?: "owned" | "wanted";
};

export function CardsPageShell({ children, defaultStatus, ...toolbarProps }: CardsPageShellProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(480);
  const resizing = useRef(false);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    resizing.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;
    function onMove(ev: MouseEvent) {
      if (!resizing.current) return;
      setPanelWidth(Math.min(800, Math.max(320, startWidth + (startX - ev.clientX))));
    }
    function onUp() {
      resizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function handleCardClick(id: string) {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      router.push(`/cards/${id}`);
    } else {
      setSelectedCardId(id);
    }
  }

  return (
    <CardPanelContext.Provider value={{ onCardClick: handleCardClick }}>
      <div>
        <CardsToolbar {...toolbarProps} onAddClick={() => setAddOpen(true)} />
        {children}
      </div>

      {/* Detail panel — desktop only, fixed right edge, overlays content */}
      <div
        className={cn(
          "hidden md:flex flex-col fixed top-0 right-0 bottom-0 z-30",
          "border-l border-border bg-background",
          "transition-transform duration-300 ease-in-out",
          selectedCardId ? "translate-x-0" : "translate-x-full"
        )}
        style={{ width: panelWidth }}
      >
        {/* Resize handle */}
        <div
          className="absolute top-0 left-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-10"
          onMouseDown={startResize}
        />
        {selectedCardId && (
          <CardDetailPanel
            cardId={selectedCardId}
            onClose={() => setSelectedCardId(null)}
            onNavigate={setSelectedCardId}
          />
        )}
      </div>

      <AddCardDialog open={addOpen} onOpenChange={setAddOpen} defaultStatus={defaultStatus} />
    </CardPanelContext.Provider>
  );
}
