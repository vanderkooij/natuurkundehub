import { useCalibration, pixelDistance } from "@/features/calibration/CalibrationState";
import { useVideo } from "@/features/video/VideoState";

const ACCENT = "#0BB5C8";
const REGULAR_OPACITY = 0.15;
const ORIGIN_OPACITY = 0.3;

/**
 * Rotating reference grid, only visible during `axis-edit-by-angle`. Spacing:
 *   - 1 user-unit (m/cm/mm) when a scale is calibrated
 *   - 50 px fallback when no scale yet
 *
 * Implementatie: we tekenen evenwijdige lijnen in een lokaal coördinaten-
 * stelsel rond de oorsprong en roteren de hele groep met `rotate(-angleDeg)`
 * rond de oorsprong (negatief omdat SVG y-omlaag heeft maar physics y-omhoog).
 * Extent = √2 × max-dim zodat na rotatie geen lege hoeken in de viewBox vallen.
 */
export function AxesGrid() {
  const { video } = useVideo();
  const { mode, scale, axes } = useCalibration();

  if (!video) return null;
  if (mode !== "axis-edit-by-angle") return null;

  const spacing =
    scale && pixelDistance(scale.p1, scale.p2) > 0
      ? pixelDistance(scale.p1, scale.p2) / scale.length
      : 50;

  // Cover the viewBox conservatively after rotation.
  const maxDim = Math.max(video.width, video.height);
  const extent = Math.ceil((maxDim * 1.45) / spacing) * spacing;

  // Number of lines on each side of origin.
  const n = Math.ceil(extent / spacing);

  const lines: Array<{
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    opacity: number;
  }> = [];
  const stroke = Math.max(0.5, Math.min(video.width, video.height) * 0.0015);

  for (let i = -n; i <= n; i += 1) {
    const offset = i * spacing;
    const opacity = i === 0 ? ORIGIN_OPACITY : REGULAR_OPACITY;
    // Horizontal grid line (constant y = origin.y + offset) in unrotated space
    lines.push({
      key: `h-${i}`,
      x1: axes.origin.x - extent,
      y1: axes.origin.y + offset,
      x2: axes.origin.x + extent,
      y2: axes.origin.y + offset,
      opacity,
    });
    // Vertical grid line (constant x = origin.x + offset)
    lines.push({
      key: `v-${i}`,
      x1: axes.origin.x + offset,
      y1: axes.origin.y - extent,
      x2: axes.origin.x + offset,
      y2: axes.origin.y + extent,
      opacity,
    });
  }

  // SVG rotate is degrees, clockwise. Physics angle is CCW so we negate.
  const rotateDeg = -((axes.angle * 180) / Math.PI);

  return (
    <g
      transform={`rotate(${rotateDeg}, ${axes.origin.x}, ${axes.origin.y})`}
      style={{ pointerEvents: "none" }}
    >
      {lines.map((l) => (
        <line
          key={l.key}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={ACCENT}
          strokeWidth={stroke}
          opacity={l.opacity}
        />
      ))}
    </g>
  );
}
