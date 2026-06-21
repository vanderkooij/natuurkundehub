import { describe, it, expect } from "vitest";
import { splitValueUnit, checkParens, validateSyntax, parseLine } from "./parse";

describe("splitValueUnit", () => {
  it("splitst eenheid alleen af als die geen formule-voortzetting is", () => {
    expect(splitValueUnit("1,5*10^-3")).toEqual({ value: "1,5*10^-3", unit: "" });
    expect(splitValueUnit("9,81 m/s^2")).toEqual({ value: "9,81", unit: "m/s^2" });
    expect(splitValueUnit("998 kg/m^3")).toEqual({ value: "998", unit: "kg/m^3" });
    expect(splitValueUnit("Vtot-(mwater/rho)")).toEqual({ value: "Vtot-(mwater/rho)", unit: "" });
    expect(splitValueUnit("Vtot - (mwater/rho)")).toEqual({ value: "Vtot - (mwater/rho)", unit: "" });
    expect(splitValueUnit("0 s")).toEqual({ value: "0", unit: "s" });
    expect(splitValueUnit("0.8")).toEqual({ value: "0.8", unit: "" });
  });
});

describe("checkParens", () => {
  it("controleert haakjesbalans", () => {
    expect(checkParens("a*(b+c)")).toBe(true);
    expect(checkParens("a*(b+c")).toBe(false);
    expect(checkParens("sqrt(x))")).toBe(false);
  });
});

describe("validateSyntax", () => {
  it("vlagt als-zonder-dan, ongebalanceerde haakjes en ontbrekend =", () => {
    expect(validateSyntax(["v = v + a*dt", "t = t + dt"])).toEqual([]);
    expect(validateSyntax(["als x > 0 v = 0"])).toEqual([1]); // geen dan
    expect(validateSyntax(["x = (a+b"])).toEqual([1]); // haakjes
    expect(validateSyntax(["zomaar tekst"])).toEqual([1]); // geen =
    expect(validateSyntax(["// commentaar", "' ook", "STOP"])).toEqual([]);
  });
});

describe("parseLine", () => {
  it("gewone toewijzing", () => {
    expect(parseLine("x = a + 1", { a: 4 }, 1)).toEqual({ assign: { x: 5 } });
  });

  it("commentaar en STOP", () => {
    expect(parseLine("// hoi", {}, 1)).toEqual({ skip: true });
    expect(parseLine("STOP", {}, 1)).toEqual({ stop: true });
  });

  it("voorwaarde waar / onwaar / stop", () => {
    expect(parseLine("als x > 0 dan y = 1", { x: 5, y: 0 }, 1)).toEqual({ assign: { y: 1 } });
    expect(parseLine("als x > 0 dan y = 1", { x: -5, y: 0 }, 1)).toEqual({});
    expect(parseLine("als x <= 0 dan STOP", { x: -1 }, 1)).toEqual({ stop: true });
  });

  it("foutpaden", () => {
    expect(parseLine("x = a + 1", {}, 3).error).toMatch(/variabele 'a' is niet gedefinieerd/);
    expect(parseLine("x = 1/0", {}, 2).error).toMatch(/oneindig/);
    expect(parseLine("als x > 0 y = 1", { x: 1 }, 1).error).toMatch(/als zonder dan/);
    expect(parseLine("x = (a+b", { a: 1, b: 2 }, 1).error).toMatch(/haakjes/);
  });
});
