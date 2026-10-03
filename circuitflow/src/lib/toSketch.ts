/**
 * Een CircuitFlow-schakeling klaarmaken voor CircuitSketch ("Openen in CircuitSketch").
 *
 * We sturen geen CircuitSketch-bestand, maar de knopengraaf zelf, al ÷2 geschaald
 * en met CircuitSketch-typenamen en waarde-teksten. CircuitSketch maakt er zelf
 * een tekening van (zie circuitsketch/src/components/circuit/fromFlow.ts): het
 * legt componenten op hun plek en maakt van de draden rechte stukken.
 *
 * Wat niet meegaat: instellingen van het experiment (LDR-licht, NTC-temperatuur,
 * gloeidraad, meetbereik van een analoge meter) en doorgebrand-zijn.
 */
import { COMPONENT_DEFS } from "@/model/componentDefs";
import { ledColor } from "@/model/ledSpec";
import { activeRange } from "@/model/meterSpec";
import type { CircuitComponent, CircuitDoc, ComponentType } from "@/model/types";
import { findLedColor, replaceQuantity, type Unit } from "./values";

export interface FlowExport {
  app: "circuitflow";
  kind: "sketch-export";
  version: 1;
  vertices: Record<string, { x: number; y: number }>;
  /** t0/t1 zijn de aansluitingen 0 en 1 in CircuitSketch-volgorde. */
  components: { type: string; t0: string; t1: string; t2?: string; closed?: boolean; value?: string }[];
  wires: string[][];
  labels: { x: number; y: number; text: string }[];
}

const SK_TYPE: Record<ComponentType, string> = {
  source: "voltage",
  resistor: "resistor",
  varresistor: "varresistor",
  potmeter: "potentiometer",
  lamp: "lamp",
  led: "led",
  diode: "diode",
  fuse: "fuse",
  ldr: "ldr",
  ntc: "ntc",
  switch: "switch",
  voltmeter: "voltmeter",
  ammeter: "ammeter",
  analogAmmeter: "ammeter",
  analogVoltmeter: "voltmeter",
};

const UNIT: Partial<Record<ComponentType, Unit>> = {
  source: "V",
  resistor: "Ω",
  varresistor: "Ω",
  potmeter: "Ω",
  lamp: "Ω",
  fuse: "A",
};

/** De waarde-tekst voor CircuitSketch: de oude tekst bijgewerkt, of een nieuwe. */
function valueText(c: CircuitComponent): string | undefined {
  const unit = UNIT[c.type];
  const key = COMPONENT_DEFS[c.type].valueKey;
  if (unit && key) {
    const v = c.values[key];
    return typeof v === "number" ? replaceQuantity(c.sketchText, unit, v) : c.sketchText;
  }
  if (c.type === "led") {
    const label = ledColor(c.values.color).label.toLowerCase();
    const old = findLedColor(c.sketchText);
    if (!c.sketchText?.trim()) return label;
    if (!old) return c.sketchText;
    if (old.key === c.values.color) return c.sketchText;
    return c.sketchText.slice(0, old.start) + label + c.sketchText.slice(old.end);
  }
  return c.sketchText;
}

export function docToSketchExport(doc: CircuitDoc): FlowExport {
  const vertices: FlowExport["vertices"] = {};
  for (const v of Object.values(doc.vertices)) vertices[v.id] = { x: v.x / 2, y: v.y / 2 };
  const components: FlowExport["components"] = [];
  for (const c of doc.components) {
    let t0 = c.v0;
    let t1 = c.v1;
    if (c.type === "source") [t0, t1] = [c.v1, c.v0]; // in CircuitSketch zit de + rechts (aansluiting 1)
    if ((c.type === "analogAmmeter" || c.type === "analogVoltmeter") && c.ports) {
      // Analoge meter: zwart (common) en de aangesloten rode poort.
      const act = activeRange(doc, c);
      t0 = c.ports[0];
      t1 = act?.portId ?? c.ports[1];
    }
    const value = valueText(c);
    components.push({
      type: SK_TYPE[c.type],
      t0,
      t1,
      ...(c.v2 ? { t2: c.v2 } : {}),
      ...(c.type === "switch" ? { closed: c.values.closed ?? true } : {}),
      ...(value ? { value } : {}),
    });
  }
  return {
    app: "circuitflow",
    kind: "sketch-export",
    version: 1,
    vertices,
    components,
    wires: doc.wires.map((w) => [...w.nodes]),
    labels: (doc.labels ?? []).map((l) => ({ x: l.x / 2, y: l.y / 2, text: l.text })),
  };
}

/**
 * Vingerafdruk van de schakeling zoals de leerling hem gemaakt heeft: plekken,
 * verbindingen en waarden, maar niet de id's (die deelt loadDoc opnieuw uit).
 * Doorbranden telt niet mee: dat doet de simulatie zelf.
 */
export function docSignature(doc: CircuitDoc): string {
  const pos = (id: string) => {
    const v = doc.vertices[id];
    return v ? `${v.x},${v.y}` : "?";
  };
  return JSON.stringify({
    c: doc.components.map((c) => {
      const { burned: _b, blown: _bl, ...values } = c.values;
      return [c.type, pos(c.v0), pos(c.v1), c.mirrored, values, (c.ports ?? []).map(pos), c.cx, c.cy];
    }),
    w: doc.wires.map((w) => w.nodes.map(pos)),
    l: (doc.labels ?? []).map((l) => [l.x, l.y, l.text, l.boxed ?? false]),
  });
}
