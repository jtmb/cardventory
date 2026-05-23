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
        toast.success("Prices refreshed");
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
