import { useEffect, useState } from "react";
import { Sigma } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type FitType } from "@/_reusable/fit";
import {
  type FitConfig,
  type FitRange,
  useGraphsLayout,
} from "@/features/measurements/GraphsLayoutState";
import { useVideo } from "@/features/video/VideoState";
import { cn } from "@/lib/utils";

const FIT_OPTIONS: ReadonlyArray<{ value: FitType; label: string }> = [
  { value: "none", label: "geen" },
  { value: "linear", label: "lineair" },
  { value: "quadratic", label: "kwadratisch" },
  { value: "sine", label: "sinus" },
];

interface FitButtonProps {
  /** Disabled wanneer er nog niet genoeg meetpunten zijn (minder dan 2). */
  disabled?: boolean;
}

/**
 * Globale Fit-config-knop in de Graphs-container-header. Popover met twee
 * kolommen (x-richting / y-richting) en een fit-range-sectie eronder.
 * Wijzigingen propageren direct naar alle panes via `GraphsLayoutState`.
 */
export function FitButton({ disabled }: FitButtonProps) {
  const { fitConfig, setFitConfig } = useGraphsLayout();
  const { trim } = useVideo();
  const anyActive = fitConfig.xFit !== "none" || fitConfig.yFit !== "none";

  const setX = (xFit: FitType) => setFitConfig({ ...fitConfig, xFit });
  const setY = (yFit: FitType) => setFitConfig({ ...fitConfig, yFit });
  const setRange = (range: FitRange) => setFitConfig({ ...fitConfig, range });

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className={cn(
                "h-7 gap-1 border-(--border-solid) px-2 text-[11px]",
                disabled
                  ? "opacity-40"
                  : anyActive
                    ? "border-(--accent) text-(--accent)"
                    : "text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)",
              )}
              aria-pressed={anyActive}
            >
              <Sigma className="size-3.5" />
              Fit
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {disabled
            ? "Minimaal 2 metingen nodig om te fitten"
            : "Kies fit-type per coördinaat (x en y) + fit-range"}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 space-y-3 p-3">
        <div>
          <div className="text-[13px] font-semibold text-(--text-primary)">Functie-fit</div>
          <div className="font-mono text-[11px] text-(--text-muted)">
            Eén globale keuze per coördinaat
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FitColumn label="x-richting" value={fitConfig.xFit} onChange={setX} name="xfit" />
          <FitColumn label="y-richting" value={fitConfig.yFit} onChange={setY} name="yfit" />
        </div>
        <FitRangeSection
          range={fitConfig.range}
          onChange={setRange}
          trimStart={trim.start}
          trimEnd={trim.end}
        />
      </PopoverContent>
    </Popover>
  );
}

interface FitColumnProps {
  label: string;
  value: FitType;
  onChange: (next: FitType) => void;
  name: string;
}

function FitColumn({ label, value, onChange, name }: FitColumnProps) {
  return (
    <div>
      <div className="mb-1 font-mono text-[11px] text-(--text-secondary)">{label}:</div>
      <div className="space-y-0.5">
        {FIT_OPTIONS.map((opt) => {
          const id = `${name}-${opt.value}`;
          const active = value === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-[12px] transition-colors",
                active
                  ? "bg-(--accent)/10 text-(--accent)"
                  : "text-(--text-primary) hover:bg-(--bg-card-hover)",
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={opt.value}
                checked={active}
                onChange={() => onChange(opt.value)}
                className="size-3 accent-(--accent)"
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

interface FitRangeSectionProps {
  range: FitRange;
  onChange: (next: FitRange) => void;
  trimStart: number;
  trimEnd: number;
}

/**
 * UI voor de fit-range sub-selectie: twee numerieke inputs (begin/eind frame)
 * met een "volledige trim"-checkbox die de range naar `null` zet (en de
 * inputs disabled). De inputs houden lokale string-state zodat een tijdelijk
 * ongeldige waarde (bv. tussen-typen) niet meteen de config corrumpeert;
 * pas op `blur` (of valid Enter) committen we naar de globale config.
 */
function FitRangeSection({ range, onChange, trimStart, trimEnd }: FitRangeSectionProps) {
  const useFullTrim = range === null;
  const effective = range ?? { start: trimStart, end: trimEnd };

  const [startStr, setStartStr] = useState(String(effective.start));
  const [endStr, setEndStr] = useState(String(effective.end));

  // Sync lokale strings als de globale range wijzigt (bv. via undo of nieuwe
  // video). Vermijdt drift na external resets.
  useEffect(() => {
    setStartStr(String(effective.start));
    setEndStr(String(effective.end));
  }, [effective.start, effective.end]);

  const commit = (nextStart: number, nextEnd: number) => {
    // Clamp naar trim + zorg dat start < end (anders fallback naar volle trim).
    const s = Math.max(trimStart, Math.min(trimEnd, Math.round(nextStart)));
    const e = Math.max(trimStart, Math.min(trimEnd, Math.round(nextEnd)));
    if (s >= e) {
      // Ongeldige range — laat 'm staan zoals 'ie was.
      return;
    }
    if (s === trimStart && e === trimEnd) {
      onChange(null);
      return;
    }
    onChange({ start: s, end: e });
  };

  const onStartBlur = () => {
    const parsed = Number.parseInt(startStr, 10);
    if (!Number.isFinite(parsed)) {
      setStartStr(String(effective.start));
      return;
    }
    commit(parsed, effective.end);
  };
  const onEndBlur = () => {
    const parsed = Number.parseInt(endStr, 10);
    if (!Number.isFinite(parsed)) {
      setEndStr(String(effective.end));
      return;
    }
    commit(effective.start, parsed);
  };

  const toggleFullTrim = () => {
    if (useFullTrim) {
      // Activeer custom range op huidige trim.
      const s = trimStart;
      const e = trimEnd;
      // Voorkom degeneraat: minstens 1 frame breedte.
      if (s < e) onChange({ start: s, end: e });
    } else {
      onChange(null);
    }
  };

  return (
    <div className="space-y-1.5 border-t pt-2.5" style={{ borderColor: "var(--border)" }}>
      <div className="font-mono text-[11px] text-(--text-secondary)">Fit-range:</div>
      <div className="flex items-center gap-2 text-[12px]">
        <label
          className={cn(
            "flex items-center gap-1.5",
            useFullTrim ? "text-(--text-muted)" : "text-(--text-primary)",
          )}
        >
          <span className="font-mono text-[11px]">Van frame:</span>
          <input
            type="number"
            value={startStr}
            min={trimStart}
            max={trimEnd}
            disabled={useFullTrim}
            onChange={(e) => setStartStr(e.target.value)}
            onBlur={onStartBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className={cn(
              "h-7 w-16 rounded border bg-(--bg-card) px-1.5 text-[12px] font-mono text-(--text-primary)",
              "border-(--border-solid) focus:border-(--accent) focus:outline-none",
              useFullTrim && "opacity-50",
            )}
          />
        </label>
        <label
          className={cn(
            "flex items-center gap-1.5",
            useFullTrim ? "text-(--text-muted)" : "text-(--text-primary)",
          )}
        >
          <span className="font-mono text-[11px]">Tot frame:</span>
          <input
            type="number"
            value={endStr}
            min={trimStart}
            max={trimEnd}
            disabled={useFullTrim}
            onChange={(e) => setEndStr(e.target.value)}
            onBlur={onEndBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className={cn(
              "h-7 w-16 rounded border bg-(--bg-card) px-1.5 text-[12px] font-mono text-(--text-primary)",
              "border-(--border-solid) focus:border-(--accent) focus:outline-none",
              useFullTrim && "opacity-50",
            )}
          />
        </label>
      </div>
      <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-(--text-primary)">
        <input
          type="checkbox"
          checked={useFullTrim}
          onChange={toggleFullTrim}
          className="size-3 accent-(--accent)"
        />
        <span>Volledige trim gebruiken</span>
      </label>
      <p className="text-[10.5px] leading-snug text-(--text-muted)">
        Trim: {trimStart} – {trimEnd}
      </p>
    </div>
  );
}

export type { FitType, FitConfig };
