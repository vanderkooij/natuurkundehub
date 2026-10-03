import { ArrowLeftRight, Copy, LineChart, RotateCw, Trash2, Unlink, X } from "lucide-react";

import { COMPONENT_DEFS } from "@/model/componentDefs";
import { DIODE_VF, LED_COLORS, ledColor } from "@/model/ledSpec";
import { niceStep } from "@/lib/values";
import { ANALOG_SPEC, isAnalog } from "@/model/meterSpec";
import { isSensor, sensorR } from "@/model/sensorSpec";
import { formatOhm } from "@/lib/format";
import type { CircuitComponent } from "@/model/types";

interface Props {
  comp: CircuitComponent;
  onValue: (value: number) => void;
  onToggleClosed: () => void;
  onSetColor: (color: string) => void;
  onReplace: () => void;
  onReverse: () => void;
  /** Analoge meter: index (0..2) van het aangesloten bereik, of null. */
  analogActiveIndex: number | null;
  onSetRange: (rangeIndex: number) => void;
  onRotate: () => void;
  onDetach: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onGraph: () => void;
  /** Lamp: wissel tussen ohms (vaste R) en gloeidraad (niet-ohms). */
  onToggleNonOhmic: () => void;
  /** Potmeter: stand van de loper (0..100 %). */
  onWiper: (w: number) => void;
  /** Selectie opheffen (balk sluiten). */
  onClose: () => void;
  /** Meetopdracht-modus: verberg de grafiek (die verklapt de stroom). */
  measureMode: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

const VALUE_LABEL: Record<string, string> = {
  emf: "Spanning",
  resistance: "Weerstand",
  imax: "Nominale stroom",
};

const iconBtn =
  "grid h-8 w-8 place-items-center rounded-md border border-(--border-solid) text-(--text-secondary) hover:bg-(--bg-card-hover) disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent";
const textBtn =
  "rounded-md border border-(--border-solid) px-2.5 py-1 text-sm text-(--text-primary) hover:bg-(--bg-card-hover)";
const small = "text-xs text-(--text-muted)";

/**
 * Instellingen van het geselecteerde onderdeel, als smalle balk onder het canvas
 * (één regel; op een smal scherm loopt hij door op een tweede regel). Zo valt hij
 * nooit over de schakeling, zoals het zwevende paneeltje vroeger deed.
 */
export function ContextPanel({
  comp,
  onValue,
  onToggleClosed,
  onSetColor,
  onReplace,
  onReverse,
  analogActiveIndex,
  onSetRange,
  onRotate,
  onDetach,
  onDelete,
  onDuplicate,
  onGraph,
  onToggleNonOhmic,
  onWiper,
  onClose,
  measureMode,
}: Props) {
  const canGraph =
    !measureMode &&
    (comp.type === "resistor" ||
      comp.type === "varresistor" ||
      comp.type === "lamp" ||
      comp.type === "led" ||
      comp.type === "diode" ||
      isSensor(comp.type));
  const def = COMPONENT_DEFS[comp.type];
  const value = def.valueKey ? (comp.values[def.valueKey] ?? 0) : 0;
  const digitalMeter = comp.type === "voltmeter" || comp.type === "ammeter";
  const meter = digitalMeter || isAnalog(comp.type);
  const replace = (
    <button type="button" onClick={onReplace} className={textBtn}>
      Doorgebrand: vervangen
    </button>
  );

  const controls = (() => {
    if (comp.type === "switch") {
      return (
        <button type="button" onClick={onToggleClosed} className={textBtn}>
          {(comp.values.closed ?? true) ? "Dicht (klik: open)" : "Open (klik: dicht)"}
        </button>
      );
    }
    if (comp.type === "led") {
      return (
        <>
          <div className="flex items-center gap-1.5">
            {LED_COLORS.map((col) => {
              const active = (comp.values.color ?? LED_COLORS[0].key) === col.key;
              return (
                <button
                  key={col.key}
                  type="button"
                  title={`${col.label}: Vf ${col.vf.toLocaleString("nl-NL")} V`}
                  onClick={() => onSetColor(col.key)}
                  className={`h-6 w-6 rounded-full border-2 ${active ? "border-(--accent)" : "border-(--border-solid)"}`}
                  style={{ background: col.hex }}
                />
              );
            })}
          </div>
          <span className={small}>
            V<sub>f</sub> = {ledColor(comp.values.color).vf.toLocaleString("nl-NL")} V
          </span>
          {comp.values.burned && replace}
        </>
      );
    }
    if (comp.type === "diode") {
      return (
        <>
          <span className={small}>
            Geleidt alleen in de richting van de driehoek, vanaf V<sub>f</sub> = {DIODE_VF.toLocaleString("nl-NL")} V
          </span>
          {comp.values.burned && replace}
        </>
      );
    }
    if (isAnalog(comp.type)) {
      return (
        <>
          <span className={small}>Bereik</span>
          <div className="flex gap-1">
            {(ANALOG_SPEC[comp.type]?.ranges ?? []).map((rng, i) => {
              const active = i === analogActiveIndex;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSetRange(i)}
                  className={`rounded-md border px-2 py-1 text-sm ${
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
          {analogActiveIndex === null && <span className={small}>Sluit zwart (0) en één rode poort aan.</span>}
        </>
      );
    }
    if (!def.valueKey) return null;
    return (
      <>
        <span className={small}>
          {comp.type === "ldr" ? "Lichtsterkte" : comp.type === "ntc" ? "Temperatuur" : VALUE_LABEL[def.valueKey]}
        </span>
        {def.log ? (
          // Logaritmisch: 1, 10, 100, 1k, 10k staan op gelijke afstand.
          <input
            type="range"
            min={0}
            max={1000}
            step={1}
            value={Math.round((1000 * Math.log(value / (def.min ?? 1))) / Math.log((def.max ?? 1) / (def.min ?? 1)))}
            onChange={(e) => {
              const lo = def.min ?? 1;
              const raw = lo * ((def.max ?? 1) / lo) ** (Number(e.target.value) / 1000);
              const st = niceStep(raw);
              onValue(clamp(Math.round(raw / st) * st, lo, def.max ?? lo));
            }}
            className="w-40 accent-(--accent)"
          />
        ) : (
          <input
            type="range"
            min={def.min}
            max={def.max}
            step={def.step}
            value={value}
            onChange={(e) => onValue(Number(e.target.value))}
            className="w-40 accent-(--accent)"
          />
        )}
        <span className="flex items-center gap-1">
          <input
            type="number"
            min={def.min}
            max={def.max}
            step={def.step}
            value={value}
            onChange={(e) => onValue(clamp(Number(e.target.value), def.min ?? 0, def.max ?? 0))}
            className="w-20 rounded-md border border-(--border-solid) bg-(--bg-primary) px-1.5 py-1 text-right text-sm text-(--text-primary)"
          />
          <span className="text-sm text-(--text-muted)">{def.unit}</span>
        </span>
        {isSensor(comp.type) && (
          <span className={small}>
            R = <span className="font-medium text-(--text-secondary)">{formatOhm(sensorR(comp.values.env))}</span>
            {comp.type === "ldr" ? " (meer licht: lagere R)" : " (warmer: lagere R)"}
          </span>
        )}
        {comp.type === "potmeter" && (
          <>
            <span className={small}>Loper</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={comp.values.wiper ?? 50}
              onChange={(e) => onWiper(Number(e.target.value))}
              className="w-32 accent-(--accent)"
            />
            <span className="w-10 text-sm text-(--text-secondary)">{Math.round(comp.values.wiper ?? 50)} %</span>
          </>
        )}
        {comp.type === "lamp" && (
          <button
            type="button"
            onClick={onToggleNonOhmic}
            title="Niet-ohms: de gloeidraad wordt heter, dus R stijgt met de spanning (kromme karakteristiek)"
            className={textBtn}
          >
            {(comp.values.nonOhmic ?? false) ? "Gloeidraad" : "Vaste R"}
          </button>
        )}
        {comp.type === "fuse" && comp.values.blown && replace}
      </>
    );
  })();

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-(--border-solid) bg-card px-3 py-2"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="text-sm font-semibold text-(--text-primary)">{def.label}</span>
      {controls}
      <div className="flex-1" />
      {canGraph && (
        <button type="button" onClick={onGraph} className={`${textBtn} flex items-center gap-1.5`}>
          <LineChart size={15} /> I&#8209;U&#8209;grafiek
        </button>
      )}
      <div className="flex gap-1">
        {!meter && (
          <button type="button" className={iconBtn} title="Roteren" onClick={onRotate}>
            <RotateCw size={15} />
          </button>
        )}
        {/* Omdraaien: +/− van een bron, LED-richting, of de meetsnoeren van een
            meter wisselen. Bij een analoge meter alleen zinvol als er een
            rood bereik is aangesloten. */}
        <button
          type="button"
          className={iconBtn}
          title={meter ? "Meetsnoeren omwisselen (teken omkeren)" : "Omdraaien (polariteit omkeren)"}
          onClick={onReverse}
          disabled={isAnalog(comp.type) && analogActiveIndex === null}
        >
          <ArrowLeftRight size={15} />
        </button>
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
        <button type="button" className={iconBtn} title="Sluiten (Esc)" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
