import { Eye, EyeOff, Redo2, RotateCcw, Table2, Type, Undo2 } from "lucide-react";

import { cn } from "@/lib/cn";
import { COMPONENT_DEFS, PALETTE } from "@/model/componentDefs";
import type { CircuitDoc, ComponentType } from "@/model/types";
import type { FlowMode } from "@/render/CanvasOverlay";
import { ComponentSymbol } from "@/render/svg/Symbols";
import { FileMenu } from "./FileMenu";

function PaletteIcon({ type, schematic }: { type: ComponentType; schematic: boolean }) {
  return (
    <svg viewBox="-72 -30 144 60" width={60} height={26} className="pointer-events-none">
      <ComponentSymbol type={type} brightness={0.6} schematic={schematic} />
    </svg>
  );
}

interface Props {
  onPalettePointerDown: (type: ComponentType, e: React.PointerEvent) => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  mode: FlowMode;
  onModeChange: (m: FlowMode) => void;
  schematic: boolean;
  onSchematicChange: (s: boolean) => void;
  measureMode: boolean;
  onMeasureModeChange: (m: boolean) => void;
  showTable: boolean;
  onToggleTable: () => void;
  onAddLabel: () => void;
  doc: CircuitDoc;
  onLoad: (doc: CircuitDoc) => void;
  onExportPng: () => void;
  onNotify: (msg: string) => void;
}

const MODES: [FlowMode, string][] = [
  ["electrons", "Elektronen"],
  ["conventional", "Conventioneel"],
];

export function Toolbar({
  onPalettePointerDown,
  onReset,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  mode,
  onModeChange,
  schematic,
  onSchematicChange,
  measureMode,
  onMeasureModeChange,
  showTable,
  onToggleTable,
  onAddLabel,
  doc,
  onLoad,
  onExportPng,
  onNotify,
}: Props) {
  const stepBtn =
    "grid h-9 w-9 place-items-center rounded-lg border border-(--border-solid) text-(--text-secondary) hover:bg-(--bg-card-hover) disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    // flex-wrap: op smallere schermen (Chromebook 1024–1280) vouwt de balk naar
    // een tweede rij i.p.v. buiten beeld te lopen.
    <div className="flex min-h-[60px] shrink-0 flex-wrap items-center gap-x-1.5 gap-y-1.5 border-b border-(--border-solid) bg-card px-3 py-1.5">
      <span className="mr-1 hidden text-xs font-semibold uppercase tracking-wide text-(--text-muted) lg:inline">
        Componenten
      </span>
      {PALETTE.map((type) => (
        <button
          key={type}
          type="button"
          onPointerDown={(e) => onPalettePointerDown(type, e)}
          title={`Sleep een ${COMPONENT_DEFS[type].label.toLowerCase()} op het canvas`}
          className="flex touch-none select-none flex-col items-center gap-0.5 rounded-lg border border-(--border-solid) bg-(--bg-card) px-2 py-1 hover:bg-(--bg-card-hover) active:cursor-grabbing"
          style={{ cursor: "grab" }}
        >
          <PaletteIcon type={type} schematic={schematic} />
          <span className="text-[11px] text-(--text-secondary)">{COMPONENT_DEFS[type].label}</span>
        </button>
      ))}
      <div className="ml-auto flex items-center rounded-lg border border-(--border-solid) p-0.5 text-sm">
        {([[false, "Pictoriaal"], [true, "Schema"]] as const).map(([val, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => onSchematicChange(val)}
            className={cn(
              "rounded-md px-2.5 py-1.5",
              schematic === val
                ? "bg-primary text-white"
                : "text-(--text-secondary) hover:bg-(--bg-card-hover)",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center rounded-lg border border-(--border-solid) p-0.5 text-sm">
        {MODES.map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={cn(
              "rounded-md px-2.5 py-1.5",
              mode === m
                ? "bg-primary text-white"
                : "text-(--text-secondary) hover:bg-(--bg-card-hover)",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onMeasureModeChange(!measureMode)}
        title={measureMode ? "Meetwaarden tonen" : "Meetopdracht: verberg de stroom-/spanningswaarden"}
        aria-label="Meetopdracht-modus"
        className={cn(stepBtn, measureMode && "bg-primary text-white hover:bg-primary")}
      >
        {measureMode ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <button
        type="button"
        onClick={onAddLabel}
        title="Tekstlabel toevoegen (dubbelklik een label om te bewerken)"
        aria-label="Tekstlabel toevoegen"
        className={stepBtn}
      >
        <Type size={16} />
      </button>
      <button
        type="button"
        onClick={onToggleTable}
        disabled={measureMode}
        title={measureMode ? "Niet beschikbaar in meetopdracht-modus" : "Meetwaardentabel (U, I en P per component)"}
        aria-label="Meetwaardentabel"
        className={cn(stepBtn, showTable && !measureMode && "bg-primary text-white hover:bg-primary")}
      >
        <Table2 size={16} />
      </button>
      <FileMenu doc={doc} onLoad={onLoad} onExportPng={onExportPng} onNotify={onNotify} />
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title="Ongedaan maken (Ctrl+Z)"
        className={stepBtn}
      >
        <Undo2 size={16} />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        title="Opnieuw (Ctrl+Y)"
        className={stepBtn}
      >
        <Redo2 size={16} />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1.5 rounded-lg border border-(--border-solid) px-3 py-2 text-sm text-(--text-secondary) hover:bg-(--bg-card-hover)"
      >
        <RotateCcw size={16} /> Reset
      </button>
    </div>
  );
}
