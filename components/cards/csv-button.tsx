"use client";

import { useState, useRef, useTransition } from "react";
import { DownloadIcon, UploadIcon, XIcon, FileSpreadsheetIcon } from "lucide-react";
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

  return lines
    .slice(1)
    .map((line) => {
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
    })
    .filter((r) => r.name?.trim());
}

export function CsvButton({ exportHref, iconOnly = false }: { exportHref: string; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
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
        setOpen(false);
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Import / Export CSV"
        className={iconOnly
          ? "flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          : "flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        }
      >
        <FileSpreadsheetIcon className="h-4 w-4" />
        {!iconOnly && <span>CSV</span>}
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FileSpreadsheetIcon className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-sm">Import / Export</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Export */}
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex items-center justify-center h-8 w-8 rounded-md bg-muted shrink-0">
                  <DownloadIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Export CSV</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Downloads your cards as a <code className="text-xs bg-muted px-1 rounded">.csv</code> file.
                    Active filters (sport, grade, search) are applied — only visible cards are exported.
                  </p>
                  <a
                    href={exportHref}
                    download
                    onClick={() => setOpen(false)}
                    className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                    Download CSV
                  </a>
                </div>
              </div>
            </div>

            {/* Import */}
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex items-center justify-center h-8 w-8 rounded-md bg-muted shrink-0">
                  <UploadIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Import CSV</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Add cards in bulk from a <code className="text-xs bg-muted px-1 rounded">.csv</code> file.
                    Duplicate entries (same name + set + year) are skipped automatically.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    <span className="text-foreground font-medium">Required:</span> name &nbsp;·&nbsp;
                    <span className="text-foreground font-medium">Optional:</span> year, set name, card number, variant, sport/genre, grade company, grade value, condition, purchase price, notes, status
                  </p>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={isPending}
                    className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <UploadIcon className="h-3.5 w-3.5" />
                    {isPending ? "Importing…" : "Choose CSV file"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportFile}
      />
    </>
  );
}
