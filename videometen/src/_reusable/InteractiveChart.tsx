/**
 * @reusable
 * @category data
 * @description Interactieve grafiek-component op basis van Chart.js (line +
 *   scatter) met:
 *   - playhead (verticale stippellijn op een data-x-waarde)
 *   - raaklijn-overlay met `dy/dx`-label
 *   - twee sleepbare meet-lijnen met x-waardes uit consumer-state
 *   - wheel/pinch zoom + pan via `chartjs-plugin-zoom`
 *   - klik / hover events met data-index info
 *   - theme-aware kleuren via `useThemeColors`
 *   - gedimde punten (uit-trim-range): opacity ~0.35 + lijn-break
 *
 *   Bewust geen domein-kennis: kent geen `MeasurementRow`, geen frame-nummer,
 *   geen video-context. Bedoeld als basis voor data-analyse-tools (videometen,
 *   straks ook modelleren na React-migratie).
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Chart,
  type ChartConfiguration,
  type ChartDataset,
  type ChartOptions,
  type Point,
  type ScatterDataPoint,
} from "chart.js";

import { ensureChartPluginsRegistered } from "@/_reusable/chart-plugins";
import { niceAxis } from "@/_reusable/niceAxis";
import { useThemeColors, type ThemeColors } from "@/_reusable/useThemeColors";

ensureChartPluginsRegistered();

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ChartPoint {
  x: number;
  y: number;
  /** Consumer-meta. InteractiveChart raakt 'm niet aan; geeft 'm terug in events. */
  meta?: unknown;
  /** Gedimd weergeven (opacity ~0.35) en geen verbindingslijn naar/van. */
  dimmed?: boolean;
}

export interface ChartSeries {
  label: string;
  points: ChartPoint[];
  /** Default: theme-accent. */
  color?: string;
  /** Default `true`. */
  showLine?: boolean;
  /** Default `false`. */
  dashed?: boolean;
  /**
   * Default `false`. Render alleen de lijn — geen individuele punt-markers,
   * geen hover-radius. Voor dichte gesample-de curves (bv. fit-curves van
   * 200 punten) waar de losse punten visueel ruis zouden zijn.
   *
   * Klik-/hover-events vuren nog steeds via `findNearestSeriesHit`. Wil je
   * de serie ook *negeren* voor events, dan moet de consumer in zijn
   * eigen `onPointClick`/`onPointHover` op `seriesIdx` filteren.
   */
  lineOnly?: boolean;
  /**
   * Default `false`. Sluit deze serie uit van de autozoom-bounds-berekening
   * (de `niceAxis`-range wanneer er geen expliciete zoomState is). Voor
   * fit-extrapolatie-segmenten die ver buiten de meetdata kunnen uitlopen —
   * die mogen de as-schaling niet kapotrekken (07g).
   *
   * - `true`  → tellen niet mee voor x én y.
   * - `"y"`   → tellen wel mee voor de x-as, niet voor de y-as (07j). De
   *   x-as groeit dus mee zodat het segment zichtbaar wordt, maar een
   *   blow-up-curve rekt de y-as niet kapot. Voor zone-C-extrapolatie: de
   *   x-as moet uitbreiden om de voorspelling te tonen, de y-as blijft op
   *   de meetdata geschaald.
   */
  excludeFromAutozoom?: boolean | "y";
}

export interface TangentConfig {
  active: boolean;
  /** Index in `series[0].points` waar de raaklijn berekend wordt. */
  atIdx?: number | null;
  /**
   * Analytische override: gebruik deze `(x, y, slope)` i.p.v. central-
   * difference op series[0]. Bedoeld voor consumers die hun raaklijn op
   * een (verborgen) gefitte functie willen baseren — bijvoorbeeld
   * videometen wanneer de leerling fit én raaklijn allebei aan zet.
   * Wanneer aanwezig: `atIdx` wordt genegeerd, label wordt opgebouwd uit
   * `slope`, anker komt op `(x, y)`.
   */
  override?: { x: number; y: number; slope: number } | null;
}

export interface MeasureLinesConfig {
  x1: number | null;
  x2: number | null;
  onChange?: (next: { x1: number | null; x2: number | null }) => void;
}

export interface ZoomState {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface PointHoverInfo {
  seriesIdx: number;
  pointIdx: number;
  point: ChartPoint;
}

/**
 * Inschakeling van as-sleep (pan + zoom door drag op de as zelf). Default
 * beide aan. Voor een t-as die je bv. door een externe knop wilt resetten,
 * kun je `x: false` doorgeven.
 */
export interface AxisDragConfig {
  x?: boolean;
  y?: boolean;
}

/**
 * Verticale band tussen `xMin` en `xMax` op de data-x-as, met optionele
 * rand-lijntjes. Voor het visualiseren van sub-ranges (bv. een fit-range
 * binnen een grotere t-as). `null` = niet renderen.
 */
export interface XBandConfig {
  xMin: number;
  xMax: number;
  fill?: string;
  border?: string;
}

export interface InteractiveChartProps {
  series: ChartSeries[];
  xLabel: string;
  yLabel: string;
  playheadX?: number | null;
  selectedIdx?: number | null;
  hoveredIdx?: number | null;
  tangent?: TangentConfig;
  measureLines?: MeasureLinesConfig;
  /** Achtergrond-band op de x-as (data-coords). Default: niet renderen. */
  xBand?: XBandConfig | null;
  /**
   * 07l-architectuur: de Chart.js-instance is de AUTORITATIEVE eigenaar van
   * de zoom-stand. `initialZoomState` wordt ALLEEN bij mount geconsumeerd —
   * latere wijzigingen worden genegeerd. Voor het herstellen van een
   * opgeslagen zoom (project-load / mode-switch) wordt de pane geremount,
   * waardoor de nieuwe waarde alsnog wordt toegepast. `null`/`undefined` =
   * autozoom op de data-bounds (niceAxis).
   */
  initialZoomState?: ZoomState | null;
  /**
   * Emit bij ELKE interne zoom-wijziging (wheel, pan, as-sleep) en bij reset
   * (`null`). De parent bewaart de waarde in z'n eigen state (voor save/load).
   * Er is GEEN sync terug naar de chart — de chart heeft de wijziging al zelf
   * doorgevoerd.
   */
  onZoomChange?: (z: ZoomState | null) => void;
  /**
   * Counter-trigger: bij elke wijziging roept de chart `resetZoom('none')` aan
   * en emit `null`. De Auto-zoom-knop in de consumer verhoogt 'm. De
   * initiële waarde (bij mount) triggert niets.
   */
  resetTrigger?: number;
  onPointClick?: (seriesIdx: number, pointIdx: number, point: ChartPoint) => void;
  onAreaClick?: (x: number) => void;
  onPointHover?: (info: PointHoverInfo | null) => void;
  themeMode?: "light" | "dark";
  height?: number | string;
  showLegend?: boolean;
  /**
   * Wordt eenmalig aangeroepen zodra de Chart.js-instance bestaat. Bedoeld
   * voor imperatieve operaties zoals `chart.toBase64Image()` of `resetZoom`.
   * De caller is verantwoordelijk voor het *niet* langer vasthouden van de
   * referentie nadat de chart is gedestroyed (cleanup levert `null`).
   */
  onChartReady?: (chart: Chart | null) => void;
  /** As-sleep aan/uit per as. Default: beide aan. */
  axisDrag?: AxisDragConfig;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtNum(v: number): string {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e5 || abs < 1e-3) return v.toExponential(2).replace(".", ",");
  return String(+v.toPrecision(4)).replace(".", ",");
}

/** Extract de eenheid tussen haakjes uit een as-label: `"x (m)" → "m"`, `"baan" → ""`. */
function unitFromLabel(label: string): string {
  const m = label.match(/\(([^)]+)\)/);
  return m ? m[1] : "";
}

/** Eerste woord (variabelenaam): `"x (m)" → "x"`. */
function varFromLabel(label: string): string {
  return label.split(" ")[0] ?? "";
}

interface TangentLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  slope: number;
  label: string;
}

/**
 * Berekent de raaklijn (central difference) op `points[atIdx]` en strekt 'm
 * uit van `xViewMin` tot `xViewMax` — de huidige zichtbare x-range, dus
 * inclusief eventuele zoom-state. Chart.js's `clip: true` clipt 'm netjes
 * binnen het y-vlak als de slope steil is.
 */
function computeTangent(
  points: ChartPoint[],
  atIdx: number,
  xLabel: string,
  yLabel: string,
  xViewMin: number,
  xViewMax: number,
): TangentLine | null {
  if (atIdx < 0 || atIdx >= points.length || points.length < 2) return null;
  const i1 = Math.max(0, atIdx - 1);
  const i2 = Math.min(points.length - 1, atIdx + 1);
  const p1 = points[i1];
  const p2 = points[i2];
  if (i1 === i2) return null;
  const slope = (p2.y - p1.y) / (p2.x - p1.x);
  if (!Number.isFinite(slope)) return null;
  const cx = points[atIdx].x;
  const cy = points[atIdx].y;
  const xUnit = unitFromLabel(xLabel);
  const yUnit = unitFromLabel(yLabel);
  const slopeUnit = yUnit && xUnit ? ` ${yUnit}/${xUnit}` : yUnit ? ` ${yUnit}` : "";
  const yVar = varFromLabel(yLabel);
  const xVar = varFromLabel(xLabel);
  // Lijn-uiteinden op de zichtbare-as-randen; Chart.js clipt zelf binnen
  // het y-vlak via dataset `clip: true`.
  return {
    x1: xViewMin,
    y1: cy + slope * (xViewMin - cx),
    x2: xViewMax,
    y2: cy + slope * (xViewMax - cx),
    midX: cx,
    midY: cy,
    slope,
    label: `d${yVar}/d${xVar} = ${fmtNum(slope)}${slopeUnit}`,
  };
}

interface BuildArgs {
  props: InteractiveChartProps;
  colors: ThemeColors;
}

/** Bouwt een complete `ChartConfiguration` uit props + huidige theme-colors. */
function buildConfig({ props, colors }: BuildArgs): ChartConfiguration<"line", ScatterDataPoint[]> {
  const {
    series,
    xLabel,
    yLabel,
    playheadX = null,
    selectedIdx = null,
    hoveredIdx = null,
    tangent,
    measureLines,
    xBand = null,
    showLegend = false,
  } = props;

  const datasets: ChartDataset<"line", ScatterDataPoint[]>[] = [];

  // ---- As-bereiken eerst zodat we ze later bij raaklijn-uiteinden gebruiken.
  // 07g/07j: series met `excludeFromAutozoom` tellen niet (of deels niet) mee.
  // Fit-extrapolatie kan ver buiten de meetdata uitlopen en zou de autozoom-
  // schaal kapotrekken. `true` = uit voor x én y; `"y"` = wel x, niet y, zodat
  // de x-as meegroeit om het extrapolatie-segment te tonen terwijl een blow-up-
  // curve de y-as niet kapotrekt.
  const allX: number[] = [];
  const allY: number[] = [];
  series.forEach((s) => {
    const ex = s.excludeFromAutozoom;
    if (ex === true) return; // uit voor beide assen
    s.points.forEach((p) => {
      if (Number.isFinite(p.x)) allX.push(p.x);
      if (ex !== "y" && Number.isFinite(p.y)) allY.push(p.y);
    });
  });
  const isTimeAxis = xLabel.trim().startsWith("t ");
  const xAxisBounds =
    allX.length > 0
      ? niceAxis(isTimeAxis ? 0 : Math.min(...allX), Math.max(...allX), {
          pinMin: isTimeAxis,
          padTop: false,
        })
      : { min: 0, max: 1 };
  const yAxisBounds =
    allY.length > 0
      ? (() => {
          const yLo = Math.min(...allY);
          return niceAxis(yLo >= 0 ? 0 : yLo, Math.max(...allY), {
            pinMin: yLo >= 0,
            padTop: true,
          });
        })()
      : { min: 0, max: 1 };

  // 07l: buildConfig levert ALTIJD de autozoom-bounds (niceAxis). De
  // mount- en sync-effects overschrijven `scales.x/y.min/max` waar nodig
  // (initiële zoom bij mount, of behoud van de chart's huidige stand bij
  // een sync wanneer de gebruiker zelf gezoomd heeft). buildConfig kent de
  // zoom-stand dus niet meer — dat voorkomt de race uit 07f–07k.
  const xMin = xAxisBounds.min;
  const xMax = xAxisBounds.max;
  const yMin = yAxisBounds.min;
  const yMax = yAxisBounds.max;

  // ---- Series-datasets (één per serie). ---------------------------------
  series.forEach((s) => {
    const baseColor = s.color ?? colors.accent;
    const showLine = s.showLine !== false;
    const lineOnly = !!s.lineOnly;
    const data: (ScatterDataPoint | null)[] = s.points.map((p) => ({ x: p.x, y: p.y }));

    // Per-point background-color array: dimmed punten lager-opaque.
    const pointBg = s.points.map((p) =>
      p.dimmed ? withAlpha(baseColor, 0.35) : baseColor,
    );
    const pointRadius = lineOnly ? 0 : s.points.map((p) => (p.dimmed ? 3 : 3.5));

    datasets.push({
      label: s.label,
      data: data as ScatterDataPoint[],
      borderColor: baseColor,
      backgroundColor: pointBg,
      pointBackgroundColor: pointBg,
      pointBorderColor: pointBg,
      pointRadius,
      // Iets groter bolletje bij hover voor visuele feedback; klik-hit-detection
      // doen we sinds 05f volledig zelf (zie `findNearestSeriesHit`).
      pointHoverRadius: lineOnly ? 0 : 8,
      borderWidth: lineOnly ? 2.2 : 1.8,
      borderDash: s.dashed ? [6, 3] : undefined,
      tension: 0,
      showLine,
      fill: false,
      spanGaps: false,
      parsing: false,
      // Break line door of naar dimmed punten zodat de connector niet over de "gap" loopt.
      segment: showLine
        ? {
            borderColor: (ctx) => {
              const p0 = s.points[ctx.p0DataIndex];
              const p1 = s.points[ctx.p1DataIndex];
              if (p0?.dimmed || p1?.dimmed) return "rgba(0,0,0,0)";
              return baseColor;
            },
          }
        : undefined,
    } as ChartDataset<"line", ScatterDataPoint[]>);
  });

  // ---- Selected point overlay -------------------------------------------
  // Vaste fel-rode contrast-kleur (consistent met modelleren's `pointSelected`)
  // zodat de actieve dot in elke grafiek altijd opvalt, ongeacht de trail-
  // kleur-cycle die de leerling op de video heeft gekozen.
  const firstSeries = series[0];
  if (
    selectedIdx != null &&
    firstSeries &&
    selectedIdx >= 0 &&
    selectedIdx < firstSeries.points.length
  ) {
    const p = firstSeries.points[selectedIdx];
    datasets.push({
      label: "Geselecteerd",
      data: [{ x: p.x, y: p.y }],
      showLine: false,
      backgroundColor: "#ef4444",
      borderColor: "#ffffff",
      pointRadius: 7,
      pointHoverRadius: 8,
      borderWidth: 2,
      parsing: false,
    } as ChartDataset<"line", ScatterDataPoint[]>);
  }

  // ---- Hovered point overlay (subtieler dan selected) -------------------
  if (
    hoveredIdx != null &&
    hoveredIdx !== selectedIdx &&
    firstSeries &&
    hoveredIdx >= 0 &&
    hoveredIdx < firstSeries.points.length
  ) {
    const p = firstSeries.points[hoveredIdx];
    datasets.push({
      label: "Hovered",
      data: [{ x: p.x, y: p.y }],
      showLine: false,
      backgroundColor: "rgba(0,0,0,0)",
      borderColor: colors.accent,
      pointRadius: 5,
      pointHoverRadius: 5,
      borderWidth: 1.5,
      parsing: false,
    } as ChartDataset<"line", ScatterDataPoint[]>);
  }

  // ---- Raaklijn ---------------------------------------------------------
  // Uitgestrekt van xMin tot xMax (huidige zichtbare range, inclusief zoom).
  // De default Chart.js clip clipt automatisch aan het chart-area-vlak —
  // bij steile slopes valt het overschot netjes weg.
  let tangentLine: TangentLine | null = null;
  let tangentAnchorX: number | null = null;
  if (tangent?.active && firstSeries) {
    if (tangent.override) {
      const { x, y, slope } = tangent.override;
      if (Number.isFinite(slope) && Number.isFinite(x) && Number.isFinite(y)) {
        const xUnit = unitFromLabel(xLabel);
        const yUnit = unitFromLabel(yLabel);
        const slopeUnit =
          yUnit && xUnit ? ` ${yUnit}/${xUnit}` : yUnit ? ` ${yUnit}` : "";
        const yVar = varFromLabel(yLabel);
        const xVar = varFromLabel(xLabel);
        tangentLine = {
          x1: xMin,
          y1: y + slope * (xMin - x),
          x2: xMax,
          y2: y + slope * (xMax - x),
          midX: x,
          midY: y,
          slope,
          label: `d${yVar}/d${xVar} = ${fmtNum(slope)}${slopeUnit}`,
        };
        tangentAnchorX = x;
      }
    } else {
      const atIdx = tangent.atIdx ?? selectedIdx ?? hoveredIdx ?? firstSeries.points.length - 1;
      tangentLine = computeTangent(firstSeries.points, atIdx, xLabel, yLabel, xMin, xMax);
      if (tangentLine) {
        // X van de actieve dot — gebruikt door de plugin om het label aan
        // het verste uiteinde van de raaklijn te plaatsen.
        tangentAnchorX = firstSeries.points[atIdx]?.x ?? null;
      }
    }
    if (tangentLine) {
      datasets.push({
        label: "Raaklijn",
        data: [
          { x: tangentLine.x1, y: tangentLine.y1 },
          { x: tangentLine.x2, y: tangentLine.y2 },
        ],
        borderColor: colors.accentAmber,
        backgroundColor: "rgba(0,0,0,0)",
        borderWidth: 3,
        borderDash: [6, 3],
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
        parsing: false,
      } as ChartDataset<"line", ScatterDataPoint[]>);
    }
  }

  const options: ChartOptions<"line"> = {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", axis: "xy", intersect: false },
    plugins: {
      legend: { display: showLegend, labels: { color: colors.textSecondary } },
      tooltip: {
        callbacks: {
          // 07f: titel toont ALTIJD `[dataset-label] · [xLabel]: x` als er
          // een dataset-label is. Voorheen werd 't label weggelaten als 't
          // gelijk was aan yLabel — dat liet de y-waarde-regel "leeg" lijken
          // omdat de label-regel hetzelfde toonde. Nu krijgt elke serie z'n
          // eigen tag (bv. "Ruwe meting", "Fit") + de x-waarde op de
          // titelregel, en de y-waarde op een aparte tweede regel.
          title: (items) => {
            const x = items[0]?.parsed?.x;
            const xPart = `${xLabel}: ${typeof x === "number" ? fmtNum(x) : "—"}`;
            const dsLabel = items[0]?.dataset?.label;
            if (typeof dsLabel === "string" && dsLabel) {
              return `${dsLabel} · ${xPart}`;
            }
            return xPart;
          },
          label: (item) => {
            const y = item.parsed?.y;
            return `${yLabel}: ${typeof y === "number" ? fmtNum(y) : "—"}`;
          },
        },
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "xy",
        },
        pan: { enabled: true, mode: "xy" },
        limits: {
          x: { minRange: 1e-9 },
          y: { minRange: 1e-9 },
        },
      },
      playhead: {
        x: playheadX,
        color: withAlpha(colors.textMuted, 0.65),
      },
      tangentLabel: tangentLine
        ? {
            label: tangentLine.label,
            midX: tangentLine.midX,
            midY: tangentLine.midY,
            // Eindpunten + anker doorgeven zodat de plugin dynamisch het
            // label aan het verste uiteinde plaatst (weg van de rode dot).
            x1: tangentLine.x1,
            y1: tangentLine.y1,
            x2: tangentLine.x2,
            y2: tangentLine.y2,
            anchorX: tangentAnchorX ?? undefined,
            color: colors.accentAmber,
          }
        : null,
      measureLines: {
        active: !!measureLines && (measureLines.x1 != null || measureLines.x2 != null),
        x1: measureLines?.x1 ?? null,
        x2: measureLines?.x2 ?? null,
      },
      xBand: {
        active: !!xBand,
        xMin: xBand?.xMin ?? 0,
        xMax: xBand?.xMax ?? 0,
        fill: xBand?.fill,
        border: xBand?.border,
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: xLabel, color: colors.textSecondary, font: { size: 11 } },
        grid: { color: colors.grid },
        ticks: { color: colors.textMuted, maxTicksLimit: 8, callback: (v) => fmtNum(Number(v)) },
        min: xMin,
        max: xMax,
      },
      y: {
        type: "linear",
        title: { display: true, text: yLabel, color: colors.textSecondary, font: { size: 11 } },
        grid: { color: colors.grid },
        ticks: { color: colors.textMuted, maxTicksLimit: 6, callback: (v) => fmtNum(Number(v)) },
        min: yMin,
        max: yMax,
      },
    },
  };

  return {
    type: "line",
    data: { datasets },
    options,
  } satisfies ChartConfiguration<"line", ScatterDataPoint[]>;
}

/** Convert hex / named color naar rgba met opgegeven alpha. Best-effort. */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (color.startsWith("rgb(")) return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  if (color.startsWith("rgba(")) return color.replace(/, *[\d.]+\)$/, `, ${alpha})`);
  return color;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const HANDLE_SIZE = 14;

export function InteractiveChart(props: InteractiveChartProps) {
  const colors = useThemeColors();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart<"line", ScatterDataPoint[]> | null>(null);
  // Props in een ref zodat event-handlers altijd de actuele callbacks zien
  // zonder dat we de chart bij elke prop-wijziging hoeven te re-creëren.
  const propsRef = useRef(props);
  propsRef.current = props;

  // Suppress emit tijdens onze eigen programmatische `chart.resetZoom` zodat
  // die geen onZoom-callback → spurious `onZoomChange` veroorzaakt.
  const suppressZoomCallback = useRef(false);

  // 07l: heeft de gebruiker zelf gezoomd/gepand (wheel, pan, as-sleep)?
  // Bepaalt of de sync-effect de chart-stand BEHOUDT (true → niet refitten
  // bij nieuwe data) of AUTOZOOMT (false → niceAxis op de data). Wordt op
  // `true` gezet bij elke interne wijziging en op `false` bij reset. Naast
  // de plugin-API `isZoomedOrPanned` (die de wheel/pan dekt maar niet onze
  // eigen as-sleep) — zie `isUserZoomed`.
  const userZoomedRef = useRef(false);

  // 07l: laatst geziene `resetTrigger`-waarde, om een echte wijziging (Auto
  // zoom-klik) te onderscheiden van de initiële mount.
  const prevResetTriggerRef = useRef<number | undefined>(props.resetTrigger);

  const seriesCount = props.series.length;
  const seriesCountRef = useRef(seriesCount);
  seriesCountRef.current = seriesCount;

  // Geometry van de chart in canvas-CSS-pixel-coords: nodig voor zowel
  // meet-lijn-handles als de as-sleep-overlays. Geupdate na elke chart.update
  // en bij resizes.
  interface ChartGeometry {
    area: { top: number; right: number; bottom: number; left: number; width: number; height: number };
    canvas: { width: number; height: number };
    measureHandles: { x1: number | null; x2: number | null; handleTop: number };
  }
  const [geometry, setGeometry] = useState<ChartGeometry | null>(null);

  const updateGeometry = useCallback(() => {
    const chart = chartRef.current;
    if (!chart || !chart.chartArea || !chart.scales.x) {
      setGeometry((g) => (g === null ? g : null));
      return;
    }
    const area = chart.chartArea;
    const canvasEl = chart.canvas;
    // Canvas-CSS-size (niet buffer-size, die heeft DPR-scaling).
    const rect = canvasEl.getBoundingClientRect();
    const xs = chart.scales.x;
    const cfg = propsRef.current.measureLines;
    const compute = (xv: number | null) =>
      xv == null || !Number.isFinite(xv) ? null : xs.getPixelForValue(xv);
    const next: ChartGeometry = {
      area: {
        top: area.top,
        right: area.right,
        bottom: area.bottom,
        left: area.left,
        width: area.right - area.left,
        height: area.bottom - area.top,
      },
      canvas: { width: rect.width, height: rect.height },
      measureHandles: {
        x1: cfg ? compute(cfg.x1) : null,
        x2: cfg ? compute(cfg.x2) : null,
        handleTop: area.top - HANDLE_SIZE / 2,
      },
    };
    setGeometry(next);
  }, []);
  // Behoud signatuur-compat naam (oude calls).
  const positionHandles = updateGeometry;

  // ---- Chart lifecycle (mount/unmount) ----------------------------------
  // 07l: ALLEEN bij mount wordt `initialZoomState` toegepast. De chart is
  // daarna autoritatief eigenaar van z'n zoom-stand.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cfg = buildConfig({ props: propsRef.current, colors });
    // Initiële zoom toepassen (opgeslagen stand uit project / mode-switch).
    const initialZs = propsRef.current.initialZoomState ?? null;
    if (initialZs && cfg.options?.scales) {
      applyScalesToCfg(cfg.options.scales, initialZs);
      userZoomedRef.current = true; // herstelde zoom = niet-autozoom
    }
    if (cfg.options) {
      // Geen `options.onClick`/`options.onHover` meer: die zijn in deze setup
      // niet betrouwbaar gevuurd (zie commentaar op de canvas-listener-effect
      // hieronder). De zoom/pan-callbacks van chartjs-plugin-zoom blijven wel
      // via de chart-options lopen — die werken probleemloos.
      const zoomCfg = cfg.options.plugins?.zoom;
      if (zoomCfg) {
        zoomCfg.zoom = {
          ...(zoomCfg.zoom ?? {}),
          onZoom: ({ chart }) => emitZoom(chart, suppressZoomCallback, propsRef, userZoomedRef),
        };
        zoomCfg.pan = {
          ...(zoomCfg.pan ?? {}),
          onPan: ({ chart }) => emitZoom(chart, suppressZoomCallback, propsRef, userZoomedRef),
        };
      }
    }
    const chart = new Chart<"line", ScatterDataPoint[]>(ctx, cfg);
    chartRef.current = chart;
    positionHandles();
    // Geef de chart-instance aan de caller — bv. voor PNG-export.
    propsRef.current.onChartReady?.(chart as unknown as Chart);
    return () => {
      propsRef.current.onChartReady?.(null);
      chart.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // we sync deps via een aparte effect — chart wordt eenmalig gemaakt

  // ---- Options/data-sync (07l) -------------------------------------------
  //
  // GEEN prop-driven zoom-sync meer. De chart is autoritatief eigenaar van
  // z'n scales. Deze effect houdt alléén de NIET-zoom-aspecten in sync
  // (datasets, raaklijn, meet-lijnen, xBand, labels, kleuren) en beslist op
  // basis van ÉÉN heldere vraag — `isUserZoomed(chart)` — wat er met de
  // scale-bounds gebeurt:
  //   - Gebruiker heeft zelf gezoomd → BEHOUD de chart's huidige scales
  //     (kopieer ze in cfg vóór de options-assignment, zodat die assignment
  //     de zoom niet wegvaagt). Dekt eis 7/9/11/12 (mouseleave, toggles,
  //     navigatie, hover → geen reset) en eis 10b (nieuwe data bij zoom →
  //     behoud).
  //   - Niet gezoomd → gebruik cfg's verse niceAxis-autozoom op de actuele
  //     data. Dekt eis 6 (initiële autozoom) en eis 10a (nieuwe data →
  //     refit).
  //
  // Dit is geen race meer: er is geen vergelijking tussen prop-waardes met
  // verschillende timings. `isUserZoomed` bevraagt de werkelijke chart-/
  // plugin-stand (autoriteit).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const cfg = buildConfig({ props, colors });
    chart.data = cfg.data;
    if (cfg.options) {
      if (isUserZoomed(chart, userZoomedRef) && cfg.options.scales) {
        // Behoud: kopieer chart's huidige scales in cfg vóór de assignment.
        const sx = cfg.options.scales.x as { min?: number; max?: number } | undefined;
        const sy = cfg.options.scales.y as { min?: number; max?: number } | undefined;
        if (sx && chart.scales.x?.min != null && chart.scales.x?.max != null) {
          sx.min = chart.scales.x.min;
          sx.max = chart.scales.x.max;
        }
        if (sy && chart.scales.y?.min != null && chart.scales.y?.max != null) {
          sy.min = chart.scales.y.min;
          sy.max = chart.scales.y.max;
        }
      }
      // (Niet gezoomd → cfg houdt z'n verse niceAxis-bounds → autozoom-refit.)
      const prevZoomCb = chart.options.plugins?.zoom?.zoom?.onZoom;
      const prevPanCb = chart.options.plugins?.zoom?.pan?.onPan;
      chart.options = cfg.options;
      // Bewaar de stabiele zoom/pan-callbacks; buildConfig zet ze niet.
      if (chart.options.plugins?.zoom) {
        if (chart.options.plugins.zoom.zoom)
          chart.options.plugins.zoom.zoom.onZoom = prevZoomCb;
        if (chart.options.plugins.zoom.pan) chart.options.plugins.zoom.pan.onPan = prevPanCb;
      }
    }
    chart.update("none");
    positionHandles();
  }, [props, colors, positionHandles]);

  // ---- Reset-trigger (07l) -----------------------------------------------
  // De Auto-zoom-knop in de consumer verhoogt `resetTrigger`. Bij een echte
  // wijziging (niet de initiële mount): plugin-zoomstaat wissen, ownership
  // resetten, en `null` emit zodat de parent z'n opgeslagen zoom op `null`
  // zet. De daaropvolgende options-sync ziet `isUserZoomed === false` en
  // past de verse niceAxis-autozoom toe.
  useEffect(() => {
    const trigger = props.resetTrigger;
    if (prevResetTriggerRef.current === trigger) return; // initiële mount
    prevResetTriggerRef.current = trigger;
    const chart = chartRef.current;
    if (!chart) return;
    suppressZoomCallback.current = true;
    chart.resetZoom("none");
    suppressZoomCallback.current = false;
    userZoomedRef.current = false;
    propsRef.current.onZoomChange?.(null);
    positionHandles();
  }, [props.resetTrigger, positionHandles]);

  // ---- Klik/hover via directe canvas-listeners --------------------------
  // Chart.js' `options.onClick` / `options.onHover` bleek in deze setup niet
  // betrouwbaar te vuren (de canvas ontving wel native events, maar Chart.js'
  // event-router riep onze callbacks niet aan — vermoedelijk een plugin- of
  // config-conflict). Directe canvas-listeners zijn robuuster en geven
  // volledige controle over hit-detection en callback-routing.
  //
  // We lezen `propsRef.current.*` zodat de listeners niet hoeven te
  // re-binden bij elke prop-wijziging. De cleanup verwijdert alle drie de
  // listeners — `chart.destroy()` zit in het lifecycle-effect hierboven.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = chart.canvas as HTMLCanvasElement;
    if (!canvas) return;

    const handleClick = (e: PointerEvent | MouseEvent) => {
      const c = chartRef.current;
      if (!c) return;
      const cur = cursorPxFromNative(e, c);
      if (!cur) return;
      const props = propsRef.current;
      const seriesCount = seriesCountRef.current;
      const hit = findNearestSeriesHit(c, cur.cx, cur.cy, seriesCount);
      if (hit && hit.distSq <= POINT_HIT_RADIUS_PX * POINT_HIT_RADIUS_PX) {
        const point = props.series[hit.datasetIndex]?.points[hit.index];
        if (point) {
          props.onPointClick?.(hit.datasetIndex, hit.index, point);
          return;
        }
      }
      // Lege-area-klik: geïnterpoleerde x via de scale.
      const xs = c.scales.x;
      if (!props.onAreaClick || !xs) return;
      const xv = xs.getValueForPixel(cur.cx);
      if (xv == null || !Number.isFinite(xv)) return;
      props.onAreaClick(xv);
    };

    const handleMove = (e: PointerEvent | MouseEvent) => {
      const c = chartRef.current;
      if (!c) return;
      const props = propsRef.current;
      if (!props.onPointHover) return;
      const cur = cursorPxFromNative(e, c);
      if (!cur) {
        props.onPointHover(null);
        return;
      }
      const seriesCount = seriesCountRef.current;
      const hit = findNearestSeriesHit(c, cur.cx, cur.cy, seriesCount);
      if (!hit || hit.distSq > POINT_HIT_RADIUS_PX * POINT_HIT_RADIUS_PX) {
        props.onPointHover(null);
        return;
      }
      const point = props.series[hit.datasetIndex]?.points[hit.index];
      if (!point) {
        props.onPointHover(null);
        return;
      }
      props.onPointHover({ seriesIdx: hit.datasetIndex, pointIdx: hit.index, point });
    };

    const handleLeave = () => {
      propsRef.current.onPointHover?.(null);
    };

    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("pointermove", handleMove);
    canvas.addEventListener("pointerleave", handleLeave);

    return () => {
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerleave", handleLeave);
    };
    // Hangt af van de chart-creatie. `chartRef.current` is geen reactieve
    // waarde, maar we lopen pas door dit effect na de eerste render — en
    // chartRef is dán al gevuld door het lifecycle-effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- ResizeObserver op de wrapper -------------------------------------
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const obs = new ResizeObserver(() => {
      chartRef.current?.resize();
      positionHandles();
    });
    obs.observe(wrapper);
    return () => obs.disconnect();
  }, [positionHandles]);

  // ---- Handle drag ------------------------------------------------------
  const onHandlePointerDown =
    (which: "x1" | "x2") => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const chart = chartRef.current;
      const canvas = canvasRef.current;
      const cfg = propsRef.current.measureLines;
      if (!chart || !canvas || !cfg?.onChange) return;
      const prevCursor = document.body.style.cursor;
      document.body.style.cursor = "ew-resize";
      const onMove = (ev: PointerEvent) => {
        const xs = chartRef.current?.scales.x;
        if (!xs) return;
        const rect = canvas.getBoundingClientRect();
        const px = ev.clientX - rect.left;
        const xv = xs.getValueForPixel(px);
        if (xv == null || !Number.isFinite(xv)) return;
        const sMin = xs.min ?? -Infinity;
        const sMax = xs.max ?? Infinity;
        const clamped = Math.max(sMin, Math.min(sMax, xv));
        const current = propsRef.current.measureLines;
        const next =
          which === "x1"
            ? { x1: clamped, x2: current?.x2 ?? null }
            : { x1: current?.x1 ?? null, x2: clamped };
        current?.onChange?.(next);
      };
      const onUp = () => {
        document.body.style.cursor = prevCursor;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };

  // ---- Axis drag --------------------------------------------------------
  /**
   * Start een as-sleep. `axis` = welke as wordt gemanipuleerd, `zone` = welk
   * gebied is aangeklikt (lo / mid / hi). Pan in midden, zoom vanaf de
   * uiteinden.
   *
   * 07l: de as-sleep gaat NIET via de plugin, dus de chart is hier zelf de
   * autoriteit — we schrijven de nieuwe bounds DIRECT op de chart-scales en
   * updaten, markeren `userZoomedRef` (zodat de sync-effect behoudt i.p.v.
   * autozoomt), en emiten naar de parent voor opslag.
   */
  const startAxisDrag = useCallback(
    (axis: "x" | "y", zone: "lo" | "mid" | "hi") =>
      (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const chart = chartRef.current;
        if (!chart) return;
        const xs = chart.scales.x;
        const ys = chart.scales.y;
        if (!xs || !ys) return;
        const area = chart.chartArea;
        if (!area) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const xMin0 = xs.min ?? 0;
        const xMax0 = xs.max ?? 1;
        const yMin0 = ys.min ?? 0;
        const yMax0 = ys.max ?? 1;
        const xRange = xMax0 - xMin0;
        const yRange = yMax0 - yMin0;
        const minXRange = Math.abs(xRange) / 1000 || 1e-9;
        const minYRange = Math.abs(yRange) / 1000 || 1e-9;
        const areaW = area.right - area.left;
        const areaH = area.bottom - area.top;

        const prevCursor = document.body.style.cursor;
        const cursorMap = {
          x: { mid: "grabbing", lo: "ew-resize", hi: "ew-resize" },
          y: { mid: "grabbing", lo: "ns-resize", hi: "ns-resize" },
        } as const;
        document.body.style.cursor = cursorMap[axis][zone];

        const onMove = (ev: PointerEvent) => {
          const dxPx = ev.clientX - startX;
          const dyPx = ev.clientY - startY;
          let newXMin = xMin0;
          let newXMax = xMax0;
          let newYMin = yMin0;
          let newYMax = yMax0;

          if (axis === "x") {
            const dData = (dxPx * xRange) / (areaW || 1);
            if (zone === "mid") {
              newXMin = xMin0 - dData;
              newXMax = xMax0 - dData;
            } else if (zone === "lo") {
              // Lo-zone = lager-x-eind. Drag rechts → xMin omhoog (zoom in
              // vanaf het linker-eind). Clamp om minimum-range te bewaren.
              newXMin = Math.min(xMax0 - minXRange, xMin0 + dData);
            } else {
              // Hi-zone = hoger-x-eind. Drag rechts → xMax omhoog (zoom uit
              // rechts) / drag links → xMax omlaag (zoom in rechts).
              newXMax = Math.max(xMin0 + minXRange, xMax0 + dData);
            }
          } else {
            // Schermy is geïnverteerd t.o.v. data-y: positief Δpx-scherm =
            // negatief Δdata-y.
            const dData = (-dyPx * yRange) / (areaH || 1);
            if (zone === "mid") {
              newYMin = yMin0 - dData;
              newYMax = yMax0 - dData;
            } else if (zone === "lo") {
              // Lo-zone = data-y_min kant = schermbeneden.
              newYMin = Math.min(yMax0 - minYRange, yMin0 + dData);
            } else {
              // Hi-zone = data-y_max kant = schermboven.
              newYMax = Math.max(yMin0 + minYRange, yMax0 + dData);
            }
          }

          // 07l: schrijf direct op de chart-scales (chart is autoriteit) en
          // update. Daarna ownership markeren + emiten voor opslag.
          const liveChart = chartRef.current;
          if (liveChart?.options.scales) {
            applyScalesToCfg(liveChart.options.scales, {
              xMin: newXMin,
              xMax: newXMax,
              yMin: newYMin,
              yMax: newYMax,
            });
            liveChart.update("none");
          }
          userZoomedRef.current = true;
          propsRef.current.onZoomChange?.({
            xMin: newXMin,
            xMax: newXMax,
            yMin: newYMin,
            yMax: newYMax,
          });
        };

        const onUp = () => {
          document.body.style.cursor = prevCursor;
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      },
    [],
  );

  // ---- Render ------------------------------------------------------------
  const empty = useMemo(
    () => props.series.every((s) => s.points.length === 0),
    [props.series],
  );

  const wrapperStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: props.height ?? "100%",
  };

  const handleBase: CSSProperties = {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: 4,
    transform: "translateX(-50%)",
    cursor: "ew-resize",
    pointerEvents: "auto",
    boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
    border: "1.5px solid white",
  };

  const axisDrag = props.axisDrag ?? {};
  const xDragEnabled = axisDrag.x !== false;
  const yDragEnabled = axisDrag.y !== false;

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      <canvas ref={canvasRef} />

      {/* As-sleep-overlays (alleen als de chart-geometry bekend is). */}
      {geometry && (xDragEnabled || yDragEnabled) ? (
        <AxisOverlays
          geometry={geometry}
          xEnabled={xDragEnabled}
          yEnabled={yDragEnabled}
          onAxisDown={startAxisDrag}
        />
      ) : null}

      {/* Meet-lijn-handles (alleen rendered als measureLines met onChange). */}
      {props.measureLines &&
      props.measureLines.onChange &&
      geometry &&
      (geometry.measureHandles.x1 !== null || geometry.measureHandles.x2 !== null) ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {geometry.measureHandles.x1 !== null ? (
            <div
              onPointerDown={onHandlePointerDown("x1")}
              style={{
                ...handleBase,
                left: geometry.measureHandles.x1,
                top: geometry.measureHandles.handleTop,
                background: "#0BB5C8",
              }}
              aria-label="Meet-lijn 1"
              role="slider"
            />
          ) : null}
          {geometry.measureHandles.x2 !== null ? (
            <div
              onPointerDown={onHandlePointerDown("x2")}
              style={{
                ...handleBase,
                left: geometry.measureHandles.x2,
                top: geometry.measureHandles.handleTop,
                background: "#D4923A",
              }}
              aria-label="Meet-lijn 2"
              role="slider"
            />
          ) : null}
        </div>
      ) : null}

      {empty ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            color: colors.textMuted,
            fontSize: 13,
          }}
        >
          Geen data
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Axis-drag overlay-componenten
// ---------------------------------------------------------------------------

interface ChartGeometryShape {
  area: { top: number; right: number; bottom: number; left: number; width: number; height: number };
  canvas: { width: number; height: number };
}

interface AxisOverlaysProps {
  geometry: ChartGeometryShape;
  xEnabled: boolean;
  yEnabled: boolean;
  onAxisDown: (
    axis: "x" | "y",
    zone: "lo" | "mid" | "hi",
  ) => (e: React.PointerEvent<HTMLDivElement>) => void;
}

/**
 * Transparante overlays op de as-zones (onder de x-as, links van de y-as).
 * Verdeling per as:
 *   [zoom-lo 20%][pan 60%][zoom-hi 20%]
 * Middel = pan (cursor `grab`), uiteinden = zoom vanaf dat eind
 * (cursor `ew-resize` / `ns-resize`).
 */
function AxisOverlays({ geometry, xEnabled, yEnabled, onAxisDown }: AxisOverlaysProps) {
  const { area, canvas } = geometry;
  const xBandTop = area.bottom;
  const xBandHeight = Math.max(0, canvas.height - area.bottom);
  const yBandLeft = 0;
  const yBandWidth = area.left;

  const subZoneBase: CSSProperties = {
    position: "absolute",
    pointerEvents: "auto",
  };

  return (
    <>
      {xEnabled && xBandHeight > 0 ? (
        <div
          style={{
            position: "absolute",
            top: xBandTop,
            left: area.left,
            width: area.width,
            height: xBandHeight,
            pointerEvents: "none",
          }}
        >
          <div
            onPointerDown={onAxisDown("x", "lo")}
            style={{
              ...subZoneBase,
              left: 0,
              top: 0,
              width: "20%",
              height: "100%",
              cursor: "ew-resize",
            }}
            title="Sleep om links in te zoomen"
          />
          <div
            onPointerDown={onAxisDown("x", "mid")}
            style={{
              ...subZoneBase,
              left: "20%",
              top: 0,
              width: "60%",
              height: "100%",
              cursor: "grab",
            }}
            title="Sleep om horizontaal te pannen"
          />
          <div
            onPointerDown={onAxisDown("x", "hi")}
            style={{
              ...subZoneBase,
              left: "80%",
              top: 0,
              width: "20%",
              height: "100%",
              cursor: "ew-resize",
            }}
            title="Sleep om rechts in te zoomen"
          />
        </div>
      ) : null}
      {yEnabled && yBandWidth > 0 ? (
        <div
          style={{
            position: "absolute",
            top: area.top,
            left: yBandLeft,
            width: yBandWidth,
            height: area.height,
            pointerEvents: "none",
          }}
        >
          {/* Hi-zone (data-y_max) zit bovenaan op het scherm. */}
          <div
            onPointerDown={onAxisDown("y", "hi")}
            style={{
              ...subZoneBase,
              left: 0,
              top: 0,
              width: "100%",
              height: "20%",
              cursor: "ns-resize",
            }}
            title="Sleep om aan de bovenkant in te zoomen"
          />
          <div
            onPointerDown={onAxisDown("y", "mid")}
            style={{
              ...subZoneBase,
              left: 0,
              top: "20%",
              width: "100%",
              height: "60%",
              cursor: "grab",
            }}
            title="Sleep om verticaal te pannen"
          />
          <div
            onPointerDown={onAxisDown("y", "lo")}
            style={{
              ...subZoneBase,
              left: 0,
              top: "80%",
              width: "100%",
              height: "20%",
              cursor: "ns-resize",
            }}
            title="Sleep om aan de onderkant in te zoomen"
          />
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Stable event-handlers — gemaakt eenmaal bij chart-create. Lezen actuele
// props via ref zodat ze niet bij elke render hoeven te wisselen (Chart.js
// is gevoelig voor option-identity en zou anders re-renders triggeren).
// ---------------------------------------------------------------------------

/**
 * Hit-detection wordt door deze module zelf gedaan via `findNearestSeriesHit`,
 * niet via Chart.js' built-in `activeEls`-systeem. Reden: clicks/hovers gaan
 * via directe canvas-`addEventListener` (zie het canvas-listener-effect in de
 * component); Chart.js' `options.onClick`/`onHover` bleken in deze setup niet
 * betrouwbaar te vuren. Wij scopen de zoek expliciet op de series-datasets en
 * gebruiken Chart.js' INTERNE pixel-positions uit `meta.data` (al door
 * Chart.js berekend voor elk gerenderd punt) zodat overlay-datasets
 * (geselecteerd, hovered, raaklijn) niet meedoen in de competitie.
 */

/** Pixel-positie van een chart-element zoals Chart.js die intern bijhoudt. */
interface ElementWithPosition {
  x?: number;
  y?: number;
  skip?: boolean;
  parsed?: { y?: number | null };
}

const POINT_HIT_RADIUS_PX = 25;

/** Vind de dichtstbij series-punt voor de cursor-positie in canvas-CSS-pixels. */
function findNearestSeriesHit(
  chart: Chart,
  cx: number,
  cy: number,
  seriesCount: number,
): { datasetIndex: number; index: number; distSq: number } | null {
  let bestDatasetIdx = -1;
  let bestPointIdx = -1;
  let bestDistSq = Infinity;
  for (let sI = 0; sI < seriesCount; sI += 1) {
    const meta = chart.getDatasetMeta(sI);
    if (!meta || meta.hidden) continue;
    const data = meta.data as unknown as ElementWithPosition[];
    for (let pI = 0; pI < data.length; pI += 1) {
      const el = data[pI];
      if (!el || typeof el.x !== "number" || typeof el.y !== "number") continue;
      // Skip punten zonder geldige y (bv. NaN in een gat).
      if (el.skip || el.parsed?.y === null) continue;
      const dSq = (el.x - cx) ** 2 + (el.y - cy) ** 2;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestDatasetIdx = sI;
        bestPointIdx = pI;
      }
    }
  }
  if (bestDatasetIdx < 0) return null;
  return { datasetIndex: bestDatasetIdx, index: bestPointIdx, distSq: bestDistSq };
}

/** Canvas-relatieve cursor-pixel uit een ruw DOM-event. */
function cursorPxFromNative(
  ev: MouseEvent | PointerEvent,
  chart: Chart,
): { cx: number; cy: number } | null {
  if (typeof ev.clientX !== "number" || typeof ev.clientY !== "number") return null;
  const rect = chart.canvas.getBoundingClientRect();
  return { cx: ev.clientX - rect.left, cy: ev.clientY - rect.top };
}

/**
 * 07l: callback voor `chartjs-plugin-zoom`'s `onZoom`/`onPan`. De chart heeft
 * z'n scales al gewijzigd; wij markeren alleen ownership en emiten de nieuwe
 * stand naar de parent (voor opslag). GEEN sync terug.
 */
function emitZoom(
  chart: Chart,
  suppress: React.MutableRefObject<boolean>,
  propsRef: React.MutableRefObject<InteractiveChartProps>,
  userZoomedRef: React.MutableRefObject<boolean>,
) {
  if (suppress.current) {
    suppress.current = false;
    return;
  }
  const xs = chart.scales.x;
  const ys = chart.scales.y;
  if (!xs || !ys) return;
  if (xs.min == null || xs.max == null || ys.min == null || ys.max == null) return;
  userZoomedRef.current = true;
  propsRef.current.onZoomChange?.({
    xMin: xs.min,
    xMax: xs.max,
    yMin: ys.min,
    yMax: ys.max,
  });
}

/**
 * 07l: schrijf een `ZoomState` naar een `cfg.options.scales`-object (mount +
 * initialZoomState). Defensief getypeerd omdat Chart.js' scale-opties als
 * deep-partial worden gezien.
 */
function applyScalesToCfg(
  scales: NonNullable<ChartOptions<"line">["scales"]>,
  zs: ZoomState,
) {
  const sx = scales.x as { min?: number; max?: number } | undefined;
  const sy = scales.y as { min?: number; max?: number } | undefined;
  if (sx) {
    sx.min = zs.xMin;
    sx.max = zs.xMax;
  }
  if (sy) {
    sy.min = zs.yMin;
    sy.max = zs.yMax;
  }
}

/**
 * 07l: heeft de gebruiker zelf gezoomd/gepand? Primair via de plugin-API
 * `isZoomedOrPanned` (dekt wheel/pinch/pan). Onze eigen as-sleep gaat NIET
 * via de plugin, dus we OR-en met `userZoomedRef` (gezet door `emitZoom` én
 * door de as-sleep-handler). Bij ontbreken van de plugin-API valt 't volledig
 * terug op de ref (eis 18).
 */
function isUserZoomed(
  chart: Chart,
  userZoomedRef: React.MutableRefObject<boolean>,
): boolean {
  const fn = (chart as { isZoomedOrPanned?: () => boolean }).isZoomedOrPanned;
  const plugin = typeof fn === "function" ? !!fn.call(chart) : false;
  return plugin || userZoomedRef.current;
}

// Re-export voor consumers die direct met de Point-types willen werken.
export type { Point };
