import { describe, it, expect } from "vitest";
import { solve } from "../solve";
import type { SimElement } from "../types";

// Kleine bouwhelpers voor leesbare netlists. Knoopsleutels zijn vrije strings;
// componenten die dezelfde sleutel delen, zijn direct verbonden (geen draad nodig).
const src = (id: string, a: string, b: string, emf: number): SimElement => ({
  id,
  type: "source",
  a,
  b,
  emf,
});
const res = (id: string, a: string, b: string, resistance: number): SimElement => ({
  id,
  type: "resistor",
  a,
  b,
  resistance,
});
const lamp = (id: string, a: string, b: string, resistance: number): SimElement => ({
  id,
  type: "lamp",
  a,
  b,
  resistance,
});
const wire = (id: string, a: string, b: string): SimElement => ({ id, type: "wire", a, b });
const amm = (id: string, a: string, b: string): SimElement => ({ id, type: "ammeter", a, b });

describe("solver — referentieschakelingen", () => {
  it("losse weerstand (wet van Ohm): 6 V over 10 Ω → 0,6 A, 3,6 W", () => {
    const r = solve({ elements: [src("V1", "A", "G", 6), res("R1", "A", "G", 10)] });
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(0.6, 6);
    expect(r.elementPowers.get("R1")!).toBeCloseTo(3.6, 6);
    expect(r.elementCurrents.get("V1")!).toBeCloseTo(0.6, 6); // uit de +pool
    expect(r.nodePotentials.get("A")!).toBeCloseTo(6, 6);
    expect(r.nodePotentials.get("G")!).toBeCloseTo(0, 6);
  });

  it("twee gelijke weerstanden in serie: 6 V, 2×10 Ω → 0,3 A, elk 3 V / 0,9 W", () => {
    const r = solve({
      elements: [src("V1", "A", "C", 6), res("R1", "A", "B", 10), res("R2", "B", "C", 10)],
    });
    expect(r.elementCurrents.get("V1")!).toBeCloseTo(0.3, 6);
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(0.3, 6);
    expect(r.elementCurrents.get("R2")!).toBeCloseTo(0.3, 6);
    expect(r.nodePotentials.get("B")!).toBeCloseTo(3, 6); // middenknoop
    expect(r.elementPowers.get("R1")!).toBeCloseTo(0.9, 6);
    expect(r.elementPowers.get("R2")!).toBeCloseTo(0.9, 6);
  });

  it("twee gelijke weerstanden parallel: 6 V, 2×10 Ω → tak 0,6 A, totaal 1,2 A", () => {
    const r = solve({
      elements: [src("V1", "A", "G", 6), res("R1", "A", "G", 10), res("R2", "A", "G", 10)],
    });
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(0.6, 6);
    expect(r.elementCurrents.get("R2")!).toBeCloseTo(0.6, 6);
    expect(r.elementCurrents.get("V1")!).toBeCloseTo(1.2, 6);
  });

  it("spanningsdeler: 6 V, 10 Ω + 20 Ω → 0,2 A, V_uit = 4,0 V", () => {
    const r = solve({
      elements: [src("V1", "A", "G", 6), res("R1", "A", "M", 10), res("R2", "M", "G", 20)],
    });
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(0.2, 6);
    expect(r.nodePotentials.get("M")!).toBeCloseTo(4, 6); // spanning over R2
  });

  it("combi (serie + parallel): 6 V, R1=10 in serie met (R2=20 ∥ R3=20)", () => {
    // R2∥R3 = 10 Ω; totaal 20 Ω → I = 0,3 A; V over de parallel = 3 V; elke tak 0,15 A.
    const r = solve({
      elements: [
        src("V1", "A", "G", 6),
        res("R1", "A", "M", 10),
        res("R2", "M", "G", 20),
        res("R3", "M", "G", 20),
      ],
    });
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(0.3, 6);
    expect(r.nodePotentials.get("M")!).toBeCloseTo(3, 6);
    expect(r.elementCurrents.get("R2")!).toBeCloseTo(0.15, 6);
    expect(r.elementCurrents.get("R3")!).toBeCloseTo(0.15, 6);
  });

  it("draad = weerstandsloos: een tussenknoop via een draad verandert niets", () => {
    // Identiek aan de serie-test, maar R1 en R2 verbonden via een losse draad.
    const r = solve({
      elements: [
        src("V1", "A", "C", 6),
        res("R1", "A", "B1", 10),
        wire("W1", "B1", "B2"),
        res("R2", "B2", "C", 10),
      ],
    });
    expect(r.elementCurrents.get("V1")!).toBeCloseTo(0.3, 6);
    expect(r.nodePotentials.get("B1")!).toBeCloseTo(3, 6);
    expect(r.nodePotentials.get("B2")!).toBeCloseTo(3, 6); // zelfde knoop als B1
  });

  it("lamp = lineaire weerstand met vermogen P = I²R", () => {
    const r = solve({ elements: [src("V1", "A", "G", 6), lamp("L1", "A", "G", 12)] });
    expect(r.elementCurrents.get("L1")!).toBeCloseTo(0.5, 6);
    expect(r.elementPowers.get("L1")!).toBeCloseTo(3, 6); // 0,5² · 12
  });

  it("twee onafhankelijke schakelingen op het canvas worden los opgelost", () => {
    const r = solve({
      elements: [
        src("V1", "A", "G", 6),
        res("R1", "A", "G", 10), // kring 1 → 0,6 A
        src("V2", "X", "Y", 12),
        res("R2", "X", "Y", 24), // kring 2 → 0,5 A
      ],
    });
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(0.6, 6);
    expect(r.elementCurrents.get("R2")!).toBeCloseTo(0.5, 6);
  });

  it("zwevend component (niet in een kring) voert geen stroom", () => {
    const r = solve({
      elements: [
        src("V1", "A", "G", 6),
        res("R1", "A", "G", 10),
        res("R2", "P", "Q", 100), // nergens mee verbonden
      ],
    });
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(0.6, 6);
    expect(r.elementCurrents.get("R2")!).toBeCloseTo(0, 6);
  });

  it("kortsluiting: bron via een draad over de polen wordt geflagd", () => {
    const r = solve({
      elements: [src("V1", "A", "G", 6), wire("W1", "A", "G")],
    });
    expect(r.shortedSources).toContain("V1");
    expect(r.elementCurrents.get("V1")!).toBe(Infinity);
  });

  it("open schakelaar onderbreekt de kring (geen stroom)", () => {
    const r = solve({
      elements: [
        src("V1", "A", "G", 6),
        res("R1", "A", "B", 10),
        { id: "S1", type: "switch", a: "B", b: "G", closed: false },
      ],
    });
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(0, 6);
  });

  it("gesloten schakelaar = weerstandsloze draad → kring rond", () => {
    const r = solve({
      elements: [
        src("V1", "A", "G", 6),
        res("R1", "A", "B", 10),
        { id: "S1", type: "switch", a: "B", b: "G", closed: true },
      ],
    });
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(0.6, 6);
  });
});

describe("solver — parallelle bronnen", () => {
  it("twee gelijke bronnen parallel + belasting: belasting 0,6 A, elke bron 0,3 A", () => {
    const r = solve({
      elements: [
        src("V1", "A", "G", 6),
        src("V2", "A", "G", 6),
        res("R1", "A", "G", 10),
      ],
    });
    expect(r.conflicts).toHaveLength(0);
    expect(r.ok).toBe(true);
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(0.6, 6);
    expect(r.elementCurrents.get("V1")!).toBeCloseTo(0.3, 6);
    expect(r.elementCurrents.get("V2")!).toBeCloseTo(0.3, 6);
  });

  it("twee gelijke bronnen parallel zonder belasting: geen stroom, geen conflict", () => {
    const r = solve({ elements: [src("V1", "A", "G", 6), src("V2", "A", "G", 6)] });
    expect(r.conflicts).toHaveLength(0);
    expect(r.elementCurrents.get("V1")!).toBeCloseTo(0, 6);
    expect(r.nodePotentials.get("A")!).toBeCloseTo(6, 6);
  });

  it("twee ongelijke bronnen parallel: gemarkeerd als conflict", () => {
    const r = solve({
      elements: [
        src("V1", "A", "G", 6),
        src("V2", "A", "G", 9),
        res("R1", "A", "G", 10),
      ],
    });
    expect(r.conflicts).toContain("V1");
    expect(r.conflicts).toContain("V2");
  });
});

describe("solver — ideale ampèremeter (0 V-sense)", () => {
  it("ampèremeter in serie leest de kringstroom (0,6 A) en beïnvloedt niets", () => {
    // 6 V over 10 Ω met een ampèremeter (0 Ω) in serie → 0,6 A.
    const r = solve({
      elements: [src("V1", "A", "G", 6), res("R1", "A", "M", 10), amm("M1", "M", "G")],
    });
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(0.6, 6);
    expect(Math.abs(r.elementCurrents.get("M1")!)).toBeCloseTo(0.6, 6); // teken = oriëntatie
    expect(r.shortedSources).toHaveLength(0); // 0 V-sense mag geen "kortsluiting" zijn
  });
});
