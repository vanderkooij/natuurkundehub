import { useCallback, useRef } from "react";

import { useCalibration, type Pixel } from "@/features/calibration/CalibrationState";
import { useVideo } from "@/features/video/VideoState";
import { formatSigFigs } from "@/lib/numbers";

const AMBER = "#D4923A";

/**
 * Schaal-streep + handles. Zichtbaarheidsregels:
 *   - mode === "idle" of axis-edit-by-angle of origin-edit → niets renderen
 *   - mode === "scale-edit" → toon streep + sleepbare endpoint-handles als er een
 *     gecommitteerde schaal is, of draft-dots/lijn tijdens placing
 *
 * Tijdens slepen: de world-length blijft staan; alleen de pixel-afstand
 * verandert dus impliciet de scale-factor (m/px) verschuift.
 */
export function ScaleOverlay() {
  const { video } = useVideo();
  const { scale, scaleDraft, mode, updateScalePoint } = useCalibration();
  const draggingRef = useRef<"p1" | "p2" | null>(null);

  const toPixel = useCallback(
    (svg: SVGSVGElement, clientX: number, clientY: number): Pixel | null => {
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const w = svg.viewBox.baseVal.width || 1;
      const h = svg.viewBox.baseVal.height || 1;
      return {
        x: ((clientX - rect.left) / rect.width) * w,
        y: ((clientY - rect.top) / rect.height) * h,
      };
    },
    [],
  );

  const startHandleDrag = (which: "p1" | "p2") => (e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    draggingRef.current = which;

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const p = toPixel(svg, ev.clientX, ev.clientY);
      if (p) updateScalePoint(draggingRef.current, p);
    };
    const onUp = () => {
      draggingRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (!video) return null;
  // Hidden in any mode other than scale-edit.
  if (mode !== "scale-edit") return null;

  const tick = Math.max(6, Math.min(video.width, video.height) * 0.012);
  const strokeWidth = Math.max(1.5, Math.min(video.width, video.height) * 0.003);
  const fontSize = Math.max(10, Math.min(video.width, video.height) * 0.022);
  const handleR = Math.max(5, Math.min(video.width, video.height) * 0.011);

  // Editing sub-mode: committed scale + draggable handles.
  if (scale) {
    const midX = (scale.p1.x + scale.p2.x) / 2;
    const midY = (scale.p1.y + scale.p2.y) / 2;
    const label = `${formatSigFigs(scale.length)} ${scale.unit}`;
    return (
      <g>
        <g stroke={AMBER} fill="none" strokeWidth={strokeWidth}>
          <line x1={scale.p1.x} y1={scale.p1.y} x2={scale.p2.x} y2={scale.p2.y} />
        </g>
        {/* Label above midpoint */}
        <text
          x={midX}
          y={midY - tick * 2}
          fill={AMBER}
          fontSize={fontSize}
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
        >
          {label}
        </text>
        {/* Endpoint handles */}
        {(["p1", "p2"] as const).map((which) => {
          const p = scale[which];
          return (
            <g key={which}>
              <circle
                cx={p.x}
                cy={p.y}
                r={handleR * 2.2}
                fill="transparent"
                style={{ cursor: "move" }}
                onPointerDown={startHandleDrag(which)}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={handleR}
                fill={AMBER}
                stroke="white"
                strokeWidth={strokeWidth * 0.6}
                style={{ pointerEvents: "none" }}
              />
            </g>
          );
        })}
      </g>
    );
  }

  // Placing sub-mode: no committed scale yet, show draft dots/lijn.
  if (scaleDraft.p1) {
    return (
      <g fill={AMBER} stroke={AMBER}>
        <circle cx={scaleDraft.p1.x} cy={scaleDraft.p1.y} r={tick * 0.8} stroke="none" />
        {scaleDraft.p2 ? (
          <>
            <line
              x1={scaleDraft.p1.x}
              y1={scaleDraft.p1.y}
              x2={scaleDraft.p2.x}
              y2={scaleDraft.p2.y}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <circle cx={scaleDraft.p2.x} cy={scaleDraft.p2.y} r={tick * 0.8} stroke="none" />
          </>
        ) : null}
      </g>
    );
  }

  return null;
}
