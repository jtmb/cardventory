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
        const data = await res.json();
        toast.success(`Refreshed ${data.refreshed} of ${data.total} cards`);
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

  return (
    <button
      type="button"
      onClick={handleRefreshAll}
      disabled={loading}
      aria-label="Refresh all prices"
      className="flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
    >
      <RefreshCwIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
    </button>
  );
}
