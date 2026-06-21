/**
 * @reusable
 * @category data
 * @description Chart.js plugin die het label bij een raaklijn rendert (bv.
 *   "dy/dx = 2,4 m/s") in een semi-transparante pill, **direct op de
 *   raaklijn-y** van het verre uiteinde (geen verticale offset). De pill-
 *   achtergrond is semi-transparant zodat de raaklijn er doorheen schemert,
 *   wat de visuele binding tussen lijn en label versterkt.
 *
 *   Plaatsings-modus:
 *   - Met `anchorX` + `x1/y1/x2/y2`: label aan het uiteinde dat het verst
 *     van het anker ligt (in pixel-afstand). Bij clipping aan de chart-rand
 *     (steile slope) volgt de plaatsing het laatste zichtbare punt van de
 *     raaklijn — via Liang–Barsky lijn-rechthoek-clipping.
 *   - Zonder die opties: fallback naar `midX/midY` (oude gedrag, voor andere
 *     consumers).
 *   - Bij heel korte raaklijn op 't scherm (< 40 px): altijd midden.
 *
 *   Geport uit modelleren's `tangentLabelPlugin`; uitgebreid in 05d en 05e.
 */
import type { Chart, Plugin } from "chart.js";

import { readPluginOpts, type TangentLabelPluginOptions } from "./types";

const MIN_END_PIXEL_DIST = 40;
const END_MARGIN = 12;
const LABEL_HEIGHT = 20;
const LABEL_PADDING = 6;

/**
 * Liang–Barsky lijn-rechthoek-clipping. Retourneert de zichtbare delen van
 * de lijn `(x1,y1) → (x2,y2)` binnen `[xmin..xmax] × [ymin..ymax]`, of `null`
 * als de hele lijn buiten de rechthoek valt.
 */
function clipLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  xmin: number,
  ymin: number,
  xmax: number,
  ymax: number,
): { ax: number; ay: number; bx: number; by: number } | null {
  let t1 = 0;
  let t2 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const checks: Array<[number, number]> = [
    [-dx, x1 - xmin],
    [dx, xmax - x1],
    [-dy, y1 - ymin],
    [dy, ymax - y1],
  ];
  for (const [denom, num] of checks) {
    if (denom === 0) {
      if (num < 0) return null;
      continue;
    }
    const t = num / denom;
    if (denom < 0) {
      if (t > t2) return null;
      if (t > t1) t1 = t;
    } else {
      if (t < t1) return null;
      if (t < t2) t2 = t;
    }
  }
  return {
    ax: x1 + t1 * dx,
    ay: y1 + t1 * dy,
    bx: x1 + t2 * dx,
    by: y1 + t2 * dy,
  };
}

export const tangentLabelPlugin: Plugin<"line" | "scatter"> = {
  id: "tangentLabel",
  afterDraw(chart: Chart) {
    const opts = readPluginOpts<TangentLabelPluginOptions>(chart.options.plugins?.tangentLabel);
    if (!opts || !opts.label) return;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    if (!xScale || !yScale) return;
    const area = chart.chartArea;

    const ctx = chart.ctx;
    ctx.save();
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = opts.label;
    const tw = ctx.measureText(text).width;

    // ---- Bepaal label-positie ---------------------------------------------
    const canPlaceAtEnd =
      opts.anchorX != null &&
      opts.x1 != null &&
      opts.y1 != null &&
      opts.x2 != null &&
      opts.y2 != null;

    let px: number;
    let py: number;

    if (canPlaceAtEnd) {
      const leftPx = xScale.getPixelForValue(opts.x1 as number);
      const leftPyPx = yScale.getPixelForValue(opts.y1 as number);
      const rightPx = xScale.getPixelForValue(opts.x2 as number);
      const rightPyPx = yScale.getPixelForValue(opts.y2 as number);
      const dotPx = xScale.getPixelForValue(opts.anchorX as number);

      // Clip de raaklijn aan de chart-area-rechthoek — dan kennen we het
      // LAATSTE ZICHTBARE punt aan elk uiteinde, ook als de slope steil is.
      const clipped = clipLine(
        leftPx,
        leftPyPx,
        rightPx,
        rightPyPx,
        area.left,
        area.top,
        area.right,
        area.bottom,
      );

      if (clipped && Math.hypot(clipped.bx - clipped.ax, clipped.by - clipped.ay) >= MIN_END_PIXEL_DIST) {
        // Bepaal welk zichtbaar uiteinde verder van de dot ligt.
        const distA = Math.abs(clipped.ax - dotPx);
        const distB = Math.abs(clipped.bx - dotPx);
        const placeRight = distB > distA;
        const endXPx = placeRight ? clipped.bx : clipped.ax;
        const endYPx = placeRight ? clipped.by : clipped.ay;

        // Horizontaal: net binnen het uiteinde met margin.
        px = placeRight ? endXPx - END_MARGIN : endXPx + END_MARGIN;
        // Verticaal: EXACT op de raaklijn-y. Pill loopt symmetrisch om dit
        // punt heen; line schuift onder de pill door en blijft visueel
        // verbonden.
        py = endYPx;
      } else {
        // Te kort op het scherm of clipping mislukt → fallback naar midden.
        px = xScale.getPixelForValue(opts.midX);
        py = yScale.getPixelForValue(opts.midY);
      }
    } else {
      // Fallback voor consumenten zonder anker/endpoints.
      px = xScale.getPixelForValue(opts.midX);
      py = yScale.getPixelForValue(opts.midY);
    }

    // Clamp binnen chartArea zodat label nooit over de assen valt.
    const halfW = tw / 2 + LABEL_PADDING;
    const halfH = LABEL_HEIGHT / 2;
    px = Math.max(area.left + halfW + 2, Math.min(area.right - halfW - 2, px));
    py = Math.max(area.top + halfH + 2, Math.min(area.bottom - halfH - 2, py));

    // ---- Render: semi-transparante pill + amber tekst ---------------------
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const accent = opts.color ?? "#d4923a";
    ctx.fillStyle = isDark ? "rgba(28,35,51,0.85)" : "rgba(255,255,255,0.85)";
    const rx = px - tw / 2 - LABEL_PADDING;
    const ry = py - halfH;
    const rw = tw + LABEL_PADDING * 2;
    ctx.beginPath();
    ctx.rect(rx, ry, rw, LABEL_HEIGHT);
    ctx.fill();

    // Subtiele onderlijn in accent-kleur als visuele binding met de raaklijn.
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rx, ry + LABEL_HEIGHT);
    ctx.lineTo(rx + rw, ry + LABEL_HEIGHT);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.fillText(text, px, py);
    ctx.restore();
  },
};
