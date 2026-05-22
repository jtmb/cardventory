"use client";

import { createContext, useContext } from "react";

interface CardPanelContextValue {
  onCardClick: ((id: string) => void) | null;
}

export const CardPanelContext = createContext<CardPanelContextValue>({
  onCardClick: null,
});

export function useCardPanel() {
  return useContext(CardPanelContext);
}
