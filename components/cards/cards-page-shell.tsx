"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { AddCardDialog } from "@/components/cards/add-card-dialog";
import { CardsToolbar, type CardsToolbarProps } from "@/components/cards/cards-toolbar";

type CardsPageShellProps = Omit<CardsToolbarProps, "onAddClick"> & {
  children: ReactNode;
  defaultStatus?: "owned" | "wanted";
};

export function CardsPageShell({ children, defaultStatus, ...toolbarProps }: CardsPageShellProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <CardsToolbar {...toolbarProps} onAddClick={() => setAddOpen(true)} />
      {children}
      <AddCardDialog open={addOpen} onOpenChange={setAddOpen} defaultStatus={defaultStatus} />
    </>
  );
}
