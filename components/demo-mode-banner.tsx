"use client";

import { useEffect, useState } from "react";
import { FlaskConicalIcon } from "lucide-react";

export function DemoModeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/demo-mode")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { enabled?: boolean } | null) => {
        if (data?.enabled) setVisible(true);
      })
      .catch(() => {});
  }, []);

  if (!visible) return null;

  return (
    <div className="w-full bg-amber-400/15 border-b border-amber-400/30 px-4 py-1.5 flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium shrink-0">
      <FlaskConicalIcon className="h-3.5 w-3.5" />
      Demo Mode — this is a demonstration instance
    </div>
  );
}
