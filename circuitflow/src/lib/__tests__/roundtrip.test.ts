/**
 * Heen en terug: CircuitSketch → CircuitFlow → CircuitSketch, met de echte
 * omzetter van CircuitSketch (fromFlow.ts uit de buurmap).
 */
import { describe, expect, it } from "vitest";

import { flowToState } from "../../../../circuitsketch/src/components/circuit/fromFlow";
import { getTerminal } from "../../../../circuitsketch/src/components/circuit/renderer";
import type { CircuitState } from "../../../../circuitsketch/src/components/circuit/types";
import { parseSketch, sketchToDoc } from "../fromSketch";
import { docToSketchExport, type FlowExport } from "../toSketch";
import ledFile from "./fixtures/sketch-led.json";
import splitFile from "./fixtures/sketch-split.json";

function roundTrip(file: unknown) {
  const { state, version } = parseSketch(file)!;
  const r = sketchToDoc(state, version);
  const back = flowToState(docToSketchExport(r.doc) as unknown as Parameters<typeof flowToState>[0]);
  return { orig: state as unknown as CircuitState, back, doc: r.doc };
}

/** Componenten (type, draaiing, plek t.o.v. de eerste) als vergelijkbare tekst. */
function layout(s: CircuitState) {
  const o = s.components[0];
  return s.components
    .map((c) => `${c.type}@${c.x - o.x},${c.y - o.y}:${c.rotation % 180}`)
    .sort();
}

/** Elektrische knopen: groepen aansluitingen die via draden verbonden zijn. */
function nets(s: CircuitState): string[] {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    if (!parent.has(k)) parent.set(k, k);
    return parent.get(k) === k ? k : find(parent.get(k)!);
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  const typeIdx = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const c of [...s.components].sort((a, b) => a.x - b.x || a.y - b.y)) {
    const n = (counts.get(c.type) ?? 0) + 1;
    counts.set(c.type, n);
    typeIdx.set(c.id, `${c.type}${n}`);
  }
  const key = (a: { kind: string; componentId?: string; terminal?: number; wireId?: string }) =>
    a.kind === "component" ? `${typeIdx.get(a.componentId!)}.${a.terminal}` : `w:${a.wireId}`;
  for (const w of s.wires) {
    find(`w:${w.id}`);
    if (w.startAttach) union(`w:${w.id}`, key(w.startAttach));
    if (w.endAttach) union(`w:${w.id}`, key(w.endAttach));
  }
  const groups = new Map<string, string[]>();
  for (const k of parent.keys()) {
    if (k.startsWith("w:")) continue;
    const r = find(k);
    groups.set(r, [...(groups.get(r) ?? []), k]);
  }
  return [...groups.values()].map((g) => g.sort().join("+")).sort();
}

describe("CircuitSketch → CircuitFlow → CircuitSketch", () => {
  for (const [name, file] of [
    ["splitsing", splitFile],
    ["LED-schakeling", ledFile],
  ] as const) {
    it(`${name}: zelfde onderdelen op dezelfde plek, zelfde verbindingen`, () => {
      const { orig, back } = roundTrip(file);
      expect(layout(back)).toEqual(layout(orig));
      expect(nets(back)).toEqual(nets(orig));
      // Alles op het raster van CircuitSketch en alleen rechte draadstukken.
      for (const c of back.components) expect([c.x % 20, c.y % 20]).toEqual([0, 0]);
      for (const w of back.wires)
        for (let i = 1; i < w.nodes.length; i++) {
          const a = w.nodes[i - 1];
          const b = w.nodes[i];
          expect(a.x === b.x || a.y === b.y).toBe(true);
        }
      // Draaduiteinden liggen op de aansluiting waar ze aan vastzitten.
      for (const w of back.wires) {
        const ends = [
          [w.startAttach, w.nodes[0]],
          [w.endAttach, w.nodes[w.nodes.length - 1]],
        ] as const;
        for (const [a, p] of ends) {
          if (a?.kind !== "component") continue;
          const c = back.components.find((x) => x.id === a.componentId)!;
          const t = getTerminal(c, a.terminal);
          expect([Math.round(t.x), Math.round(t.y)]).toEqual([p.x, p.y]);
        }
      }
    });
  }

  it("waarden gaan mee terug, en een veranderde waarde wordt bijgewerkt in de tekst", () => {
    const { state, version } = parseSketch({
      version: 2,
      circuit: {
        components: [
          { id: "b", type: "voltage", x: 100, y: 100, rotation: 0, value: "U = 6 V" },
          { id: "r", type: "resistor", x: 200, y: 100, rotation: 0, value: "R1 = 100 Ω" },
          { id: "q", type: "resistor", x: 300, y: 100, rotation: 0, value: "R2 = ? [30 Ω]" },
        ],
        wires: [],
        labels: [],
        connectedCrossings: [],
      },
    })!;
    const r = sketchToDoc(state, version);
    r.doc.components[1].values.resistance = 220;
    const ex: FlowExport = docToSketchExport(r.doc);
    const back = flowToState(ex as unknown as Parameters<typeof flowToState>[0]);
    expect(back.components.map((c) => c.value)).toEqual(["U = 6 V", "R1 = 220 Ω", "R2 = ? [30 Ω]"]);
  });

  it("een schakeling die in CircuitFlow gebouwd is, wordt een nette tekening", () => {
    // Bron en weerstand met een schuine draad en een vrij versleept knikpunt.
    const doc = {
      vertices: {
        a: { id: "a", x: 100, y: 100 },
        b: { id: "b", x: 220, y: 100 },
        c: { id: "c", x: 400, y: 300 },
        d: { id: "d", x: 400, y: 420 },
        k: { id: "k", x: 330, y: 170 },
      },
      components: [
        { id: "s", type: "source" as const, v0: "b", v1: "a", mirrored: false, values: { emf: 6 } },
        { id: "r", type: "resistor" as const, v0: "c", v1: "d", mirrored: false, values: { resistance: 47 } },
      ],
      wires: [
        { id: "w1", nodes: ["b", "k", "c"] },
        { id: "w2", nodes: ["d", "a"] },
      ],
      labels: [],
    };
    const back = flowToState(docToSketchExport(doc) as unknown as Parameters<typeof flowToState>[0]);
    expect(back.components.map((c) => [c.type, c.rotation, c.value])).toEqual([
      ["voltage", 0, "6 V"],
      ["resistor", 90, "47 Ω"],
    ]);
    for (const w of back.wires)
      for (let i = 1; i < w.nodes.length; i++) {
        const a = w.nodes[i - 1];
        const b = w.nodes[i];
        expect(a.x === b.x || a.y === b.y).toBe(true);
      }
    expect(back.wires.every((w) => w.startAttach?.kind === "component" && w.endAttach?.kind === "component")).toBe(true);
  });
});
