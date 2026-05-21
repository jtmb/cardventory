"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
    <Button
      onClick={handleRefreshAll}
      disabled={loading}
      variant="outline"
      className="gap-2"
    >
      <RefreshCwIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Refreshing…" : "Refresh All"}
    </Button>
  );
}
