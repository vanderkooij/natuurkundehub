/**
 * Sensoren (LDR/NTC): een weerstand waarvan R afhangt van een omgevings-slider.
 * LDR: meer licht → lagere R. NTC: hogere temperatuur → lagere R.
 *
 * R loopt logaritmisch van R_MAX (donker/koud) naar R_MIN (fel licht/heet) —
 * zoals echte sensoren, en zo blijft de spanningsdeler over het hele bereik
 * interessant (schemerschakelaar-demo's).
 */
import type { ComponentType } from "./types";

export const SENSOR_R_MAX = 20000; // Ω bij env = 0 (donker / koud)
export const SENSOR_R_MIN = 100; // Ω bij env = 100 (fel licht / heet)

export const isSensor = (t: ComponentType): boolean => t === "ldr" || t === "ntc";

/** Weerstand (Ω) bij omgevingswaarde 0–100. */
export function sensorR(env100: number | undefined): number {
  const t = Math.max(0, Math.min(1, (env100 ?? 50) / 100));
  return SENSOR_R_MAX * Math.pow(SENSOR_R_MIN / SENSOR_R_MAX, t);
}
