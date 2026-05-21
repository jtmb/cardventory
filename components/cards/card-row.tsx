"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/lib/db/schema";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, PencilIcon, Trash2Icon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";
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
import { deleteCard } from "@/lib/actions";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function CardRow({
  card,
  selectable = false,
  selected = false,
  onToggle,
  layout = "grid",
  showPriceBadges = true,
}: {
  card: Card;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
  layout?: "grid" | "list" | "compact";
  showPriceBadges?: boolean;
}) {
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [priceChange7d, setPriceChange7d] = useState<number | null>(null);
  const [priceChange30d, setPriceChange30d] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/cards/${card.id}/prices`)
      .then((r) => r.json())
      .then((data) => {
        setCurrentValue(data.highest ?? null);
        setPriceChange7d(data.change7d ?? null);
        setPriceChange30d(data.change30d ?? null);
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

  const rowProps: RowLayoutProps = {
    card, setLine, selectable, selected, onToggle, isPending,
    loading, currentValue, priceChange7d, priceChange30d, handleDelete,
    showPriceBadges,
  };
  if (layout === "list") return <CardListLayout {...rowProps} />;
  if (layout === "compact") return <CardCompactLayout {...rowProps} />;

  return (
    <div className="group relative">
      {/* Normal mode: hover edit/delete buttons */}
      {!selectable && (
        <div className="absolute top-2 left-2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Link
            href={`/cards/${card.id}/edit`}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
            title="Edit card"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Link>

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
          <CardInner card={card} setLine={setLine} isPending={isPending} showPriceBadges={showPriceBadges} />
        </button>
      ) : (
        <Link href={`/cards/${card.id}`} className="block">
          <div className={cn(
            "cv-card rounded-xl border bg-card overflow-hidden transition-all duration-200",
            "border-border/60 hover:border-primary/60 hover:shadow-2xl hover:shadow-black/60 hover:-translate-y-1",
            isPending && "opacity-40 pointer-events-none"
          )}>
            <CardInner card={card} setLine={setLine} isPending={isPending} loading={loading} currentValue={currentValue} priceChange7d={priceChange7d} priceChange30d={priceChange30d} showPriceBadges={showPriceBadges} />
          </div>
        </Link>
      )}
    </div>
  );
}

function gradeColor(company: string | null | undefined): string {
  switch (company?.toUpperCase()) {
    case "PSA":     return "bg-blue-700 text-white";
    case "BGS":
    case "BECKETT": return "bg-amber-500 text-black";
    case "SGC":     return "bg-red-700 text-white";
    case "CSG":     return "bg-emerald-700 text-white";
    default:        return "bg-zinc-600 text-white";
  }
}

/** Shared card visual — used in both normal and selectable modes */
function CardInner({
  card,
  setLine,
  isPending,
  loading = false,
  currentValue = null,
  priceChange7d = null,
  priceChange30d = null,
  showPriceBadges = true,
}: {
  card: Card;
  setLine: string;
  isPending: boolean;
  loading?: boolean;
  currentValue?: number | null;
  priceChange7d?: number | null;
  priceChange30d?: number | null;
  showPriceBadges?: boolean;
}) {
  return (
    <>
      {/* Card image — trading card 5:7 aspect ratio */}
      <div className="cv-card-image relative w-full aspect-[5/7] bg-gradient-to-b from-muted/25 to-muted/75 overflow-hidden">
        {card.photoUrl ? (
          <Image
            src={card.photoUrl}
            alt={card.name}
            fill
            className="object-contain p-2 group-hover:scale-[1.05] transition-transform duration-300"
            unoptimized={card.photoUrl.startsWith("http")}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-20">🃏</span>
          </div>
        )}
        {/* Sheen overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
        {/* Grade badge */}
        {card.gradeCompany && card.gradeValue && (
          <div className={cn(
            "absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-md leading-tight shadow-lg ring-1 ring-white/20",
            gradeColor(card.gradeCompany)
          )}>
            {card.gradeCompany} {card.gradeValue}
          </div>
        )}
        {/* Price trend badge */}
        {showPriceBadges && !loading && priceChange7d !== null && priceChange7d !== 0 && (
          <div className={cn(
            "absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-md backdrop-blur-sm ring-1",
            priceChange7d > 0
              ? "bg-gradient-to-r from-emerald-500/90 to-emerald-400/80 text-white ring-emerald-400/40"
              : "bg-gradient-to-r from-red-500/90 to-red-400/80 text-white ring-red-400/40"
          )}>
            {priceChange7d > 0
              ? <TrendingUpIcon className="h-2.5 w-2.5" />
              : <TrendingDownIcon className="h-2.5 w-2.5" />
            }
            {Math.abs(priceChange7d).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Info area */}
      <div className={cn("p-3 space-y-1 border-t border-border/50", isPending && "opacity-40")}>
        <p className="type-title-small font-semibold leading-tight line-clamp-1 tracking-tight">{card.name}</p>
        {setLine && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">{setLine}</p>
        )}
        <div className="pt-1 min-h-[1.25rem]">
          {loading ? (
            <div className="h-3.5 w-4/5 bg-muted rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2 flex-wrap">
              {priceChange7d !== null && (
                <PriceChange label="7 DAYS" value={priceChange7d} />
              )}
              {priceChange30d !== null && (
                <PriceChange label="30 DAYS" value={priceChange30d} />
              )}
              {priceChange7d === null && priceChange30d === null && (
                currentValue !== null ? (
                  <span className="inline-flex items-baseline bg-primary/15 text-primary rounded-md px-2 py-0.5 text-sm font-bold tabular-nums leading-tight ring-1 ring-primary/20">
                    {fmt(currentValue)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/40">No price data</span>
                )
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

function PriceChange({ label, value }: { label: string; value: number }) {
  const up = value >= 0;
  return (
    <span className={cn(
      "inline-flex items-baseline gap-1 text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded",
      up ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
    )}>
      {label && <span className="font-normal opacity-60">{label}</span>}
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
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
  priceChange7d: number | null;
  priceChange30d: number | null;
  handleDelete: () => void;
  showPriceBadges: boolean;
};

// ─── List layout (horizontal row with thumbnail) ───────────────────────────

function CardListLayout({
  card, setLine, selectable, selected, onToggle,
  isPending, loading, currentValue, priceChange7d, handleDelete,
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
      <div className="shrink-0 w-10 h-14 rounded-md overflow-hidden bg-muted border border-border flex items-center justify-center">
        {card.photoUrl ? (
          <Image src={card.photoUrl} alt={card.name} width={40} height={56} className="object-contain" unoptimized={card.photoUrl.startsWith("http")} />
        ) : (
          <span className="text-base opacity-30">🃏</span>
        )}
      </div>
      <Link href={`/cards/${card.id}`} className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate leading-tight">{card.name}</p>
        {setLine && <p className="text-xs text-muted-foreground truncate mt-0.5">{setLine}</p>}
      </Link>
      {card.gradeCompany && card.gradeValue && (
        <span className="shrink-0 hidden sm:inline-flex text-xs font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400">
          {card.gradeCompany} {card.gradeValue}
        </span>
      )}
      <div className="shrink-0 flex items-center gap-2.5">
        {loading ? (
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        ) : currentValue !== null ? (
          <>
            {priceChange7d !== null && (
              <span className="hidden sm:inline">
                <PriceChange label="" value={priceChange7d} />
              </span>
            )}
            <span className="inline-flex items-baseline bg-primary/10 text-primary rounded px-1.5 py-0.5 text-sm font-bold tabular-nums leading-tight">
              {fmt(currentValue)}
            </span>
          </>
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
  isPending, loading, currentValue, priceChange7d, handleDelete,
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
      <Link href={`/cards/${card.id}`} className="flex-1 min-w-0 font-medium truncate">{card.name}</Link>
      <span className="hidden md:block shrink-0 text-xs text-muted-foreground w-48 truncate text-right">{setLine}</span>
      {card.gradeCompany && card.gradeValue ? (
        <span className="shrink-0 hidden sm:inline text-[10px] font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">
          {card.gradeCompany} {card.gradeValue}
        </span>
      ) : (
        <span className="shrink-0 hidden sm:inline w-10" />
      )}
      <div className="shrink-0 flex items-center gap-2 w-32 justify-end">
        {loading ? (
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
        ) : currentValue !== null ? (
          <>
            {priceChange7d !== null && (
              <span className={`text-xs tabular-nums ${priceChange7d >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {priceChange7d >= 0 ? "+" : ""}{priceChange7d.toFixed(1)}%
              </span>
            )}
            <span className="text-xs font-bold tabular-nums text-primary">{fmt(currentValue)}</span>
          </>
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
