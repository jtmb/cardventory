"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getCard, getLatestPrices, getCardPriceHistory, getCardNeighbors, deleteCard, updateCard } from "@/lib/actions";
import type { Card } from "@/lib/db/schema";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PriceChart } from "@/components/cards/price-chart";
import { SmartCardImage } from "@/components/cards/smart-card-image";
import {
  XIcon, ChevronLeftIcon, ChevronRightIcon,
  ExternalLinkIcon, PencilIcon, RefreshCwIcon, Trash2Icon, ArrowRightLeftIcon,
  ZoomInIcon, ZoomOutIcon,
} from "lucide-react";

type PriceEntry = Awaited<ReturnType<typeof getLatestPrices>>[number];
type HistoryEntry = Awaited<ReturnType<typeof getCardPriceHistory>>[number];

const GENRE_LABELS: Record<string, string> = {
  basketball: "Basketball", baseball: "Baseball", football: "Football",
  soccer: "Soccer", hockey: "Hockey", pokemon: "Pokémon",
  yugioh: "Yu-Gi-Oh!", magic: "Magic: The Gathering", other: "Other",
};

const SOURCE_LABELS: Record<string, string> = {
  pricecharting: "PriceCharting",
  sportscardinvestor: "SportsCardInvestor",
  cardladder: "CardLadder",
  sportscardspro: "SportsCardsPro",
};

const KNOWN_SOURCES = ["pricecharting", "sportscardinvestor", "sportscardspro"] as const;

const GRADE_STYLES: Record<string, { bg: string; text: string }> = {
  PSA:     { bg: "oklch(0.22 0.12 240 / 0.6)", text: "oklch(0.75 0.2 240)" },
  BGS:     { bg: "oklch(0.22 0.12 60 / 0.6)",  text: "oklch(0.80 0.18 60)" },
  Beckett: { bg: "oklch(0.22 0.12 60 / 0.6)",  text: "oklch(0.80 0.18 60)" },
  CGC:     { bg: "oklch(0.22 0.10 180 / 0.6)", text: "oklch(0.75 0.15 180)" },
  SGC:     { bg: "oklch(0.22 0.12 20 / 0.6)",  text: "oklch(0.75 0.18 20)" },
  HGA:     { bg: "oklch(0.22 0.12 50 / 0.6)",  text: "oklch(0.78 0.18 50)" },
};

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function CardDetailPanel({
  cardId,
  onClose,
  onNavigate,
}: {
  cardId: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const [card, setCard] = useState<Card | null>(null);
  const [latestPrices, setLatestPrices] = useState<PriceEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tradeBaitPending, setTradeBaitPending] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCard(null);

    getCard(cardId).then(async (c) => {
      if (cancelled || !c) {
        if (!cancelled) setLoading(false);
        return;
      }
      const [prices, hist, neighbors] = await Promise.all([
        getLatestPrices(cardId),
        getCardPriceHistory(cardId),
        getCardNeighbors(cardId, c.status ?? "owned"),
      ]);
      if (cancelled) return;
      setCard(c);
      setLatestPrices(prices);
      setHistory(hist);
      setPrevId(neighbors.prevId);
      setNextId(neighbors.nextId);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [cardId, refreshKey]);

  async function handleRefresh() {
    if (!card) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/pricing/refresh/${card.id}`, { method: "POST" });
      if (res.ok) {
        toast.success("Prices refreshed");
        setRefreshKey((k) => k + 1);
      } else {
        toast.error("Refresh failed");
      }
    } catch {
      toast.error("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete() {
    if (!card) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    try {
      await deleteCard(card.id);
      toast.success("Card deleted");
      onClose();
      router.refresh();
    } catch {
      toast.error("Delete failed");
      setDeleting(false);
    }
  }

  async function handleToggleTradeBait() {
    if (!card) return;
    setTradeBaitPending(true);
    try {
      const updated = await updateCard(card.id, { isTradeBait: !card.isTradeBait });
      setCard((prev) => prev ? { ...prev, isTradeBait: updated.isTradeBait } : prev);
      toast.success(updated.isTradeBait ? "Marked as trade bait" : "Removed from trade bait");
    } catch {
      toast.error("Failed to update");
    } finally {
      setTradeBaitPending(false);
    }
  }

  const pricesWithValues = latestPrices.filter((p) => p.price !== null);
  const highestPrice =
    pricesWithValues.length > 0
      ? Math.max(...pricesWithValues.map((p) => p.price!))
      : null;
  const gain =
    card && highestPrice !== null ? highestPrice - (card.purchasePrice ?? 0) : null;
  const gainPercent =
    gain !== null && card?.purchasePrice && card.purchasePrice > 0
      ? (gain / card.purchasePrice) * 100
      : null;
  const autoImage = latestPrices.find((p) => p.imageUrl)?.imageUrl;
  const displayImage = card?.photoUrl ?? autoImage;

  const setLine = card
    ? [card.year, card.setName, card.cardNumber ? `#${card.cardNumber}` : null, card.variant]
        .filter(Boolean)
        .join(" · ")
    : "";

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx > 0 && prevId) onNavigate(prevId);
    else if (dx < 0 && nextId) onNavigate(nextId);
  }

  return (
    <div className="flex flex-col h-full" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-border bg-background shrink-0">
        <button
          onClick={onClose}
          className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Close panel"
        >
          <XIcon className="h-4 w-4" />
        </button>
        <span className="flex-1 font-semibold truncate text-sm">
          {loading ? "Loading…" : (card?.name ?? "Card not found")}
        </span>
        {/* Edit — in header, contextually near the card name */}
        {card && (
          <Link
            href={`/cards/${card.id}/edit`}
            title="Edit card"
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Link>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => prevId && onNavigate(prevId)}
            disabled={!prevId || loading}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
              (!prevId || loading) && "opacity-30 cursor-not-allowed"
            )}
            aria-label="Previous card"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => nextId && onNavigate(nextId)}
            disabled={!nextId || loading}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
              (!nextId || loading) && "opacity-30 cursor-not-allowed"
            )}
            aria-label="Next card"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-4 space-y-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="mx-auto w-40 aspect-[5/7] rounded-2xl bg-muted" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-px bg-muted" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 bg-muted rounded" />
              <div className="h-12 bg-muted rounded" />
            </div>
          </div>
        ) : !card ? (
          <p className="text-muted-foreground text-sm text-center py-12">Card not found.</p>
        ) : (
          <>
            {/* Image */}
            <div className="flex justify-center">
              {displayImage ? (
                <button
                  type="button"
                  onClick={() => setImageViewerOpen(true)}
                  className="group/img relative w-44 aspect-[5/7] rounded-2xl overflow-hidden cursor-zoom-in"
                  style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))" }}
                  aria-label="Zoom image"
                >
                  <SmartCardImage
                    src={displayImage}
                    alt={card.name}
                    unoptimized={displayImage.startsWith("http")}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                    <ZoomInIcon className="h-10 w-10 text-white opacity-0 group-hover/img:opacity-70 transition-opacity duration-200 drop-shadow-lg" />
                  </div>
                </button>
              ) : (
              <div
                className="w-44 aspect-[5/7] rounded-2xl overflow-hidden"
                style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))" }}
              >
                  <div className="flex h-full flex-col items-center justify-center bg-muted rounded-2xl">
                    <p className="text-3xl mb-1">🃏</p>
                    <p className="text-muted-foreground text-xs">No image</p>
                  </div>
              </div>
              )}
            </div>

            {imageViewerOpen && displayImage && (
              <CardImageViewer
                src={displayImage}
                name={card.name}
                year={card.year?.toString() ?? null}
                setName={card.setName}
                gradeCompany={card.gradeCompany}
                gradeValue={card.gradeValue}
                onClose={() => setImageViewerOpen(false)}
              />
            )}

            <Separator />

            {/* Card info */}
            <div className="space-y-2">
              <Badge variant="secondary" className="text-xs">
                {GENRE_LABELS[card.sportGenre] ?? card.sportGenre}
              </Badge>
              <h2 className="text-xl font-bold leading-tight">{card.name}</h2>
              {setLine && (
                <p className="text-muted-foreground text-sm">{setLine}</p>
              )}
              {(card.gradeCompany || card.condition) && (
                <div className="flex gap-2 flex-wrap">
                  {card.gradeCompany && card.gradeValue && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      {card.gradeCompany} {card.gradeValue}
                    </Badge>
                  )}
                  {card.condition && !card.gradeCompany && (
                    <Badge className="bg-muted/80 text-muted-foreground border-border">
                      {card.condition.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Price summary */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Market Value</p>
                <p className="text-2xl font-bold">{fmt(highestPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Paid</p>
                <p className="text-lg font-semibold text-muted-foreground">
                  {card.purchasePrice === 0 ? "—" : fmt(card.purchasePrice)}
                </p>
              </div>
              {gain !== null && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gain / Loss</p>
                  <p className={`text-lg font-semibold ${gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {gain >= 0 ? "+" : ""}{fmt(gain)}
                    {gainPercent !== null && (
                      <span className="text-sm ml-1">
                        ({gainPercent >= 0 ? "+" : ""}{gainPercent.toFixed(1)}%)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Per-site pricing — Refresh icon lives here, contextually near prices */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Pricing by Source
                </h3>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  title="Refresh prices"
                  className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                >
                  <RefreshCwIcon className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                </button>
              </div>
              {pricesWithValues.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">
                  No price data yet — use Refresh to fetch live prices.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {KNOWN_SOURCES.map((source) => {
                    const entry = latestPrices.find((p) => p.source === source);
                    const price = entry?.price ?? null;
                    const isHighest = price != null && price === highestPrice && pricesWithValues.length > 1;
                    return (
                      <div
                        key={source}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                          isHighest
                            ? "border-primary/40 bg-primary/10"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">
                            {SOURCE_LABELS[source] ?? source}
                          </span>
                          {isHighest && (
                            <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                              Highest
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold${price == null ? " text-muted-foreground" : ""}`}>
                            {fmt(price)}
                          </span>
                          {entry?.url && (
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title="View source listing"
                            >
                              <ExternalLinkIcon className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notes */}
            {card.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-muted-foreground text-sm">{card.notes}</p>
                </div>
              </>
            )}

            {/* Price History Chart */}
            {history.length > 0 && (
              <UICard>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Price History</h3>
                  <PriceChart history={history} />
                </CardContent>
              </UICard>
            )}

            {/* Delete — at the bottom, out of the way */}
            <div className="flex justify-center gap-2 pt-2 pb-2 flex-wrap">
              <button
                onClick={handleToggleTradeBait}
                disabled={tradeBaitPending || card.status !== "owned"}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors py-1.5 px-3 rounded-md",
                  card.isTradeBait
                    ? "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                    : "text-muted-foreground/60 hover:text-emerald-500 hover:bg-muted"
                )}
              >
                <ArrowRightLeftIcon className="h-3 w-3" />
                {card.isTradeBait ? "Available to Trade" : "Mark as Trade Bait"}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors py-1.5 px-3 rounded-md",
                  confirmDelete
                    ? "text-destructive bg-destructive/10 hover:bg-destructive/20"
                    : "text-muted-foreground/60 hover:text-destructive hover:bg-muted"
                )}
              >
                <Trash2Icon className="h-3 w-3" />
                {confirmDelete ? "Tap again to confirm" : "Delete card"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CardImageViewer({ src, name, year, setName, gradeCompany, gradeValue, onClose }: {
  src: string; name: string; year?: string | null; setName?: string | null;
  gradeCompany?: string | null; gradeValue?: string | null; onClose: () => void;
}) {
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
      {cursor.visible && (
        <div
          className="fixed z-[51] pointer-events-none flex items-center justify-center"
          style={{ left: cursor.x, top: cursor.y, transform: "translate(-50%, -50%)" }}
        >
          <CursorIcon className="h-10 w-10" style={{ color: "oklch(0.88 0.04 260 / 0.9)", filter: "drop-shadow(0 2px 8px oklch(0 0 0 / 0.7))" }} />
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-white/10"
        style={{ color: "oklch(0.6 0.02 260)", background: "oklch(0.15 0.02 260 / 0.8)" }}
      >
        <XIcon className="h-5 w-5" />
      </button>
      <div
        ref={containerRef}
        className="overflow-hidden rounded-2xl"
        style={{ maxWidth: "min(92vw, 680px)", cursor: "none", boxShadow: "0 32px 100px oklch(0 0 0 / 0.8)" }}
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
            display: "block", width: "auto", maxWidth: "100%", maxHeight: "58svh", height: "auto",
            transform: `scale(${zoomed ? 2.5 : 1})`, transformOrigin: origin,
            transition: zoomed ? "none" : "transform 0.25s ease", userSelect: "none",
          }}
        />
      </div>
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
    </div>
  );
}
