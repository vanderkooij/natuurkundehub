import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Download,
  Info,
  Maximize2,
  MoreHorizontal,
  Ruler,
  Sigma,
  Spline,
  TrendingUp,
  X,
} from "lucide-react";
import type { Chart as ChartJsInstance } from "chart.js";

import {
  InteractiveChart,
  type ChartPoint,
  type ChartSeries,
  type PointHoverInfo,
  type ZoomState,
} from "@nh/shared/InteractiveChart";
import { useThemeColors } from "@nh/shared/useThemeColors";
import { useInteractionZone } from "@/features/app/InteractionZoneState";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type LengthUnit } from "@/features/calibration/CalibrationState";
import {
  evalFit,
  evalFitDerivative,
  evalFitSecondDerivative,
  evalFitThirdDerivative,
} from "@/_reusable/fit";
import { buildFitCurve, type FitsResult } from "@/features/measurements/fits";
import {
  formatFitFormulaTokens,
  type FitDerivative,
  type FormulaAxis,
  type FormulaToken,
} from "@/features/measurements/fitFormula";
import {
  type ExtendedRow,
  type FitNeed,
  GRAPH_TYPES,
  GRAPH_TYPE_ORDER,
  type GraphTypeKey,
  buildPoints,
  graphFitNeed,
  interpolateY,
} from "@/features/measurements/graph-types";
import { type FitConfig } from "@/features/measurements/GraphsLayoutState";
import {
  dateStampYMDHM,
  sanitizeFilename,
} from "@/features/project/projectSchema";
import { formatDecimal } from "@/lib/numbers";
import { cn } from "@/lib/utils";

export interface PaneState {
  id: string;
  type: GraphTypeKey;
  tangentActive: boolean;
  measureActive: boolean;
  measureX1: number | null;
  measureX2: number | null;
  zoomState: ZoomState | null;
  /**
   * Verbindingslijn tussen meetpunten aan/uit. Default uit — bewust, omdat
   * de ruwe-data-lijn straks gaat botsen met fit-curves uit prompt 07.
   * Toggle in de pane-header.
   */
  showLine: boolean;
  /**
   * Fit zichtbaar / actief in deze pane. Voor positie-grafieken: toont de
   * doorlopende fit-curve over de scatter. Voor afgeleiden-grafieken
   * (v en a): vervangt de scatter door de analytische afgeleide-curve.
   * Pas effectief als de bijbehorende fit in `FitConfig` non-`none` is.
   */
  showFit: boolean;
}

export interface GraphPaneProps {
  state: PaneState;
  rows: ExtendedRow[];
  unit: LengthUnit;
  /** Frame van de huidige playhead (currentFrame). */
  currentFrame: number;
  /** Globaal hover-frame (uit MeasurementHoverProvider). */
  hoveredFrame: number | null;
  trimStart: number;
  trimEnd: number;
  fps: number;
  /** Globale fit-config (x-richting / y-richting). */
  fitConfig: FitConfig;
  /** Reeds berekende x- en y-fits (één keer in Graphs.tsx). */
  fits: FitsResult;
  /** Mogen we deze pane sluiten? (False als 'ie de laatste is.) */
  canClose: boolean;
  onClose: () => void;
  onChange: (next: PaneState) => void;
  onFrameSelect: (frame: number) => void;
  onHoverFrame: (frame: number | null) => void;
}

/** t-bereik van de volledige trim, in seconden vanaf trimStart. */
function trimTSpan(trimStart: number, trimEnd: number, fps: number): {
  tMin: number;
  tMax: number;
} {
  const safeFps = fps > 0 ? fps : 1;
  return {
    tMin: 0,
    tMax: (trimEnd - trimStart) / safeFps,
  };
}

const ACCELERATION_TOOLTIP =
  "Versnelling uit ruwe data is gevoelig voor meetruis. Een functie-fit (komt later) geeft een gladdere afgeleide.";

/** Lees `frame` veilig uit `point.meta`. */
function frameFromPoint(p: ChartPoint | undefined): number | null {
  const meta = p?.meta as { frame?: number } | undefined;
  return typeof meta?.frame === "number" ? meta.frame : null;
}

/** Lees `t` veilig uit `point.meta` (gebruikt door fit-curve serien). */
function tFromPoint(p: ChartPoint | undefined): number | null {
  const meta = p?.meta as { t?: number } | undefined;
  return typeof meta?.t === "number" ? meta.t : null;
}

/**
 * Best-effort hex → rgba met opgegeven alpha. Gebruikt voor de lichtere
 * tinten van fit-curve zone B/C. Niet-hex input wordt teruggegeven zoals 'ie is.
 */
function withAlphaHex(color: string, alpha: number): string {
  if (!color.startsWith("#")) return color;
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

/**
 * Index van het meetpunt in `points` met het frame dat het dichtst bij
 * `targetFrame` ligt. Bij gelijke afstand: kies het hogere frame (intuïtiever
 * naar voren).
 */
function nearestPointIdx(points: ChartPoint[], targetFrame: number): number {
  if (points.length === 0) return -1;
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const f = frameFromPoint(points[i]);
    if (f == null) continue;
    const d = Math.abs(f - targetFrame);
    // `<=` voor "hoger bij gelijk".
    if (d <= bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function GraphPane(props: GraphPaneProps) {
  const {
    state,
    rows,
    unit,
    currentFrame,
    hoveredFrame,
    trimStart,
    trimEnd,
    fps,
    fitConfig,
    fits,
    canClose,
    onClose,
    onChange,
    onFrameSelect,
    onHoverFrame,
  } = props;

  const { registerPane, flashedPaneId } = useInteractionZone();
  const themeColors = useThemeColors();

  // 07l: counter die de Auto-zoom-knop verhoogt → `resetTrigger`-prop op de
  // InteractiveChart. Start op 0 (= geen reset bij mount).
  const [resetCounter, setResetCounter] = useState(0);

  // 09 / 09b: responsive toolbar. We meten twee dingen:
  //  • `paneWidth` — de actuele breedte van de pane (ResizeObserver op de root).
  //  • `naturalInlineWidth` — hoeveel de volledige knoppenset minimaal nodig
  //    heeft om inline te passen, gemeten aan een verborgen meet-tweeling (zie
  //    de toolbar-render). Zo is de drempel zelf-afstellend: komt er een knop
  //    bij/af, dan klopt 'ie automatisch — geen magische pixelwaarde die je bij
  //    elke wijziging moet bijstellen (was 480 px, te laag bij smalle panes op
  //    een groot scherm).
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [paneWidth, setPaneWidth] = useState(Infinity);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      setPaneWidth(entries[0]?.contentRect.width ?? Infinity);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const measureRef = useRef<HTMLDivElement | null>(null);
  const [naturalInlineWidth, setNaturalInlineWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const measure = () => setNaturalInlineWidth(el.offsetWidth);
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Compact zodra de knoppen niet meer inline passen. +24 px buffer dekt de
  // flex-gap rond de (in de meet-tweeling weggelaten) spacer + sub-pixel-
  // afronding, zodat knoppen niet tot tegen de rand geperst worden. `null`
  // (nog niet gemeten) ⇒ breed renderen, geen flits.
  const compactToolbar =
    naturalInlineWidth != null && paneWidth < naturalInlineWidth + 24;

  // Imperatieve referentie naar de Chart.js-instance, gevuld door
  // InteractiveChart's `onChartReady`. Gebruikt voor PNG-export.
  const chartRef = useRef<ChartJsInstance | null>(null);
  const onChartReady = useCallback((chart: ChartJsInstance | null) => {
    chartRef.current = chart;
  }, []);

  const def = GRAPH_TYPES[state.type];
  const xLabel = def.xLabel(unit);
  const yLabel = def.yLabel(unit);

  const points = useMemo<ChartPoint[]>(() => buildPoints(rows, def), [rows, def]);
  const enoughPoints = rows.length >= def.minPoints;

  // Welke fits zijn relevant voor dit type, en is de globale config voor die
  // fits non-`none`? Bepaalt of de Fit-knop iets kan doen.
  const fitNeed = graphFitNeed(state.type);
  const relevantFitActive = useMemo(() => {
    if (fitNeed === "x") return fitConfig.xFit !== "none";
    if (fitNeed === "y") return fitConfig.yFit !== "none";
    return fitConfig.xFit !== "none" && fitConfig.yFit !== "none";
  }, [fitNeed, fitConfig.xFit, fitConfig.yFit]);

  // Of de fit voor deze pane DAADWERKELIJK kon worden berekend. Voor niet-
  // convergerende fits (sinus/exp met te ruis-/range-gebrekkige data) is
  // `fits.x` of `fits.y` null terwijl `relevantFitActive` true is. Dat
  // verschil bepaalt of we de fit-curve renderen of de UI-melding tonen.
  const fitAvailable = useMemo(() => {
    if (fitNeed === "x") return fits.x != null;
    if (fitNeed === "y") return fits.y != null;
    return fits.x != null && fits.y != null;
  }, [fitNeed, fits.x, fits.y]);
  const fitFailed = relevantFitActive && !fitAvailable;

  // Trim-tijdbereik (in seconden vanaf trimStart) — fallback voor de
  // sample-range als er geen zoom-state is.
  const trimSpan = useMemo(
    () => trimTSpan(trimStart, trimEnd, fps),
    [trimStart, trimEnd, fps],
  );

  // 07e: sample-range voor de fit-curve = de zichtbare x-range. Bij
  // expliciete zoom-state gebruiken we die (zodat de fit netjes doorloopt
  // tot aan de zichtbare randen). Anders vallen we terug op de trim-range.
  // De fit-curve wordt dan opgedeeld in drie zones (fit-range / buiten
  // fit maar binnen data / extrapolatie), per zone met eigen styling.
  //
  // Root cause 07j ("extrapolatie doet niets"): zonder zoom was
  // `viewTRange === trimSpan`, wat in de praktijk ≈ het meetbereik is
  // (je trimt op je metingen). `buildFitCurve` sampelde dus nooit punten
  // VOORBIJ het meetbereik → zone C bleef altijd leeg. Fix: rek het sample-
  // bereik uit voorbij het laatste meetpunt (margin = 30% van het data-
  // bereik) zodat zone C daadwerkelijk punten krijgt. De zone-C-dataset
  // krijgt `excludeFromAutozoom: "y"` zodat de x-as meegroeit om de
  // voorspelling te tonen, maar de y-as op de meetdata geschaald blijft.
  // 07k: extrapolatie staat altijd aan (geen toggle meer).
  const viewTRange = useMemo(() => {
    if (state.zoomState && def.isTimeAxis) {
      return { tMin: state.zoomState.xMin, tMax: state.zoomState.xMax };
    }
    const base = { tMin: trimSpan.tMin, tMax: trimSpan.tMax };
    if (def.isTimeAxis && fits.dataTRange) {
      const span = fits.dataTRange.tMax - fits.dataTRange.tMin;
      const margin = span > 0 ? span * 0.3 : 0;
      return {
        tMin: base.tMin,
        tMax: Math.max(base.tMax, fits.dataTRange.tMax + margin),
      };
    }
    return base;
  }, [state.zoomState, def.isTimeAxis, trimSpan.tMin, trimSpan.tMax, fits.dataTRange]);

  // Fit-curve voor deze pane. Aanwezig zodra de pane Fit-toggle aan staat
  // EN de relevante fits non-`none` zijn EN er een geldige curve uit komt.
  // Drie zones (inFitRange / outsideFitInData / extrapolation) zodat
  // leerlingen het verschil zien tussen onderbouwd model en speculatie.
  const fitCurveSplit = useMemo(() => {
    if (!state.showFit || !fitAvailable) return null;
    return buildFitCurve(state.type, fits, viewTRange.tMin, viewTRange.tMax);
  }, [state.showFit, fitAvailable, state.type, fits, viewTRange.tMin, viewTRange.tMax]);

  // selectedIdx / hoveredIdx indexeren altijd in series[0] (scatter) — de
  // fit-curve(s) zitten als series[1+] en hebben geen frame-koppeling.
  const selectedIdx = useMemo(() => {
    for (let i = 0; i < points.length; i += 1) {
      if (frameFromPoint(points[i]) === currentFrame) return i;
    }
    return null;
  }, [points, currentFrame]);

  const hoveredIdx = useMemo(() => {
    if (hoveredFrame == null) return null;
    for (let i = 0; i < points.length; i += 1) {
      if (frameFromPoint(points[i]) === hoveredFrame) return i;
    }
    return null;
  }, [points, hoveredFrame]);

  // Raaklijn-anker = selectedIdx (currentFrame snapt naar een meetpunt in
  // niet-tracken-modi, dus dit is meestal direct geldig). Fallback voor
  // panes waar het huidige meetpunt buiten de gefilterde subset valt (bv.
  // `ax-t` waar het eerste/laatste meetpunt wegvalt): val terug op de
  // dichtstbijzijnde geldige index in deze pane's eigen `points`-array.
  const tangentAnchorIdx = useMemo(() => {
    if (selectedIdx != null) return selectedIdx;
    if (points.length === 0) return null;
    return nearestPointIdx(points, currentFrame);
  }, [selectedIdx, points, currentFrame]);

  // Analytische raaklijn-override: wanneer raaklijn EN fit beide aan staan
  // (en de fit gelukt is), bereken anker (x, y) + helling exact via evalFit
  // + evalFitDerivative. Voor `y-x` parametrisch: `dy/dx = (dy/dt) / (dx/dt)`
  // met `dx/dt`-guard.
  const tangentOverride = useMemo(() => {
    if (!state.tangentActive || !state.showFit || !fitAvailable) return null;
    const t = (currentFrame - trimStart) / fps;
    if (!Number.isFinite(t)) return null;
    const fx = fits.x;
    const fy = fits.y;
    switch (state.type) {
      case "x-t":
        return fx
          ? { x: t, y: evalFit(fx, t), slope: evalFitDerivative(fx, t) }
          : null;
      case "y-t":
        return fy
          ? { x: t, y: evalFit(fy, t), slope: evalFitDerivative(fy, t) }
          : null;
      case "vx-t":
        // Toon dx/dt; helling = d²x/dt².
        return fx
          ? {
              x: t,
              y: evalFitDerivative(fx, t),
              slope: evalFitSecondDerivative(fx, t),
            }
          : null;
      case "vy-t":
        return fy
          ? {
              x: t,
              y: evalFitDerivative(fy, t),
              slope: evalFitSecondDerivative(fy, t),
            }
          : null;
      case "ax-t":
        // Voor lineair/kwadratisch is d²x/dt² constant → helling 0; voor
        // sinus/exp niet constant → helling = d³x/dt³ (via fit-type-
        // gediscrimineerde helper).
        return fx
          ? {
              x: t,
              y: evalFitSecondDerivative(fx, t),
              slope: evalFitThirdDerivative(fx, t),
            }
          : null;
      case "ay-t":
        return fy
          ? {
              x: t,
              y: evalFitSecondDerivative(fy, t),
              slope: evalFitThirdDerivative(fy, t),
            }
          : null;
      case "vmag-t": {
        if (!fx || !fy) return null;
        const vx = evalFitDerivative(fx, t);
        const vy = evalFitDerivative(fy, t);
        const v = Math.hypot(vx, vy);
        if (v < 1e-12) return null;
        const ax = evalFitSecondDerivative(fx, t);
        const ay = evalFitSecondDerivative(fy, t);
        // d|v|/dt = (vx·ax + vy·ay) / |v|.
        return { x: t, y: v, slope: (vx * ax + vy * ay) / v };
      }
      case "amag-t": {
        if (!fx || !fy) return null;
        // |a| is constant met de huidige fit-types (linear+quadratic).
        const ax = evalFitSecondDerivative(fx, t);
        const ay = evalFitSecondDerivative(fy, t);
        return { x: t, y: Math.hypot(ax, ay), slope: 0 };
      }
      case "y-x": {
        if (!fx || !fy) return null;
        const dxdt = evalFitDerivative(fx, t);
        const dydt = evalFitDerivative(fy, t);
        // Parametrische helling: dy/dx = (dy/dt) / (dx/dt). Guard
        // tegen dx/dt ≈ 0 (verticale raaklijn — onleesbaar zonder
        // speciale weergave).
        if (Math.abs(dxdt) < 1e-9) return null;
        return { x: evalFit(fx, t), y: evalFit(fy, t), slope: dydt / dxdt };
      }
    }
  }, [
    state.tangentActive,
    state.showFit,
    fitAvailable,
    state.type,
    currentFrame,
    trimStart,
    fps,
    fits,
  ]);

  // ---- Pane-registratie voor context-aware pijltjes-navigatie ------------
  useEffect(() => {
    const navigate = (delta: number) => {
      if (points.length === 0) return;
      // Als currentFrame al op een meetpunt van deze pane valt: gewoon +delta.
      // Zo niet (bv. ax-t-pane waar het eerste/laatste meetpunt wegvalt, of
      // currentFrame tussen meetpunten): de eerste keer dat de gebruiker
      // pijltjes drukt, is de snap-naar-dichtstbij zelf de verplaatsing —
      // geen extra delta. Vervolg-toetsen lopen dan door de subset.
      const currentIdx = selectedIdx ?? -1;
      const candidateIdx =
        currentIdx === -1 ? nearestPointIdx(points, currentFrame) : currentIdx + delta;
      const clampedIdx = Math.max(0, Math.min(points.length - 1, candidateIdx));
      const frame = frameFromPoint(points[clampedIdx]);
      if (typeof frame === "number") onFrameSelect(frame);
    };
    return registerPane(state.id, navigate);
  }, [state.id, registerPane, points, selectedIdx, currentFrame, onFrameSelect]);

  // Meet-lijnen info-balk: bereken y1/y2 op de geïnterpoleerde positie.
  const measureInfo = useMemo(() => {
    if (!state.measureActive || points.length < 2) return null;
    const y1 = state.measureX1 != null ? interpolateY(state.measureX1, points) : null;
    const y2 = state.measureX2 != null ? interpolateY(state.measureX2, points) : null;
    return { y1, y2 };
  }, [state.measureActive, state.measureX1, state.measureX2, points]);

  // Series-array voor InteractiveChart. Scatter is ALTIJD series[0].
  // 07e: de fit-curve komt als één tot drie extra series, één per zone:
  //  - series[1+] zone A = in fit-range (solid, vol, opacity 1)
  //  - series[1+] zone B = buiten fit-range maar binnen data (solid,
  //    opacity ~0,7)
  //  - series[1+] zone C = voorbij meetbereik (dashed, opacity ~0,5).
  //    07k: altijd zichtbaar (extrapolatie-toggle verwijderd).
  //
  // Voor `y-x` is splitsen niet zinvol (geen tijd-as op de plot zelf) en
  // gebruiken we `fitCurveSplit.unsplit` als één serie.
  //
  // Root cause 07g-bugs "zones werken niet in vx-t/ax-t" + "autozoom
  // onleesbaar in afgeleide-panes": het zone-code-pad is identiek voor
  // alle t-panes, maar de autozoom-bounds in InteractiveChart werden
  // berekend over ALLE series-punten — inclusief de fit-extrapolatie die
  // in afgeleide-panes (lineair doorlopende vx-fit, A·ω-amplitude bij
  // sinus) ver buiten de scatter uitloopt. Resultaat: y-as kapotgerekt,
  // pane onleesbaar, zones visueel onherkenbaar. Fix: zone C krijgt
  // `excludeFromAutozoom` zodat alleen scatter + fit-binnen-databereik
  // de as-schaling bepalen.
  const chartSeries = useMemo<ChartSeries[]>(() => {
    const series: ChartSeries[] = [
      { label: "Ruwe meting", points, showLine: state.showLine },
    ];
    if (!fitCurveSplit) return series;
    // 07f: alle drie zones krijgen label "Fit" (geen variaties). Het
    // onderscheid komt door styling: zone A solid + vol, B solid + lichter,
    // C dashed + dimmer.
    if (fitCurveSplit.unsplit && fitCurveSplit.unsplit.length >= 2) {
      series.push({
        label: "Fit",
        points: fitCurveSplit.unsplit,
        showLine: true,
        lineOnly: true,
        color: themeColors.fit,
      });
      return series;
    }
    if (fitCurveSplit.inFitRange.length >= 2) {
      series.push({
        label: "Fit",
        points: fitCurveSplit.inFitRange,
        showLine: true,
        lineOnly: true,
        color: themeColors.fit,
      });
    }
    if (fitCurveSplit.outsideFitInData.length >= 2) {
      series.push({
        label: "Fit",
        points: fitCurveSplit.outsideFitInData,
        showLine: true,
        lineOnly: true,
        // Lichter — de leerling heeft hier metingen maar bewust niet
        // meegenomen in de fit. Geen dash (data-onderbouwd, dus geen
        // pure speculatie).
        color: withAlphaHex(themeColors.fit, 0.7),
      });
    }
    if (fitCurveSplit.extrapolation.length >= 2) {
      series.push({
        label: "Fit",
        points: fitCurveSplit.extrapolation,
        showLine: true,
        lineOnly: true,
        dashed: true,
        // Gedimd: pure extrapolatie voorbij meetbereik. `"y"` (07j): de x-as
        // groeit mee zodat de voorspelling zichtbaar wordt, maar de y-as
        // blijft op de meetdata geschaald (een blow-up-curve rekt 'm niet
        // kapot). 07k: altijd aan (geen toggle meer).
        color: withAlphaHex(themeColors.fit, 0.5),
        excludeFromAutozoom: "y",
      });
    }
    return series;
  }, [points, state.showLine, fitCurveSplit, themeColors.fit]);

  /**
   * 07d-helper: derivative-panes hebben echte "raw vs model"-vergelijking
   * waard genoeg om expliciet te markeren. Position-panes (`x-t`, `y-t`,
   * `y-x`) hebben dit pedagogische verschil niet — daar is de scatter
   * letterlijk je meting en de fit de model-curve. De legend strip toont
   * 'm dus alleen in derivative-panes.
   */
  const isDerivativePane =
    state.type === "vx-t" ||
    state.type === "vy-t" ||
    state.type === "vmag-t" ||
    state.type === "ax-t" ||
    state.type === "ay-t" ||
    state.type === "amag-t";

  // ---- Handlers ----------------------------------------------------------
  const handleTypeChange = (next: string) => {
    onChange({
      ...state,
      type: next as GraphTypeKey,
      tangentActive: false,
      measureActive: false,
      measureX1: null,
      measureX2: null,
      zoomState: null,
      // Reset fit-zichtbaarheid op type-wissel — het nieuwe type kan andere
      // fits vereisen (bv. y-x: beide), en de gebruiker krijgt 'm dan opnieuw
      // bewust aangezet.
      showFit: false,
    });
  };

  const toggleTangent = () => onChange({ ...state, tangentActive: !state.tangentActive });

  const toggleLine = () => onChange({ ...state, showLine: !state.showLine });

  const toggleFit = () => onChange({ ...state, showFit: !state.showFit });

  /**
   * Exporteer de actieve chart als PNG. Chart.js' canvas heeft per default
   * transparante achtergrond — voor een leesbaar plaatje in een verslag
   * stempelen we de pane's `--bg-card`-kleur eerst over het hele frame.
   */
  const exportPng = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = chart.canvas as HTMLCanvasElement;
    // Maak een composite canvas met ondoorzichtige achtergrond + de chart erop.
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = themeColors.bgCard;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, 0, 0);
    const dataUrl = out.toDataURL("image/png", 1);
    const filename = sanitizeFilename(
      `videometen-grafiek-${state.type}-${dateStampYMDHM()}.png`,
    );
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [state.type, themeColors.bgCard]);

  const toggleMeasure = () => {
    if (state.measureActive) {
      onChange({ ...state, measureActive: false, measureX1: null, measureX2: null });
      return;
    }
    // Bepaal de x-range waarbinnen we de twee lijnen op 25% / 75% zetten.
    // Voorrang aan de huidige zoom-state. Anders: echte min/max van alle
    // datapunten (NIET `points[0]/points[end]` — bij y-x baan-panes is dat
    // niet monotone, dus die geven niet de visuele range).
    let xMin: number;
    let xMax: number;
    if (state.zoomState) {
      xMin = state.zoomState.xMin;
      xMax = state.zoomState.xMax;
    } else if (points.length) {
      xMin = Infinity;
      xMax = -Infinity;
      for (const p of points) {
        if (!Number.isFinite(p.x)) continue;
        if (p.x < xMin) xMin = p.x;
        if (p.x > xMax) xMax = p.x;
      }
      if (!Number.isFinite(xMin) || !Number.isFinite(xMax)) {
        xMin = 0;
        xMax = 1;
      }
    } else {
      xMin = 0;
      xMax = 1;
    }
    // Defensief: voorkom dat beide lijnen op precies dezelfde x landen
    // (zou visueel als één lijn ogen — wat we expliciet willen vermijden).
    if (xMax - xMin < 1e-9) xMax = xMin + 1;
    onChange({
      ...state,
      measureActive: true,
      measureX1: xMin + (xMax - xMin) * 0.25,
      measureX2: xMin + (xMax - xMin) * 0.75,
    });
  };

  // 07l: Auto zoom verhoogt een counter-trigger; InteractiveChart roept dan
  // `resetZoom('none')` aan en emit `null` → `onZoomChange(null)` → pane-state
  // op `null`. De chart is autoritatief; wij zetten zoomState niet direct.
  const handleAutoZoom = () => setResetCounter((c) => c + 1);

  const onPointClick = (sIdx: number, pIdx: number) => {
    // Series[0] = scatter (met frame-meta), series[1+] = fit-curve(s)
    // (met t-meta). Klik op een fit-curve-punt vertalen we voor t-grafieken
    // terug naar het dichtstbijzijnde frame zodat de leerling nog steeds
    // kan navigeren.
    if (sIdx === 0) {
      const frame = frameFromPoint(points[pIdx]);
      if (typeof frame === "number") onFrameSelect(frame);
      return;
    }
    if (!def.isTimeAxis) return;
    const fp = chartSeries[sIdx]?.points[pIdx];
    const t = tFromPoint(fp);
    if (t == null) return;
    const frame = Math.round(t * fps) + trimStart;
    onFrameSelect(Math.max(trimStart, Math.min(trimEnd, frame)));
  };

  const onAreaClick = (x: number) => {
    if (!def.isTimeAxis) return;
    const frame = Math.round(x * fps) + trimStart;
    const clamped = Math.max(trimStart, Math.min(trimEnd, frame));
    onFrameSelect(clamped);
  };

  const onHover = (info: PointHoverInfo | null) => {
    // Hover-trail-koppeling alleen voor series[0] (scatter); fit-curve(s)
    // hebben geen frame-koppeling en zouden anders "verkeerde" cross-pane-
    // hover triggeren.
    if (!info || info.seriesIdx !== 0) {
      onHoverFrame(null);
      return;
    }
    const frame = frameFromPoint(points[info.pointIdx]);
    onHoverFrame(typeof frame === "number" ? frame : null);
  };

  const onZoomChange = (z: ZoomState | null) => {
    onChange({ ...state, zoomState: z });
  };

  const onMeasureChange = (next: { x1: number | null; x2: number | null }) => {
    onChange({ ...state, measureX1: next.x1, measureX2: next.x2 });
  };

  // ---- Toolbar-controls (09: inline óf in ⋯-overflow) --------------------
  const fitTooltip: ReactNode = !enoughPoints
    ? "Niet genoeg meetpunten voor een fit"
    : !relevantFitActive
      ? "Stel eerst een fit-type in via de Fit-knop bovenaan"
      : fitFailed
        ? "Fit kon niet berekend worden — pas type of range aan"
        : fitNeed === "both"
          ? "Toon gefitte curve (x én y)"
          : `Toon gefitte ${fitNeed}-curve`;

  interface PaneControl {
    key: string;
    icon: ComponentType<{ className?: string }>;
    label: string;
    /** Toggle aan? (acties zoals PNG zijn nooit "active".) */
    active: boolean;
    disabled: boolean;
    onClick: () => void;
    tooltip: ReactNode;
  }
  const overflowControls: PaneControl[] = [
    {
      key: "tangent",
      icon: TrendingUp,
      label: "Raaklijn",
      active: state.tangentActive,
      disabled: !enoughPoints,
      onClick: toggleTangent,
      tooltip: "Toon raaklijn met dy/dx-helling",
    },
    {
      key: "measure",
      icon: Ruler,
      label: "Meten",
      active: state.measureActive,
      disabled: !enoughPoints,
      onClick: toggleMeasure,
      tooltip: "Twee verticale meet-lijnen",
    },
    {
      key: "line",
      icon: Spline,
      label: "Lijn",
      active: state.showLine,
      disabled: !enoughPoints,
      onClick: toggleLine,
      tooltip: "Verbindingslijn tussen meetpunten",
    },
    {
      key: "fit",
      icon: Sigma,
      label: "Fit",
      active: state.showFit && relevantFitActive,
      disabled: !relevantFitActive || !enoughPoints,
      onClick: toggleFit,
      tooltip: fitTooltip,
    },
    {
      key: "png",
      icon: Download,
      label: "PNG",
      active: false,
      disabled: !enoughPoints,
      onClick: exportPng,
      tooltip: "Download deze grafiek als PNG",
    },
  ];
  // Accent-dot op de ⋯-knop wanneer een toggle in het menu actief is
  // (PNG is een actie, telt niet mee).
  const anyOverflowToggleActive =
    state.tangentActive ||
    state.measureActive ||
    state.showLine ||
    (state.showFit && relevantFitActive);

  const renderControlButton = (c: PaneControl, inMenu: boolean) => (
    <Button
      variant="outline"
      size="sm"
      disabled={c.disabled}
      onClick={c.onClick}
      aria-pressed={c.key === "png" ? undefined : c.active}
      className={cn(
        "h-7 gap-1 border-(--border-solid) px-2 text-[11px]",
        inMenu && "w-full justify-start",
        c.disabled
          ? "opacity-40"
          : c.active
            ? "border-(--accent) text-(--accent)"
            : "text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)",
      )}
    >
      <c.icon className="size-3.5" />
      {c.label}
    </Button>
  );

  // Auto-zoom + sluit-knop staan altijd inline (ook in compact-modus). Als
  // render-helpers zodat de verborgen meet-tweeling exact dezelfde knoppen kan
  // meten als de echte toolbar — geen losse breedte-benadering die uit sync
  // kan raken.
  const renderAutoZoomButton = () => (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "h-7 gap-1 border-(--border-solid) px-2 text-[11px]",
        "text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)",
      )}
      onClick={handleAutoZoom}
    >
      <Maximize2 className="size-3.5" />
      Auto zoom
    </Button>
  );
  const renderCloseButton = () => (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "h-7 w-7 border-(--border-solid)",
        canClose
          ? "text-(--text-secondary) hover:border-(--destructive) hover:text-(--destructive)"
          : "opacity-40",
      )}
      onClick={onClose}
      disabled={!canClose}
    >
      <X className="size-3.5" />
    </Button>
  );

  // ---- Render ------------------------------------------------------------
  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  };

  const flashing = flashedPaneId === state.id;

  return (
    <div
      ref={rootRef}
      data-mouse-zone="graph-pane"
      data-pane-id={state.id}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-md border bg-card transition-[box-shadow,border-color] duration-200",
        flashing && "border-(--accent) shadow-[0_0_0_1px_var(--accent)]",
      )}
      style={{ borderColor: flashing ? undefined : "var(--border)", ...containerStyle }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-1.5 border-b bg-(--bg-secondary) px-2 py-1.5"
        style={{ borderColor: "var(--border)" }}
      >
        <Select value={state.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-7 w-[150px] gap-1 border-(--border-solid) px-2 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRAPH_TYPE_ORDER.map((key) => {
              const t = GRAPH_TYPES[key];
              return (
                <SelectItem key={key} value={key} className="text-[12px]">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono">{t.label}</span>
                    {t.isAcceleration ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3 text-(--text-muted)" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[28ch]">
                          {ACCELERATION_TOOLTIP}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* 09 / 09b: brede toolbar → alle controls inline; smalle pane (drempel
            = gemeten natuurlijke knoppen-breedte, zie boven) → Raaklijn/Meten/
            Lijn/Fit/PNG verhuizen naar het ⋯-overflow-menu. */}
        {!compactToolbar &&
          overflowControls.slice(0, 4).map((c) => (
            <Tooltip key={c.key}>
              <TooltipTrigger asChild>{renderControlButton(c, false)}</TooltipTrigger>
              <TooltipContent>{c.tooltip}</TooltipContent>
            </Tooltip>
          ))}

        <div className="flex-1" />

        {!compactToolbar && (
          <Tooltip>
            <TooltipTrigger asChild>
              {renderControlButton(overflowControls[4], false)}
            </TooltipTrigger>
            <TooltipContent>{overflowControls[4].tooltip}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>{renderAutoZoomButton()}</TooltipTrigger>
          <TooltipContent>Reset zoom naar automatisch passend bij data</TooltipContent>
        </Tooltip>

        {compactToolbar && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Meer opties"
                className={cn(
                  "relative h-7 w-7 border-(--border-solid)",
                  "text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)",
                )}
              >
                <MoreHorizontal className="size-3.5" />
                {anyOverflowToggleActive && (
                  <span
                    aria-hidden
                    className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-(--accent)"
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 space-y-1 p-1.5">
              {overflowControls.map((c) => (
                <div key={c.key}>{renderControlButton(c, true)}</div>
              ))}
            </PopoverContent>
          </Popover>
        )}

        <Tooltip>
          <TooltipTrigger asChild>{renderCloseButton()}</TooltipTrigger>
          <TooltipContent>{canClose ? "Sluit grafiek" : "Laatste grafiek — sluiten uit"}</TooltipContent>
        </Tooltip>

        {/* 09b: verborgen meet-tweeling — rendert de VOLLEDIGE inline-knoppenset
            (zonder de flex-1 spacer) zodat we via offsetWidth de natuurlijke
            breedte kennen. `invisible` houdt 'm uit beeld én uit de tab-volgorde;
            `w-max` voorkomt dat de flex-items in de 0-px wrapper samengeperst
            worden; de wrapper (h-0 w-0 overflow-hidden) zorgt dat 'ie geen
            ruimte inneemt of scrollbars veroorzaakt. */}
        <div className="invisible pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden>
          <div ref={measureRef} className="flex w-max items-center gap-1.5 px-2">
            <div className="h-7 w-[150px]" />
            {overflowControls.map((c) => (
              <span key={c.key}>{renderControlButton(c, false)}</span>
            ))}
            {renderAutoZoomButton()}
            {renderCloseButton()}
          </div>
        </div>
      </div>

      {/* Body: chart + optional measure-info-bar */}
      <div className="flex flex-1 flex-col min-h-0">
        {enoughPoints ? (
          <>
            <div className="flex-1 min-h-0 p-2">
              <InteractiveChart
                series={chartSeries}
                xLabel={xLabel}
                yLabel={yLabel}
                // Geen verticale stippellijn meer in videometen: de rode dot
                // op `selectedIdx` is voldoende indicator (currentFrame snapt
                // altijd naar een meetpunt). `playheadPlugin` blijft bestaan
                // in `_reusable/chart-plugins/` voor andere consumers.
                playheadX={null}
                selectedIdx={selectedIdx}
                hoveredIdx={hoveredIdx}
                tangent={{
                  active: state.tangentActive,
                  atIdx: tangentAnchorIdx,
                  override: tangentOverride,
                }}
                measureLines={
                  state.measureActive
                    ? {
                        x1: state.measureX1,
                        x2: state.measureX2,
                        onChange: onMeasureChange,
                      }
                    : undefined
                }
                xBand={
                  // Lichte tint over het fit-range-segment, alleen op
                  // t-grafieken (de tijd-as moet zinvol zijn). Aan zodra de
                  // pane Fit-toggle aan staat én een fit beschikbaar is.
                  state.showFit && fitAvailable && def.isTimeAxis
                    ? {
                        xMin: fits.fitTRange.tMin,
                        xMax: fits.fitTRange.tMax,
                        fill: "rgba(212, 146, 58, 0.07)",
                      }
                    : null
                }
                initialZoomState={state.zoomState}
                resetTrigger={resetCounter}
                onZoomChange={onZoomChange}
                onPointClick={onPointClick}
                onAreaClick={onAreaClick}
                onPointHover={onHover}
                onChartReady={onChartReady}
              />
            </div>
            {state.measureActive && measureInfo ? (
              <MeasureInfoBar
                xLabel={xLabel}
                yLabel={yLabel}
                x1={state.measureX1}
                x2={state.measureX2}
                y1={measureInfo.y1}
                y2={measureInfo.y2}
                unitDecimals={unit === "mm" ? 1 : 2}
              />
            ) : null}
            {state.showFit && relevantFitActive && isDerivativePane && fitAvailable ? (
              <DatasetLegend
                scatterColor={themeColors.accent}
                fitColor={themeColors.fit}
              />
            ) : null}
            {state.showFit && relevantFitActive ? (
              <FitInfoBar
                paneType={state.type}
                fitNeed={fitNeed}
                fits={fits}
                fitFailed={fitFailed}
              />
            ) : null}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-4 text-center text-[12px] text-(--text-muted)">
            Meer metingen nodig: minimaal {def.minPoints} voor dit type.
          </div>
        )}
      </div>
    </div>
  );
}

interface MeasureInfoBarProps {
  xLabel: string;
  yLabel: string;
  x1: number | null;
  x2: number | null;
  y1: number | null;
  y2: number | null;
  unitDecimals: number;
}

interface FitInfoBarProps {
  paneType: GraphTypeKey;
  fitNeed: FitNeed;
  fits: FitsResult;
  /**
   * `true` als de leerling een fit-type heeft gevraagd maar de berekening
   * niet kon convergeren (bv. sinus zonder duidelijke periodiciteit). Dan
   * tonen we een nette uitleg in plaats van een formule.
   */
  fitFailed: boolean;
}

/**
 * R²-tooltip-inhoud — uitleg in vier categorieën zoals afgesproken in 07c.
 * Hover op de R²-tekst onder een chart toont dit blok zodat leerlingen weten
 * hoe ze de waarde moeten interpreteren.
 */
function RSquaredTooltipContent() {
  return (
    <div className="max-w-[36ch] space-y-1 leading-snug">
      <p>
        <strong>R²</strong> zegt hoe netjes de fit door je metingen loopt.
      </p>
      <ul className="ml-3 list-disc space-y-0.5 text-[11px]">
        <li>1 = perfect (elke meting valt op de curve)</li>
        <li>0,95+ = uitstekend</li>
        <li>0,8–0,95 = redelijk</li>
        <li>&lt; 0,8 = misschien past een ander fit-type beter</li>
      </ul>
    </div>
  );
}

/**
 * R²-waarde met cursor-help-tooltip. Subscript-letter (`x` of `y`) bij
 * gecombineerde panes om aan te geven welke bron-fit het is.
 */
function RSquaredCell({ value, subscript }: { value: number; subscript?: "x" | "y" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help text-(--text-muted) underline decoration-dotted underline-offset-2 hover:text-(--text-secondary)">
          R²{subscript ? <sub>{subscript}</sub> : null} = {formatDecimal(value, 3)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <RSquaredTooltipContent />
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Bouw de set formule-regels die we onder de chart willen tonen, plus de
 * bijbehorende R²-waardes per BRON-fit (x en/of y). Zie de tabel in prompt
 * 07c voor de pane-type → derivative-mapping.
 *
 * 07d: regels zijn nu token-reeksen i.p.v. platte strings. Token-`coef`
 * krijgt in de renderer een tooltip met fysische uitleg + berekende waardes
 * (versnelling, periode, frequentie, etc.).
 */
interface FormulaLine {
  tokens: FormulaToken[];
  /** Symbolische slot-regel zoals `|v|(t) = √(vx² + vy²)`. Geen R². */
  symbolic?: boolean;
}
interface FormulaSet {
  lines: FormulaLine[];
  rXSource: number | null;
  rYSource: number | null;
}

function buildFormulaSet(paneType: GraphTypeKey, fits: FitsResult): FormulaSet {
  const fx = fits.x;
  const fy = fits.y;
  const lines: FormulaLine[] = [];
  let rXSource: number | null = null;
  let rYSource: number | null = null;

  const pushX = (varName: string, deriv: FitDerivative) => {
    if (!fx) return;
    const axis: FormulaAxis = "x";
    lines.push({ tokens: formatFitFormulaTokens(fx, deriv, varName, axis) });
    rXSource = fx.rSquared;
  };
  const pushY = (varName: string, deriv: FitDerivative) => {
    if (!fy) return;
    const axis: FormulaAxis = "y";
    lines.push({ tokens: formatFitFormulaTokens(fy, deriv, varName, axis) });
    rYSource = fy.rSquared;
  };

  switch (paneType) {
    case "x-t":
      pushX("x", 0);
      break;
    case "y-t":
      pushY("y", 0);
      break;
    case "vx-t":
      pushX("vx", 1);
      break;
    case "vy-t":
      pushY("vy", 1);
      break;
    case "ax-t":
      pushX("ax", 2);
      break;
    case "ay-t":
      pushY("ay", 2);
      break;
    case "vmag-t":
      pushX("vx", 1);
      pushY("vy", 1);
      // Symbolische slot-regel: geen numerieke uitwerking — leerling ziet
      // dat |v| een combinatie is van vx en vy.
      lines.push({
        tokens: [{ kind: "text", text: "|v|(t) = √(vx² + vy²)" }],
        symbolic: true,
      });
      break;
    case "amag-t":
      pushX("ax", 2);
      pushY("ay", 2);
      lines.push({
        tokens: [{ kind: "text", text: "|a|(t) = √(ax² + ay²)" }],
        symbolic: true,
      });
      break;
    case "y-x":
      pushX("x", 0);
      pushY("y", 0);
      break;
  }
  return { lines, rXSource, rYSource };
}

/**
 * Compacte info-regel onder de chart die de actieve fit-formule(s) + R²
 * toont. Per pane-type rendert 'ie de juiste afgeleide-formule (positie,
 * vx/vy, ax/ay) i.p.v. altijd de positie-fit. R² blijft de R² van de
 * BRON-fit (de positie-fit) — analytische afgeleiden hebben geen eigen R².
 *
 * Bij `fitFailed`: nette waarschuwing met hint om type of fit-range
 * aan te passen.
 */
function FitInfoBar({ paneType, fitNeed, fits, fitFailed }: FitInfoBarProps) {
  if (fitFailed) {
    const which = fitNeed === "x" ? "x-fit" : fitNeed === "y" ? "y-fit" : "fit";
    return (
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-0.5 border-t bg-(--bg-secondary) px-3 py-1 font-mono text-[11px] text-(--accent-amber, var(--accent))"
        style={{ borderColor: "var(--border)" }}
      >
        <span>
          ⚠ {which} kon niet convergeren — probeer een ander type of pas de
          fit-range aan.
        </span>
      </div>
    );
  }
  const set = buildFormulaSet(paneType, fits);
  if (set.lines.length === 0) return null;

  // Voor enkel-fit-panes (x-t / y-t / vx-t / vy-t / ax-t / ay-t) staat R²
  // op dezelfde regel als de formule. Voor combi-panes (|v|, |a|, y-x)
  // staan beide R²-waardes apart op de symbolische / laatste regel.
  const isCombiPane =
    paneType === "vmag-t" || paneType === "amag-t" || paneType === "y-x";

  return (
    <div
      className="flex flex-col gap-y-0.5 border-t bg-(--bg-secondary) px-3 py-1 font-mono text-[11px] text-(--text-secondary)"
      style={{ borderColor: "var(--border)" }}
    >
      {set.lines.map((line, i) => {
        const isLast = i === set.lines.length - 1;
        return (
          <span key={i} className="flex flex-wrap items-center gap-x-3 whitespace-nowrap">
            <FormulaTokenRow tokens={line.tokens} />
            {!isCombiPane && isLast ? (
              // Enkele-fit pane: één R² achter de enige formule-regel.
              set.rXSource != null ? (
                <RSquaredCell value={set.rXSource} />
              ) : set.rYSource != null ? (
                <RSquaredCell value={set.rYSource} />
              ) : null
            ) : null}
            {isCombiPane && isLast ? (
              // Combi-pane: x- en y-R² op de slot-regel.
              <span className="flex items-center gap-x-3">
                {set.rXSource != null ? (
                  <RSquaredCell value={set.rXSource} subscript="x" />
                ) : null}
                {set.rYSource != null ? (
                  <RSquaredCell value={set.rYSource} subscript="y" />
                ) : null}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

/**
 * 07d: rendert een token-reeks (text + coefficient-coefs) waarbij elke
 * `coef`-token een hover-tooltip met fysische uitleg krijgt. Stijl:
 * dotted-underline + cursor-help, consistent met R²-cell.
 */
function FormulaTokenRow({ tokens }: { tokens: FormulaToken[] }) {
  return (
    <span>
      {tokens.map((tok, i) => {
        if (tok.kind === "text") {
          return <span key={i}>{tok.text}</span>;
        }
        return (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span className="cursor-help text-(--text-primary) underline decoration-dotted underline-offset-2 hover:text-(--accent)">
                {tok.text}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-[36ch] leading-snug">
              {tok.tooltip}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
}

/**
 * 07d: compacte legend onder een afgeleide-pane, alleen wanneer fit aan
 * staat. Maakt het visueel verschil tussen scatter (ruwe central-difference)
 * en fit-curve (analytische afgeleide) expliciet — anders is voor leerlingen
 * een lijn-met-dots een lijn-met-dots. Met een korte tagline erbij die de
 * pedagogische boodschap subtiel binnenbrengt.
 */
function DatasetLegend({
  scatterColor,
  fitColor,
}: {
  scatterColor: string;
  fitColor: string;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-0.5 border-t bg-(--bg-secondary) px-3 py-1 text-[11px] text-(--text-muted)"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block size-2 rounded-full"
          style={{ background: scatterColor }}
        />
        <span>Ruwe afgeleide (uit meetpunten — gevoelig voor ruis)</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block h-[2px] w-4"
          style={{ background: fitColor }}
        />
        <span>Fit-afgeleide (uit wiskundig model — glad)</span>
      </span>
    </div>
  );
}

function MeasureInfoBar({ xLabel, yLabel, x1, x2, y1, y2, unitDecimals }: MeasureInfoBarProps) {
  const xVar = xLabel.split(" ")[0] ?? "x";
  const yVar = yLabel.split(" ")[0] ?? "y";
  const fmt = (v: number | null, d = unitDecimals) => (v == null ? "—" : formatDecimal(v, d));
  const dx = x1 != null && x2 != null ? x2 - x1 : null;
  const dy = y1 != null && y2 != null ? y2 - y1 : null;
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t bg-(--bg-secondary) px-3 py-1 font-mono text-[11px] text-(--text-secondary)"
      style={{ borderColor: "var(--border)" }}
    >
      <span>
        <span style={{ color: "#0BB5C8" }}>
          {xVar}₁={fmt(x1)}
        </span>
        &emsp;{yVar}₁={fmt(y1)}
      </span>
      <span>
        <span style={{ color: "#D4923A" }}>
          {xVar}₂={fmt(x2)}
        </span>
        &emsp;{yVar}₂={fmt(y2)}
      </span>
      <span>Δ{xVar}={fmt(dx)}</span>
      <span>Δ{yVar}={fmt(dy)}</span>
    </div>
  );
}
