import { describe, expect, it } from "vitest";

import type { AxisCalibration, ScaleCalibration } from "@/features/calibration/CalibrationState";
import type { TrackedPoint } from "@/features/tracking/TrackingState";

import { buildRows } from "./derive";
import { withAccelerations } from "./graph-types";

/** 100 px = 1 m, oorsprong op (0, 1000), y omhoog — simpele wereld. */
const SCALE: ScaleCalibration = {
  p1: { x: 0, y: 0 },
  p2: { x: 100, y: 0 },
  length: 1,
  unit: "m",
};
const AXES: AxisCalibration = {
  origin: { x: 0, y: 1000 },
  angle: 0,
  xPositiveDirection: "right",
  yPositiveDirection: "up",
};

/** Punt op wereld-(x, y) in meters → pixel. */
function px(x: number, y: number) {
  return { x: x * 100, y: 1000 - y * 100 };
}

describe("buildRows", () => {
  it("t is relatief aan trim-start; punten buiten trim krijgen withinTrim=false", () => {
    const points: TrackedPoint[] = [
      { frame: 10, pixel: px(0, 0) },
      { frame: 40, pixel: px(1, 0) },
      { frame: 70, pixel: px(2, 0) },
    ];
    const rows = buildRows(points, SCALE, AXES, 30, 40, 100);
    expect(rows.map((r) => r.t)).toEqual([-1, 0, 1]);
    expect(rows.map((r) => r.withinTrim)).toEqual([false, true, true]);
  });

  it("eenparige beweging: vx constant via central/forward/backward difference", () => {
    // x = 2t m, frames om de 15 (dt = 0,5 s bij 30 fps).
    const points: TrackedPoint[] = [0, 15, 30, 45].map((frame) => ({
      frame,
      pixel: px(2 * (frame / 30), 0),
    }));
    const rows = buildRows(points, SCALE, AXES, 30, 0, 45);
    for (const r of rows) {
      expect(r.vx).toBeCloseTo(2, 8);
      expect(r.vy).toBeCloseTo(0, 8);
      expect(r.vMag).toBeCloseTo(2, 8);
    }
  });

  it("bij 1 punt geen snelheden; bij 0 punten of fps 0 lege lijst", () => {
    const single = buildRows([{ frame: 0, pixel: px(0, 0) }], SCALE, AXES, 30, 0, 10);
    expect(single).toHaveLength(1);
    expect(single[0].vx).toBeUndefined();
    expect(buildRows([], SCALE, AXES, 30, 0, 10)).toEqual([]);
    expect(buildRows([{ frame: 0, pixel: px(0, 0) }], SCALE, AXES, 0, 0, 10)).toEqual([]);
  });

  it("sorteert ongesorteerde input op frame", () => {
    const rows = buildRows(
      [
        { frame: 30, pixel: px(1, 0) },
        { frame: 0, pixel: px(0, 0) },
      ],
      SCALE,
      AXES,
      30,
      0,
      30,
    );
    expect(rows.map((r) => r.frame)).toEqual([0, 30]);
  });
});

describe("withAccelerations", () => {
  it("vrije val: ay ≈ -9,8 op de binnenste punten", () => {
    // y = -4,9t², elke 3 frames bij 30 fps (dt = 0,1 s).
    const points: TrackedPoint[] = [0, 3, 6, 9, 12, 15].map((frame) => {
      const t = frame / 30;
      return { frame, pixel: px(0, -4.9 * t * t + 9) };
    });
    const rows = withAccelerations(buildRows(points, SCALE, AXES, 30, 0, 15));
    // Randen gebruiken forward/backward en zijn minder betrouwbaar; check de kern.
    for (const r of rows.slice(2, -2)) {
      expect(r.ay).toBeCloseTo(-9.8, 4);
      expect(r.ax).toBeCloseTo(0, 6);
    }
  });

  it("minder dan 3 punten: geen versnellingen", () => {
    const rows = withAccelerations(
      buildRows(
        [
          { frame: 0, pixel: px(0, 0) },
          { frame: 30, pixel: px(1, 0) },
        ],
        SCALE,
        AXES,
        30,
        0,
        30,
      ),
    );
    expect(rows.every((r) => r.ax === undefined)).toBe(true);
  });
});
