/**
 * @reusable
 * @category data
 * @description 1D least-squares regressie-helpers. Lineair en kwadratisch
 *   in closed-form, sinus via grid-search + lineaire refine. Geen externe
 *   deps. Bedoeld voor analyse-tools die ruwe meet-data willen modelleren
 *   en analytische afgeleiden willen evalueren (in plaats van numerieke
 *   differentiatie die bij ruis spookt).
 *
 *   07g: exponentiële fit verwijderd — niet relevant voor video-analyse
 *   (RC-verval en radioactiviteit meet je niet met een camera). Zie git-
 *   historie als 'ie ooit terug moet.
 */

export type FitType = "none" | "linear" | "quadratic" | "sine";

export interface Fit1DBase {
  /** Determinatiecoëfficiënt R², 0..1 (hoger = betere fit). */
  rSquared: number;
  /** t-range waarop de fit is berekend. */
  tMin: number;
  tMax: number;
}

export interface Fit1DLinear extends Fit1DBase {
  type: "linear";
  /** `[a, b]` voor `y = a·t + b` (hoogste graad eerst). */
  coefficients: [number, number];
}

export interface Fit1DQuadratic extends Fit1DBase {
  type: "quadratic";
  /** `[a, b, c]` voor `y = a·t² + b·t + c`. */
  coefficients: [number, number, number];
}

export interface Fit1DSine extends Fit1DBase {
  type: "sine";
  /** `[A, omega, phi, C]` voor `y = A·sin(ω·t + φ) + C`. */
  coefficients: [number, number, number, number];
}

export type Fit1D = Fit1DLinear | Fit1DQuadratic | Fit1DSine;

interface Sample {
  t: number;
  y: number;
}

/** Linear least-squares fit `y = a·t + b`. */
export function fitLinear(points: Sample[]): Fit1DLinear | null {
  if (points.length < 2) return null;
  let sumT = 0;
  let sumY = 0;
  let sumTT = 0;
  let sumTY = 0;
  let tMin = Infinity;
  let tMax = -Infinity;
  let n = 0;
  for (const p of points) {
    if (!Number.isFinite(p.t) || !Number.isFinite(p.y)) continue;
    sumT += p.t;
    sumY += p.y;
    sumTT += p.t * p.t;
    sumTY += p.t * p.y;
    if (p.t < tMin) tMin = p.t;
    if (p.t > tMax) tMax = p.t;
    n += 1;
  }
  if (n < 2) return null;
  // Variantie van t — bij 0 zijn alle t's identiek, geen unieke lijn.
  const denom = n * sumTT - sumT * sumT;
  if (Math.abs(denom) < 1e-12) return null;
  const a = (n * sumTY - sumT * sumY) / denom;
  const b = (sumY - a * sumT) / n;
  const fit: Fit1DLinear = {
    type: "linear",
    coefficients: [a, b],
    rSquared: 0,
    tMin,
    tMax,
  };
  fit.rSquared = computeRSquared(points, fit);
  return fit;
}

/**
 * Kwadratische least-squares fit `y = a·t² + b·t + c` via de Vandermonde
 * normal equations (`AᵀA · x = Aᵀy`). 3×3 systeem opgelost met Cramer's
 * regel. Numeriek stabiel genoeg voor onze typische N=10..200 punten met
 * t-waardes binnen [0..30] seconden.
 */
export function fitQuadratic(points: Sample[]): Fit1DQuadratic | null {
  if (points.length < 3) return null;
  let sT0 = 0; // n
  let sT1 = 0;
  let sT2 = 0;
  let sT3 = 0;
  let sT4 = 0;
  let sY0 = 0; // Σy
  let sY1 = 0; // Σt·y
  let sY2 = 0; // Σt²·y
  let tMin = Infinity;
  let tMax = -Infinity;
  for (const p of points) {
    if (!Number.isFinite(p.t) || !Number.isFinite(p.y)) continue;
    const t = p.t;
    const t2 = t * t;
    sT0 += 1;
    sT1 += t;
    sT2 += t2;
    sT3 += t2 * t;
    sT4 += t2 * t2;
    sY0 += p.y;
    sY1 += t * p.y;
    sY2 += t2 * p.y;
    if (t < tMin) tMin = t;
    if (t > tMax) tMax = t;
  }
  if (sT0 < 3) return null;
  // Normal equations:
  //   [sT4 sT3 sT2] [a]   [sY2]
  //   [sT3 sT2 sT1] [b] = [sY1]
  //   [sT2 sT1 sT0] [c]   [sY0]
  const m11 = sT4, m12 = sT3, m13 = sT2;
  const m21 = sT3, m22 = sT2, m23 = sT1;
  const m31 = sT2, m32 = sT1, m33 = sT0;
  const det =
    m11 * (m22 * m33 - m23 * m32) -
    m12 * (m21 * m33 - m23 * m31) +
    m13 * (m21 * m32 - m22 * m31);
  if (Math.abs(det) < 1e-12) return null;

  const detA =
    sY2 * (m22 * m33 - m23 * m32) -
    m12 * (sY1 * m33 - m23 * sY0) +
    m13 * (sY1 * m32 - m22 * sY0);
  const detB =
    m11 * (sY1 * m33 - m23 * sY0) -
    sY2 * (m21 * m33 - m23 * m31) +
    m13 * (m21 * sY0 - sY1 * m31);
  const detC =
    m11 * (m22 * sY0 - sY1 * m32) -
    m12 * (m21 * sY0 - sY1 * m31) +
    sY2 * (m21 * m32 - m22 * m31);

  const a = detA / det;
  const b = detB / det;
  const c = detC / det;
  const fit: Fit1DQuadratic = {
    type: "quadratic",
    coefficients: [a, b, c],
    rSquared: 0,
    tMin,
    tMax,
  };
  fit.rSquared = computeRSquared(points, fit);
  return fit;
}

// ---------------------------------------------------------------------------
// Sinus-fit  y = A·sin(ω·t + φ) + C
// ---------------------------------------------------------------------------

/**
 * Sinus-fit via grid-search over `ω` + lineaire refine van (A_sin, A_cos, C).
 * Truc: voor vaste ω is `A_sin·sin(ωt) + A_cos·cos(ωt) + C` lineair in
 * (A_sin, A_cos, C) → closed-form least-squares (3x3). Combine naar
 * amplitude + fase: A = √(A_sin² + A_cos²), φ = atan2(A_cos, A_sin).
 *
 * Initial ω-schatting:
 *  - Bereken de gemiddelde sample-spacing dt = (tMax-tMin)/(n-1).
 *  - Het maximaal detecteerbare frequentie-domein is grof
 *    `ω ∈ [2π/(tMax-tMin) , π/dt]` (DC → Nyquist).
 *  - Doorzoek dat met N stappen op log-schaal. Refine winnaar met
 *    fijnere grid in ±10% omheen.
 *
 * Faalt (geeft `null`) als R² < 0.5 of geen geldig signaal.
 */
export function fitSine(points: Sample[]): Fit1DSine | null {
  // Filter geldige punten + compute range.
  const samples: Sample[] = [];
  let tMin = Infinity;
  let tMax = -Infinity;
  for (const p of points) {
    if (!Number.isFinite(p.t) || !Number.isFinite(p.y)) continue;
    samples.push({ t: p.t, y: p.y });
    if (p.t < tMin) tMin = p.t;
    if (p.t > tMax) tMax = p.t;
  }
  if (samples.length < 5) return null;
  const span = tMax - tMin;
  if (!(span > 0)) return null;

  const dtAvg = span / Math.max(1, samples.length - 1);
  // Range op log-schaal: laagste 0.5 periode passend in span, hoogste 2 samples/periode.
  const omegaMin = Math.PI / span; // halve periode in venster
  const omegaMax = Math.PI / dtAvg; // 2 samples per periode (Nyquist-grens)
  if (!(omegaMin < omegaMax)) return null;

  interface SineBest {
    omega: number;
    A: number;
    B: number;
    C: number;
    ss: number;
  }
  const COARSE_N = 40;
  let best: SineBest | null = null;
  for (let i = 0; i < COARSE_N; i += 1) {
    const frac = i / (COARSE_N - 1);
    const omega = omegaMin * Math.pow(omegaMax / omegaMin, frac);
    const fit = linearSineCoef(samples, omega);
    if (!fit) continue;
    if (best === null || fit.ss < best.ss) {
      best = { omega, A: fit.A, B: fit.B, C: fit.C, ss: fit.ss };
    }
  }
  if (best === null) return null;

  // Refine: 2 rondes lokale grid-search rond best.omega (±50%, dan ±5%).
  for (const halfWidth of [0.5, 0.05]) {
    const current: SineBest = best;
    const lo: number = current.omega * (1 - halfWidth);
    const hi: number = current.omega * (1 + halfWidth);
    const REFINE_N = 30;
    for (let i = 0; i < REFINE_N; i += 1) {
      const omega: number = lo + ((hi - lo) * i) / (REFINE_N - 1);
      if (omega <= 0) continue;
      const fit = linearSineCoef(samples, omega);
      if (!fit) continue;
      if (fit.ss < best.ss) {
        best = { omega, A: fit.A, B: fit.B, C: fit.C, ss: fit.ss };
      }
    }
  }

  const { omega, A: As, B: Ac, C } = best;
  const amp = Math.hypot(As, Ac);
  // Conventie: y = A·sin(ω·t + φ) + C = A·(sin·cos φ + cos·sin φ) + C
  // ⇒ A_sin = A·cos φ, A_cos = A·sin φ → φ = atan2(A_cos, A_sin).
  const phi = Math.atan2(Ac, As);
  const fit: Fit1DSine = {
    type: "sine",
    coefficients: [amp, omega, phi, C],
    rSquared: 0,
    tMin,
    tMax,
  };
  fit.rSquared = computeRSquared(points, fit);
  if (!Number.isFinite(fit.rSquared) || fit.rSquared < 0.5) return null;
  return fit;
}

/**
 * Voor gegeven ω: los het lineaire systeem op voor
 * `A_sin · sin(ω·t) + A_cos · cos(ω·t) + C` (normaal-equaties, 3×3 Cramer).
 * Retourneert `null` bij singulier systeem.
 */
function linearSineCoef(
  samples: Sample[],
  omega: number,
): { A: number; B: number; C: number; ss: number } | null {
  let sSS = 0, sSC = 0, sS = 0;
  let sCC = 0, sC = 0;
  let sN = 0;
  let sYS = 0, sYC = 0, sY = 0;
  for (const p of samples) {
    const s = Math.sin(omega * p.t);
    const c = Math.cos(omega * p.t);
    sSS += s * s;
    sSC += s * c;
    sS += s;
    sCC += c * c;
    sC += c;
    sN += 1;
    sYS += p.y * s;
    sYC += p.y * c;
    sY += p.y;
  }
  // 3x3 normal equations:
  //   [sSS sSC sS] [A]   [sYS]
  //   [sSC sCC sC] [B] = [sYC]
  //   [sS  sC  sN] [C]   [sY ]
  const m11 = sSS, m12 = sSC, m13 = sS;
  const m21 = sSC, m22 = sCC, m23 = sC;
  const m31 = sS,  m32 = sC,  m33 = sN;
  const det =
    m11 * (m22 * m33 - m23 * m32) -
    m12 * (m21 * m33 - m23 * m31) +
    m13 * (m21 * m32 - m22 * m31);
  if (Math.abs(det) < 1e-12) return null;
  const detA =
    sYS * (m22 * m33 - m23 * m32) -
    m12 * (sYC * m33 - m23 * sY) +
    m13 * (sYC * m32 - m22 * sY);
  const detB =
    m11 * (sYC * m33 - m23 * sY) -
    sYS * (m21 * m33 - m23 * m31) +
    m13 * (m21 * sY - sYC * m31);
  const detC =
    m11 * (m22 * sY - sYC * m32) -
    m12 * (m21 * sY - sYC * m31) +
    sYS * (m21 * m32 - m22 * m31);
  const A = detA / det;
  const B = detB / det;
  const C = detC / det;
  if (!Number.isFinite(A) || !Number.isFinite(B) || !Number.isFinite(C)) return null;

  // Sum of squared residuals (zonder de fit-struct expliciet te bouwen).
  let ss = 0;
  for (const p of samples) {
    const pred = A * Math.sin(omega * p.t) + B * Math.cos(omega * p.t) + C;
    const r = p.y - pred;
    ss += r * r;
  }
  return { A, B, C, ss };
}

// ---------------------------------------------------------------------------
// Evaluatie + afgeleiden
// ---------------------------------------------------------------------------

/** Evalueert de fit-functie op een t-waarde. */
export function evalFit(fit: Fit1D, t: number): number {
  switch (fit.type) {
    case "linear": {
      const [a, b] = fit.coefficients;
      return a * t + b;
    }
    case "quadratic": {
      const [a, b, c] = fit.coefficients;
      return a * t * t + b * t + c;
    }
    case "sine": {
      const [A, omega, phi, C] = fit.coefficients;
      return A * Math.sin(omega * t + phi) + C;
    }
  }
}

/** Eerste analytische afgeleide `dy/dt`. */
export function evalFitDerivative(fit: Fit1D, t: number): number {
  switch (fit.type) {
    case "linear":
      return fit.coefficients[0];
    case "quadratic": {
      const [a, b] = fit.coefficients;
      return 2 * a * t + b;
    }
    case "sine": {
      const [A, omega, phi] = fit.coefficients;
      return A * omega * Math.cos(omega * t + phi);
    }
  }
}

/** Derde analytische afgeleide `d³y/dt³`. Voor lineair/kwadratisch altijd 0. */
export function evalFitThirdDerivative(fit: Fit1D, t: number): number {
  switch (fit.type) {
    case "linear":
    case "quadratic":
      return 0;
    case "sine": {
      const [A, omega, phi] = fit.coefficients;
      return -A * omega * omega * omega * Math.cos(omega * t + phi);
    }
  }
}

/** Tweede analytische afgeleide `d²y/dt²`. */
export function evalFitSecondDerivative(fit: Fit1D, t: number): number {
  switch (fit.type) {
    case "linear":
      return 0;
    case "quadratic":
      return 2 * fit.coefficients[0];
    case "sine": {
      const [A, omega, phi] = fit.coefficients;
      return -A * omega * omega * Math.sin(omega * t + phi);
    }
  }
}

/**
 * R² = 1 − SS_res / SS_tot. Bij `SS_tot ≈ 0` (alle y identiek) is R²
 * onbepaald — we retourneren 1 als de fit perfect raakt (residu ook 0),
 * anders 0 (model verklaart niets van de variantie).
 */
function computeRSquared(points: Sample[], fit: Fit1D): number {
  if (points.length === 0) return 0;
  let sumY = 0;
  let nValid = 0;
  for (const p of points) {
    if (!Number.isFinite(p.y)) continue;
    sumY += p.y;
    nValid += 1;
  }
  if (nValid === 0) return 0;
  const meanY = sumY / nValid;
  let ssRes = 0;
  let ssTot = 0;
  for (const p of points) {
    if (!Number.isFinite(p.t) || !Number.isFinite(p.y)) continue;
    const predicted = evalFit(fit, p.t);
    ssRes += (p.y - predicted) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }
  if (ssTot < 1e-12) return ssRes < 1e-12 ? 1 : 0;
  return 1 - ssRes / ssTot;
}

/**
 * Routing-helper: bouw de juiste fit op basis van type. Retourneert `null`
 * voor `none` of bij te weinig data / convergentie-faal.
 */
export function fitByType(type: FitType, points: Sample[]): Fit1D | null {
  switch (type) {
    case "linear":
      return fitLinear(points);
    case "quadratic":
      return fitQuadratic(points);
    case "sine":
      return fitSine(points);
    case "none":
      return null;
  }
}

/* -----------------------------------------------------------------------
 * Informele tests (handmatige sanity-check, niet onderdeel van runtime):
 *
 *   fitLinear([{t:0,y:3},{t:1,y:5},{t:2,y:7},{t:3,y:9}])
 *     → coefficients: [2, 3], rSquared: 1
 *
 *   fitQuadratic([{t:0,y:1},{t:1,y:3},{t:2,y:-1},{t:3,y:-13},{t:4,y:-31}])
 *     // y = -4.9 t² + 5 t + 1 → met exacte waardes terug
 *
 *   const sine = fitSine(
 *     Array.from({length: 50}, (_, i) => ({
 *       t: i / 49,
 *       y: Math.sin(2 * Math.PI * (i / 49)),
 *     }))
 *   );
 *   // coefficients ≈ [1, 2π, 0, 0], R² ≈ 1
 * --------------------------------------------------------------------- */
