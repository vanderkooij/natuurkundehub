import { useCallback, useRef } from "react";

import { useAppMode } from "@/features/app/AppMode";
import { useCalibration, type Pixel } from "@/features/calibration/CalibrationState";
import { TrailOverlay } from "@/features/tracking/TrailOverlay";
import { useVideo } from "@/features/video/VideoState";

import { AxesGrid } from "./AxesGrid";
import { AxesOverlay } from "./AxesOverlay";
import { OriginMarker } from "./OriginMarker";
import { ScaleOverlay } from "./ScaleOverlay";

/**
 * Root SVG-overlay over de video — hostfile voor zowel kalibratie- als
 * tracking-sub-overlays. ViewBox = native videoresolutie zodat alle children
 * in pixel-coords werken. preserveAspectRatio="none" is veilig: de wrapper
 * in VideoPlayer deelt al exact dezelfde letterboxed bounds als de <video>.
 *
 * Interactie-matrix:
 *  - Tracken-modus: calibratie-overlays zijn pointer-events:none (referentie,
 *    niet manipuleerbaar). Trail-overlay's click-capture rect staat aan.
 *  - Niet-tracken + scale-edit/origin-edit: calibratie-click-capture aan,
 *    tracking-click-capture uit.
 *  - Niet-tracken + idle/axis-edit: niets capture-t click, handles
 *    (origin / axis / trail-dot) blijven werken via hun eigen pointer-events.
 */
export function CalibrationOverlay() {
  const { video } = useVideo();
  const { mode, scale, registerScaleClick, setOrigin } = useCalibration();
  const { mode: appMode } = useAppMode();
  const svgRef = useRef<SVGSVGElement>(null);

  const isTracking = appMode === "tracken";

  // Calibration click-capture: only when in a calibration-placement sub-mode
  // (placing scale points or moving origin) AND we're NOT in tracken-modus.
  const calibClickCapturing =
    !isTracking && (mode === "origin-edit" || (mode === "scale-edit" && scale === null));

  // Calibration overlays (origin/axes/scale handles) are interactive in elke
  // niet-tracken-modus, mits geen click-capture vecht om events.
  const calibrationInteractive = !isTracking && !calibClickCapturing;

  const toPixel = useCallback((clientX: number, clientY: number): Pixel | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const w = svg.viewBox.baseVal.width || 1;
    const h = svg.viewBox.baseVal.height || 1;
    return {
      x: ((clientX - rect.left) / rect.width) * w,
      y: ((clientY - rect.top) / rect.height) * h,
    };
  }, []);

  const onCaptureClick = (e: React.PointerEvent<SVGRectElement>) => {
    if (!calibClickCapturing) return;
    const p = toPixel(e.clientX, e.clientY);
    if (!p) return;
    if (mode === "scale-edit") registerScaleClick(p);
    else if (mode === "origin-edit") setOrigin(p);
  };

  if (!video) return null;

  // SVG-wide cursor hint per mode.
  let cursorClass = "cursor-default";
  if (calibClickCapturing) cursorClass = "cursor-crosshair";
  else if (isTracking) cursorClass = "cursor-crosshair";

  // The wrapper SVG needs pointer-events: auto whenever ANY sub-layer wants
  // clicks. Calibration click-capture, tracking click-capture, or any handle.
  const svgPointerEvents =
    calibClickCapturing || calibrationInteractive || isTracking ? "auto" : "none";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${video.width} ${video.height}`}
      preserveAspectRatio="none"
      className={`absolute inset-0 h-full w-full ${cursorClass}`}
      style={{ pointerEvents: svgPointerEvents }}
    >
      {/* Grid sits behind everything else (rendered only in axis-edit-by-angle). */}
      <AxesGrid />

      {/* Calibration click-capture layer — only active in scale-edit/origin-edit. */}
      <rect
        x={0}
        y={0}
        width={video.width}
        height={video.height}
        fill="transparent"
        onPointerDown={onCaptureClick}
        style={{ pointerEvents: calibClickCapturing ? "auto" : "none" }}
      />

      {/* Calibration overlays: visible in both modes, but interactive only in analyse. */}
      <g style={{ pointerEvents: calibrationInteractive ? "auto" : "none" }}>
        <ScaleOverlay />
        <OriginMarker />
        <AxesOverlay />
      </g>

      {/* Tracking layer: handles its own click capture + draggable points. */}
      <TrailOverlay />
    </svg>
  );
}
