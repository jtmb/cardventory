"use client";

import type { ReactNode } from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRightLeftIcon, ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon, RefreshCwIcon, UserIcon, WrenchIcon, XIcon } from "lucide-react";
import { CardsToolbar } from "@/components/cards/cards-toolbar";
import { CardGrid } from "@/components/cards/card-grid";
import { CardPanelContext } from "@/components/cards/card-panel-context";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SmartCardImage } from "@/components/cards/smart-card-image";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { PriceChart } from "@/components/cards/price-chart";
import type { Card, PriceHistory } from "@/lib/db/schema";
import { getLatestPricesByMeta, getCardPriceHistory } from "@/lib/actions";
import { TradeRequestOverlay } from "@/components/cards/trade-request-overlay";


type Props = {
  cards: Card[];
  ownerMap: Record<string, { name: string; username: string | null; userId: string }>;
  total: number;
  activeGenres: string[];
  header: ReactNode;
  q?: string;
  genre?: string;
  sort?: string;
  grade?: string;
  disableTrades?: boolean;
};

const GENRE_LABELS: Record<string, string> = {
  basketball: "Basketball", baseball: "Baseball", football: "Football",
  soccer: "Soccer", hockey: "Hockey", pokemon: "Pokémon",
  yugioh: "Yu-Gi-Oh!", magic: "Magic: The Gathering", other: "Other",
};

const SOURCE_LABELS: Record<string, string> = {
  ebay: "eBay",
  sportscardinvestor: "SportsCardInvestor",
  cardladder: "CardLadder",
  sportscardspro: "SportsCardsPro",
};

const KNOWN_SOURCES = ["ebay", "sportscardinvestor", "sportscardspro"] as const;

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function TradeBoardShell({
  cards,
  ownerMap,
  total,
  activeGenres,
  header,
  q,
  genre,
  sort,
  grade,
  disableTrades = false,
}: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(480);
  const resizing = useRef(false);
  const [tradeOverlay, setTradeOverlay] = useState<{
    card: Card;
    toUserId: string;
    toUserName: string;
  } | null>(null);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    resizing.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;
    function onMove(ev: MouseEvent) {
      if (!resizing.current) return;
      setPanelWidth(Math.min(800, Math.max(320, startWidth + (startX - ev.clientX))));
    }
    function onUp() {
      resizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function handleCardClick(id: string) {
    setSelectedCardId(id);
  }

  const selectedIdx = cards.findIndex((c) => c.id === selectedCardId);
  const prevId = selectedIdx > 0 ? cards[selectedIdx - 1].id : null;
  const nextId = selectedIdx < cards.length - 1 ? cards[selectedIdx + 1].id : null;
  const selectedCard = selectedIdx >= 0 ? cards[selectedIdx] : null;
  const selectedOwner = selectedCardId ? ownerMap[selectedCardId] : null;

  return (
    <CardPanelContext.Provider value={{ onCardClick: handleCardClick }}>
      <div>
        <CardsToolbar
          header={header}
          total={total}
          basePath="/trade"
          activeGenres={activeGenres}
          q={q}
          genre={genre}
          sort={sort}
          grade={grade}
        />
        <div className="p-6 max-w-7xl mx-auto">
          {disableTrades && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-orange-400/40 bg-orange-400/10 px-4 py-3 text-sm text-orange-600 dark:text-orange-400">
              <WrenchIcon className="h-4 w-4 shrink-0" />
              <span>User trades are disabled by the system for maintenance. Trade requests are temporarily unavailable.</span>
            </div>
          )}
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <ArrowRightLeftIcon className="h-16 w-16 text-muted-foreground/30" />
              <h2 className="text-xl font-semibold text-muted-foreground">No cards available for trade</h2>
              <p className="text-muted-foreground/60 mt-1 max-w-xs">
                When collectors mark cards as trade bait and set their profile to public, they'll appear here.
              </p>
            </div>
          ) : (
            <CardGrid cards={cards} readOnly />
          )}
        </div>
      </div>

      {/* Detail panel — mobile full-screen overlay */}
      <div
        className={cn(
          "flex md:hidden flex-col fixed inset-0 z-50",
          "bg-background",
          "transition-transform duration-300 ease-in-out",
          selectedCardId ? "translate-y-0" : "translate-y-full"
        )}
      >
        {selectedCard && selectedCardId && (
          <TradeCardDetailPanel
            key={selectedCardId}
            card={selectedCard}
            owner={selectedOwner}
            prevId={prevId}
            nextId={nextId}
            onClose={() => setSelectedCardId(null)}
            onNavigate={setSelectedCardId}
            onRequestTrade={(card, toUserId, toUserName) => setTradeOverlay({ card, toUserId, toUserName })}
            disableTrades={disableTrades}
          />
        )}
      </div>

      {/* Detail panel — desktop only, fixed right edge, overlays content */}
      <div
        className={cn(
          "hidden md:flex flex-col fixed top-0 right-0 bottom-0 z-30",
          "border-l border-border bg-background",
          "transition-transform duration-300 ease-in-out",
          selectedCardId ? "translate-x-0" : "translate-x-full"
        )}
        style={{ width: panelWidth }}
      >
        {/* Resize handle */}
        <div
          className="absolute top-0 left-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-10"
          onMouseDown={startResize}
        />
        {selectedCard && selectedCardId && (
          <TradeCardDetailPanel
            key={selectedCardId}
            card={selectedCard}
            owner={selectedOwner}
            prevId={prevId}
            nextId={nextId}
            onClose={() => setSelectedCardId(null)}
            onNavigate={setSelectedCardId}
            onRequestTrade={(card, toUserId, toUserName) => setTradeOverlay({ card, toUserId, toUserName })}
            disableTrades={disableTrades}
          />
        )}
      </div>

      {/* Trade request overlay */}
      {tradeOverlay && (
        <TradeRequestOverlay
          targetCard={tradeOverlay.card}
          toUserId={tradeOverlay.toUserId}
          toUserName={tradeOverlay.toUserName}
          onClose={() => setTradeOverlay(null)}
        />
      )}
    </CardPanelContext.Provider>
  );
}

function TradeCardDetailPanel({
  card,
  owner,
  prevId,
  nextId,
  onClose,
  onNavigate,
  onRequestTrade,
  disableTrades = false,
}: {
  card: Card;
  owner: { name: string; username: string | null; userId: string } | null | undefined;
  prevId: string | null;
  nextId: string | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onRequestTrade: (card: Card, toUserId: string, toUserName: string) => void;
  disableTrades?: boolean;
}) {
  const [latestPrices, setLatestPrices] = useState<PriceHistory[]>([]);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLatestPrices([]);
    setHistory([]);

    getLatestPricesByMeta(
      card.name,
      card.setName ?? null,
      card.year ?? null,
      card.cardNumber ?? null,
      card.variant ?? null,
      card.gradeCompany ?? null,
      card.gradeValue ?? null,
    )
      .then((prices) => { if (!cancelled) setLatestPrices(prices); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    getCardPriceHistory(card.id)
      .then((hist) => { if (!cancelled) setHistory(hist); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [card.id, refreshKey]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetch(`/api/pricing/refresh/${card.id}`, { method: "POST" });
      setRefreshKey((k) => k + 1);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }

  const pricesWithValues = latestPrices.filter((p) => p.price !== null);
  const highestPrice = pricesWithValues.length > 0
    ? Math.max(...pricesWithValues.map((p) => p.price!))
    : null;

  const autoImage = latestPrices.find((p) => p.imageUrl)?.imageUrl;
  const displayImage = card.photoUrl ?? autoImage;

  const setLine = [card.year, card.setName, card.cardNumber ? `#${card.cardNumber}` : null, card.variant]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-border bg-background shrink-0">
        <button
          onClick={onClose}
          className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Close panel"
        >
          <XIcon className="h-4 w-4" />
        </button>
        <span className="flex-1 font-semibold truncate text-sm">{card.name}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
              (refreshing || loading) && "opacity-30 cursor-not-allowed"
            )}
            aria-label="Refresh prices"
          >
            <RefreshCwIcon className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </button>
          <button
            onClick={() => prevId && onNavigate(prevId)}
            disabled={!prevId}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
              !prevId && "opacity-30 cursor-not-allowed"
            )}
            aria-label="Previous card"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => nextId && onNavigate(nextId)}
            disabled={!nextId}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
              !nextId && "opacity-30 cursor-not-allowed"
            )}
            aria-label="Next card"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-4 space-y-4">
        {/* Image */}
        <div className="flex justify-center">
          <div
            className="w-44 aspect-[5/7] rounded-2xl overflow-hidden"
            style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))" }}
          >
            {displayImage ? (
              <SmartCardImage
                src={displayImage}
                alt={card.name}
                unoptimized={displayImage.startsWith("http")}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-muted rounded-2xl">
                <p className="text-3xl mb-1">🃏</p>
                <p className="text-muted-foreground text-xs">No image</p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Card info */}
        <div className="space-y-2">
          <Badge variant="secondary" className="text-xs">
            {GENRE_LABELS[card.sportGenre] ?? card.sportGenre}
          </Badge>
          <h2 className="text-xl font-bold leading-tight">{card.name}</h2>
          {setLine && <p className="text-muted-foreground text-sm">{setLine}</p>}
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

        {/* Owner + Request Trade — directly below card identity */}
        {owner && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Listed by</p>
                {owner.username ? (
                  <Link
                    href={`/u/${owner.username}`}
                    className="flex items-center gap-2 text-sm font-medium hover:text-foreground transition-colors text-muted-foreground group"
                  >
                    <UserIcon className="h-4 w-4 shrink-0" />
                    <span>{owner.name}</span>
                    <span className="text-xs opacity-60">@{owner.username}</span>
                    <ExternalLinkIcon className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </Link>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserIcon className="h-4 w-4" />
                    {owner.name}
                  </p>
                )}
              </div>
              <button
                onClick={() => !disableTrades && onRequestTrade(card, owner.userId, owner.name)}
                disabled={disableTrades}
                title={disableTrades ? "Trade requests are disabled for maintenance" : undefined}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  disableTrades
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <ArrowRightLeftIcon className="h-3.5 w-3.5" />
                Request Trade
              </button>
            </div>
          </>
        )}

        <Separator />

        {/* Price summary */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Market Value</p>
          {loading ? (
            <div className="h-7 w-24 bg-muted rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold">{fmt(highestPrice)}</p>
          )}
        </div>

        {/* Per-site pricing — always show all 3 sources */}
        {!loading && (
          <>
            <Separator />
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Pricing by Source
              </h3>
              <div className="space-y-1.5">
                {KNOWN_SOURCES.map((source) => {
                  const entry = latestPrices.find((p) => p.source === source);
                  const price = entry?.price ?? null;
                  const isHighest = price != null && price === highestPrice && pricesWithValues.length > 1;
                  return (
                    <div
                      key={source}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                        isHighest ? "border-primary/40 bg-primary/10" : "border-border bg-card"
                      )}
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
                        <span className={cn("font-semibold", price == null && "text-muted-foreground")}>
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
            </div>
          </>
        )}

        {/* Price History Chart */}
        {!loading && history.length > 0 && (
          <UICard>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Price History</h3>
              <PriceChart history={history} />
            </CardContent>
          </UICard>
        )}
      </div>
    </div>
  );
}
