/**
 * Rechterstrook met de instrumenten: sleep een meter op het canvas en sluit 'm
 * aan met draden (meetsnoeren). De strook is inklapbaar naar een smalle balk om
 * ruimte voor het canvas te maken.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { COMPONENT_DEFS, INSTRUMENTS } from "@/model/componentDefs";
import { ANALOG_H, ANALOG_SPEC, ANALOG_W, isAnalog } from "@/model/meterSpec";
import type { ComponentType } from "@/model/types";
import { AnalogMeter } from "@/render/svg/AnalogMeter";
import { ComponentSymbol } from "@/render/svg/Symbols";

interface Props {
  onInstrumentPointerDown: (type: ComponentType, e: React.PointerEvent) => void;
}

function Preview({ type }: { type: ComponentType }) {
  if (isAnalog(type)) {
    const m = 6;
    return (
      <svg
        viewBox={`${-ANALOG_W / 2 - m} ${-ANALOG_H / 2 - m} ${ANALOG_W + 2 * m} ${ANALOG_H + 2 * m}`}
        width={150}
        height={104}
        className="pointer-events-none"
      >
        <AnalogMeter spec={ANALOG_SPEC[type]!} deflection={0.62} activeIndex={null} overRange={false} />
      </svg>
    );
  }
  return (
    <svg viewBox="-40 -28 80 56" width={72} height={50} className="pointer-events-none">
      <ComponentSymbol type={type} />
    </svg>
  );
}

export function InstrumentRail({ onInstrumentPointerDown }: Props) {
  // Standaard dicht: meters zijn er pas als je ze nodig hebt (meer canvasruimte).
  const [collapsed, setCollapsed] = useState(true);

  if (collapsed) {
    return (
      <aside className="hidden w-10 shrink-0 flex-col items-center gap-3 border-l border-(--border-solid) bg-card py-3 md:flex">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Meters tonen"
          aria-label="Meters tonen"
          className="grid h-8 w-8 place-items-center rounded-lg border border-(--border-solid) text-(--text-secondary) hover:bg-(--bg-card-hover)"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wide text-(--text-muted) [writing-mode:vertical-rl]">
          Meters
        </span>
      </aside>
    );
  }

  return (
    <aside className="hidden w-44 shrink-0 flex-col gap-2 overflow-y-auto border-l border-(--border-solid) bg-card p-3 md:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-(--text-muted)">Meters</h2>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Inklappen"
          aria-label="Meters inklappen"
          className="grid h-6 w-6 place-items-center rounded-md text-(--text-muted) hover:bg-(--bg-card-hover) hover:text-(--text-secondary)"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {INSTRUMENTS.map((type) => (
        <button
          key={type}
          type="button"
          onPointerDown={(e) => onInstrumentPointerDown(type, e)}
          title={`Sleep een ${COMPONENT_DEFS[type].label.toLowerCase()} op het canvas`}
          className="flex touch-none select-none flex-col items-center gap-1 rounded-lg border border-(--border-solid) bg-(--bg-card) p-2 hover:bg-(--bg-card-hover)"
          style={{ cursor: "grab" }}
        >
          <Preview type={type} />
          <span className="text-[11px] text-(--text-secondary)">{COMPONENT_DEFS[type].label}</span>
        </button>
      ))}
    </aside>
  );
}
