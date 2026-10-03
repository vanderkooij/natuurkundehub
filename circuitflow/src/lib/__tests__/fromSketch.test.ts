import { describe, expect, it } from "vitest";

import { GRID } from "@/model/geometry";
import { toNetlist } from "@/model/netlist";
import type { CircuitDoc } from "@/model/types";
import { solve } from "@/sim";
import { importNotice, parseSketch, sketchToDoc } from "../fromSketch";
import ledFile from "./fixtures/sketch-led.json";
import splitFile from "./fixtures/sketch-split.json";

/** Aantal elektrische knopen (vertices samengevoegd via draden). */
function nodeCount(doc: CircuitDoc): number {
  const parent = new Map(Object.keys(doc.vertices).map((k) => [k, k]));
  const find = (k: string): string => (parent.get(k) === k ? k : find(parent.get(k)!));
  for (const w of doc.wires) for (let i = 1; i < w.nodes.length; i++) parent.set(find(w.nodes[i]), find(w.nodes[0]));
  return new Set(Object.keys(doc.vertices).map(find)).size;
}

const comp = (id: string, type: string, x: number, y: number, rotation = 0, extra = {}) => ({
  id,
  type,
  x,
  y,
  rotation,
  ...extra,
});
const att = (componentId: string, terminal: number) => ({ kind: "component" as const, componentId, terminal });

describe("CircuitSketch → CircuitFlow", () => {
  it("herkent een CircuitSketch-bestand, maar geen CircuitFlow-bestand", () => {
    expect(parseSketch(splitFile)).not.toBeNull();
    expect(parseSketch({ app: "circuitflow", version: 1, doc: { vertices: {}, components: [], wires: [{ id: "w", nodes: ["a", "b"] }] } })).toBeNull();
    expect(parseSketch({ components: [], wires: [{ id: "w", nodes: ["a", "b"] }] })).toBeNull();
  });

  it("schaalt ×2 en legt alles op het raster", () => {
    const { state, version } = parseSketch(splitFile)!;
    const { doc } = sketchToDoc(state, version);
    for (const v of Object.values(doc.vertices)) expect([v.x % GRID, v.y % GRID]).toEqual([0, 0]);
    // Een liggende weerstand in CircuitSketch (aansluitingen ±30) wordt 120 breed.
    for (const c of doc.components) {
      const a = doc.vertices[c.v0];
      const b = doc.vertices[c.v1];
      expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(120);
    }
    // Draden blijven horizontaal/verticaal.
    for (const w of doc.wires)
      for (let i = 1; i < w.nodes.length; i++) {
        const a = doc.vertices[w.nodes[i - 1]];
        const b = doc.vertices[w.nodes[i]];
        expect(a.x === b.x || a.y === b.y).toBe(true);
      }
  });

  it("zet de splitsing van Jop om tot een werkende schakeling", () => {
    const { state, version } = parseSketch(splitFile)!;
    const r = sketchToDoc(state, version);
    expect(r.doc.components.map((c) => c.type).sort()).toEqual([
      "resistor",
      "resistor",
      "resistor",
      "source",
      "varresistor",
      "varresistor",
    ]);
    expect(r.replaced).toEqual([]);
    expect(r.skipped).toEqual([]);
    const res = solve(toNetlist(r.doc));
    const src = r.doc.components.find((c) => c.type === "source")!;
    const i = res.elementCurrents.get(src.id)!;
    expect(Number.isFinite(i)).toBe(true);
    expect(Math.abs(i)).toBeGreaterThan(0);
  });

  it("neemt aftakkingen op een knikpunt van een andere draad mee", () => {
    const { state, version } = parseSketch(ledFile)!;
    const r = sketchToDoc(state, version);
    expect(r.doc.components).toHaveLength(5);
    // 5 tweepolen in de tekening, aftakkingen naar knikpunten: er mogen geen
    // losse eindjes ontstaan die nergens aan vastzitten.
    const used = new Map<string, number>();
    for (const c of r.doc.components) for (const v of [c.v0, c.v1]) used.set(v, (used.get(v) ?? 0) + 1);
    for (const w of r.doc.wires) for (const v of w.nodes) used.set(v, (used.get(v) ?? 0) + 1);
    for (const w of r.doc.wires) {
      expect(used.get(w.nodes[0])).toBeGreaterThan(1);
      expect(used.get(w.nodes[w.nodes.length - 1])).toBeGreaterThan(1);
    }
  });

  it("de bron houdt zijn polariteit: de lange plaat (rechts in CircuitSketch) wordt de +", () => {
    const r = sketchToDoc({ components: [comp("b", "voltage", 100, 100)], wires: [] });
    const src = r.doc.components[0];
    expect(r.doc.vertices[src.v0].x).toBeGreaterThan(r.doc.vertices[src.v1].x);
  });

  it("laat onbekende onderdelen weg met een melding en houdt de draden", () => {
    const r = sketchToDoc({
      components: [comp("b", "voltage", 100, 100), comp("k", "capacitor", 300, 100), comp("s", "switch", 200, 200, 0, { closed: true })],
      wires: [
        { id: "w1", nodes: [{ x: 130, y: 100 }, { x: 270, y: 100 }], startAttach: att("b", 1), endAttach: att("k", 0) },
        { id: "w2", nodes: [{ x: 330, y: 100 }, { x: 330, y: 200 }, { x: 230, y: 200 }], startAttach: att("k", 1), endAttach: att("s", 1) },
      ],
    });
    expect(r.doc.components.map((c) => c.type)).toEqual(["source", "switch"]);
    expect(r.doc.components[1].values.closed).toBe(true);
    expect(r.doc.wires).toHaveLength(2);
    expect(r.skipped).toEqual([{ label: "condensator", count: 1 }]);
    expect(importNotice(r)).toContain("condensator");
  });

  it("een schakelaar zonder stand is open (zoals in CircuitSketch)", () => {
    const r = sketchToDoc({ components: [comp("s", "switch", 100, 100)], wires: [] });
    expect(r.doc.components[0].values.closed).toBe(false);
  });

  it("verbonden kruisingen en aftakkingen midden op een draad worden één knoop", () => {
    const r = sketchToDoc({
      components: [comp("r1", "resistor", 100, 100), comp("r2", "resistor", 100, 300)],
      wires: [
        // horizontaal van r1 naar rechts, verticaal ertegen dwars over
        { id: "h", nodes: [{ x: 130, y: 100 }, { x: 330, y: 100 }], startAttach: att("r1", 1) },
        { id: "v", nodes: [{ x: 230, y: 0 }, { x: 230, y: 200 }] },
        // r2 takt midden op draad h af
        {
          id: "t",
          nodes: [{ x: 130, y: 300 }, { x: 280, y: 300 }, { x: 280, y: 100 }],
          startAttach: att("r2", 1),
          endAttach: { kind: "wire-segment", wireId: "h", segmentIndex: 0, point: { x: 280, y: 100 } },
        },
      ],
      connectedCrossings: ["230,100"],
    });
    // Knopen: r1.0, r2.0, en één knoop voor h + v + t + r1.1 + r2.1
    expect(nodeCount(r.doc)).toBe(3);
  });

  it("oude CircuitSketch-bestanden (versie 1, lange aansluitdraadjes) sluiten ook aan", () => {
    const r = sketchToDoc(
      {
        components: [comp("r", "resistor", 100, 100)],
        wires: [{ id: "w", nodes: [{ x: 140, y: 100 }, { x: 200, y: 100 }], startAttach: att("r", 1) }],
      },
      1,
    );
    const c = r.doc.components[0];
    expect(r.doc.wires[0].nodes[0]).toBe(c.v1);
    const a = r.doc.vertices[c.v0];
    const b = r.doc.vertices[c.v1];
    expect(b.x - a.x).toBe(160);
  });
});
