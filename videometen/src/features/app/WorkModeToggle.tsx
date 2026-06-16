import { Crosshair, LayoutGrid } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppMode, WORK_MODES, type AppViewMode } from "@/features/app/AppMode";
import { cn } from "@/lib/utils";

const ICONS: Record<Exclude<AppViewMode, "tracken">, typeof Crosshair> = {
  meten: Crosshair,
  analyseren: LayoutGrid,
};

const LABELS: Record<Exclude<AppViewMode, "tracken">, string> = {
  meten: "Meten",
  analyseren: "Analyseren",
};

const TITLES: Record<Exclude<AppViewMode, "tracken">, string> = {
  meten: "Alleen de video — kalibreer en track je meetpunten",
  analyseren: "Video klein · ruimte voor tabel + grafieken",
};

/**
 * Segmented toggle voor de werk-modi (meten / analyseren). Tracken-modus
 * wordt nooit handmatig via deze toggle gekozen — alleen via "▶ Start tracking"
 * en automatisch verlaten via Escape. Deze toggle is dus verborgen tijdens
 * tracken.
 */
export function WorkModeToggle() {
  const { mode, setWorkMode } = useAppMode();
  if (mode === "tracken") return null;

  return (
    <div
      role="radiogroup"
      aria-label="Werk-modus"
      className="inline-flex rounded-md border bg-card p-0.5"
      style={{ borderColor: "var(--border-solid)" }}
    >
      {WORK_MODES.map((m) => {
        const Icon = ICONS[m];
        const active = mode === m;
        return (
          <Tooltip key={m}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setWorkMode(m)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium transition-colors",
                  active
                    ? "bg-(--accent)/10 text-(--accent)"
                    : "text-(--text-secondary) hover:bg-(--bg-card-hover) hover:text-(--accent)",
                )}
              >
                <Icon className="size-3.5" />
                {LABELS[m]}
              </button>
            </TooltipTrigger>
            <TooltipContent>{TITLES[m]}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
