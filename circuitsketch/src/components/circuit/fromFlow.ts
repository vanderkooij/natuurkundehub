/**
 * Een schakeling uit CircuitFlow omzetten naar een CircuitSketch-tekening.
 *
 * CircuitFlow stuurt zijn knopengraaf mee (al ÷2 geschaald, met onze typenamen
 * en waarde-teksten; zie circuitflow/src/lib/toSketch.ts). Daarvan maken we:
 * - componenten op het midden van hun twee aansluitingen, gedraaid naar de
 *   dichtstbijzijnde stand (0/90/180/270);
 * - draden tussen "belangrijke" knopen (aansluitingen en aftakkingen), met de
 *   knikpunten ertussen. Een aftakking wordt een knikpunt van één draad waar de
 *   andere draden aan vastzitten, zoals je dat in CircuitSketch zelf tekent;
 * - alleen rechte stukken: een schuin stuk krijgt een hoek; draden waarvan de
 *   aansluiting verschoof, legt de routeplanner opnieuw (zie CircuitEditor).
 * Een schakeling die uit CircuitSketch kwam en in CircuitFlow niet verschoven is,
 * komt er zo precies hetzelfde uit.
 */
import type { CircuitComponent, CircuitState, ComponentType, Point, Wire, WireAttachment } from './types';
import { getTerminal } from './renderer';

export interface FlowExport {
  app: 'circuitflow';
  kind: 'sketch-export';
  version: 1;
  vertices: Record<string, { x: number; y: number }>;
  components: { type: string; t0: string; t1: string; t2?: string; closed?: boolean; value?: string }[];
  wires: string[][];
  labels: { x: number; y: number; text: string }[];
}

const KNOWN = new Set(['voltage', 'resistor', 'varresistor', 'potentiometer', 'lamp', 'led', 'diode', 'fuse', 'ldr', 'ntc', 'switch', 'voltmeter', 'ammeter']);

export function isFlowExport(x: unknown): x is FlowExport {
  const o = x as FlowExport | null;
  return !!o && o.app === 'circuitflow' && o.kind === 'sketch-export' && !!o.vertices && Array.isArray(o.components) && Array.isArray(o.wires);
}

const r10 = (v: number) => Math.round(v / 10) * 10;
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

/** Maakt van een lijst punten alleen rechte stukken (hoek bij een schuin stuk). */
function orthogonal(pts: Point[]): Point[] {
  const out: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = out[out.length - 1];
    const b = pts[i];
    if (a.x !== b.x && a.y !== b.y) out.push({ x: b.x, y: a.y });
    out.push(b);
  }
  // dubbele en rechtdoorlopende punten weg
  const clean: Point[] = [];
  for (const p of out) {
    if (clean.length && same(clean[clean.length - 1], p)) continue;
    if (clean.length >= 2) {
      const a = clean[clean.length - 2];
      const b = clean[clean.length - 1];
      if ((a.x === b.x && b.x === p.x) || (a.y === b.y && b.y === p.y)) clean.pop();
    }
    clean.push(p);
  }
  return clean;
}

export function flowToState(f: FlowExport): CircuitState {
  const V = (id: string): Point => {
    const v = f.vertices[id];
    return { x: r10(v?.x ?? 0), y: r10(v?.y ?? 0) };
  };

  // Componenten
  const components: CircuitComponent[] = [];
  const termAt = new Map<string, { componentId: string; terminal: number }[]>(); // vertex → aansluitingen
  f.components.forEach((fc, i) => {
    if (!KNOWN.has(fc.type) || !f.vertices[fc.t0] || !f.vertices[fc.t1]) return;
    let t0 = fc.t0;
    let t1 = fc.t1;
    const rotOf = (p: Point, q: Point): 0 | 90 | 180 | 270 => {
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : 180) : (dy >= 0 ? 90 : 270);
    };
    let rotation = rotOf(V(t0), V(t1));
    // Potmeter: de loper zit in CircuitSketch altijd aan de "bovenkant" (lokaal −y).
    // Ligt hij in CircuitFlow aan de andere kant, dan de uiteinden omdraaien.
    if (fc.t2 && f.vertices[fc.t2]) {
      const mid = { x: (V(t0).x + V(t1).x) / 2, y: (V(t0).y + V(t1).y) / 2 };
      const w = V(fc.t2);
      const rad = (rotation * Math.PI) / 180;
      const up = { x: Math.round(Math.sin(rad)), y: -Math.round(Math.cos(rad)) };
      if (up.x * (w.x - mid.x) + up.y * (w.y - mid.y) < 0) {
        [t0, t1] = [t1, t0];
        rotation = rotOf(V(t0), V(t1));
      }
    }
    const a = V(t0);
    const b = V(t1);
    const c: CircuitComponent = {
      id: `fl_${i}`,
      type: fc.type as ComponentType,
      x: r10((a.x + b.x) / 2),
      y: r10((a.y + b.y) / 2),
      rotation,
      ...(fc.type === 'switch' ? { closed: fc.closed ?? false } : {}),
      ...(fc.value ? { value: fc.value } : {}),
    };
    components.push(c);
    const terms: [string, number][] = [[t0, 0], [t1, 1]];
    if (fc.t2 && f.vertices[fc.t2]) terms.push([fc.t2, 2]);
    for (const [vid, t] of terms) {
      const list = termAt.get(vid) ?? [];
      list.push({ componentId: c.id, terminal: t });
      termAt.set(vid, list);
    }
  });
  const compById = new Map(components.map(c => [c.id, c]));
  const termPos = (t: { componentId: string; terminal: number }): Point => {
    const p = getTerminal(compById.get(t.componentId)!, t.terminal);
    return { x: Math.round(p.x), y: Math.round(p.y) };
  };

  // Hoe vaak komt elke knoop voor (draaduiteinde = 1, knikpunt = 2, aansluiting = 1)?
  const degree = new Map<string, number>();
  const bump = (id: string, n: number) => degree.set(id, (degree.get(id) ?? 0) + n);
  for (const w of f.wires) w.forEach((id, i) => bump(id, i === 0 || i === w.length - 1 ? 1 : 2));
  for (const [vid, list] of termAt) bump(vid, list.length);

  // Draden opknippen bij aansluitingen en aftakkingen.
  let pieces: string[][] = [];
  for (const w of f.wires) {
    let cur: string[] = [];
    w.forEach((id, i) => {
      if (cur[cur.length - 1] !== id) cur.push(id);
      const interior = i > 0 && i < w.length - 1;
      if (interior && (termAt.has(id) || (degree.get(id) ?? 0) >= 3)) {
        if (cur.length >= 2) pieces.push(cur);
        cur = [id];
      }
    });
    if (cur.length >= 2) pieces.push(cur);
  }

  // Losse knopen (geen aansluiting) waar twee stukken eindigen: aan elkaar.
  // Bij een aftakking worden twee stukken één draad; de rest takt daarop af.
  const isInterior = (id: string) => pieces.some(p => p.indexOf(id) > 0 && p.indexOf(id) < p.length - 1);
  for (let guard = 0; guard < 10000; guard++) {
    let done = true;
    for (const vid of new Set(pieces.flatMap(p => [p[0], p[p.length - 1]]))) {
      if (termAt.has(vid) || isInterior(vid)) continue;
      const ends = pieces.filter(p => p[0] === vid || p[p.length - 1] === vid);
      if (ends.length < 2 || ends[0] === ends[1]) continue;
      const [a, b] = ends;
      const aa = a[a.length - 1] === vid ? a : [...a].reverse();
      const bb = b[0] === vid ? b : [...b].reverse();
      pieces = pieces.filter(p => p !== a && p !== b);
      pieces.push([...aa, ...bb.slice(1)]);
      done = false;
      break;
    }
    if (done) break;
  }

  // Draden met aansluitingen
  const ids = pieces.map((_, i) => `flw_${i}`);
  const attachFor = (vid: string, self: number): WireAttachment | undefined => {
    const t = termAt.get(vid);
    if (t) return { kind: 'component', ...t[0] };
    for (let j = 0; j < pieces.length; j++) {
      if (j === self) continue;
      const k = pieces[j].indexOf(vid);
      if (k > 0 && k < pieces[j].length - 1) return { kind: 'wire', wireId: ids[j], nodeIndex: k };
    }
    return undefined;
  };
  // Draaduiteinden blijven waar ze in CircuitFlow lagen. Ligt de aansluiting nu
  // ergens anders (een component dat in CircuitFlow uitgerekt of scheef stond),
  // dan legt CircuitSketch die draad bij het openen opnieuw (syncWires), met
  // dezelfde routeplanner als bij slepen.
  const wires: Wire[] = pieces.map((p, i) => {
    const pts = p.map(V);
    return { id: ids[i], nodes: pts, startAttach: attachFor(p[0], i), endAttach: attachFor(p[p.length - 1], i) };
  });

  // Rechte stukken. Een knikpunt waar een andere draad aan vastzit, moet blijven
  // staan; daarom de stukken tussen zulke punten los rechttrekken.
  const pinned = new Map<string, Set<number>>();
  for (const w of wires) for (const a of [w.startAttach, w.endAttach]) {
    if (a?.kind === 'wire') {
      const set = pinned.get(a.wireId) ?? new Set<number>();
      set.add(a.nodeIndex);
      pinned.set(a.wireId, set);
    }
  }
  const remap = new Map<string, Map<number, number>>();
  for (const w of wires) {
    const keep = [...(pinned.get(w.id) ?? [])].sort((x, y) => x - y);
    const cuts = [0, ...keep, w.nodes.length - 1];
    const nodes: Point[] = [];
    const idx = new Map<number, number>();
    for (let k = 0; k < cuts.length - 1; k++) {
      const part = orthogonal(w.nodes.slice(cuts[k], cuts[k + 1] + 1));
      if (nodes.length) part.shift();
      nodes.push(...part);
      idx.set(cuts[k + 1], nodes.length - 1);
    }
    w.nodes = nodes.length >= 2 ? nodes : w.nodes;
    remap.set(w.id, idx);
  }
  for (const w of wires) for (const side of ['startAttach', 'endAttach'] as const) {
    const a = w[side];
    if (a?.kind === 'wire') {
      const ni = remap.get(a.wireId)?.get(a.nodeIndex);
      if (ni !== undefined) w[side] = { ...a, nodeIndex: ni };
    }
  }

  // Twee componenten die direct aan elkaar zaten (zonder draad): korte draad ertussen.
  for (const [, list] of termAt) {
    for (let k = 1; k < list.length; k++) {
      const a = termPos(list[0]);
      const b = termPos(list[k]);
      if (same(a, b)) continue;
      wires.push({
        id: `flw_d${wires.length}`,
        nodes: orthogonal([a, b]),
        startAttach: { kind: 'component', ...list[0] },
        endAttach: { kind: 'component', ...list[k] },
      });
    }
  }

  const labels = (f.labels ?? []).map((l, i) => ({ id: `fll_${i}`, x: r10(l.x), y: r10(l.y), text: l.text }));

  // Linksboven in beeld, met hele rasterhokken verschuiven.
  const xs = [...components.map(c => c.x), ...wires.flatMap(w => w.nodes.map(n => n.x)), ...labels.map(l => l.x)];
  const ys = [...components.map(c => c.y), ...wires.flatMap(w => w.nodes.map(n => n.y)), ...labels.map(l => l.y)];
  if (xs.length) {
    const dx = 120 - Math.floor(Math.min(...xs) / 20) * 20;
    const dy = 160 - Math.floor(Math.min(...ys) / 20) * 20;
    for (const c of components) { c.x += dx; c.y += dy; }
    for (const w of wires) w.nodes = w.nodes.map(n => ({ x: n.x + dx, y: n.y + dy }));
    for (const l of labels) { l.x += dx; l.y += dy; }
  }

  return { components, wires, labels, connectedCrossings: [] };
}
