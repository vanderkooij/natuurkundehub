import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTracking } from "@/features/tracking/TrackingState";
import { useVideo } from "@/features/video/VideoState";
import { cn } from "@/lib/utils";

const PRESETS = [1, 2, 5, 10, 20];

/**
 * Chip in de video-pane-header: toont en wijzigt de frame-stap. Klik opent
 * een popover met preset-knoppen en een numerieke input.
 */
export function FrameStepChip() {
  const { frameStep, setFrameStep } = useTracking();
  const { video } = useVideo();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  if (!video) return null;

  const lastFrame = Math.max(1, video.frameCount - 1);

  const apply = (raw: string) => {
    const n = Number(raw.replace(",", ".").trim());
    if (!Number.isFinite(n)) return;
    setFrameStep(Math.min(lastFrame, Math.max(1, Math.round(n))));
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(String(frameStep));
      }}
    >
      {/* 11b: shadcn Tooltip rond de popover-trigger i.p.v. native title=. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-md border bg-card px-2 py-[3px] font-mono text-[11px] text-(--text-secondary)",
                "transition-colors hover:border-(--accent) hover:text-(--accent)",
              )}
              style={{ borderColor: "var(--border-solid)" }}
            >
              <span className="text-(--text-muted)">stap</span>
              {frameStep}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Klik om de frame-stap aan te passen</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-60 space-y-3">
        <div>
          <div className="text-[13px] font-semibold text-(--text-primary)">Frame-stap</div>
          <div className="font-mono text-[11px] text-(--text-muted)">
            elke klik springt N frames vooruit
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p}
              variant="outline"
              size="sm"
              className={cn(
                "h-7 font-mono text-[11px]",
                frameStep === p && "border-(--accent) text-(--accent)",
              )}
              onClick={() => {
                setFrameStep(p);
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
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8 flex-1 font-mono text-xs"
            placeholder="bv. 3"
            aria-label="Frame-stap"
            autoFocus
          />
          <Button type="submit" size="sm" className="h-8">
            OK
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
