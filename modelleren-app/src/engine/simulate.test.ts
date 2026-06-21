import { describe, it, expect } from "vitest";
import { simulate, type SimResult } from "./simulate";
import { EXAMPLES } from "./examples";

function run(name: string): SimResult {
  const ex = EXAMPLES.find((e) => e.name === name);
  if (!ex) throw new Error("voorbeeld niet gevonden: " + name);
  return simulate(ex.sv, ex.model.split("\n"), ex.iter);
}
function last(r: SimResult): Record<string, number> {
  return r.data[r.data.length - 1];
}
/** Relatieve tolerantie — golden waarden zijn deterministisch maar we laten ruimte voor FP. */
const rel = (a: number, b: number) => Math.abs(a - b) <= Math.abs(b) * 1e-6 + 1e-9;

describe("simulate — formule-startwaarden", () => {
  it("berekent een startformule eenmalig met eerder gedefinieerde variabelen", () => {
    const sv = [
      { name: "rho", value: "998", unit: "kg/m^3" },
      { name: "mwater", value: "0,5", unit: "kg" },
      { name: "Vtot", value: "1,5*10^-3", unit: "m^3" },
      { name: "Vlucht", value: "Vtot-(mwater/rho)", unit: "m^3" },
      { name: "t", value: "0", unit: "s" },
      { name: "dt", value: "0,1", unit: "s" },
    ];
    const r = simulate(sv, ["t = t + dt"], 3);
    expect(r.error).toBeNull();
    expect(r.data[0].Vlucht).toBeCloseTo(0.0015 - 0.5 / 998, 12);
    expect(r.data[0].Vtot).toBeCloseTo(0.0015, 12);
  });

  it("vooruitverwijzing geeft een svError (geen misleidend getal)", () => {
    const sv = [
      { name: "X", value: "2*Y+1", unit: "" },
      { name: "dt", value: "0.1", unit: "s" },
    ];
    const r = simulate(sv, ["t = t + dt"], 3);
    expect(r.svErrors).toContain("X");
    expect(r.error).toMatch(/kon niet berekend worden/);
  });
});

describe("simulate — foutpaden", () => {
  it("ontbrekende dt geeft een fout", () => {
    const r = simulate([{ name: "x", value: "0", unit: "" }], ["x = x + 1"], 10);
    expect(r.error).toMatch(/dt/);
  });
});

// Golden runs — bevroren tegen de huidige vanilla-uitkomsten (gemeten juni 2026).
describe("simulate — golden runs (gedrag bevriezen)", () => {
  it("Constante snelheid", () => {
    const r = run("Constante snelheid");
    expect(r.data.length).toBe(1000);
    expect(rel(last(r).x, 999)).toBe(true);
    expect(last(r).v).toBe(10);
  });

  it("Vrije val (STOP na 45)", () => {
    const r = run("Vrije val");
    expect(r.data.length).toBe(45);
    expect(r.stopped).toBe(true);
    expect(rel(last(r).t, 4.4)).toBe(true);
    expect(rel(last(r).v, 43.119999999999976)).toBe(true);
    expect(rel(last(r).h, 2.979999999999994)).toBe(true);
  });

  it("Val met luchtweerstand (STOP na 257)", () => {
    const r = run("Val met luchtweerstand");
    expect(r.data.length).toBe(257);
    expect(r.stopped).toBe(true);
    expect(rel(last(r).v, 44.27104273282065)).toBe(true);
  });

  it("Stuiterende bal", () => {
    const r = run("Stuiterende bal");
    expect(r.data.length).toBe(2000);
    expect(rel(last(r).x, 0.0033997803633431726)).toBe(true);
    expect(rel(last(r).v, 0.19599999999999587)).toBe(true);
  });

  it("Bungee jumper", () => {
    const r = run("Bungee jumper");
    expect(r.data.length).toBe(3000);
    expect(rel(last(r).h, 28.195138036871345)).toBe(true);
  });

  it("RC-circuit", () => {
    const r = run("RC-circuit opladen en ontladen");
    expect(r.data.length).toBe(8000);
    expect(rel(last(r).U, 0.032000586755813396)).toBe(true);
  });

  it("Radioactief verval", () => {
    const r = run("Radioactief verval");
    expect(r.data.length).toBe(1000);
    expect(rel(last(r).N, 500300182723731850000)).toBe(true);
  });

  it("Harmonische oscillator", () => {
    const r = run("Harmonische oscillator");
    expect(r.data.length).toBe(2000);
    expect(rel(last(r).x, 0.9209720922300619)).toBe(true);
    expect(rel(last(r).v, -1.1869252504724228)).toBe(true);
  });

  it("Planetenbaan", () => {
    const r = run("Planetenbaan");
    expect(r.data.length).toBe(10000);
    expect(rel(last(r).x, 93432602273.12904)).toBe(true);
    expect(rel(last(r).y, 117106032520.54729)).toBe(true);
    expect(rel(last(r).r, 149811703385.13712)).toBe(true);
  });
});
