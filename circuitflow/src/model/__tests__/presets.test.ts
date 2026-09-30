import { describe, it, expect } from "vitest";

import { solve } from "@/sim";
import { GRID } from "../geometry";
import { toNetlist } from "../netlist";
import { PRESETS } from "../presets";

describe("voorbeeldschakelingen", () => {
  it("alle punten en labels liggen op het raster", () => {
    for (const p of PRESETS) {
      const doc = p.build();
      for (const v of Object.values(doc.vertices)) {
        expect([p.key, v.x % GRID, v.y % GRID]).toEqual([p.key, 0, 0]);
      }
      for (const l of doc.labels ?? [])
        expect([p.key, l.x % GRID, l.y % GRID]).toEqual([p.key, 0, 0]);
    }
  });

  it("combi parallel-dan-serie: 20 Ω ∥ 30 Ω in serie met 10 Ω op 6 V", () => {
    const doc = PRESETS.find((p) => p.key === "combiParallelSerie")!.build();
    const r = solve(toNetlist(doc));
    const I = (i: number) =>
      Math.abs(r.elementCurrents.get(doc.components[i].id) ?? NaN);
    expect(I(0)).toBeCloseTo(6 / 22, 6); // bron: 12 Ω + 10 Ω
    expect(I(1) + I(2)).toBeCloseTo(I(0), 6);
    expect(I(1) / I(2)).toBeCloseTo(1.5, 6); // 30/20: door de kleinste R de meeste stroom
  });

  it("combi serie-dan-parallel: 10 Ω + 20 Ω parallel aan 20 Ω op 6 V", () => {
    const doc = PRESETS.find((p) => p.key === "combiSerieParallel")!.build();
    const r = solve(toNetlist(doc));
    const I = (i: number) =>
      Math.abs(r.elementCurrents.get(doc.components[i].id) ?? NaN);
    expect(I(1)).toBeCloseTo(0.2, 6); // 6 V / 30 Ω
    expect(I(3)).toBeCloseTo(0.3, 6); // 6 V / 20 Ω
    expect(I(0)).toBeCloseTo(0.5, 6);
  });
});
