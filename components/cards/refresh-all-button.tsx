"use client";

import { useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RefreshAllButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRefreshAll() {
    setLoading(true);
    toast.info("Refreshing all prices… this may take a moment");
    try {
      const res = await fetch("/api/pricing/refresh-all", { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { refreshed: number; total: number; changes?: { up: number; down: number; unchanged: number } };
        const changes = data.changes;
        let msg = `Refreshed ${data.refreshed} of ${data.total} cards`;
        if (changes && (changes.up > 0 || changes.down > 0)) {
          const parts: string[] = [];
          if (changes.up > 0) parts.push(`${changes.up} ↑`);
          if (changes.down > 0) parts.push(`${changes.down} ↓`);
          if (changes.unchanged > 0) parts.push(`${changes.unchanged} unchanged`);
          msg += ` — ${parts.join(", ")}`;
        }
        toast.success(msg);
        router.refresh();
      } else if (res.status === 429) {
        const data = await res.json() as { nextAllowedAt?: string };
        if (data.nextAllowedAt) {
          const next = new Date(data.nextAllowedAt);
          toast.error(`Rate limited — next refresh available at ${next.toLocaleTimeString()}`);
        } else {
          toast.error("Rate limited — try again later");
        }
      } else {
        toast.error("Refresh failed");
      }
    } catch {
      toast.error("Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRefreshAll}
      disabled={loading}
      aria-label="Refresh all prices"
      className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
    >
      <RefreshCwIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
    </button>
  );
}
