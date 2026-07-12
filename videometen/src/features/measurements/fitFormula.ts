/**
 * Tool-specifieke formatter voor fit-formules met NL-decimaalkomma. Sinds
 * 07c ondersteunt 'ie ook analytische afgeleiden (`derivative: 0 | 1 | 2`)
 * zodat panes die `vx`, `vy`, `ax`, `ay` tonen niet langer de positie-
 * formule herhalen maar de wiskundige afgeleide ervan.
 *
 * Layout-conventies:
 *  - U+2212 (true minus) voor negatieve termen na het eerste teken
 *  - Spaties rond `+ / −` op term-grens; geen spatie binnen `e^(...)` of
 *    `sin(...)` voor compactheid
 *  - 2 decimalen; lege termen (waarde 0) worden uitgelaten waar mogelijk
 *    (bv. lineaire fit-derivative 2 → `y''(t) = 0` blijft expliciet)
 */
import { type Fit1D } from "@/_reusable/fit";
import { type LengthUnit } from "@/features/calibration/CalibrationState";
import { formatSigFigs } from "@/lib/numbers";

/**
 * Coëfficiënt-weergave: 3 significante cijfers i.p.v. 2 vaste decimalen —
 * kleine coëfficiënten (bv. 0,004 bij cm-schalen of trage bewegingen) werden
 * anders "0,00".
 */
function fmtCoef(vAbs: number): string {
  return formatSigFigs(vAbs, 3);
}

export type FitDerivative = 0 | 1 | 2;

/**
 * 07d: token-vorm voor de formule, zodat de FitInfoBar per coefficient
 * een hover-tooltip met fysische uitleg kan koppelen. Text-tokens zijn de
 * tussenstukken (operators, variabelen, haakjes); coef-tokens zijn de
 * numerieke waardes die hoverbaar zijn.
 */
export type FormulaToken =
  | { kind: "text"; text: string }
  | { kind: "coef"; text: string; tooltip: string };

/** Welke as hoort bij deze formule? Bepaalt o.a. of de zwaartekracht-uitleg
 *  zinvol is (alleen `y`, want `x` is horizontaal). */
export type FormulaAxis = "x" | "y";

/**
 * Bouwt een formule-string als
 *   `vy(t) = 2,00 · −4,90 · t + 5,00`
 *
 * `varName` is de zichtbare naam aan de linkerkant (bv. `x`, `vy`, `ax`).
 * `derivative` bepaalt of we de positie-functie, eerste of tweede afgeleide
 * van `fit` tonen.
 */
export function formatFitFormula(fit: Fit1D, derivative: FitDerivative, varName: string): string {
  switch (fit.type) {
    case "linear":
      return formatLinear(fit.coefficients, derivative, varName);
    case "quadratic":
      return formatQuadratic(fit.coefficients, derivative, varName);
    case "sine":
      return formatSine(fit.coefficients, derivative, varName);
  }
}

// ---------------------------------------------------------------------------
// Number-formatters
// ---------------------------------------------------------------------------

/** `−1,23` of `1,23` met U+2212. */
function head(v: number): string {
  const s = fmtCoef(Math.abs(v));
  return v < 0 ? `−${s}` : s;
}

/** ` + 1,23` of ` − 1,23` voor tussen-termen. */
function tail(v: number): string {
  const s = fmtCoef(Math.abs(v));
  return v < 0 ? ` − ${s}` : ` + ${s}`;
}

/** Binnen `sin(...)` of `e^(...)`: extra tussenterm zonder grote spatie. */
function innerTail(v: number): string {
  const s = fmtCoef(Math.abs(v));
  return v < 0 ? ` − ${s}` : ` + ${s}`;
}

// ---------------------------------------------------------------------------
// Lineair  y = a·t + b
// ---------------------------------------------------------------------------

function formatLinear(c: readonly number[], d: FitDerivative, v: string): string {
  const [a, b] = c;
  if (d === 0) return `${v}(t) = ${head(a)} · t${tail(b)}`;
  if (d === 1) return `${v}(t) = ${head(a)}`;
  // d === 2 voor lineair is altijd 0
  return `${v}(t) = 0`;
}

// ---------------------------------------------------------------------------
// Kwadratisch  y = a·t² + b·t + c
// ---------------------------------------------------------------------------

function formatQuadratic(c: readonly number[], d: FitDerivative, v: string): string {
  const [a, b, k] = c;
  if (d === 0) {
    return `${v}(t) = ${head(a)} · t²${tail(b)} · t${tail(k)}`;
  }
  if (d === 1) {
    // y'(t) = 2a·t + b
    return `${v}(t) = ${head(2 * a)} · t${tail(b)}`;
  }
  // y''(t) = 2a (constant)
  return `${v}(t) = ${head(2 * a)}`;
}

// ---------------------------------------------------------------------------
// Sinus  y = A·sin(ω·t + φ) + C
// ---------------------------------------------------------------------------

function formatSine(c: readonly number[], d: FitDerivative, v: string): string {
  const [A, omega, phi, C] = c;
  const innerHead = head(omega);
  const phiTail = innerTail(phi);
  if (d === 0) {
    return `${v}(t) = ${head(A)} · sin(${innerHead} · t${phiTail})${tail(C)}`;
  }
  if (d === 1) {
    // y'(t) = A·ω·cos(ω·t + φ)
    return `${v}(t) = ${head(A * omega)} · cos(${innerHead} · t${phiTail})`;
  }
  // y''(t) = −A·ω²·sin(ω·t + φ)
  return `${v}(t) = ${head(-A * omega * omega)} · sin(${innerHead} · t${phiTail})`;
}

// ---------------------------------------------------------------------------
// 07d — Token-vorm met per-coefficient tooltips
// ---------------------------------------------------------------------------

const txt = (t: string): FormulaToken => ({ kind: "text", text: t });
const coef = (value: number, tooltip: string, isHead = false): FormulaToken => ({
  kind: "coef",
  text: isHead && value < 0 ? `−${fmtCoef(Math.abs(value))}` : fmtCoef(Math.abs(value)),
  tooltip,
});

/** Separator + magnitude voor middel-termen. Geeft 2 tokens. */
function midTerm(value: number, tooltip: string, suffix?: string): FormulaToken[] {
  const sep = value < 0 ? " − " : " + ";
  const valueToken: FormulaToken = {
    kind: "coef",
    text: fmtCoef(Math.abs(value)),
    tooltip,
  };
  if (suffix) return [txt(sep), valueToken, txt(suffix)];
  return [txt(sep), valueToken];
}

/**
 * Bouw de fit-formule als reeks tokens. Elke `coef`-token kan in de UI
 * met een tooltip worden gerenderd. Tooltips bevatten al de berekende
 * fysische uitkomsten (bv. versnelling, periode, frequentie).
 *
 * `axis` bepaalt of we de zwaartekracht-uitleg geven (alleen `y`). De
 * `derivative` bepaalt welke afgeleide-formule we tonen en daarmee welke
 * fysische interpretatie de coëfficiënten dragen.
 */
export function formatFitFormulaTokens(
  fit: Fit1D,
  derivative: FitDerivative,
  varName: string,
  axis: FormulaAxis,
  unit: LengthUnit,
): FormulaToken[] {
  switch (fit.type) {
    case "linear":
      return tokensLinear(fit.coefficients, derivative, varName, axis, unit);
    case "quadratic":
      return tokensQuadratic(fit.coefficients, derivative, varName, axis, unit);
    case "sine":
      return tokensSine(fit.coefficients, derivative, varName, axis, unit);
  }
}

// ---- Linear  y = a·t + b -------------------------------------------------

function tokensLinear(
  c: readonly number[],
  d: FitDerivative,
  v: string,
  axis: FormulaAxis,
  unit: LengthUnit,
): FormulaToken[] {
  const [a, b] = c;
  const axisLabel = axis === "y" ? "y-richting" : "x-richting";
  if (d === 0) {
    return [
      txt(`${v}(t) = `),
      coef(
        a,
        `Snelheid in ${axisLabel} (${unit}/s). Constante snelheid betekent eenparige beweging.`,
        true,
      ),
      txt(" · t"),
      ...midTerm(b, `Startwaarde — ${axis} op t = 0 (${unit}).`),
    ];
  }
  if (d === 1) {
    return [txt(`${v}(t) = `), coef(a, `Constante snelheid in ${axisLabel} (${unit}/s).`, true)];
  }
  // d === 2: lineaire fit heeft geen versnelling.
  return [
    txt(`${v}(t) = `),
    {
      kind: "coef",
      text: "0",
      tooltip: "Een lineair model heeft geen versnelling (tweede afgeleide = 0).",
    },
  ];
}

// ---- Quadratic  y = a·t² + b·t + c ----------------------------------------

/**
 * 07e: neutrale versnelling-uitleg, ZONDER vrije-val/zwaartekracht-claim.
 * Een kwadratische y-fit is niet per definitie vrije val — de leerling
 * moet zelf interpreteren. In 07f komen scenario-presets (vrije val,
 * horizontale worp, …) die conditioneel wél de g-vergelijking activeren.
 */
function accelHint(twoA: number, axis: FormulaAxis, unit: LengthUnit): string {
  const axisLabel = axis === "y" ? "y-richting" : "x-richting";
  return `Versnelling in ${axisLabel}: 2·a = ${formatSigFigs(twoA, 3)} ${unit}/s².`;
}

function tokensQuadratic(
  c: readonly number[],
  d: FitDerivative,
  v: string,
  axis: FormulaAxis,
  unit: LengthUnit,
): FormulaToken[] {
  const [a, b, k] = c;
  const axisLabel = axis === "y" ? "y-richting" : "x-richting";
  if (d === 0) {
    // y(t) = a·t² + b·t + c
    const aTip = `Halve versnelling in ${axisLabel}: 2·a = ${formatSigFigs(2 * a, 3)} ${unit}/s².`;
    return [
      txt(`${v}(t) = `),
      coef(a, aTip, true),
      txt(" · t²"),
      ...midTerm(b, `Startsnelheid in ${axisLabel} (${unit}/s) — de afgeleide op t = 0.`),
      txt(" · t"),
      ...midTerm(k, `Beginpositie ${axis}₀ — ${axis} op t = 0 (${unit}).`),
    ];
  }
  if (d === 1) {
    // vy(t) = 2a·t + b
    return [
      txt(`${v}(t) = `),
      coef(2 * a, accelHint(2 * a, axis, unit), true),
      txt(" · t"),
      ...midTerm(b, `Startsnelheid in ${axisLabel} op t = 0 (${unit}/s).`),
    ];
  }
  // ay(t) = 2a (constant)
  return [txt(`${v}(t) = `), coef(2 * a, accelHint(2 * a, axis, unit), true)];
}

// ---- Sine  y = A·sin(ω·t + φ) + C -----------------------------------------

function periodFreqHint(omega: number): string {
  const omAbs = Math.abs(omega);
  if (omAbs < 1e-9) return "Hoekfrequentie (rad/s).";
  const T = (2 * Math.PI) / omAbs;
  const f = omAbs / (2 * Math.PI);
  return (
    `Hoekfrequentie (rad/s). Periode T = 2π/ω = ${formatSigFigs(T, 3)} s, ` +
    `frequentie f = ω/2π = ${formatSigFigs(f, 3)} Hz.`
  );
}

function tokensSine(
  c: readonly number[],
  d: FitDerivative,
  v: string,
  axis: FormulaAxis,
  unit: LengthUnit,
): FormulaToken[] {
  const [A, omega, phi, C] = c;
  const phiTip = "Faseverschuiving (rad) — bepaalt waar in de cyclus t = 0 valt.";
  const omegaTip = periodFreqHint(omega);
  if (d === 0) {
    return [
      txt(`${v}(t) = `),
      coef(A, `Amplitude — maximale uitwijking vanaf het midden (${unit}).`, true),
      txt(" · sin("),
      coef(omega, omegaTip, true),
      txt(" · t"),
      ...midTerm(phi, phiTip),
      txt(")"),
      ...midTerm(C, `Middelwaarde — het centrum waar de oscillatie omheen schommelt (${unit}).`),
    ];
  }
  if (d === 1) {
    // y'(t) = A·ω·cos(ω·t + φ)
    const amp = A * omega;
    const axisLbl = axis === "y" ? "y-richting" : "x-richting";
    const ampTip = `Maximale snelheid in ${axisLbl} (Aω = ${formatSigFigs(Math.abs(amp), 3)} ${unit}/s).`;
    return [
      txt(`${v}(t) = `),
      coef(amp, ampTip, true),
      txt(" · cos("),
      coef(omega, omegaTip, true),
      txt(" · t"),
      ...midTerm(phi, phiTip),
      txt(")"),
    ];
  }
  // y''(t) = −A·ω²·sin(ω·t + φ)
  const accAmp = -A * omega * omega;
  const accTip =
    `Maximale versnelling = Aω² = ${formatSigFigs(Math.abs(accAmp), 3)} ${unit}/s² ` +
    `(teken volgt uit de sinus).`;
  return [
    txt(`${v}(t) = `),
    coef(accAmp, accTip, true),
    txt(" · sin("),
    coef(omega, omegaTip, true),
    txt(" · t"),
    ...midTerm(phi, phiTip),
    txt(")"),
  ];
}
