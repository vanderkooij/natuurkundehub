import {
  type AxisCalibration,
  type ScaleCalibration,
} from "@/features/calibration/CalibrationState";
import { pixelToWorld } from "@/features/calibration/coords";
import { type TrackedPoint } from "@/features/tracking/TrackingState";

/**
 * Een rij in de meet-tabel. Snelheidsvelden zijn optioneel zodat we ook met
 * 1 punt netjes kunnen renderen.
 *
 * Latere uitbreiding (versnellingen in prompt 05) voegt extra optionele
 * velden toe; bestaande consumenten blijven werken.
 */
export interface MeasurementRow {
  frame: number;
  /** Seconden, relatief aan `trimStart`. Eerste in-trim meting valt op t = 0. */
  t: number;
  /** Wereld-x in scale.unit. */
  x: number;
  /** Wereld-y in scale.unit. */
  y: number;
  /** unit/s, central difference; forward/backward aan de randen. */
  vx?: number;
  vy?: number;
  /** |v| = √(vx² + vy²). */
  vMag?: number;
  /** `false` als het frame buiten de trim-range valt. */
  withinTrim: boolean;
}

/**
 * Pure functie: gegeven (gesorteerde of ongesorteerde) tracked points, scale,
 * axes, fps en trim-range — produceer rijen met wereldcoördinaten en numerieke
 * snelheden.
 *
 * Bij minder dan 2 rijen blijven snelheidsvelden `undefined`. Bij precies 2
 * rijen wordt aan beide kanten forward/backward gebruikt (= zelfde resultaat).
 */
export function buildRows(
  points: TrackedPoint[],
  scale: ScaleCalibration,
  axes: AxisCalibration,
  fps: number,
  trimStart: number,
  trimEnd: number,
): MeasurementRow[] {
  if (points.length === 0 || fps <= 0) return [];

  // Defensieve sort — TrackingState houdt al sorted, maar dat hoeft `buildRows`
  // niet aan te nemen.
  const sorted = [...points].sort((a, b) => a.frame - b.frame);

  // Basis-rijen met positie + t. Snelheden komen in een tweede pass.
  const base = sorted.map((pt): MeasurementRow => {
    const world = pixelToWorld(pt.pixel, scale, axes);
    return {
      frame: pt.frame,
      t: (pt.frame - trimStart) / fps,
      x: world.x,
      y: world.y,
      withinTrim: pt.frame >= trimStart && pt.frame <= trimEnd,
    };
  });

  if (base.length < 2) return base;

  // Snelheden: central difference in het midden, forward/backward aan de randen.
  // We berekenen ze altijd, ook voor punten buiten trim — de tabel beslist
  // zelf of die rijen klikbaar zijn. Differentiatie over een frame dat
  // ontbreekt (gat in de meetreeks) gebruikt simpelweg het volgende getrackt
  // frame, conform de mockup van de meetreeks-tabel.
  const n = base.length;
  for (let i = 0; i < n; i += 1) {
    let prev: MeasurementRow;
    let next: MeasurementRow;
    if (i === 0) {
      prev = base[0];
      next = base[1];
    } else if (i === n - 1) {
      prev = base[n - 2];
      next = base[n - 1];
    } else {
      prev = base[i - 1];
      next = base[i + 1];
    }
    const dt = next.t - prev.t;
    if (dt <= 0 || !Number.isFinite(dt)) continue; // duplicaat-frame, sla over
    const vx = (next.x - prev.x) / dt;
    const vy = (next.y - prev.y) / dt;
    base[i].vx = vx;
    base[i].vy = vy;
    base[i].vMag = Math.hypot(vx, vy);
  }

  return base;
}
