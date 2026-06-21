import type { SvRow } from "./engine";

/**
 * Niet-blokkerende eenheden-waarschuwingen voor de startwaarden (port van
 * `checkUnits` uit de vanilla tool). UI-laag, geen onderdeel van de engine.
 */
export function unitWarnings(rows: SvRow[]): string[] {
  const warnings: string[] = [];
  const t = rows.find((r) => r.name === "t");
  const dt = rows.find((r) => r.name === "dt");
  if (t && dt && t.unit && dt.unit && t.unit !== dt.unit) {
    warnings.push('⚠ Let op: t heeft eenheid "' + t.unit + '" maar dt heeft eenheid "' + dt.unit + '"');
  }
  const missing = rows.filter((r) => r.name && !r.unit && r.name !== "dt");
  if (missing.length) {
    warnings.push(
      "Tip: voeg eenheden toe aan " +
        missing.map((r) => r.name).join(", ") +
        " voor duidelijkere grafieklabels",
    );
  }
  return warnings;
}

/** True als de waarde een 'kaal' getal is (geen formule/expressie). */
export function isPlainNumber(value: string): boolean {
  return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(value.trim());
}
