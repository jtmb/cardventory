import { getDashboardStats, getGradeStats, getPortfolioHistory } from "@/lib/actions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LayersIcon } from "lucide-react";
import { AddCardButton } from "@/components/cards/add-card-button";
import { DraggableDashboard } from "@/components/dashboard/draggable-dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [stats, gradeStats, portfolioHistory] = await Promise.all([
    getDashboardStats(),
    getGradeStats(),
    getPortfolioHistory(),
  ]);
  return (
    <div className="px-6 pb-6 md:p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portfolio Overview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Welcome back, {session?.user?.name}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-1">
          <AddCardButton iconOnly label="Add Card" />
        </div>
      </div>

      {stats.totalCards === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <LayersIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No cards yet</h2>
          <p className="text-muted-foreground/60 mt-2 mb-6">Add your first card to start tracking its value</p>
          <AddCardButton label="Add Your First Card" />
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
