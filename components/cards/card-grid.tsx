"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare2Icon, Trash2Icon, XIcon, LayoutGridIcon, LayoutListIcon, ListIcon } from "lucide-react";
import { CardRow, CardRowSkeleton } from "./card-row";
import type { Card } from "@/lib/db/schema";
import { Button, buttonVariants } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";
import { PlusCircleIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteCards } from "@/lib/actions";

type ViewMode = "grid" | "list" | "compact";
const VIEW_LS_KEY = "cv_cards_view";

export function CardGrid({ cards }: { cards: Card[] }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<ViewMode>("grid");
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_LS_KEY) as ViewMode | null;
    if (stored) setView(stored);
  }, []);

  function setViewMode(v: ViewMode) {
    setView(v);
    localStorage.setItem(VIEW_LS_KEY, v);
  }

  function toggleCard(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(cards.map((c) => c.id)));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function handleDeleteSelected() {
    startTransition(async () => {
      await deleteCards([...selectedIds]);
      exitSelectMode();
      router.refresh();
    });
  }

  const count = selectedIds.size;

  return (
    <>
      {/* Select mode toolbar */}
      <div className="flex items-center justify-between min-h-[2rem]">
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <button
                onClick={exitSelectMode}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <XIcon className="h-4 w-4" /> Cancel
              </button>
              <span className="text-sm text-muted-foreground">
                {count === 0 ? "No cards selected" : `${count} ${count === 1 ? "card" : "cards"} selected`}
              </span>
              {count < cards.length && (
                <button onClick={selectAll} className="text-sm text-primary hover:underline">
                  Select all
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setSelectMode(true)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckSquare2Icon className="h-4 w-4" /> Select
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
            {([
              { v: "grid" as const,    icon: <LayoutGridIcon className="h-3.5 w-3.5" />, title: "Grid view" },
              { v: "list" as const,    icon: <LayoutListIcon className="h-3.5 w-3.5" />, title: "List view" },
              { v: "compact" as const, icon: <ListIcon className="h-3.5 w-3.5" />,       title: "Compact view" },
            ] as const).map(({ v, icon, title }) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                title={title}
                className={`flex items-center justify-center h-6 w-6 rounded transition-colors ${
                  view === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

          {selectMode && (
            <AlertDialog>
              <AlertDialogTrigger
                disabled={count === 0 || isPending}
                className={cn(buttonVariants({ variant: "destructive", size: "sm" }), "gap-1.5")}
              >
                <Trash2Icon className="h-3.5 w-3.5" />
                Delete {count > 0 ? count : ""}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {count} {count === 1 ? "card" : "cards"}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {count === 1 ? "this card" : `these ${count} cards`} and all associated price history. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSelected}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete {count === 1 ? "card" : `${count} cards`}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Cards */}
      {cards.length > 0 ? (
        view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {cards.map((card) => (
              <CardRow key={card.id} card={card} layout="grid" selectable={selectMode} selected={selectedIds.has(card.id)} onToggle={toggleCard} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border/60">
            {cards.map((card) => (
              <CardRow key={card.id} card={card} layout={view} selectable={selectMode} selected={selectedIds.has(card.id)} onToggle={toggleCard} />
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-lg">No cards in this category</p>
          <ButtonLink href="/cards/add" className="mt-4">
            <PlusCircleIcon className="h-4 w-4" /> Add Card
          </ButtonLink>
        </div>
      )}
    </>
  );
}
