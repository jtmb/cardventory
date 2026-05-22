import { getDashboardStats, getGradeStats, getPortfolioHistory } from "@/lib/actions";
import { auth } from "@/auth";
import Link from "next/link";
import { PlusCircleIcon, LayersIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { RefreshAllButton } from "@/components/cards/refresh-all-button";
import { DraggableDashboard } from "@/components/dashboard/draggable-dashboard";

export default async function DashboardPage() {
  const session = await auth();
  const [stats, gradeStats, portfolioHistory] = await Promise.all([
    getDashboardStats(),
    getGradeStats(),
    getPortfolioHistory(),
  ]);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Portfolio Overview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Welcome back, {session?.user?.name}</p>
        </div>
        <div className="flex gap-2 md:justify-end">
          <Link href="/cards/add" aria-label="Add Card" className="flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <PlusCircleIcon className="h-4 w-4" />
          </Link>
          <RefreshAllButton />
        </div>
      </div>

      {stats.totalCards === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <LayersIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No cards yet</h2>
          <p className="text-muted-foreground/60 mt-2 mb-6">Add your first card to start tracking its value</p>
          <ButtonLink href="/cards/add">
            <PlusCircleIcon className="h-4 w-4" /> Add Your First Card
          </ButtonLink>
        </div>
      ) : (
        <DraggableDashboard
          stats={stats}
          gradeStats={gradeStats}
          portfolioHistory={portfolioHistory}
          userName={session?.user?.name ?? ""}
        />
      )}
    </div>
  );
}
