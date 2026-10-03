import { describe, expect, it } from "vitest";

import { flowToState } from "../../../../circuitsketch/src/components/circuit/fromFlow";
import { sketchToDoc } from "../../lib/fromSketch";
import { docToSketchExport } from "../../lib/toSketch";
import { solve } from "../../sim";
import { reducer } from "../../state/useCircuit";
import { computeFlows } from "../flows";
import { toNetlist } from "../netlist";
import type { CircuitDoc } from "../types";

/** Bron (6 V) over de uiteinden van een potmeter; loper op stand `wiper`. */
function divider(wiper: number): CircuitDoc {
  return {
    vertices: {
      p: { id: "p", x: 0, y: 0 },
      m: { id: "m", x: 0, y: 120 },
      a: { id: "a", x: 120, y: 0 },
      b: { id: "b", x: 120, y: 120 },
      w: { id: "w", x: 160, y: 60 },
    },
    components: [
      { id: "s", type: "source", v0: "p", v1: "m", mirrored: false, values: { emf: 6 } },
      { id: "pm", type: "potmeter", v0: "a", v1: "b", v2: "w", mirrored: false, values: { resistance: 100, wiper } },
    ],
    wires: [
      { id: "w1", nodes: ["p", "a"] },
      { id: "w2", nodes: ["m", "b"] },
    ],
    labels: [],
  };
}

describe("potmeter", () => {
  it("de loper verdeelt de spanning", () => {
    for (const [wiper, expected] of [
      [30, 4.2],
      [50, 3],
      [100, 0],
    ]) {
      const r = solve(toNetlist(divider(wiper)));
      const u = (r.nodePotentials.get("w") ?? 0) - (r.nodePotentials.get("b") ?? 0);
      expect(u).toBeCloseTo(expected, 3);
    }
  });

  it("de stroompaden kloppen (Kirchhoff in het knooppunt onder de loper)", () => {
    const d = divider(30);
    const paths = computeFlows(d, solve(toNetlist(d))).filter((p) => p.key.startsWith("pm:"));
    const I = (k: string) => paths.find((p) => p.key === k)!.current;
    expect(I("pm:a")).toBeCloseTo(0.06, 4); // 6 V / 100 Ω
    expect(I("pm:a") - I("pm:b") - I("pm:w")).toBeCloseTo(0, 9);
  });

  it("verplaatsen, draaien en dupliceren nemen de loper mee", () => {
    let d = divider(50);
    d = reducer(d, { t: "moveComponent", id: "pm", p0: { x: 220, y: 0 }, p1: { x: 220, y: 120 } });
    expect(d.vertices.w).toMatchObject({ x: 260, y: 60 });
    d = reducer(d, { t: "rotateComponent", id: "pm" });
    expect(d.vertices.w).toMatchObject({ x: 220, y: 100 });
    d = reducer(d, { t: "duplicateComponent", id: "pm", newId: "pm2", newV0: "x0", newV1: "x1", newV2: "x2" });
    expect(d.components.find((c) => c.id === "pm2")?.v2).toBe("x2");
    expect(d.vertices.x2).toBeDefined();
  });

  it("omdraaien houdt de schakeling elektrisch gelijk", () => {
    const d = reducer(divider(30), { t: "reversePolarity", id: "pm" });
    const r = solve(toNetlist(d));
    expect((r.nodePotentials.get("w") ?? 0) - (r.nodePotentials.get("b") ?? 0)).toBeCloseTo(4.2, 3);
  });

  it("gaat mee naar CircuitSketch en terug, met de loper als derde aansluiting", () => {
    const sk = {
      components: [
        { id: "b", type: "voltage", x: 100, y: 200, rotation: 0, value: "6 V" },
        { id: "p", type: "potentiometer", x: 300, y: 200, rotation: 0, value: "1 kΩ" },
      ],
      wires: [
        {
          id: "w",
          nodes: [{ x: 300, y: 178 }, { x: 300, y: 140 }, { x: 400, y: 140 }],
          startAttach: { kind: "component" as const, componentId: "p", terminal: 2 },
        },
      ],
    };
    const r = sketchToDoc(sk);
    const pm = r.doc.components.find((c) => c.type === "potmeter")!;
    expect(pm.values.resistance).toBe(1000);
    expect(pm.v2).toBeDefined();
    expect(r.doc.wires[0].nodes[0]).toBe(pm.v2);
    const back = flowToState(docToSketchExport(r.doc) as unknown as Parameters<typeof flowToState>[0]);
    const p = back.components.find((c) => c.type === "potentiometer")!;
    expect(p.rotation).toBe(0);
    expect(back.wires.some((w) => w.startAttach?.kind === "component" && w.startAttach.terminal === 2)).toBe(true);
  });
});
