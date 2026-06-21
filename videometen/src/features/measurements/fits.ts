/**
 * Tool-specifieke koppeling tussen `MeasurementRow[]` en de reusable
 * `fit.ts`-helpers. Berekent x(t)- en y(t)-fits op de binnen-trim
 * meetpunten (consistent met andere afgeleiden uit `derive.ts` en de
 * tabel-/grafiek-rendering).
 *
 * Sinds v3: een optionele `range` (sub-selectie van frames binnen de
 * trim) bepaalt welke meetpunten daadwerkelijk in de fit-berekening
 * mee mogen doen. De fit-curve wordt voor visualisatie tot de volledige
 * trim-range geëxtrapoleerd; het extrapolatie-deel wordt door
 * `buildFitCurves` als losse serie aangeleverd zodat de pane 'm
 * transparanter / gedasht kan tekenen.
 */
import {
  evalFit,
  evalFitDerivative,
  evalFitSecondDerivative,
  fitByType,
  type Fit1D,
  type FitType,
} from "@/_reusable/fit";
import { type ChartPoint } from "@nh/shared/InteractiveChart";
import { type MeasurementRow } from "@/features/measurements/derive";
import { type GraphTypeKey } from "@/features/measurements/graph-types";
import { type FitConfig } from "@/features/measurements/GraphsLayoutState";

export interface FitsResult {
  /** Fit voor `x(t)`. `null` als config 'none', te weinig data of convergentie-faal. */
  x: Fit1D | null;
  /** Fit voor `y(t)`. */
  y: Fit1D | null;
  /** Welke fit-types waren actief in de config (voor 'kon niet convergeren' UI-melding). */
  xRequested: FitType;
  yRequested: FitType;
  /** Effectief gebruikte fit-range (in seconden, relatief aan trimStart). */
  fitTRange: { tMin: number; tMax: number };
  /**
   * 07e: t-range van de daadwerkelijke meetpunten binnen de trim — eerste
   * en laatste in-trim meting. Wordt door `buildFitCurve` gebruikt om
   * zone B (buiten fit-range maar binnen meetbereik) van zone C (echte
   * extrapolatie voorbij meetbereik) te onderscheiden. `null` als er geen
   * in-trim meetpunten zijn.
   */
  dataTRange: { tMin: number; tMax: number } | null;
}

/**
 * Resolved fit-range. `range === null` ⇒ neem volledige trim. Bij
 * gedeeltelijke overlap clampen we naar de trim om out-of-range
 * frame-nummers stil te corrigeren.
 */
export function effectiveFitRange(
  config: FitConfig,
  trimStart: number,
  trimEnd: number,
): { start: number; end: number } {
  if (config.range === null) return { start: trimStart, end: trimEnd };
  return {
    start: Math.max(config.range.start, trimStart),
    end: Math.min(config.range.end, trimEnd),
  };
}

/** Bouw beide fits op basis van binnen-trim metingen + config + fit-range. */
export function computeFits(
  rows: MeasurementRow[],
  config: FitConfig,
  trimStart: number,
  trimEnd: number,
  fps: number,
): FitsResult {
  const range = effectiveFitRange(config, trimStart, trimEnd);
  const inTrim = rows.filter((r) => r.withinTrim);
  const inFitRange = inTrim.filter(
    (r) => r.frame >= range.start && r.frame <= range.end,
  );
  // tMin/tMax voor de fit-range zelf (in seconden, relatief aan trimStart),
  // óók als er geen meetpunten in zitten (UI gebruikt 't voor de visuele
  // arcering).
  const tMin = (range.start - trimStart) / Math.max(fps, 1e-9);
  const tMax = (range.end - trimStart) / Math.max(fps, 1e-9);
  // 07e: t-bereik van daadwerkelijke meetpunten — eerste/laatste in-trim
  // rij. Onafhankelijk van fit-range. Bepaalt zone-B vs zone-C grens in
  // de fit-curve rendering.
  let dataTRange: { tMin: number; tMax: number } | null = null;
  if (inTrim.length > 0) {
    let dMin = Infinity;
    let dMax = -Infinity;
    for (const r of inTrim) {
      if (!Number.isFinite(r.t)) continue;
      if (r.t < dMin) dMin = r.t;
      if (r.t > dMax) dMax = r.t;
    }
    if (Number.isFinite(dMin) && Number.isFinite(dMax)) {
      dataTRange = { tMin: dMin, tMax: dMax };
    }
  }
  return {
    x: buildFit(inFitRange, config.xFit, (r) => r.x),
    y: buildFit(inFitRange, config.yFit, (r) => r.y),
    xRequested: config.xFit,
    yRequested: config.yFit,
    fitTRange: { tMin, tMax },
    dataTRange,
  };
}

function buildFit(
  rows: MeasurementRow[],
  type: FitType,
  pick: (row: MeasurementRow) => number,
): Fit1D | null {
  if (type === "none") return null;
  const samples: Array<{ t: number; y: number }> = [];
  for (const r of rows) {
    const y = pick(r);
    if (!Number.isFinite(r.t) || !Number.isFinite(y)) continue;
    samples.push({ t: r.t, y });
  }
  return fitByType(type, samples);
}

// ---------------------------------------------------------------------------
// Fit-curve sampling voor render in InteractiveChart.
// ---------------------------------------------------------------------------

/** Sample-density voor fit-curves. 200 punten geeft een visueel gladde curve. */
const FIT_SAMPLE_N = 200;

/**
 * Bouw fit-curve(s) voor één pane. 07e: drie zones in plaats van twee.
 *
 *  - `inFitRange`  — Zone A: `t ∈ [fitTMin, fitTMax]`. Solid lijn, volle
 *    kleur, vol opacity. De fit "leeft" hier.
 *  - `outsideFitInData` — Zone B: `t ∈ [dataTMin, dataTMax]` maar NIET in
 *    de fit-range. Solid lijn, lichter (opacity 0,7). Hier zijn er wel
 *    meetpunten, maar de leerling heeft die bewust niet in de fit
 *    meegenomen.
 *  - `extrapolation` — Zone C: `t` voor `dataTMin` of na `dataTMax`. Dashed
 *    lijn, gedimd (opacity 0,5). Pure extrapolatie: het model voorspelt,
 *    maar er is geen meetdata om dat te onderbouwen.
 *
 * Voor `y-x` is de zone-opdeling visueel zinloos (geen tijd-as op de plot
 * zelf) — daar rendert `unsplit` als één serie.
 *
 * `viewTMin/viewTMax` = de t-range waar de fit-curve over wordt gesamplet.
 * Voor t-grafieken is dat de zichtbare x-range (zoomState of trim); voor
 * `y-x` worden ze genegeerd en gebruiken we de fit's eigen `tMin/tMax`.
 *
 * Retourneert `null` als de relevante fit(s) ontbreken of als de t-range
 * degenereert.
 */
export interface FitCurveSplit {
  inFitRange: ChartPoint[];
  outsideFitInData: ChartPoint[];
  extrapolation: ChartPoint[];
  /** Voor `y-x`: alles als één serie i.p.v. drie zones. */
  unsplit?: ChartPoint[];
}

type FitZone = "A" | "B" | "C";

function classifyZone(
  t: number,
  fitTMin: number,
  fitTMax: number,
  dataTMin: number,
  dataTMax: number,
): FitZone {
  if (t >= fitTMin && t <= fitTMax) return "A";
  if (t >= dataTMin && t <= dataTMax) return "B";
  return "C";
}

function pushTo(split: FitCurveSplit, zone: FitZone, p: ChartPoint) {
  if (zone === "A") split.inFitRange.push(p);
  else if (zone === "B") split.outsideFitInData.push(p);
  else split.extrapolation.push(p);
}

export function buildFitCurve(
  type: GraphTypeKey,
  fits: FitsResult,
  viewTMin: number,
  viewTMax: number,
): FitCurveSplit | null {
  switch (type) {
    case "x-t":
    case "vx-t":
    case "ax-t":
      if (!fits.x) return null;
      break;
    case "y-t":
    case "vy-t":
    case "ay-t":
      if (!fits.y) return null;
      break;
    case "vmag-t":
    case "amag-t":
    case "y-x":
      if (!fits.x || !fits.y) return null;
      break;
  }
  // Sample-range: voor t-grafieken samplen we over de zichtbare x-range
  // (de caller geeft `viewTMin/Max`). Voor y-x is dat zinloos (geen tijd-
  // as op de plot zelf); we gebruiken de fit's eigen t-bereik.
  let tMin: number;
  let tMax: number;
  if (type === "y-x") {
    const fx = fits.x!;
    const fy = fits.y!;
    tMin = Math.max(fx.tMin, fy.tMin);
    tMax = Math.min(fx.tMax, fy.tMax);
  } else {
    tMin = viewTMin;
    tMax = viewTMax;
  }
  if (!(tMin < tMax) || !Number.isFinite(tMin) || !Number.isFinite(tMax)) return null;

  const fitTMin = fits.fitTRange.tMin;
  const fitTMax = fits.fitTRange.tMax;
  // Data-range default: gelijk aan fit-range als geen data-range bekend
  // (degenerate case — dan is zone B sowieso leeg en alles buiten fit is C).
  const dataTMin = fits.dataTRange?.tMin ?? fitTMin;
  const dataTMax = fits.dataTRange?.tMax ?? fitTMax;

  const fx = fits.x;
  const fy = fits.y;

  const allPoints: ChartPoint[] = [];
  for (let i = 0; i < FIT_SAMPLE_N; i += 1) {
    const t = tMin + ((tMax - tMin) * i) / (FIT_SAMPLE_N - 1);
    let x: number;
    let y: number;
    switch (type) {
      case "x-t":
        x = t;
        y = evalFit(fx!, t);
        break;
      case "y-t":
        x = t;
        y = evalFit(fy!, t);
        break;
      case "vx-t":
        x = t;
        y = evalFitDerivative(fx!, t);
        break;
      case "vy-t":
        x = t;
        y = evalFitDerivative(fy!, t);
        break;
      case "vmag-t": {
        const vx = evalFitDerivative(fx!, t);
        const vy = evalFitDerivative(fy!, t);
        x = t;
        y = Math.hypot(vx, vy);
        break;
      }
      case "ax-t":
        x = t;
        y = evalFitSecondDerivative(fx!, t);
        break;
      case "ay-t":
        x = t;
        y = evalFitSecondDerivative(fy!, t);
        break;
      case "amag-t": {
        const ax = evalFitSecondDerivative(fx!, t);
        const ay = evalFitSecondDerivative(fy!, t);
        x = t;
        y = Math.hypot(ax, ay);
        break;
      }
      case "y-x":
        x = evalFit(fx!, t);
        y = evalFit(fy!, t);
        break;
    }
    if (Number.isFinite(x) && Number.isFinite(y)) {
      // meta.t bewaren zodat de pane terug kan rekenen naar frame bij klik.
      allPoints.push({ x, y, meta: { t } });
    }
  }
  if (allPoints.length < 2) return null;

  if (type === "y-x") {
    return {
      inFitRange: [],
      outsideFitInData: [],
      extrapolation: [],
      unsplit: allPoints,
    };
  }

  // Split in drie zones (A/B/C) met grens-overlap zodat segmenten visueel
  // aansluiten: bij elke zone-transitie pushen we het overgangspunt naar
  // beide reeksen.
  const split: FitCurveSplit = {
    inFitRange: [],
    outsideFitInData: [],
    extrapolation: [],
  };
  let prevZone: FitZone | null = null;
  for (const p of allPoints) {
    const t = (p.meta as { t: number }).t;
    const zone = classifyZone(t, fitTMin, fitTMax, dataTMin, dataTMax);
    pushTo(split, zone, p);
    if (prevZone !== null && prevZone !== zone) {
      // Zelfde punt ook in de VORIGE zone, zodat de lijn doorloopt over
      // de zone-grens (geen visueel gat).
      pushTo(split, prevZone, p);
    }
    prevZone = zone;
  }
  return split;
}
