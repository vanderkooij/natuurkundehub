/**
 * Specificatie + layout van de analoge VOS-meters (Fase 4b).
 *
 * Vier aansluitpunten: 1 zwart (common) + 3 rood (bereiken). Je verbindt zwart +
 * één rode poort; die rode bepaalt het bereik en dus de actieve schaal. De wijzer
 * loopt over drie schalen; kies je een te klein bereik dan slaat de naald door.
 */
import type { ComponentType, CircuitComponent, CircuitDoc } from "./types";

export interface AnalogSpec {
  letter: string;
  unit: string;
  role: "amp" | "volt";
  /** Bereiken horend bij de 3 rode poorten, van groot naar klein. */
  ranges: number[];
  /** Aantal hoofdvakken op de boog (ampèremeter 5, voltmeter 3). */
  intervals: number;
}

export const ANALOG_SPEC: Partial<Record<ComponentType, AnalogSpec>> = {
  analogAmmeter: { letter: "A", unit: "A", role: "amp", ranges: [5, 0.5, 0.05], intervals: 5 },
  analogVoltmeter: { letter: "V", unit: "V", role: "volt", ranges: [30, 15, 3], intervals: 3 },
};

export const isAnalog = (t: ComponentType): boolean =>
  t === "analogAmmeter" || t === "analogVoltmeter";

/** Body-afmetingen (lokale coördinaten, midden = oorsprong). Groot = goed afleesbaar. */
export const ANALOG_W = 300;
export const ANALOG_H = 200;

/**
 * Poort-offsets t.o.v. het midden. Volgorde: [common(zwart), rood0, rood1, rood2]
 * (rood0 = ranges[0], het grootste bereik). Ruim uit elkaar voor het makkelijk
 * aansluiten van meetsnoeren. Common onderaan, roden erboven.
 */
export function analogPortOffsets(): { x: number; y: number }[] {
  const x = ANALOG_W / 2 - 16;
  return [
    { x, y: 72 }, // common (zwart)
    { x, y: -72 }, // rood0 = ranges[0]
    { x, y: -24 }, // rood1 = ranges[1]
    { x, y: 24 }, // rood2 = ranges[2]
  ];
}

/** Wereldpositie van poort i (uit de opgeslagen cx/cy). */
export function analogPortPos(comp: CircuitComponent, i: number): { x: number; y: number } {
  const off = analogPortOffsets()[i];
  return { x: (comp.cx ?? 0) + off.x, y: (comp.cy ?? 0) + off.y };
}

/**
 * Welke rode poort is aangesloten (heeft een draad)? Geeft de index in ranges
 * (0..2) en de bijbehorende poort-vertex terug, of null als geen rode poort
 * verbonden is. Bij meerdere: de eerste (grootste bereik) wint.
 */
export function activeRange(
  doc: CircuitDoc,
  comp: CircuitComponent,
): { index: number; portId: string; range: number } | null {
  const spec = ANALOG_SPEC[comp.type];
  if (!spec || !comp.ports) return null;
  const connected = (vid: string) => doc.wires.some((w) => w.nodes.includes(vid));
  for (let i = 0; i < 3; i++) {
    const portId = comp.ports[i + 1]; // ports[1..3] = rood0..2
    if (portId && connected(portId)) return { index: i, portId, range: spec.ranges[i] };
  }
  return null;
}
