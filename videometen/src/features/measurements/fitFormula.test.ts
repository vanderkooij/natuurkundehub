import { describe, expect, it } from "vitest";

import type { Fit1D } from "@/_reusable/fit";

import { formatFitFormula, formatFitFormulaTokens } from "./fitFormula";

const base = { rSquared: 1, tMin: 0, tMax: 1 };

describe("rekenruis in fit-coëfficiënten", () => {
  it("toont een verwaarloosbaar kleine coëfficiënt als 0", () => {
    const fit: Fit1D = { ...base, type: "linear", coefficients: [3.53, -2.96e-16] };
    expect(formatFitFormula(fit, 0, "x")).toBe("x(t) = 3,53 · t + 0");
    const tokens = formatFitFormulaTokens(fit, 0, "x", "x", "m");
    expect(tokens.map((t) => t.text).join("")).toBe("x(t) = 3,53 · t + 0");
  });

  it("laat kleine maar echte coëfficiënten staan", () => {
    const fit: Fit1D = { ...base, type: "quadratic", coefficients: [-4.92, 0.00576, 1.23] };
    expect(formatFitFormula(fit, 0, "y")).toBe("y(t) = −4,92 · t² + 0,00576 · t + 1,23");
  });
});
