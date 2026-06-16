import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * App-niveau view-modus:
 *  - `meten`      — alleen de video op volle breedte (kalibreren + tracken-fase).
 *  - `analyseren` — compact video-tile + tabel + grafieken horizontaal.
 *  - `tracken`    — fullscreen video. Wordt geactiveerd via "▶ Start tracking" en
 *                   verlaten via Escape; geen handmatige toggle-optie.
 */
export type AppViewMode = "meten" | "analyseren" | "tracken";

/** Modes waar de gebruiker handmatig tussen kan switchen via de header-toggle. */
export const WORK_MODES: ReadonlyArray<Exclude<AppViewMode, "tracken">> = ["meten", "analyseren"];

interface AppModeContextValue {
  mode: AppViewMode;
  /** Schakel handmatig naar `meten` of `analyseren`. */
  setWorkMode: (mode: Exclude<AppViewMode, "tracken">) => void;
  /** Ga in tracking-mode; onthoud waar we vandaan kwamen voor `exitTracking`. */
  enterTracking: () => void;
  /** Verlaat tracking-mode terug naar de modus waarvandaan we kwamen. */
  exitTracking: () => void;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppViewMode>("meten");
  // Bewaart de niet-tracking-modus waar we vandaan kwamen toen tracken werd
  // gestart. Wordt alleen vernieuwd bij overgang naar tracken, zodat dubbele
  // tracking-enters niet de "echte" terugkeerpositie verliezen.
  const previousModeRef = useRef<Exclude<AppViewMode, "tracken">>("meten");

  const setWorkMode = useCallback((next: Exclude<AppViewMode, "tracken">) => {
    setMode(next);
  }, []);

  const enterTracking = useCallback(() => {
    setMode((current) => {
      if (current !== "tracken") {
        previousModeRef.current = current;
      }
      return "tracken";
    });
  }, []);

  const exitTracking = useCallback(() => {
    setMode(previousModeRef.current);
  }, []);

  const value = useMemo<AppModeContextValue>(
    () => ({ mode, setWorkMode, enterTracking, exitTracking }),
    [mode, setWorkMode, enterTracking, exitTracking],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error("useAppMode must be used within an AppModeProvider");
  return ctx;
}
