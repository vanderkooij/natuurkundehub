import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrimScrubber } from "@/features/trim/TrimScrubber";
import { useVideo } from "@/features/video/VideoState";
import { formatSeconds } from "@/lib/format";

export function VideoControls() {
  const {
    video,
    currentFrame,
    isPlaying,
    stepFrame,
    togglePlay,
    trimInHere,
    trimOutHere,
    snapFrames,
    jumpToMeasurement,
  } = useVideo();

  if (!video) return null;

  // VideoControls leeft alleen in niet-tracken-modi. Daar willen we dat de
  // ←/→ knoppen niet naar het volgende videoframe gaan (zinloos zonder data
  // ertussen) maar naar het volgende meetpunt. Geen meetpunten? → fallback
  // naar ruwe frame-step zodat de knoppen niet ineens onbruikbaar zijn.
  const hasMeasurements = snapFrames.length > 0;
  const goPrev = () => (hasMeasurements ? jumpToMeasurement(-1) : stepFrame(-1));
  const goNext = () => (hasMeasurements ? jumpToMeasurement(1) : stepFrame(1));

  const t = video.fps > 0 ? currentFrame / video.fps : 0;
  const lastFrame = Math.max(0, video.frameCount - 1);

  const transportBtn =
    "h-8 w-9 rounded-md border bg-card text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)";

  return (
    <div
      className="flex flex-shrink-0 items-center gap-3 border-t bg-(--bg-secondary) px-4 py-2.5"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={transportBtn}
              onClick={goPrev}
              aria-label="Vorige meting"
            >
              <ChevronLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {hasMeasurements ? "Vorige meting (←)" : "Vorige frame (←)"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={transportBtn}
              onClick={togglePlay}
              aria-label={isPlaying ? "Pauzeer" : "Afspelen"}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isPlaying ? "Pauzeer (Space)" : "Afspelen (Space)"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={transportBtn}
              onClick={goNext}
              aria-label="Volgende meting"
            >
              <ChevronRight className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {hasMeasurements ? "Volgende meting (→)" : "Volgende frame (→)"}
          </TooltipContent>
        </Tooltip>
      </div>

      <TrimScrubber />

      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-(--border-solid) px-2.5 font-mono text-[11px] text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)"
              onClick={trimInHere}
            >
              Trim begin
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stel huidige frame in als begin van de trim-range</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-(--border-solid) px-2.5 font-mono text-[11px] text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)"
              onClick={trimOutHere}
            >
              Trim eind
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stel huidige frame in als einde van de trim-range</TooltipContent>
        </Tooltip>
      </div>

      <div className="whitespace-nowrap font-mono text-xs text-(--text-secondary)">
        frame {currentFrame} / {lastFrame} · {formatSeconds(t)} s
      </div>
    </div>
  );
}
