/**
 * Format a number with N significant figures and Dutch comma decimal.
 * Returns "—" for non-finite values, "0" for zero.
 */
export function formatSigFigs(n: number, figs = 3): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const exp = Math.floor(Math.log10(abs));
  const decimals = Math.max(0, figs - 1 - exp);
  // For very large numbers, prefer exponential to avoid huge strings
  if (exp >= figs + 3) return (sign + abs.toExponential(figs - 1)).replace(".", ",");
  return (sign + abs.toFixed(decimals)).replace(".", ",");
}

/** Format with a fixed number of decimals, using Dutch comma. */
export function formatDecimal(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(decimals).replace(".", ",");
}

/**
 * Aantal decimalen voor positie-/afgeleide-waarden per lengte-eenheid, in
 * tabel, CSV en meet-infobalk (één plek zodat ze consistent blijven). Bij "m"
 * 3 decimalen: 2 zou 1 cm-resolutie zijn — grover dan de klik-precisie.
 */
export function decimalsForUnit(unit: "m" | "cm" | "mm"): number {
  return unit === "m" ? 3 : unit === "cm" ? 2 : 1;
}

/** Aantal decimalen voor t-waarden: 3 — bij 60/120 fps zijn de tijdstappen
 *  (0,017 / 0,008 s) anders niet meer te onderscheiden. */
export const TIME_DECIMALS = 3;

/**
 * Parse a number from a Dutch-friendly string. Accepts both "1,20" and "1.20",
 * trims whitespace. Returns NaN if not parseable.
 */
export function parseDutchNumber(raw: string): number {
  if (typeof raw !== "string") return NaN;
  const cleaned = raw.trim().replace(/\s+/g, "").replace(",", ".");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}
