import { useState } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVideo } from "@/features/video/VideoState";
import { cn } from "@/lib/utils";

const PRESETS = [24, 25, 30, 60];

function formatFps(fps: number): string {
  return Number.isInteger(fps) ? String(fps) : fps.toFixed(2);
}

/**
 * Fps-chip in de video-pane.
 *
 * Twee modi:
 *  - **Vrij** (`fpsAtFirstMeasurement === null`): chip is klikbaar; popover
 *    laat de leerling de fps wijzigen via presets of vrije input.
 *  - **Vergrendeld** (`fpsAtFirstMeasurement !== null`, sinds 07c): chip
 *    toont een hangslot-icoon, is niet klikbaar, met een tooltip die uitlegt
 *    hoe te ontgrendelen via de reset-acties in het menu rechtsboven.
 *
 * De lock voorkomt dat detectie of UI achter de rug van de leerling de fps
 * verandert nadat er metingen zijn gedaan — een verandering daar zou alle
 * t-waardes (en dus alle grafieken + zoomstates) corrupteren.
 */
export function FpsChip() {
  const { video, setFps, fpsAtFirstMeasurement } = useVideo();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  if (!video) return null;

  const locked = fpsAtFirstMeasurement !== null;

  const apply = (raw: string) => {
    const num = Number(raw.replace(",", "."));
    if (!Number.isFinite(num) || num <= 0 || num > 1000) return;
    setFps(num, "user");
    setOpen(false);
  };

  const sourceLabel =
    video.fpsSource === "user"
      ? "handmatig"
      : video.fpsSource === "detected"
        ? "gedetecteerd"
        : "standaard";

  // ---- Vergrendelde rendering -------------------------------------------
  if (locked) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-disabled="true"
            className={cn(
              "inline-flex cursor-not-allowed select-none items-center gap-1 rounded-md border px-2 py-[3px] font-mono text-[11px]",
              "border-(--border-solid) bg-(--bg-secondary) text-(--text-muted)",
            )}
          >
            <Lock className="size-3" aria-hidden />
            <span>fps</span>
            {formatFps(video.fps)}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[36ch] leading-snug">
          <strong>Fps is vergrendeld</strong> sinds je eerste meting. Om te
          wijzigen: gebruik <em>Begin opnieuw</em> of{" "}
          <em>Alle metingen wissen</em> via het menu rechtsboven.
        </TooltipContent>
      </Tooltip>
    );
  }

  // ---- Vrije rendering --------------------------------------------------
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(formatFps(video.fps));
      }}
    >
      {/* 11b: shadcn Tooltip rond de popover-trigger i.p.v. native title=,
          zodat de styling overeenkomt met de vergrendelde-staat-tooltip. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-[3px] font-mono text-[11px] transition-colors",
                "border-(--border-solid) bg-card text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)",
              )}
            >
              <span className="text-(--text-muted)">fps</span>
              {formatFps(video.fps)}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>fps · {sourceLabel}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-64 space-y-3">
        <div>
          <div className="text-[13px] font-semibold text-(--text-primary)">Frames per seconde</div>
          <div className="font-mono text-[11px] text-(--text-muted)">bron: {sourceLabel}</div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p}
              variant="outline"
              size="sm"
              className={cn(
                "h-7 font-mono text-[11px]",
                Math.abs(video.fps - p) < 0.01 && "border-(--accent) text-(--accent)",
              )}
              onClick={() => {
                setFps(p, "user");
                setOpen(false);
              }}
            >
              {p}
            </Button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply(draft);
          }}
          className="flex items-center gap-2"
        >
          <Input
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8 flex-1 font-mono text-xs"
            placeholder="bv. 29,97"
            aria-label="Frames per seconde"
            autoFocus
          />
          <Button type="submit" size="sm" className="h-8">
            OK
          </Button>
        </form>
        <p className="text-[10.5px] leading-snug text-(--text-muted)">
          Zodra je het eerste meetpunt zet wordt deze waarde vergrendeld.
        </p>
      </PopoverContent>
    </Popover>
  );
}
