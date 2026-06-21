/**
 * @reusable
 * @category data
 * @description Chart.js plugin die een verticale band tekent tussen
 *   `xMin` en `xMax` (data-coords op de x-as). Voor de visualisatie van
 *   sub-ranges binnen een grotere chart-area — bv. de fit-range in een
 *   videometen-grafiek, waar de leerling moet zien op welk segment het
 *   model "gebaseerd" is t.o.v. waar 't extrapoleert.
 *
 *   Wordt vóór de datasets getekend zodat lijnen er overheen lopen.
 *   Geen-band of degeneraat (xMax ≤ xMin) → geen render.
 */
import type { Chart, Plugin } from "chart.js";

import { readPluginOpts, type XBandPluginOptions } from "./types";

export const xBandPlugin: Plugin<"line" | "scatter"> = {
  id: "xBand",
  beforeDatasetsDraw(chart: Chart) {
    const opts = readPluginOpts<XBandPluginOptions>(chart.options.plugins?.xBand);
    if (!opts || !opts.active) return;
    if (!Number.isFinite(opts.xMin) || !Number.isFinite(opts.xMax)) return;
    if (opts.xMax <= opts.xMin) return;
    const xs = chart.scales.x;
    if (!xs) return;
    const xMinView = xs.min ?? -Infinity;
    const xMaxView = xs.max ?? Infinity;
    // Clip naar zichtbaar gebied — anders verlies je niet zo erg, maar dit
    // voorkomt dat hele scherm-breedte wordt overgeschilderd bij extreme zoom.
    const xLo = Math.max(opts.xMin, xMinView);
    const xHi = Math.min(opts.xMax, xMaxView);
    if (xHi <= xLo) return;

    const area = chart.chartArea;
    const ctx = chart.ctx;
    const pxLo = xs.getPixelForValue(xLo);
    const pxHi = xs.getPixelForValue(xHi);

    ctx.save();
    ctx.fillStyle = opts.fill ?? "rgba(120, 120, 120, 0.06)";
    ctx.fillRect(pxLo, area.top, pxHi - pxLo, area.bottom - area.top);
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pxLo, area.top);
      ctx.lineTo(pxLo, area.bottom);
      ctx.moveTo(pxHi, area.top);
      ctx.lineTo(pxHi, area.bottom);
      ctx.stroke();
    }
    ctx.restore();
  },
};
