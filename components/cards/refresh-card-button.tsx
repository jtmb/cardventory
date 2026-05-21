"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RefreshCardButton({ cardId }: { cardId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pricing/refresh/${cardId}`, { method: "POST" });
      if (res.ok) {
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
