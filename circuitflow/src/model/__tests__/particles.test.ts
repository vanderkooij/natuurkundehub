import { describe, it, expect } from "vitest";

import { solve } from "@/sim";
import { computeFlows } from "../flows";
import { toNetlist } from "../netlist";
import { afstandDrukste, bouwKringen, deeltjesOp } from "../particles";
import { PRESETS } from "../presets";
import type { CircuitDoc } from "../types";

function opbouw(doc: CircuitDoc, electrons = false) {
  const flows = computeFlows(doc, solve(toNetlist(doc)));
  const bronnen = new Set(
    doc.components.filter((c) => c.type === "source").map((c) => c.id),
  );
  return bouwKringen(flows, electrons, bronnen);
}

function preset(naam: string): CircuitDoc {
  const p = PRESETS.find((x) => x.key === naam);
  if (!p) throw new Error("geen preset " + naam);
  return p.build();
}

describe("kringdecompositie voor de deeltjes", () => {
  it("serieschakeling: één kring met de hele stroom", () => {
    const o = opbouw(preset("serie"));
    expect(o.kringen.length).toBe(1);
    expect(o.kringen[0].weight).toBeCloseTo(0.5, 6); // 6 V over 2 × 6 Ω
  });

  it("parallelschakeling: twee kringen, samen de bronstroom", () => {
    const o = opbouw(preset("parallel"));
    expect(o.kringen.length).toBe(2);
    const som = o.kringen.reduce((s, k) => s + k.weight, 0);
    expect(som).toBeCloseTo(2, 6); // 6 V over 6 Ω ∥ 6 Ω = 3 Ω
    for (const k of o.kringen) expect(k.weight).toBeCloseTo(1, 6);
  });

  it("per tak telt de stroom van de kringen op tot de takstroom (Kirchhoff)", () => {
    for (const naam of [
      "serie",
      "parallel",
      "combiParallelSerie",
      "combiSerieParallel",
    ]) {
      for (const electrons of [false, true]) {
        const o = opbouw(preset(naam), electrons);
        const som = new Map<string, number>();
        for (const k of o.kringen)
          for (const e of k.edges)
            som.set(e.key, (som.get(e.key) ?? 0) + k.weight);
        for (const e of o.edges.values())
          expect(som.get(e.key) ?? 0).toBeCloseTo(e.weight, 4);
      }
    }
  });

  it("elke kring is gesloten: het eind van de ene tak is het begin van de volgende", () => {
    const o = opbouw(preset("combiSerieParallel"));
    for (const k of o.kringen) {
      for (let i = 0; i < k.edges.length; i++) {
        const volgende = k.edges[(i + 1) % k.edges.length];
        expect(k.edges[i].toNode).toBe(volgende.fromNode);
      }
    }
  });

  it("de trein sluit rond: na één kringlengte staat alles weer op dezelfde plek", () => {
    const o = opbouw(preset("parallel"));
    const a = deeltjesOp(o, 37);
    for (const k of o.kringen) {
      const b = deeltjesOp({ ...o, kringen: [k] }, 37 + k.length);
      const c = deeltjesOp({ ...o, kringen: [k] }, 37);
      b.forEach((p, i) => {
        expect(p.x).toBeCloseTo(c[i].x, 6);
        expect(p.y).toBeCloseTo(c[i].y, 6);
      });
    }
    expect(a.length).toBe(o.kringen.reduce((s, k) => s + k.count, 0));
  });

  it("deeltjes staan altijd op een draad van hun kring", () => {
    const o = opbouw(preset("combiParallelSerie"));
    for (const offset of [0, 13.5, 250, 9999]) {
      for (const p of deeltjesOp(o, offset)) {
        const e = p.edge;
        const t = (p.x - e.sx) * e.ux + (p.y - e.sy) * e.uy;
        expect(t).toBeGreaterThanOrEqual(-1e-6);
        expect(t).toBeLessThanOrEqual(e.len + 1e-6);
      }
    }
  });

  it("zelfde schakeling = zelfde signatuur; verslepen = nieuwe signatuur", () => {
    const doc = preset("serie");
    const a = opbouw(doc).signature;
    expect(opbouw(doc).signature).toBe(a);
    const id = Object.keys(doc.vertices)[0];
    const versleept: CircuitDoc = {
      ...doc,
      vertices: {
        ...doc.vertices,
        [id]: { ...doc.vertices[id], x: doc.vertices[id].x + 30 },
      },
    };
    expect(opbouw(versleept).signature).not.toBe(a);
  });

  it("meer stroom geeft dichter op elkaar, maar ook een kleine stroom heeft genoeg deeltjes", () => {
    expect(afstandDrukste(0.01)).toBeGreaterThan(afstandDrukste(0.1));
    expect(afstandDrukste(0.1)).toBeGreaterThan(afstandDrukste(0.5));
    expect(afstandDrukste(0.5)).toBeGreaterThan(afstandDrukste(2));
    // LED-kring (≈ 16 mA): minstens tien deeltjes rond.
    const o = opbouw(preset("led"));
    expect(o.kringen.reduce((s, k) => s + k.count, 0)).toBeGreaterThanOrEqual(
      10,
    );
  });
});
