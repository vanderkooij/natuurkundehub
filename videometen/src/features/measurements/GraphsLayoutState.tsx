import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { type FitType } from "@/_reusable/fit";
import {
  GRAPH_TYPE_ORDER,
  type GraphTypeKey,
} from "@/features/measurements/graph-types";
import { type PaneState } from "@/features/measurements/GraphPane";
import { useVideo } from "@/features/video/VideoState";

/**
 * Sub-selectie van frames waarop de fit-berekening draait. `null` betekent:
 * gebruik de volledige trim-range. Bij stuiterende balletjes / slingers /
 * opeenvolgende bewegings-segmenten is één fit op alle meetpunten betekenis-
 * loos; de leerling moet een sub-range kunnen kiezen.
 */
export type FitRange = { start: number; end: number } | null;

/**
 * Globale fit-config: één fit-type voor x(t), één voor y(t). Geldt voor ALLE
 * panes; elke pane bepaalt zelf via `PaneState.showFit` of die fit visueel
 * / als bron gebruikt wordt.
 *
 * `range` is gedeeld tussen x- en y-fit — x(t) en y(t) beschrijven hetzelfde
 * tijdsegment van de beweging, verschillende ranges per coördinaat zou
 * fysisch verwarrend zijn.
 *
 * 07k: de fit-curve-extrapolatie (zone C, gestippeld voorbij het meetbereik)
 * staat nu altijd aan — de eerdere `showExtrapolation`-toggle is verwijderd
 * (minder UI / state / schema-veld).
 */
export interface FitConfig {
  xFit: FitType;
  yFit: FitType;
  range: FitRange;
}

const DEFAULT_FIT_CONFIG: FitConfig = {
  xFit: "none",
  yFit: "none",
  range: null,
};

/**
 * Houdt het Graphs-layout (welke panes, hun types, zoom-state, raaklijn/meet)
 * vast op een plek die OVERLEEFT als de layout tussen Meten en Analyseren
 * wordt geschakeld (waar Graphs zelf re-mount). Reset op nieuwe video.
 *
 * 07f: cross-pane x-zoom-sync (Tijd-as sync) is volledig verwijderd — werkte
 * niet betrouwbaar genoeg om te behouden. Elke pane heeft nu onafhankelijke
 * zoom. Minder code, minder edge-cases, minder verwarring.
 */

const MAX_PANES = 4;

export function defaultPanes(): PaneState[] {
  return [makePane("x-t"), makePane("y-t")];
}

export function makePane(type: GraphTypeKey): PaneState {
  return {
    id: `pane-${Math.random().toString(36).slice(2, 9)}`,
    type,
    tangentActive: false,
    measureActive: false,
    measureX1: null,
    measureX2: null,
    zoomState: null,
    // Default uit (per 05d): de ruwe-data-lijn is een toggle, niet automatisch.
    showLine: false,
    // Default uit (per 07): fit zichtbaar/actief is bewuste leerling-keuze.
    showFit: false,
  };
}

interface GraphsLayoutValue {
  panes: PaneState[];
  fitConfig: FitConfig;
  maxPanes: number;
  /**
   * 09: "Grafieken vergroten" (alleen relevant in Analyseren). Aan → de linker
   * kolom (video + tabel) krimpt en de grafieken krijgen meer ruimte. Puur een
   * UI-voorkeur; staat los van de responsive pane-layout (die kijkt naar
   * breedte, niet naar deze toggle). Reset naar `false` bij nieuwe video,
   * "Begin opnieuw" en elke mode-wissel (Meten ↔ Analyseren).
   */
  graphsFocusMode: boolean;
  setGraphsFocusMode: (next: boolean) => void;
  /**
   * 09c: "Pane-grootte"-slider. `0` = auto (panes vullen de container, met
   * sleepbare verdelers — huidig gedrag). `> 0`..`1` = elke pane krijgt een
   * minimum-afmeting (lineair groter met de waarde); de grafieken-container
   * scrollt zodra ze niet meer passen. Staat los van de auto-richting
   * (naast/onder) én van Verberg — alle combinaties zijn geldig. Reset naar `0`
   * bij nieuwe video, Begin opnieuw, Alle metingen wissen en mode-wissel.
   */
  paneSize: number;
  setPaneSize: (next: number) => void;
  updatePane: (id: string, next: PaneState) => void;
  closePane: (id: string) => void;
  addPane: () => void;
  setFitConfig: (next: FitConfig) => void;
  /** Harde reset: terug naar default twee panes + fit none. */
  resetLayout: () => void;
  /** Laad pane-config + fitConfig uit een project. */
  loadFromProject: (
    panes: Array<Omit<PaneState, "id">>,
    fitConfig?: FitConfig,
  ) => void;
}

const GraphsLayoutContext = createContext<GraphsLayoutValue | null>(null);

export function GraphsLayoutProvider({ children }: { children: ReactNode }) {
  const { video } = useVideo();
  const [panes, setPanes] = useState<PaneState[]>(defaultPanes);
  const [fitConfig, setFitConfigState] = useState<FitConfig>(DEFAULT_FIT_CONFIG);
  const [graphsFocusMode, setGraphsFocusMode] = useState(false);
  const [paneSize, setPaneSize] = useState(0);

  // Reset op nieuwe video.
  const lastUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const url = video?.url ?? null;
    if (url === lastUrlRef.current) return;
    lastUrlRef.current = url;
    setPanes(defaultPanes());
    setFitConfigState(DEFAULT_FIT_CONFIG);
    setGraphsFocusMode(false);
    setPaneSize(0);
  }, [video]);

  const updatePane = useCallback((id: string, next: PaneState) => {
    setPanes((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = next;
      return updated;
    });
  }, []);

  const closePane = useCallback((id: string) => {
    setPanes((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)));
  }, []);

  const addPane = useCallback(() => {
    setPanes((prev) => {
      if (prev.length >= MAX_PANES) return prev;
      const inUse = new Set(prev.map((p) => p.type));
      const nextType = GRAPH_TYPE_ORDER.find((k) => !inUse.has(k)) ?? "vx-t";
      return [...prev, makePane(nextType)];
    });
  }, []);

  const resetLayout = useCallback(() => {
    setPanes(defaultPanes());
    setFitConfigState(DEFAULT_FIT_CONFIG);
    setGraphsFocusMode(false);
    setPaneSize(0);
  }, []);

  const setFitConfig = useCallback((next: FitConfig) => setFitConfigState(next), []);

  const loadFromProject = useCallback(
    (newPanes: Array<Omit<PaneState, "id">>, fit?: FitConfig) => {
      // Hernieuw pane-ids om collisions met bestaande react-resizable-panels
      // group-ids te voorkomen — react ziet ze als nieuwe componenten.
      setPanes(
        newPanes.map((p) => ({
          ...p,
          id: `pane-${Math.random().toString(36).slice(2, 9)}`,
        })),
      );
      setFitConfigState(fit ?? DEFAULT_FIT_CONFIG);
    },
    [],
  );

  const value = useMemo<GraphsLayoutValue>(
    () => ({
      panes,
      fitConfig,
      maxPanes: MAX_PANES,
      graphsFocusMode,
      setGraphsFocusMode,
      paneSize,
      setPaneSize,
      updatePane,
      closePane,
      addPane,
      setFitConfig,
      resetLayout,
      loadFromProject,
    }),
    [
      panes,
      fitConfig,
      graphsFocusMode,
      paneSize,
      updatePane,
      closePane,
      addPane,
      setFitConfig,
      resetLayout,
      loadFromProject,
    ],
  );

  return <GraphsLayoutContext.Provider value={value}>{children}</GraphsLayoutContext.Provider>;
}

export function useGraphsLayout() {
  const ctx = useContext(GraphsLayoutContext);
  if (!ctx) throw new Error("useGraphsLayout must be used within a GraphsLayoutProvider");
  return ctx;
}
