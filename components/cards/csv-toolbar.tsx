"use client";

import { useRef, useTransition } from "react";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { importCards, type ImportRow } from "@/lib/actions";
import { useRouter } from "next/navigation";

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
    // Handle quoted fields with commas
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

export function CsvToolbar({ exportHref }: { exportHref: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
    // Reset so the same file can be re-imported
    e.target.value = "";
  }

  return (
    <>
      <a
        href={exportHref}
        download
        className="flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Export CSV"
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Export</span>
      </a>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={isPending}
        className="flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        title="Import CSV"
      >
        <UploadIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{isPending ? "Importing…" : "Import"}</span>
      </button>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
    </>
  );
}
