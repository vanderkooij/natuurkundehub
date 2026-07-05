import type { CircuitComponent, CircuitDoc } from "./types";

export const SNAP_RADIUS = 22;

export interface Pt {
  x: number;
  y: number;
}

export function resolveVertex(doc: CircuitDoc, id: string): Pt | null {
  const v = doc.vertices[id];
  return v ? { x: v.x, y: v.y } : null;
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export interface CompGeom {
  c0: Pt;
  c1: Pt;
  center: Pt;
  angleDeg: number;
  /** Eenheidsvector langs de as (van terminal 0 → 1). */
  ux: number;
  uy: number;
  len: number;
}

/** Positie/oriëntatie van een component, afgeleid uit zijn twee terminal-vertices. */
export function componentGeom(doc: CircuitDoc, comp: CircuitComponent): CompGeom | null {
  const c0 = resolveVertex(doc, comp.v0);
  const c1 = resolveVertex(doc, comp.v1);
  if (!c0 || !c1) return null;
  const dx = c1.x - c0.x;
  const dy = c1.y - c0.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    c0,
    c1,
    center: { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 },
    angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
    ux: dx / len,
    uy: dy / len,
    len,
  };
}

/** Dichtstbijzijnde vertex binnen SNAP_RADIUS (met uitsluitingen). */
export function nearestSnap(
  doc: CircuitDoc,
  pos: Pt,
  exclude: Set<string>,
): { id: string; pos: Pt } | null {
  let best: { id: string; pos: Pt } | null = null;
  let bestD = SNAP_RADIUS;
  for (const v of Object.values(doc.vertices)) {
    if (exclude.has(v.id)) continue;
    const d = dist(pos, { x: v.x, y: v.y });
    if (d <= bestD) {
      bestD = d;
      best = { id: v.id, pos: { x: v.x, y: v.y } };
    }
  }
  return best;
}

/** Aantal branch-einden/segmenten dat op een vertex samenkomt (≥3 = vertakking → stip). */
export function incidentCount(doc: CircuitDoc, vid: string): number {
  let n = 0;
  for (const c of doc.components) {
    if (c.ports) {
      // Analoge meter: tel élke poort (v0/v1 zijn hier ports[0]/[1] → niet dubbel).
      for (const p of c.ports) if (p === vid) n++;
    } else {
      if (c.v0 === vid) n++;
      if (c.v1 === vid) n++;
    }
  }
  for (const w of doc.wires) {
    for (let i = 0; i < w.nodes.length - 1; i++) {
      if (w.nodes[i] === vid) n++;
      if (w.nodes[i + 1] === vid) n++;
    }
  }
  return n;
}

export function isComponentTerminal(doc: CircuitDoc, vid: string): boolean {
  return doc.components.some((c) => c.v0 === vid || c.v1 === vid);
}
