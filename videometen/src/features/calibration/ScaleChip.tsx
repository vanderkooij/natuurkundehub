import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppMode } from "@/features/app/AppMode";
import { useCalibration } from "@/features/calibration/CalibrationState";
import { formatSigFigs } from "@/lib/numbers";
import { cn } from "@/lib/utils";

/**
 * Header-chip voor de schaal. Toggle-knop: klikken schakelt `scale-edit`
 * aan/uit. Display:
 *   - geen schaal, niet aan het bewerken  → "schaal — niet ingesteld"
 *   - geen schaal, aan het plaatsen       → "schaal · bezig…"
 *   - schaal gezet                        → "schaal 0,15 m"
 *
 * Verwijderen en lengte-aanpassen lopen tijdens scale-edit via de
 * instruction-overlay (zie InstructionOverlay).
 */
export function ScaleChip() {
  const { scale, mode, toggleScaleEdit } = useCalibration();
  const { mode: appMode } = useAppMode();
  const editing = mode === "scale-edit";
  // Schaal-chip is interactief in alle modi behalve tracken (waar de focus
  // op het zetten van meetpunten ligt, niet op her-kalibratie).
  const interactive = appMode !== "tracken";

  let value: string;
  if (scale) value = `${formatSigFigs(scale.length)} ${scale.unit}`;
  else if (editing) value = "bezig…";
  else value = "— niet ingesteld";

  const tip = !interactive
    ? "Schaal niet bewerkbaar tijdens tracking"
    : editing
      ? "Klik om schaal-bewerken te sluiten"
      : scale
        ? "Klik om de schaal bij te stellen"
        : "Klik om de schaal in te stellen";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={interactive ? toggleScaleEdit : undefined}
          disabled={!interactive}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border bg-card px-2 py-[3px] font-mono text-[11px]",
            "transition-colors",
            interactive
              ? editing
                ? "text-(--accent) border-(--accent)"
                : "text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)"
              : "cursor-default text-(--text-secondary) opacity-80",
          )}
          style={{ borderColor: editing ? undefined : "var(--border-solid)" }}
        >
          <span className="text-(--text-muted)">schaal</span>
          {value}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
