"use client";

import { useState } from "react";
import { AlertTriangleIcon, XIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

export function DuplicatesBanner({
  count,
  basePath = "/cards",
}: {
  count: number;
  basePath?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || count === 0) return null;

  return (
    <div className="mx-auto mb-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm">
      <AlertTriangleIcon className="h-4 w-4 shrink-0 text-amber-500" />
      <p className="flex-1 text-amber-600 dark:text-amber-400">
        <span className="font-semibold">{count} duplicate {count === 1 ? "group" : "groups"} detected.</span>{" "}
        <Link
          href={`${basePath}?view=duplicates`}
          className="underline underline-offset-2 hover:no-underline"
        >
          View duplicates
        </Link>
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-500/60 hover:text-amber-500 transition-colors"
        aria-label="Dismiss"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
