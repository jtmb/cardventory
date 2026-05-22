"use client";

import { useRef, useTransition, useState, useEffect } from "react";
import { DownloadIcon, UploadIcon, PlusCircleIcon, MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";
import { importCards, type ImportRow } from "@/lib/actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CSV_HEADER_ALIASES: Record<string, keyof ImportRow> = {
  name: "name",
  "card name": "name",
  year: "year",
  setname: "setName",
  "set name": "setName",
  set: "setName",
  cardnumber: "cardNumber",
  "card number": "cardNumber",
  number: "cardNumber",
  variant: "variant",
  parallel: "variant",
  sportgenre: "sportGenre",
  genre: "sportGenre",
  sport: "sportGenre",
  category: "sportGenre",
  gradecompany: "gradeCompany",
  "grade company": "gradeCompany",
  grader: "gradeCompany",
  gradevalue: "gradeValue",
  "grade value": "gradeValue",
  grade: "gradeValue",
  condition: "condition",
  purchaseprice: "purchasePrice",
  "purchase price": "purchasePrice",
  price: "purchasePrice",
  cost: "purchasePrice",
  notes: "notes",
  status: "status",
};

function parseCSV(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const headers = rawHeaders.map((h) => CSV_HEADER_ALIASES[h] ?? null);

  return lines.slice(1).map((line) => {
    const cells: string[] = [];
    let inQuote = false;
    let cell = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQuote) { inQuote = true; continue; }
      if (ch === '"' && inQuote) {
        if (line[i + 1] === '"') { cell += '"'; i++; } else { inQuote = false; }
        continue;
      }
      if (ch === "," && !inQuote) { cells.push(cell); cell = ""; continue; }
      cell += ch;
    }
    cells.push(cell);

    const row: Partial<ImportRow> = {};
    headers.forEach((key, i) => {
      if (key && cells[i] !== undefined) {
        (row as Record<string, string>)[key] = cells[i].trim();
      }
    });
    return row as ImportRow;
  }).filter((r) => r.name?.trim());
}

export function MobileCardActionsMenu({
  exportHref,
  basePath = "/cards",
  addHref,
}: {
  exportHref: string;
  basePath?: string;
  addHref?: string;
}) {
  const resolvedAddHref = addHref ?? `${basePath}/add`;
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (!rows.length) {
        toast.error("No valid rows found in CSV");
        return;
      }
      startTransition(async () => {
        const result = await importCards(rows);
        const parts: string[] = [];
        if (result.imported > 0) parts.push(`${result.imported} imported`);
        if (result.skipped > 0) parts.push(`${result.skipped} skipped (duplicates)`);
        if (result.errors > 0) parts.push(`${result.errors} errors`);
        if (result.imported > 0) {
          toast.success(parts.join(", "));
          router.refresh();
        } else {
          toast.info(parts.join(", ") || "Nothing imported");
        }
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="More actions"
      >
        <MoreHorizontalIcon className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-52 rounded-lg border border-border bg-popover shadow-lg py-1 max-h-[80vh] overflow-y-auto">
          {/* Actions */}
          <Link
            href={resolvedAddHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <PlusCircleIcon className="h-4 w-4 text-muted-foreground" />
            {basePath === "/watchlist" ? "Add to Watchlist" : "Add Card"}
          </Link>

          <div className="my-1 border-t border-border" />

          <a
            href={exportHref}
            download
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <DownloadIcon className="h-4 w-4 text-muted-foreground" />
            Export CSV
          </a>

          <button
            type="button"
            onClick={() => { fileRef.current?.click(); setOpen(false); }}
            disabled={isPending}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            <UploadIcon className="h-4 w-4 text-muted-foreground" />
            {isPending ? "Importing…" : "Import CSV"}
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportFile}
      />
    </div>
  );
}
