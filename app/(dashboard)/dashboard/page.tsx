import { getDashboardStats } from "@/lib/actions";
import { auth } from "@/auth";
import Link from "next/link";
import { TrendingUpIcon, TrendingDownIcon, LayersIcon, DollarSignIcon, PlusCircleIcon, RefreshCwIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { RefreshAllButton } from "@/components/cards/refresh-all-button";
import { MiniCardRow } from "@/components/cards/mini-card-row";

const GENRE_LABELS: Record<string, string> = {
  basketball: "Basketball", baseball: "Baseball", football: "Football",
  soccer: "Soccer", hockey: "Hockey", pokemon: "Pokémon",
  yugioh: "Yu-Gi-Oh!", magic: "Magic: The Gathering", other: "Other",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Portfolio Overview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Welcome back, {session?.user?.name}</p>
        </div>
        <div className="flex gap-2">
          <RefreshAllButton />
          <ButtonLink href="/cards/add">
            <PlusCircleIcon className="h-4 w-4" /> Add Card
          </ButtonLink>
        </div>
      </div>

      {/* Stats row */}
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

      {/* By Genre */}
      {stats.byGenre.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">By Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {stats.byGenre.map(({ genre, count, purchaseValue, currentValue }) => {
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
      )}

      {/* Recent Cards */}
      {stats.recentCards.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recently Added</h2>
            <Link href="/cards" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {stats.recentCards.map((card) => (
              <MiniCardRow key={card.id} card={card} />
            ))}
          </div>
        </section>
      )}

      {stats.totalCards === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <LayersIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No cards yet</h2>
          <p className="text-muted-foreground/60 mt-2 mb-6">Add your first card to start tracking its value</p>
          <ButtonLink href="/cards/add">
            <PlusCircleIcon className="h-4 w-4" /> Add Your First Card
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, sub, icon, positive }: {
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
