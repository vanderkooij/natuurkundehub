import { useCallback, useRef } from "react";

import { isAxisEditing, useCalibration, type Pixel } from "@/features/calibration/CalibrationState";
import { useVideo } from "@/features/video/VideoState";

const TEAL = "#0BB5C8";

/**
 * Sleepbare oorsprong-marker. Werkt altijd (behalve tijdens scale-edit,
 * waar de root-overlay ons pointer-events afpakt).
 */
export function OriginMarker() {
  const { video } = useVideo();
  const { axes, setOrigin, mode, startAxisEdit } = useCalibration();
  const dragging = useRef(false);

  const toPixelFromElement = useCallback(
    (el: SVGElement, clientX: number, clientY: number): Pixel | null => {
      const svg = el.ownerSVGElement;
      if (!svg) return null;
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

  const onPointerDown = (e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    // 11b: oorsprong slepen in een willekeurige stap → auto-enter axis-edit,
    // zodat de hint + richting-toggles meteen verschijnen.
    if (!isAxisEditing(mode)) startAxisEdit();
    dragging.current = true;
    const target = e.currentTarget;
    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const p = toPixelFromElement(target, ev.clientX, ev.clientY);
      if (p) setOrigin(p);
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (!video) return null;

  const r = Math.max(4, Math.min(video.width, video.height) * 0.008);
  const labelFs = Math.max(10, Math.min(video.width, video.height) * 0.022);

  return (
    <g onPointerDown={onPointerDown} style={{ cursor: dragging.current ? "grabbing" : "grab" }}>
      {/* Larger transparent hit area for easier grabbing. */}
      <circle cx={axes.origin.x} cy={axes.origin.y} r={r * 2.5} fill="transparent" />
      <circle cx={axes.origin.x} cy={axes.origin.y} r={r} fill={TEAL} />
      <text
        x={axes.origin.x - r * 1.6}
        y={axes.origin.y + r * 2.5}
        fill={TEAL}
        fontSize={labelFs}
        fontFamily="JetBrains Mono, monospace"
      >
        O
      </text>
    </g>
  );
}
