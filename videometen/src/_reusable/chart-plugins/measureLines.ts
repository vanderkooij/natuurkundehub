/**
 * @reusable
 * @category data
 * @description Chart.js plugin die twee verticale meet-lijnen tekent (één in
 *   NH-cyaan, één in amber) op `x1` en `x2`. Sleepbare handles bovenop de
 *   lijnen worden door de wrapper (`InteractiveChart`) gerenderd als absolute-
 *   positioned divs.
 *
 *   Geport uit modelleren's `measureLinesPlugin`.
 */
import type { Chart, Plugin } from "chart.js";

import { readPluginOpts, type MeasureLinesPluginOptions } from "./types";

export const measureLinesPlugin: Plugin<"line" | "scatter"> = {
  id: "measureLines",
  afterDatasetsDraw(chart: Chart) {
    const opts = readPluginOpts<MeasureLinesPluginOptions>(chart.options.plugins?.measureLines);
    if (!opts || !opts.active) return;
    const xs = chart.scales.x;
    const ys = chart.scales.y;
    if (!xs || !ys) return;

    const ctx = chart.ctx;
    const area = chart.chartArea;
    const lines: Array<[number | null, string]> = [
      [opts.x1, opts.color1 ?? "#0BB5C8"],
      [opts.x2, opts.color2 ?? "#D4923A"],
    ];

    for (const [xv, col] of lines) {
      if (xv == null || !Number.isFinite(xv)) continue;
      const px = xs.getPixelForValue(xv);
      if (px < area.left - 1 || px > area.right + 1) continue;
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(px, area.top);
      ctx.lineTo(px, area.bottom);
      ctx.stroke();
      ctx.restore();
    }
  },
};
