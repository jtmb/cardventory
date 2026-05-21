"use client";

import { useEffect, useState } from "react";
import { XIcon, SparklesIcon } from "lucide-react";

type ReleaseEntry = { title: string; notes: string[] };

const LS_KEY = "cv_last_seen_version";
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown";

export function ReleaseNotesModal() {
  const [entry, setEntry] = useState<ReleaseEntry | null>(null);

  useEffect(() => {
    const lastSeen = localStorage.getItem(LS_KEY);
    if (lastSeen === VERSION) return; // already seen this version

    fetch("/release-notes.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Record<string, ReleaseEntry> | null) => {
        if (!data || !data[VERSION]) return;
        setEntry(data[VERSION]);
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    localStorage.setItem(LS_KEY, VERSION);
    setEntry(null);
  }

  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-6 pt-6 pb-4 border-b border-border/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <SparklesIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  What&apos;s New
                </p>
                <h2 className="font-bold text-base leading-tight">{entry.title}</h2>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 mt-0.5"
              aria-label="Dismiss"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">v{VERSION}</p>
        </div>

        {/* Notes list */}
        <ul className="px-6 py-4 space-y-2.5 max-h-72 overflow-y-auto">
          {entry.notes.map((note, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-sm text-foreground/90 leading-snug">{note}</span>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2">
          <button
            onClick={dismiss}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
