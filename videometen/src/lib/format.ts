/** Format seconds with comma-decimal (NL locale), default 2 decimals. */
export function formatSeconds(s: number, decimals = 2): string {
  if (!Number.isFinite(s)) return "—";
  return s.toFixed(decimals).replace(".", ",");
}
