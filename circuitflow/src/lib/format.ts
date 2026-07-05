/**
 * NL-notatie: decimaalkomma, zinnig afgerond. Gebruikt voor alle uitlezingen.
 */
const formatters = new Map<number, Intl.NumberFormat>();
function nf(decimals: number): Intl.NumberFormat {
  let f = formatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat("nl-NL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
    formatters.set(decimals, f);
  }
  return f;
}

export function nlNum(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return value > 0 ? "∞" : "—";
  return nf(decimals).format(value);
}

/** Format op een vast aantal significante cijfers (met decimaalkomma). */
function sig(value: number, figs = 3): string {
  if (value === 0) return "0";
  const a = Math.abs(value);
  const decimals = Math.min(4, Math.max(0, figs - 1 - Math.floor(Math.log10(a))));
  return nf(decimals).format(value);
}

/**
 * Stroom met automatische eenheidsprefix en vaste significante cijfers, zodat
 * ook kleine veranderingen zichtbaar zijn (6/1000 → 6,00 mA, 6/990 → 6,06 mA).
 * Typische schoolwaarden (≥ 0,1 A) blijven in A staan; daaronder mA/µA.
 */
export function formatCurrent(i: number): string {
  if (!Number.isFinite(i)) return i > 0 ? "∞ A" : "— A";
  const a = Math.abs(i);
  if (a < 1e-10) return "0 A";
  if (a >= 0.1) return `${sig(i)} A`;
  if (a >= 1e-4) return `${sig(i * 1e3)} mA`;
  return `${sig(i * 1e6)} µA`;
}

/** Weerstand: Ω, of kΩ vanaf 1000. */
export function formatOhm(r: number): string {
  if (r >= 1000) return `${nlNum(r / 1000, r % 1000 === 0 ? 0 : 2)} kΩ`;
  return `${nlNum(r, Number.isInteger(r) ? 0 : 1)} Ω`;
}

/** Spanning (ingestelde EMK). */
export function formatVolts(v: number): string {
  return `${nlNum(v, Number.isInteger(v) ? 0 : 1)} V`;
}

/** Vermogen met automatische prefix (W/mW/µW). */
export function formatPower(p: number): string {
  if (!Number.isFinite(p)) return p > 0 ? "∞ W" : "— W";
  const a = Math.abs(p);
  if (a < 1e-9) return "0 W";
  if (a >= 0.1) return `${sig(p)} W`;
  if (a >= 1e-4) return `${sig(p * 1e3)} mW`;
  return `${sig(p * 1e6)} µW`;
}

/** Spanning-meting met teken en automatische prefix (V/mV/µV). */
export function formatVoltage(v: number): string {
  if (!Number.isFinite(v)) return v > 0 ? "∞ V" : "— V";
  const a = Math.abs(v);
  if (a < 1e-9) return "0 V";
  if (a >= 1) return `${sig(v)} V`;
  if (a >= 1e-3) return `${sig(v * 1e3)} mV`;
  return `${sig(v * 1e6)} µV`;
}
