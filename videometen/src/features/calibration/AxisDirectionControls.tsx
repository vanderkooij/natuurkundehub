import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isAxisEditing, useCalibration } from "@/features/calibration/CalibrationState";

/**
 * Twee compacte swap-knoppen in de video-pane die de positieve x- en y-richting
 * flippen (11). Alleen zichtbaar tijdens de assen-stap (`axis-edit-by-angle`),
 * dichtbij de assen-overlay (rechtsboven). Het flippen wijzigt alleen het teken
 * in `pixelToWorld` — pixel-data + hoek blijven onaangeroerd; tabel + grafieken
 * herrekenen automatisch via hun bestaande `useMemo`-paden.
 */
export function AxisDirectionControls() {
  const { mode, axes, flipXDirection, flipYDirection } = useCalibration();

  if (!isAxisEditing(mode)) return null;

  const xRight = axes.xPositiveDirection === "right";
  const yUp = axes.yPositiveDirection === "up";

  const btnClass =
    "h-7 gap-1 border-(--border-solid) bg-(--bg-card)/85 px-2 font-mono text-[12px] text-(--accent) shadow-sm backdrop-blur-sm hover:border-(--accent) hover:bg-(--bg-card)";

  return (
    <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" className={btnClass} onClick={flipXDirection}>
            +x {xRight ? "→" : "←"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Klik om de positieve x-richting te wisselen</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" className={btnClass} onClick={flipYDirection}>
            +y {yUp ? "↑" : "↓"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Klik om de positieve y-richting te wisselen</TooltipContent>
      </Tooltip>
    </div>
  );
}
