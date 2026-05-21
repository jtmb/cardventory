"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteCard } from "@/lib/actions";

export function DeleteCardButton({ cardId }: { cardId: string }) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    setLoading(true);
    try {
      await deleteCard(cardId);
      toast.success("Card deleted");
      router.push("/cards");
    } catch {
      toast.error("Delete failed");
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleDelete}
      disabled={loading}
      variant="outline"
      size="sm"
      className={`gap-2 w-full ${confirm ? "border-destructive text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:text-destructive"}`}
    >
      <Trash2Icon className="h-3.5 w-3.5" />
      {confirm ? "Tap again to confirm" : "Delete Card"}
    </Button>
  );
}
