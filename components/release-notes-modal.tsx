"use client";

import { useEffect, useState } from "react";
import { XIcon, SparklesIcon, ArrowRightIcon } from "lucide-react";

type ReleaseEntry = { title: string; notes: string[] };

const LS_KEY = "cv_last_seen_version";
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown";

export function ReleaseNotesModal() {
  const [entry, setEntry] = useState<ReleaseEntry | null>(null);
  const [visible, setVisible] = useState(false);

  function resolveEntry(data: Record<string, ReleaseEntry>): ReleaseEntry | null {
    // Prefer exact version match; fall back to the first (most recent) entry
    return data[VERSION] ?? data[Object.keys(data)[0]] ?? null;
  }

  function loadAndShow() {
    fetch("/release-notes.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Record<string, ReleaseEntry> | null) => {
        if (!data) return;
        const resolved = resolveEntry(data);
        if (!resolved) return;
        // Set both together so the component mounts once with rn-enter already applied
        setEntry(resolved);
        setVisible(true);
      })
      .catch(() => {});
  }

  useEffect(() => {
    const lastSeen = localStorage.getItem(LS_KEY);
    if (lastSeen !== VERSION) loadAndShow();

    function handleShowEvent() {
      localStorage.removeItem(LS_KEY);
      loadAndShow();
    }
    window.addEventListener("cv:show-release-notes", handleShowEvent);
    return () => window.removeEventListener("cv:show-release-notes", handleShowEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setVisible(false);
    setTimeout(() => {
      localStorage.setItem(LS_KEY, VERSION);
      setEntry(null);
    }, 220);
  }

  if (!entry) return null;

  return (
    <>
      <style>{`
        @keyframes rn-in  { from { opacity:0; transform:translateY(16px) scale(.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes rn-out { from { opacity:1; transform:translateY(0) scale(1) }  to { opacity:0; transform:translateY(16px) scale(.97) } }
        .rn-enter { animation: rn-in  0.22s cubic-bezier(0.32,0.72,0,1) forwards }
        .rn-leave { animation: rn-out 0.18s cubic-bezier(0.4,0,1,1)    forwards }
        .rn-scroll { scrollbar-width: none; }
        .rn-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6 transition-[background,backdrop-filter] duration-200 ${
          visible
            ? "bg-black/65 backdrop-blur-sm"
            : "bg-black/0"
        }`}
        onClick={dismiss}
      >
        {/* Panel */}
        <div
          className={`relative w-full sm:max-w-[440px] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl bg-card border border-border/50 ${
            visible ? "rn-enter" : "rn-leave"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Thin accent bar */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/80 to-transparent" />

          {/* Header */}
          <div className="px-6 pt-6 pb-5">
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Dismiss"
            >
              <XIcon className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <SparklesIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 pr-8">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    What&apos;s new
                  </span>
                  <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-px rounded-full bg-primary/10 text-primary border border-primary/20 tabular-nums">
                    v{VERSION}
                  </span>
                </div>
                <h2 className="text-[15px] font-bold leading-snug text-foreground">
                  {entry.title}
                </h2>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border/50 mx-6" />

          {/* Notes */}
          <div className="relative">
            {/* fade top */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-6 z-10 bg-gradient-to-b from-card to-transparent" />
            {/* fade bottom */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 z-10 bg-gradient-to-t from-card to-transparent" />
            <ul className="px-4 py-3 space-y-0.5 max-h-[17rem] overflow-y-auto rn-scroll">
            {entry.notes.map((note, i) => (
              <li
                key={i}
                className="group flex items-start gap-3 px-2 py-2.5 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary text-[10px] font-bold flex items-center justify-center transition-colors leading-none">
                  {i + 1}
                </span>
                <span className="text-[13px] text-foreground/85 leading-relaxed">
                  {note}
                </span>
              </li>
            ))}
          </ul>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 pt-3 border-t border-border/40">
            <button
              onClick={dismiss}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition-all"
            >
              Got it
              <ArrowRightIcon className="h-4 w-4" />
            </button>
            <p className="text-center text-[11px] text-muted-foreground mt-2.5">
              View anytime via Settings › Data
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

