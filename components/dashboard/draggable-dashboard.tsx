"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TrendingUpIcon, TrendingDownIcon, LayersIcon, DollarSignIcon, PlusCircleIcon, ShieldIcon, BarChart2Icon, GripVerticalIcon, RotateCcwIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { RefreshAllButton } from "@/components/cards/refresh-all-button";
import { RecentCardsSection } from "@/components/cards/recent-cards-section";
import { PortfolioChart } from "@/components/cards/portfolio-chart";
import type { Card as CardType } from "@/lib/db/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

type GenreStat = {
  genre: string;
  count: number;
  purchaseValue: number;
  currentValue: number;
};

type DashStats = {
  totalCards: number;
  totalPurchaseValue: number;
  totalCurrentValue: number;
  gain: number;
  gainPercent: number;
  byGenre: GenreStat[];
  recentCards: CardType[];
};

type GradeRow = {
  gradeCompany: string | null;
  gradeValue: string | null;
  count: number;
  totalPurchase: number | null;
};

type PortfolioPoint = { date: string; totalValue: number };

// ─── Constants ───────────────────────────────────────────────────────────────

const GENRE_LABELS: Record<string, string> = {
  basketball: "Basketball", baseball: "Baseball", football: "Football",
  soccer: "Soccer", hockey: "Hockey", pokemon: "Pokémon",
  yugioh: "Yu-Gi-Oh!", magic: "Magic: The Gathering", other: "Other",
};

const LS_KEY = "cv_dashboard_order";

type SectionId = "stats" | "by-category" | "recent-cards" | "grade-breakdown" | "portfolio-trend";

const DEFAULT_ORDER: SectionId[] = [
  "stats",
  "recent-cards",
  "by-category",
  "grade-breakdown",
  "portfolio-trend",
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

// ─── Drag handle + sortable wrapper ──────────────────────────────────────────

function SortableSection({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="group/section relative">
      {/* Drag handle — centered overlay, appears on hover, no layout impact */}
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 opacity-0 pointer-events-none group-hover/section:opacity-100 group-hover/section:pointer-events-auto transition-opacity cursor-grab active:cursor-grabbing bg-background/90 backdrop-blur-sm border border-border/60 rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5"
        style={{ touchAction: "none" }}
        title="Drag to reorder"
        aria-label="Drag to reorder section"
      >
        <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium select-none">drag to reorder</span>
      </div>
      {children}
    </div>
  );
}

// ─── Individual sections ──────────────────────────────────────────────────────

function StatsSection({ stats }: { stats: DashStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Cards"
        value={String(stats.totalCards)}
        icon={<LayersIcon className="h-5 w-5 text-primary" />}
      />
      <StatCard
        title="Purchase Value"
        value={fmt(stats.totalPurchaseValue)}
        icon={<DollarSignIcon className="h-5 w-5 text-muted-foreground" />}
      />
      <StatCard
        title="Current Value"
        value={fmt(stats.totalCurrentValue)}
        icon={<DollarSignIcon className="h-5 w-5 text-emerald-400" />}
      />
      <StatCard
        title="Total Gain / Loss"
        value={`${stats.gain >= 0 ? "+" : ""}${fmt(stats.gain)}`}
        sub={stats.gainPercent !== 0 ? `${stats.gainPercent >= 0 ? "+" : ""}${stats.gainPercent.toFixed(1)}%` : undefined}
        positive={stats.gain >= 0}
        icon={
          stats.gain >= 0
            ? <TrendingUpIcon className="h-5 w-5 text-emerald-400" />
            : <TrendingDownIcon className="h-5 w-5 text-red-400" />
        }
      />
    </div>
  );
}

function ByCategorySection({ byGenre }: { byGenre: GenreStat[] }) {
  if (byGenre.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">By Category</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {byGenre.map(({ genre, count, purchaseValue, currentValue }) => {
          const gain = currentValue - purchaseValue;
          return (
            <Link key={genre} href={`/cards?genre=${genre}`}>
              <Card className="hover:border-border/60 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{GENRE_LABELS[genre] ?? genre}</span>
                    <Badge variant="secondary" className="text-xs">
                      {count} {count === 1 ? "card" : "cards"}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold">{fmt(currentValue)}</p>
                  <p className={`text-xs mt-0.5 ${gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {gain >= 0 ? "+" : ""}{fmt(gain)} vs cost
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function RecentCardsWrapper({ cards }: { cards: CardType[] }) {
  if (cards.length === 0) return null;
  return <RecentCardsSection cards={cards} />;
}

function GradeBreakdownSection({ gradeStats }: { gradeStats: GradeRow[] }) {
  if (gradeStats.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <ShieldIcon className="h-5 w-5 text-primary" /> Grade Breakdown
      </h2>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wide font-medium">Grader</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wide font-medium">Grade</th>
                  <th className="px-4 py-3 text-right text-xs text-muted-foreground uppercase tracking-wide font-medium">Count</th>
                  <th className="px-4 py-3 text-right text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {gradeStats.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{row.gradeCompany ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.gradeValue ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.count}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(row.totalPurchase ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function PortfolioTrendSection({ portfolioHistory }: { portfolioHistory: PortfolioPoint[] }) {
  if (portfolioHistory.length < 2) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <BarChart2Icon className="h-5 w-5 text-primary" /> Portfolio Value Trend
      </h2>
      <Card>
        <CardContent className="p-5">
          <PortfolioChart data={portfolioHistory} />
        </CardContent>
      </Card>
    </section>
  );
}

// ─── Main DraggableDashboard ──────────────────────────────────────────────────

export function DraggableDashboard({
  stats,
  gradeStats,
  portfolioHistory,
  userName,
}: {
  stats: DashStats;
  gradeStats: GradeRow[];
  portfolioHistory: PortfolioPoint[];
  userName: string;
}) {
  const [order, setOrder] = useState<SectionId[]>(DEFAULT_ORDER);
  const [activeId, setActiveId] = useState<SectionId | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SectionId[];
        // Merge in any new section IDs that didn't exist when order was saved
        const merged = [
          ...parsed.filter((id) => DEFAULT_ORDER.includes(id)),
          ...DEFAULT_ORDER.filter((id) => !parsed.includes(id)),
        ];
        setOrder(merged);
      }
    } catch {}
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as SectionId);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as SectionId);
      const newIndex = prev.indexOf(over.id as SectionId);
      const next = arrayMove(prev, oldIndex, newIndex);
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function renderSection(id: SectionId) {
    switch (id) {
      case "stats":         return <StatsSection stats={stats} />;
      case "by-category":  return <ByCategorySection byGenre={stats.byGenre} />;
      case "recent-cards": return <RecentCardsWrapper cards={stats.recentCards} />;
      case "grade-breakdown": return <GradeBreakdownSection gradeStats={gradeStats} />;
      case "portfolio-trend": return <PortfolioTrendSection portfolioHistory={portfolioHistory} />;
    }
  }

  // Render static (no drag) until client hydrates to avoid layout shift
  if (!mounted) {
    return (
      <div className="space-y-8">
        {DEFAULT_ORDER.map((id) => (
          <div key={id}>{renderSection(id)}</div>
        ))}
      </div>
    );
  }

  // Filter to only sections with content
  const visibleOrder = order.filter((id) => {
    if (id === "stats") return true;
    if (id === "by-category") return stats.byGenre.length > 0;
    if (id === "recent-cards") return stats.recentCards.length > 0;
    if (id === "grade-breakdown") return gradeStats.length > 0;
    if (id === "portfolio-trend") return portfolioHistory.length >= 2;
    return false;
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={visibleOrder} strategy={verticalListSortingStrategy}>
        <div className="space-y-8">
          {visibleOrder.map((id) => (
            <SortableSection key={id} id={id}>
              {renderSection(id)}
            </SortableSection>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId ? (
          <div className="opacity-80 bg-card/80 backdrop-blur-sm rounded-xl p-4 shadow-2xl ring-2 ring-primary/40">
            {renderSection(activeId)}
          </div>
        ) : null}
      </DragOverlay>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => {
            try { localStorage.removeItem(LS_KEY); } catch {}
            setOrder(DEFAULT_ORDER);
          }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcwIcon className="h-3 w-3" />
          Reset layout
        </button>
      </div>
    </DndContext>
  );
}

// ─── StatCard (kept local since it's no longer in the server page) ────────────

function StatCard({
  title, value, sub, icon, positive,
}: {
  title: string; value: string; sub?: string; icon: React.ReactNode; positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{title}</p>
          {icon}
        </div>
        <p className={`text-2xl font-bold ${positive === false ? "text-red-400" : positive === true ? "text-emerald-400" : "text-foreground"}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
