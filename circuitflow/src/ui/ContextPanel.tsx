import { ArrowLeftRight, Copy, FlipVertical2, LineChart, RotateCw, Trash2, Unlink } from "lucide-react";

import { COMPONENT_DEFS } from "@/model/componentDefs";
import { LED_COLORS, ledColor } from "@/model/ledSpec";
import { ANALOG_SPEC, isAnalog } from "@/model/meterSpec";
import { isSensor, sensorR } from "@/model/sensorSpec";
import { formatOhm } from "@/lib/format";
import type { CircuitComponent } from "@/model/types";

interface Props {
  comp: CircuitComponent;
  /** Schermpositie (px) waar het paneeltje verschijnt. */
  x: number;
  y: number;
  onValue: (value: number) => void;
  onToggleClosed: () => void;
  onSetColor: (color: string) => void;
  onReplace: () => void;
  onReverse: () => void;
  /** Analoge meter: index (0..2) van het aangesloten bereik, of null. */
  analogActiveIndex: number | null;
  onSetRange: (rangeIndex: number) => void;
  onRotate: () => void;
  onMirror: () => void;
  onDetach: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onGraph: () => void;
  /** Lamp: wissel tussen ohms (vaste R) en gloeidraad (niet-ohms). */
  onToggleNonOhmic: () => void;
  /** Meetopdracht-modus: verberg de grafiek (die verklapt de stroom). */
  measureMode: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

const VALUE_LABEL: Record<string, string> = {
  emf: "Spanning (EMK)",
  resistance: "Weerstand",
  imax: "Nominale stroom",
};

const iconBtn =
  "grid h-7 w-7 place-items-center rounded-md border border-(--border-solid) text-(--text-secondary) hover:bg-(--bg-card-hover)";

export function ContextPanel({
  comp,
  x,
  y,
  onValue,
  onToggleClosed,
  onSetColor,
  onReplace,
  onReverse,
  analogActiveIndex,
  onSetRange,
  onRotate,
  onMirror,
  onDetach,
  onDelete,
  onDuplicate,
  onGraph,
  onToggleNonOhmic,
  measureMode,
}: Props) {
  const canGraph =
    !measureMode &&
    (comp.type === "resistor" || comp.type === "lamp" || comp.type === "led" || isSensor(comp.type));
  const def = COMPONENT_DEFS[comp.type];
  const value = def.valueKey ? (comp.values[def.valueKey] ?? 0) : 0;
  const digitalMeter = comp.type === "voltmeter" || comp.type === "ammeter";
  const meter = digitalMeter || isAnalog(comp.type);

  return (
    <div
      className="absolute z-20 w-60 -translate-x-1/2 rounded-xl border border-(--border-solid) bg-card p-3 shadow-xl"
      style={{ left: x, top: y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-(--text-primary)">{def.label}</span>
        <div className="flex gap-1">
          {!meter && (
            <>
              <button type="button" className={iconBtn} title="Roteren" onClick={onRotate}>
                <RotateCw size={15} />
              </button>
              {comp.type === "led" ? (
                <button type="button" className={iconBtn} title="Polariteit omkeren" onClick={onReverse}>
                  <ArrowLeftRight size={15} />
                </button>
              ) : (
                <button type="button" className={iconBtn} title="Spiegelen" onClick={onMirror}>
                  <FlipVertical2 size={15} />
                </button>
              )}
            </>
          )}
          {digitalMeter && (
            <button
              type="button"
              className={iconBtn}
              title="Meetdraden omwisselen (teken omkeren)"
              onClick={onReverse}
            >
              <ArrowLeftRight size={15} />
            </button>
          )}
          <button type="button" className={iconBtn} title="Dupliceren (Ctrl+D)" onClick={onDuplicate}>
            <Copy size={15} />
          </button>
          <button type="button" className={iconBtn} title="Verbindingen loskoppelen" onClick={onDetach}>
            <Unlink size={15} />
          </button>
          <button
            type="button"
            className={`${iconBtn} hover:bg-destructive hover:text-white`}
            title="Verwijderen"
            onClick={onDelete}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {comp.type === "switch" ? (
        <button
          type="button"
          onClick={onToggleClosed}
          className="w-full rounded-md border border-(--border-solid) px-3 py-2 text-sm font-medium text-(--text-primary) hover:bg-(--bg-card-hover)"
        >
          {(comp.values.closed ?? true) ? "Dicht — klik om te openen" : "Open — klik om te sluiten"}
        </button>
      ) : comp.type === "led" ? (
        <>
          <label className="mb-1 block text-xs text-(--text-muted)">Kleur</label>
          <div className="flex gap-1.5">
            {LED_COLORS.map((col) => {
              const active = (comp.values.color ?? LED_COLORS[0].key) === col.key;
              return (
                <button
                  key={col.key}
                  type="button"
                  title={`${col.label} — Vf ${col.vf.toLocaleString("nl-NL")} V`}
                  onClick={() => onSetColor(col.key)}
                  className={`h-7 w-7 rounded-full border-2 ${active ? "border-(--accent)" : "border-(--border-solid)"}`}
                  style={{ background: col.hex }}
                />
              );
            })}
          </div>
          <div className="mt-2 text-xs text-(--text-muted)">
            Drempelspanning V<sub>f</sub> = {ledColor(comp.values.color).vf.toLocaleString("nl-NL")} V
          </div>
          {comp.values.burned && (
            <button
              type="button"
              onClick={onReplace}
              className="mt-2 w-full rounded-md border border-(--border-solid) px-3 py-2 text-sm font-medium text-(--text-primary) hover:bg-(--bg-card-hover)"
            >
              Doorgebrand — klik om te vervangen
            </button>
          )}
        </>
      ) : isAnalog(comp.type) ? (
        <>
          <label className="mb-1 block text-xs text-(--text-muted)">Bereik (meetknop)</label>
          <div className="flex gap-1.5">
            {(ANALOG_SPEC[comp.type]?.ranges ?? []).map((rng, i) => {
              const active = i === analogActiveIndex;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSetRange(i)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-sm ${
                    active
                      ? "border-(--accent) font-semibold text-(--accent)"
                      : "border-(--border-solid) text-(--text-secondary) hover:bg-(--bg-card-hover)"
                  }`}
                >
                  {rng.toLocaleString("nl-NL", { maximumFractionDigits: 3 })} {ANALOG_SPEC[comp.type]?.unit}
                </button>
              );
            })}
          </div>
          {analogActiveIndex === null && (
            <div className="mt-1.5 text-xs text-(--text-muted)">
              Sluit zwart (0) en één rode poort aan; kies daarna hier het bereik.
            </div>
          )}
        </>
      ) : (
        def.valueKey && (
          <>
            <label className="mb-1 block text-xs text-(--text-muted)">
              {comp.type === "ldr"
                ? "Lichtsterkte"
                : comp.type === "ntc"
                  ? "Temperatuur"
                  : VALUE_LABEL[def.valueKey]}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={def.min}
                max={def.max}
                step={def.step}
                value={value}
                onChange={(e) => onValue(Number(e.target.value))}
                className="flex-1 accent-(--accent)"
              />
              <input
                type="number"
                min={def.min}
                max={def.max}
                step={def.step}
                value={value}
                onChange={(e) => onValue(clamp(Number(e.target.value), def.min ?? 0, def.max ?? 0))}
                className="w-16 rounded-md border border-(--border-solid) bg-(--bg-primary) px-1.5 py-1 text-right text-sm text-(--text-primary)"
              />
              <span className="w-4 text-sm text-(--text-muted)">{def.unit}</span>
            </div>
            {isSensor(comp.type) && (
              <div className="mt-1.5 text-xs text-(--text-muted)">
                Weerstand nu: <span className="font-medium text-(--text-secondary)">{formatOhm(sensorR(comp.values.env))}</span>
                {comp.type === "ldr" ? " (meer licht → lagere R)" : " (warmer → lagere R)"}
              </div>
            )}
            {comp.type === "lamp" && (
              <button
                type="button"
                onClick={onToggleNonOhmic}
                title="Niet-ohms: de gloeidraad wordt heter → R stijgt met de spanning (kromme karakteristiek)"
                className="mt-2 w-full rounded-md border border-(--border-solid) px-3 py-1.5 text-sm text-(--text-secondary) hover:bg-(--bg-card-hover)"
              >
                {(comp.values.nonOhmic ?? false)
                  ? "Gloeidraad (niet-ohms) — klik voor ohms"
                  : "Ohms (vaste R) — klik voor gloeidraad"}
              </button>
            )}
            {comp.type === "fuse" && comp.values.blown && (
              <button
                type="button"
                onClick={onReplace}
                className="mt-2 w-full rounded-md border border-(--border-solid) px-3 py-2 text-sm font-medium text-(--text-primary) hover:bg-(--bg-card-hover)"
              >
                Doorgebrand — klik om te vervangen
              </button>
            )}
          </>
        )
      )}

      {canGraph && (
        <button
          type="button"
          onClick={onGraph}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-(--border-solid) px-3 py-1.5 text-sm text-(--text-secondary) hover:bg-(--bg-card-hover)"
        >
          <LineChart size={15} /> Toon I&#8209;U&#8209;grafiek
        </button>
      )}
    </div>
  );
}
