"use client";

import { useState } from "react";
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

  function handleCardClick(id: string) {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      router.push(`/cards/${id}`);
    } else {
      setSelectedCardId(id);
    }
  }

  return (
    <CardPanelContext.Provider value={{ onCardClick: handleCardClick }}>
      <div className={cn("transition-all duration-300 ease-in-out", selectedCardId ? "md:pr-[480px]" : "")}>
        <CardsToolbar {...toolbarProps} onAddClick={() => setAddOpen(true)} />
        {children}
      </div>

      {/* Detail panel — desktop only, fixed right edge */}
      <div
        className={cn(
          "hidden md:flex flex-col fixed top-0 right-0 bottom-0 w-[480px] z-30",
          "border-l border-border bg-background",
          "transition-transform duration-300 ease-in-out",
          selectedCardId ? "translate-x-0" : "translate-x-full"
        )}
      >
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
