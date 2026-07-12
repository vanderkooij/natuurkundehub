/**
 * @reusable
 * @category data
 * @description Pixel → wereldcoördinaten transformatie voor meet-tools met
 *   scale (twee punten + lengte/eenheid), origin en angle (radialen, physics
 *   convention: positief = tegen de klok in, met y-omhoog).
 *
 *   De transformatie wordt afgeleid bij rendering — onderliggende pixel-data
 *   blijft puur. Wijziging van scale/origin/angle vereist dus geen herrekenen
 *   van bron-data.
 */
import {
  pixelDistance,
  type AxisCalibration,
  type Pixel,
  type ScaleCalibration,
} from "@/features/calibration/CalibrationState";

export interface WorldPoint {
  /** Wereld-x in de scale-unit (m | cm | mm). */
  x: number;
  /** Wereld-y in de scale-unit. */
  y: number;
}

/**
 * Volgorde van transformaties:
 *  1. Translate naar origin (in pixel-coords, y groeit nog naar beneden).
 *  2. Flip y zodat we in physics-convention zitten (y omhoog).
 *  3. Rotate met `-angle` zodat de gebruiker-gekozen +x-as horizontaal in de
 *     lokale frame komt te staan.
 *  4. Schaal: deel door pixels-per-unit (afgeleid uit `scale.p1`, `scale.p2`,
 *     `scale.length`).
 *
 *  Sanity-checks (consistent met `AxesOverlay`'s `xDir = (cos, -sin)`):
 *   - angle 0,   click 100 rechts + 100 omhoog → world (+1, +1) in de unit
 *   - angle π/2, click direct boven de oorsprong → world (+x, 0) — want +x
 *     wijst dan omhoog op het scherm.
 */
export function pixelToWorld(p: Pixel, scale: ScaleCalibration, axes: AxisCalibration): WorldPoint {
  // 1) Translate.
  const dx = p.x - axes.origin.x;
  const dy = p.y - axes.origin.y;

  // 2) Flip y to physics convention (screen y groeit omlaag).
  const fy = -dy;

  // 3) Rotate by -angle. Standaard 2D rotatie: cos(-a)=cos(a), sin(-a)=-sin(a).
  //    rx =  cos(a)·dx + sin(a)·fy
  //    ry = -sin(a)·dx + cos(a)·fy
  const cosA = Math.cos(axes.angle);
  const sinA = Math.sin(axes.angle);
  const rx = cosA * dx + sinA * fy;
  const ry = -sinA * dx + cosA * fy;

  // 4) Scale: lengte in de gekozen unit per pixel.
  const pxLen = pixelDistance(scale.p1, scale.p2);
  if (pxLen <= 0 || !Number.isFinite(pxLen)) {
    return { x: NaN, y: NaN };
  }
  const unitsPerPx = scale.length / pxLen;

  // 5) Richting-tekens (11): flip welke kant positief telt zonder de hoek of
  //    pixel-data te wijzigen. Default rechts/omhoog ⇒ +1/+1.
  const signX = axes.xPositiveDirection === "right" ? 1 : -1;
  const signY = axes.yPositiveDirection === "up" ? 1 : -1;
  return { x: rx * unitsPerPx * signX, y: ry * unitsPerPx * signY };
}
