import { describe, expect, it } from "vitest";

import {
  evalFit,
  evalFitDerivative,
  evalFitSecondDerivative,
  fitByType,
  fitLinear,
  fitQuadratic,
  fitSine,
} from "./fit";

describe("fitLinear", () => {
  it("vindt exacte coëfficiënten voor perfecte lijn (y = 2t + 3)", () => {
    const fit = fitLinear([
      { t: 0, y: 3 },
      { t: 1, y: 5 },
      { t: 2, y: 7 },
      { t: 3, y: 9 },
    ]);
    expect(fit).not.toBeNull();
    expect(fit!.coefficients[0]).toBeCloseTo(2, 10);
    expect(fit!.coefficients[1]).toBeCloseTo(3, 10);
    expect(fit!.rSquared).toBeCloseTo(1, 10);
    expect(fit!.tMin).toBe(0);
    expect(fit!.tMax).toBe(3);
  });

  it("weigert identieke t-waardes en < 2 punten", () => {
    expect(fitLinear([{ t: 1, y: 2 }])).toBeNull();
    expect(
      fitLinear([
        { t: 1, y: 2 },
        { t: 1, y: 4 },
      ]),
    ).toBeNull();
  });

  it("accepteert dicht opeen liggende t's (120 fps — regressie relatieve drempel)", () => {
    const dt = 1 / 120;
    const fit = fitLinear([
      { t: 0, y: 0 },
      { t: dt, y: 2 * dt },
      { t: 2 * dt, y: 4 * dt },
    ]);
    expect(fit).not.toBeNull();
    expect(fit!.coefficients[0]).toBeCloseTo(2, 6);
  });
});

describe("fitQuadratic", () => {
  it("vindt exacte coëfficiënten voor y = -4,9t² + 5t + 1", () => {
    const f = (t: number) => -4.9 * t * t + 5 * t + 1;
    const fit = fitQuadratic([0, 1, 2, 3, 4].map((t) => ({ t, y: f(t) })));
    expect(fit).not.toBeNull();
    expect(fit!.coefficients[0]).toBeCloseTo(-4.9, 8);
    expect(fit!.coefficients[1]).toBeCloseTo(5, 8);
    expect(fit!.coefficients[2]).toBeCloseTo(1, 8);
    expect(fit!.rSquared).toBeCloseTo(1, 10);
  });

  it("afgeleiden: v = -9,8t + 5 en a = -9,8", () => {
    const f = (t: number) => -4.9 * t * t + 5 * t + 1;
    const fit = fitQuadratic([0, 0.5, 1, 1.5, 2].map((t) => ({ t, y: f(t) })))!;
    expect(evalFit(fit, 1)).toBeCloseTo(f(1), 8);
    expect(evalFitDerivative(fit, 1)).toBeCloseTo(-9.8 * 1 + 5, 8);
    expect(evalFitSecondDerivative(fit, 0.3)).toBeCloseTo(-9.8, 8);
  });

  it("accepteert 3 punten vlak bijeen bij 120 fps (regressie: absolute det-drempel keurde dit af)", () => {
    const dt = 1 / 120;
    const f = (t: number) => -4.9 * t * t + 2 * t;
    const fit = fitQuadratic([0, dt, 2 * dt].map((t) => ({ t, y: f(t) })));
    expect(fit).not.toBeNull();
    expect(fit!.coefficients[0]).toBeCloseTo(-4.9, 3);
  });

  it("weigert < 3 punten en collineaire t's", () => {
    expect(
      fitQuadratic([
        { t: 0, y: 1 },
        { t: 1, y: 2 },
      ]),
    ).toBeNull();
    expect(
      fitQuadratic([
        { t: 1, y: 1 },
        { t: 1, y: 2 },
        { t: 1, y: 3 },
      ]),
    ).toBeNull();
  });
});

describe("fitSine", () => {
  it("herkent een zuivere sinus (A=1, ω=2π, φ=0, C=0)", () => {
    const pts = Array.from({ length: 50 }, (_, i) => ({
      t: i / 49,
      y: Math.sin(2 * Math.PI * (i / 49)),
    }));
    const fit = fitSine(pts);
    expect(fit).not.toBeNull();
    const [A, omega, , C] = fit!.coefficients;
    expect(A).toBeCloseTo(1, 2);
    expect(omega).toBeCloseTo(2 * Math.PI, 1);
    expect(C).toBeCloseTo(0, 2);
    expect(fit!.rSquared).toBeGreaterThan(0.99);
  });

  it("geeft null bij ruis zonder periodiek signaal (R² < 0,5)", () => {
    // Deterministische hash-ruis zonder dominante frequentie.
    const noise = (i: number) => {
      const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      return s - Math.floor(s) - 0.5;
    };
    const pts = Array.from({ length: 40 }, (_, i) => ({ t: i / 10, y: noise(i) }));
    expect(fitSine(pts)).toBeNull();
  });

  it("geeft null bij te weinig punten", () => {
    expect(
      fitSine([
        { t: 0, y: 0 },
        { t: 1, y: 1 },
        { t: 2, y: 0 },
      ]),
    ).toBeNull();
  });
});

describe("fitByType", () => {
  it("routeert per type en geeft null voor 'none'", () => {
    const pts = [
      { t: 0, y: 3 },
      { t: 1, y: 5 },
      { t: 2, y: 7 },
    ];
    expect(fitByType("none", pts)).toBeNull();
    expect(fitByType("linear", pts)?.type).toBe("linear");
    expect(fitByType("quadratic", pts)?.type).toBe("quadratic");
  });
});
