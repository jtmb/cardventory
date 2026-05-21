"use client";

import { useState } from "react";
import { SearchIcon, XIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface Props {
  /** Called with the chosen image URL */
  onSelect: (url: string) => void;
  /** Parent provides this callback to build the search query from its current form values */
  getQuery: () => string;
}

export function ImagePicker({ onSelect, getQuery }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSearch() {
    const q = getQuery().trim();
    if (!q) return;

    setLoading(true);
    setOpen(true);
    setImages([]);

    try {
      const res = await fetch(`/api/cards/image-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setImages(data.images ?? []);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(url: string) {
    onSelect(url);
    setOpen(false);
    setImages([]);
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleSearch}
        disabled={loading}
      >
        {loading ? (
          <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <SearchIcon className="h-3.5 w-3.5" />
        )}
        Search card images
      </Button>

      {open && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Searching eBay sold listings…"
                : images.length > 0
                ? `${images.length} images found — click one to use it`
                : "No images found. Try filling in more card details first."}
            </p>
            <button
              type="button"
              onClick={() => { setOpen(false); setImages([]); }}
              className="text-muted-foreground hover:text-foreground transition-colors ml-3 shrink-0"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {loading
              ? Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="aspect-[5/7] bg-muted rounded-lg animate-pulse" />
                ))
              : images.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(url)}
                    className="relative aspect-[5/7] rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors bg-muted/40"
                  >
                    <Image
                      src={url}
                      alt={`Card image option ${i + 1}`}
                      fill
                      className="object-contain p-1"
                      unoptimized
                    />
                  </button>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}
