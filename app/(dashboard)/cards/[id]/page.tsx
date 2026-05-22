import { getCard, getLatestPrices, getCardPriceHistory, getCardNeighbors } from "@/lib/actions";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeftIcon, ExternalLinkIcon, EditIcon } from "lucide-react";
import { PriceChart } from "@/components/cards/price-chart";
import { RefreshCardButton } from "@/components/cards/refresh-card-button";
import { DeleteCardButton } from "@/components/cards/delete-card-button";
import { SwipeCardNav } from "@/components/cards/swipe-card-nav";
import { SmartCardImage } from "@/components/cards/smart-card-image";

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

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) notFound();

  const [latestPrices, history, { prevId, nextId }] = await Promise.all([
    getLatestPrices(id),
    getCardPriceHistory(id),
    getCardNeighbors(id, card.status ?? "owned"),
  ]);

  const pricesWithValues = latestPrices.filter((p) => p.price !== null);
  const highestPrice =
    pricesWithValues.length > 0
      ? Math.max(...pricesWithValues.map((p) => p.price!))
      : null;

  const gain =
    highestPrice !== null ? highestPrice - (card.purchasePrice ?? 0) : null;
  const gainPercent =
    gain !== null && card.purchasePrice && card.purchasePrice > 0
      ? (gain / card.purchasePrice) * 100
      : null;

  const autoImage = latestPrices.find((p) => p.imageUrl)?.imageUrl;
  const displayImage = card.photoUrl ?? autoImage;

  return (
    <SwipeCardNav prevId={prevId} nextId={nextId} basePath="/cards">
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <ButtonLink href="/cards" variant="ghost" size="sm" className="gap-2 -ml-2 inline-flex items-center">
        <ArrowLeftIcon className="h-4 w-4" /> All Cards
      </ButtonLink>

      {/* Main detail section */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Card image */}
        <div className="shrink-0 flex flex-col gap-3 w-full md:w-64 mx-auto md:mx-0 max-w-xs md:max-w-none">
          <div className="w-full md:w-64 aspect-[5/7] md:aspect-auto md:h-88 rounded-3xl" style={{ filter: "drop-shadow(0 20px 50px rgba(0,0,0,0.65))" }}>
            {displayImage ? (
              <SmartCardImage
                src={displayImage}
                alt={card.name}
                unoptimized={displayImage.startsWith("http")}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center">
                <p className="text-4xl mb-2">🃏</p>
                <p className="text-muted-foreground text-sm">No image</p>
              </div>
            )}
          </div>
          <RefreshCardButton cardId={id} />
          <ButtonLink href={`/cards/${id}/edit`} variant="outline" size="sm" className="gap-2 inline-flex items-center justify-center">
            <EditIcon className="h-3.5 w-3.5" /> Edit Card
          </ButtonLink>
          <DeleteCardButton cardId={id} />
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div>
            <Badge variant="secondary" className="text-xs mb-2">
              {GENRE_LABELS[card.sportGenre] ?? card.sportGenre}
            </Badge>
            <h1 className="text-3xl font-bold">{card.name}</h1>
            {(card.setName || card.year || card.cardNumber) && (
              <p className="text-muted-foreground mt-1">
                {[card.year, card.setName, card.cardNumber ? `#${card.cardNumber}` : null, card.variant]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {(card.gradeCompany || card.condition) && (
              <div className="flex gap-2 mt-2">
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
          <div data-tour-id="tour-card-price-summary" className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Highest Market Value</p>
              <p className="text-3xl font-bold">{fmt(highestPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Paid</p>
              <p className="text-xl font-semibold text-muted-foreground">
                {card.purchasePrice === 0 ? "—" : fmt(card.purchasePrice)}
              </p>
            </div>
            {gain !== null && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gain / Loss</p>
                <p className={`text-xl font-semibold ${gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {gain >= 0 ? "+" : ""}{fmt(gain)}
                  {gainPercent !== null && (
                    <span className="text-sm ml-1">({gainPercent >= 0 ? "+" : ""}{gainPercent.toFixed(1)}%)</span>
                  )}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Per-site pricing */}
          <div data-tour-id="tour-card-sources">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Pricing by Source</h3>
            {pricesWithValues.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1">
                No price data yet — use the Refresh button to fetch live prices.
              </p>
            ) : (
              <div className="space-y-2">
                {pricesWithValues
                  .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
                  .map((entry) => {
                    const isHighest = entry.price === highestPrice;
                    return (
                      <div
                        key={entry.source}
                        className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                          isHighest
                            ? "border-primary/40 bg-primary/10"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{SOURCE_LABELS[entry.source] ?? entry.source}</span>
                          {isHighest && pricesWithValues.length > 1 && (
                            <Badge className="text-xs bg-primary/20 text-primary border-primary/30">Highest</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{fmt(entry.price)}</span>
                          {entry.url && (
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title="View source listing"
                            >
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {card.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                <p className="text-muted-foreground text-sm">{card.notes}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Price History Chart */}
      {history.length > 0 && (
        <Card data-tour-id="tour-card-chart">
          <CardContent className="p-6">
            <h3 className="text-base font-semibold mb-4">Price History</h3>
            <PriceChart history={history} />
          </CardContent>
        </Card>
      )}
    </div>
    </SwipeCardNav>
  );
}
