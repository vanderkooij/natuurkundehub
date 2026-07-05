/**
 * LED-specificatie (Fase 5). Sterk vereenvoudigde diode: geleidt alleen voorwaarts
 * (anode → kathode) zodra de spanning de **drempelspanning Vf** overschrijdt, licht
 * op in zijn kleur met een helderheid ∝ de stroom, en **brandt door** boven de
 * doorbrandstroom (bv. rechtstreeks op een ideale bron zonder voorschakelweerstand).
 *
 * De kleurkeuze bepaalt de Vf (elke kleur z'n eigen drempel — didactisch relevant:
 * een blauwe/witte LED heeft een hogere drempel dan een rode).
 */

export interface LedColor {
  key: string;
  label: string;
  /** Lichtkleur van de koepel/gloed. */
  hex: string;
  /** Drempelspanning in volt. */
  vf: number;
}

export const LED_COLORS: LedColor[] = [
  { key: "rood", label: "Rood", hex: "#ff2d2d", vf: 1.8 },
  { key: "geel", label: "Geel", hex: "#ffcf33", vf: 2.0 },
  { key: "groen", label: "Groen", hex: "#35d94f", vf: 2.2 },
  { key: "blauw", label: "Blauw", hex: "#3a9bff", vf: 3.0 },
  { key: "wit", label: "Wit", hex: "#fdf6d8", vf: 3.2 },
];

export const DEFAULT_LED_COLOR = "rood";

/** Stroom (A) waarboven de LED doorbrandt. */
export const LED_IMAX = 0.03;
/** Referentiestroom (A) voor volledige helderheid. */
export const LED_INOM = 0.02;

export function ledColor(key: string | undefined): LedColor {
  return LED_COLORS.find((c) => c.key === key) ?? LED_COLORS[0];
}

export function ledVf(key: string | undefined): number {
  return ledColor(key).vf;
}

/** Helderheid 0..1 uit de doorlaatstroom (LED-licht ≈ lineair met de stroom). */
export function ledBrightness(current: number): number {
  return Math.max(0, Math.min(1, Math.abs(current) / LED_INOM));
}
