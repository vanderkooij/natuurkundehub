import { describe, it, expect } from "vitest";

import { solve } from "@/sim";
import { computeFlows, type FlowPath } from "../flows";
import { toNetlist } from "../netlist";
import type { CircuitComponent, CircuitDoc, Wire } from "../types";

function vtx(spec: Record<string, [number, number]>): CircuitDoc["vertices"] {
  const out: CircuitDoc["vertices"] = {};
  for (const [id, [x, y]] of Object.entries(spec)) out[id] = { id, x, y };
  return out;
}
const src = (id: string, v0: string, v1: string, emf: number): CircuitComponent => ({
  id,
  type: "source",
  v0,
  v1,
  mirrored: false,
  values: { emf },
});
const res = (id: string, v0: string, v1: string, r: number): CircuitComponent => ({
  id,
  type: "resistor",
  v0,
  v1,
  mirrored: false,
  values: { resistance: r },
});
const wire = (id: string, ...nodes: string[]): Wire => ({ id, nodes });

/** Stroom (abs) op het draadsegment tussen twee posities, ongeacht richting. */
function wireCurrent(paths: FlowPath[], a: [number, number], b: [number, number]): number {
  const near = (x: number, y: number, p: [number, number]) =>
    Math.abs(x - p[0]) < 1 && Math.abs(y - p[1]) < 1;
  const p = paths.find(
    (f) =>
      f.hideRadius === 0 &&
      ((near(f.ax, f.ay, a) && near(f.bx, f.by, b)) || (near(f.ax, f.ay, b) && near(f.bx, f.by, a))),
  );
  return p ? Math.abs(p.current) : NaN;
}

describe("computeFlows — stroomverdeling per draad", () => {
  it("serie-lus: elk draadsegment voert de lusstroom (0,6 A)", () => {
    const doc: CircuitDoc = {
      vertices: vtx({ s0: [0, 0], s1: [100, 0], r0: [200, 0], r1: [300, 0] }),
      components: [src("V1", "s0", "s1", 6), res("R1", "r0", "r1", 10)],
      wires: [wire("w1", "s1", "r0"), wire("w2", "r1", "s0")],
    };
    const flows = computeFlows(doc, solve(toNetlist(doc)));
    expect(wireCurrent(flows, [100, 0], [200, 0])).toBeCloseTo(0.6, 4);
    expect(wireCurrent(flows, [300, 0], [0, 0])).toBeCloseTo(0.6, 4);
  });

  it("parallel: trunk voert 1,2 A, elke tak 0,6 A (Kirchhoff-splitsing)", () => {
    const doc: CircuitDoc = {
      vertices: vtx({
        A: [0, 0],
        B: [0, 100],
        J: [100, 0],
        K: [100, 100],
        r1a: [200, -20],
        r1b: [200, 80],
        r2a: [200, 20],
        r2b: [200, 120],
      }),
      components: [src("V1", "A", "B", 6), res("R1", "r1a", "r1b", 10), res("R2", "r2a", "r2b", 10)],
      wires: [
        wire("w0", "A", "J"), // trunk boven
        wire("w1", "J", "r1a"),
        wire("w2", "J", "r2a"),
        wire("w3", "r1b", "K"),
        wire("w4", "r2b", "K"),
        wire("w5", "K", "B"), // trunk onder
      ],
    };
    const flows = computeFlows(doc, solve(toNetlist(doc)));
    expect(wireCurrent(flows, [0, 0], [100, 0])).toBeCloseTo(1.2, 4); // trunk
    expect(wireCurrent(flows, [100, 100], [0, 100])).toBeCloseTo(1.2, 4); // trunk onder
    expect(wireCurrent(flows, [100, 0], [200, -20])).toBeCloseTo(0.6, 4); // tak 1
    expect(wireCurrent(flows, [100, 0], [200, 20])).toBeCloseTo(0.6, 4); // tak 2
  });

  it("open kring: geen stroom in de draden", () => {
    const doc: CircuitDoc = {
      vertices: vtx({ s0: [0, 0], s1: [100, 0], r0: [200, 0], r1: [300, 0] }),
      components: [src("V1", "s0", "s1", 6), res("R1", "r0", "r1", 10)],
      wires: [wire("w1", "s1", "r0")], // alleen één kant verbonden → open
    };
    const flows = computeFlows(doc, solve(toNetlist(doc)));
    expect(wireCurrent(flows, [100, 0], [200, 0])).toBeCloseTo(0, 6);
  });
});
