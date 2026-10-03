/**
 * Boogjes bij kruisingen: twee draden die elkaar alleen kruisen (geen gedeelde
 * vertex) zijn niet verbonden. Net als in CircuitSketch maakt de meest liggende
 * draad daar een boogje over de andere heen, zodat dat ook te zien is.
 */
import type { Pt } from "./geometry";
import type { CircuitDoc } from "./types";

export const HOP_R = 14;

interface Seg {
  key: string;
  ids: [string, string];
  a: Pt;
  b: Pt;
}

/** Snijpunt strikt binnen beide stukken (dus geen T-aansluiting of aanraking). */
function crossing(s: Seg, t: Seg): Pt | null {
  const rx = s.b.x - s.a.x;
  const ry = s.b.y - s.a.y;
  const qx = t.b.x - t.a.x;
  const qy = t.b.y - t.a.y;
  const den = rx * qy - ry * qx;
  if (Math.abs(den) < 1e-9) return null; // evenwijdig
  const u = ((t.a.x - s.a.x) * qy - (t.a.y - s.a.y) * qx) / den;
  const v = ((t.a.x - s.a.x) * ry - (t.a.y - s.a.y) * rx) / den;
  const lenS = Math.hypot(rx, ry);
  const lenT = Math.hypot(qx, qy);
  // Niet te dicht bij een uiteinde: daar past geen boogje en is het eerder een aanraking.
  const mS = (HOP_R + 2) / lenS;
  const mT = 2 / lenT;
  if (u <= mS || u >= 1 - mS || v <= mT || v >= 1 - mT) return null;
  return { x: s.a.x + rx * u, y: s.a.y + ry * u };
}

/**
 * Per draadstuk ("wireId:index") de punten waar het een boogje maakt, gesorteerd
 * van het begin van het stuk af.
 */
export function wireHops(doc: CircuitDoc): Map<string, Pt[]> {
  const segs: Seg[] = [];
  for (const w of doc.wires) {
    for (let i = 0; i < w.nodes.length - 1; i++) {
      const a = doc.vertices[w.nodes[i]];
      const b = doc.vertices[w.nodes[i + 1]];
      if (!a || !b || (a.x === b.x && a.y === b.y)) continue;
      segs.push({ key: `${w.id}:${i}`, ids: [w.nodes[i], w.nodes[i + 1]], a, b });
    }
  }
  const flatness = (s: Seg) => Math.abs(s.b.y - s.a.y) / Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
  const out = new Map<string, Pt[]>();
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const s = segs[i];
      const t = segs[j];
      if (s.ids.some((id) => t.ids.includes(id))) continue; // delen een knoop
      // Het boogje komt in het meest liggende stuk.
      const [host, other] = flatness(s) <= flatness(t) ? [s, t] : [t, s];
      const p = crossing(host, other);
      if (!p) continue;
      const list = out.get(host.key) ?? [];
      list.push(p);
      out.set(host.key, list);
    }
  }
  for (const [key, list] of out) {
    const s = segs.find((x) => x.key === key)!;
    list.sort((p, q) => Math.hypot(p.x - s.a.x, p.y - s.a.y) - Math.hypot(q.x - s.a.x, q.y - s.a.y));
    // Twee boogjes die elkaar zouden overlappen: alleen de eerste.
    for (let k = list.length - 1; k > 0; k--) {
      if (Math.hypot(list[k].x - list[k - 1].x, list[k].y - list[k - 1].y) < 2 * HOP_R + 2) list.splice(k, 1);
    }
  }
  return out;
}

/** SVG-pad voor een draadstuk van a naar b met boogjes (naar boven) op de gegeven punten. */
export function hopPath(a: Pt, b: Pt, hops: Pt[] | undefined): string {
  if (!hops?.length) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  // Boogje aan de bovenkant: met de klok mee als we naar rechts lopen.
  const sweep = ux > 0 || (ux === 0 && uy < 0) ? 1 : 0;
  let d = `M ${a.x} ${a.y}`;
  for (const p of hops) {
    d += ` L ${p.x - ux * HOP_R} ${p.y - uy * HOP_R}`;
    d += ` A ${HOP_R} ${HOP_R} 0 0 ${sweep} ${p.x + ux * HOP_R} ${p.y + uy * HOP_R}`;
  }
  return `${d} L ${b.x} ${b.y}`;
}
