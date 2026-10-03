/**
 * Waarden lezen uit (en schrijven naar) de vrije tekst die in CircuitSketch bij
 * een onderdeel staat, zoals "100 Ω", "R1 = 4,7 kΩ" of "R2 = ? [30 Ω]".
 *
 * - Het eerste getal met de passende eenheid telt; staat er iets tussen [ ]
 *   (een verborgen antwoord), dan gaat dat voor.
 * - Voorvoegsels: k, M, m, µ (ook u). Een komma mag in plaats van een punt.
 * - Zonder eenheid telt alleen een tekst die uit precies één getal bestaat.
 */
import { LED_COLORS } from "@/model/ledSpec";

export type Unit = "Ω" | "V" | "A";

export interface Found {
  value: number;
  /** Plek van het gevonden stuk in de tekst (om het later te vervangen). */
  start: number;
  end: number;
}

const PREFIX: Record<string, number> = { k: 1e3, M: 1e6, m: 1e-3, "µ": 1e-6, "μ": 1e-6, u: 1e-6 };
const UNIT_RE: Record<Unit, string> = {
  "Ω": "(?:Ω|[Oo]hms?)",
  V: "(?:V|[Vv]olts?)",
  A: "(?:A|[Aa]mp[eè]re)",
};
const NUM = "(\\d+(?:[.,]\\d+)?)";

function search(text: string, unit: Unit, offset: number): Found | null {
  const re = new RegExp(`${NUM}\\s*([kMmµμu]?)\\s*${UNIT_RE[unit]}(?![A-Za-z])`, "g");
  const m = re.exec(text);
  if (m) {
    const value = Number(m[1].replace(",", ".")) * (m[2] ? PREFIX[m[2]] : 1);
    return { value, start: offset + m.index, end: offset + m.index + m[0].length };
  }
  const bare = new RegExp(`^\\s*${NUM}\\s*([kM]?)\\s*$`).exec(text);
  if (bare) {
    const start = offset + text.indexOf(bare[1]);
    return {
      value: Number(bare[1].replace(",", ".")) * (bare[2] ? PREFIX[bare[2]] : 1),
      start,
      end: start + bare[1].length + (bare[2] ? bare[2].length : 0),
    };
  }
  return null;
}

/** Zoekt een grootheid met deze eenheid in de tekst. */
export function findQuantity(text: string | undefined, unit: Unit): Found | null {
  if (!text) return null;
  const br = /\[([^\]]*)\]/.exec(text);
  if (br) {
    const inner = search(br[1], unit, br.index + 1);
    if (inner) return inner;
  }
  return search(text.replace(/\[[^\]]*\]/g, (s) => " ".repeat(s.length)), unit, 0);
}

const COLOR_WORDS: Record<string, string> = {
  rood: "rood", red: "rood",
  geel: "geel", yellow: "geel",
  groen: "groen", green: "groen",
  blauw: "blauw", blue: "blauw",
  wit: "wit", white: "wit",
};

/** LED-kleur ("rood", ...) uit de tekst, of null. */
export function findLedColor(text: string | undefined): { key: string; start: number; end: number } | null {
  if (!text) return null;
  const m = /\b(rood|red|geel|yellow|groen|green|blauw|blue|wit|white)\b/i.exec(text);
  if (!m) return null;
  const key = COLOR_WORDS[m[1].toLowerCase()];
  return LED_COLORS.some((c) => c.key === key) ? { key, start: m.index, end: m.index + m[0].length } : null;
}

/** Waarde netjes als tekst, zoals een leerling hem zou schrijven: "4,7 kΩ", "6 V", "0,5 A". */
export function formatQuantity(value: number, unit: Unit): string {
  let v = value;
  let p = "";
  if (unit === "Ω" && v >= 1000) {
    v /= 1000;
    p = "k";
  } else if (unit === "A" && v < 1 && v > 0) {
    v *= 1000;
    p = "m";
  }
  const s = Number(v.toPrecision(3)).toLocaleString("nl-NL", { maximumFractionDigits: 3 });
  return `${s} ${p}${unit}`;
}

/** Tekst voor CircuitSketch: de oude tekst met het getal vervangen, of een nieuwe. */
export function replaceQuantity(text: string | undefined, unit: Unit, value: number): string {
  const f = findQuantity(text, unit);
  const fresh = formatQuantity(value, unit);
  if (!text || !text.trim()) return fresh;
  if (!f) return text; // bv. "R2 = ?": zo laten
  if (Math.abs(f.value - value) <= 1e-9 * Math.max(1, Math.abs(value))) return text; // ongewijzigd
  return text.slice(0, f.start) + fresh + text.slice(f.end);
}

/** Een mooie stapgrootte voor de pijltjestoetsen bij een logaritmische waarde. */
export function niceStep(v: number): number {
  return Math.max(1, 10 ** (Math.floor(Math.log10(Math.max(1, v))) - 1));
}
