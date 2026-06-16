import { Eye, EyeOff, Redo2, Undo2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppMode } from "@/features/app/AppMode";
import { useTracking } from "@/features/tracking/TrackingState";
import { useVideo } from "@/features/video/VideoState";
import { formatSeconds } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Bovenbalk in tracking-modus. Vervangt de workflow-bar in die view. */
export function TrackingBar() {
  const { video, currentFrame } = useVideo();
  const {
    frameStep,
    setFrameStep,
    points,
    pointsInTrim,
    trailVisible,
    setTrailVisible,
    trailColor,
    cycleTrailColor,
    history,
  } = useTracking();
  const { exitTracking } = useAppMode();

  if (!video) return null;

  const t = video.fps > 0 ? currentFrame / video.fps : 0;
  const lastFrame = Math.max(0, video.frameCount - 1);

  return (
    <div
      className="flex flex-shrink-0 items-center gap-3 border-b bg-(--bg-secondary) px-4 py-2.5"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Left: exit */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 border-(--border-solid) px-2.5 text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)"
        onClick={exitTracking}
      >
        <X className="size-4" />
        Klaar
      </Button>

      <div className="flex-1" />

      {/* Middle: frame + count */}
      <div className="font-mono text-xs text-(--text-secondary)">
        frame {currentFrame} / {lastFrame} · {formatSeconds(t)} s ·{" "}
        <span className="text-(--accent)">{pointsInTrim}</span>
        <span className="text-(--text-muted)">/{points.length}</span> punten gezet
      </div>

      <div className="flex-1" />

      {/* Right: stap input + undo/redo + trail toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="tracking-step" className="font-mono text-[11px] text-(--text-muted)">
            stap:
          </Label>
          <Input
            id="tracking-step"
            type="number"
            min={1}
            max={lastFrame}
            value={frameStep}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) setFrameStep(n);
            }}
            className="h-8 w-16 font-mono text-xs"
          />
        </div>

        <div className="mx-1 h-5 w-px bg-(--border-solid)" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-8 w-8 border-(--border-solid) text-(--text-secondary)",
                history.canUndo ? "hover:border-(--accent) hover:text-(--accent)" : "opacity-40",
              )}
              onClick={history.undo}
              disabled={!history.canUndo}
              aria-label="Undo"
            >
              <Undo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ongedaan maken (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-8 w-8 border-(--border-solid) text-(--text-secondary)",
                history.canRedo ? "hover:border-(--accent) hover:text-(--accent)" : "opacity-40",
              )}
              onClick={history.redo}
              disabled={!history.canRedo}
              aria-label="Redo"
            >
              <Redo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Opnieuw doen (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-5 w-px bg-(--border-solid)" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-(--border-solid) text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)"
              onClick={() => setTrailVisible(!trailVisible)}
              aria-label={trailVisible ? "Verberg trail" : "Toon trail"}
            >
              {trailVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{trailVisible ? "Verberg trail" : "Toon trail"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-(--border-solid) hover:border-(--accent)"
              onClick={cycleTrailColor}
              aria-label={`Trail-kleur (${trailColor})`}
            >
              <span
                className="block size-3.5 rounded-full ring-1 ring-(--border-solid)"
                style={{ background: "var(--trail-dot)" }}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Trail-kleur ({trailColor})</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
