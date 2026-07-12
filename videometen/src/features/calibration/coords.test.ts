import { describe, expect, it } from "vitest";

import { pixelToWorld } from "./coords";
import type { AxisCalibration, ScaleCalibration } from "./CalibrationState";

/** Schaal: 100 px = 1 m. */
const SCALE_1M_PER_100PX: ScaleCalibration = {
  p1: { x: 0, y: 0 },
  p2: { x: 100, y: 0 },
  length: 1,
  unit: "m",
};

function axes(overrides: Partial<AxisCalibration> = {}): AxisCalibration {
  return {
    origin: { x: 500, y: 500 },
    angle: 0,
    xPositiveDirection: "right",
    yPositiveDirection: "up",
    ...overrides,
  };
}

describe("pixelToWorld", () => {
  it("angle 0: 100 px rechts + 100 px omhoog (scherm) → (+1, +1) m", () => {
    // Scherm-y groeit omlaag: 100 px 'omhoog' = origin.y - 100.
    const w = pixelToWorld({ x: 600, y: 400 }, SCALE_1M_PER_100PX, axes());
    expect(w.x).toBeCloseTo(1, 10);
    expect(w.y).toBeCloseTo(1, 10);
  });

  it("angle π/2: klik recht boven de oorsprong → (+x, 0)", () => {
    const w = pixelToWorld({ x: 500, y: 400 }, SCALE_1M_PER_100PX, axes({ angle: Math.PI / 2 }));
    expect(w.x).toBeCloseTo(1, 10);
    expect(w.y).toBeCloseTo(0, 10);
  });

  it("richting-flips keren alleen het teken om", () => {
    const p = { x: 600, y: 400 }; // (+1, +1) bij defaults
    const flipX = pixelToWorld(p, SCALE_1M_PER_100PX, axes({ xPositiveDirection: "left" }));
    expect(flipX.x).toBeCloseTo(-1, 10);
    expect(flipX.y).toBeCloseTo(1, 10);
    const flipY = pixelToWorld(p, SCALE_1M_PER_100PX, axes({ yPositiveDirection: "down" }));
    expect(flipY.x).toBeCloseTo(1, 10);
    expect(flipY.y).toBeCloseTo(-1, 10);
  });

  it("schaal-eenheid werkt door in de uitkomst (50 cm over 100 px)", () => {
    const scale: ScaleCalibration = { ...SCALE_1M_PER_100PX, length: 50, unit: "cm" };
    const w = pixelToWorld({ x: 700, y: 500 }, scale, axes());
    // 200 px rechts × (50 cm / 100 px) = 100 cm.
    expect(w.x).toBeCloseTo(100, 10);
    expect(w.y).toBeCloseTo(0, 10);
  });

  it("gedegenereerde schaal (p1 == p2) → NaN in plaats van Infinity", () => {
    const broken: ScaleCalibration = {
      p1: { x: 10, y: 10 },
      p2: { x: 10, y: 10 },
      length: 1,
      unit: "m",
    };
    const w = pixelToWorld({ x: 600, y: 400 }, broken, axes());
    expect(Number.isNaN(w.x)).toBe(true);
    expect(Number.isNaN(w.y)).toBe(true);
  });

  it("rotatie + translatie samen: punt op de gekantelde +x-as heeft y ≈ 0", () => {
    const angle = Math.PI / 6; // 30°
    // Schermrichting van +x bij hoek a is (cos a, −sin a).
    const p = {
      x: 500 + 100 * Math.cos(angle),
      y: 500 - 100 * Math.sin(angle),
    };
    const w = pixelToWorld(p, SCALE_1M_PER_100PX, axes({ angle }));
    expect(w.x).toBeCloseTo(1, 10);
    expect(w.y).toBeCloseTo(0, 10);
  });
});
