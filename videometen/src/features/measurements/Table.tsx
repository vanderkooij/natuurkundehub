import { useEffect, useMemo, useState } from "react";
import { Check, Columns3, ChevronDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pane, PaneBody, PaneHeader } from "@/_reusable/ThreePaneLayout";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCalibration, type LengthUnit } from "@/features/calibration/CalibrationState";
import { buildRows, type MeasurementRow } from "@/features/measurements/derive";
import { withAccelerations, type ExtendedRow } from "@/features/measurements/graph-types";
import { useMeasurementHover } from "@/features/measurements/MeasurementHoverState";
import { useTracking } from "@/features/tracking/TrackingState";
import { useVideo } from "@/features/video/VideoState";
import { decimalsForUnit, formatDecimal, TIME_DECIMALS } from "@/lib/numbers";
import { cn } from "@/lib/utils";

// 10: extra (optionele) kolommen — de zes afgeleide grootheden. frame/t/x/y
// zijn essentieel en altijd zichtbaar (niet in het menu). De keuze is een
// vluchtige UI-voorkeur (niet opgeslagen in project-JSON).
type ColumnKey = "vx" | "vy" | "vmag" | "ax" | "ay" | "amag";

interface ColumnDef {
  key: ColumnKey;
  /** Veld op `ExtendedRow` waar de waarde uit komt. */
  field: "vx" | "vy" | "vMag" | "ax" | "ay" | "aMag";
  label: (u: string) => string;
  tip: string;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: "vx", field: "vx", label: (u) => `vx (${u}/s)`, tip: "Snelheid in x-richting" },
  { key: "vy", field: "vy", label: (u) => `vy (${u}/s)`, tip: "Snelheid in y-richting" },
  {
    key: "vmag",
    field: "vMag",
    label: (u) => `|v| (${u}/s)`,
    tip: "Absolute snelheid: √(vx² + vy²)",
  },
  {
    key: "ax",
    field: "ax",
    label: (u) => `ax (${u}/s²)`,
    tip: "Versnelling in x-richting (numerieke afgeleide, kan ruisig zijn)",
  },
  {
    key: "ay",
    field: "ay",
    label: (u) => `ay (${u}/s²)`,
    tip: "Versnelling in y-richting (numerieke afgeleide, kan ruisig zijn)",
  },
  {
    key: "amag",
    field: "aMag",
    label: (u) => `|a| (${u}/s²)`,
    tip: "Absolute versnelling: √(ax² + ay²)",
  },
];

interface NumCellProps {
  value: number | undefined;
  decimals: number;
  className?: string;
}

function NumCell({ value, decimals, className }: NumCellProps) {
  if (value === undefined || !Number.isFinite(value)) {
    return (
      <td className={cn("px-3 py-1.5 text-right font-mono text-(--text-muted)", className)}>—</td>
    );
  }
  return (
    <td className={cn("px-3 py-1.5 text-right font-mono tabular-nums", className)}>
      {formatDecimal(value, decimals)}
    </td>
  );
}

interface RowProps {
  row: ExtendedRow;
  isActive: boolean;
  isHovered: boolean;
  activeCols: ColumnDef[];
  decimals: number;
  onClick: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onRemove: () => void;
}

function TableRow({
  row,
  isActive,
  isHovered,
  activeCols,
  decimals,
  onClick,
  onHoverEnter,
  onHoverLeave,
  onRemove,
}: RowProps) {
  // Sinds 05d: ook gedimde (buiten-trim) rijen zijn klikbaar. De `withinTrim`-
  // styling blijft puur een filter-indicator ("dit telt niet mee in standaard
  // analyse"), geen navigatie-blokkade. Scrubben in de video buiten trim is
  // ook toegestaan (sinds 01) — tabel volgt nu dezelfde regel.
  const dimmed = !row.withinTrim;
  return (
    <tr
      onClick={onClick}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      className={cn(
        "group relative cursor-pointer border-b border-(--border) transition-colors hover:bg-(--bg-card-hover)",
        dimmed && "opacity-50",
        // Actieve rij: duidelijke accent-tint + linker-rand-accent via box-shadow op de eerste cel.
        isActive && "bg-(--accent)/10 font-medium text-(--text-primary)",
        // Hover-sync vanuit andere pane: dunne outline.
        isHovered && !isActive && "bg-(--accent)/5 outline outline-1 outline-(--accent)/30",
      )}
    >
      <td
        className={cn(
          "px-3 py-1.5 text-right font-mono tabular-nums",
          isActive && "shadow-[inset_3px_0_0_var(--accent)]",
        )}
      >
        {row.frame}
      </td>
      <NumCell value={row.t} decimals={TIME_DECIMALS} />
      <NumCell value={row.x} decimals={decimals} />
      <NumCell value={row.y} decimals={decimals} />
      {activeCols.map((c) => (
        <NumCell key={c.key} value={row[c.field]} decimals={decimals} />
      ))}
      <td className="w-8 px-1 py-1.5 text-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Verwijder meting op frame ${row.frame}`}
          title="Verwijder meting"
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded text-(--text-muted)",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "hover:bg-(--accent)/15 hover:text-(--accent)",
          )}
        >
          <X className="size-3.5" />
        </button>
      </td>
    </tr>
  );
}

/**
 * Tabel-pane (rechtsboven). Renders een `ExtendedRow[]` afgeleid uit
 * tracking-points + kalibratie. Pixel-data blijft puur — `buildRows` +
 * `withAccelerations` zijn pure (gememoiseerde) afgeleides.
 */
export function MeasurementTable() {
  const { video, currentFrame, trim, setFrame } = useVideo();
  const { points, removePointAt } = useTracking();
  const { scale, axes } = useCalibration();
  const { hoveredFrame, setHoveredFrame } = useMeasurementHover();

  // 10: keuze van extra kolommen. Default leeg (alleen frame/t/x/y). Vluchtige
  // UI-state — niet in project-JSON.
  const [extraColumns, setExtraColumns] = useState<Set<ColumnKey>>(() => new Set());
  const toggleColumn = (k: ColumnKey) =>
    setExtraColumns((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  // Reset bij nieuwe/andere video. "Begin opnieuw" + "Alle metingen wissen"
  // brengen de meetreeks naar 0 → de tabel-pane unmount (App-layout-gating) en
  // start bij terugkomst sowieso met een lege selectie, dus die hoeven hier niet
  // apart afgevangen te worden.
  const videoUrl = video?.url ?? null;
  useEffect(() => {
    setExtraColumns(new Set());
  }, [videoUrl]);

  const fps = video?.fps ?? 30;
  const rows = useMemo<MeasurementRow[]>(() => {
    if (!scale) return [];
    return buildRows(points, scale, axes, fps, trim.start, trim.end);
  }, [points, scale, axes, fps, trim.start, trim.end]);
  // Versnellingen (ax/ay/aMag) — hergebruik de bestaande helper uit graph-types
  // (central difference op vx/vy), zodat tabel en grafieken dezelfde waarden tonen.
  const extRows = useMemo<ExtendedRow[]>(() => withAccelerations(rows), [rows]);

  const unit: LengthUnit = scale?.unit ?? "m";
  const decimals = decimalsForUnit(unit);

  const activeCols = useMemo(
    () => COLUMN_DEFS.filter((c) => extraColumns.has(c.key)),
    [extraColumns],
  );

  // Header-actions: kolommen-menu (checkboxes voor de 6 afgeleide grootheden).
  const headerActions = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 border-(--border-solid) px-2 text-[12px] text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)"
        >
          <Columns3 className="size-3.5" />
          Kolommen
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1.5">
        <p className="px-2 py-1 text-[11px] text-(--text-muted)">Extra kolommen</p>
        {COLUMN_DEFS.map((c) => {
          const active = extraColumns.has(c.key);
          return (
            <Tooltip key={c.key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toggleColumn(c.key)}
                  aria-pressed={active}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] text-(--text-secondary) hover:bg-(--bg-card-hover)"
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border",
                      active
                        ? "border-(--accent) bg-(--accent) text-white"
                        : "border-(--border-solid)",
                    )}
                  >
                    {active ? <Check className="size-3" /> : null}
                  </span>
                  <span className="font-mono">{c.label(unit)}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[30ch]">
                {c.tip}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </PopoverContent>
    </Popover>
  );

  // 08: geen `!scale` / `rows.length === 0` empty-states meer. De tabel-pane
  // mount pas zodra er ≥1 meting is (zie App.tsx-layout-gating), en tracken
  // vereist een schaal — dus `scale` is hier altijd gezet en `rows.length ≥ 1`.
  return (
    <Pane>
      <PaneHeader
        title={
          <>
            Tabel{" "}
            <span className="ml-1 text-(--text-muted)">
              · {rows.length} {rows.length === 1 ? "meting" : "metingen"}
            </span>
          </>
        }
        actions={headerActions}
      />
      <PaneBody className="bg-(--bg-card)">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-(--bg-card)">
            <tr className="border-b border-(--border)">
              <th className="px-3 py-2 text-right text-[11px] font-semibold tracking-wide text-(--text-secondary)">
                frame
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold tracking-wide text-(--text-secondary)">
                t (s)
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold tracking-wide text-(--text-secondary)">
                x ({unit})
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold tracking-wide text-(--text-secondary)">
                y ({unit})
              </th>
              {activeCols.map((c) => (
                <th
                  key={c.key}
                  className="px-3 py-2 text-right text-[11px] font-semibold tracking-wide text-(--text-secondary)"
                >
                  {c.label(unit)}
                </th>
              ))}
              <th className="w-8 px-1 py-2" aria-label="acties" />
            </tr>
          </thead>
          <tbody>
            {extRows.map((row) => (
              <TableRow
                key={row.frame}
                row={row}
                isActive={row.frame === currentFrame}
                isHovered={row.frame === hoveredFrame}
                activeCols={activeCols}
                decimals={decimals}
                onClick={() => setFrame(row.frame)}
                onHoverEnter={() => setHoveredFrame(row.frame)}
                onHoverLeave={() => setHoveredFrame(null)}
                onRemove={() => removePointAt(row.frame)}
              />
            ))}
          </tbody>
        </table>

        {rows.length === 1 ? (
          <div className="border-t border-(--border) bg-(--bg-secondary) px-3 py-2 text-center font-mono text-[11px] text-(--text-muted)">
            Voeg minimaal nog één meting toe voor snelheden.
          </div>
        ) : null}
      </PaneBody>
    </Pane>
  );
}
