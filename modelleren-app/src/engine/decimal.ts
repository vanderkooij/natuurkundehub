/**
 * Zet komma-decimalen (cijfer,cijfer) om naar punt-decimalen. Gericht op
 * cijfer-komma-cijfer zodat meerargument-functies als min(a,b) intact blijven.
 *
 * Geport uit de vanilla Modelleer-tool (modelleren/index.html).
 */
export function toDecimalPoint(s: string): string {
  return String(s).replace(/(\d),(\d)/g, "$1.$2");
}
