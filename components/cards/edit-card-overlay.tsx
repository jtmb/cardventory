"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { XIcon } from "lucide-react";
import { EditCardForm } from "@/components/cards/edit-card-form";
import type { Card } from "@/lib/db/schema";

interface EditCardOverlayProps {
  card: Card;
}

export function EditCardOverlay({ card }: EditCardOverlayProps) {
  const router = useRouter();

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) router.push(`/cards/${card.id}`);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Card</DialogTitle>
          <DialogClose
            className="ml-2 flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>
        <DialogBody>
          <EditCardForm card={card} inOverlay />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
