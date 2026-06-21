import { type FitType } from "@/_reusable/fit";
import {
  type AxisCalibration,
  type LengthUnit,
  type Pixel,
  type ScaleCalibration,
} from "@/features/calibration/CalibrationState";
import { type GraphTypeKey } from "@/features/measurements/graph-types";
import { type FitConfig } from "@/features/measurements/GraphsLayoutState";
import { type ZoomState } from "@nh/shared/InteractiveChart";
import { type TrackedPoint, type TrailColor } from "@/features/tracking/TrackingState";

/**
 * Project-bestandsformaat voor videometen. Bevat alle herstelbare sessie-
 * state behalve de video zelf (te zwaar voor JSON — die wordt bij laden
 * opnieuw aan de gebruiker gevraagd).
 *
 * Schema-versie 1: eerste publieke versie (prompt 06).
 * Schema-versie 2: fit-state — `ui.graphs.fitConfig` + per-pane `showFit`
 *                  (prompt 07). v1-bestanden worden bij laden automatisch
 *                  gemigreerd; alle fit-velden krijgen 'none' / `false`.
 * Schema-versie 3: uitgebreide fit-types ('sine', 'exponential') +
 *                  optionele `fitConfig.range` (sub-selectie binnen de
 *                  trim, `null` = volledige trim). v2-bestanden krijgen
 *                  `range: null` bij migratie; v1 loopt door v2 heen.
 * Schema-versie 4: `ui.graphs.syncXZoom` veld weg (Tijd-as sync feature
 *                  verwijderd in 07f — werkte niet betrouwbaar genoeg).
 *                  v3-bestanden negeren het veld bij load en schrijven
 *                  niet meer bij save.
 * Schema-versie 5: 'exponential' fit-type verwijderd (07g — niet relevant
 *                  voor video-analyse); exp-keuzes migreren naar 'none'.
 *                  Nieuw veld `fitConfig.showExtrapolation` (default false).
 * Schema-versie 6: `fitConfig.showExtrapolation` weer weg (07k — extrapolatie
 *                  staat nu altijd aan, toggle verwijderd). v5-bestanden
 *                  laten 't veld vallen bij migratie.
 * Schema-versie 7: `ui.mode` 'verken' hernoemd naar 'meten' (08c). v6-bestanden
 *                  met 'verken' migreren naar 'meten'.
 * Schema-versie 8: `calibration.axes.xPositiveDirection` / `yPositiveDirection`
 *                  (11 — richting-toggles). v7-bestanden krijgen defaults
 *                  'right' / 'up' bij migratie.
 */
export const PROJECT_SCHEMA_VERSION = 8 as const;

/** Per-pane snapshot in de save-file (subset van runtime PaneState). */
export interface ProjectPaneJSON {
  type: GraphTypeKey;
  showLine: boolean;
  /** v2: fit-curve / fit-afgeleide zichtbaar in deze pane. */
  showFit: boolean;
  zoom: ZoomState | null;
  tangentActive: boolean;
  measureActive: boolean;
  measureX1: number | null;
  measureX2: number | null;
}

export interface ProjectJSON {
  schemaVersion: 8;
  meta: {
    toolName: "videometen";
    toolVersion: string;
    savedAt: string;
    videoFileName: string | null;
  };
  video: {
    fps: number;
    lastFrame: number;
    trim: { start: number; end: number };
  };
  calibration: {
    scale: {
      p1: Pixel;
      p2: Pixel;
      length: number;
      unit: LengthUnit;
    } | null;
    axes: {
      origin: Pixel;
      angle: number;
      /** v8: positieve richting per as (11). */
      xPositiveDirection: "right" | "left";
      yPositiveDirection: "up" | "down";
    };
  };
  tracking: {
    points: TrackedPoint[];
    frameStep: number;
  };
  ui: {
    mode: "meten" | "analyseren";
    trailColor: TrailColor;
    graphs: {
      panes: ProjectPaneJSON[];
      /**
       * v3: globale x/y fit-config (één keuze per coördinaat) + optionele
       * `range` voor sub-selectie binnen de trim. `range: null` ⇒ volledige
       * trim. Voor v2-bestanden migreert de loader `range` naar `null`.
       */
      fitConfig: FitConfig;
    };
  };
}

/**
 * Runtime-snapshot die nodig is om `serializeProject` te kunnen aanroepen.
 * Een hook (`useProjectIO` in [project/useProjectIO.ts]) verzamelt 'm uit
 * de losse providers en geeft 'm hier door.
 */
export interface ProjectSnapshot {
  toolVersion: string;
  videoFileName: string | null;
  fps: number;
  lastFrame: number;
  trim: { start: number; end: number };
  scale: ScaleCalibration | null;
  axes: AxisCalibration;
  points: TrackedPoint[];
  frameStep: number;
  mode: "meten" | "analyseren";
  trailColor: TrailColor;
  panes: ProjectPaneJSON[];
  /** v3: globale fit-config — fit-types + optionele range-sub-selectie. */
  fitConfig: FitConfig;
}

export function serializeProject(snapshot: ProjectSnapshot): ProjectJSON {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    meta: {
      toolName: "videometen",
      toolVersion: snapshot.toolVersion,
      savedAt: new Date().toISOString(),
      videoFileName: snapshot.videoFileName,
    },
    video: {
      fps: snapshot.fps,
      lastFrame: snapshot.lastFrame,
      trim: { ...snapshot.trim },
    },
    calibration: {
      scale: snapshot.scale
        ? {
            p1: { ...snapshot.scale.p1 },
            p2: { ...snapshot.scale.p2 },
            length: snapshot.scale.length,
            unit: snapshot.scale.unit,
          }
        : null,
      axes: {
        origin: { ...snapshot.axes.origin },
        angle: snapshot.axes.angle,
        xPositiveDirection: snapshot.axes.xPositiveDirection,
        yPositiveDirection: snapshot.axes.yPositiveDirection,
      },
    },
    tracking: {
      points: snapshot.points.map((p) => ({
        frame: p.frame,
        pixel: { ...p.pixel },
      })),
      frameStep: snapshot.frameStep,
    },
    ui: {
      mode: snapshot.mode,
      trailColor: snapshot.trailColor,
      graphs: {
        panes: snapshot.panes.map((p) => ({ ...p, zoom: p.zoom ? { ...p.zoom } : null })),
        fitConfig: {
          ...snapshot.fitConfig,
          range: snapshot.fitConfig.range ? { ...snapshot.fitConfig.range } : null,
        },
      },
    },
  };
}

/** Foutmelding bij laden van een ongeldig of incompatibel project-bestand. */
export class ProjectLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectLoadError";
  }
}

const VALID_TRAIL_COLORS: readonly TrailColor[] = ["teal", "amber", "magenta", "white"];
const VALID_UNITS: readonly LengthUnit[] = ["m", "cm", "mm"];
const VALID_GRAPH_TYPES: readonly GraphTypeKey[] = [
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
const VALID_FIT_TYPES: readonly FitType[] = ["none", "linear", "quadratic", "sine"];

const DEFAULT_FIT_CONFIG: FitConfig = {
  xFit: "none",
  yFit: "none",
  range: null,
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isPixel(v: unknown): v is Pixel {
  return isObject(v) && typeof v.x === "number" && typeof v.y === "number";
}

function requireField<T>(obj: Record<string, unknown>, key: string, check: (v: unknown) => v is T, label: string): T {
  const v = obj[key];
  if (!check(v)) {
    throw new ProjectLoadError(`Veld ontbreekt of ongeldig: ${label}`);
  }
  return v;
}

/**
 * Migreer een v1-project naar v2 door fit-velden toe te voegen met defaults
 * ('none' / `false`). Maakt een ondiepe kopie van het topniveau-object zodat
 * de input niet gemuteerd wordt; pane-objecten worden ook geclonet.
 */
function migrateV1toV2(v1: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v1, schemaVersion: 2 };
  const uiSrc = v1.ui;
  if (isObject(uiSrc)) {
    const ui: Record<string, unknown> = { ...uiSrc };
    const graphsSrc = uiSrc.graphs;
    if (isObject(graphsSrc)) {
      const graphs: Record<string, unknown> = { ...graphsSrc };
      if (Array.isArray(graphsSrc.panes)) {
        graphs.panes = graphsSrc.panes.map((p) =>
          isObject(p) ? { ...p, showFit: false } : p,
        );
      }
      if (!isObject(graphsSrc.fitConfig)) {
        graphs.fitConfig = { xFit: "none", yFit: "none" };
      }
      ui.graphs = graphs;
    }
    out.ui = ui;
  }
  return out;
}

/**
 * Migreer een v7-project naar v8: voeg richting-defaults toe aan de assen
 * (`xPositiveDirection: 'right'`, `yPositiveDirection: 'up'` — 11). Bestaande
 * projecten gedragen zich identiek (defaults = oude impliciete gedrag).
 */
function migrateV7toV8(v7: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v7, schemaVersion: 8 };
  const calSrc = v7.calibration;
  if (isObject(calSrc)) {
    const cal: Record<string, unknown> = { ...calSrc };
    const axesSrc = calSrc.axes;
    if (isObject(axesSrc)) {
      cal.axes = {
        ...axesSrc,
        xPositiveDirection: axesSrc.xPositiveDirection ?? "right",
        yPositiveDirection: axesSrc.yPositiveDirection ?? "up",
      };
    }
    out.calibration = cal;
  }
  return out;
}

/**
 * Migreer een v6-project naar v7: `ui.mode` 'verken' → 'meten' (08c — modus
 * hernoemd). 'analyseren' blijft. Verder geen wijzigingen.
 */
function migrateV6toV7(v6: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v6, schemaVersion: 7 };
  const uiSrc = v6.ui;
  if (isObject(uiSrc)) {
    const ui: Record<string, unknown> = { ...uiSrc };
    if (ui.mode === "verken") ui.mode = "meten";
    out.ui = ui;
  }
  return out;
}

/**
 * Migreer een v5-project naar v6: `fitConfig.showExtrapolation` weg
 * (extrapolatie staat sinds 07k altijd aan). Verder geen wijzigingen.
 */
function migrateV5toV6(v5: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v5, schemaVersion: 6 };
  const uiSrc = v5.ui;
  if (isObject(uiSrc)) {
    const ui: Record<string, unknown> = { ...uiSrc };
    const graphsSrc = uiSrc.graphs;
    if (isObject(graphsSrc)) {
      const graphs: Record<string, unknown> = { ...graphsSrc };
      const fitSrc = graphsSrc.fitConfig;
      if (isObject(fitSrc)) {
        const fit: Record<string, unknown> = { ...fitSrc };
        delete fit.showExtrapolation;
        graphs.fitConfig = fit;
      }
      ui.graphs = graphs;
    }
    out.ui = ui;
  }
  return out;
}

/**
 * Migreer een v4-project naar v5: 'exponential' fit-keuzes worden 'none'
 * (exp-fit verwijderd in 07g) en `fitConfig.showExtrapolation` komt erbij
 * met default `false`.
 */
function migrateV4toV5(v4: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v4, schemaVersion: 5 };
  const uiSrc = v4.ui;
  if (isObject(uiSrc)) {
    const ui: Record<string, unknown> = { ...uiSrc };
    const graphsSrc = uiSrc.graphs;
    if (isObject(graphsSrc)) {
      const graphs: Record<string, unknown> = { ...graphsSrc };
      const fitSrc = graphsSrc.fitConfig;
      const fit: Record<string, unknown> = isObject(fitSrc)
        ? { ...fitSrc }
        : { xFit: "none", yFit: "none", range: null };
      if (fit.xFit === "exponential") fit.xFit = "none";
      if (fit.yFit === "exponential") fit.yFit = "none";
      if (!("showExtrapolation" in fit)) fit.showExtrapolation = false;
      graphs.fitConfig = fit;
      ui.graphs = graphs;
    }
    out.ui = ui;
  }
  return out;
}

/**
 * Migreer een v3-project naar v4 door het `syncXZoom` veld te droppen
 * (Tijd-as sync feature verwijderd in 07f). Verder geen wijzigingen — alle
 * andere velden zijn identiek aan v3.
 */
function migrateV3toV4(v3: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v3, schemaVersion: 4 };
  const uiSrc = v3.ui;
  if (isObject(uiSrc)) {
    const ui: Record<string, unknown> = { ...uiSrc };
    const graphsSrc = uiSrc.graphs;
    if (isObject(graphsSrc)) {
      const graphs: Record<string, unknown> = { ...graphsSrc };
      delete graphs.syncXZoom;
      ui.graphs = graphs;
    }
    out.ui = ui;
  }
  return out;
}

/**
 * Migreer een v2-project naar v3 door `fitConfig.range` op `null` te zetten
 * (= volledige trim gebruiken — gedrag-compatibel met v2-bestanden, die
 * impliciet altijd de hele trim gebruikten).
 */
function migrateV2toV3(v2: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v2, schemaVersion: 3 };
  const uiSrc = v2.ui;
  if (isObject(uiSrc)) {
    const ui: Record<string, unknown> = { ...uiSrc };
    const graphsSrc = uiSrc.graphs;
    if (isObject(graphsSrc)) {
      const graphs: Record<string, unknown> = { ...graphsSrc };
      const fitSrc = graphsSrc.fitConfig;
      const baseFit: Record<string, unknown> = isObject(fitSrc)
        ? { ...fitSrc }
        : { xFit: "none", yFit: "none" };
      if (!("range" in baseFit)) baseFit.range = null;
      graphs.fitConfig = baseFit;
      ui.graphs = graphs;
    }
    out.ui = ui;
  }
  return out;
}

/**
 * Parsed een onbekend object naar een geldig `ProjectJSON`. Gooit
 * `ProjectLoadError` bij elke schending van het schema. Strenger dan strikt
 * nodig — beter een nette foutmelding dan stille corruptie van state.
 *
 * Versie-dispatch:
 *  - v1 → migrateV1toV2 → … → migrateV7toV8 → v8-flow
 *  - v2 → migrateV2toV3 → … → migrateV7toV8 → v8-flow
 *  - v3 → migrateV3toV4 → … → migrateV7toV8 → v8-flow
 *  - v4 → migrateV4toV5 → … → migrateV7toV8 → v8-flow
 *  - v5 → migrateV5toV6 → … → migrateV7toV8 → v8-flow
 *  - v6 → migrateV6toV7 → migrateV7toV8 → v8-flow
 *  - v7 → migrateV7toV8 → v8-flow
 *  - v8 → direct
 *  - anders: nette foutmelding
 */
export function deserializeProject(input: unknown): ProjectJSON {
  if (!isObject(input)) {
    throw new ProjectLoadError("Bestand bevat geen geldig JSON-object.");
  }
  const v = input.schemaVersion;
  let normalized: Record<string, unknown> = input;
  if (v === 1) {
    normalized = migrateV7toV8(
      migrateV6toV7(
        migrateV5toV6(migrateV4toV5(migrateV3toV4(migrateV2toV3(migrateV1toV2(input))))),
      ),
    );
  } else if (v === 2) {
    normalized = migrateV7toV8(
      migrateV6toV7(migrateV5toV6(migrateV4toV5(migrateV3toV4(migrateV2toV3(input))))),
    );
  } else if (v === 3) {
    normalized = migrateV7toV8(
      migrateV6toV7(migrateV5toV6(migrateV4toV5(migrateV3toV4(input)))),
    );
  } else if (v === 4) {
    normalized = migrateV7toV8(migrateV6toV7(migrateV5toV6(migrateV4toV5(input))));
  } else if (v === 5) {
    normalized = migrateV7toV8(migrateV6toV7(migrateV5toV6(input)));
  } else if (v === 6) {
    normalized = migrateV7toV8(migrateV6toV7(input));
  } else if (v === 7) {
    normalized = migrateV7toV8(input);
  } else if (v !== PROJECT_SCHEMA_VERSION) {
    if (typeof v === "number") {
      throw new ProjectLoadError(
        `Onbekende projectversie ${v}. Update de tool om dit project te openen.`,
      );
    }
    throw new ProjectLoadError("Bestand mist een schemaVersion.");
  }
  // Vanaf hier werkt de parser op het (mogelijk gemigreerde) v8-object.
  const data = normalized;

  // ---- meta -------------------------------------------------------------
  const meta = requireField(data, "meta", isObject, "meta");
  if (meta.toolName !== "videometen") {
    throw new ProjectLoadError("Project is niet voor videometen gemaakt.");
  }
  const toolVersion = typeof meta.toolVersion === "string" ? meta.toolVersion : "0.0.0";
  const savedAt = typeof meta.savedAt === "string" ? meta.savedAt : new Date().toISOString();
  const videoFileName =
    typeof meta.videoFileName === "string" || meta.videoFileName === null
      ? (meta.videoFileName as string | null)
      : null;

  // ---- video ------------------------------------------------------------
  const video = requireField(data, "video", isObject, "video");
  const fps = requireField(video, "fps", (x): x is number => typeof x === "number" && x > 0, "video.fps");
  const lastFrame = requireField(
    video,
    "lastFrame",
    (x): x is number => typeof x === "number" && x >= 0,
    "video.lastFrame",
  );
  const trimRaw = requireField(video, "trim", isObject, "video.trim");
  const trim = {
    start: requireField(trimRaw, "start", (x): x is number => typeof x === "number", "video.trim.start"),
    end: requireField(trimRaw, "end", (x): x is number => typeof x === "number", "video.trim.end"),
  };

  // ---- calibration ------------------------------------------------------
  const cal = requireField(data, "calibration", isObject, "calibration");
  let scale: ProjectJSON["calibration"]["scale"] = null;
  if (cal.scale !== null) {
    const s = requireField(cal, "scale", isObject, "calibration.scale");
    const unitVal = s.unit;
    const unit = typeof unitVal === "string" && (VALID_UNITS as readonly string[]).includes(unitVal)
      ? (unitVal as LengthUnit)
      : null;
    if (!unit) throw new ProjectLoadError("Onbekende lengte-eenheid in scale.");
    scale = {
      p1: requireField(s, "p1", isPixel, "calibration.scale.p1"),
      p2: requireField(s, "p2", isPixel, "calibration.scale.p2"),
      length: requireField(
        s,
        "length",
        (x): x is number => typeof x === "number" && x > 0,
        "calibration.scale.length",
      ),
      unit,
    };
  }
  const axesRaw = requireField(cal, "axes", isObject, "calibration.axes");
  // v8: richtingen — migrators vullen defaults; defensief nog eens valideren.
  const xDir = axesRaw.xPositiveDirection === "left" ? "left" : "right";
  const yDir = axesRaw.yPositiveDirection === "down" ? "down" : "up";
  const axes: ProjectJSON["calibration"]["axes"] = {
    origin: requireField(axesRaw, "origin", isPixel, "calibration.axes.origin"),
    angle: requireField(
      axesRaw,
      "angle",
      (x): x is number => typeof x === "number",
      "calibration.axes.angle",
    ),
    xPositiveDirection: xDir,
    yPositiveDirection: yDir,
  };

  // ---- tracking ---------------------------------------------------------
  const trk = requireField(data, "tracking", isObject, "tracking");
  const rawPoints = requireField(trk, "points", Array.isArray, "tracking.points");
  const points: TrackedPoint[] = rawPoints.map((p, i) => {
    if (!isObject(p) || typeof p.frame !== "number" || !isPixel(p.pixel)) {
      throw new ProjectLoadError(`tracking.points[${i}] is ongeldig.`);
    }
    return { frame: p.frame, pixel: { x: p.pixel.x, y: p.pixel.y } };
  });
  const frameStep = requireField(
    trk,
    "frameStep",
    (x): x is number => typeof x === "number" && x >= 1,
    "tracking.frameStep",
  );

  // ---- ui ---------------------------------------------------------------
  const ui = requireField(data, "ui", isObject, "ui");
  const modeVal = ui.mode;
  if (modeVal !== "meten" && modeVal !== "analyseren") {
    throw new ProjectLoadError(`Onbekende modus '${String(modeVal)}'.`);
  }
  const trailColorVal = ui.trailColor;
  if (
    typeof trailColorVal !== "string" ||
    !(VALID_TRAIL_COLORS as readonly string[]).includes(trailColorVal)
  ) {
    throw new ProjectLoadError("Onbekende trail-kleur in project.");
  }
  const graphsRaw = requireField(ui, "graphs", isObject, "ui.graphs");
  const panesRaw = requireField(graphsRaw, "panes", Array.isArray, "ui.graphs.panes");
  const panes: ProjectPaneJSON[] = panesRaw.map((p, i) => {
    if (!isObject(p)) throw new ProjectLoadError(`ui.graphs.panes[${i}] ongeldig.`);
    const type = p.type;
    if (typeof type !== "string" || !(VALID_GRAPH_TYPES as readonly string[]).includes(type)) {
      throw new ProjectLoadError(`ui.graphs.panes[${i}].type ongeldig.`);
    }
    let zoom: ZoomState | null = null;
    if (p.zoom !== null && p.zoom !== undefined) {
      const z = p.zoom;
      if (
        !isObject(z) ||
        typeof z.xMin !== "number" ||
        typeof z.xMax !== "number" ||
        typeof z.yMin !== "number" ||
        typeof z.yMax !== "number"
      ) {
        throw new ProjectLoadError(`ui.graphs.panes[${i}].zoom ongeldig.`);
      }
      zoom = { xMin: z.xMin, xMax: z.xMax, yMin: z.yMin, yMax: z.yMax };
    }
    return {
      type: type as GraphTypeKey,
      showLine: !!p.showLine,
      // v2-veld; v1-bestanden hebben dit niet → migrator zet 'm op false.
      showFit: !!p.showFit,
      zoom,
      tangentActive: !!p.tangentActive,
      measureActive: !!p.measureActive,
      measureX1: typeof p.measureX1 === "number" ? p.measureX1 : null,
      measureX2: typeof p.measureX2 === "number" ? p.measureX2 : null,
    };
  });
  // v3+: fit-config met optionele range. Migrators vullen defaults in voor
  // oudere bestanden. (v5's `showExtrapolation` is in v6 weer weg.)
  let fitConfig: FitConfig = { ...DEFAULT_FIT_CONFIG };
  const fitRaw = graphsRaw.fitConfig;
  if (isObject(fitRaw)) {
    const xFitVal = fitRaw.xFit;
    const yFitVal = fitRaw.yFit;
    if (
      typeof xFitVal !== "string" ||
      !(VALID_FIT_TYPES as readonly string[]).includes(xFitVal) ||
      typeof yFitVal !== "string" ||
      !(VALID_FIT_TYPES as readonly string[]).includes(yFitVal)
    ) {
      throw new ProjectLoadError("ui.graphs.fitConfig ongeldig.");
    }
    let range: FitConfig["range"] = null;
    const rangeRaw = fitRaw.range;
    if (rangeRaw !== null && rangeRaw !== undefined) {
      if (
        !isObject(rangeRaw) ||
        typeof rangeRaw.start !== "number" ||
        typeof rangeRaw.end !== "number"
      ) {
        throw new ProjectLoadError("ui.graphs.fitConfig.range ongeldig.");
      }
      range = { start: rangeRaw.start, end: rangeRaw.end };
    }
    fitConfig = {
      xFit: xFitVal as FitType,
      yFit: yFitVal as FitType,
      range,
    };
  }

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    meta: { toolName: "videometen", toolVersion, savedAt, videoFileName },
    video: { fps, lastFrame, trim },
    calibration: { scale, axes },
    tracking: { points, frameStep },
    ui: {
      mode: modeVal,
      trailColor: trailColorVal as TrailColor,
      graphs: { panes, fitConfig },
    },
  };
}

/** Filename-safe versie van een string: vervang reserved chars met `_`. */
export function sanitizeFilename(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "_").trim();
}

/** Datum-stempel `YYYY-MM-DD`. */
export function dateStampYMD(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Tijdstempel `YYYY-MM-DD-HH-mm`. */
export function dateStampYMDHM(d = new Date()): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dateStampYMD(d)}-${hh}-${mm}`;
}

/** Strip de extensie van een filename. */
export function stripExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}
