/**
 * Catalogus van grafiektypes voor de Graphs-pane. Per type beschrijft de def
 * hoe een `MeasurementRow` om te zetten naar een (x, y) en welke labels +
 * minimum-puntenaantal nodig zijn. Tool-specifiek; geen reusable.
 */
import { type ChartPoint } from "@/_reusable/InteractiveChart";
import { type LengthUnit } from "@/features/calibration/CalibrationState";
import { type MeasurementRow } from "@/features/measurements/derive";

export type GraphTypeKey =
  | "x-t"
  | "y-t"
  | "vx-t"
  | "vy-t"
  | "vmag-t"
  | "ax-t"
  | "ay-t"
  | "amag-t"
  | "y-x";

/**
 * Rijen verrijkt met versnellingen (central difference van vx/vy). Bewust
 * lokaal in de grafieken-feature — `derive.ts` houdt zich aan positie + v
 * (de tabel toont geen a). Latere uitbreiding kan dit promoveren.
 */
export interface ExtendedRow extends MeasurementRow {
  ax?: number;
  ay?: number;
  aMag?: number;
}

export function withAccelerations(rows: MeasurementRow[]): ExtendedRow[] {
  const out: ExtendedRow[] = rows.map((r) => ({ ...r }));
  if (out.length < 3) return out; // central diff van vx vereist 3 punten
  for (let i = 0; i < out.length; i += 1) {
    const iPrev = i === 0 ? 0 : i - 1;
    const iNext = i === out.length - 1 ? out.length - 1 : i + 1;
    const dt = out[iNext].t - out[iPrev].t;
    if (dt <= 0 || !Number.isFinite(dt)) continue;
    const vxP = out[iPrev].vx;
    const vxN = out[iNext].vx;
    const vyP = out[iPrev].vy;
    const vyN = out[iNext].vy;
    if (vxP !== undefined && vxN !== undefined) {
      out[i].ax = (vxN - vxP) / dt;
    }
    if (vyP !== undefined && vyN !== undefined) {
      out[i].ay = (vyN - vyP) / dt;
    }
    const ax = out[i].ax;
    const ay = out[i].ay;
    if (ax !== undefined && ay !== undefined) {
      out[i].aMag = Math.hypot(ax, ay);
    }
  }
  return out;
}

export interface GraphTypeDef {
  key: GraphTypeKey;
  /** Label in de dropdown. */
  label: string;
  /** Minimum aantal punten dat het type vereist (1 voor positie, 2 voor v, 3 voor a). */
  minPoints: number;
  /** True voor types met `t` op de x-as (relevant voor x-zoom-sync + area-klik → frame). */
  isTimeAxis: boolean;
  /** Markeer als versnellings-type → krijgt ruis-tooltip bij dropdown. */
  isAcceleration: boolean;
  xLabel: (unit: LengthUnit) => string;
  yLabel: (unit: LengthUnit) => string;
  /** Map een rij naar (x, y) of `null` als de rij voor dit type geen waarde heeft. */
  pointOf: (row: ExtendedRow) => { x: number; y: number } | null;
}

export const GRAPH_TYPES: Record<GraphTypeKey, GraphTypeDef> = {
  "x-t": {
    key: "x-t",
    label: "x tegen t",
    minPoints: 1,
    isTimeAxis: true,
    isAcceleration: false,
    xLabel: () => "t (s)",
    yLabel: (u) => `x (${u})`,
    pointOf: (r) => (Number.isFinite(r.x) ? { x: r.t, y: r.x } : null),
  },
  "y-t": {
    key: "y-t",
    label: "y tegen t",
    minPoints: 1,
    isTimeAxis: true,
    isAcceleration: false,
    xLabel: () => "t (s)",
    yLabel: (u) => `y (${u})`,
    pointOf: (r) => (Number.isFinite(r.y) ? { x: r.t, y: r.y } : null),
  },
  "vx-t": {
    key: "vx-t",
    label: "vx tegen t",
    minPoints: 2,
    isTimeAxis: true,
    isAcceleration: false,
    xLabel: () => "t (s)",
    yLabel: (u) => `vx (${u}/s)`,
    pointOf: (r) => (r.vx === undefined ? null : { x: r.t, y: r.vx }),
  },
  "vy-t": {
    key: "vy-t",
    label: "vy tegen t",
    minPoints: 2,
    isTimeAxis: true,
    isAcceleration: false,
    xLabel: () => "t (s)",
    yLabel: (u) => `vy (${u}/s)`,
    pointOf: (r) => (r.vy === undefined ? null : { x: r.t, y: r.vy }),
  },
  "vmag-t": {
    key: "vmag-t",
    label: "|v| tegen t",
    minPoints: 2,
    isTimeAxis: true,
    isAcceleration: false,
    xLabel: () => "t (s)",
    yLabel: (u) => `|v| (${u}/s)`,
    pointOf: (r) => (r.vMag === undefined ? null : { x: r.t, y: r.vMag }),
  },
  "ax-t": {
    key: "ax-t",
    label: "ax tegen t",
    minPoints: 3,
    isTimeAxis: true,
    isAcceleration: true,
    xLabel: () => "t (s)",
    yLabel: (u) => `ax (${u}/s²)`,
    pointOf: (r) => (r.ax === undefined ? null : { x: r.t, y: r.ax }),
  },
  "ay-t": {
    key: "ay-t",
    label: "ay tegen t",
    minPoints: 3,
    isTimeAxis: true,
    isAcceleration: true,
    xLabel: () => "t (s)",
    yLabel: (u) => `ay (${u}/s²)`,
    pointOf: (r) => (r.ay === undefined ? null : { x: r.t, y: r.ay }),
  },
  "amag-t": {
    key: "amag-t",
    label: "|a| tegen t",
    minPoints: 3,
    isTimeAxis: true,
    isAcceleration: true,
    xLabel: () => "t (s)",
    yLabel: (u) => `|a| (${u}/s²)`,
    pointOf: (r) => (r.aMag === undefined ? null : { x: r.t, y: r.aMag }),
  },
  "y-x": {
    key: "y-x",
    label: "y tegen x (baan)",
    minPoints: 1,
    isTimeAxis: false,
    isAcceleration: false,
    xLabel: (u) => `x (${u})`,
    yLabel: (u) => `y (${u})`,
    pointOf: (r) => (Number.isFinite(r.x) && Number.isFinite(r.y) ? { x: r.x, y: r.y } : null),
  },
};

export const GRAPH_TYPE_ORDER: GraphTypeKey[] = [
  "x-t",
  "y-t",
  "vx-t",
  "vy-t",
  "vmag-t",
  "ax-t",
  "ay-t",
  "amag-t",
  "y-x",
];

/**
 * Welke coordinaat-fits zijn relevant voor dit grafiektype?
 *  - `x-t`, `vx-t`, `ax-t`        → alleen x-fit
 *  - `y-t`, `vy-t`, `ay-t`        → alleen y-fit
 *  - `vmag-t`, `amag-t`, `y-x`    → beide (combineren x én y)
 *
 * Gebruikt door de pane-Fit-knop (welke globale FitConfig moet non-`none` zijn
 * voordat de knop werkt) en door fit-rendering om te weten welke curves
 * uitgerekend moeten worden.
 */
export type FitNeed = "x" | "y" | "both";

export function graphFitNeed(type: GraphTypeKey): FitNeed {
  switch (type) {
    case "x-t":
    case "vx-t":
    case "ax-t":
      return "x";
    case "y-t":
    case "vy-t":
    case "ay-t":
      return "y";
    case "vmag-t":
    case "amag-t":
    case "y-x":
      return "both";
  }
}

/**
 * Bouw `ChartPoint[]` voor één pane. `meta` bevat het frame zodat klik-/hover-
 * events terug kunnen mappen naar de video-tijdlijn.
 */
export function buildPoints(rows: ExtendedRow[], def: GraphTypeDef): ChartPoint[] {
  const out: ChartPoint[] = [];
  for (const row of rows) {
    const p = def.pointOf(row);
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    out.push({
      x: p.x,
      y: p.y,
      dimmed: !row.withinTrim,
      meta: { frame: row.frame },
    });
  }
  return out;
}

/** Lineair interpoleren van y op x; voor info-balk-aflezing bij meet-lijnen. */
export function interpolateY(x: number, points: ChartPoint[]): number | null {
  if (!points.length || !Number.isFinite(x)) return null;
  // Punten zijn al gesorteerd op x (oplopend) voor t-types; voor y-x niet
  // gegarandeerd, maar de meet-lijnen worden in dat geval toch niet getoond.
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].x >= x) {
      const a = points[i - 1];
      const b = points[i];
      if (b.x === a.x) return a.y;
      return a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
    }
  }
  return null;
}
