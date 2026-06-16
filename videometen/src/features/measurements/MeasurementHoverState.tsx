import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Lichtgewicht cross-pane hover-state: welk frame staat een consument net aan
 * te wijzen (zonder klik). Tabel-rij + trail-dot syncen elkaar via deze
 * context. In prompt 05 komen er grafiek-panes bij die dezelfde state lezen
 * — de API is bewust generiek (één frame-nummer, eventueel `null`) zodat dat
 * geen breaking change wordt.
 *
 * Hovered ≠ active. `currentFrame` (na klik) blijft de prominente highlight;
 * `hoveredFrame` is een subtieler signaal.
 */
interface MeasurementHoverValue {
  hoveredFrame: number | null;
  setHoveredFrame: (frame: number | null) => void;
}

const MeasurementHoverContext = createContext<MeasurementHoverValue | null>(null);

export function MeasurementHoverProvider({ children }: { children: ReactNode }) {
  const [hoveredFrame, setHoveredFrameState] = useState<number | null>(null);

  const setHoveredFrame = useCallback((frame: number | null) => {
    setHoveredFrameState(frame);
  }, []);

  const value = useMemo<MeasurementHoverValue>(
    () => ({ hoveredFrame, setHoveredFrame }),
    [hoveredFrame, setHoveredFrame],
  );

  return (
    <MeasurementHoverContext.Provider value={value}>{children}</MeasurementHoverContext.Provider>
  );
}

export function useMeasurementHover() {
  const ctx = useContext(MeasurementHoverContext);
  if (!ctx) {
    throw new Error("useMeasurementHover must be used within a MeasurementHoverProvider");
  }
  return ctx;
}
