"use client";

import { Card } from "@/lib/db/schema";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, PencilIcon, Trash2Icon } from "lucide-react";
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
}: {
  card: Card;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
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

  return (
    <div className="group relative">
      {/* Select mode: checkbox overlay */}
      {selectable && (
        <button
          onClick={() => onToggle?.(card.id)}
          className="absolute inset-0 z-10 w-full h-full cursor-pointer focus:outline-none"
          aria-label={selected ? "Deselect card" : "Select card"}
        />
      )}

      {/* Select mode: checkbox indicator */}
      {selectable && (
        <div className={`absolute top-2 left-2 z-20 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? "bg-primary border-primary" : "bg-black/50 border-white/60"}`}>
          {selected && <CheckIcon className="h-3 w-3 text-primary-foreground" />}
        </div>
      )}

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
            <AlertDialogTrigger asChild>
              <button
                className="flex items-center justify-center w-7 h-7 rounded-md bg-black/60 hover:bg-red-600/80 text-white backdrop-blur-sm transition-colors disabled:opacity-50"
                title="Delete card"
                disabled={isPending}
              >
                <Trash2Icon className="h-3.5 w-3.5" />
              </button>
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
        <div className={`rounded-xl border-2 bg-card overflow-hidden transition-all duration-150 ${selected ? "border-primary shadow-lg shadow-primary/30 scale-[0.97]" : "border-border"}`}>
          <CardInner card={card} setLine={setLine} isPending={isPending} />
        </div>
      ) : (
        <Link href={`/cards/${card.id}`} className="block">
          <div className={`rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5 transition-all duration-200 ${isPending ? "opacity-40 pointer-events-none" : ""}`}>
            <CardInner card={card} setLine={setLine} isPending={isPending} loading={loading} currentValue={currentValue} priceChange7d={priceChange7d} priceChange30d={priceChange30d} />
          </div>
        </Link>
      )}
    </div>
  );
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
}: {
  card: Card;
  setLine: string;
  isPending: boolean;
  loading?: boolean;
  currentValue?: number | null;
  priceChange7d?: number | null;
  priceChange30d?: number | null;
}) {
  return (
    <>
      {/* Card image — trading card 5:7 aspect ratio */}
      <div className="relative w-full aspect-[5/7] bg-muted/60 overflow-hidden">
        {card.photoUrl ? (
          <Image
            src={card.photoUrl}
            alt={card.name}
            fill
            className="object-contain p-1.5 group-hover:scale-[1.03] transition-transform duration-300"
            unoptimized={card.photoUrl.startsWith("http")}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-20">🃏</span>
          </div>
        )}
        {/* Grade badge */}
        {card.gradeCompany && card.gradeValue && (
          <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-md leading-tight shadow-md">
            {card.gradeCompany} {card.gradeValue}
          </div>
        )}
      </div>

      {/* Info area */}
      <div className={`p-3 space-y-1 border-t border-border/60 ${isPending ? "opacity-40" : ""}`}>
        <p className="font-semibold text-sm leading-tight line-clamp-1">{card.name}</p>
        {setLine && (
          <p className="text-xs text-primary/80 line-clamp-2 leading-snug">{setLine}</p>
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
                <span className="text-xs font-semibold">
                  {currentValue !== null ? fmt(currentValue) : "No data"}
                </span>
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
    <span className={`text-xs font-medium tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
      <span className="text-muted-foreground/60 font-normal">{label} </span>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}
