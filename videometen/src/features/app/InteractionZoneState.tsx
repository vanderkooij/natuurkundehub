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

/**
 * Centrale "wat doet de muis-cursor net aan?" state, gebruikt door:
 *  1. de context-aware pijltjes-handler (←/→ navigeren door datapunten van de
 *     grafiek-pane waar de cursor in hangt, anders door video-frames)
 *  2. de visuele flash-outline op de pane waar net in genavigeerd is
 *
 * Pane-elementen geven zich aan via twee data-attributen op een DOM-ancestor:
 *   `data-mouse-zone="graph-pane"` + `data-pane-id="<id>"`
 *   `data-mouse-zone="video"`
 *
 * De provider luistert globaal op `mousemove` en leest de dichtstbijzijnde
 * ancestor met `data-mouse-zone`. Updates alleen bij verandering — geen
 * re-renders bij elke pixel.
 */

export type MouseZoneKind = "graph-pane" | "video" | null;

export interface MouseZone {
  kind: MouseZoneKind;
  paneId?: string;
}

interface InteractionZoneContextValue {
  /** Lees de actuele muis-zone via `zoneRef.current`. State-versie alleen voor renders. */
  zone: MouseZone;
  zoneRef: React.MutableRefObject<MouseZone>;
  /** Pane-id die net is "geflashed" door pijltjes-navigatie (auto-reset na ~600ms). */
  flashedPaneId: string | null;
  /** Registreer een navigate-callback voor een grafiek-pane. */
  registerPane: (paneId: string, navigate: (delta: number) => void) => () => void;
  /** Wordt door de pijltjes-handler aangeroepen wanneer de cursor in een grafiek-pane staat. */
  navigateInPane: (paneId: string, delta: number) => void;
}

const InteractionZoneContext = createContext<InteractionZoneContextValue | null>(null);

const FLASH_DURATION_MS = 600;

export function InteractionZoneProvider({ children }: { children: ReactNode }) {
  const [zone, setZoneState] = useState<MouseZone>({ kind: null });
  const zoneRef = useRef<MouseZone>(zone);
  zoneRef.current = zone;

  // Pane-registry: paneId → navigate(delta) callback.
  const navigatorsRef = useRef<Map<string, (delta: number) => void>>(new Map());

  const [flashedPaneId, setFlashedPaneId] = useState<string | null>(null);

  const setZone = useCallback((next: MouseZone) => {
    const prev = zoneRef.current;
    if (prev.kind === next.kind && prev.paneId === next.paneId) return;
    setZoneState(next);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || !("closest" in target)) {
        setZone({ kind: null });
        return;
      }
      const el = (target as Element).closest("[data-mouse-zone]") as HTMLElement | null;
      if (!el) {
        setZone({ kind: null });
        return;
      }
      const raw = el.getAttribute("data-mouse-zone");
      if (raw !== "graph-pane" && raw !== "video") {
        setZone({ kind: null });
        return;
      }
      const paneId = el.getAttribute("data-pane-id") ?? undefined;
      setZone({ kind: raw, paneId });
    };

    const onLeave = () => setZone({ kind: null });

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [setZone]);

  const registerPane = useCallback((paneId: string, navigate: (delta: number) => void) => {
    navigatorsRef.current.set(paneId, navigate);
    return () => {
      navigatorsRef.current.delete(paneId);
    };
  }, []);

  const navigateInPane = useCallback((paneId: string, delta: number) => {
    const fn = navigatorsRef.current.get(paneId);
    if (!fn) return;
    fn(delta);
    setFlashedPaneId(paneId);
  }, []);

  // Reset flash na FLASH_DURATION_MS.
  useEffect(() => {
    if (flashedPaneId == null) return;
    const t = window.setTimeout(() => setFlashedPaneId(null), FLASH_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [flashedPaneId]);

  const value = useMemo<InteractionZoneContextValue>(
    () => ({ zone, zoneRef, flashedPaneId, registerPane, navigateInPane }),
    [zone, flashedPaneId, registerPane, navigateInPane],
  );

  return (
    <InteractionZoneContext.Provider value={value}>{children}</InteractionZoneContext.Provider>
  );
}

export function useInteractionZone() {
  const ctx = useContext(InteractionZoneContext);
  if (!ctx) {
    throw new Error("useInteractionZone must be used within an InteractionZoneProvider");
  }
  return ctx;
}
