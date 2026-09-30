/**
 * Voltmeter met meetpennen: een los meetinstrument dat géén deel is van de
 * schakeling. Je tikt met de rode en de zwarte pen een punt aan; de meter leest
 * het potentiaalverschil tussen die twee knopen. Er hoeft niets losgekoppeld te
 * worden, want een ideale voltmeter laat geen stroom door.
 *
 * (Voor stroom is er bewust geen pen: een stroommeter moet ín de kring, en dat
 * wil je leerlingen juist laten ervaren.)
 */
import type { SolveResult } from "@/sim";
import { dist, type Pt } from "./geometry";
import type { CircuitDoc } from "./types";

export interface ProbeState {
  /** Midden van het meterkastje. */
  body: Pt;
  /** Punt van de rode pen (V) en de zwarte pen (COM). */
  red: Pt;
  black: Pt;
}

export interface Contact {
  /** Vertex-id van de aangeraakte knoop. */
  vid: string;
  /** Het punt waar de pen precies op de draad of aansluiting zit. */
  x: number;
  y: number;
}

/** Afstand van p tot het lijnstuk a–b, plus het dichtstbijzijnde punt erop. */
function naarSegment(p: Pt, a: Pt, b: Pt): { d: number; q: Pt } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L2 = dx * dx + dy * dy;
  const t =
    L2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2));
  const q = { x: a.x + t * dx, y: a.y + t * dy };
  return { d: dist(p, q), q };
}

/** Buitenste deel van een component (aansluitdraadje, pool) dat bij een terminal hoort. */
const EIND_DEEL = 0.4;
/** Hoe ver naast de as van een component de pen nog "op" het component zit. */
const COMPONENT_BREEDTE = 26;

/**
 * Wat raakt de pen? Eerst een aansluitpunt (terminal, knikpunt, draadeinde)
 * binnen de straal, dan een stuk draad, en anders het buitenste deel van een
 * component: het aansluitdraadje of een pool van de batterij hoort bij de
 * terminal aan die kant. Het midden van een component telt niet: daar zit
 * geen knoop.
 */
export function probeContact(
  doc: CircuitDoc,
  p: Pt,
  radius: number,
): Contact | null {
  let best: Contact | null = null;
  let bestD = radius;
  for (const v of Object.values(doc.vertices)) {
    const d = dist(p, v);
    if (d <= bestD) {
      bestD = d;
      best = { vid: v.id, x: v.x, y: v.y };
    }
  }
  if (best) return best;
  bestD = radius;
  for (const w of doc.wires) {
    for (let i = 0; i < w.nodes.length - 1; i++) {
      const a = doc.vertices[w.nodes[i]];
      const b = doc.vertices[w.nodes[i + 1]];
      if (!a || !b) continue;
      const { d, q } = naarSegment(p, a, b);
      if (d <= bestD) {
        bestD = d;
        best = { vid: a.id, x: q.x, y: q.y };
      }
    }
  }
  if (best) return best;
  bestD = Math.max(radius, COMPONENT_BREEDTE);
  for (const c of doc.components) {
    if (c.ports) continue; // analoge meter: alleen de poorten zelf (vertices)
    const a = doc.vertices[c.v0];
    const b = doc.vertices[c.v1];
    if (!a || !b) continue;
    const len = dist(a, b);
    if (len < 1) continue;
    const t =
      ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len);
    if (t < 0 || t > 1) continue;
    const q = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    const d = dist(p, q);
    if (d > bestD) continue;
    const vid = t <= EIND_DEEL ? c.v0 : t >= 1 - EIND_DEEL ? c.v1 : null;
    if (!vid) continue;
    bestD = d;
    best = { vid, x: q.x, y: q.y };
  }
  return best;
}

/**
 * Spanning rood − zwart, of null als een van de pennen nergens op zit of op een
 * losse knoop (die heeft geen potentiaal, net als bij de gewone voltmeter).
 */
export function probeVoltage(
  result: SolveResult,
  red: Contact | null,
  black: Contact | null,
): number | null {
  if (!red || !black) return null;
  if (
    !result.nodePotentials.has(red.vid) ||
    !result.nodePotentials.has(black.vid)
  )
    return null;
  return (
    (result.nodePotentials.get(red.vid) ?? 0) -
    (result.nodePotentials.get(black.vid) ?? 0)
  );
}
