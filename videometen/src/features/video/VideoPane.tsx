import { Pane, PaneHeader } from "@/_reusable/ThreePaneLayout";
import { AxisDirectionControls } from "@/features/calibration/AxisDirectionControls";
import { InstructionOverlay } from "@/features/calibration/InstructionOverlay";
import { ScaleChip } from "@/features/calibration/ScaleChip";
import { ScaleDialog } from "@/features/calibration/ScaleDialog";
import { useEscapeMode } from "@/features/calibration/useEscapeMode";
import { CalibrationOverlay } from "@/features/calibration/overlays/CalibrationOverlay";
import { FrameStepChip } from "@/features/tracking/FrameStepChip";
import { TrailColorChip } from "@/features/tracking/TrailColorChip";
import { FpsChip } from "@/features/video/FpsChip";
import { VideoControls } from "@/features/video/VideoControls";
import { VideoDropZone } from "@/features/video/VideoDropZone";
import { VideoPlayer } from "@/features/video/VideoPlayer";
import { useFpsDetection } from "@/features/video/useFpsDetection";
import { useVideo } from "@/features/video/VideoState";

export function VideoPane() {
  const { video } = useVideo();
  useFpsDetection();
  useEscapeMode();

  return (
    <Pane>
      <PaneHeader
        title="Video"
        actions={
          video ? (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <FpsChip />
              <TrailColorChip />
              <ScaleChip />
              <FrameStepChip />
            </div>
          ) : null
        }
      />
      <div className="relative flex flex-1 min-h-0 flex-col">
        {video ? (
          <>
            <VideoPlayer>
              <CalibrationOverlay />
            </VideoPlayer>
            <InstructionOverlay />
            <AxisDirectionControls />
          </>
        ) : (
          <VideoDropZone />
        )}
      </div>
      {video ? <VideoControls /> : null}

      {/* Dialogs are portalled — render once when video is present. De hoek-
          input-dialog is in 08c verwijderd; assen draaien gaat via de sleep-
          handle aan de +x-tip (AxesOverlay). */}
      {video ? <ScaleDialog /> : null}
    </Pane>
  );
}
