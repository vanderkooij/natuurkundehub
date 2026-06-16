import { ChevronRight, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type StepState = "todo" | "active" | "done";

export interface WorkflowStep {
  num: number;
  label: string;
  state: StepState;
  /** Of de stap aanklikbaar/interactief is. Placeholders staan op false. */
  enabled: boolean;
  onClick?: () => void;
}

export interface WorkflowBarProps {
  steps: WorkflowStep[];
  startTrackingEnabled?: boolean;
  onStartTracking?: () => void;
  /** Optionele subtiele inline-melding, onder de Start-tracking-knop. */
  startTrackingHint?: string | null;
  /** Tooltip-tekst op de Start-tracking-knop (uitleg waarom 'ie disabled is). */
  startTrackingTooltip?: string;
  /**
   * Optionele extra slot in de actie-zone RECHTS, ná Start tracking. Bv. de
   * Meten/Analyseren-toggle (08: consistente actie-zone rechts).
   */
  trailingSlot?: React.ReactNode;
}

export function WorkflowBar({
  steps,
  startTrackingEnabled = false,
  onStartTracking,
  startTrackingHint,
  startTrackingTooltip,
  trailingSlot,
}: WorkflowBarProps) {
  return (
    <nav
      className="relative flex flex-shrink-0 items-center gap-1.5 overflow-x-visible border-b bg-(--bg-secondary) px-5 py-2.5"
      style={{ borderColor: "var(--border)" }}
    >
      {/* 10: groepeert stap 1-5 als "Voorbereiding". Puur informatief (geen
          actie); verbergt zich op smal scherm waar de stappen zelf voorgaan. */}
      <span className="mr-1 hidden text-[11px] font-medium text-(--text-muted) md:inline-block">
        Voorbereiding:
      </span>
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={step.enabled ? step.onClick : undefined}
            disabled={!step.enabled}
            aria-current={step.state === "active" ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3.5 py-1.5 text-[13px] transition-all whitespace-nowrap",
              "font-display",
              step.state === "todo" && [
                "bg-card text-(--text-secondary) border-(--border-solid)",
                step.enabled
                  ? "cursor-pointer hover:border-(--accent)"
                  : "cursor-not-allowed opacity-60",
              ],
              step.state === "done" && "bg-(--accent)/[0.06] text-(--accent) border-(--accent)/30",
              step.state === "active" &&
                "bg-(--accent) text-white border-(--accent) shadow-[0_0_0_3px_var(--accent-glow)]",
            )}
          >
            <span className="font-mono text-[11px] opacity-70">{step.num}</span>
            {step.label}
          </button>
          {i < steps.length - 1 && (
            <ChevronRight className="size-3 text-(--text-muted)" aria-hidden />
          )}
        </div>
      ))}

      <div className="flex-1" />

      {/* Actie-zone rechts: Start tracking + (optioneel) mode-toggle. */}
      <div className="flex items-center gap-3">
        <div className="relative flex flex-col items-end">
          {/* 11b: shadcn Tooltip i.p.v. native title= (consistente styling in
              dark mode). Bij disabled toont Radix geen tooltip — de uitleg
              staat dan al in `startTrackingHint` onder de knop. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="amber"
                size="sm"
                disabled={!startTrackingEnabled}
                onClick={onStartTracking}
                className="h-9 px-4 text-[13px]"
              >
                <Play className="size-3.5 fill-current" />
                Start tracking
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {startTrackingTooltip ??
                (startTrackingEnabled
                  ? "Start frame-voor-frame tracking"
                  : "Stel eerst de schaal en assen in om te starten met tracking")}
            </TooltipContent>
          </Tooltip>
          {startTrackingHint ? (
            <p className="pointer-events-none absolute top-full mt-1 whitespace-nowrap font-mono text-[10px] text-(--text-muted)">
              {startTrackingHint}
            </p>
          ) : null}
        </div>
        {trailingSlot ? (
          <>
            <div className="h-6 w-px bg-(--border-solid)" aria-hidden />
            {trailingSlot}
          </>
        ) : null}
      </div>
    </nav>
  );
}
