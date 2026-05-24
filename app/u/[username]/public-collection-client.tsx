"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { Card } from "@/lib/db/schema";
import { SmartCardImage } from "@/components/cards/smart-card-image";
import { ArrowRightLeftIcon, SearchIcon, LayersIcon, EyeIcon, EyeOffIcon, XIcon, ZoomInIcon, ZoomOutIcon, SlidersHorizontalIcon, CheckIcon, MessageCircleIcon } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { updateCardsTradeBait } from "@/lib/actions";

const GENRES = [
  { value: "all",        label: "All" },
  { value: "basketball", label: "Basketball" },
  { value: "baseball",   label: "Baseball" },
  { value: "football",   label: "Football" },
  { value: "soccer",     label: "Soccer" },
  { value: "hockey",     label: "Hockey" },
  { value: "pokemon",    label: "Pokémon" },
  { value: "yugioh",     label: "Yu-Gi-Oh!" },
  { value: "magic",      label: "Magic" },
  { value: "other",      label: "Other" },
];

const GRADE_STYLES: Record<string, { bg: string; text: string }> = {
  PSA:     { bg: "oklch(0.22 0.12 240 / 0.6)", text: "oklch(0.75 0.2 240)" },
  BGS:     { bg: "oklch(0.22 0.12 60 / 0.6)",  text: "oklch(0.80 0.18 60)" },
  Beckett: { bg: "oklch(0.22 0.12 60 / 0.6)",  text: "oklch(0.80 0.18 60)" },
  CGC:     { bg: "oklch(0.22 0.10 180 / 0.6)", text: "oklch(0.75 0.15 180)" },
  SGC:     { bg: "oklch(0.22 0.12 20 / 0.6)",  text: "oklch(0.75 0.18 20)" },
  HGA:     { bg: "oklch(0.22 0.12 50 / 0.6)",  text: "oklch(0.78 0.18 50)" },
};

// ─── DnD helpers ─────────────────────────────────────────────────────────────
function DraggableCard({ id, fromTrade, className, children }: { id: string; fromTrade: boolean; className?: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data: { fromTrade } });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`touch-none${className ? ` ${className}` : ""}`}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, opacity: isDragging ? 0.3 : 1 }}
    >
      {children}
    </div>
  );
}

function DropZone({ id, active, hue = 260, children }: { id: string; active: boolean; hue?: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={active ? {
        borderRadius: 16,
        outline: isOver ? `2px dashed oklch(0.65 0.2 ${hue} / 0.7)` : `2px dashed oklch(0.3 0.08 ${hue} / 0.3)`,
        outlineOffset: 4,
        transition: "outline-color 0.15s",
      } : undefined}
    >
      {children}
    </div>
  );
}

export function PublicCollectionClient({
  cards,
  isOwner = false,
  tradeBaitOnly = false,
  isSignedIn = false,
  ownerUsername = "",
}: {
  cards: Card[];
  isOwner?: boolean;
  tradeBaitOnly?: boolean;
  isSignedIn?: boolean;
  ownerUsername?: string;
}) {
  const [activeGenre, setActiveGenre] = useState("all");
  const [activeGrader, setActiveGrader] = useState("all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tradeSearchInputRef = useRef<HTMLInputElement>(null);
  const [tradeSearch, setTradeSearch] = useState("");
  const [tradeSearchOpen, setTradeSearchOpen] = useState(false);
  const [tradeGenre, setTradeGenre] = useState("all");
  const [tradeGrader, setTradeGrader] = useState("all");
  const [tradeFilterOpen, setTradeFilterOpen] = useState(false);
  const tradeFilterRef = useRef<HTMLDivElement>(null);
  const [viewAsVisitor, setViewAsVisitor] = useState(false);
  // Optimistic overrides: cardId → isTradeBait
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // What a non-owner visitor would see
  const visitorCards = useMemo(
    () => (tradeBaitOnly ? cards.filter((c) => c.isTradeBait) : cards),
    [cards, tradeBaitOnly],
  );

  // What to actually display (owner sees all; visitor/preview sees filtered)
  const displayCards = isOwner && !viewAsVisitor ? cards : visitorCards;

  // Apply optimistic overrides on top
  const displayWithOverrides = useMemo(
    () => displayCards.map((c) => overrides.has(c.id) ? { ...c, isTradeBait: overrides.get(c.id)! } : c),
    [displayCards, overrides],
  );

  const activeGenres = useMemo(() => new Set(displayWithOverrides.map((c) => c.sportGenre)), [displayWithOverrides]);
  const visibleGenres = GENRES.filter((g) => g.value === "all" || activeGenres.has(g.value));
  const activeGraders = useMemo(() => Array.from(new Set(displayWithOverrides.map((c) => c.gradeCompany).filter(Boolean) as string[])).sort(), [displayWithOverrides]);
  const tradeBait = useMemo(() => displayWithOverrides.filter((c) => c.isTradeBait), [displayWithOverrides]);

  const tradeGenres = useMemo(() => new Set(tradeBait.map((c) => c.sportGenre)), [tradeBait]);
  const visibleTradeGenres = GENRES.filter((g) => g.value === "all" || tradeGenres.has(g.value));
  const tradeGraders = useMemo(() => Array.from(new Set(tradeBait.map((c) => c.gradeCompany).filter(Boolean) as string[])).sort(), [tradeBait]);
  const filteredTrade = useMemo(() => tradeBait.filter((c) => {
    if (tradeGenre !== "all" && c.sportGenre !== tradeGenre) return false;
    if (tradeGrader !== "all" && c.gradeCompany !== tradeGrader) return false;
    if (tradeSearch && !c.name.toLowerCase().includes(tradeSearch.toLowerCase())) return false;
    return true;
  }), [tradeBait, tradeGenre, tradeGrader, tradeSearch]);

  const filtered = useMemo(() => {
    return displayWithOverrides.filter((c) => {
      if (c.isTradeBait) return false;
      if (activeGenre !== "all" && c.sportGenre !== activeGenre) return false;
      if (activeGrader !== "all" && c.gradeCompany !== activeGrader) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [displayWithOverrides, activeGenre, activeGrader, search]);

  const showTradeToggles = isOwner && !viewAsVisitor;
  const [zoomCard, setZoomCard] = useState<{ src: string; name: string; year?: string | null; setName?: string | null; gradeCompany?: string | null; gradeValue?: string | null } | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (tradeFilterRef.current && !tradeFilterRef.current.contains(e.target as Node)) setTradeFilterOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if (searchOpen) searchInputRef.current?.focus(); }, [searchOpen]);
  useEffect(() => { if (tradeSearchOpen) tradeSearchInputRef.current?.focus(); }, [tradeSearchOpen]);

  async function handleToggleTrade(id: string, current: boolean) {
    setOverrides((prev) => new Map(prev).set(id, !current));
    try {
      await updateCardsTradeBait([id], !current);
    } catch {
      setOverrides((prev) => new Map(prev).set(id, current));
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const fromTrade = (active.data.current as { fromTrade: boolean }).fromTrade;
    if (over.id === "trade-zone" && !fromTrade) {
      handleToggleTrade(active.id as string, false);
    } else if (over.id === "collection-zone" && fromTrade) {
      handleToggleTrade(active.id as string, true);
    }
  }

  const collectionCount = displayWithOverrides.filter((c) => !c.isTradeBait).length;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDragId(null)}>
    <div className="space-y-6">

      {/* ── Owner banner ────────────────────────────────────────────────── */}
      {isOwner && !viewAsVisitor && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl"
          style={{ background: "oklch(0.25 0.12 80 / 0.22)", border: "1px solid oklch(0.5 0.16 80 / 0.28)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <EyeOffIcon className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.72 0.16 80)" }} />
            <span className="text-xs truncate" style={{ color: "oklch(0.72 0.16 80)" }}>
              Only you can see this view — tap the trade icon on any card to toggle it.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setViewAsVisitor(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-opacity hover:opacity-80"
            style={{ background: "oklch(0.32 0.12 80 / 0.4)", color: "oklch(0.80 0.14 80)", border: "1px solid oklch(0.5 0.16 80 / 0.3)" }}
          >
            <EyeIcon className="h-3.5 w-3.5" />
            View as visitor
          </button>
        </div>
      )}

      {/* ── Visitor preview banner ──────────────────────────────────────── */}
      {isOwner && viewAsVisitor && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl"
          style={{ background: "oklch(0.20 0.06 260 / 0.35)", border: "1px solid oklch(0.4 0.08 260 / 0.4)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <EyeIcon className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.65 0.08 260)" }} />
            <span className="text-xs truncate" style={{ color: "oklch(0.65 0.08 260)" }}>
              Viewing as a visitor — this is exactly what others see.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setViewAsVisitor(false)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-opacity hover:opacity-80"
            style={{ background: "oklch(0.28 0.06 260 / 0.45)", color: "oklch(0.75 0.06 260)", border: "1px solid oklch(0.4 0.08 260 / 0.4)" }}
          >
            <EyeOffIcon className="h-3.5 w-3.5" />
            Exit visitor view
          </button>
        </div>
      )}

      {/* ── Trade Bait section ─────────────────────────────────────────── */}
      {/* Visitor: empty state */}
      {(!isOwner || viewAsVisitor) && tradeBait.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl" style={{ background: "oklch(0.22 0.12 160 / 0.2)", color: "oklch(0.5 0.14 160)" }}>
            <ArrowRightLeftIcon className="h-7 w-7" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold" style={{ color: "oklch(0.55 0.03 260)" }}>No cards listed for trade yet</p>
            <p className="text-xs" style={{ color: "oklch(0.38 0.02 260)" }}>Check back later — this collector may list cards for trade soon.</p>
          </div>
        </div>
      )}
      {/* Owner: always render (drop target even when empty) */}
      {isOwner && !viewAsVisitor && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-6 h-6 rounded-md" style={{ background: "oklch(0.22 0.12 160 / 0.4)", color: "oklch(0.7 0.18 160)" }}>
              <ArrowRightLeftIcon className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-bold tracking-wide uppercase" style={{ color: "oklch(0.65 0.03 260)" }}>LISTED FOR TRADE</h2>
            {tradeBait.length > 0 && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.22 0.12 160 / 0.4)", color: "oklch(0.7 0.18 160)" }}>{tradeBait.length}</span>
            )}
            <div className="flex-1" />
            {tradeBait.length > 0 && (
              <div className="flex items-center">
                <button type="button" onClick={() => setTradeSearchOpen((v) => !v)} aria-label="Search" className="flex items-center justify-center h-8 w-8 shrink-0 transition-opacity hover:opacity-70" style={{ color: tradeSearch || tradeSearchOpen ? "oklch(0.68 0.02 260)" : "oklch(0.42 0.02 260)" }}>
                  <SearchIcon className="h-4 w-4" />
                </button>
                <div className="overflow-hidden transition-all duration-200 ease-out" style={{ maxWidth: tradeSearchOpen ? "10rem" : "0px", opacity: tradeSearchOpen ? 1 : 0 }}>
                  <div className="relative w-36 ml-0.5">
                    <input ref={tradeSearchInputRef} type="text" placeholder="Search..." value={tradeSearch} onChange={(e) => setTradeSearch(e.target.value)} onBlur={() => { if (!tradeSearch) setTradeSearchOpen(false); }} onKeyDown={(e) => { if (e.key === "Escape") { setTradeSearch(""); setTradeSearchOpen(false); } }} className="h-8 w-full rounded-full pl-3 pr-7 text-xs focus:outline-none" style={{ background: "transparent", border: "none", color: "oklch(0.85 0.02 260)" }} />
                    {tradeSearch && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setTradeSearch(""); setTradeSearchOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"><XIcon className="h-3 w-3" style={{ color: "oklch(0.65 0.02 260)" }} /></button>}
                  </div>
                </div>
              </div>
            )}
            {tradeBait.length > 0 && (
              <div className="relative" ref={tradeFilterRef}>
                <button type="button" onClick={() => setTradeFilterOpen((v) => !v)} aria-label="Trade filters" className="relative flex items-center justify-center h-8 w-8 transition-opacity hover:opacity-70" style={{ color: tradeGenre !== "all" || tradeGrader !== "all" ? "oklch(0.75 0.03 260)" : "oklch(0.42 0.02 260)" }}>
                  <SlidersHorizontalIcon className="h-3.5 w-3.5" />
                  {(tradeGenre !== "all" || tradeGrader !== "all") && (
                    <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full" style={{ background: "oklch(0.65 0.18 160)" }} />
                  )}
                </button>
                {tradeFilterOpen && (
                  <div className="absolute right-0 top-full mt-1 rounded-lg shadow-xl z-50 min-w-44 p-1.5" style={{ background: "oklch(0.12 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                    <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.45 0.02 260)" }}>Sport</p>
                    {visibleTradeGenres.map(({ value, label }) => (
                      <button key={value} type="button" onClick={() => { setTradeGenre(value); setTradeFilterOpen(false); }} className={`flex items-center justify-between w-full px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tradeGenre === value ? "hover:opacity-90" : "hover:bg-[oklch(0.2_0.03_260)]"}`} style={tradeGenre === value ? { background: "oklch(0.4 0.18 160)", color: "oklch(0.98 0.01 260)" } : { color: "oklch(0.65 0.03 260)" }}>
                        {label}{tradeGenre === value && <CheckIcon className="h-3.5 w-3.5 ml-3 shrink-0" />}
                      </button>
                    ))}
                    {tradeGraders.length > 0 && (
                      <>
                        <div className="h-px mx-2 my-1.5" style={{ background: "oklch(0.22 0.02 260)" }} />
                        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.45 0.02 260)" }}>Grading</p>
                        {[{ value: "all", label: "All" }, ...tradeGraders.map((g) => ({ value: g, label: g }))].map(({ value, label }) => (
                          <button key={value} type="button" onClick={() => { setTradeGrader(value); setTradeFilterOpen(false); }} className={`flex items-center justify-between w-full px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tradeGrader === value ? "hover:opacity-90" : "hover:bg-[oklch(0.2_0.03_260)]"}`} style={tradeGrader === value ? { background: "oklch(0.4 0.18 160)", color: "oklch(0.98 0.01 260)" } : { color: "oklch(0.65 0.03 260)" }}>
                            {label}{tradeGrader === value && <CheckIcon className="h-3.5 w-3.5 ml-3 shrink-0" />}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DropZone id="trade-zone" active={!!activeDragId} hue={160}>
            {tradeBait.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 rounded-xl" style={{ border: "2px dashed oklch(0.3 0.1 160 / 0.35)", color: "oklch(0.4 0.06 260)" }}>
                <ArrowRightLeftIcon className="h-4 w-4" style={{ color: "oklch(0.4 0.12 160 / 0.7)" }} />
                <span className="text-xs">Drag cards here to list for trade</span>
              </div>
            ) : filteredTrade.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8" style={{ color: "oklch(0.4 0.06 260)" }}>
                <SearchIcon className="h-4 w-4" />
                <span className="text-xs">No cards match your search.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredTrade.map((card) => (
                  <DraggableCard key={card.id} id={card.id} fromTrade={true}>
                    <div className="group/tb">
                      <div
                        className="relative aspect-[5/7] rounded-xl overflow-hidden transition-all duration-200 group-hover/tb:-translate-y-1.5"
                        style={{ border: "1px solid oklch(0.3 0.12 160 / 0.5)", boxShadow: "0 0 0 1px oklch(0.5 0.18 160 / 0.2), 0 4px 16px oklch(0.05 0.05 260)", transitionProperty: "transform, box-shadow" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px oklch(0.5 0.18 160 / 0.3), 0 8px 24px oklch(0.5 0.18 160 / 0.35)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px oklch(0.5 0.18 160 / 0.2), 0 4px 16px oklch(0.05 0.05 260)"; }}
                      >
                        <SmartCardImage src={card.photoUrl ?? undefined} alt={card.name} containerClassName="w-full h-full" fitMode="cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/tb:opacity-100 transition-opacity duration-200" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        {card.photoUrl && (
                          <button type="button" onClick={() => setZoomCard({ src: card.photoUrl!, name: card.name, year: card.year?.toString() ?? null, setName: card.setName, gradeCompany: card.gradeCompany, gradeValue: card.gradeValue })} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/tb:opacity-100 transition-all duration-200" aria-label="Zoom in">
                            <ZoomInIcon className="h-10 w-10" style={{ color: "oklch(0.97 0.01 260 / 0.65)", filter: "drop-shadow(0 2px 10px oklch(0 0 0 / 0.6))" }} />
                          </button>
                        )}
                        {card.gradeCompany && card.gradeValue && (
                          <div className="absolute top-2 right-2 flex flex-col items-center px-1.5 py-0.5 rounded-md backdrop-blur-sm" style={{ background: GRADE_STYLES[card.gradeCompany]?.bg ?? "oklch(0.15 0.02 260 / 0.8)" }}>
                            <span className="text-[9px] font-bold uppercase leading-tight" style={{ color: GRADE_STYLES[card.gradeCompany]?.text ?? "oklch(0.7 0.03 260)" }}>{card.gradeCompany}</span>
                            <span className="text-xs font-black leading-tight text-white">{card.gradeValue}</span>
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-[11px] font-semibold leading-tight text-white line-clamp-2 drop-shadow">{card.name}</p>
                        </div>
                        <button type="button" title="Remove from trade" onClick={(e) => { e.stopPropagation(); handleToggleTrade(card.id, true); }} className="absolute top-2 left-2 flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-sm transition-transform hover:scale-110 active:scale-95" style={{ background: "oklch(0.22 0.14 160 / 0.85)", border: "1px solid oklch(0.5 0.18 160 / 0.5)" }}>
                          <ArrowRightLeftIcon className="h-3 w-3" style={{ color: "oklch(0.75 0.18 160)" }} />
                        </button>
                      </div>
                      <div className="mt-1.5 h-3" />
                    </div>
                  </DraggableCard>
                ))}
              </div>
            )}
          </DropZone>
          <div className="h-px mt-4" style={{ background: "oklch(0.18 0.01 260)" }} />
        </section>
      )}
      {/* Visitor: show grid when there are trade cards */}
      {(!isOwner || viewAsVisitor) && tradeBait.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-6 h-6 rounded-md" style={{ background: "oklch(0.22 0.12 160 / 0.4)", color: "oklch(0.7 0.18 160)" }}>
              <ArrowRightLeftIcon className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-bold tracking-wide uppercase" style={{ color: "oklch(0.65 0.03 260)" }}>LISTED FOR TRADE</h2>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.22 0.12 160 / 0.4)", color: "oklch(0.7 0.18 160)" }}>{tradeBait.length}</span>
            <div className="flex-1" />
<div className="flex items-center">
              <button type="button" onClick={() => setTradeSearchOpen((v) => !v)} aria-label="Search" className="flex items-center justify-center h-8 w-8 shrink-0 transition-opacity hover:opacity-70" style={{ color: tradeSearch || tradeSearchOpen ? "oklch(0.68 0.02 260)" : "oklch(0.42 0.02 260)" }}>
                <SearchIcon className="h-4 w-4" />
              </button>
              <div className="overflow-hidden transition-all duration-200 ease-out" style={{ maxWidth: tradeSearchOpen ? "10rem" : "0px", opacity: tradeSearchOpen ? 1 : 0 }}>
                <div className="relative w-36 ml-0.5">
                  <input ref={tradeSearchInputRef} type="text" placeholder="Search..." value={tradeSearch} onChange={(e) => setTradeSearch(e.target.value)} onBlur={() => { if (!tradeSearch) setTradeSearchOpen(false); }} onKeyDown={(e) => { if (e.key === "Escape") { setTradeSearch(""); setTradeSearchOpen(false); } }} className="h-8 w-full rounded-full pl-3 pr-7 text-xs focus:outline-none" style={{ background: "transparent", border: "none", color: "oklch(0.85 0.02 260)" }} />
                  {tradeSearch && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setTradeSearch(""); setTradeSearchOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"><XIcon className="h-3 w-3" style={{ color: "oklch(0.65 0.02 260)" }} /></button>}
                </div>
              </div>
            </div>
            <div className="relative" ref={tradeFilterRef}>
              <button type="button" onClick={() => setTradeFilterOpen((v) => !v)} aria-label="Trade filters" className="relative flex items-center justify-center h-8 w-8 transition-opacity hover:opacity-70" style={{ color: tradeGenre !== "all" || tradeGrader !== "all" ? "oklch(0.75 0.03 260)" : "oklch(0.42 0.02 260)" }}>
                <SlidersHorizontalIcon className="h-3.5 w-3.5" />
                {(tradeGenre !== "all" || tradeGrader !== "all") && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full" style={{ background: "oklch(0.65 0.18 160)" }} />
                )}
              </button>
              {tradeFilterOpen && (
                <div className="absolute right-0 top-full mt-1 rounded-lg shadow-xl z-50 min-w-44 p-1.5" style={{ background: "oklch(0.12 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                  <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.45 0.02 260)" }}>Sport</p>
                  {visibleTradeGenres.map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => { setTradeGenre(value); setTradeFilterOpen(false); }} className={`flex items-center justify-between w-full px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tradeGenre === value ? "hover:opacity-90" : "hover:bg-[oklch(0.2_0.03_260)]"}`} style={tradeGenre === value ? { background: "oklch(0.4 0.18 160)", color: "oklch(0.98 0.01 260)" } : { color: "oklch(0.65 0.03 260)" }}>
                      {label}{tradeGenre === value && <CheckIcon className="h-3.5 w-3.5 ml-3 shrink-0" />}
                    </button>
                  ))}
                  {tradeGraders.length > 0 && (
                    <>
                      <div className="h-px mx-2 my-1.5" style={{ background: "oklch(0.22 0.02 260)" }} />
                      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.45 0.02 260)" }}>Grading</p>
                      {[{ value: "all", label: "All" }, ...tradeGraders.map((g) => ({ value: g, label: g }))].map(({ value, label }) => (
                        <button key={value} type="button" onClick={() => { setTradeGrader(value); setTradeFilterOpen(false); }} className={`flex items-center justify-between w-full px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tradeGrader === value ? "hover:opacity-90" : "hover:bg-[oklch(0.2_0.03_260)]"}`} style={tradeGrader === value ? { background: "oklch(0.4 0.18 160)", color: "oklch(0.98 0.01 260)" } : { color: "oklch(0.65 0.03 260)" }}>
                          {label}{tradeGrader === value && <CheckIcon className="h-3.5 w-3.5 ml-3 shrink-0" />}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          {filteredTrade.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8" style={{ color: "oklch(0.4 0.06 260)" }}>
              <SearchIcon className="h-4 w-4" />
              <span className="text-xs">No cards match your search.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredTrade.map((card) => (
              <div key={card.id} className="group/tb">
                <div className="relative aspect-[5/7] rounded-xl overflow-hidden transition-all duration-200 group-hover/tb:-translate-y-1" style={{ border: "1px solid oklch(0.3 0.12 160 / 0.5)", boxShadow: "0 0 0 1px oklch(0.5 0.18 160 / 0.2), 0 4px 16px oklch(0.05 0.05 260)" }}>
                  <SmartCardImage src={card.photoUrl ?? undefined} alt={card.name} containerClassName="w-full h-full" fitMode="cover" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/tb:opacity-100 transition-opacity duration-200" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {card.photoUrl && (
                    <button type="button" onClick={() => setZoomCard({ src: card.photoUrl!, name: card.name, year: card.year?.toString() ?? null, setName: card.setName, gradeCompany: card.gradeCompany, gradeValue: card.gradeValue })} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/tb:opacity-100 transition-all duration-200" aria-label="Zoom in">
                      <ZoomInIcon className="h-10 w-10" style={{ color: "oklch(0.97 0.01 260 / 0.65)", filter: "drop-shadow(0 2px 10px oklch(0 0 0 / 0.6))" }} />
                    </button>
                  )}
                  {card.gradeCompany && card.gradeValue && (
                    <div className="absolute top-2 right-2 flex flex-col items-center px-1.5 py-0.5 rounded-md backdrop-blur-sm" style={{ background: GRADE_STYLES[card.gradeCompany]?.bg ?? "oklch(0.15 0.02 260 / 0.8)" }}>
                      <span className="text-[9px] font-bold uppercase leading-tight" style={{ color: GRADE_STYLES[card.gradeCompany]?.text ?? "oklch(0.7 0.03 260)" }}>{card.gradeCompany}</span>
                      <span className="text-xs font-black leading-tight text-white">{card.gradeValue}</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 px-0.5">
                  <p className="text-xs font-semibold leading-tight truncate" style={{ color: "oklch(0.88 0.02 260)" }}>{card.name}</p>
                  {(card.year || card.setName) && (
                    <p className="text-[10px] truncate mt-0.5" style={{ color: "oklch(0.48 0.02 260)" }}>{[card.year, card.setName].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
                {isSignedIn && !isOwner && (
                  <button type="button" title={`Request trade with @${ownerUsername}`} onClick={() => { window.location.href = `/trade/request?to=${encodeURIComponent(ownerUsername)}&card=${encodeURIComponent(card.id)}`; }} className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95" style={{ background: "oklch(0.22 0.12 160 / 0.3)", border: "1px solid oklch(0.4 0.16 160 / 0.4)", color: "oklch(0.72 0.16 160)" }}>
                    <MessageCircleIcon className="h-3.5 w-3.5" />
                    Request Trade
                  </button>
                )}
              </div>
            ))}
            </div>
          )}
        </section>
      )}

      {/* ── Filter bar + grid ───────────────────────────────────────────── */}
      {isOwner && !viewAsVisitor && (displayWithOverrides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl" style={{ background: "oklch(0.14 0.02 260)", color: "oklch(0.35 0.03 260)" }}>
            <LayersIcon className="h-8 w-8" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-base font-semibold" style={{ color: "oklch(0.65 0.03 260)" }}>Nothing here yet</p>
            <p className="text-sm" style={{ color: "oklch(0.42 0.02 260)" }}>This collector hasn&apos;t added any cards to their public profile.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            {/* Title */}
            <div className="flex items-center justify-center w-6 h-6 rounded-md" style={{ background: "oklch(0.22 0.12 260 / 0.4)", color: "oklch(0.7 0.15 260)" }}>
              <LayersIcon className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-bold tracking-wide uppercase" style={{ color: "oklch(0.65 0.03 260)" }}>
              MY COLLECTION
            </h2>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.22 0.12 260 / 0.4)", color: "oklch(0.7 0.15 260)" }}>
              {collectionCount}
            </span>
            <div className="flex-1" />
{/* Search */}
            <div className="flex items-center">
              <button type="button" onClick={() => setSearchOpen((v) => !v)} aria-label="Search" className="flex items-center justify-center h-8 w-8 shrink-0 transition-opacity hover:opacity-70" style={{ color: search || searchOpen ? "oklch(0.68 0.02 260)" : "oklch(0.42 0.02 260)" }}>
                <SearchIcon className="h-4 w-4" />
              </button>
              <div className="overflow-hidden transition-all duration-200 ease-out" style={{ maxWidth: searchOpen ? "13rem" : "0px", opacity: searchOpen ? 1 : 0 }}>
                <div className="relative w-48 ml-0.5">
                  <input ref={searchInputRef} type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => { if (!search) setSearchOpen(false); }} onKeyDown={(e) => { if (e.key === "Escape") { setSearch(""); setSearchOpen(false); } }} className="h-8 w-full rounded-full pl-3 pr-7 text-xs focus:outline-none" style={{ background: "transparent", border: "none", color: "oklch(0.85 0.02 260)" }} />
                  {search && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setSearch(""); setSearchOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"><XIcon className="h-3 w-3" style={{ color: "oklch(0.65 0.02 260)" }} /></button>}
                </div>
              </div>
            </div>
            {/* Filter dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                aria-label="Filters"
                className="relative flex items-center justify-center h-8 w-8 transition-opacity hover:opacity-70"
                style={{ color: activeGenre !== "all" || activeGrader !== "all" ? "oklch(0.75 0.03 260)" : "oklch(0.42 0.02 260)" }}
              >
                <SlidersHorizontalIcon className="h-3.5 w-3.5" />
                {(activeGenre !== "all" || activeGrader !== "all") && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full" style={{ background: "oklch(0.65 0.18 260)" }} />
                )}
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-1 rounded-lg shadow-xl z-50 min-w-44 p-1.5" style={{ background: "oklch(0.12 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                  <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.45 0.02 260)" }}>Sport</p>
                  {visibleGenres.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setActiveGenre(value); setFilterOpen(false); }}
                      className={`flex items-center justify-between w-full px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                        activeGenre === value ? "hover:opacity-90" : "hover:bg-[oklch(0.2_0.03_260)]"
                      }`}
                      style={activeGenre === value
                        ? { background: "oklch(0.55 0.18 260)", color: "oklch(0.98 0.01 260)" }
                        : { color: "oklch(0.65 0.03 260)" }
                      }
                    >
                      {label}
                      {activeGenre === value && <CheckIcon className="h-3.5 w-3.5 ml-3 shrink-0" />}
                    </button>
                  ))}
                  {activeGraders.length > 0 && (
                    <>
                      <div className="h-px mx-2 my-1.5" style={{ background: "oklch(0.22 0.02 260)" }} />
                      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.45 0.02 260)" }}>Grading</p>
                      {[{ value: "all", label: "All" }, ...activeGraders.map((g) => ({ value: g, label: g }))].map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => { setActiveGrader(value); setFilterOpen(false); }}
                          className={`flex items-center justify-between w-full px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                            activeGrader === value ? "hover:opacity-90" : "hover:bg-[oklch(0.2_0.03_260)]"
                          }`}
                          style={activeGrader === value
                            ? { background: "oklch(0.55 0.18 260)", color: "oklch(0.98 0.01 260)" }
                            : { color: "oklch(0.65 0.03 260)" }
                          }
                        >
                          {label}
                          {activeGrader === value && <CheckIcon className="h-3.5 w-3.5 ml-3 shrink-0" />}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <DropZone id="collection-zone" active={!!activeDragId}>
            {collectionCount === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 rounded-xl" style={{ border: "2px dashed oklch(0.3 0.08 260 / 0.35)", color: "oklch(0.4 0.06 260)" }}>
                <LayersIcon className="h-4 w-4" style={{ color: "oklch(0.4 0.1 260 / 0.7)" }} />
                <span className="text-xs">Drag cards here to add to your collection</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <SearchIcon className="h-8 w-8" style={{ color: "oklch(0.32 0.02 260)" }} />
                <p className="text-sm" style={{ color: "oklch(0.45 0.02 260)" }}>No cards match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filtered.map((card) => (
                  showTradeToggles ? (
                    <DraggableCard key={card.id} id={card.id} fromTrade={false}>
                      <CardTile
                        card={card}
                        onToggleTrade={handleToggleTrade}
                        onZoom={card.photoUrl ? () => setZoomCard({ src: card.photoUrl!, name: card.name, year: card.year?.toString() ?? null, setName: card.setName, gradeCompany: card.gradeCompany, gradeValue: card.gradeValue }) : undefined}
                      />
                    </DraggableCard>
                  ) : (
                    <CardTile
                      key={card.id}
                      card={card}
                      onToggleTrade={undefined}
                      onZoom={card.photoUrl ? () => setZoomCard({ src: card.photoUrl!, name: card.name, year: card.year?.toString() ?? null, setName: card.setName, gradeCompany: card.gradeCompany, gradeValue: card.gradeValue }) : undefined}
                    />
                  )
                ))}
              </div>
            )}
          </DropZone>
        </>
      ))}

      {zoomCard && (
        <CardImageViewer src={zoomCard.src} name={zoomCard.name} year={zoomCard.year} setName={zoomCard.setName} gradeCompany={zoomCard.gradeCompany} gradeValue={zoomCard.gradeValue} onClose={() => setZoomCard(null)} />
      )}
    </div>
    <DragOverlay dropAnimation={null}>
      {activeDragId ? (() => {
        const c = displayWithOverrides.find((x) => x.id === activeDragId);
        return c ? (
          <div className="w-32 aspect-[5/7] rounded-xl overflow-hidden rotate-3 pointer-events-none" style={{ boxShadow: "0 16px 40px oklch(0 0 0 / 0.7)", border: "2px solid oklch(0.6 0.2 260 / 0.6)" }}>
            <SmartCardImage src={c.photoUrl ?? undefined} alt={c.name} containerClassName="w-full h-full" fitMode="cover" />
          </div>
        ) : null;
      })() : null}
    </DragOverlay>
    </DndContext>
  );
}

function CardTile({
  card,
  onToggleTrade,
  onZoom,
}: {
  card: Card;
  onToggleTrade?: (id: string, current: boolean) => void;
  onZoom?: () => void;
}) {
  return (
    <div className="group relative">
      <div
        className="relative aspect-[5/7] rounded-xl overflow-hidden transition-all duration-200 group-hover:-translate-y-1"
        style={{
          border: "1px solid oklch(0.22 0.02 260)",
          background: "oklch(0.12 0.02 260)",
          boxShadow: "0 2px 8px oklch(0.04 0.02 260)",
        }}
      >
        <SmartCardImage
          src={card.photoUrl ?? undefined}
          alt={card.name}
          containerClassName="w-full h-full"
          fitMode="cover"
        />

        {/* Hover dim */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Magnifier icon */}
        {onZoom && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onZoom(); }}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
            aria-label="Zoom in"
          >
            <div
              className="flex items-center justify-center"
            >
              <ZoomInIcon className="h-10 w-10" style={{ color: "oklch(0.97 0.01 260 / 0.65)", filter: "drop-shadow(0 2px 10px oklch(0 0 0 / 0.6))" }} />
            </div>
          </button>
        )}

        {card.gradeCompany && card.gradeValue && (
          <div
            className="absolute top-2 right-2 flex flex-col items-center px-1.5 py-0.5 rounded-md backdrop-blur-sm"
            style={{ background: GRADE_STYLES[card.gradeCompany]?.bg ?? "oklch(0.15 0.02 260 / 0.85)" }}
          >
            <span className="text-[9px] font-bold uppercase leading-tight"
              style={{ color: GRADE_STYLES[card.gradeCompany]?.text ?? "oklch(0.7 0.03 260)" }}>
              {card.gradeCompany}
            </span>
            <span className="text-xs font-black leading-tight text-white">{card.gradeValue}</span>
          </div>
        )}

        {/* Trade badge / owner toggle */}
        {onToggleTrade ? (
          <button
            type="button"
            title={card.isTradeBait ? "Remove from trade" : "Mark as trade bait"}
            onClick={(e) => { e.stopPropagation(); onToggleTrade(card.id, card.isTradeBait ?? false); }}
            className="absolute top-2 left-2 flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
            style={card.isTradeBait
              ? { background: "oklch(0.22 0.14 160 / 0.85)", border: "1px solid oklch(0.5 0.18 160 / 0.5)" }
              : { background: "oklch(0.18 0.02 260 / 0.85)", border: "1px solid oklch(0.35 0.02 260 / 0.5)" }
            }
          >
            <ArrowRightLeftIcon
              className="h-3 w-3"
              style={{ color: card.isTradeBait ? "oklch(0.75 0.18 160)" : "oklch(0.45 0.03 260)" }}
            />
          </button>
        ) : (
          card.isTradeBait && (
            <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full backdrop-blur-sm"
              style={{ background: "oklch(0.22 0.14 160 / 0.8)", border: "1px solid oklch(0.5 0.18 160 / 0.4)" }}>
              <ArrowRightLeftIcon className="h-2.5 w-2.5" style={{ color: "oklch(0.75 0.18 160)" }} />
            </div>
          )
        )}
      </div>

      <div className="mt-2 px-0.5 space-y-0.5">
        <p className="text-xs font-semibold leading-tight truncate" style={{ color: "oklch(0.88 0.02 260)" }}>{card.name}</p>
        {(card.year || card.setName) && (
          <p className="text-[10px] truncate" style={{ color: "oklch(0.48 0.02 260)" }}>
            {[card.year, card.setName].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

function CardImageViewer({ src, name, year, setName, gradeCompany, gradeValue, onClose }: { src: string; name: string; year?: string | null; setName?: string | null; gradeCompany?: string | null; gradeValue?: string | null; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    setCursor({ x: e.clientX, y: e.clientY, visible: true });
    if (!zoomed || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setZoomed((z) => !z);
    if (zoomed) setOrigin("50% 50%");
  }

  const CursorIcon = zoomed ? ZoomOutIcon : ZoomInIcon;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
      style={{ background: "oklch(0 0 0 / 0.92)", backdropFilter: "blur(16px)" }}
      onClick={onClose}
    >
      {/* Custom floating cursor */}
      {cursor.visible && (
        <div
          className="fixed z-[51] pointer-events-none flex items-center justify-center"
          style={{ left: cursor.x, top: cursor.y, transform: "translate(-50%, -50%)" }}
        >
          <CursorIcon className="h-10 w-10" style={{ color: "oklch(0.88 0.04 260 / 0.9)", filter: "drop-shadow(0 2px 8px oklch(0 0 0 / 0.7))" }} />
        </div>
      )}

      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-white/10"
        style={{ color: "oklch(0.6 0.02 260)", background: "oklch(0.15 0.02 260 / 0.8)" }}
      >
        <XIcon className="h-5 w-5" />
      </button>

      {/* Image */}
      <div
        ref={containerRef}
        className="overflow-hidden rounded-2xl"
        style={{
          maxWidth: "min(92vw, 680px)",
          cursor: "none",
          boxShadow: "0 32px 100px oklch(0 0 0 / 0.8)",
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setCursor((c) => ({ ...c, visible: false }));
          if (zoomed) setOrigin("50% 50%");
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Card"
          draggable={false}
          style={{
            display: "block",
            width: "auto",
            maxWidth: "100%",
            maxHeight: "58svh",
            height: "auto",
            transform: `scale(${zoomed ? 2.5 : 1})`,
            transformOrigin: origin,
            transition: zoomed ? "none" : "transform 0.25s ease",
            userSelect: "none",
          }}
        />
      </div>

      {/* Card info */}
      <div className="mt-5 text-center pointer-events-none">
        <p className="text-3xl font-bold" style={{ color: "oklch(0.88 0.02 260)" }}>{name}</p>
        {(year || setName) && (
          <p className="text-lg mt-2" style={{ color: "oklch(0.48 0.02 260)" }}>
            {[year, setName].filter(Boolean).join(" · ")}
          </p>
        )}
        {(gradeCompany || gradeValue) && (
          <p className="text-lg mt-2 font-semibold" style={{ color: GRADE_STYLES[gradeCompany ?? ""]?.text ?? "oklch(0.62 0.04 260)" }}>
            {[gradeCompany, gradeValue].filter(Boolean).join(" ")}
          </p>
        )}
      </div>

      {/* Hint */}
      <p
        className="absolute bottom-5 text-xs pointer-events-none"
        style={{ color: "oklch(0.38 0.02 260)" }}
      >
        {zoomed ? "Move to pan · click to zoom out" : "Click image to zoom in · ESC to close"}
      </p>
    </div>
  );
}

