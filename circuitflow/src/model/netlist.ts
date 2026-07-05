import type { Netlist, SimElement } from "@/sim";
import { ledVf } from "./ledSpec";
import { activeRange } from "./meterSpec";
import { isSensor, sensorR } from "./sensorSpec";
import type { CircuitDoc } from "./types";

/**
 * Vertaalt het editor-model naar de generieke netlist voor de solver.
 * Knoopsleutels = vertex-id's; gedeelde id's zijn automatisch dezelfde knoop.
 * Een polylijn-draad levert per segment een (weerstandsloos) wire-element op,
 * zodat union-find alle vertices van die draad samenvoegt tot één knoop.
 */
export function toNetlist(doc: CircuitDoc): Netlist {
  const elements: SimElement[] = [];
  for (const c of doc.components) {
    if (c.type === "source") {
      elements.push({ id: c.id, type: "source", a: c.v0, b: c.v1, emf: c.values.emf ?? 0 });
    } else if (c.type === "switch") {
      elements.push({ id: c.id, type: "switch", a: c.v0, b: c.v1, closed: c.values.closed ?? true });
    } else if (c.type === "ammeter") {
      // Ideale ampèremeter = 0 V-bron (0 Ω) → de solver geeft de stroom erdoorheen.
      elements.push({ id: c.id, type: "ammeter", a: c.v0, b: c.v1 });
    } else if (c.type === "led") {
      // Niet-lineaire diode: anode = v0, kathode = v1. De solver schakelt zelf
      // geleidend/sperrend; een doorgebrande LED is permanent open.
      elements.push({
        id: c.id,
        type: "led",
        a: c.v0,
        b: c.v1,
        vf: ledVf(c.values.color),
        burned: c.values.burned ?? false,
      });
    } else if (c.type === "fuse") {
      // Intacte zekering = bijna-ideale geleider (mini-weerstand → geeft stroom,
      // brandt door op een kortsluiting); doorgebrand = open.
      if (!(c.values.blown ?? false)) {
        elements.push({ id: c.id, type: "resistor", a: c.v0, b: c.v1, resistance: 1e-3 });
      }
    } else if (isSensor(c.type)) {
      // Sensor = weerstand waarvan R uit de omgevings-slider volgt.
      elements.push({
        id: c.id,
        type: "resistor",
        a: c.v0,
        b: c.v1,
        resistance: sensorR(c.values.env),
      });
    } else if (c.type === "lamp") {
      elements.push({
        id: c.id,
        type: "lamp",
        a: c.v0,
        b: c.v1,
        resistance: c.values.resistance ?? Infinity,
        nonOhmic: c.values.nonOhmic ?? false,
      });
    } else if (c.type === "voltmeter") {
      // Ideale voltmeter = ∞ Ω → geen element; de UI leest het potentiaalverschil.
      continue;
    } else if (c.type === "analogAmmeter") {
      // 0 Ω tussen common en de aangesloten rode poort (= 0 V-bron).
      const act = activeRange(doc, c);
      if (act && c.ports) elements.push({ id: c.id, type: "ammeter", a: c.ports[0], b: act.portId });
    } else if (c.type === "analogVoltmeter") {
      continue; // probe; UI leest ΔV(common, actieve rode poort)
    } else {
      elements.push({
        id: c.id,
        type: "resistor",
        a: c.v0,
        b: c.v1,
        resistance: c.values.resistance ?? Infinity,
      });
    }
  }
  for (const w of doc.wires) {
    for (let i = 0; i < w.nodes.length - 1; i++) {
      elements.push({ id: `${w.id}:${i}`, type: "wire", a: w.nodes[i], b: w.nodes[i + 1] });
    }
  }
  return { elements };
}
