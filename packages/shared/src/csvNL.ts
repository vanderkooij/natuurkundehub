/**
 * @reusable
 * @category data
 * @description Excel-NL-vriendelijke CSV-generatie. Output gebruikt `;` als
 *   kolomscheiding en `,` als decimaalteken — de combinatie waar Excel-NL
 *   uit de doos mee opent. Numerieke waarden worden door `formatCsvNL`
 *   geconverteerd naar string met komma-decimaal; tekst-velden worden
 *   ge-escaped voor `;`, `"` en regelterugloop volgens RFC-4180-conventies.
 *
 *   Output begint met de UTF-8 BOM zodat Excel speciale tekens (ë, ö, ²,
 *   etc.) correct interpreteert.
 */

const UTF8_BOM = "﻿";

/**
 * Excel-NL-compatibele cel-waarde uit een willekeurige primitive. Numerieke
 * waarden krijgen komma-decimaal; strings die `;`, `"` of een nieuwe regel
 * bevatten worden gequoteerd en interne `"` verdubbeld.
 *
 *  - `null` / `undefined` → leeg veld
 *  - `number` → `toFixed` met opgegeven decimaal-aantal (`,` als scheiding)
 *  - `boolean` → "ja" / "nee" (Excel-NL-vriendelijker dan TRUE/FALSE)
 *  - `string` → desnoods gequoteerd
 */
export function formatCsvCell(
  value: string | number | boolean | null | undefined,
  decimals?: number,
): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "ja" : "nee";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    const fixed = decimals !== undefined ? value.toFixed(decimals) : String(value);
    return fixed.replace(".", ",");
  }
  // String: quote als 'r een separator, quote of newline in zit.
  const needsQuote = /[;"\n\r]/.test(value);
  if (!needsQuote) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Bouw een complete CSV-string uit rijen van pre-geformatteerde cellen.
 * Eerste rij is meestal de header.
 *
 * Toevoeging van de BOM is opt-in via `withBom`; default `true` voor
 * Excel-vriendelijkheid. Voor server-side CSVs die je in een tekstpijp
 * verwerkt is `false` gepaster.
 */
export function buildCsvNL(rows: string[][], options?: { withBom?: boolean }): string {
  const withBom = options?.withBom !== false;
  const body = rows.map((row) => row.join(";")).join("\r\n");
  return (withBom ? UTF8_BOM : "") + body + "\r\n";
}

/**
 * Schiet een Blob als download de browser uit. Belt zelf
 * `URL.createObjectURL` + `URL.revokeObjectURL` af.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Geef de browser even tijd om de download te starten voor we de URL
  // intrekken (Safari is hier soms lastig over).
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
