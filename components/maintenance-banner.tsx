import { WrenchIcon } from "lucide-react";

export function MaintenanceBanner({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <div className="w-full bg-orange-400/15 border-b border-orange-400/30 px-4 py-1.5 flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-medium shrink-0">
      <WrenchIcon className="h-3.5 w-3.5" />
      Maintenance Mode — some features may be temporarily unavailable
    </div>
  );
}
