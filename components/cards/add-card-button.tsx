"use client";

import { useState } from "react";
import { AddCardDialog } from "@/components/cards/add-card-dialog";
import { Button } from "@/components/ui/button";
import { PlusCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddCardButtonProps {
  label?: string;
  iconOnly?: boolean;
  defaultStatus?: "owned" | "wanted";
  className?: string;
}

export function AddCardButton({
  label = "Add Card",
  iconOnly = false,
  defaultStatus,
  className,
}: AddCardButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
            className
          )}
        >
          <PlusCircleIcon className="h-4 w-4" />
        </button>
      ) : (
        <Button type="button" onClick={() => setOpen(true)} className={className}>
          <PlusCircleIcon className="h-4 w-4" />
          {label}
        </Button>
      )}
      <AddCardDialog open={open} onOpenChange={setOpen} defaultStatus={defaultStatus} />
    </>
  );
}
