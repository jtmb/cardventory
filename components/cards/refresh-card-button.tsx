"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { trackCustomEvent } from "@/lib/analytics/client";

export function RefreshCardButton({ cardId, iconOnly }: { cardId: string; iconOnly?: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pricing/refresh/${cardId}`, { method: "POST" });
      if (res.ok) {
        trackCustomEvent("price_refresh", { cardId });
        const data = await res.json() as { diff?: { prevPrice: number; newPrice: number; changeAmount: number; changePercent: number | null } | null };
        const diff = data.diff;
        if (diff) {
          const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
          const sign = diff.changeAmount >= 0 ? "+" : "";
          const pct = diff.changePercent !== null ? ` (${sign}${diff.changePercent.toFixed(1)}%)` : "";
          const msg = `${fmt(diff.prevPrice)} → ${fmt(diff.newPrice)} ${sign}${fmt(diff.changeAmount)}${pct}`;
          if (diff.changeAmount > 0) toast.success(msg, { description: "Market value updated" });
          else if (diff.changeAmount < 0) toast.warning(msg, { description: "Market value updated" });
          else toast.success("Prices refreshed — no change");
        } else {
          toast.success("Prices refreshed");
        }
        router.refresh();
      } else {
        toast.error("Refresh failed");
      }
    } catch {
      toast.error("Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  if (iconOnly) {
    return (
      <button
        onClick={handleRefresh}
        disabled={loading}
        title="Refresh prices"
        className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
      >
        <RefreshCwIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      </button>
    );
  }

  return (
    <Button
      onClick={handleRefresh}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2 w-full"
    >
      <RefreshCwIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Refreshing…" : "Refresh Prices"}
    </Button>
  );
}
