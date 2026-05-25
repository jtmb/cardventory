import { FlaskConicalIcon } from "lucide-react";

export function DemoModeBanner({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <div className="w-full bg-amber-400/15 border-b border-amber-400/30 px-4 py-1.5 flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium shrink-0">
      <FlaskConicalIcon className="h-3.5 w-3.5" />
      Demo Mode — this is a demonstration instance
    </div>
  );
}
