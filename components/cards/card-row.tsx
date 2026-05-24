"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/lib/db/schema";
import Link from "next/link";
import { useCardPanel } from "@/components/cards/card-panel-context";
import { SmartCardImage } from "@/components/cards/smart-card-image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeftIcon, CheckIcon, PencilIcon, Trash2Icon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";
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
import { deleteCard, updateCardsTradeBait } from "@/lib/actions";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function Sparkline({ data, cardId }: { data: number[]; cardId: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 300, H = 80;
  const xs = data.map((_, i) => (i / (data.length - 1)) * W);
  const ys = data.map(v => H - ((v - min) / range) * (H - 10) - 5);
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`);
  const rising = data[data.length - 1] >= data[0];
  const color = rising ? "#22c55e" : "#ef4444";
  const gradId = `spk-${cardId}`;
  const linePath = `M ${pts.join(" L ")}`;
  const areaPath = `M 0,${H} L ${pts.join(" L ")} L ${W},${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CardRow({
  card,
  selectable = false,
  selected = false,
  onToggle,
  layout = "grid",
  showPriceBadges = true,
  showSparkline = true,
  readOnly = false,
}: {
  card: Card;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
  layout?: "grid" | "list" | "compact";
  showPriceBadges?: boolean;
  infoOverlay?: boolean;
  showSparkline?: boolean;
  readOnly?: boolean;
}) {
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [priceChange7d, setPriceChange7d] = useState<number | null>(null);
  const [sparkline, setSparkline] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { onCardClick } = useCardPanel();

  useEffect(() => {
    fetch(`/api/cards/${card.id}/prices`)
      .then((r) => r.json())
      .then((data) => {
        setCurrentValue(data.highest ?? null);
        setPriceChange7d(data.change7d ?? null);
        setSparkline(data.sparkline ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [card.id]);

  const setLine = [
    card.year,
    card.setName,
    card.cardNumber ? `#${card.cardNumber}` : null,
    card.variant,
  ]
    .filter(Boolean)
    .join(" · ");

  function handleDelete() {
    startTransition(async () => {
      await deleteCard(card.id);
      router.refresh();
    });
  }

  function handleToggleTradeBait() {
    startTransition(async () => {
      await updateCardsTradeBait([card.id], !card.isTradeBait);
      router.refresh();
    });
  }

  const rowProps: RowLayoutProps = {
    card, setLine, selectable, selected, onToggle, isPending,
    loading, currentValue, handleDelete,
    showPriceBadges,
    onCardClick: onCardClick ?? undefined,
  };
  if (layout === "list") return <CardListLayout {...rowProps} />;
  if (layout === "compact") return <CardCompactLayout {...rowProps} />;

  return (
    <div className="group relative">
      {/* Normal mode: hover edit/delete buttons */}
      {!selectable && !readOnly && (
        <div className="absolute top-2 left-2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Link
            href={`/cards/${card.id}/edit`}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
            title="Edit card"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleToggleTradeBait(); }}
            disabled={isPending}
            title={card.isTradeBait ? "Remove from trade" : "Mark for trade"}
            className={`flex items-center justify-center w-7 h-7 rounded-md backdrop-blur-sm transition-colors disabled:opacity-50 ${
              card.isTradeBait
                ? "bg-emerald-600/80 hover:bg-emerald-700/90 text-white"
                : "bg-black/60 hover:bg-emerald-600/80 text-white"
            }`}
          >
            <ArrowRightLeftIcon className="h-3.5 w-3.5" />
          </button>

          <AlertDialog>
            <AlertDialogTrigger
              className="flex items-center justify-center w-7 h-7 rounded-md bg-black/60 hover:bg-red-600/80 text-white backdrop-blur-sm transition-colors disabled:opacity-50"
              title="Delete card"
              disabled={isPending}
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete card?</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="font-medium text-foreground">{card.name}</span>
                  {card.setName && (
                    <> · {card.setName}{card.year ? ` (${card.year})` : ""}</>
                  )}
                  {" "}will be permanently deleted along with all its price history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {selectable ? (
        /* In select mode the entire card is a button — no z-index tricks needed */
        <button
          type="button"
          onClick={() => onToggle?.(card.id)}
          aria-pressed={selected}
          aria-label={selected ? `Deselect ${card.name}` : `Select ${card.name}`}
          className={`cv-card w-full text-left rounded-xl border-2 bg-card overflow-hidden transition-all duration-150 ${
            selected ? "border-primary shadow-lg shadow-primary/30 scale-[0.97]" : "border-border"
          }`}
        >
          {/* Checkbox indicator — pointer-events-none, clicks go to parent button */}
          <div
            className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors pointer-events-none ${
              selected ? "bg-primary border-primary" : "bg-black/50 border-white/60"
            }`}
          >
            {selected && <CheckIcon className="h-3 w-3 text-primary-foreground" />}
          </div>
          <CardInner card={card} setLine={setLine} isPending={isPending} sparkline={sparkline} showPriceBadges={showPriceBadges} showSparkline={showSparkline} />
        </button>
      ) : onCardClick ? (
        <button type="button" onClick={() => onCardClick(card.id)} className="block w-full text-left">
          <div className={cn(
            "cv-card rounded-xl border bg-card overflow-hidden transition-all duration-200",
            "border-border/60 hover:border-primary/60 hover:shadow-2xl hover:shadow-black/60 hover:-translate-y-1",
            isPending && "opacity-40 pointer-events-none"
          )}>
            <CardInner card={card} setLine={setLine} isPending={isPending} loading={loading} currentValue={currentValue} priceChange7d={priceChange7d} sparkline={sparkline} showPriceBadges={showPriceBadges} showSparkline={showSparkline} />
          </div>
        </button>
      ) : (
        <Link href={`/cards/${card.id}`} className="block">
          <div className={cn(
            "cv-card rounded-xl border bg-card overflow-hidden transition-all duration-200",
            "border-border/60 hover:border-primary/60 hover:shadow-2xl hover:shadow-black/60 hover:-translate-y-1",
            isPending && "opacity-40 pointer-events-none"
          )}>
            <CardInner card={card} setLine={setLine} isPending={isPending} loading={loading} currentValue={currentValue} priceChange7d={priceChange7d} sparkline={sparkline} showPriceBadges={showPriceBadges} showSparkline={showSparkline} />
          </div>
        </Link>
      )}
    </div>
  );
}

function gradeLabel(company: string | null | undefined, value: string | null | undefined) {
  if (!company || !value) return null;
  return `${company} ${value}`;
}

function gradeCompanyColor(company: string | null | undefined): string {
  switch (company?.toUpperCase()) {
    case "PSA":     return "text-blue-400";
    case "BGS":
    case "BECKETT": return "text-amber-400";
    case "SGC":     return "text-red-400";
    case "CGC":
    case "CSG":     return "text-teal-400";
    case "HGA":     return "text-orange-400";
    default:        return "text-muted-foreground";
  }
}

function conditionLabel(condition: string | null | undefined): { short: string; full: string } | null {
  const map: Record<string, { short: string; full: string }> = {
    gem_mint:  { short: "GM",  full: "Gem Mint" },
    mint:      { short: "M",   full: "Mint" },
    near_mint: { short: "NM",  full: "Near Mint" },
    excellent: { short: "EX",  full: "Excellent" },
    very_good: { short: "VG",  full: "Very Good" },
    good:      { short: "G",   full: "Good" },
    poor:      { short: "P",   full: "Poor" },
  };
  if (!condition || condition === "none") return null;
  return map[condition] ?? { short: condition.slice(0, 3).toUpperCase(), full: condition };
}

/** Shared card visual — used in both normal and selectable modes */
function CardInner({
  card,
  setLine,
  isPending,
  loading = false,
  currentValue = null,
  priceChange7d = null,
  sparkline = [],
  showPriceBadges = true,
  showSparkline = true,
}: {
  card: Card;
  setLine: string;
  isPending: boolean;
  loading?: boolean;
  currentValue?: number | null;
  priceChange7d?: number | null;
  sparkline?: number[];
  showPriceBadges?: boolean;
  showSparkline?: boolean;
}) {
  return (
    <>
      {/* Card image — trading card 5:7 aspect ratio */}
      <SmartCardImage
        src={card.photoUrl}
        alt={card.name}
        unoptimized={!!card.photoUrl && card.photoUrl.startsWith("http")}
        fitMode="ambient"
        containerClassName="cv-card-image relative w-full aspect-[5/7] overflow-hidden rounded-xl @container"
        containerStyle={{ clipPath: "inset(0 round 0.75rem)" }}

        placeholder={
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-20">🃏</span>
          </div>
        }
      >
        {/* Sheen overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
        {/* Wide layout (≥130px): grade/condition top-right, trend top-left */}
        <div className="absolute top-2 right-2 hidden @[130px]:flex flex-col items-end gap-1">
          {card.gradeCompany && card.gradeValue && (
            <div className="flex flex-col items-center bg-black/65 backdrop-blur-sm shadow-md rounded-md px-1.5 py-0.5">
              <span className={`text-[9px] font-semibold uppercase leading-tight ${gradeCompanyColor(card.gradeCompany)}`}>{card.gradeCompany}</span>
              <span className="text-xs font-bold text-white leading-tight">{card.gradeValue}</span>
            </div>
          )}
          {!card.gradeCompany && conditionLabel(card.condition) && (
            <div className="flex items-center bg-black/65 backdrop-blur-sm shadow-md rounded-md px-2 py-0.5" title={conditionLabel(card.condition)!.full}>
              <span className="text-[10px] font-medium text-white/85 leading-tight">{conditionLabel(card.condition)!.short}</span>
            </div>
          )}
          {card.isTradeBait && (
            <div className="flex items-center bg-emerald-500/75 backdrop-blur-sm shadow-md rounded-md px-1.5 py-0.5">
              <ArrowRightLeftIcon className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>
        {!loading && priceChange7d !== null && priceChange7d !== 0 && (
          <div className="absolute top-2 left-2 hidden @[130px]:flex items-center gap-0.5 bg-black/65 backdrop-blur-sm shadow-md rounded-md px-1.5 py-0.5">
            {priceChange7d > 0
              ? <TrendingUpIcon className="h-2.5 w-2.5 text-emerald-400" />
              : <TrendingDownIcon className="h-2.5 w-2.5 text-red-400" />
            }
            <span className={`text-[10px] font-bold leading-tight ${priceChange7d > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {Math.abs(priceChange7d).toFixed(0)}%
            </span>
          </div>
        )}
        {/* Narrow layout (<130px): grade/condition bottom-right, trend bottom-left stacked vertically */}
        <div className="absolute bottom-2 right-2 flex @[130px]:hidden flex-col items-end gap-1">
          {card.gradeCompany && card.gradeValue && (
            <div className="flex flex-col items-center bg-black/65 backdrop-blur-sm shadow-md rounded-md px-1.5 py-0.5">
              <span className={`text-[9px] font-semibold uppercase leading-tight ${gradeCompanyColor(card.gradeCompany)}`}>{card.gradeCompany}</span>
              <span className="text-xs font-bold text-white leading-tight">{card.gradeValue}</span>
            </div>
          )}
          {!card.gradeCompany && conditionLabel(card.condition) && (
            <div className="flex items-center bg-black/65 backdrop-blur-sm shadow-md rounded-md px-2 py-0.5" title={conditionLabel(card.condition)!.full}>
              <span className="text-[10px] font-medium text-white/85 leading-tight">{conditionLabel(card.condition)!.short}</span>
            </div>
          )}
        </div>
        {!loading && priceChange7d !== null && priceChange7d !== 0 && (
          <div className="absolute bottom-2 left-2 flex @[130px]:hidden flex-col items-center gap-0 bg-black/65 backdrop-blur-sm shadow-md rounded-md px-1.5 py-1">
            {priceChange7d > 0
              ? <TrendingUpIcon className="h-2.5 w-2.5 text-emerald-400" />
              : <TrendingDownIcon className="h-2.5 w-2.5 text-red-400" />
            }
            <span className={`text-[10px] font-bold leading-tight ${priceChange7d > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {Math.abs(priceChange7d).toFixed(0)}%
            </span>
          </div>
        )}

        {/* Set-line hover reveal — fades in over the bottom of the card on hover */}
        {setLine && (
          <div className="absolute bottom-0 inset-x-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-8 pb-2 px-2.5">
            <p className="text-[10px] text-white/80 leading-snug">{setLine}</p>
          </div>
        )}
      </SmartCardImage>

      {/* Info area */}
      <div className={cn("p-3 space-y-1 border-t border-border/50 relative overflow-hidden", isPending && "opacity-40")}>
        <Sparkline data={showSparkline ? sparkline : []} cardId={card.id} />
        <p className="type-title-small font-semibold leading-tight line-clamp-1 tracking-tight">{card.name}</p>
        {setLine && (
          <p className="text-xs text-muted-foreground truncate">{setLine}</p>
        )}
        <div className="pt-1">
          {loading ? (
            <div className="h-3.5 w-4/5 bg-muted rounded animate-pulse" />
          ) : (
            <div>
              {currentValue !== null ? (
                <span className="inline-flex items-baseline bg-primary/15 text-primary rounded-md px-2 py-0.5 text-sm font-bold tabular-nums leading-tight ring-1 ring-primary/20">
                  {fmt(currentValue)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/40">No price data</span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** Skeleton tile for the loading state */
export function CardRowSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="w-full aspect-[5/7] bg-muted animate-pulse" />
      <div className="p-3 space-y-2 border-t border-border/60">
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-3 w-full bg-muted rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

// ─── Shared props type for list/compact layouts ────────────────────────────

type RowLayoutProps = {
  card: Card;
  setLine: string;
  selectable: boolean;
  selected: boolean;
  onToggle?: (id: string) => void;
  isPending: boolean;
  loading: boolean;
  currentValue: number | null;
  handleDelete: () => void;
  showPriceBadges: boolean;
  onCardClick?: (id: string) => void;
};

// ─── List layout (horizontal row with thumbnail) ───────────────────────────

function CardListLayout({
  card, setLine, selectable, selected, onToggle,
  isPending, loading, currentValue, handleDelete, onCardClick,
}: RowLayoutProps) {
  return (
    <div className={`group flex items-center gap-3 px-4 py-2.5 transition-colors ${selected ? "bg-primary/5" : "hover:bg-muted/30"} ${isPending ? "opacity-40 pointer-events-none" : ""}`}>
      {selectable && (
        <button type="button" onClick={() => onToggle?.(card.id)} className="shrink-0">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? "bg-primary border-primary" : "border-border hover:border-primary/60"}`}>
            {selected && <CheckIcon className="h-3 w-3 text-primary-foreground" />}
          </div>
        </button>
      )}
      <SmartCardImage
        src={card.photoUrl}
        alt={card.name}
        unoptimized={!!card.photoUrl && card.photoUrl.startsWith("http")}
        fitMode="cover"
        containerClassName="shrink-0 relative w-10 h-14 rounded-md overflow-hidden bg-muted border border-border flex items-center justify-center"
        placeholder={<span className="text-base opacity-30">🃏</span>}
      />
      {onCardClick && !selectable
        ? <button type="button" onClick={() => onCardClick(card.id)} className="flex-1 min-w-0 text-left">
            <p className="font-semibold text-sm truncate leading-tight">{card.name}</p>
            {setLine && <p className="text-xs text-muted-foreground truncate mt-0.5">{setLine}</p>}
          </button>
        : <Link href={`/cards/${card.id}`} className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate leading-tight">{card.name}</p>
            {setLine && <p className="text-xs text-muted-foreground truncate mt-0.5">{setLine}</p>}
          </Link>
      }
      {card.gradeCompany && card.gradeValue && (
        <span className="shrink-0 hidden sm:inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${gradeCompanyColor(card.gradeCompany)}`}>{card.gradeCompany}</span>
          <span className="text-xs font-bold text-foreground">{card.gradeValue}</span>
        </span>
      )}
      {!card.gradeCompany && conditionLabel(card.condition) && (
        <span className="shrink-0 hidden sm:inline-flex text-[10px] font-medium text-muted-foreground bg-muted/70 rounded px-1.5 py-0.5" title={conditionLabel(card.condition)!.full}>
          {conditionLabel(card.condition)!.short}
        </span>
      )}
      <div className="shrink-0 flex items-center gap-2.5">
        {loading ? (
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        ) : currentValue !== null ? (
          <span className="inline-flex items-baseline bg-primary/10 text-primary rounded px-1.5 py-0.5 text-sm font-bold tabular-nums leading-tight">
            {fmt(currentValue)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">No data</span>
        )}
      </div>
      {!selectable && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Link href={`/cards/${card.id}/edit`} className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Edit">
            <PencilIcon className="h-3.5 w-3.5" />
          </Link>
          <AlertDialog>
            <AlertDialogTrigger
              className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors disabled:opacity-50"
              disabled={isPending}
              title="Delete"
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete card?</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="font-medium text-foreground">{card.name}</span>
                  {card.setName && <> · {card.setName}{card.year ? ` (${card.year})` : ""}</>}
                  {" "}will be permanently deleted along with all its price history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

// ─── Compact layout (image-less dense table rows) ─────────────────────────

function CardCompactLayout({
  card, setLine, selectable, selected, onToggle,
  isPending, loading, currentValue, handleDelete, onCardClick,
}: RowLayoutProps) {
  return (
    <div className={`group flex items-center gap-2 px-4 py-2 transition-colors text-sm ${selected ? "bg-primary/5" : "hover:bg-muted/30"} ${isPending ? "opacity-40 pointer-events-none" : ""}`}>
      {selectable && (
        <button type="button" onClick={() => onToggle?.(card.id)} className="shrink-0">
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selected ? "bg-primary border-primary" : "border-border hover:border-primary/60"}`}>
            {selected && <CheckIcon className="h-2.5 w-2.5 text-primary-foreground" />}
          </div>
        </button>
      )}
      {onCardClick && !selectable
        ? <button type="button" onClick={() => onCardClick(card.id)} className="flex-1 min-w-0 font-medium truncate text-left">{card.name}</button>
        : <Link href={`/cards/${card.id}`} className="flex-1 min-w-0 font-medium truncate">{card.name}</Link>
      }
      <span className="hidden md:block shrink-0 text-xs text-muted-foreground w-48 truncate text-right">{setLine}</span>
      {card.gradeCompany && card.gradeValue ? (
        <span className="shrink-0 hidden sm:inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${gradeCompanyColor(card.gradeCompany)}`}>{card.gradeCompany}</span>
          <span className="text-xs font-bold text-foreground">{card.gradeValue}</span>
        </span>
      ) : conditionLabel(card.condition) ? (
        <span className="shrink-0 hidden sm:inline-flex text-[10px] font-medium text-muted-foreground bg-muted/70 rounded px-1.5 py-0.5" title={conditionLabel(card.condition)!.full}>
          {conditionLabel(card.condition)!.short}
        </span>
      ) : (
        <span className="shrink-0 hidden sm:inline w-10" />
      )}
      <div className="shrink-0 flex items-center gap-2 w-32 justify-end">
        {loading ? (
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
        ) : currentValue !== null ? (
          <span className="text-xs font-bold tabular-nums text-primary">{fmt(currentValue)}</span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </div>
      {!selectable && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Link href={`/cards/${card.id}/edit`} className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <PencilIcon className="h-3 w-3" />
          </Link>
          <AlertDialog>
            <AlertDialogTrigger
              className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors disabled:opacity-50"
              disabled={isPending}
            >
              <Trash2Icon className="h-3 w-3" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete card?</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="font-medium text-foreground">{card.name}</span> will be permanently deleted along with all its price history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
