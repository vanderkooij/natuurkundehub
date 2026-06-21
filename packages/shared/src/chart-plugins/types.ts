/**
 * Module-augmentation voor Chart.js: voegt typed opties toe voor onze custom
 * plugins (`playhead`, `tangentLabel`, `measureLines`) onder
 * `chart.options.plugins.*`. Importeren is genoeg — registratie gebeurt in
 * `register.ts`.
 *
 * Let op: `chart.options.plugins.<naam>` wordt door Chart.js intern als
 * `_DeepPartial<…>` getypeerd. Lees opties altijd via `readPlugin()` zodat ze
 * weer hun nominale type krijgen (geen `undefined` op velden die wel staan).
 */
import type { ChartType } from "chart.js";

export interface PlayheadPluginOptions {
  /** x-waarde op de data-as. `null` of out-of-range → niets tekenen. */
  x: number | null;
  /** Lijnkleur. Default: semi-transparante text-color. */
  color?: string;
  /** Lijndikte in pixels. Default: 1.5. */
  width?: number;
  /** Dash-pattern. Default: [4, 4]. */
  dash?: number[];
}

export interface TangentLabelPluginOptions {
  label: string;
  /** Midden van de raaklijn in data-coords. Fallback voor plaatsing wanneer
   *  geen anker/eindpunten zijn meegegeven. */
  midX: number;
  midY: number;
  /** X-waarde van het anker-punt (rode dot). Plaatst label aan het uiteinde
   *  het verst hiervandaan; weglaten → midden-plaatsing. */
  anchorX?: number;
  /** Raaklijn-eindpunten in data-coords. Alleen gebruikt als `anchorX` ook
   *  meegegeven is. */
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  color?: string;
}

export interface MeasureLinesPluginOptions {
  active: boolean;
  x1: number | null;
  x2: number | null;
  color1?: string;
  color2?: string;
}

export interface XBandPluginOptions {
  active: boolean;
  xMin: number;
  xMax: number;
  /** Default: lichte grijs-tint (rgba 120,120,120,0.06). */
  fill?: string;
  /** Optionele rand-kleur — laat weg voor alleen-fill. */
  border?: string;
}

declare module "chart.js" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    playhead?: PlayheadPluginOptions;
    tangentLabel?: TangentLabelPluginOptions | null;
    measureLines?: MeasureLinesPluginOptions;
    xBand?: XBandPluginOptions;
  }
}

/**
 * Cast helper: leest een plugin-optie zonder Chart.js' `_DeepPartial` wrapping
 * zodat numerieke velden niet onterecht als `undefined` getypeerd worden.
 * Caller-verantwoordelijkheid: zorg dat de optie in de practice ook echt
 * gevuld is (de plugin-implementaties checken op `null` / `undefined` zelf).
 */
export function readPluginOpts<T>(value: unknown): T | undefined {
  return value as T | undefined;
}
