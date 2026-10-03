import { describe, expect, it } from "vitest";

import { hopPath, wireHops } from "../hops";
import type { CircuitDoc } from "../types";

const doc = (vs: Record<string, [number, number]>, wires: string[][]): CircuitDoc => ({
  vertices: Object.fromEntries(Object.entries(vs).map(([id, [x, y]]) => [id, { id, x, y }])),
  components: [],
  wires: wires.map((nodes, i) => ({ id: `w${i}`, nodes })),
});

describe("boogjes bij kruisingen", () => {
  it("een liggende draad maakt een boogje over een staande draad", () => {
    const d = doc({ a: [0, 100], b: [200, 100], c: [100, 0], e: [100, 200] }, [["a", "b"], ["c", "e"]]);
    const h = wireHops(d);
    expect(h.get("w0:0")).toEqual([{ x: 100, y: 100 }]);
    expect(h.has("w1:0")).toBe(false);
    expect(hopPath({ x: 0, y: 100 }, { x: 200, y: 100 }, h.get("w0:0"))).toContain(" A ");
  });

  it("geen boogje bij een gedeelde knoop of een T-aansluiting", () => {
    const shared = doc({ a: [0, 100], b: [200, 100], c: [100, 0] }, [["a", "b"], ["c", "a"]]);
    expect(wireHops(shared).size).toBe(0);
    // staande draad eindigt precies op de liggende (niet verbonden, maar geen kruising)
    const t = doc({ a: [0, 100], b: [200, 100], c: [100, 0], e: [100, 100] }, [["a", "b"], ["c", "e"]]);
    expect(wireHops(t).size).toBe(0);
  });

  it("evenwijdige draden kruisen niet", () => {
    const d = doc({ a: [0, 100], b: [200, 100], c: [0, 140], e: [200, 140] }, [["a", "b"], ["c", "e"]]);
    expect(wireHops(d).size).toBe(0);
  });
});
