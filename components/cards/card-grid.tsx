"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare2Icon, Trash2Icon, XIcon } from "lucide-react";
import { CardRow, CardRowSkeleton } from "./card-row";
import type { Card } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
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

export function CardGrid({ cards }: { cards: Card[] }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
        {selectMode ? (
          <>
            <div className="flex items-center gap-3">
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
                <button
                  onClick={selectAll}
                  className="text-sm text-primary hover:underline"
                >
                  Select all
                </button>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={count === 0 || isPending}
                  className="gap-1.5"
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                  Delete {count > 0 ? count : ""}
                </Button>
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
          </>
        ) : (
          <button
            onClick={() => setSelectMode(true)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            <CheckSquare2Icon className="h-4 w-4" />
            Select
          </button>
        )}
      </div>

      {/* Cards grid */}
      {cards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              selectable={selectMode}
              selected={selectedIds.has(card.id)}
              onToggle={toggleCard}
            />
          ))}
        </div>
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
