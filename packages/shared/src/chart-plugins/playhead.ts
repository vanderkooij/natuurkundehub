/**
 * @reusable
 * @category data
 * @description Chart.js plugin die een verticale stippellijn ("playhead")
 *   tekent op `chart.options.plugins.playhead.x` (data-coord op de x-as).
 *   Out-of-range of `null` → niets. Hardgecodeerde defaults voor kleur/dash
 *   maar overridable via plugin-opties.
 *
 *   Note: videometen zelf gebruikt deze plugin bewust **niet** meer (sinds
 *   05d). Daar snapt `currentFrame` altijd naar een meetpunt-frame, dus de
 *   rode dot is voldoende indicator en een dubbele stippellijn redundant.
 *   De plugin blijft hier bestaan voor andere consumers (bv. een time-series-
 *   tool waar de playhead tussen samples wel zinvol is).
 */
import type { Chart, Plugin } from "chart.js";

import { readPluginOpts, type PlayheadPluginOptions } from "./types";

export const playheadPlugin: Plugin<"line" | "scatter"> = {
  id: "playhead",
  afterDatasetsDraw(chart: Chart) {
    const opts = readPluginOpts<PlayheadPluginOptions>(chart.options.plugins?.playhead);
    if (!opts || opts.x == null || !Number.isFinite(opts.x)) return;
    const xScale = chart.scales.x;
    if (!xScale) return;
    const xMin = xScale.min ?? -Infinity;
    const xMax = xScale.max ?? Infinity;
    if (opts.x < xMin || opts.x > xMax) return;

    const px = xScale.getPixelForValue(opts.x);
    const area = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = opts.color ?? "rgba(100, 116, 139, 0.6)";
    ctx.lineWidth = opts.width ?? 1.5;
    ctx.setLineDash(opts.dash ?? [4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, area.top);
    ctx.lineTo(px, area.bottom);
    ctx.stroke();
    ctx.restore();
  },
};
