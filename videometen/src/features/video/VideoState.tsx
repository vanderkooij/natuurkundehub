import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

import {
  checkVideoFile,
  describeMediaError,
  describeNoPicture,
  type VideoLoadError,
} from "@/features/video/videoFile";

export interface LoadedVideo {
  file: File;
  url: string;
  /** Detected/overridden fps. */
  fps: number;
  /** Whether fps came from the user (override) or from detection. */
  fpsSource: "detected" | "default" | "user";
  /** Total duration in seconds. */
  duration: number;
  /** Total frame count = round(duration * fps). Updates if fps changes. */
  frameCount: number;
  /** Native video resolution in pixels. Falls back to 16:9 placeholder if metadata fails. */
  width: number;
  height: number;
  /**
   * Opname-fps bij slowmotion (bv. 240), `null` = gewone video. De tijd per
   * frame is 1/captureFps; stappen en zoeken blijven op `fps` (afspeel-fps).
   * Gebruik `timeFpsOf(video)` overal waar een tijd wordt berekend.
   */
  captureFps: number | null;
  /** Of de leerling de slowmotion-vraag al heeft beantwoord (of weggeklikt). */
  slowmoAnswered: boolean;
}

/**
 * Bron-tag op SET_FPS-acties. Sinds prompt 07c is fps na het eerste meetpunt
 * vergrendeld; alleen acties met `source: 'reset'` ontwijken de lock. De
 * andere bronnen zijn:
 *  - `user`: handmatige wijziging via de fps-chip
 *  - `detection`: automatische detectie via `useFpsDetection`
 *  - `project-load`: bij het openen van een opgeslagen project
 *  - `reset`: expliciete reset-flows ("Alle metingen wissen" /
 *    "Begin opnieuw" / "Andere video laden")
 */
export type FpsSource = "user" | "detection" | "project-load" | "reset";

export interface TrimRange {
  start: number;
  end: number;
}

interface VideoState {
  video: LoadedVideo | null;
  currentFrame: number;
  isPlaying: boolean;
  trim: TrimRange;
  /**
   * Snap-config: of `currentFrame` automatisch naar het dichtstbijzijnde
   * meetpunt-frame springt. Aan in Meten/Analyseren, uit in Tracken (waar
   * de gebruiker juist frame-voor-frame nieuwe metingen wil kunnen plaatsen).
   * `frames` is een oplopend gesorteerde lijst meetpunt-frames; lege lijst =
   * geen snap mogelijk.
   */
  snapEnabled: boolean;
  snapFrames: number[];
  /**
   * Fps zoals 'ie was op het moment van de eerste meetpunt-registratie.
   * `null` zolang er nog geen meetpunten zijn. Wordt gebruikt om gele-
   * waarschuwing-styling op de fps-chip te triggeren wanneer iemand de fps
   * later wijzigt — meestal een teken dat metingen uit de pas zijn gaan
   * lopen met de video.
   */
  fpsAtFirstMeasurement: number | null;
  /** Waarom de laatste video niet laadde; `null` = geen fout. */
  loadError: VideoLoadError | null;
}

type Action =
  | { type: "LOAD_VIDEO"; video: LoadedVideo }
  | { type: "CLEAR_VIDEO" }
  | { type: "SET_FPS"; fps: number; source: FpsSource }
  | { type: "SET_FRAME"; frame: number; skipSnap?: boolean }
  | { type: "SET_PLAYING"; playing: boolean }
  | { type: "SET_TRIM"; trim: TrimRange }
  | { type: "TRIM_IN_HERE" }
  | { type: "TRIM_OUT_HERE" }
  | { type: "SET_SNAP_CONFIG"; enabled: boolean; frames: number[] }
  | { type: "JUMP_TO_MEASUREMENT"; dir: -1 | 1; magnitude: number }
  | { type: "MARK_FIRST_MEASUREMENT_FPS"; fps: number }
  | { type: "CLEAR_FIRST_MEASUREMENT_FPS" }
  | { type: "LOAD_ERROR"; error: VideoLoadError }
  | { type: "CLEAR_LOAD_ERROR" }
  | { type: "SET_CAPTURE_FPS"; captureFps: number | null; source: FpsSource }
  | { type: "DISMISS_SLOWMO" };

const initialState: VideoState = {
  video: null,
  currentFrame: 0,
  isPlaying: false,
  trim: { start: 0, end: 0 },
  snapEnabled: false,
  snapFrames: [],
  fpsAtFirstMeasurement: null,
  loadError: null,
};

function clampFrame(frame: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(max, Math.round(frame)));
}

/**
 * Vind de index van het meetpunt-frame dat het dichtst bij `frame` ligt.
 * Bij gelijke afstand → kies het hogere (naar voren is intuïtiever bij
 * "tussen twee meetpunten").
 *
 * `frames` moet oplopend gesorteerd zijn.
 */
function nearestMeasurementIdx(frames: number[], frame: number): number {
  if (frames.length === 0) return -1;
  if (frame <= frames[0]) return 0;
  if (frame >= frames[frames.length - 1]) return frames.length - 1;
  // Linear scan is goed genoeg voor typische N (10-200 meetpunten).
  let bestIdx = 0;
  let bestDist = Math.abs(frames[0] - frame);
  for (let i = 1; i < frames.length; i += 1) {
    const d = Math.abs(frames[i] - frame);
    // `<=` voor "hoger bij gelijk".
    if (d <= bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Pas snap toe als config het toelaat; anders pass-through. */
function maybeSnap(frame: number, state: VideoState): number {
  if (!state.snapEnabled || state.snapFrames.length === 0) return frame;
  const idx = nearestMeasurementIdx(state.snapFrames, frame);
  return idx === -1 ? frame : state.snapFrames[idx];
}

function reducer(state: VideoState, action: Action): VideoState {
  switch (action.type) {
    case "LOAD_VIDEO": {
      const lastFrame = Math.max(0, action.video.frameCount - 1);
      // Behoud snap-config bij video-wissel — FrameSnapCoordinator zal 'm
      // direct hierna alsnog updaten met de (lege) nieuwe points-lijst.
      // Nieuwe video = nog geen metingen op deze fps; reset de marker.
      return {
        video: action.video,
        currentFrame: 0,
        isPlaying: false,
        trim: { start: 0, end: lastFrame },
        snapEnabled: state.snapEnabled,
        snapFrames: state.snapFrames,
        fpsAtFirstMeasurement: null,
        loadError: null,
      };
    }
    case "LOAD_ERROR":
      return { ...initialState, loadError: action.error };
    case "CLEAR_LOAD_ERROR":
      return state.loadError ? { ...state, loadError: null } : state;
    case "SET_CAPTURE_FPS": {
      if (!state.video) return state;
      // Zelfde lock als SET_FPS: de opname-fps bepaalt alle t-waardes.
      if (state.fpsAtFirstMeasurement !== null && action.source !== "reset") return state;
      return {
        ...state,
        video: { ...state.video, captureFps: action.captureFps, slowmoAnswered: true },
      };
    }
    case "DISMISS_SLOWMO":
      if (!state.video || state.video.slowmoAnswered) return state;
      return { ...state, video: { ...state.video, slowmoAnswered: true } };
    case "CLEAR_VIDEO":
      return { ...initialState };
    case "SET_FPS": {
      if (!state.video) return state;
      // Hard lock (07c): zodra er minimaal één meetpunt op deze video staat
      // (fpsAtFirstMeasurement gezet), is fps vergrendeld. Alleen expliciete
      // reset-routes ('source: reset') mogen de fps nog wijzigen — die
      // routes garanderen dat metingen al gewist zijn of dat de gebruiker
      // bewust opnieuw begint. Detectie- en user-wijzigingen worden stil
      // genegeerd; een dev-warning helpt bij toekomstige diagnose.
      if (state.fpsAtFirstMeasurement !== null && action.source !== "reset") {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(
            `[VIDEO] SET_FPS geblokkeerd (lock actief). Bron: ${action.source}, fps: ${action.fps}`,
          );
        }
        return state;
      }
      const newFrameCount = Math.max(1, Math.round(state.video.duration * action.fps));
      const lastFrame = newFrameCount - 1;
      // Rescale current frame & trim to new fps so we land at the same time.
      const ratio = action.fps / state.video.fps;
      const newCurrent = clampFrame(state.currentFrame * ratio, lastFrame);
      const newTrim: TrimRange = {
        start: clampFrame(state.trim.start * ratio, lastFrame),
        end: clampFrame(state.trim.end * ratio, lastFrame),
      };
      // Vertaal de extended-action-source terug naar de LoadedVideo's
      // tristate (`detected` / `default` / `user`). `project-load` en
      // `reset` mappen op `user` — geladen of gereset = niet-detectie en
      // niet-default.
      const legacySource: LoadedVideo["fpsSource"] =
        action.source === "detection" ? "detected" : action.source === "user" ? "user" : "user";
      return {
        ...state,
        video: {
          ...state.video,
          fps: action.fps,
          fpsSource: legacySource,
          frameCount: newFrameCount,
        },
        currentFrame: newCurrent,
        trim: newTrim,
      };
    }
    case "SET_FRAME": {
      if (!state.video) return state;
      const lastFrame = state.video.frameCount - 1;
      const clamped = clampFrame(action.frame, lastFrame);
      const target = action.skipSnap ? clamped : maybeSnap(clamped, state);
      // Snap kan nog een keer buiten clamp landen als snapFrames daar liggen
      // (zelden, maar defensief).
      return { ...state, currentFrame: clampFrame(target, lastFrame) };
    }
    case "SET_SNAP_CONFIG": {
      // No-op als config niet wijzigt — voorkomt overbodige re-renders.
      if (
        state.snapEnabled === action.enabled &&
        state.snapFrames.length === action.frames.length &&
        state.snapFrames.every((f, i) => f === action.frames[i])
      ) {
        return state;
      }
      return { ...state, snapEnabled: action.enabled, snapFrames: action.frames };
    }
    case "JUMP_TO_MEASUREMENT": {
      if (!state.video) return state;
      const frames = state.snapFrames;
      if (frames.length === 0) return state;
      const lastFrame = state.video.frameCount - 1;
      const currentIdx = frames.indexOf(state.currentFrame);
      let nextIdx: number;
      if (currentIdx === -1) {
        // Niet op een meetpunt: eerste pijltje is de snap zelf (geen extra delta).
        nextIdx = nearestMeasurementIdx(frames, state.currentFrame);
      } else {
        nextIdx = currentIdx + action.dir * action.magnitude;
      }
      const clampedIdx = Math.max(0, Math.min(frames.length - 1, nextIdx));
      return {
        ...state,
        currentFrame: clampFrame(frames[clampedIdx], lastFrame),
      };
    }
    case "MARK_FIRST_MEASUREMENT_FPS": {
      // Idempotent: alleen zetten als 'r nog geen waarde staat. Tweede
      // meetpunt mag de fps-marker niet overschrijven.
      if (state.fpsAtFirstMeasurement !== null) return state;
      return { ...state, fpsAtFirstMeasurement: action.fps };
    }
    case "CLEAR_FIRST_MEASUREMENT_FPS":
      if (state.fpsAtFirstMeasurement === null) return state;
      return { ...state, fpsAtFirstMeasurement: null };
    case "SET_PLAYING":
      return { ...state, isPlaying: action.playing };
    case "SET_TRIM": {
      if (!state.video) return state;
      const lastFrame = state.video.frameCount - 1;
      const start = clampFrame(action.trim.start, lastFrame);
      const end = clampFrame(action.trim.end, lastFrame);
      // Keep order
      return {
        ...state,
        trim: { start: Math.min(start, end), end: Math.max(start, end) },
      };
    }
    case "TRIM_IN_HERE": {
      if (!state.video) return state;
      const lastFrame = state.video.frameCount - 1;
      const start = clampFrame(state.currentFrame, lastFrame);
      const end = Math.max(start, state.trim.end);
      return { ...state, trim: { start, end } };
    }
    case "TRIM_OUT_HERE": {
      if (!state.video) return state;
      const lastFrame = state.video.frameCount - 1;
      const end = clampFrame(state.currentFrame, lastFrame);
      const start = Math.min(state.trim.start, end);
      return { ...state, trim: { start, end } };
    }
    default:
      return state;
  }
}

interface VideoContextValue extends VideoState {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  loadFile: (file: File) => void;
  clearVideo: () => void;
  /**
   * Wijzig de fps. `source` is verplicht (sinds 07c) zodat de reducer kan
   * beslissen of de wijziging door de fps-lock heen mag. Zie `FpsSource`
   * voor de toegestane bron-labels en de lock-semantiek.
   */
  setFps: (fps: number, source: FpsSource) => void;
  /**
   * Zet currentFrame. Standaard snapt 'ie naar het dichtstbij meetpunt-frame
   * als snap actief is (zie `snapEnabled`). Voor continue updates (drag,
   * playback) → `{ skipSnap: true }` zodat de framewaarde live volgt zonder
   * gehapper. Op pointer-up / pause kan de caller een tweede `setFrame`-
   * aanroep doen zonder skipSnap om dan alsnog te snappen.
   */
  setFrame: (frame: number, options?: { skipSnap?: boolean }) => void;
  stepFrame: (delta: number) => void;
  /** Snap currentFrame nu, of no-op als snap niet actief is. */
  snapCurrentFrame: () => void;
  /** Spring naar volgend (dir=1) of vorig (dir=-1) meetpunt; magnitude default 1. */
  jumpToMeasurement: (dir: -1 | 1, magnitude?: number) => void;
  /** Stelt de snap-config in (mode-coordinator gebruikt dit). */
  setSnapConfig: (enabled: boolean, frames: number[]) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setTrim: (trim: TrimRange) => void;
  trimInHere: () => void;
  trimOutHere: () => void;
  /** Reset trim naar de volledige video-range. */
  resetTrim: () => void;
  /** Markeer (idempotent) dat de gebruiker zojuist zijn eerste meetpunt heeft
   *  gezet op de huidige fps. Wordt aangeroepen door een coordinator. */
  markFirstMeasurementFps: (fps: number) => void;
  /** Wis de marker — gebruikt door reset-flows ("alle metingen wissen",
   *  "begin opnieuw", "andere video"). */
  clearFirstMeasurementFps: () => void;
  /** Meld een afspeelfout van de zichtbare video (zie VideoPlayer). */
  reportPlaybackError: (code: number | null, message?: string) => void;
  clearLoadError: () => void;
  /** Opname-fps bij slowmotion; `null` = gewone video. Zelfde lock als setFps. */
  setCaptureFps: (captureFps: number | null, source: FpsSource) => void;
  /** Slowmotion-vraag wegklikken ("Nee"). */
  dismissSlowmo: () => void;
}

const VideoContext = createContext<VideoContextValue | null>(null);

export function VideoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Revoke explicitly (not through an effect) so React Strict Mode's double-mount
  // cleanup cannot revoke a URL that's still in use.
  const loadFile = useCallback((file: File) => {
    const previous = stateRef.current.video?.url;
    if (previous) URL.revokeObjectURL(previous);

    // Nooit stil weigeren: geen video → melding in het startscherm.
    const invalid = checkVideoFile(file);
    if (invalid) {
      dispatch({ type: "LOAD_ERROR", error: invalid });
      return;
    }
    dispatch({ type: "CLEAR_LOAD_ERROR" });

    const url = URL.createObjectURL(file);
    const fail = (error: VideoLoadError) => {
      probe.onloadedmetadata = null;
      probe.onerror = null;
      probe.removeAttribute("src");
      URL.revokeObjectURL(url);
      dispatch({ type: "LOAD_ERROR", error });
    };
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    probe.src = url;
    probe.onloadedmetadata = () => {
      // Wel een bestand, maar geen beeldspoor (of onleesbaar beeld).
      if (!probe.videoWidth) {
        fail(describeNoPicture(file));
        return;
      }
      const finish = (duration: number) => {
        const fps = 30; // default, refined later by useFpsDetection
        const frameCount = Math.max(1, Math.round(duration * fps));
        const width = probe.videoWidth || 1280;
        const height = probe.videoHeight || 720;
        dispatch({
          type: "LOAD_VIDEO",
          video: {
            file,
            url,
            fps,
            fpsSource: "default",
            duration,
            frameCount,
            width,
            height,
            captureFps: null,
            slowmoAnswered: false,
          },
        });
      };
      if (Number.isFinite(probe.duration)) {
        finish(probe.duration);
        return;
      }
      // Webm van MediaRecorder/schermrecorders rapporteert vaak
      // duration=Infinity. Workaround: voorbij het einde seeken dwingt de
      // browser de echte duur te bepalen (durationchange). Zonder dit laadde
      // de video stil met frameCount 1 — niets te stappen of trimmen.
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(durationTimeout);
        probe.ondurationchange = null;
        finish(Number.isFinite(probe.duration) ? probe.duration : 0);
      };
      const durationTimeout = window.setTimeout(settle, 2000);
      probe.ondurationchange = () => {
        if (Number.isFinite(probe.duration)) settle();
      };
      probe.currentTime = Number.MAX_SAFE_INTEGER;
    };
    // Voorheen werd hier een "video" van één frame geladen, zodat de leerling
    // een zwart vlak zag zonder uitleg. Nu: melding met wat je kunt doen.
    probe.onerror = () => {
      fail(describeMediaError(file, probe.error?.code ?? null, probe.error?.message));
    };
  }, []);

  /**
   * De zichtbare `<video>` kan later alsnog falen (metadata las wel, frames
   * decoderen niet). Dan dezelfde melding en terug naar het startscherm.
   */
  const reportPlaybackError = useCallback((code: number | null, message?: string) => {
    const v = stateRef.current.video;
    if (!v) return;
    URL.revokeObjectURL(v.url);
    dispatch({ type: "LOAD_ERROR", error: describeMediaError(v.file, code, message) });
  }, []);

  const clearLoadError = useCallback(() => dispatch({ type: "CLEAR_LOAD_ERROR" }), []);

  const setCaptureFps = useCallback((captureFps: number | null, source: FpsSource) => {
    if (captureFps !== null && (!Number.isFinite(captureFps) || captureFps <= 0)) return;
    dispatch({ type: "SET_CAPTURE_FPS", captureFps, source });
  }, []);

  const dismissSlowmo = useCallback(() => dispatch({ type: "DISMISS_SLOWMO" }), []);

  const clearVideo = useCallback(() => {
    const previous = stateRef.current.video?.url;
    if (previous) URL.revokeObjectURL(previous);
    dispatch({ type: "CLEAR_VIDEO" });
  }, []);

  const setFps = useCallback((fps: number, source: FpsSource) => {
    if (!Number.isFinite(fps) || fps <= 0) return;
    dispatch({ type: "SET_FPS", fps, source });
  }, []);

  const setFrame = useCallback((frame: number, options?: { skipSnap?: boolean }) => {
    dispatch({ type: "SET_FRAME", frame, skipSnap: options?.skipSnap });
  }, []);

  const stepFrame = useCallback((delta: number) => {
    const s = stateRef.current;
    if (!s.video) return;
    // stepFrame is bewust "ruwe" frame-step (tracken: voor metingen plaatsen).
    // Voor "spring naar volgend meetpunt" → `jumpToMeasurement`.
    dispatch({ type: "SET_FRAME", frame: s.currentFrame + delta, skipSnap: true });
  }, []);

  const snapCurrentFrame = useCallback(() => {
    const s = stateRef.current;
    if (!s.video) return;
    dispatch({ type: "SET_FRAME", frame: s.currentFrame });
  }, []);

  const jumpToMeasurement = useCallback((dir: -1 | 1, magnitude = 1) => {
    dispatch({ type: "JUMP_TO_MEASUREMENT", dir, magnitude });
  }, []);

  const setSnapConfig = useCallback((enabled: boolean, frames: number[]) => {
    dispatch({ type: "SET_SNAP_CONFIG", enabled, frames });
  }, []);

  const setPlaying = useCallback(
    (playing: boolean) => dispatch({ type: "SET_PLAYING", playing }),
    [],
  );

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
    } else {
      v.pause();
    }
  }, []);

  const setTrim = useCallback((trim: TrimRange) => dispatch({ type: "SET_TRIM", trim }), []);
  const trimInHere = useCallback(() => dispatch({ type: "TRIM_IN_HERE" }), []);
  const trimOutHere = useCallback(() => dispatch({ type: "TRIM_OUT_HERE" }), []);

  const resetTrim = useCallback(() => {
    const s = stateRef.current;
    if (!s.video) return;
    const lastFrame = Math.max(0, s.video.frameCount - 1);
    dispatch({ type: "SET_TRIM", trim: { start: 0, end: lastFrame } });
  }, []);

  const markFirstMeasurementFps = useCallback((fps: number) => {
    dispatch({ type: "MARK_FIRST_MEASUREMENT_FPS", fps });
  }, []);

  const clearFirstMeasurementFps = useCallback(() => {
    dispatch({ type: "CLEAR_FIRST_MEASUREMENT_FPS" });
  }, []);

  const value = useMemo<VideoContextValue>(
    () => ({
      ...state,
      videoRef,
      loadFile,
      clearVideo,
      setFps,
      setFrame,
      stepFrame,
      snapCurrentFrame,
      jumpToMeasurement,
      setSnapConfig,
      setPlaying,
      togglePlay,
      setTrim,
      trimInHere,
      trimOutHere,
      resetTrim,
      markFirstMeasurementFps,
      clearFirstMeasurementFps,
      reportPlaybackError,
      clearLoadError,
      setCaptureFps,
      dismissSlowmo,
    }),
    [
      state,
      loadFile,
      clearVideo,
      setFps,
      setFrame,
      stepFrame,
      snapCurrentFrame,
      jumpToMeasurement,
      setSnapConfig,
      setPlaying,
      togglePlay,
      setTrim,
      trimInHere,
      trimOutHere,
      resetTrim,
      markFirstMeasurementFps,
      clearFirstMeasurementFps,
      reportPlaybackError,
      clearLoadError,
      setCaptureFps,
      dismissSlowmo,
    ],
  );

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
}

export function useVideo() {
  const ctx = useContext(VideoContext);
  if (!ctx) throw new Error("useVideo must be used within a VideoProvider");
  return ctx;
}
