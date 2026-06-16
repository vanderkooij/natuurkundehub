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

import { useUndoRedo, type UndoRedoApi } from "@/_reusable/useUndoRedo";
import { type Pixel } from "@/features/calibration/CalibrationState";
import { useVideo } from "@/features/video/VideoState";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrackedPoint {
  /** Absoluut frame-nummer (niet relatief aan trim). */
  frame: number;
  /** Klikpositie in native video-resolutie. */
  pixel: Pixel;
}

export type TrackingAction =
  /** Plaats of vervang het punt voor `point.frame`. `previous` = pre-actie waarde (voor undo). */
  | { kind: "set-point"; point: TrackedPoint; previous?: TrackedPoint }
  /** Verwijder het punt voor `point.frame`. */
  | { kind: "remove-point"; point: TrackedPoint }
  /** Verander de pixel-positie van het punt op `frame` van `from` naar `to`. */
  | { kind: "move-point"; frame: number; from: Pixel; to: Pixel }
  /** Update de frame-step. */
  | { kind: "set-step"; from: number; to: number }
  /** Vervang de volledige points-lijst. Gebruikt voor "alle metingen wissen"
   *  als één undo-stap. `previous` = alle punten vóór de actie. */
  | { kind: "bulk-set"; next: TrackedPoint[]; previous: TrackedPoint[] };

export type TrailColor = "teal" | "amber" | "magenta" | "white";

/** Cyclische volgorde van de kleur-knop. */
export const TRAIL_COLORS: readonly TrailColor[] = ["teal", "amber", "magenta", "white"];

const TRAIL_COLOR_STORAGE_KEY = "nh-videometen-trail-color";

function readInitialTrailColor(): TrailColor {
  if (typeof window === "undefined") return "teal";
  try {
    const saved = localStorage.getItem(TRAIL_COLOR_STORAGE_KEY);
    if (saved && (TRAIL_COLORS as readonly string[]).includes(saved)) {
      return saved as TrailColor;
    }
  } catch {
    /* ignore */
  }
  return "teal";
}

interface TrackingState {
  points: TrackedPoint[];
  frameStep: number;
  trailVisible: boolean;
  trailColor: TrailColor;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type InternalAction =
  | { type: "__APPLY"; action: TrackingAction }
  | { type: "__SET_TRAIL"; visible: boolean }
  | { type: "__SET_TRAIL_COLOR"; color: TrailColor }
  | { type: "__RESET" }
  | {
      type: "__LOAD_FROM_PROJECT";
      points: TrackedPoint[];
      frameStep: number;
      trailColor: TrailColor;
    };

const DEFAULT_FRAME_STEP = 5;

function initialState(): TrackingState {
  return {
    points: [],
    frameStep: DEFAULT_FRAME_STEP,
    trailVisible: true,
    trailColor: readInitialTrailColor(),
  };
}

function insertSorted(points: TrackedPoint[], next: TrackedPoint): TrackedPoint[] {
  // Replace if a point with the same frame already exists; otherwise insert in order.
  const out: TrackedPoint[] = [];
  let inserted = false;
  for (const p of points) {
    if (p.frame === next.frame) {
      out.push(next);
      inserted = true;
    } else if (!inserted && p.frame > next.frame) {
      out.push(next);
      out.push(p);
      inserted = true;
    } else {
      out.push(p);
    }
  }
  if (!inserted) out.push(next);
  return out;
}

function applyToState(state: TrackingState, action: TrackingAction): TrackingState {
  switch (action.kind) {
    case "set-point":
      return { ...state, points: insertSorted(state.points, action.point) };
    case "remove-point":
      return {
        ...state,
        points: state.points.filter((p) => p.frame !== action.point.frame),
      };
    case "move-point":
      return {
        ...state,
        points: state.points.map((p) =>
          p.frame === action.frame ? { ...p, pixel: action.to } : p,
        ),
      };
    case "set-step":
      return { ...state, frameStep: action.to };
    case "bulk-set":
      return { ...state, points: action.next };
  }
}

function reducer(state: TrackingState, internal: InternalAction): TrackingState {
  switch (internal.type) {
    case "__APPLY":
      return applyToState(state, internal.action);
    case "__SET_TRAIL":
      return { ...state, trailVisible: internal.visible };
    case "__SET_TRAIL_COLOR":
      return { ...state, trailColor: internal.color };
    case "__RESET":
      // Behoud trailColor over reset — display-preference, niet metings-state.
      return { ...initialState(), trailColor: state.trailColor };
    case "__LOAD_FROM_PROJECT":
      return {
        ...state,
        points: internal.points.slice().sort((a, b) => a.frame - b.frame),
        frameStep: internal.frameStep,
        trailColor: internal.trailColor,
        trailVisible: true,
      };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface TrackingContextValue extends TrackingState {
  /** Plaats een punt voor het opgegeven frame; vervangt bestaand punt op dat frame. */
  setPointAt: (frame: number, pixel: Pixel) => void;
  /** Verwijder het punt voor een specifiek frame. */
  removePointAt: (frame: number) => void;
  /** Wis alle meetpunten in één undoable stap. */
  removeAllPoints: () => void;
  /** Harde reset: wis points, history, frameStep terug naar default; trailColor blijft. */
  resetTracking: () => void;
  /** Laad alle tracking-state uit een project. Wist history. */
  loadFromProject: (points: TrackedPoint[], frameStep: number, trailColor: TrailColor) => void;
  /** Verplaats het punt voor een specifiek frame van zijn huidige naar `to`. */
  movePointAt: (frame: number, to: Pixel) => void;
  /** Update de frame-step. */
  setFrameStep: (next: number) => void;
  /** Toggle de zichtbaarheid van de trail-overlay. */
  setTrailVisible: (visible: boolean) => void;
  /** Zet de trail-kleur expliciet. */
  setTrailColor: (color: TrailColor) => void;
  /** Cycle door teal → amber → magenta → white → teal. */
  cycleTrailColor: () => void;
  /** Bereken hoeveel punten binnen de huidige trim-range vallen. */
  pointsInTrim: number;
  /** Het punt voor `frame`, of `undefined`. */
  pointFor: (frame: number) => TrackedPoint | undefined;
  /** Undo/redo API. */
  history: UndoRedoApi<TrackingAction>;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

export function TrackingProvider({ children }: { children: ReactNode }) {
  const { video, trim, setFrame } = useVideo();
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Undo/redo wiring: hook is domain-agnostic; we feed it our apply/invert.
  const apply = useCallback((action: TrackingAction) => {
    dispatch({ type: "__APPLY", action });
  }, []);
  const invert = useCallback((action: TrackingAction): TrackingAction => {
    switch (action.kind) {
      case "set-point":
        if (action.previous) {
          return { kind: "set-point", point: action.previous, previous: action.point };
        }
        return { kind: "remove-point", point: action.point };
      case "remove-point":
        return { kind: "set-point", point: action.point };
      case "move-point":
        return { kind: "move-point", frame: action.frame, from: action.to, to: action.from };
      case "set-step":
        return { kind: "set-step", from: action.to, to: action.from };
      case "bulk-set":
        return { kind: "bulk-set", next: action.previous, previous: action.next };
    }
  }, []);

  /**
   * Spring na elke undo/redo naar het frame waar het punt zit. setFrame clamp
   * t op [0, frameCount-1] maar NIET op de trim-range — bewust, want trim is
   * een display-filter en de gebruiker wil ook punten buiten trim direct zien
   * na een undo. set-step is een config-actie en raakt currentFrame niet aan.
   */
  const onUndoRedo = useCallback(
    (action: TrackingAction) => {
      switch (action.kind) {
        case "set-point":
        case "remove-point":
          setFrame(action.point.frame);
          break;
        case "move-point":
          setFrame(action.frame);
          break;
        case "set-step":
          // No frame change.
          break;
        case "bulk-set":
          // Bulk-acties hebben geen enkel frame om naartoe te springen —
          // bewust geen setFrame.
          break;
      }
    },
    [setFrame],
  );

  const history = useUndoRedo<TrackingAction>({ apply, invert, onUndoRedo, limit: 200 });

  // Reset everything on new video.
  const lastUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const url = video?.url ?? null;
    if (url === lastUrlRef.current) return;
    lastUrlRef.current = url;
    dispatch({ type: "__RESET" });
    history.reset();
  }, [video, history]);

  const setPointAt = useCallback(
    (frame: number, pixel: Pixel) => {
      const existing = stateRef.current.points.find((p) => p.frame === frame);
      history.dispatch({
        kind: "set-point",
        point: { frame, pixel },
        previous: existing,
      });
    },
    [history],
  );

  const removePointAt = useCallback(
    (frame: number) => {
      const existing = stateRef.current.points.find((p) => p.frame === frame);
      if (!existing) return;
      history.dispatch({ kind: "remove-point", point: existing });
    },
    [history],
  );

  const removeAllPoints = useCallback(() => {
    const previous = stateRef.current.points;
    if (previous.length === 0) return;
    // Eén bulk-set-actie op de undo-stack — één Ctrl+Z herstelt alles.
    history.dispatch({ kind: "bulk-set", next: [], previous });
  }, [history]);

  const resetTracking = useCallback(() => {
    dispatch({ type: "__RESET" });
    history.reset();
  }, [history]);

  const loadFromProject = useCallback(
    (points: TrackedPoint[], frameStep: number, trailColor: TrailColor) => {
      dispatch({ type: "__LOAD_FROM_PROJECT", points, frameStep, trailColor });
      history.reset();
    },
    [history],
  );

  const movePointAt = useCallback(
    (frame: number, to: Pixel) => {
      const existing = stateRef.current.points.find((p) => p.frame === frame);
      if (!existing) return;
      // Skip when there's no actual movement (avoids history spam on tiny jitter).
      if (existing.pixel.x === to.x && existing.pixel.y === to.y) return;
      history.dispatch({ kind: "move-point", frame, from: existing.pixel, to });
    },
    [history],
  );

  const setFrameStep = useCallback(
    (next: number) => {
      const clamped = Math.max(1, Math.round(next));
      const current = stateRef.current.frameStep;
      if (clamped === current) return;
      history.dispatch({ kind: "set-step", from: current, to: clamped });
    },
    [history],
  );

  const setTrailVisible = useCallback((visible: boolean) => {
    dispatch({ type: "__SET_TRAIL", visible });
  }, []);

  const setTrailColor = useCallback((color: TrailColor) => {
    dispatch({ type: "__SET_TRAIL_COLOR", color });
  }, []);

  const cycleTrailColor = useCallback(() => {
    const current = stateRef.current.trailColor;
    const i = TRAIL_COLORS.indexOf(current);
    const next = TRAIL_COLORS[(i + 1) % TRAIL_COLORS.length];
    dispatch({ type: "__SET_TRAIL_COLOR", color: next });
  }, []);

  // Sync naar <html data-trail-color="…"> en localStorage. CSS-variabelen in
  // index.css mappen die data-attribuut naar `--trail-dot`, `--trail-ring`,
  // `--trail-line-opacity` — één plek waar alle trail-styling uit voortkomt.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-trail-color", state.trailColor);
    }
    try {
      localStorage.setItem(TRAIL_COLOR_STORAGE_KEY, state.trailColor);
    } catch {
      /* ignore */
    }
  }, [state.trailColor]);

  const pointFor = useCallback((frame: number) => {
    return stateRef.current.points.find((p) => p.frame === frame);
  }, []);

  const pointsInTrim = useMemo(
    () => state.points.filter((p) => p.frame >= trim.start && p.frame <= trim.end).length,
    [state.points, trim.start, trim.end],
  );

  const value = useMemo<TrackingContextValue>(
    () => ({
      ...state,
      setPointAt,
      removePointAt,
      removeAllPoints,
      resetTracking,
      loadFromProject,
      movePointAt,
      setFrameStep,
      setTrailVisible,
      setTrailColor,
      cycleTrailColor,
      pointsInTrim,
      pointFor,
      history,
    }),
    [
      state,
      setPointAt,
      removePointAt,
      removeAllPoints,
      resetTracking,
      loadFromProject,
      movePointAt,
      setFrameStep,
      setTrailVisible,
      setTrailColor,
      cycleTrailColor,
      pointsInTrim,
      pointFor,
      history,
    ],
  );

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
}

export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error("useTracking must be used within a TrackingProvider");
  return ctx;
}
