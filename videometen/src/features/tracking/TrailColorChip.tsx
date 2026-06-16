import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTracking } from "@/features/tracking/TrackingState";
import { cn } from "@/lib/utils";

/**
 * Compact chip in de video-pane-header (analyse-modus): toont de huidige
 * trail-kleur als gevuld bolletje; klik cyclet door teal → amber → magenta →
 * white. State zit in TrackingState — gesynchroniseerd met de knop in de
 * tracking-bar.
 */
export function TrailColorChip() {
  const { trailColor, cycleTrailColor } = useTracking();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={cycleTrailColor}
          aria-label={`Trail-kleur (${trailColor})`}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border bg-card px-2 py-[3px]",
            "transition-colors hover:border-(--accent)",
          )}
          style={{ borderColor: "var(--border-solid)" }}
        >
          <span
            className="block size-3 rounded-full ring-1 ring-(--border-solid)"
            style={{ background: "var(--trail-dot)" }}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent>Trail-kleur ({trailColor})</TooltipContent>
    </Tooltip>
  );
}
