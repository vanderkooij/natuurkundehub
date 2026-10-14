/**
 * Welk deel van het werkvlak in beeld is. Een punt p op het werkvlak staat op
 * het scherm op (p − x) · schaal, gemeten vanaf de linkerbovenhoek.
 */
export interface Kijkvenster {
  x: number;
  y: number;
  schaal: number;
}

export interface Rechthoek {
  x: number;
  y: number;
  breedte: number;
  hoogte: number;
}

export const MIN_SCHAAL = 0.2;
export const MAX_SCHAAL = 4;

const begrensSchaal = (s: number) =>
  Math.min(MAX_SCHAAL, Math.max(MIN_SCHAAL, s));

export const naarWerkvlak = (k: Kijkvenster, sx: number, sy: number) => ({
  x: k.x + sx / k.schaal,
  y: k.y + sy / k.schaal,
});

/** Zoom met factor, zo dat het werkvlakpunt onder schermpunt (sx, sy) blijft staan. */
export function zoomRond(
  k: Kijkvenster,
  factor: number,
  sx: number,
  sy: number,
): Kijkvenster {
  const schaal = begrensSchaal(k.schaal * factor);
  const p = naarWerkvlak(k, sx, sy);
  return { schaal, x: p.x - sx / schaal, y: p.y - sy / schaal };
}

/** Verschuif met een afstand in schermpixels. */
export const schuif = (
  k: Kijkvenster,
  dx: number,
  dy: number,
): Kijkvenster => ({
  ...k,
  x: k.x - dx / k.schaal,
  y: k.y - dy / k.schaal,
});

/** Zet een rechthoek van het werkvlak passend en gecentreerd in beeld, met marge in pixels. */
export function passend(
  r: Rechthoek,
  schermB: number,
  schermH: number,
  marge = 24,
  /** Extra ruimte bovenin voor knoppen die over het werkvlak liggen, in pixels. */
  boven = 0,
): Kijkvenster {
  const schaal = begrensSchaal(
    Math.min(
      (schermB - 2 * marge) / r.breedte,
      (schermH - 2 * marge - boven) / r.hoogte,
    ),
  );
  return {
    schaal,
    x: r.x + r.breedte / 2 - schermB / 2 / schaal,
    y: r.y + r.hoogte / 2 - (schermH + boven) / 2 / schaal,
  };
}
