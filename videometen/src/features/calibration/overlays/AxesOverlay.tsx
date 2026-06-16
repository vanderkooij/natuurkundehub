import { useRef, useState } from "react";

import { isAxisEditing, useCalibration } from "@/features/calibration/CalibrationState";
import { useVideo } from "@/features/video/VideoState";

const TEAL = "#0BB5C8";
const SNAP_STEP_DEG = 15;
const SNAP_WINDOW_DEG = 3;

/** Snap towards multiples of 15° if within 3°. Shift disables snap. */
function maybeSnap(angleRad: number, shiftActive: boolean): number {
  if (shiftActive) return angleRad;
  const deg = (angleRad * 180) / Math.PI;
  const target = Math.round(deg / SNAP_STEP_DEG) * SNAP_STEP_DEG;
  if (Math.abs(deg - target) < SNAP_WINDOW_DEG) {
    return (target * Math.PI) / 180;
  }
  return angleRad;
}

/**
 * Given an origin and a direction vector (in screen-space), return the
 * smallest positive `t` such that origin + t*dir hits the rectangle
 * [0, w] × [0, h]. Returns null if the direction is zero or already outside.
 */
function exitParameter(
  origin: { x: number; y: number },
  dir: { x: number; y: number },
  w: number,
  h: number,
): number | null {
  const ts: number[] = [];
  if (dir.x > 0) ts.push((w - origin.x) / dir.x);
  if (dir.x < 0) ts.push(-origin.x / dir.x);
  if (dir.y > 0) ts.push((h - origin.y) / dir.y);
  if (dir.y < 0) ts.push(-origin.y / dir.y);
  const positives = ts.filter((t) => t > 0 && Number.isFinite(t));
  if (positives.length === 0) return null;
  return Math.min(...positives);
}

/**
 * Volledige scherm-vullende as-lijnen vanaf de oorsprong. Pijl-koppen op de
 * +x en +y tip op de viewBox-rand. y blijft 90° loodrecht op x.
 * Drag-to-rotate aan de tip van +x (volgt mee tot de rand).
 */
export function AxesOverlay() {
  const { video } = useVideo();
  const { axes, setAxisAngle, mode, startAxisEdit } = useCalibration();
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  if (!video) return null;

  const W = video.width;
  const H = video.height;
  const strokeWidth = Math.max(1.2, Math.min(W, H) * 0.0022);
  const labelFs = Math.max(10, Math.min(W, H) * 0.024);
  const handleR = Math.max(4, Math.min(W, H) * 0.01);
  const headLen = handleR * 1.8;
  const headW = handleR * 1.2;

  // Screen-space direction vectors (physics y-up → screen y-down: flip y).
  const cosA = Math.cos(axes.angle);
  const sinA = Math.sin(axes.angle);
  const xDir = { x: cosA, y: -sinA };
  const yDir = { x: -sinA, y: -cosA };
  const negXDir = { x: -xDir.x, y: -xDir.y };
  const negYDir = { x: -yDir.x, y: -yDir.y };

  // Edge intersection parameters (clamped).
  const tXPlus = exitParameter(axes.origin, xDir, W, H) ?? 0;
  const tXMinus = exitParameter(axes.origin, negXDir, W, H) ?? 0;
  const tYPlus = exitParameter(axes.origin, yDir, W, H) ?? 0;
  const tYMinus = exitParameter(axes.origin, negYDir, W, H) ?? 0;

  const xPlusTip = { x: axes.origin.x + tXPlus * xDir.x, y: axes.origin.y + tXPlus * xDir.y };
  const xMinusTip = {
    x: axes.origin.x + tXMinus * negXDir.x,
    y: axes.origin.y + tXMinus * negXDir.y,
  };
  const yPlusTip = { x: axes.origin.x + tYPlus * yDir.x, y: axes.origin.y + tYPlus * yDir.y };
  const yMinusTip = {
    x: axes.origin.x + tYMinus * negYDir.x,
    y: axes.origin.y + tYMinus * negYDir.y,
  };

  // 11: de POSITIEVE richting kan geflipt zijn (rechts→links, omhoog→omlaag).
  // De aslijnen + rotatie blijven geometrisch gelijk (`angle` ongewijzigd);
  // alleen waar de +x/+y pijlpunt + label staan verandert mee.
  const xPosIsRight = axes.xPositiveDirection === "right";
  const yPosIsUp = axes.yPositiveDirection === "up";
  const xArrowDir = xPosIsRight ? xDir : negXDir;
  const yArrowDir = yPosIsUp ? yDir : negYDir;
  const xArrowTip = xPosIsRight ? xPlusTip : xMinusTip;
  const yArrowTip = yPosIsUp ? yPlusTip : yMinusTip;

  // Inset the rotation handle slightly so the visible circle isn't clipped
  // by the viewBox edge.
  const handleInset = handleR * 2.5;
  const handleX = xPlusTip.x - xDir.x * handleInset;
  const handleY = xPlusTip.y - xDir.y * handleInset;

  // Arrowhead polygon at tip with given direction.
  const arrowHead = (tip: { x: number; y: number }, dirX: number, dirY: number) => {
    const px = -dirY;
    const py = dirX;
    const base = { x: tip.x - headLen * dirX, y: tip.y - headLen * dirY };
    return [
      tip,
      { x: base.x + headW * px, y: base.y + headW * py },
      { x: base.x - headW * px, y: base.y - headW * py },
    ]
      .map((p) => `${p.x},${p.y}`)
      .join(" ");
  };

  // Label position: a touch inside from the (positive) arrow-tip along its
  // negative-direction, zodat het label op de pijl-tip meebeweegt bij een flip.
  const labelInset = handleR * 4;
  const labelX = xArrowTip.x - xArrowDir.x * labelInset;
  const labelYx = xArrowTip.y - xArrowDir.y * labelInset;
  const labelXy = yArrowTip.x - yArrowDir.x * labelInset;
  const labelYy = yArrowTip.y - yArrowDir.y * labelInset;

  const onHandlePointerDown = (e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    e.preventDefault();
    // 11b: rotation-handle slepen in een willekeurige stap → auto-enter axis-edit.
    if (!isAxisEditing(mode)) startAxisEdit();
    setDragging(true);
    draggingRef.current = true;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vw = svg.viewBox.baseVal.width || 1;
    const vh = svg.viewBox.baseVal.height || 1;
    const toPixel = (clientX: number, clientY: number) => ({
      x: ((clientX - rect.left) / rect.width) * vw,
      y: ((clientY - rect.top) / rect.height) * vh,
    });

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const p = toPixel(ev.clientX, ev.clientY);
      const raw = Math.atan2(-(p.y - axes.origin.y), p.x - axes.origin.x);
      const snapped = maybeSnap(raw, ev.shiftKey);
      setAxisAngle(snapped);
    };
    const onUp = () => {
      draggingRef.current = false;
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <g>
      {/* Full-screen axis lines (both positive and negative directions). */}
      <g stroke={TEAL} strokeWidth={strokeWidth} fill="none">
        <line x1={xMinusTip.x} y1={xMinusTip.y} x2={xPlusTip.x} y2={xPlusTip.y} />
        <line x1={yMinusTip.x} y1={yMinusTip.y} x2={yPlusTip.x} y2={yPlusTip.y} />
      </g>

      {/* Arrowheads at the positive (mogelijk geflipte) tips. */}
      <polygon points={arrowHead(xArrowTip, xArrowDir.x, xArrowDir.y)} fill={TEAL} />
      <polygon points={arrowHead(yArrowTip, yArrowDir.x, yArrowDir.y)} fill={TEAL} />

      {/* Labels just inside the edge, op de +x/+y pijl-tip. */}
      <text
        x={labelX - xArrowDir.x * labelFs * 0.2}
        y={labelYx - xArrowDir.y * labelFs * 0.2 + labelFs * 0.35}
        fill={TEAL}
        fontSize={labelFs}
        textAnchor="middle"
        fontFamily="JetBrains Mono, monospace"
      >
        +x
      </text>
      <text
        x={labelXy - yArrowDir.x * labelFs * 0.2}
        y={labelYy - yArrowDir.y * labelFs * 0.2 + labelFs * 0.35}
        fill={TEAL}
        fontSize={labelFs}
        textAnchor="middle"
        fontFamily="JetBrains Mono, monospace"
      >
        +y
      </text>

      {/* Rotation handle — inset from the +x edge so it stays visible. */}
      <circle
        cx={handleX}
        cy={handleY}
        r={handleR * 2.2}
        fill="transparent"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onPointerDown={onHandlePointerDown}
      />
      <circle
        cx={handleX}
        cy={handleY}
        r={handleR}
        fill={TEAL}
        stroke="white"
        strokeWidth={strokeWidth * 0.6}
        style={{ pointerEvents: "none" }}
      />
    </g>
  );
}
