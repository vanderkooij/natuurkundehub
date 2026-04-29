import { useRef, useState, useReducer, useCallback, useEffect } from 'react';
import type { CircuitState, Tool, Point, CircuitComponent, Wire, TextLabel, WireAttachment, ComponentType, LRouteOrientation } from './types';
import { GRID, snap, snapPoint, uid, orthogonalRoute, inferOrientation } from './types';
import {
  clearCanvas, drawComponent, drawWire, drawLabel, drawPreviewWire, drawSnapHint,
  drawAlignmentGuides, drawDistanceLabels, drawWireCrossings, findWireCrossings,
  hitTestComponent, hitTestWire, hitTestWireNode, hitTestLabel,
  getTerminal, getTerminalCount, findSnapTarget,
} from './renderer';
import { Toolbar } from './Toolbar';
import { HelpPanel } from './HelpPanel';
import { MobileToolbar } from './MobileToolbar';
import { t as tr, type Lang } from './i18n';
import { downloadJSON, loadFromJSON, exportPNG } from './io';
import { exportSVG } from './svgExport';

const EMPTY: CircuitState = { components: [], wires: [], labels: [], connectedCrossings: [] };

const SNAP_TOL = 12;
const ALIGN_TOL = 6;
const DISTRIBUTE_TOL = 8;
const TOOLBAR_H = 52;

const COMPONENT_TYPES = new Set<Tool>([
  'voltage', 'voltage_ac', 'resistor', 'led', 'motor', 'lamp',
  'ammeter', 'voltmeter', 'capacitor', 'inductor', 'switch', 'diode', 'ground',
  'potentiometer', 'fuse', 'transformer', 'transistor',
  'ntc', 'ptc', 'ldr', 'pushbutton', 'buzzer', 'relay',
]);

export interface AlignGuide { x?: number; y?: number }

export interface DistanceLabel {
  a: Point;
  b: Point;
  axis: 'x' | 'y';
  px: number;
}

// Snap a dragged position to align with other components' x/y axes,
// AND to equal-spacing positions when 2+ others share an axis.
function alignToOthers(
  pos: Point,
  others: CircuitComponent[],
): { pos: Point; guides: AlignGuide[]; distances: DistanceLabel[] } {
  let bestDx: { d: number; x: number } | null = null;
  let bestDy: { d: number; y: number } | null = null;
  for (const c of others) {
    const dx = Math.abs(c.x - pos.x);
    if (dx <= ALIGN_TOL && (!bestDx || dx < bestDx.d)) bestDx = { d: dx, x: c.x };
    const dy = Math.abs(c.y - pos.y);
    if (dy <= ALIGN_TOL && (!bestDy || dy < bestDy.d)) bestDy = { d: dy, y: c.y };
  }
  const out = { ...pos };
  const guides: AlignGuide[] = [];
  if (bestDx) { out.x = bestDx.x; guides.push({ x: bestDx.x }); }
  if (bestDy) { out.y = bestDy.y; guides.push({ y: bestDy.y }); }

  // Equal-spacing snap on Y when ≥2 others share X (vertical column)
  const sharedX = others.filter(c => c.x === out.x);
  if (sharedX.length >= 2) {
    const sorted = [...sharedX].sort((a, b) => a.y - b.y);
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].y - sorted[i].y;
      for (const cy of [sorted[i].y - gap, (sorted[i].y + sorted[i + 1].y) / 2, sorted[i + 1].y + gap]) {
        if (Math.abs(out.y - cy) <= DISTRIBUTE_TOL) { out.y = cy; break; }
      }
    }
  }
  const sharedY = others.filter(c => c.y === out.y);
  if (sharedY.length >= 2) {
    const sorted = [...sharedY].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].x - sorted[i].x;
      for (const cx of [sorted[i].x - gap, (sorted[i].x + sorted[i + 1].x) / 2, sorted[i + 1].x + gap]) {
        if (Math.abs(out.x - cx) <= DISTRIBUTE_TOL) { out.x = cx; break; }
      }
    }
  }

  // Distance labels for live preview when ≥1 other shares an axis with the
  // (snapped) position. Show all consecutive gaps in the column / row.
  const distances: DistanceLabel[] = [];
  const colX = others.filter(c => c.x === out.x);
  if (colX.length >= 1) {
    const all = [...colX.map(c => ({ x: c.x, y: c.y })), { x: out.x, y: out.y }]
      .sort((a, b) => a.y - b.y);
    for (let i = 0; i < all.length - 1; i++) {
      distances.push({ a: all[i], b: all[i + 1], axis: 'y', px: all[i + 1].y - all[i].y });
    }
  }
  const rowY = others.filter(c => c.y === out.y);
  if (rowY.length >= 1) {
    const all = [...rowY.map(c => ({ x: c.x, y: c.y })), { x: out.x, y: out.y }]
      .sort((a, b) => a.x - b.x);
    for (let i = 0; i < all.length - 1; i++) {
      distances.push({ a: all[i], b: all[i + 1], axis: 'x', px: all[i + 1].x - all[i].x });
    }
  }

  return { pos: out, guides, distances };
}

// Remove redundant nodes from a wire: collapse consecutive collinear nodes
// and drop exact duplicates. Endpoints are preserved.
function cleanupWireNodes(nodes: Point[]): Point[] {
  if (nodes.length <= 2) return nodes;
  const out: Point[] = [nodes[0]];
  for (let i = 1; i < nodes.length - 1; i++) {
    const prev = out[out.length - 1];
    const cur = nodes[i];
    const next = nodes[i + 1];
    if (cur.x === prev.x && cur.y === prev.y) continue;
    if (prev.x === cur.x && cur.x === next.x) continue;
    if (prev.y === cur.y && cur.y === next.y) continue;
    out.push(cur);
  }
  const last = nodes[nodes.length - 1];
  const tail = out[out.length - 1];
  if (last.x !== tail.x || last.y !== tail.y) out.push(last);
  return out;
}

// Approximate body bounding box for a component — the physical part wires must avoid.
// Uses terminal positions shrunk inward so the terminal connection points themselves
// are outside the box (wires may start/end there).
type BBox = { x1: number; y1: number; x2: number; y2: number };

function getCompBodyBBox(comp: CircuitComponent): BBox | null {
  const count = getTerminalCount(comp.type);
  if (count <= 1) return null; // ground etc.: no body to avoid
  const t0 = getTerminal(comp, 0), t1 = getTerminal(comp, 1);
  const dx = Math.abs(t1.x - t0.x), dy = Math.abs(t1.y - t0.y);
  // Body in the main axis is 70% of the half-span; perpendicular thickness = 0.5 GRID
  const PERP = GRID * 0.5;
  if (dx >= dy) {
    return {
      x1: comp.x - dx * 0.35, y1: comp.y - PERP,
      x2: comp.x + dx * 0.35, y2: comp.y + PERP,
    };
  }
  return {
    x1: comp.x - PERP, y1: comp.y - dy * 0.35,
    x2: comp.x + PERP, y2: comp.y + dy * 0.35,
  };
}

function segmentIntersectsBBox(a: Point, b: Point, bbox: BBox): boolean {
  if (a.y === b.y) {
    // Horizontal segment: blocked if y is strictly inside bbox and x ranges overlap
    const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
    return a.y > bbox.y1 && a.y < bbox.y2 && maxX > bbox.x1 && minX < bbox.x2;
  }
  if (a.x === b.x) {
    // Vertical segment
    const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
    return a.x > bbox.x1 && a.x < bbox.x2 && maxY > bbox.y1 && minY < bbox.y2;
  }
  return false;
}

// Route from → to avoiding all component bodies.
// Tries user's orient (spacebar), then the other, then a grid-search detour.
function routeAvoiding(
  from: Point,
  to: Point,
  components: CircuitComponent[],
  orient: LRouteOrientation,
): Point[] {
  if (from.x === to.x && from.y === to.y) return [from, to];
  const bboxes = components.map(c => getCompBodyBBox(c)).filter((b): b is BBox => b !== null);

  const routeOk = (nodes: Point[]) => {
    for (let i = 0; i < nodes.length - 1; i++) {
      for (const bbox of bboxes) {
        if (segmentIntersectsBBox(nodes[i], nodes[i + 1], bbox)) return false;
      }
    }
    return true;
  };

  const r1 = orthogonalRoute(from, to, orient);
  if (routeOk(r1)) return r1;

  const r2 = orthogonalRoute(from, to, orient === 'HV' ? 'VH' : 'HV');
  if (routeOk(r2)) return r2;

  // Search for a detour by trying waypoints offset from the midpoint
  const mid = { x: snap((from.x + to.x) / 2), y: snap((from.y + to.y) / 2) };
  for (let d = 1; d <= 6; d++) {
    for (const [wdx, wdy] of [[0, GRID * d], [0, -GRID * d], [GRID * d, 0], [-GRID * d, 0]] as [number, number][]) {
      const wp = { x: mid.x + wdx, y: mid.y + wdy };
      for (const o of ['HV', 'VH'] as LRouteOrientation[]) {
        const s1 = orthogonalRoute(from, wp, o);
        const s2 = orthogonalRoute(wp, to, o);
        const candidate = cleanupWireNodes([...s1, ...s2.slice(1)]);
        if (routeOk(candidate)) return candidate;
      }
    }
  }
  return r1; // best effort
}

// Snap a newly-placed component so that a terminal aligns with a nearby component terminal.
function snapCompToTerminals(comp: CircuitComponent, others: CircuitComponent[]): CircuitComponent {
  const count = getTerminalCount(comp.type);
  let best: { dist: number; dx: number; dy: number } | null = null;
  for (let t = 0; t < count; t++) {
    const tp = getTerminal(comp, t);
    for (const other of others) {
      const otherCount = getTerminalCount(other.type);
      for (let ot = 0; ot < otherCount; ot++) {
        const otp = getTerminal(other, ot);
        const d = Math.hypot(tp.x - otp.x, tp.y - otp.y);
        if (d > 0 && d <= SNAP_TOL && (!best || d < best.dist))
          best = { dist: d, dx: otp.x - tp.x, dy: otp.y - tp.y };
      }
    }
  }
  return best ? { ...comp, x: comp.x + best.dx, y: comp.y + best.dy } : comp;
}

// Resolve the world-space point an attachment refers to
function resolveAttach(s: CircuitState, a: WireAttachment): Point | null {
  if (a.kind === 'component') {
    const c = s.components.find(c => c.id === a.componentId);
    if (!c) return null;
    return getTerminal(c, a.terminal);
  } else if (a.kind === 'wire') {
    const w = s.wires.find(w => w.id === a.wireId);
    if (!w || a.nodeIndex >= w.nodes.length) return null;
    return w.nodes[a.nodeIndex];
  } else {
    // wire-segment: transient, stored point is the junction position
    return a.point;
  }
}

// Route start → waypoints → end, each segment avoiding component bodies.
function routeThroughWaypoints(
  start: Point,
  end: Point,
  waypoints: Point[],
  components: CircuitComponent[],
  orient: LRouteOrientation,
): Point[] {
  const pts = [start, ...waypoints, end];
  const result: Point[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = routeAvoiding(pts[i], pts[i + 1], components, orient);
    if (result.length === 0) result.push(...seg);
    else result.push(...seg.slice(1));
  }
  return result;
}

// Convert a transient wire-segment attachment into a real wire-node attachment by
// inserting a new node into the parent wire at the segment snap point.
// All existing nodeIndex references to that wire at indices >= insertIdx are shifted.
function materializeAttach(
  wires: Wire[],
  attach: WireAttachment | undefined,
): { wires: Wire[]; attach: WireAttachment | undefined } {
  if (!attach || attach.kind !== 'wire-segment') return { wires, attach };
  const { wireId, segmentIndex, point } = attach;
  const parentIdx = wires.findIndex(w => w.id === wireId);
  if (parentIdx === -1) return { wires, attach: undefined };
  const parent = wires[parentIdx];
  const insertIdx = segmentIndex + 1;
  const newNodes = [
    ...parent.nodes.slice(0, insertIdx),
    { ...point },
    ...parent.nodes.slice(insertIdx),
  ];
  const newWires = wires.map((w, i) => {
    if (i === parentIdx) return { ...parent, nodes: newNodes };
    // Shift nodeIndex references in other wires that point past the insertion
    let u = w;
    if (u.startAttach?.kind === 'wire' && u.startAttach.wireId === wireId && u.startAttach.nodeIndex >= insertIdx)
      u = { ...u, startAttach: { ...u.startAttach, nodeIndex: u.startAttach.nodeIndex + 1 } };
    if (u.endAttach?.kind === 'wire' && u.endAttach.wireId === wireId && u.endAttach.nodeIndex >= insertIdx)
      u = { ...u, endAttach: { ...u.endAttach, nodeIndex: u.endAttach.nodeIndex + 1 } };
    return u;
  });
  return { wires: newWires, attach: { kind: 'wire', wireId, nodeIndex: insertIdx } };
}

// Reconcile wire endpoints and propagate junction positions.
// Iterates to a fixed point so wire→wire chains propagate (up to 4 passes).
// Junction nodes (intermediate nodes that other wires attach to) are treated as
// mandatory waypoints so T-branches move correctly when components are dragged.
function syncWires(s: CircuitState): CircuitState {
  let cur = s;
  for (let iter = 0; iter < 4; iter++) {
    let changed = false;

    // Build junction map: for each wire, which of its intermediate nodes have branches
    const wireJunctions = new Map<string, { oldIdx: number; pos: Point }[]>();
    for (const w of cur.wires) {
      for (const a of [w.startAttach, w.endAttach] as (WireAttachment | undefined)[]) {
        if (a?.kind !== 'wire') continue;
        const parent = cur.wires.find(pw => pw.id === a.wireId);
        if (!parent) continue;
        const idx = a.nodeIndex;
        if (idx <= 0 || idx >= parent.nodes.length - 1) continue; // skip endpoints
        if (!wireJunctions.has(a.wireId)) wireJunctions.set(a.wireId, []);
        const jArr = wireJunctions.get(a.wireId)!;
        if (!jArr.some(j => j.oldIdx === idx))
          jArr.push({ oldIdx: idx, pos: { ...parent.nodes[idx] } });
      }
    }

    // Track how junction indices change after rerouting (wireId → oldIdx → newIdx)
    const junctionNewIdx = new Map<string, Map<number, number>>();

    const wires = cur.wires.map(w => {
      const junctions = (wireJunctions.get(w.id) ?? []).sort((a, b) => a.oldIdx - b.oldIdx);
      const junctionPositions = junctions.map(j => j.pos);

      const startP = w.startAttach ? resolveAttach(cur, w.startAttach) : null;
      const endP   = w.endAttach   ? resolveAttach(cur, w.endAttach)   : null;
      const curStart = w.nodes[0];
      const curEnd   = w.nodes[w.nodes.length - 1];

      const startMoved = startP && (curStart.x !== startP.x || curStart.y !== startP.y);
      const endMoved   = endP   && (curEnd.x   !== endP.x   || curEnd.y   !== endP.y);
      if (!startMoved && !endMoved) return w;

      const newStart = startP ?? curStart;
      const newEnd   = endP   ?? curEnd;
      const orient   = inferOrientation(w.nodes);

      const route = routeThroughWaypoints(newStart, newEnd, junctionPositions, cur.components, orient);

      // Record new nodeIndex for each junction so dependent wires can be updated
      if (junctions.length > 0) {
        if (!junctionNewIdx.has(w.id)) junctionNewIdx.set(w.id, new Map());
        const idxMap = junctionNewIdx.get(w.id)!;
        for (const j of junctions) {
          const newIdx = route.findIndex(n => n.x === j.pos.x && n.y === j.pos.y);
          if (newIdx !== -1) idxMap.set(j.oldIdx, newIdx);
        }
      }

      changed = true;
      return { ...w, nodes: route };
    });

    // Update nodeIndex references in wires that attach to rerouted wires' junctions
    const updatedWires = wires.map(w => {
      let u = w;
      if (u.startAttach?.kind === 'wire') {
        const newIdx = junctionNewIdx.get(u.startAttach.wireId)?.get(u.startAttach.nodeIndex);
        if (newIdx !== undefined) u = { ...u, startAttach: { ...u.startAttach, nodeIndex: newIdx } };
      }
      if (u.endAttach?.kind === 'wire') {
        const newIdx = junctionNewIdx.get(u.endAttach.wireId)?.get(u.endAttach.nodeIndex);
        if (newIdx !== undefined) u = { ...u, endAttach: { ...u.endAttach, nodeIndex: newIdx } };
      }
      return u;
    });

    if (!changed) break;
    cur = { ...cur, wires: updatedWires };
  }
  return cur;
}

type Selection =
  | { kind: 'component'; id: string }
  | { kind: 'wire'; id: string; node: number | null; segment?: number | null; segLeft?: number; segRight?: number }
  | { kind: 'label'; id: string }
  | null;

// Hit-test which segment of a wire is under p (returns segment index = index of starting node)
function hitTestWireSegment(w: Wire, p: Point): number | null {
  for (let i = 0; i < w.nodes.length - 1; i++) {
    const a = w.nodes[i], b = w.nodes[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + t * dx, py = a.y + t * dy;
    if (Math.hypot(p.x - px, p.y - py) < 8) return i;
  }
  return null;
}

// Connect wire endpoints that land on component terminals after placement.
function autoConnect(st: CircuitState, comp: CircuitComponent): CircuitState {
  const count = getTerminalCount(comp.type);
  const wires = st.wires.map(w => {
    if (w.nodes.length < 2) return w;
    let { startAttach, endAttach } = w;
    const sp = w.nodes[0], ep = w.nodes[w.nodes.length - 1];
    for (let t = 0; t < count; t++) {
      const tp = getTerminal(comp, t);
      if (!startAttach && Math.hypot(sp.x - tp.x, sp.y - tp.y) <= SNAP_TOL)
        startAttach = { kind: 'component', componentId: comp.id, terminal: t };
      if (!endAttach && Math.hypot(ep.x - tp.x, ep.y - tp.y) <= SNAP_TOL)
        endAttach = { kind: 'component', componentId: comp.id, terminal: t };
    }
    return startAttach !== w.startAttach || endAttach !== w.endAttach
      ? { ...w, startAttach, endAttach }
      : w;
  });
  return { ...st, wires };
}

// Create connecting wires between terminals of newComp that coincide with terminals of other components.
function wireOverlappingTerminals(st: CircuitState, newComp: CircuitComponent): CircuitState {
  const count = getTerminalCount(newComp.type);
  const newWires: Wire[] = [];
  for (let t = 0; t < count; t++) {
    const tp = getTerminal(newComp, t);
    for (const other of st.components) {
      if (other.id === newComp.id) continue;
      const otherCount = getTerminalCount(other.type);
      for (let ot = 0; ot < otherCount; ot++) {
        const otp = getTerminal(other, ot);
        if (Math.hypot(tp.x - otp.x, tp.y - otp.y) > 1) continue;
        // Skip if already connected via a wire
        const already = st.wires.some(w =>
          (w.startAttach?.kind === 'component' && w.startAttach.componentId === newComp.id && w.startAttach.terminal === t &&
           w.endAttach?.kind === 'component' && w.endAttach.componentId === other.id && w.endAttach.terminal === ot) ||
          (w.endAttach?.kind === 'component' && w.endAttach.componentId === newComp.id && w.endAttach.terminal === t &&
           w.startAttach?.kind === 'component' && w.startAttach.componentId === other.id && w.startAttach.terminal === ot)
        );
        if (!already) {
          newWires.push({
            id: uid(),
            nodes: [{ ...tp }, { ...tp }],
            startAttach: { kind: 'component', componentId: newComp.id, terminal: t },
            endAttach: { kind: 'component', componentId: other.id, terminal: ot },
          });
        }
      }
    }
  }
  return newWires.length ? { ...st, wires: [...st.wires, ...newWires] } : st;
}

// Try to split any axis-aligned segment of a wire when a 2-terminal component is dropped on it.
// Returns new state + adjusted component, or null if no split applies.
function trySplitWire(
  st: CircuitState,
  comp: CircuitComponent,
  p: Point,
): { state: CircuitState; comp: CircuitComponent } | null {
  if (getTerminalCount(comp.type) !== 2) return null;
  for (const w of st.wires) {
    for (let si = 0; si < w.nodes.length - 1; si++) {
      const a = w.nodes[si], b = w.nodes[si + 1];
      const isH = a.y === b.y;
      const isV = a.x === b.x;
      if (!isH && !isV) continue;
      if (distToSegmentFull(p, a, b) > SNAP_TOL * 2) continue;

      const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
      const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);

      // Segment must be long enough to fit the component (terminal span = GRID*4)
      if (isH && (maxX - minX) < GRID * 4) continue;
      if (isV && (maxY - minY) < GRID * 4) continue;

      const rotation: 0 | 90 = isH ? 0 : 90;
      // Clamp center to valid range so terminals stay within segment bounds
      const cx = isH ? Math.max(minX + GRID * 2, Math.min(maxX - GRID * 2, snap(p.x))) : a.x;
      const cy = isH ? a.y : Math.max(minY + GRID * 2, Math.min(maxY - GRID * 2, snap(p.y)));
      const newComp: CircuitComponent = { ...comp, x: cx, y: cy, rotation };
      const t0 = getTerminal(newComp, 0);
      const t1 = getTerminal(newComp, 1);

      // Which terminal is closer to a?
      const tA = Math.hypot(t0.x - a.x, t0.y - a.y) < Math.hypot(t1.x - a.x, t1.y - a.y) ? 0 : 1;
      const tB = tA === 0 ? 1 : 0;
      const ptA = getTerminal(newComp, tA);
      const ptB = getTerminal(newComp, tB);

      // Wire 1: nodes[0..si] + ptA (the first half up to the split point)
      const wire1: Wire = {
        id: uid(), nodes: [...w.nodes.slice(0, si + 1), ptA],
        startAttach: w.startAttach,
        endAttach: { kind: 'component', componentId: newComp.id, terminal: tA },
      };
      // Wire 2: ptB + nodes[si+1..end] (the second half from the split point)
      const wire2: Wire = {
        id: uid(), nodes: [ptB, ...w.nodes.slice(si + 1)],
        startAttach: { kind: 'component', componentId: newComp.id, terminal: tB },
        endAttach: w.endAttach,
      };
      const newWires = st.wires.filter(x => x.id !== w.id).concat(wire1, wire2);
      return { state: { ...st, wires: newWires }, comp: newComp };
    }
  }
  return null;
}

interface ClipboardData {
  components: CircuitComponent[];
  wires: Wire[];
  labels: TextLabel[];
  centerX: number;
  centerY: number;
}

function buildClipboard(s: CircuitState, componentIds: Set<string>, labelIds: Set<string>): ClipboardData {
  const components = s.components.filter(c => componentIds.has(c.id));
  const labels = s.labels.filter(l => labelIds.has(l.id));
  // Only include wires whose BOTH endpoints attach to selected components
  const wires = s.wires.filter(w => {
    const sa = w.startAttach, ea = w.endAttach;
    return sa?.kind === 'component' && ea?.kind === 'component' &&
      componentIds.has(sa.componentId) && componentIds.has(ea.componentId);
  });
  const xs = components.map(c => c.x);
  const ys = components.map(c => c.y);
  return {
    components, wires, labels,
    centerX: xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0,
    centerY: ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0,
  };
}

function applyPaste(
  data: ClipboardData,
  targetX: number,
  targetY: number,
  cur: CircuitState,
): { next: CircuitState; newCompIds: string[]; newWireIds: string[]; newLabelIds: string[] } {
  const dx = snap(targetX - data.centerX);
  const dy = snap(targetY - data.centerY);
  const idMap = new Map<string, string>();
  for (const c of data.components) idMap.set(c.id, uid());

  const newComponents = data.components.map(c => ({
    ...c, id: idMap.get(c.id)!, x: snap(c.x + dx), y: snap(c.y + dy),
  }));
  const newLabels = data.labels.map(l => ({
    ...l, id: uid(), x: snap(l.x + dx), y: snap(l.y + dy),
  }));
  const newWires = data.wires.map(w => ({
    ...w, id: uid(),
    nodes: w.nodes.map(n => ({ x: snap(n.x + dx), y: snap(n.y + dy) })),
    startAttach: w.startAttach?.kind === 'component'
      ? { ...w.startAttach, componentId: idMap.get(w.startAttach.componentId) ?? w.startAttach.componentId }
      : w.startAttach,
    endAttach: w.endAttach?.kind === 'component'
      ? { ...w.endAttach, componentId: idMap.get(w.endAttach.componentId) ?? w.endAttach.componentId }
      : w.endAttach,
  }));

  return {
    next: {
      ...cur,
      components: [...cur.components, ...newComponents],
      wires: [...cur.wires, ...newWires],
      labels: [...cur.labels, ...newLabels],
    },
    newCompIds: newComponents.map(c => c.id),
    newWireIds: newWires.map(w => w.id),
    newLabelIds: newLabels.map(l => l.id),
  };
}

const MAX_HIST = 100;

interface HistoryState {
  circuit: CircuitState;
  past: CircuitState[];
  future: CircuitState[];
}

type HistoryAction =
  | { type: 'COMMIT'; payload: CircuitState }
  | { type: 'SET_LIVE'; payload: CircuitState }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'LOAD'; payload: CircuitState };

function historyReducer(s: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'COMMIT': {
      const past = [...s.past, s.circuit].slice(-MAX_HIST);
      return { circuit: action.payload, past, future: [] };
    }
    case 'SET_LIVE':
      return { ...s, circuit: action.payload };
    case 'UNDO': {
      if (s.past.length === 0) return s;
      const past = s.past.slice(0, -1);
      const prev = s.past[s.past.length - 1];
      return { circuit: prev, past, future: [s.circuit, ...s.future] };
    }
    case 'REDO': {
      if (s.future.length === 0) return s;
      const [next, ...future] = s.future;
      return { circuit: next, past: [...s.past, s.circuit], future };
    }
    case 'LOAD': {
      const past = s.past.length > 0 || s.circuit !== EMPTY
        ? [...s.past, s.circuit].slice(-MAX_HIST)
        : [];
      return { circuit: action.payload, past, future: [] };
    }
  }
}

const INITIAL_HISTORY: HistoryState = { circuit: EMPTY, past: [], future: [] };

export default function CircuitEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [hist, dispatch] = useReducer(historyReducer, INITIAL_HISTORY);
  const state = hist.circuit;
  const canUndo = hist.past.length > 0;
  const canRedo = hist.future.length > 0;
  const [selection, setSelection] = useState<Selection>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  // Wire drawing: single start point, then click to finalize end point
  const [wireStart, setWireStart] = useState<{ point: Point; attach?: WireAttachment } | null>(null);
  // L-shape orientation while previewing. Auto-detected from first mouse move,
  // user can flip with spacebar.
  const [wireOrient, setWireOrient] = useState<LRouteOrientation>('HV');
  const [wireOrientLocked, setWireOrientLocked] = useState(false);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [hoverSnap, setHoverSnap] = useState<Point | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editPos, setEditPos] = useState<Point>({ x: 0, y: 0 });
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [alignGuides, setAlignGuides] = useState<AlignGuide[]>([]);
  const [distLabels, setDistLabels] = useState<DistanceLabel[]>([]);
  // Rubber-band selection
  const [rubberBand, setRubberBand] = useState<{ start: Point; end: Point } | null>(null);
  // Multi-selection (from rubber-band or future clipboard)
  const [multiSel, setMultiSel] = useState<{ componentIds: string[]; wireIds: string[]; labelIds: string[] } | null>(null);
  // Multi-drag tracking
  const [multiDragOffsets, setMultiDragOffsets] = useState<Map<string, { dx: number; dy: number }>>(new Map());
  const [multiDragPrimaryStart, setMultiDragPrimaryStart] = useState<Point | null>(null);
  const [multiDragWireNodes, setMultiDragWireNodes] = useState<Map<string, Point[]>>(new Map());
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [filename, setFilename] = useState('circuit.json');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;
  // Refs so copy/paste callbacks can read latest values without stale closures
  const mousePosRef = useRef<Point>({ x: 0, y: 0 });
  mousePosRef.current = mousePos;
  const clipboardRef = useRef<ClipboardData | null>(null);
  clipboardRef.current = clipboard;
  const stateRef = useRef<CircuitState>(state);
  stateRef.current = state;
  const selectionRef = useRef<typeof selection>(null);
  selectionRef.current = selection;
  const multiSelRef = useRef<typeof multiSel>(null);
  multiSelRef.current = multiSel;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en';
    const saved = window.localStorage?.getItem('circuit.lang');
    return (saved === 'nl' || saved === 'en') ? saved : 'en';
  });
  const [helpOpen, setHelpOpen] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage?.setItem('circuit.lang', lang);
  }, [lang]);

  const commit = useCallback((next: CircuitState) => {
    dispatch({ type: 'COMMIT', payload: next });
    setIsDirty(true);
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
    setSelection(null);
    setWireStart(null);
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
    setSelection(null);
    setWireStart(null);
  }, []);

  const reset = useCallback(() => {
    if (window.confirm(tr(lang, 'btn.resetConfirm'))) {
      commit(EMPTY);
      setIsDirty(false);
      setSelection(null);
      setWireStart(null);
    }
  }, [commit, lang]);

  const filenameRef = useRef(filename);
  filenameRef.current = filename;

  const handleSave = useCallback(() => {
    downloadJSON(stateRef.current, zoomRef.current, panRef.current, filenameRef.current);
    setIsDirty(false);
  }, []);

  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const langRef = useRef(lang);
  langRef.current = lang;

  const handleLoad = useCallback(() => {
    if (isDirtyRef.current && !window.confirm(tr(langRef.current, 'msg.unsaved'))) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setFilename(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const result = loadFromJSON(reader.result as string);
        if ('error' in result) {
          alert(tr(langRef.current, 'msg.loadError', { error: result.error }));
          return;
        }
        dispatch({ type: 'LOAD', payload: result.circuit });
        setIsDirty(false);
        setSelection(null);
        setMultiSel(null);
        setWireStart(null);
        if (result.viewport) {
          setZoom(result.viewport.zoom);
          setPan({ x: result.viewport.panX, y: result.viewport.panY });
        }
      };
      reader.readAsText(file);
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }, []);

  const handleExportPNG = useCallback(() => {
    exportPNG(stateRef.current);
  }, []);

  const handleExportSVG = useCallback(() => {
    exportSVG(stateRef.current);
  }, []);

  // Clipboard helpers — read from refs so they stay stable across renders
  const handleCopy = useCallback((): boolean => {
    const sel = selectionRef.current;
    const ms = multiSelRef.current;
    const cIds = new Set<string>(ms?.componentIds ?? (sel?.kind === 'component' ? [sel.id] : []));
    const lIds = new Set<string>(ms?.labelIds ?? []);
    if (cIds.size === 0 && lIds.size === 0) return false;
    const data = buildClipboard(stateRef.current, cIds, lIds);
    clipboardRef.current = data;
    setClipboard(data);
    return true;
  }, []);

  const handlePaste = useCallback((targetX?: number, targetY?: number) => {
    const cb = clipboardRef.current;
    if (!cb) return;
    const tx = targetX ?? mousePosRef.current.x;
    const ty = targetY ?? mousePosRef.current.y;
    const { next, newCompIds, newWireIds, newLabelIds } = applyPaste(cb, tx, ty, stateRef.current);
    commit(next);
    setMultiSel({ componentIds: newCompIds, wireIds: newWireIds, labelIds: newLabelIds });
    setSelection(null);
  }, [commit]);

  const handleCut = useCallback(() => {
    if (!handleCopy()) return;
    // Read selection from refs (same snapshot as handleCopy used)
    const sel = selectionRef.current;
    const ms = multiSelRef.current;
    const s = stateRef.current;
    const next = { ...s };
    if (ms) {
      const cIds = new Set(ms.componentIds);
      const wIds = new Set(ms.wireIds);
      const lIds = new Set(ms.labelIds);
      next.components = s.components.filter(c => !cIds.has(c.id));
      next.wires = s.wires
        .filter(w => !wIds.has(w.id))
        .map(w => ({
          ...w,
          startAttach: w.startAttach?.kind === 'component' && cIds.has(w.startAttach.componentId) ? undefined : w.startAttach,
          endAttach: w.endAttach?.kind === 'component' && cIds.has(w.endAttach.componentId) ? undefined : w.endAttach,
        }));
      next.labels = s.labels.filter(l => !lIds.has(l.id));
    } else if (sel?.kind === 'component') {
      next.components = s.components.filter(c => c.id !== sel.id);
      next.wires = s.wires.map(w => ({
        ...w,
        startAttach: w.startAttach?.kind === 'component' && w.startAttach.componentId === sel.id ? undefined : w.startAttach,
        endAttach: w.endAttach?.kind === 'component' && w.endAttach.componentId === sel.id ? undefined : w.endAttach,
      }));
    } else if (sel?.kind === 'wire') {
      next.wires = s.wires.filter(w => w.id !== sel.id).map(w => ({
        ...w,
        startAttach: w.startAttach?.kind === 'wire' && w.startAttach.wireId === sel.id ? undefined : w.startAttach,
        endAttach: w.endAttach?.kind === 'wire' && w.endAttach.wireId === sel.id ? undefined : w.endAttach,
      }));
    } else if (sel?.kind === 'label') {
      next.labels = s.labels.filter(l => l.id !== sel.id);
    } else return;
    commit(next);
    setSelection(null);
    setMultiSel(null);
  }, [handleCopy, commit]);

  const handleDuplicate = useCallback(() => {
    const sel = selectionRef.current;
    const ms = multiSelRef.current;
    const s = stateRef.current;
    const cIds = new Set<string>(ms?.componentIds ?? (sel?.kind === 'component' ? [sel.id] : []));
    const lIds = new Set<string>(ms?.labelIds ?? []);
    if (cIds.size === 0 && lIds.size === 0) return;
    const data = buildClipboard(s, cIds, lIds);
    const { next, newCompIds, newWireIds, newLabelIds } = applyPaste(
      data, data.centerX + GRID * 3, data.centerY + GRID * 3, s,
    );
    commit(next);
    setMultiSel({ componentIds: newCompIds, wireIds: newWireIds, labelIds: newLabelIds });
    setSelection(null);
  }, [commit]);

  const canvasCoords = useCallback((clientX: number, clientY: number): Point => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left - pan.x) / zoom, y: (clientY - r.top - pan.y) / zoom };
  }, [pan, zoom]);

  const zoomBy = useCallback((factor: number, cx?: number, cy?: number) => {
    const canvas = canvasRef.current!;
    const mx = cx ?? canvas.clientWidth / 2;
    const my = cy ?? canvas.clientHeight / 2;
    setZoom(z => {
      const next = Math.max(0.25, Math.min(4, z * factor));
      setPan(p => ({
        x: mx - (mx - p.x) * (next / z),
        y: my - (my - p.y) * (next / z),
      }));
      return next;
    });
  }, []);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    clearCanvas(ctx, w, h);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Compute rubber-band contents for live highlighting
    let rbItems: { compIds: Set<string>; wireIds: Set<string>; labelIds: Set<string> } | null = null;
    if (rubberBand) {
      const rx1 = Math.min(rubberBand.start.x, rubberBand.end.x);
      const ry1 = Math.min(rubberBand.start.y, rubberBand.end.y);
      const rx2 = Math.max(rubberBand.start.x, rubberBand.end.x);
      const ry2 = Math.max(rubberBand.start.y, rubberBand.end.y);
      rbItems = { compIds: new Set(), wireIds: new Set(), labelIds: new Set() };
      for (const c of state.components)
        if (c.x >= rx1 && c.x <= rx2 && c.y >= ry1 && c.y <= ry2) rbItems.compIds.add(c.id);
      for (const ww of state.wires)
        if (ww.nodes.some(n => n.x >= rx1 && n.x <= rx2 && n.y >= ry1 && n.y <= ry2)) rbItems.wireIds.add(ww.id);
      for (const l of state.labels)
        if (l.x >= rx1 && l.x <= rx2 && l.y >= ry1 && l.y <= ry2) rbItems.labelIds.add(l.id);
    }

    const multiCompIds = new Set(multiSel?.componentIds ?? []);
    const multiWireIds = new Set(multiSel?.wireIds ?? []);
    const multiLabelIds = new Set(multiSel?.labelIds ?? []);

    state.wires.forEach(wire => {
      const sel = (selection?.kind === 'wire' && selection.id === wire.id) ||
                  multiWireIds.has(wire.id) || (rbItems?.wireIds.has(wire.id) ?? false);
      drawWire(ctx, wire, sel, (selection?.kind === 'wire' && selection.id === wire.id) ? selection.node : null);
    });
    state.components.forEach(comp => {
      const sel = (selection?.kind === 'component' && selection.id === comp.id) ||
                  multiCompIds.has(comp.id) || (rbItems?.compIds.has(comp.id) ?? false);
      drawComponent(ctx, comp, sel);
    });
    state.labels.forEach(label => {
      const sel = (selection?.kind === 'label' && selection.id === label.id) ||
                  multiLabelIds.has(label.id) || (rbItems?.labelIds.has(label.id) ?? false);
      if (editingLabel !== label.id) drawLabel(ctx, label, sel);
    });

    // Draw crossing arcs/dots after all wires so they render on top
    drawWireCrossings(ctx, state.wires, new Set(state.connectedCrossings));

    if (tool === 'wire' && wireStart) {
      const endPoint = hoverSnap ?? snapPoint(mousePos);
      const previewRoute = routeAvoiding(wireStart.point, endPoint, state.components, wireOrient);
      drawPreviewWire(ctx, wireStart.point, endPoint, wireOrient, previewRoute);
    }
    if (hoverSnap && (tool === 'wire' || (dragging && selection?.kind === 'wire'))) {
      drawSnapHint(ctx, hoverSnap);
    }
    if (alignGuides.length > 0) {
      const cw = canvasRef.current!.clientWidth;
      const ch = canvasRef.current!.clientHeight;
      drawAlignmentGuides(ctx, alignGuides, cw, ch, pan.x, pan.y, zoom);
    }
    if (distLabels.length > 0) {
      drawDistanceLabels(ctx, distLabels);
    }

    // Rubber-band selection rectangle
    if (rubberBand) {
      const rx = Math.min(rubberBand.start.x, rubberBand.end.x);
      const ry = Math.min(rubberBand.start.y, rubberBand.end.y);
      const rw = Math.abs(rubberBand.end.x - rubberBand.start.x);
      const rh = Math.abs(rubberBand.end.y - rubberBand.start.y);
      ctx.fillStyle = 'rgba(37,99,235,0.07)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [state, selection, tool, wireStart, mousePos, hoverSnap, pan, zoom, editingLabel, dragging, wireOrient, alignGuides, distLabels, rubberBand, multiSel]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      setMousePos(p => ({ ...p }));
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom(z => {
        const next = Math.max(0.25, Math.min(4, z * factor));
        setPan(p => ({
          x: mx - (mx - p.x) * (next / z),
          y: my - (my - p.y) * (next / z),
        }));
        return next;
      });
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // Touch pan & pinch-to-zoom (works on any touch device, not only mobile)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = { touches: [] as { id: number; x: number; y: number }[] };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      state.touches = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const cur = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
      const prev = state.touches;

      if (cur.length === 1 && prev.length === 1) {
        // One finger: pan
        const dx = cur[0].x - prev[0].x;
        const dy = cur[0].y - prev[0].y;
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      } else if (cur.length === 2 && prev.length >= 2) {
        // Two fingers: pinch-zoom + simultaneous pan
        const r = canvas.getBoundingClientRect();
        const prevDist = Math.hypot(prev[1].x - prev[0].x, prev[1].y - prev[0].y);
        const curDist = Math.hypot(cur[1].x - cur[0].x, cur[1].y - cur[0].y);
        const curMidX = (cur[0].x + cur[1].x) / 2 - r.left;
        const curMidY = (cur[0].y + cur[1].y) / 2 - r.top;
        const prevMidX = (prev[0].x + prev[1].x) / 2 - r.left;
        const prevMidY = (prev[0].y + prev[1].y) / 2 - r.top;
        if (prevDist > 0) {
          const factor = curDist / prevDist;
          setZoom(z => {
            const next = Math.max(0.25, Math.min(4, z * factor));
            setPan(p => ({
              x: curMidX - (curMidX - p.x) * (next / z) + (curMidX - prevMidX),
              y: curMidY - (curMidY - p.y) * (next / z) + (curMidY - prevMidY),
            }));
            return next;
          });
        }
      }

      state.touches = cur;
    };

    const onTouchEnd = (e: TouchEvent) => {
      state.touches = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isMobileRef.current) return;
      if (editingLabel) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection) {
          e.preventDefault();
          deleteSelection();
        }
      }
      if (e.key === 'r' && selection?.kind === 'component') {
        rotateSelection();
      }
      if (e.key === 'Escape') {
        setWireStart(null);
        setWireOrientLocked(false);
        setSelection(null);
        setMultiSel(null);
        setRubberBand(null);
        setTool('select');
        setContextMenu(null);
        setHelpOpen(false);
      }
      if (e.key === ' ' && tool === 'wire' && wireStart) {
        e.preventDefault();
        setWireOrient(o => (o === 'HV' ? 'VH' : 'HV'));
        setWireOrientLocked(true);
      }
      // W toggles between wire and select (the two most-used tools)
      if (e.key === 'w' || e.key === 'W') {
        if (tool === 'wire') {
          setTool('select');
        } else {
          setTool('wire');
          setWireStart(null);
          setSelection(null);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selection, editingLabel, undo, redo, tool, wireStart, rotateSelection, deleteSelection]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isMobileRef.current) return;
      if (editingLabel) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'c') { e.preventDefault(); handleCopy(); }
      else if (k === 'x') { e.preventDefault(); handleCut(); }
      else if (k === 'v') { e.preventDefault(); handlePaste(); }
      else if (k === 'd' && !e.shiftKey) { e.preventDefault(); handleDuplicate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingLabel, handleCopy, handleCut, handlePaste, handleDuplicate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingLabel) return;
      if (e.key === 'F1') { e.preventDefault(); setHelpOpen(h => !h); }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setHelpOpen(h => !h);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingLabel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingLabel) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); handleSave(); }
      else if (k === 'o') { e.preventDefault(); handleLoad(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingLabel, handleSave, handleLoad]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const deleteSelection = useCallback(() => {
    if (multiSel) {
      const cIds = new Set(multiSel.componentIds);
      const wIds = new Set(multiSel.wireIds);
      const lIds = new Set(multiSel.labelIds);
      const next: CircuitState = {
        components: state.components.filter(c => !cIds.has(c.id)),
        wires: state.wires
          .filter(w => !wIds.has(w.id))
          .map(w => ({
            ...w,
            startAttach: w.startAttach?.kind === 'component' && cIds.has(w.startAttach.componentId) ? undefined : w.startAttach,
            endAttach: w.endAttach?.kind === 'component' && cIds.has(w.endAttach.componentId) ? undefined : w.endAttach,
          })),
        labels: state.labels.filter(l => !lIds.has(l.id)),
      };
      commit(next);
      setMultiSel(null);
      setSelection(null);
      return;
    }
    if (!selection) return;
    const next = { ...state };
    if (selection.kind === 'component') {
      next.components = state.components.filter(c => c.id !== selection.id);
      // Detach wires that pointed at this component
      next.wires = state.wires.map(w => ({
        ...w,
        startAttach: w.startAttach?.kind === 'component' && w.startAttach.componentId === selection.id ? undefined : w.startAttach,
        endAttach: w.endAttach?.kind === 'component' && w.endAttach.componentId === selection.id ? undefined : w.endAttach,
      }));
    }
    if (selection.kind === 'wire') {
      next.wires = state.wires.filter(w => w.id !== selection.id);
      // Detach wires that pointed at this wire
      next.wires = next.wires.map(w => ({
        ...w,
        startAttach: w.startAttach?.kind === 'wire' && w.startAttach.wireId === selection.id ? undefined : w.startAttach,
        endAttach: w.endAttach?.kind === 'wire' && w.endAttach.wireId === selection.id ? undefined : w.endAttach,
      }));
    }
    if (selection.kind === 'label') next.labels = state.labels.filter(l => l.id !== selection.id);
    commit(next);
    setSelection(null);
  }, [selection, multiSel, state, commit]);

  const rotateSelection = useCallback(() => {
    if (selection?.kind !== 'component') return;
    const next = syncWires({
      ...state,
      components: state.components.map(c =>
        c.id === selection.id ? { ...c, rotation: ((c.rotation + 90) % 360) as 0 | 90 | 180 | 270 } : c
      ),
    });
    commit(next);
  }, [selection, state, commit]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobileRef.current) return;
    if (contextMenu) { setContextMenu(null); return; }
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
    if (e.button !== 0) return;

    const p = canvasCoords(e.clientX, e.clientY);
    const sp = snapPoint(p);
    const ctx = canvasRef.current!.getContext('2d')!;

    // Click-to-place component
    if (COMPONENT_TYPES.has(tool)) {
      let comp: CircuitComponent = { id: uid(), type: tool as ComponentType, x: sp.x, y: sp.y, rotation: 0 };

      // Try wire-split first (same logic as drag-drop)
      const split = trySplitWire(state, comp, p);
      if (split) {
        let next = wireOverlappingTerminals(
          { ...split.state, components: [...split.state.components, split.comp] },
          split.comp,
        );
        commit(next);
        setSelection({ kind: 'component', id: split.comp.id });
        setMultiSel(null);
        return;
      }

      comp = snapCompToTerminals(comp, state.components);
      let next = autoConnect({ ...state, components: [...state.components, comp] }, comp);
      next = wireOverlappingTerminals(next, comp);
      commit(next);
      setSelection({ kind: 'component', id: comp.id });
      setMultiSel(null);
      return;
    }

    if (tool === 'wire') {
      // Snap to terminal or wire-node, otherwise free point on grid
      const target = findSnapTarget(state.components, state.wires, p, SNAP_TOL);
      const point = target ? target.point : sp;
      const attach = target?.attach;

      if (!wireStart) {
        setWireStart({ point, attach });
        setWireOrient('HV');
        setWireOrientLocked(false);
      } else {
        // Second click — materialize any wire-segment snaps (insert nodes), then finalize
        let curWires = state.wires;
        const matStart = materializeAttach(curWires, wireStart.attach);
        curWires = matStart.wires;
        const realSa = matStart.attach;

        const matEnd = materializeAttach(curWires, attach);
        curWires = matEnd.wires;
        const realEa = matEnd.attach;

        const route = routeThroughWaypoints(
          wireStart.point, point, [],
          state.components, wireOrient,
        );

        const wire: Wire = {
          id: uid(),
          nodes: route,
          startAttach: realSa,
          endAttach: realEa,
        };
        commit({ ...state, wires: [...curWires, wire] });
        setWireStart(null);
        setWireOrientLocked(false);
      }
      return;
    }

    if (tool === 'text') {
      const label: TextLabel = { id: uid(), x: sp.x, y: sp.y, text: '' };
      const next = { ...state, labels: [...state.labels, label] };
      commit(next);
      setEditingLabel(label.id);
      setEditText('');
      setEditPos(sp);
      return;
    }

    if (tool === 'delete') {
      for (const c of [...state.components].reverse()) {
        if (hitTestComponent(c, p)) {
          const next = {
            ...state,
            components: state.components.filter(x => x.id !== c.id),
            wires: state.wires.map(w => ({
              ...w,
              startAttach: w.startAttach?.kind === 'component' && w.startAttach.componentId === c.id ? undefined : w.startAttach,
              endAttach: w.endAttach?.kind === 'component' && w.endAttach.componentId === c.id ? undefined : w.endAttach,
            })),
          };
          commit(next);
          return;
        }
      }
      for (const w of [...state.wires].reverse()) {
        if (hitTestWire(w, p)) {
          const remaining = state.wires.filter(x => x.id !== w.id).map(x => ({
            ...x,
            startAttach: x.startAttach?.kind === 'wire' && x.startAttach.wireId === w.id ? undefined : x.startAttach,
            endAttach: x.endAttach?.kind === 'wire' && x.endAttach.wireId === w.id ? undefined : x.endAttach,
          }));
          commit({ ...state, wires: remaining });
          return;
        }
      }
      for (const l of [...state.labels].reverse()) {
        if (hitTestLabel(ctx, l, p)) {
          commit({ ...state, labels: state.labels.filter(x => x.id !== l.id) });
          return;
        }
      }
      return;
    }

    // Toggle wire crossing (connected dot ↔ arc) when clicking near a crossing point
    for (const cr of findWireCrossings(state.wires)) {
      if (Math.hypot(p.x - cr.p.x, p.y - cr.p.y) < 8) {
        const key = `${cr.p.x},${cr.p.y}`;
        const cur = state.connectedCrossings ?? [];
        const next = cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key];
        commit({ ...state, connectedCrossings: next });
        return;
      }
    }

    // Select tool
    for (const c of [...state.components].reverse()) {
      if (hitTestComponent(c, p)) {
        setSelection({ kind: 'component', id: c.id });
        setDragging(true);
        setDragOffset({ x: p.x - c.x, y: p.y - c.y });
        // Start multi-drag if this component is part of multi-selection
        if (multiSel?.componentIds.includes(c.id)) {
          const offsets = new Map<string, { dx: number; dy: number }>();
          for (const id of multiSel.componentIds) {
            if (id === c.id) continue;
            const mc = state.components.find(x => x.id === id);
            if (mc) offsets.set(id, { dx: mc.x - c.x, dy: mc.y - c.y });
          }
          setMultiDragOffsets(offsets);
          setMultiDragPrimaryStart({ x: c.x, y: c.y });
          const wireNodeMap = new Map<string, Point[]>();
          for (const wireId of multiSel.wireIds) {
            const ww = state.wires.find(x => x.id === wireId);
            if (ww && !ww.startAttach && !ww.endAttach)
              wireNodeMap.set(wireId, ww.nodes.map(n => ({ ...n })));
          }
          setMultiDragWireNodes(wireNodeMap);
        } else {
          setMultiSel(null);
          setMultiDragOffsets(new Map());
          setMultiDragWireNodes(new Map());
        }
        return;
      }
    }
    for (const w of [...state.wires].reverse()) {
      const nodeIdx = hitTestWireNode(w, p);
      if (nodeIdx !== null) {
        setSelection({ kind: 'wire', id: w.id, node: nodeIdx, segment: null });
        setDragging(true);
        setDragOffset({ x: 0, y: 0 });
        return;
      }
      const segIdx = hitTestWireSegment(w, p);
      if (segIdx !== null) {
        // Restructure the wire so the segment has 2 interior nodes that we can
        // freely move. Insert helper nodes at the start/end if they're attached
        // (those endpoints must stay anchored). After this, simply moving the
        // two segment nodes perpendicular grows/shrinks the neighbour segments.
        const isStartSeg = segIdx === 0;
        const isEndSeg = segIdx === w.nodes.length - 2;
        const a = w.nodes[segIdx], b = w.nodes[segIdx + 1];
        const newNodes = w.nodes.map(n => ({ ...n }));
        let leftIdx = segIdx;
        let rightIdx = segIdx + 1;
        if (isStartSeg && w.startAttach) {
          // Duplicate the anchor so leftIdx becomes a free copy at the same spot
          newNodes.splice(1, 0, { ...a });
          leftIdx = 1;
          rightIdx = 2;
        }
        if (isEndSeg && w.endAttach) {
          newNodes.splice(rightIdx, 0, { ...b });
          // right anchor stays at the (new) last position; leftIdx unchanged
        }
        commit({
          ...state,
          wires: state.wires.map(x => x.id === w.id ? { ...x, nodes: newNodes } : x),
        });
        setSelection({ kind: 'wire', id: w.id, node: null, segment: segIdx, segLeft: leftIdx, segRight: rightIdx } as Selection);
        setDragging(true);
        setDragOffset({ x: 0, y: 0 });
        return;
      }
    }
    for (const l of [...state.labels].reverse()) {
      if (hitTestLabel(ctx, l, p)) {
        setSelection({ kind: 'label', id: l.id });
        setDragging(true);
        setDragOffset({ x: p.x - l.x, y: p.y - l.y });
        return;
      }
    }
    // Nothing hit — start rubber-band selection (select tool only)
    if (tool === 'select') {
      setRubberBand({ start: p, end: p });
      setMultiSel(null);
      setSelection(null);
    } else {
      setSelection(null);
    }
  }, [tool, state, canvasCoords, pan, commit, wireStart, wireOrient, multiSel, contextMenu]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobileRef.current) return;
    const p = canvasCoords(e.clientX, e.clientY);
    setMousePos(p);

    if (panning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    // Update rubber-band
    if (rubberBand) {
      setRubberBand(rb => rb ? { ...rb, end: p } : null);
      return;
    }

    // Snap-hint highlighting in wire mode and when dragging a wire endpoint
    if (tool === 'wire') {
      const t = findSnapTarget(state.components, state.wires, p, SNAP_TOL);
      setHoverSnap(t ? t.point : null);
      // Auto-detect L orientation from cursor direction (until user locks via spacebar)
      if (wireStart && !wireOrientLocked) {
        const dx = Math.abs(p.x - wireStart.point.x);
        const dy = Math.abs(p.y - wireStart.point.y);
        if (dx > 4 || dy > 4) {
          // If cursor moves more horizontally first, do H then V; otherwise V then H
          setWireOrient(dx >= dy ? 'HV' : 'VH');
        }
      }
    } else if (dragging && selection?.kind === 'wire' && selection.node !== null) {
      const t = findSnapTarget(state.components, state.wires, p, SNAP_TOL, selection.id);
      setHoverSnap(t ? t.point : null);
    } else if (hoverSnap) {
      setHoverSnap(null);
    }

    if (!dragging || !selection) return;
    const sp = snapPoint(p);

    if (selection.kind === 'component') {
      const rawX = snap(p.x - dragOffset.x);
      const rawY = snap(p.y - dragOffset.y);
      const others = state.components.filter(c => c.id !== selection.id);
      const aligned = alignToOthers({ x: rawX, y: rawY }, others);
      setAlignGuides(aligned.guides);
      setDistLabels(aligned.distances);
      if (multiDragOffsets.size > 0) {
        // Multi-drag: move all selected components + free wires by the same delta
        const dx = aligned.pos.x - (multiDragPrimaryStart?.x ?? 0);
        const dy = aligned.pos.y - (multiDragPrimaryStart?.y ?? 0);
        dispatch({ type: 'SET_LIVE', payload: syncWires({
          ...stateRef.current,
          components: stateRef.current.components.map(c => {
            if (c.id === selection.id) return { ...c, x: aligned.pos.x, y: aligned.pos.y };
            const off = multiDragOffsets.get(c.id);
            if (off) return { ...c, x: aligned.pos.x + off.dx, y: aligned.pos.y + off.dy };
            return c;
          }),
          wires: stateRef.current.wires.map(w => {
            const startNodes = multiDragWireNodes.get(w.id);
            if (startNodes) return { ...w, nodes: startNodes.map(n => ({ x: n.x + dx, y: n.y + dy })) };
            return w;
          }),
        }) });
      } else {
        dispatch({ type: 'SET_LIVE', payload: syncWires({
          ...stateRef.current,
          components: stateRef.current.components.map(c =>
            c.id === selection.id ? { ...c, x: aligned.pos.x, y: aligned.pos.y } : c
          ),
        }) });
      }
    } else if (selection.kind === 'wire' && selection.node !== null) {
      const target = findSnapTarget(state.components, state.wires, p, SNAP_TOL, selection.id);
      const newPos = target ? target.point : sp;
      dispatch({ type: 'SET_LIVE', payload: {
        ...stateRef.current,
        wires: stateRef.current.wires.map(w => {
          if (w.id !== selection.id) return w;
          const isStart = selection.node === 0;
          const isEnd = selection.node === w.nodes.length - 1;
          // For endpoints, re-route as L-shape against the opposite end, preserving orientation
          let nextNodes = w.nodes.map((n, i) => (i === selection.node ? newPos : n));
          const orient = inferOrientation(w.nodes);
          if (isStart && w.nodes.length >= 2) {
            nextNodes = orthogonalRoute(newPos, w.nodes[w.nodes.length - 1], orient);
          } else if (isEnd && w.nodes.length >= 2) {
            nextNodes = orthogonalRoute(w.nodes[0], newPos, orient);
          }
          let next: Wire = { ...w, nodes: nextNodes };
          if (isStart) next = { ...next, startAttach: target?.attach };
          if (isEnd) next = { ...next, endAttach: target?.attach };
          return next;
        }),
      } });
    } else if (selection.kind === 'wire' && selection.segLeft !== undefined && selection.segRight !== undefined) {
      // Move the two segment endpoints perpendicular to the segment.
      // Helper nodes were already inserted at mousedown if start/end were attached,
      // so segLeft / segRight always point to free, movable nodes.
      const li = selection.segLeft;
      const ri = selection.segRight;
      dispatch({ type: 'SET_LIVE', payload: {
        ...stateRef.current,
        wires: stateRef.current.wires.map(w => {
          if (w.id !== selection.id) return w;
          const a = w.nodes[li], b = w.nodes[ri];
          if (!a || !b) return w;
          const horizontal = a.y === b.y;
          const vertical = a.x === b.x;
          if (!horizontal && !vertical) return w;
          const nodes = w.nodes.map(n => ({ ...n }));
          if (horizontal) {
            const newY = snap(p.y);
            nodes[li] = { x: a.x, y: newY };
            nodes[ri] = { x: b.x, y: newY };
          } else {
            const newX = snap(p.x);
            nodes[li] = { x: newX, y: a.y };
            nodes[ri] = { x: newX, y: b.y };
          }
          return { ...w, nodes };
        }),
      } });
    } else if (selection.kind === 'label') {
      dispatch({ type: 'SET_LIVE', payload: {
        ...stateRef.current,
        labels: stateRef.current.labels.map(l =>
          l.id === selection.id ? { ...l, x: snap(p.x - dragOffset.x), y: snap(p.y - dragOffset.y) } : l
        ),
      } });
    }
  }, [dragging, selection, canvasCoords, dragOffset, panning, panStart, tool, state.components, state.wires, hoverSnap, wireStart, wireOrientLocked, rubberBand, multiDragOffsets, multiDragPrimaryStart, multiDragWireNodes]);

  const handleMouseUp = useCallback(() => {
    if (isMobileRef.current) return;
    if (panning) {
      setPanning(false);
      return;
    }
    // Finalize rubber-band selection
    if (rubberBand) {
      const rx1 = Math.min(rubberBand.start.x, rubberBand.end.x);
      const ry1 = Math.min(rubberBand.start.y, rubberBand.end.y);
      const rx2 = Math.max(rubberBand.start.x, rubberBand.end.x);
      const ry2 = Math.max(rubberBand.start.y, rubberBand.end.y);
      // Only activate if the band has meaningful size
      if (rx2 - rx1 > 4 || ry2 - ry1 > 4) {
        const componentIds = state.components
          .filter(c => c.x >= rx1 && c.x <= rx2 && c.y >= ry1 && c.y <= ry2)
          .map(c => c.id);
        const wireIds = state.wires
          .filter(w => w.nodes.some(n => n.x >= rx1 && n.x <= rx2 && n.y >= ry1 && n.y <= ry2))
          .map(w => w.id);
        const labelIds = state.labels
          .filter(l => l.x >= rx1 && l.x <= rx2 && l.y >= ry1 && l.y <= ry2)
          .map(l => l.id);
        if (componentIds.length + wireIds.length + labelIds.length > 0) {
          setMultiSel({ componentIds, wireIds, labelIds });
        }
      }
      setRubberBand(null);
      return;
    }
    if (dragging) {
      setDragging(false);
      setAlignGuides([]);
      setDistLabels([]);
      setMultiDragOffsets(new Map());
      setMultiDragPrimaryStart(null);
      setMultiDragWireNodes(new Map());
      const cleaned: CircuitState = {
        ...state,
        wires: state.wires.map(w => ({ ...w, nodes: cleanupWireNodes(w.nodes) })),
      };
      commit(cleaned);
      if (selection?.kind === 'wire' && selection.segment !== undefined) {
        setSelection({ kind: 'wire', id: selection.id, node: null, segment: null });
      }
    }
  }, [dragging, state, commit, panning, selection, rubberBand]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (isMobileRef.current) return;
    const p = canvasCoords(e.clientX, e.clientY);
    const ctx = canvasRef.current!.getContext('2d')!;

    // Switches: toggle open/closed when double-clicked
    for (const c of state.components) {
      if ((c.type === 'switch' || c.type === 'pushbutton') && hitTestComponent(c, p)) {
        commit({
          ...state,
          components: state.components.map(x =>
            x.id === c.id ? { ...x, closed: !x.closed } : x
          ),
        });
        return;
      }
    }

    for (const l of state.labels) {
      if (hitTestLabel(ctx, l, p)) {
        setEditingLabel(l.id);
        setEditText(l.text);
        setEditPos({ x: l.x, y: l.y });
        return;
      }
    }

    if (selection?.kind === 'wire') {
      const wire = state.wires.find(w => w.id === selection.id);
      if (!wire) return;
      const sp = snapPoint(p);
      let bestDist = Infinity;
      let bestIdx = 0;
      for (let i = 0; i < wire.nodes.length - 1; i++) {
        const d = distToSegmentFull(p, wire.nodes[i], wire.nodes[i + 1]);
        if (d < bestDist) { bestDist = d; bestIdx = i + 1; }
      }
      if (bestDist < 15) {
        const newNodes = [...wire.nodes];
        newNodes.splice(bestIdx, 0, sp);
        commit({
          ...state,
          wires: state.wires.map(w => w.id === wire.id ? { ...w, nodes: newNodes } : w),
        });
      }
      return;
    }

    // In select mode, double-clicking empty space creates a new text label
    if (tool === 'select') {
      // Make sure we didn't double-click an existing element
      for (const c of state.components) if (hitTestComponent(c, p)) return;
      for (const w of state.wires) if (hitTestWire(w, p)) return;
      const sp = snapPoint(p);
      const label: TextLabel = { id: uid(), x: sp.x, y: sp.y, text: '' };
      commit({ ...state, labels: [...state.labels, label] });
      setEditingLabel(label.id);
      setEditText('');
      setEditPos(sp);
    }
  }, [canvasCoords, state, selection, commit, tool]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isMobileRef.current) return;
    const p = canvasCoords(e.clientX, e.clientY);
    // Auto-select component under cursor if not already selected
    if (!multiSel && selection?.kind !== 'component') {
      for (const c of [...state.components].reverse()) {
        if (hitTestComponent(c, p)) {
          setSelection({ kind: 'component', id: c.id });
          setMultiSel(null);
          break;
        }
      }
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [canvasCoords, selection, multiSel, state.components]);

  // ---- Drag & drop component placement ----
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isMobileRef.current) return;
    if (e.dataTransfer.types.includes('application/x-circuit-component')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (isMobileRef.current) return;
    const type = e.dataTransfer.getData('application/x-circuit-component') as ComponentType;
    if (!type) return;
    e.preventDefault();
    const p = canvasCoords(e.clientX, e.clientY);
    const sp = snapPoint(p);
    const aligned = alignToOthers(sp, state.components);
    const comp: CircuitComponent = { id: uid(), type, x: aligned.pos.x, y: aligned.pos.y, rotation: 0 };

    // Try wire-split first (2-terminal components on a straight wire)
    const split = trySplitWire(state, comp, p);
    if (split) {
      commit({ ...split.state, components: [...split.state.components, split.comp] });
      setTool('select');
      setSelection({ kind: 'component', id: split.comp.id });
      return;
    }

    // Otherwise snap to nearby terminals, then auto-connect
    const snapped = snapCompToTerminals(comp, state.components);
    let next = autoConnect({ ...state, components: [...state.components, snapped] }, snapped);
    next = wireOverlappingTerminals(next, snapped);
    commit(next);
    setTool('select');
    setSelection({ kind: 'component', id: snapped.id });
  }, [canvasCoords, commit, state]);

  const finishLabelEdit = useCallback(() => {
    if (!editingLabel) return;
    commit({
      ...state,
      labels: state.labels.map(l => l.id === editingLabel ? { ...l, text: editText } : l),
    });
    setEditingLabel(null);
  }, [editingLabel, editText, state, commit]);

  const statusText = (() => {
    if (COMPONENT_TYPES.has(tool)) return tr(lang, 'status.place');
    if (tool === 'wire' && wireStart) return tr(lang, 'status.wire.placing', { orient: wireOrient });
    if (tool === 'wire') return tr(lang, 'status.wire.start');
    if (tool === 'select' && selection?.kind === 'component') {
      const comp = state.components.find(c => c.id === selection.id);
      return tr(lang, (comp?.type === 'switch' || comp?.type === 'pushbutton') ? 'status.select.switch' : 'status.select.component');
    }
    if (tool === 'select' && selection?.kind === 'wire') return tr(lang, 'status.select.wire');
    if (tool === 'select' && multiSel) return `${multiSel.componentIds.length + multiSel.wireIds.length + multiSel.labelIds.length} items geselecteerd · Delete = verwijderen · sleep om te verplaatsen`;
    if (tool === 'select') return tr(lang, 'status.select.empty');
    if (tool === 'text') return tr(lang, 'status.text');
    if (tool === 'delete') return tr(lang, 'status.delete');
    return '';
  })();

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#fff' }}>
      {!isMobile && (
        <Toolbar
          tool={tool}
          setTool={(t) => { setTool(t); setWireStart(null); setSelection(null); }}
          onUndo={undo}
          onRedo={redo}
          onReset={reset}
          canUndo={canUndo}
          canRedo={canRedo}
          lang={lang}
          setLang={setLang}
          helpOpen={helpOpen}
          onHelpToggle={() => setHelpOpen(h => !h)}
          onSave={handleSave}
          onLoad={handleLoad}
          onExportPNG={handleExportPNG}
          onExportSVG={handleExportSVG}
          isDirty={isDirty}
        />
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%', height: '100%',
          cursor: isMobile ? 'default' : getCursor(tool, dragging, panning),
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
      {editingLabel && (
        <div
          style={{
            position: 'absolute',
            left: editPos.x * zoom + pan.x,
            top: editPos.y * zoom + pan.y + TOOLBAR_H - 10,
            zIndex: 20,
          }}
        >
          <input
            autoFocus
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onBlur={() => setTimeout(finishLabelEdit, 150)}
            onKeyDown={e => { if (e.key === 'Enter') finishLabelEdit(); if (e.key === 'Escape') { setEditingLabel(null); } }}
            style={{
              font: '14px "SF Mono", "Fira Code", monospace',
              border: '1px solid #000',
              outline: 'none',
              background: '#fff',
              padding: '4px 8px',
              minWidth: 120,
              display: 'block',
            }}
            placeholder={tr(lang, 'label.placeholder')}
          />
          <div style={{
            marginTop: 4, background: '#fff', border: '1px solid #e0e0e0',
            borderRadius: 4, padding: '6px 8px', fontSize: 11, color: '#888',
            fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>
            <div style={{ marginBottom: 4, color: '#555', fontWeight: 600 }}>{tr(lang, 'label.quickInsert')}</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉','ₜₒₜ','ᵥ'].map(s => (
                <button key={s} onMouseDown={e => { e.preventDefault(); setEditText(t => t + s); }}
                  style={{ width: 24, height: 24, border: '1px solid #ddd', borderRadius: 3,
                    background: '#fafafa', cursor: 'pointer', fontSize: 13, fontFamily: 'monospace' }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {['Ω','Δ','μ','π','±','·','→','∞','≈','°'].map(s => (
                <button key={s} onMouseDown={e => { e.preventDefault(); setEditText(t => t + s); }}
                  style={{ width: 24, height: 24, border: '1px solid #ddd', borderRadius: 3,
                    background: '#fafafa', cursor: 'pointer', fontSize: 13, fontFamily: 'monospace' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Context menu — desktop only */}
      {!isMobile && contextMenu && (() => {
        const hasSelection = !!(selection?.kind === 'component' || selection?.kind === 'wire' || selection?.kind === 'label' || multiSel);
        const MENU_W = 210, MENU_H = 230;
        const mx = Math.min(contextMenu.x, window.innerWidth - MENU_W);
        const my = Math.min(contextMenu.y, window.innerHeight - MENU_H);
        const menuItem = (
          label: string,
          shortcut: string,
          action: () => void,
          enabled: boolean,
        ) => (
          <button
            key={label}
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); if (enabled) { action(); setContextMenu(null); } }}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '6px 12px', border: 'none', background: 'none',
              cursor: enabled ? 'pointer' : 'default', textAlign: 'left',
              fontSize: 13, fontFamily: 'system-ui, sans-serif',
              color: enabled ? '#1a1a1a' : '#bbb',
              borderRadius: 4,
            }}
            onMouseEnter={e => { if (enabled) (e.currentTarget as HTMLElement).style.background = '#f0f0f0'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
          >
            <span>{label}</span>
            <span style={{ fontSize: 11, color: '#888', marginLeft: 16 }}>{shortcut}</span>
          </button>
        );
        const divider = <div key="div" style={{ height: 1, background: '#e8e8e8', margin: '3px 0' }} />;
        return (
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{
              position: 'fixed', top: my, left: mx, zIndex: 200,
              background: '#fff', border: '1px solid #d0d0d0',
              borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              padding: '4px 0', minWidth: MENU_W,
            }}
          >
            {menuItem(tr(lang, 'menu.copy'), 'Ctrl+C', handleCopy, hasSelection)}
            {menuItem(tr(lang, 'menu.cut'), 'Ctrl+X', handleCut, hasSelection)}
            {divider}
            {menuItem(tr(lang, 'menu.paste'), 'Ctrl+V', () => {
              const r = canvasRef.current!.getBoundingClientRect();
              const wx = (contextMenu.x - r.left - pan.x) / zoom;
              const wy = (contextMenu.y - r.top - pan.y) / zoom;
              handlePaste(wx, wy);
            }, !!clipboard)}
            {menuItem(tr(lang, 'menu.duplicate'), 'Ctrl+D', handleDuplicate, hasSelection)}
            {divider}
            {menuItem(tr(lang, 'menu.rotate'), 'R', rotateSelection, selection?.kind === 'component')}
            {menuItem(tr(lang, 'menu.delete'), 'Delete', deleteSelection, hasSelection)}
          </div>
        );
      })()}
      {!isMobile && <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} lang={lang} />}
      {/* Zoom controls */}
      <div style={{
        position: 'fixed', bottom: isMobile ? 64 : 8, right: 12,
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'rgba(255,255,255,0.92)', border: '1px solid #e0e0e0',
        borderRadius: 6, padding: '2px 6px', fontSize: 11,
        fontFamily: 'monospace', userSelect: 'none',
      }}>
        {!isMobile && (
          <button
            onClick={() => zoomBy(1 / 1.12)}
            style={{ width: 20, height: 20, border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, color: '#444', padding: 0 }}
            title="Zoom out"
          >−</button>
        )}
        <span
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          style={{ minWidth: 36, textAlign: 'center', cursor: 'pointer', color: '#555', padding: isMobile ? '2px 4px' : 0 }}
          title="Reset zoom"
        >{Math.round(zoom * 100)}%</span>
        {!isMobile && (
          <button
            onClick={() => zoomBy(1.12)}
            style={{ width: 20, height: 20, border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, color: '#444', padding: 0 }}
            title="Zoom in"
          >+</button>
        )}
      </div>
      {/* Status bar — desktop only */}
      {!isMobile && (
        <div style={{
          position: 'fixed', bottom: 8, left: 12, right: 120,
          fontSize: 11, color: '#888', fontFamily: 'monospace',
          pointerEvents: 'none', textAlign: 'center',
        }}>
          {statusText}
        </div>
      )}
      {/* Mobile banner */}
      {isMobile && !bannerDismissed && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20,
          background: '#fffbeb', borderBottom: '1px solid #fcd34d',
          padding: '10px 14px 10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 13, color: '#92400e', lineHeight: 1.4,
        }}>
          <span>{tr(lang, 'mobile.banner')}</span>
          <button
            onClick={() => setBannerDismissed(true)}
            style={{
              flexShrink: 0, width: 28, height: 28, border: 'none',
              background: 'rgba(0,0,0,0.08)', borderRadius: 14,
              cursor: 'pointer', fontSize: 16, lineHeight: 1,
              color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Dismiss"
          >×</button>
        </div>
      )}
      {/* Mobile toolbar */}
      {isMobile && (
        <MobileToolbar
          lang={lang}
          setLang={setLang}
          onLoad={handleLoad}
          onExportPNG={handleExportPNG}
          onExportSVG={handleExportSVG}
        />
      )}
    </div>
  );
}

function getCursor(tool: Tool, dragging: boolean, panning: boolean): string {
  if (panning) return 'grabbing';
  if (dragging) return 'grabbing';
  if (tool === 'select') return 'default';
  if (COMPONENT_TYPES.has(tool)) return 'crosshair';
  if (tool === 'delete') return 'crosshair';
  return 'crosshair';
}

function distToSegmentFull(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((p.x - (a.x + t * dx)) ** 2 + (p.y - (a.y + t * dy)) ** 2);
}
