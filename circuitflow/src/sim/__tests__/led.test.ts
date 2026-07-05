import { describe, it, expect } from "vitest";
import { solve } from "../solve";
import type { SimElement } from "../types";

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
const led = (id: string, a: string, b: string, vf: number, burned = false): SimElement => ({
  id,
  type: "led",
  a, // anode
  b, // kathode
  vf,
  burned,
});

describe("solver — LED (niet-lineaire diode)", () => {
  it("voorwaarts met voorschakelweerstand: 6 V, 220 Ω, Vf=2 → ~18 mA", () => {
    // Bron A(+)→G, weerstand A→M, LED anode M → kathode G.
    const r = solve({
      elements: [src("V1", "A", "G", 6), res("R1", "A", "M", 220), led("D1", "M", "G", 2)],
    });
    expect(r.ok).toBe(true);
    const i = r.elementCurrents.get("D1")!;
    expect(i).toBeCloseTo(0.0182, 3); // ≈ 18 mA (exponentiële diode)
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(i, 6); // serie: zelfde stroom
    // Spanning over de LED ligt rond Vf (de spanning bij de nominale stroom).
    expect(r.nodePotentials.get("M")!).toBeCloseTo(2, 1);
  });

  it("achterwaarts (verkeerd om) → spert, geen stroom", () => {
    // Zelfde lus, maar LED omgekeerd: anode G → kathode M ⇒ M→G is sperrichting.
    const r = solve({
      elements: [src("V1", "A", "G", 6), res("R1", "A", "M", 220), led("D1", "G", "M", 2)],
    });
    expect(r.ok).toBe(true);
    expect(r.elementCurrents.get("D1")!).toBeCloseTo(0, 6);
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(0, 6);
  });

  it("bron lager dan de drempel → LED blijft nagenoeg uit", () => {
    const r = solve({
      elements: [src("V1", "A", "G", 1.5), res("R1", "A", "M", 100), led("D1", "M", "G", 2)],
    });
    // Onder Vf: alleen verwaarloosbare sub-drempelstroom (≪ 1 mA).
    expect(r.elementCurrents.get("D1")!).toBeLessThan(1e-3);
  });

  it("rechtstreeks op een ideale bron → stroom ver boven de doorbrandgrens", () => {
    // Geen voorschakelweerstand: dit is de les (LED brandt door).
    const r = solve({ elements: [src("V1", "A", "G", 6), led("D1", "A", "G", 2)] });
    const i = r.elementCurrents.get("D1")!;
    // Zonder voorschakelweerstand op een ideale bron loopt de exponentiële stroom
    // op hol (ver boven de doorbrandgrens) → de LED brandt door.
    expect(i).toBeGreaterThan(1);
  });

  it("doorgebrande LED = permanent open (geen stroom, ook voorwaarts)", () => {
    const r = solve({
      elements: [src("V1", "A", "G", 6), res("R1", "A", "M", 220), led("D1", "M", "G", 2, true)],
    });
    expect(r.elementCurrents.get("D1")!).toBeCloseTo(0, 6);
    expect(r.elementCurrents.get("R1")!).toBeCloseTo(0, 6);
  });

  it("twee kleuren parallel op één weerstand → alleen de laagste-Vf brandt (klemt de spanning)", () => {
    // 6 V → R 270 → knoop M; rood (1,8) en blauw (3,0) beide van M naar G.
    // Rood geleidt eerst en klemt V_M ≈ 1,8 V < 3,0 → blauw blijft uit.
    const r = solve({
      elements: [
        src("V", "A", "G", 6),
        res("R", "A", "M", 270),
        led("Drood", "M", "G", 1.8),
        led("Dblauw", "M", "G", 3.0),
      ],
    });
    expect(r.elementCurrents.get("Drood")!).toBeCloseTo(0.0156, 3); // ≈ 15,6 mA
    expect(r.elementCurrents.get("Dblauw")!).toBeLessThan(1e-3); // nagenoeg uit
  });

  it("twee kleuren parallel met elk een eigen weerstand → beide branden", () => {
    const r = solve({
      elements: [
        src("V", "A", "G", 6),
        res("R1", "A", "M1", 270),
        led("Drood", "M1", "G", 1.8),
        res("R2", "A", "M2", 150),
        led("Dblauw", "M2", "G", 3.0),
      ],
    });
    expect(r.elementCurrents.get("Drood")!).toBeCloseTo(0.0156, 3); // ≈ 15,6 mA
    expect(r.elementCurrents.get("Dblauw")!).toBeGreaterThan(0.017); // beide branden (≈ 20 mA)
  });

  it("niet-ohmse lamp: bij U_ref (6 V) geldt de ingestelde R; daaronder lagere R → meer stroom", () => {
    // 6 V direct op de gloeidraadlamp: R = Rset → I = 1 A (zelfde als ohms).
    const full = solve({
      elements: [
        src("V", "A", "G", 6),
        { id: "L", type: "lamp", a: "A", b: "G", resistance: 6, nonOhmic: true },
      ],
    });
    expect(full.elementCurrents.get("L")!).toBeCloseTo(1, 3);

    // Twee gloeidraadlampen in serie: elk 3 V → R = 6·(0,25+0,75·0,5) = 3,75 Ω
    // → I = 6/7,5 = 0,8 A (méér dan de 0,5 A van het ohmse geval).
    const serie = solve({
      elements: [
        src("V", "A", "G", 6),
        { id: "L1", type: "lamp", a: "A", b: "M", resistance: 6, nonOhmic: true },
        { id: "L2", type: "lamp", a: "M", b: "G", resistance: 6, nonOhmic: true },
      ],
    });
    expect(serie.elementCurrents.get("L1")!).toBeCloseTo(0.8, 3);
    expect(serie.nodePotentials.get("M")!).toBeCloseTo(3, 3);
  });

  it("hogere Vf (bv. blauw) trekt minder stroom dan lagere Vf (rood) bij gelijke R", () => {
    const rRed = solve({
      elements: [src("V", "A", "G", 6), res("R", "A", "M", 220), led("D", "M", "G", 1.8)],
    });
    const rBlue = solve({
      elements: [src("V", "A", "G", 6), res("R", "A", "M", 220), led("D", "M", "G", 3.0)],
    });
    expect(rRed.elementCurrents.get("D")!).toBeGreaterThan(rBlue.elementCurrents.get("D")!);
  });
});
