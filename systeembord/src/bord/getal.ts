/**
 * Leest een getal zoals een leerling het typt: met komma of punt, met of
 * zonder eenheid, met het echte minteken of een gewoon koppelteken. Geeft null
 * als het geen getal is.
 */
export function leesGetal(tekst: string): number | null {
  const schoon = tekst
    .trim()
    .replace(/[−‒–—]/g, "-") // minteken en streepjes
    .replace(/\s+/g, "")
    .replace(/(v|hz|volt|hertz)$/i, "")
    .replace(",", ".");
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(schoon)) return null;
  const n = Number(schoon);
  return Number.isFinite(n) ? n : null;
}
