import { useCallback, useRef, type CSSProperties } from "react";

import { toast } from "@/_reusable/Toaster";
import { useAppMode } from "@/features/app/AppMode";
import { type Pixel } from "@/features/calibration/CalibrationState";
import { useMeasurementHover } from "@/features/measurements/MeasurementHoverState";
import { useTracking } from "@/features/tracking/TrackingState";
import { useVideo } from "@/features/video/VideoState";

const CLICK_DRAG_THRESHOLD_PX = 4;

/**
 * Sub-overlay binnen de gedeelde SVG (mount-host = CalibrationOverlay).
 *
 * Rolverdeling tussen de twee app-modi (tweak 1 in prompt 03b):
 *  - Tracking-modus: dots en lijnen zijn niet-interactief. Elke klik op de
 *    video gaat via de click-capture rect en plaatst altijd een nieuw punt op
 *    het huidige frame (overschrijft een bestaand punt voor dat frame).
 *  - Analyse-modus: click-capture rect doet niets; trail-dots zijn klikbaar
 *    (= spring naar frame) én sleepbaar (= move-point). Onder-de-streep
 *    drag-threshold ≈ 4 px voorkomt dat een klik per ongeluk als drag landt.
 *
 * Maten en kleuren komen uit CSS-variabelen in `index.css` (tweaks 2 & 3):
 *  - `--track-dot-radius`, `--track-dot-active-radius`, `--track-trail-stroke-width`
 *  - `--trail-dot`, `--trail-ring`, `--trail-line-opacity` (via
 *    `[data-trail-color="…"]` op `<html>`).
 */
export function TrailOverlay() {
  const { video, currentFrame, trim, setFrame } = useVideo();
  const { points, trailVisible, setPointAt, movePointAt, frameStep } = useTracking();
  const { mode: appMode } = useAppMode();
  const { hoveredFrame, setHoveredFrame } = useMeasurementHover();

  // Track "completion" toast so we only fire it once per end-reaching session.
  const completedRef = useRef(false);
  if (currentFrame < trim.end && completedRef.current) {
    completedRef.current = false;
  }

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

  const handleClickCapture = (e: React.PointerEvent<SVGRectElement>) => {
    if (appMode !== "tracken") return;
    if (!video) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const p = toPixel(svg, e.clientX, e.clientY);
    if (!p) return;
    setPointAt(currentFrame, p);

    // Auto-advance, unless we've already passed (or just reached) the trim end.
    const next = currentFrame + frameStep;
    if (next > trim.end) {
      setFrame(trim.end);
      if (!completedRef.current) {
        const total = points.filter((pt) => pt.frame !== currentFrame).length + 1;
        toast(`Klaar met tracken! Je hebt ${total} punten gezet.`);
        completedRef.current = true;
      }
    } else {
      setFrame(next);
    }
  };

  // Dot-handler is alleen actief in niet-tracken-modi; in tracken-modus zit
  // pointer-events op `none` op de dot-hit-area, dus dit fires nooit.
  const handlePointPointerDown = (frame: number) => (e: React.PointerEvent<SVGCircleElement>) => {
    if (appMode === "tracken") return;
    e.stopPropagation();
    e.preventDefault();
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    const prevBodyCursor = document.body.style.cursor;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > CLICK_DRAG_THRESHOLD_PX) {
        moved = true;
        // Drag is begonnen: visuele feedback in de hele viewport.
        document.body.style.cursor = "move";
      }
      if (!moved) return;
      const p = toPixel(svg, ev.clientX, ev.clientY);
      if (!p) return;
      movePointAt(frame, p);
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = prevBodyCursor;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const isClick = Math.hypot(dx, dy) <= CLICK_DRAG_THRESHOLD_PX;
      if (isClick) setFrame(frame);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (!video) return null;

  const inTrim = (frame: number) => frame >= trim.start && frame <= trim.end;

  // Build line segments only between consecutive in-trim points.
  const lineSegs: Array<{ a: TrailSegPoint; b: TrailSegPoint }> = [];
  if (trailVisible) {
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      if (inTrim(a.frame) && inTrim(b.frame)) {
        lineSegs.push({ a, b });
      }
    }
  }

  const isTracking = appMode === "tracken";

  // Inline-style helpers — typecast omdat React.CSSProperties' SVG-keys per
  // versie verschillen; deze cast houdt de TS-checks rustig.
  const dotStyle = (active: boolean): CSSProperties =>
    ({
      r: active ? "var(--track-dot-active-radius)" : "var(--track-dot-radius)",
      fill: "var(--trail-dot)",
      pointerEvents: "none",
    }) as CSSProperties;

  const ringStyle: CSSProperties = {
    r: "var(--track-dot-active-radius)",
    stroke: "var(--trail-ring)",
    strokeWidth: "var(--track-trail-stroke-width)",
    pointerEvents: "none",
  } as CSSProperties;

  // Hover-ring (vanuit MeasurementHoverState): subtieler dan de actieve-ring,
  // dunner stroke en accent-kleur in plaats van trail-ring-kleur.
  const hoverRingStyle: CSSProperties = {
    r: "var(--track-dot-active-radius)",
    stroke: "var(--accent)",
    strokeWidth: "calc(var(--track-trail-stroke-width) * 0.65)",
    pointerEvents: "none",
  } as CSSProperties;

  const lineStyle: CSSProperties = {
    stroke: "var(--trail-dot)",
    strokeWidth: "var(--track-trail-stroke-width)",
    opacity: "var(--trail-line-opacity)" as unknown as number,
    pointerEvents: "none",
  };

  return (
    <g>
      {/* Click capture rect — alleen actief in tracking-modus. */}
      <rect
        x={0}
        y={0}
        width={video.width}
        height={video.height}
        fill="transparent"
        style={{
          pointerEvents: isTracking ? "auto" : "none",
          cursor: isTracking ? "crosshair" : "default",
        }}
        onPointerDown={handleClickCapture}
      />

      {/* Dashed trail line — nooit interactief. */}
      {lineSegs.map(({ a, b }) => (
        <line
          key={`seg-${a.frame}-${b.frame}`}
          x1={a.pixel.x}
          y1={a.pixel.y}
          x2={b.pixel.x}
          y2={b.pixel.y}
          strokeDasharray="2,3"
          style={lineStyle}
        />
      ))}

      {/* Dots — hit-area is alleen interactief in analyse-modus. */}
      {points.map((pt) => {
        const isActive = pt.frame === currentFrame;
        const isHovered = pt.frame === hoveredFrame && !isActive;
        const dim = !inTrim(pt.frame);
        const opacity = dim ? 0.35 : 0.9;
        return (
          <g key={`pt-${pt.frame}`}>
            {/* Onzichtbare hit-area, ruim genoeg om makkelijk te grijpen.
                Pointer-enter/leave doen hover-sync naar tabel (alleen in
                analyse-modus — in tracking-modus zit pointer-events op none). */}
            <circle
              cx={pt.pixel.x}
              cy={pt.pixel.y}
              r={8}
              fill="transparent"
              style={{
                cursor: isTracking ? "default" : "pointer",
                pointerEvents: isTracking ? "none" : "auto",
              }}
              onPointerDown={handlePointPointerDown(pt.frame)}
              onPointerEnter={isTracking ? undefined : () => setHoveredFrame(pt.frame)}
              onPointerLeave={isTracking ? undefined : () => setHoveredFrame(null)}
            />
            {/* Zichtbare dot — maat en kleur via CSS-vars. */}
            <circle
              cx={pt.pixel.x}
              cy={pt.pixel.y}
              opacity={opacity}
              style={dotStyle(isActive)}
            />
            {isActive && !dim ? (
              <circle cx={pt.pixel.x} cy={pt.pixel.y} fill="none" style={ringStyle} />
            ) : null}
            {isHovered && !dim ? (
              <circle cx={pt.pixel.x} cy={pt.pixel.y} fill="none" style={hoverRingStyle} />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

interface TrailSegPoint {
  frame: number;
  pixel: Pixel;
}
