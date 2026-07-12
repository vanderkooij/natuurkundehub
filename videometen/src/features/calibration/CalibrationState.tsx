import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

import { useVideo } from "@/features/video/VideoState";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Pixel {
  x: number;
  y: number;
}

export type LengthUnit = "m" | "cm" | "mm";

export interface ScaleCalibration {
  p1: Pixel;
  p2: Pixel;
  length: number;
  unit: LengthUnit;
}

export type AxisDirectionX = "right" | "left";
export type AxisDirectionY = "up" | "down";

/**
 * Origin in pixel coords. Angle in radians, physics convention:
 *  - 0 = +x naar rechts, +y omhoog (rechtsdraaiend stelsel)
 *  - positief = tegen de klok in (zoals natuurkundeles)
 *  - y blijft altijd 90° loodrecht op x
 *
 * 11: `xPositiveDirection` / `yPositiveDirection` flippen welke kant positief
 * telt, ZONDER `angle` te wijzigen. Defaults: +x rechts, +y omhoog (standaard
 * natuurkunde-stelsel). De flip wordt als teken (`signX`/`signY`) toegepast in
 * `pixelToWorld` — pixel-data blijft puur.
 */
export interface AxisCalibration {
  origin: Pixel;
  angle: number;
  xPositiveDirection: AxisDirectionX;
  yPositiveDirection: AxisDirectionY;
}

export type ToolMode = "idle" | "scale-edit" | "origin-edit" | "axis-edit-by-angle";

/**
 * True als de mode een assen-bewerkings-context is (11b). Bepaalt of de
 * sleep-oorsprong-hint + de +x/+y-richting-toggles getoond worden, en of een
 * sleep op origin/rotation-handle nog axis-edit moet aanzetten.
 */
export function isAxisEditing(mode: ToolMode): boolean {
  return mode === "axis-edit-by-angle" || mode === "origin-edit";
}

/** Tijdelijke draft tijdens scale-edit (eerste klik gezet, tweede nog niet). */
export interface ScaleDraft {
  p1: Pixel | null;
  p2: Pixel | null;
}

export interface CalibrationState {
  scale: ScaleCalibration | null;
  axes: AxisCalibration;
  axesTouched: boolean;
  mode: ToolMode;
  scaleDraft: ScaleDraft;
}

// ---------------------------------------------------------------------------
// Derived helpers (pure)
// ---------------------------------------------------------------------------

const UNIT_TO_METERS: Record<LengthUnit, number> = { m: 1, cm: 0.01, mm: 0.001 };

export function pixelDistance(a: Pixel, b: Pixel): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function metersPerPixel(scale: ScaleCalibration): number {
  const px = pixelDistance(scale.p1, scale.p2);
  if (px === 0) return 0;
  return (scale.length * UNIT_TO_METERS[scale.unit]) / px;
}

export function defaultAxes(videoWidth: number, videoHeight: number): AxisCalibration {
  return {
    origin: { x: videoWidth * 0.08, y: videoHeight * 0.92 },
    angle: 0,
    xPositiveDirection: "right",
    yPositiveDirection: "up",
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: "RESET_FOR_VIDEO"; width: number; height: number }
  | { type: "SET_MODE"; mode: ToolMode }
  | { type: "TOGGLE_SCALE_EDIT" }
  | { type: "SCALE_CLICK"; point: Pixel }
  | { type: "SCALE_COMMIT"; length: number; unit: LengthUnit }
  | { type: "SCALE_DRAFT_CLEAR" }
  | { type: "SCALE_CLEAR" }
  | { type: "SCALE_OPEN_LENGTH_EDITOR" }
  | { type: "SCALE_UPDATE_POINT"; which: "p1" | "p2"; point: Pixel }
  | { type: "SET_ORIGIN"; point: Pixel }
  | { type: "SET_AXIS_ANGLE"; angle: number }
  | { type: "FLIP_X_DIRECTION" }
  | { type: "FLIP_Y_DIRECTION" }
  | { type: "LOAD_FROM_PROJECT"; scale: ScaleCalibration | null; axes: AxisCalibration };

function initialState(): CalibrationState {
  return {
    scale: null,
    axes: defaultAxes(1280, 720),
    axesTouched: false,
    mode: "idle",
    scaleDraft: { p1: null, p2: null },
  };
}

function reducer(state: CalibrationState, action: Action): CalibrationState {
  switch (action.type) {
    case "RESET_FOR_VIDEO":
      return {
        ...initialState(),
        axes: defaultAxes(action.width, action.height),
      };
    case "SET_MODE": {
      // Always clear any pending draft when switching modes — switching out of
      // scale-edit (e.g. by clicking workflow-step 5) shouldn't leave a half-set draft.
      //
      // 08: het BETREDEN van een assen-edit-modus telt als bewuste aanraking
      // van stap 5 (`axesTouched`). Zo wordt stap 5 "done" zodra de leerling
      // de assen-fase opent, en gaat Start tracking pas open na die fase.
      const touchedAxes = action.mode === "axis-edit-by-angle" || action.mode === "origin-edit";
      return {
        ...state,
        mode: action.mode,
        scaleDraft: { p1: null, p2: null },
        axesTouched: state.axesTouched || touchedAxes,
      };
    }
    case "TOGGLE_SCALE_EDIT": {
      if (state.mode === "scale-edit") {
        return { ...state, mode: "idle", scaleDraft: { p1: null, p2: null } };
      }
      return { ...state, mode: "scale-edit", scaleDraft: { p1: null, p2: null } };
    }
    case "SCALE_CLICK": {
      // Only valid in placement sub-mode (no committed scale yet).
      if (state.mode !== "scale-edit") return state;
      if (state.scale !== null) return state;
      if (state.scaleDraft.p1 === null) {
        return { ...state, scaleDraft: { p1: action.point, p2: null } };
      }
      if (state.scaleDraft.p2 === null) {
        return { ...state, scaleDraft: { p1: state.scaleDraft.p1, p2: action.point } };
      }
      return state;
    }
    case "SCALE_COMMIT": {
      const { p1, p2 } = state.scaleDraft;
      if (!p1 || !p2) return state;
      return {
        ...state,
        scale: { p1, p2, length: action.length, unit: action.unit },
        scaleDraft: { p1: null, p2: null },
        // Stay in scale-edit so user can keep dragging handles or tweak length;
        // exit happens via chip-click / Esc / "Klaar".
      };
    }
    case "SCALE_DRAFT_CLEAR":
      // Cancel of the dialog. Does NOT change mode — caller handles that if needed.
      return { ...state, scaleDraft: { p1: null, p2: null } };
    case "SCALE_CLEAR":
      // Remove committed scale. Keep mode (in scale-edit, user can immediately re-place).
      return { ...state, scale: null, scaleDraft: { p1: null, p2: null } };
    case "SCALE_OPEN_LENGTH_EDITOR": {
      // Re-open the dialog for an already-committed scale to edit length/unit.
      // Pre-fills the draft with the committed points so the dialog's open condition holds.
      if (!state.scale || state.mode !== "scale-edit") return state;
      return { ...state, scaleDraft: { p1: state.scale.p1, p2: state.scale.p2 } };
    }
    case "SCALE_UPDATE_POINT": {
      if (!state.scale) return state;
      const next = { ...state.scale, [action.which]: action.point };
      // Guard against the two points overlapping (would make scale-factor blow up).
      const dx = next.p1.x - next.p2.x;
      const dy = next.p1.y - next.p2.y;
      if (Math.hypot(dx, dy) < 1) return state;
      return { ...state, scale: next };
    }
    case "SET_ORIGIN":
      return {
        ...state,
        axes: { ...state.axes, origin: action.point },
        axesTouched: true,
        mode: state.mode === "origin-edit" ? "idle" : state.mode,
      };
    case "SET_AXIS_ANGLE":
      return {
        ...state,
        axes: { ...state.axes, angle: action.angle },
        axesTouched: true,
      };
    case "FLIP_X_DIRECTION":
      return {
        ...state,
        axes: {
          ...state.axes,
          xPositiveDirection: state.axes.xPositiveDirection === "right" ? "left" : "right",
        },
        axesTouched: true,
      };
    case "FLIP_Y_DIRECTION":
      return {
        ...state,
        axes: {
          ...state.axes,
          yPositiveDirection: state.axes.yPositiveDirection === "up" ? "down" : "up",
        },
        axesTouched: true,
      };
    case "LOAD_FROM_PROJECT":
      // Direct overschrijven — bypass scale-edit-flow + draft state. Bedoeld
      // voor project-load; gebruikers-flow gaat via SCALE_COMMIT etc.
      return {
        ...state,
        scale: action.scale,
        axes: action.axes,
        axesTouched: true,
        mode: "idle",
        scaleDraft: { p1: null, p2: null },
      };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface CalibrationContextValue extends CalibrationState {
  startScaleEdit: () => void;
  toggleScaleEdit: () => void;
  startOriginEdit: () => void;
  startAxisEdit: () => void;
  setMode: (mode: ToolMode) => void;
  cancelMode: () => void;
  registerScaleClick: (point: Pixel) => void;
  commitScale: (length: number, unit: LengthUnit) => void;
  /** Cancel a dialog without exiting scale-edit mode. */
  clearScaleDraft: () => void;
  clearScale: () => void;
  openScaleLengthEditor: () => void;
  updateScalePoint: (which: "p1" | "p2", point: Pixel) => void;
  setOrigin: (point: Pixel) => void;
  setAxisAngle: (angle: number) => void;
  /** Flip de positieve x-richting (rechts ↔ links). */
  flipXDirection: () => void;
  /** Flip de positieve y-richting (omhoog ↔ omlaag). */
  flipYDirection: () => void;
  /** Harde reset: scale=null, axes=default, mode=idle. */
  resetCalibration: () => void;
  /** Laad scale + axes uit een opgeslagen project; bypass de scale-edit flow. */
  loadFromProject: (scale: ScaleCalibration | null, axes: AxisCalibration) => void;
}

const CalibrationContext = createContext<CalibrationContextValue | null>(null);

export function CalibrationProvider({ children }: { children: ReactNode }) {
  const { video } = useVideo();
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Reset calibration when a new video is loaded — defaults follow new dimensions.
  const lastUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const url = video?.url ?? null;
    if (url === lastUrlRef.current) return;
    lastUrlRef.current = url;
    if (video) {
      dispatch({ type: "RESET_FOR_VIDEO", width: video.width, height: video.height });
    }
  }, [video]);

  const setMode = useCallback((mode: ToolMode) => dispatch({ type: "SET_MODE", mode }), []);
  const startScaleEdit = useCallback(() => dispatch({ type: "SET_MODE", mode: "scale-edit" }), []);
  const toggleScaleEdit = useCallback(() => dispatch({ type: "TOGGLE_SCALE_EDIT" }), []);
  const startOriginEdit = useCallback(
    () => dispatch({ type: "SET_MODE", mode: "origin-edit" }),
    [],
  );
  const startAxisEdit = useCallback(
    () => dispatch({ type: "SET_MODE", mode: "axis-edit-by-angle" }),
    [],
  );
  const cancelMode = useCallback(() => dispatch({ type: "SET_MODE", mode: "idle" }), []);
  const registerScaleClick = useCallback(
    (point: Pixel) => dispatch({ type: "SCALE_CLICK", point }),
    [],
  );
  const commitScale = useCallback(
    (length: number, unit: LengthUnit) => dispatch({ type: "SCALE_COMMIT", length, unit }),
    [],
  );
  const clearScaleDraft = useCallback(() => dispatch({ type: "SCALE_DRAFT_CLEAR" }), []);
  const clearScale = useCallback(() => dispatch({ type: "SCALE_CLEAR" }), []);
  const openScaleLengthEditor = useCallback(
    () => dispatch({ type: "SCALE_OPEN_LENGTH_EDITOR" }),
    [],
  );
  const updateScalePoint = useCallback(
    (which: "p1" | "p2", point: Pixel) => dispatch({ type: "SCALE_UPDATE_POINT", which, point }),
    [],
  );
  const setOrigin = useCallback((point: Pixel) => dispatch({ type: "SET_ORIGIN", point }), []);
  const setAxisAngle = useCallback(
    (angle: number) => dispatch({ type: "SET_AXIS_ANGLE", angle }),
    [],
  );
  const flipXDirection = useCallback(() => dispatch({ type: "FLIP_X_DIRECTION" }), []);
  const flipYDirection = useCallback(() => dispatch({ type: "FLIP_Y_DIRECTION" }), []);

  const resetCalibration = useCallback(() => {
    const v = video;
    const w = v?.width ?? 1280;
    const h = v?.height ?? 720;
    dispatch({ type: "RESET_FOR_VIDEO", width: w, height: h });
  }, [video]);

  const loadFromProject = useCallback((scale: ScaleCalibration | null, axes: AxisCalibration) => {
    dispatch({ type: "LOAD_FROM_PROJECT", scale, axes });
  }, []);

  const value = useMemo<CalibrationContextValue>(
    () => ({
      ...state,
      setMode,
      startScaleEdit,
      toggleScaleEdit,
      startOriginEdit,
      startAxisEdit,
      cancelMode,
      registerScaleClick,
      commitScale,
      clearScaleDraft,
      clearScale,
      openScaleLengthEditor,
      updateScalePoint,
      setOrigin,
      setAxisAngle,
      flipXDirection,
      flipYDirection,
      resetCalibration,
      loadFromProject,
    }),
    [
      state,
      setMode,
      startScaleEdit,
      toggleScaleEdit,
      startOriginEdit,
      startAxisEdit,
      cancelMode,
      registerScaleClick,
      commitScale,
      clearScaleDraft,
      clearScale,
      openScaleLengthEditor,
      updateScalePoint,
      setOrigin,
      setAxisAngle,
      flipXDirection,
      flipYDirection,
      resetCalibration,
      loadFromProject,
    ],
  );

  return <CalibrationContext.Provider value={value}>{children}</CalibrationContext.Provider>;
}

export function useCalibration() {
  const ctx = useContext(CalibrationContext);
  if (!ctx) throw new Error("useCalibration must be used within a CalibrationProvider");
  return ctx;
}
