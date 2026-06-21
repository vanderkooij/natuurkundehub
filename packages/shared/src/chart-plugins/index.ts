/**
 * Centraal registratie-punt voor de NH chart-plugins + zoom-plugin. Importeer
 * dit bestand één keer in je app (gebeurt automatisch via `InteractiveChart`)
 * om alle plugins beschikbaar te maken in elke nieuwe Chart-instance.
 *
 * Idempotent: meerdere imports zijn veilig — `Chart.register()` filtert al op
 * plugin-id.
 */
import {
  CategoryScale,
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  ScatterController,
  Tooltip,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

import "./types";
import { measureLinesPlugin } from "./measureLines";
import { playheadPlugin } from "./playhead";
import { tangentLabelPlugin } from "./tangent";
import { xBandPlugin } from "./xBand";

let registered = false;

export function ensureChartPluginsRegistered(): void {
  if (registered) return;
  registered = true;
  Chart.register(
    // Built-in: schalen, controllers, elementen, tooltip.
    LinearScale,
    CategoryScale,
    LineController,
    ScatterController,
    LineElement,
    PointElement,
    Filler,
    Tooltip,
    // 3rd-party: wheel/pinch zoom + pan.
    zoomPlugin,
    // NH-eigen:
    playheadPlugin,
    tangentLabelPlugin,
    measureLinesPlugin,
    xBandPlugin,
  );
}

export { playheadPlugin } from "./playhead";
export { tangentLabelPlugin } from "./tangent";
export { measureLinesPlugin } from "./measureLines";
export { xBandPlugin } from "./xBand";
export type {
  PlayheadPluginOptions,
  TangentLabelPluginOptions,
  MeasureLinesPluginOptions,
  XBandPluginOptions,
} from "./types";
