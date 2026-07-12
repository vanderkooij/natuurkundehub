import { describe, it, expect } from "vitest";
import { parseExpr } from "./expr";
import { toDecimalPoint } from "./decimal";

describe("toDecimalPoint", () => {
  it("zet cijfer-komma-cijfer om, laat functie-komma's met rust", () => {
    expect(toDecimalPoint("9,8")).toBe("9.8");
    expect(toDecimalPoint("-0,8")).toBe("-0.8");
    expect(toDecimalPoint("6,67e-11")).toBe("6.67e-11");
    expect(toDecimalPoint("min(a,b)")).toBe("min(a,b)");
  });
});

describe("parseExpr — notaties (beide vormen accepteren)", () => {
  const V = { d: 0.01, x: 9, r: 2, v: 3, a: 16 };

  it("komma == punt", () => {
    expect(parseExpr("9,8", {})).toBe(parseExpr("9.8", {}));
    expect(parseExpr("9,8", {})).toBeCloseTo(9.8, 12);
  });

  it("wortel == sqrt == √ (ook hoofdletter en zonder haakjes)", () => {
    expect(parseExpr("sqrt(16)", {})).toBe(4);
    expect(parseExpr("wortel(16)", {})).toBe(4);
    expect(parseExpr("Wortel(a)", V)).toBe(4);
    expect(parseExpr("√16", {})).toBe(4);
    expect(parseExpr("√(x+7)", V)).toBe(4);
    expect(parseExpr("√a", V)).toBe(4);
  });

  it("pi / π / PI (regressie tegen Math.Math.PI-bug)", () => {
    expect(parseExpr("pi", {})).toBeCloseTo(Math.PI, 12);
    expect(parseExpr("π", {})).toBeCloseTo(Math.PI, 12);
    expect(parseExpr("PI", {})).toBeCloseTo(Math.PI, 12);
    expect(parseExpr("2*pi", {})).toBeCloseTo(2 * Math.PI, 12);
    expect(parseExpr("0.25*pi*d^2", { d: 0.01 })).toBeCloseTo(0.25 * Math.PI * 0.0001, 18);
  });

  it("maaltekens × en ·", () => {
    expect(parseExpr("2×3", {})).toBe(6);
    expect(parseExpr("2·3", {})).toBe(6);
  });

  it("superscript ² en ³", () => {
    expect(parseExpr("d²", { d: 0.01 })).toBeCloseTo(0.0001, 18);
    expect(parseExpr("r³", { r: 2 })).toBe(8);
    expect(parseExpr("0,25*π*d²", { d: 0.01 })).toBeCloseTo(0.25 * Math.PI * 0.0001, 18);
  });

  it("log = log10, ln = natuurlijk, exp", () => {
    expect(parseExpr("log(1000)", {})).toBeCloseTo(3, 12);
    expect(parseExpr("ln(1)", {})).toBe(0);
    expect(parseExpr("exp(0)", {})).toBe(1);
  });

  it("wetenschappelijke notatie: e, *10^ en ×10²", () => {
    expect(parseExpr("6.67e-11", {})).toBeCloseTo(6.67e-11, 20);
    expect(parseExpr("1,5*10^-3", {})).toBeCloseTo(0.0015, 12);
    expect(parseExpr("1,5×10²", {})).toBeCloseTo(150, 10);
  });

  it("substitueert langere variabelenamen vóór kortere", () => {
    // 'Vtot' mag niet deels door 'V' worden vervangen
    expect(parseExpr("Vtot - V", { V: 1, Vtot: 5 })).toBe(4);
  });
});

describe("parseExpr — machtsverheffing (regressie tegen XOR-bug)", () => {
  it("haakjes als grondtal of exponent", () => {
    expect(parseExpr("(a+b)^2", { a: 1, b: 2 })).toBe(9);
    expect(parseExpr("(x+1)^2", { x: 2 })).toBe(9);
    expect(parseExpr("2^(1+2)", {})).toBe(8);
  });

  it("negatieve exponent (was stil XOR: 10^-3 → -9)", () => {
    expect(parseExpr("10^-3", {})).toBeCloseTo(0.001, 12);
    expect(parseExpr("2^-2", {})).toBe(0.25);
  });

  it("rechts-associatief en unaire min bindt zwakker dan ^", () => {
    expect(parseExpr("2^3^2", {})).toBe(512); // 2^(3^2)
    expect(parseExpr("-2^2", {})).toBe(-4); // -(2^2)
    expect(parseExpr("v^2", { v: 3 })).toBe(9);
    expect(parseExpr("x^0.5", { x: 9 })).toBe(3);
  });
});

describe("parseExpr — condities en foutpaden", () => {
  it("vergelijkingen en logische operatoren", () => {
    expect(parseExpr("3 <= 4", {})).toBe(1);
    expect(parseExpr("h <= 0", { h: 5 })).toBe(0);
    expect(parseExpr("x > 0 && v < 0", { x: 1, v: -1 })).toBe(1);
    expect(parseExpr("x > 0 || v < 0", { x: -1, v: 1 })).toBe(0);
  });

  it("onbekende variabele geeft een duidelijke fout (ook 'e')", () => {
    expect(() => parseExpr("q + 1", {})).toThrow(/q is not defined/);
    // regressie: 'e' lekte voorheen de interne eval-scope
    expect(() => parseExpr("e", {})).toThrow(/e is not defined/);
  });

  it("geen code-uitvoering: alleen bekende functies en variabelen", () => {
    expect(() => parseExpr("alert(1)", {})).toThrow(/alert is not defined/);
    expect(() => parseExpr("window.location", {})).toThrow();
    expect(() => parseExpr("fetch('x')", {})).toThrow();
  });

  it("syntaxfouten worden gemeld i.p.v. stil verkeerd", () => {
    expect(() => parseExpr("2 +", {})).toThrow();
    expect(() => parseExpr("2 & 3", {})).toThrow();
    expect(() => parseExpr("sqrt(4", {})).toThrow(/haakje/);
  });
});
