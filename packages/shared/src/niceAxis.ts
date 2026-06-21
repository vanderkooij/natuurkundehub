/**
 * @reusable
 * @category data
 * @description Snap een as-bereik [lo, hi] naar nette ronde stappen
 *   (multiples van 1·10ⁿ, 2·10ⁿ, 5·10ⁿ). Optioneel: pin de minimum-grens
 *   (handig voor t-as die altijd op 0 begint) en padding aan de bovenkant
 *   (~7%) zodat punten niet tegen de top-rand plakken.
 *
 *   Geport uit modelleren (vanille JS) zodat alle NH-data-tools dezelfde
 *   "schone" assen krijgen.
 */
export interface NiceAxis {
  min: number;
  max: number;
}

export interface NiceAxisOptions {
  /** Forceer `min` op `lo` (i.p.v. afronden naar beneden). Default false. */
  pinMin?: boolean;
  /** Voeg ~7% padding toe boven `hi` als de range niet-negatief is. Default false. */
  padTop?: boolean;
}

export function niceAxis(lo: number, hi: number, options: NiceAxisOptions = {}): NiceAxis {
  const { pinMin = false, padTop = false } = options;

  // Defensief: ongeldige inputs → triviale ±1 range rond een centrum.
  let l = lo;
  let h = hi;
  if (!Number.isFinite(l) || !Number.isFinite(h) || l === h) {
    const center = Number.isFinite(l) ? l : 0;
    l = center - 1;
    h = center + 1;
  }

  const range = h - l;
  // Doel: ~12 stappen — fijner dan default-Chart.js, beter voor top-padding.
  const roughStep = range / 12;
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const candidates = [1, 2, 5, 10];
  let step = mag * 10;
  for (const s of candidates) {
    const v = mag * s;
    if (v >= roughStep && v < step) step = v;
  }

  let nMin = pinMin ? l : Math.floor(l / step) * step;
  if (!pinMin && nMin < 0 && l > -step) {
    // Nipt onder 0: snap naar 0 (voorkomt visueel ruis bij positief-dominante data).
    nMin = 0;
  }
  const hiPad = padTop && nMin >= 0 ? h + range * 0.07 : h;
  let nMax = Math.ceil(hiPad / step) * step;
  if (nMin === nMax) nMax += step;

  return { min: nMin, max: nMax };
}
