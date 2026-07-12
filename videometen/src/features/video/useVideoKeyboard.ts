import { useEffect } from "react";

import { useAppMode } from "@/features/app/AppMode";
import { useInteractionZone } from "@/features/app/InteractionZoneState";
import { useVideo } from "@/features/video/VideoState";

/**
 * Globale toetsenbordbediening voor video-navigatie.
 *
 *  - **Spatie**         → play/pause (overal).
 *  - **←/→**           → context-aware (zie tabel onder).
 *  - **Shift+←/→**     → 10×-multiplier.
 *
 * | Modus      | Cursor over...        | ←/→                                          |
 * |---|---|---|
 * | tracken    | overal                | frame-step ±1 (Shift: ±10)                    |
 * | non-track  | grafiek-pane          | vorig/volgend datapunt in die pane            |
 * | non-track  | video / tabel / elders| vorig/volgend meetpunt-frame (geen ±1 frame)  |
 *
 * In niet-tracken modi: als er nog geen meetpunten zijn, val terug op
 * frame-step zodat de gebruiker tenminste door de video kan stappen.
 *
 * Wordt niet geactiveerd in inputs/selects/contenteditable.
 */
export function useVideoKeyboard() {
  const { video, stepFrame, togglePlay, jumpToMeasurement, snapFrames } = useVideo();
  const { mode } = useAppMode();
  const { zoneRef, navigateInPane } = useInteractionZone();

  useEffect(() => {
    if (!video) return;

    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return;
        }
      }

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlay();
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const dir = e.key === "ArrowLeft" ? -1 : 1;
        const magnitude = e.shiftKey ? 10 : 1;
        const delta = dir * magnitude;

        const zone = zoneRef.current;
        const isTracking = mode === "tracken";
        const inGraphPane = !isTracking && zone.kind === "graph-pane" && !!zone.paneId;

        if (inGraphPane) {
          navigateInPane(zone.paneId as string, delta);
          return;
        }
        if (!isTracking && snapFrames.length > 0) {
          // Spring naar volgend/vorig meetpunt — geen tussen-frame-stap.
          jumpToMeasurement(dir, magnitude);
          return;
        }
        // Tracking-modus of nog geen meetpunten: ruwe frame-step.
        stepFrame(delta);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [video, stepFrame, togglePlay, mode, zoneRef, navigateInPane, jumpToMeasurement, snapFrames]);
}
