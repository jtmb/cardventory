"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { XIcon, ArrowRightLeftIcon, SearchIcon, SendIcon, CheckIcon, AlertCircleIcon } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay as DndDragOverlay, DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SmartCardImage } from "@/components/cards/smart-card-image";
import type { Card } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface TradeRequestOverlayProps {
  /** The card being requested */
  targetCard: { id: string; name: string; photoUrl?: string | null; setName?: string | null; year?: number | null; gradeCompany?: string | null; gradeValue?: string | null };
  /** The owner's user ID */
  toUserId: string;
  /** The owner's display name */
  toUserName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

function DraggableOfferCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data: { zone: "my-cards" } });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="touch-none cursor-grab active:cursor-grabbing"
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, opacity: isDragging ? 0.3 : 1 }}
    >
      {children}
    </div>
  );
}

function DraggableOfferedCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data: { zone: "offered" } });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="touch-none cursor-grab active:cursor-grabbing"
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, opacity: isDragging ? 0.3 : 1 }}
    >
      {children}
    </div>
  );
}

function DropZone({ id, isOver, children, className }: { id: string; isOver?: boolean; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({ id });
  const highlighted = isOver ?? dndIsOver;
  return (
    <div
      ref={setNodeRef}
      className={cn(className)}
      style={{
        borderRadius: 12,
        outline: highlighted ? "2px dashed oklch(0.65 0.2 260 / 0.8)" : "2px dashed oklch(0.3 0.08 260 / 0.3)",
        outlineOffset: 4,
        transition: "outline-color 0.15s",
      }}
    >
      {children}
    </div>
  );
}

function MiniCardTile({ card, action }: { card: Card; action?: React.ReactNode }) {
  const displayImage = card.photoUrl ?? null;
  return (
    <div className="relative flex flex-col items-center gap-1 p-2 rounded-xl bg-card border border-border hover:border-border/60 transition-colors select-none">
      <div className="w-16 aspect-[5/7] rounded-lg overflow-hidden bg-muted shrink-0">
        {displayImage ? (
          <SmartCardImage src={displayImage} alt={card.name} unoptimized={displayImage.startsWith("http")} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-lg">🃏</div>
        )}
      </div>
      <p className="text-[10px] font-medium text-center leading-tight line-clamp-2 w-full" style={{ color: "oklch(0.75 0.02 260)" }}>{card.name}</p>
      {card.gradeCompany && card.gradeValue && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{card.gradeCompany} {card.gradeValue}</span>
      )}
      {action && <div className="absolute top-1 right-1">{action}</div>}
    </div>
  );
}

export function TradeRequestOverlay({ targetCard, toUserId, toUserName, onClose, onSuccess }: TradeRequestOverlayProps) {
  const [myCards, setMyCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [offeredIds, setOfferedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    fetch("/api/my-cards")
      .then((r) => r.json())
      .then((data: Card[]) => setMyCards(Array.isArray(data) ? data : []))
      .catch(() => setMyCards([]))
      .finally(() => setLoadingCards(false));
  }, []);

  // Close on backdrop click
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const offeredCards = useMemo(() => myCards.filter((c) => offeredIds.includes(c.id)), [myCards, offeredIds]);
  const availableCards = useMemo(
    () => myCards.filter((c) => !offeredIds.includes(c.id) && (!search || c.name.toLowerCase().includes(search.toLowerCase()))),
    [myCards, offeredIds, search]
  );

  const activeDragCard = activeDragId ? myCards.find((c) => c.id === activeDragId) : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveDragId(e.active.id as string);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;
    const zone = (active.data.current as { zone: string }).zone;
    const cardId = active.id as string;

    if (over.id === "offered-zone" && zone === "my-cards") {
      setOfferedIds((prev) => prev.includes(cardId) ? prev : [...prev, cardId]);
    } else if (over.id === "my-cards-zone" && zone === "offered") {
      setOfferedIds((prev) => prev.filter((id) => id !== cardId));
    }
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/trade-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCardId: targetCard.id,
          toUserId,
          offeredCardIds: offeredIds,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to send trade request");
      } else {
        setSuccess(true);
        setTimeout(() => { onSuccess?.(); onClose(); }, 1800);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  const targetSetLine = [targetCard.year, targetCard.setName].filter(Boolean).join(" · ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={overlayRef}
        className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "oklch(0.14 0.025 260)", border: "1px solid oklch(0.25 0.06 260 / 0.6)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 shrink-0" style={{ borderBottom: "1px solid oklch(0.22 0.04 260 / 0.6)" }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <ArrowRightLeftIcon className="h-4 w-4 shrink-0" style={{ color: "oklch(0.65 0.2 260)" }} />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "oklch(0.90 0.02 260)" }}>Request a Trade</p>
              <p className="text-xs" style={{ color: "oklch(0.50 0.04 260)" }}>with {toUserName}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10" style={{ color: "oklch(0.55 0.04 260)" }}>
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full" style={{ background: "oklch(0.22 0.12 160 / 0.3)" }}>
              <CheckIcon className="h-7 w-7" style={{ color: "oklch(0.65 0.2 160)" }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "oklch(0.80 0.02 260)" }}>Trade request sent!</p>
            <p className="text-xs" style={{ color: "oklch(0.50 0.04 260)" }}>{toUserName} will be notified.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDragId(null)}>
            <div className="flex flex-1 min-h-0 overflow-hidden">

              {/* Left — My collection */}
              <div className="flex flex-col w-1/2 border-r" style={{ borderColor: "oklch(0.22 0.04 260 / 0.6)" }}>
                <div className="px-4 pt-4 pb-2 shrink-0 space-y-2">
                  {/* Wanted card */}
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "oklch(0.18 0.05 260 / 0.6)", border: "1px solid oklch(0.28 0.08 260 / 0.4)" }}>
                    <div className="w-10 aspect-[5/7] rounded-lg overflow-hidden bg-muted shrink-0">
                      {targetCard.photoUrl ? (
                        <SmartCardImage src={targetCard.photoUrl} alt={targetCard.name} unoptimized={targetCard.photoUrl.startsWith("http")} />
                      ) : (
                        <div className="h-full flex items-center justify-center text-base">🃏</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide mb-0.5" style={{ color: "oklch(0.50 0.08 260)" }}>You want</p>
                      <p className="text-sm font-semibold truncate" style={{ color: "oklch(0.88 0.02 260)" }}>{targetCard.name}</p>
                      {targetSetLine && <p className="text-xs truncate" style={{ color: "oklch(0.50 0.04 260)" }}>{targetSetLine}</p>}
                      {targetCard.gradeCompany && targetCard.gradeValue && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{targetCard.gradeCompany} {targetCard.gradeValue}</span>
                      )}
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "oklch(0.45 0.04 260)" }} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search your cards…"
                      className="w-full h-8 pl-8 pr-3 rounded-lg text-xs bg-transparent outline-none"
                      style={{ background: "oklch(0.18 0.04 260 / 0.6)", border: "1px solid oklch(0.28 0.06 260 / 0.4)", color: "oklch(0.82 0.02 260)" }}
                    />
                  </div>

                  <p className="text-xs" style={{ color: "oklch(0.45 0.04 260)" }}>
                    Drag cards you want to offer → to the right
                  </p>
                </div>

                {/* My cards grid */}
                <DropZone id="my-cards-zone" className="flex-1 overflow-y-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {loadingCards ? (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />
                      ))}
                    </div>
                  ) : availableCards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <p className="text-xs" style={{ color: "oklch(0.45 0.04 260)" }}>
                        {myCards.length === 0 ? "No cards in your collection" : "No cards match your search"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {availableCards.map((card) => (
                        <DraggableOfferCard key={card.id} id={card.id}>
                          <MiniCardTile card={card} />
                        </DraggableOfferCard>
                      ))}
                    </div>
                  )}
                </DropZone>
              </div>

              {/* Right — Offering + message */}
              <div className="flex flex-col w-1/2">
                <div className="px-4 pt-4 pb-2 shrink-0">
                  <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.65 0.08 260)" }}>
                    Offering ({offeredIds.length} card{offeredIds.length !== 1 ? "s" : ""})
                  </p>
                </div>

                {/* Offered cards drop zone */}
                <div className="flex-1 min-h-0 overflow-y-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <DropZone
                    id="offered-zone"
                    className={cn("min-h-32 rounded-xl p-2", offeredCards.length === 0 && "flex items-center justify-center")}
                  >
                    <div style={{ background: "oklch(0.16 0.04 260 / 0.5)", borderRadius: 12, minHeight: "inherit" }}>
                    {offeredCards.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-6">
                        <ArrowRightLeftIcon className="h-6 w-6" style={{ color: "oklch(0.35 0.06 260)" }} />
                        <p className="text-xs text-center" style={{ color: "oklch(0.40 0.04 260)" }}>
                          Drop cards here to offer them
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {offeredCards.map((card) => (
                          <DraggableOfferedCard key={card.id} id={card.id}>
                            <MiniCardTile
                              card={card}
                              action={
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setOfferedIds((prev) => prev.filter((id) => id !== card.id)); }}
                                  className="h-5 w-5 flex items-center justify-center rounded-full bg-black/60 hover:bg-red-500/80 transition-colors"
                                >
                                  <XIcon className="h-2.5 w-2.5 text-white" />
                                </button>
                              }
                            />
                          </DraggableOfferedCard>
                        ))}
                      </div>
                    )}
                    </div>
                  </DropZone>
                </div>

                {/* Message + submit */}
                <div className="px-4 pb-4 pt-2 shrink-0 space-y-3" style={{ borderTop: "1px solid oklch(0.22 0.04 260 / 0.4)" }}>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a message (optional)…"
                    rows={3}
                    maxLength={500}
                    className="w-full rounded-xl px-3 py-2 text-xs resize-none outline-none"
                    style={{ background: "oklch(0.18 0.04 260 / 0.6)", border: "1px solid oklch(0.28 0.06 260 / 0.4)", color: "oklch(0.82 0.02 260)" }}
                  />

                  {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "oklch(0.22 0.1 20 / 0.4)", color: "oklch(0.75 0.15 20)", border: "1px solid oklch(0.35 0.12 20 / 0.4)" }}>
                      <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || offeredIds.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "oklch(0.55 0.2 260)", color: "white" }}
                  >
                    {submitting ? (
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <SendIcon className="h-3.5 w-3.5" />
                    )}
                    {submitting ? "Sending…" : "Send Trade Request"}
                  </button>

                  {offeredIds.length === 0 && (
                    <p className="text-[10px] text-center" style={{ color: "oklch(0.40 0.04 260)" }}>
                      Add at least one card to offer
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Drag overlay */}
            <DndDragOverlay dropAnimation={null}>
              {activeDragCard && (
                <div className="w-20 aspect-[5/7] rounded-xl overflow-hidden shadow-2xl rotate-3 opacity-90">
                  {activeDragCard.photoUrl ? (
                    <SmartCardImage src={activeDragCard.photoUrl} alt={activeDragCard.name} unoptimized={activeDragCard.photoUrl.startsWith("http")} />
                  ) : (
                    <div className="h-full bg-muted rounded-xl flex items-center justify-center text-2xl">🃏</div>
                  )}
                </div>
              )}
            </DndDragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
