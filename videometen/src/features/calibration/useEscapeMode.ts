import { useGlobalShortcut } from "@/_reusable/useGlobalShortcut";
import { useCalibration } from "@/features/calibration/CalibrationState";

/**
 * Annuleert de actieve edit-mode bij Escape. Geblokkeerd binnen tekst-inputs
 * (handled door useGlobalShortcut).
 */
export function useEscapeMode() {
  const { mode, cancelMode } = useCalibration();
  useGlobalShortcut("Escape", () => cancelMode(), { enabled: mode !== "idle" });
}
