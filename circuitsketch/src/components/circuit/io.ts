import type { CircuitState, Point } from './types';
import { flowToState, isFlowExport } from './fromFlow';
import { GRID, OLD_LEAD, CHIP_PRESETS, CHIP_LEAD, isChipType } from './types';
import { drawComponent, drawComponentValue, drawWire, drawLabel, drawWireCrossings, getTerminal, getTerminalCount, terminalLocalPos } from './renderer';

/**
 * Versie 2 (2026-10): aansluitdraadjes ingekort van GRID*2 naar LEAD (GRID*1.5).
 * Versie 1-bestanden worden bij het openen omgezet met migrateLeads.
 */
export const SAVE_VERSION = 2;

export interface SaveFile {
  version: 1 | 2;
  circuit: CircuitState;
  viewport: { zoom: number; panX: number; panY: number };
}

export interface BBox { x: number; y: number; w: number; h: number }

export function computeBoundingBox(state: CircuitState, padding = 40): BBox | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const c of state.components) {
    if (isChipType(c.type)) {
      const preset = CHIP_PRESETS[c.type];
      const rotated = c.rotation % 180 === 90;
      const hw = ((rotated ? preset.halfH : preset.halfW) + CHIP_LEAD) * GRID;
      const hh = ((rotated ? preset.halfW : preset.halfH) + CHIP_LEAD) * GRID;
      xs.push(c.x - hw, c.x + hw);
      ys.push(c.y - hh, c.y + hh);
    } else {
      xs.push(c.x - GRID * 2.5, c.x + GRID * 2.5);
      ys.push(c.y - GRID * 2.5, c.y + GRID * 2.5);
    }
  }
  for (const w of state.wires) for (const n of w.nodes) { xs.push(n.x); ys.push(n.y); }
  for (const l of state.labels) { xs.push(l.x); ys.push(l.y); }
  if (xs.length === 0) return null;
  const x1 = Math.min(...xs) - padding;
  const y1 = Math.min(...ys) - padding;
  const x2 = Math.max(...xs) + padding;
  const y2 = Math.max(...ys) + padding;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

// ── Koppeling met CircuitFlow ────────────────────────────────────────────────
// "Simuleren in CircuitFlow" stuurt de tekening mee in de URL-hash (#sketch=…).
// CircuitFlow zet hem om en stuurt bij "Terug naar je tekening" het origineel
// onveranderd terug (#load=…). Er wordt niets op een server opgeslagen.

const FLOW_URL = import.meta.env.DEV ? 'http://localhost:5177/circuitflow/' : '/circuitflow/';

function b64urlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

export function saveFileText(state: CircuitState, zoom: number, pan: { x: number; y: number }): string {
  const file: SaveFile = { version: SAVE_VERSION, circuit: state, viewport: { zoom, panX: pan.x, panY: pan.y } };
  return JSON.stringify(file);
}

/** Hash met deze tekening, zodat CircuitSketch hem bij het (terug)komen weer opent. */
export function loadHash(text: string): string {
  return '#load=' + b64urlEncode(text);
}

export function flowUrl(text: string): string {
  return FLOW_URL + '#sketch=' + b64urlEncode(text);
}

/** Een schakeling die CircuitFlow meestuurt (`#flow=…`), omgezet naar een tekening. */
export function flowFromHash(): CircuitState | null {
  const m = /[#&]flow=([A-Za-z0-9_-]+)/.exec(window.location.hash);
  if (!m) return null;
  try {
    const obj = JSON.parse(b64urlDecode(m[1]));
    return isFlowExport(obj) ? flowToState(obj) : null;
  } catch {
    return null;
  }
}

/** De tekening uit `#load=…` (terug uit CircuitFlow), of null. */
export function loadFromHash(): SaveFile | null {
  const m = /[#&]load=([A-Za-z0-9_-]+)/.exec(window.location.hash);
  if (!m) return null;
  try {
    const result = loadFromJSON(b64urlDecode(m[1]));
    return 'error' in result ? null : result;
  } catch {
    return null;
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJSON(
  state: CircuitState,
  zoom: number,
  pan: { x: number; y: number },
  filename = 'circuit.json',
) {
  const file: SaveFile = { version: SAVE_VERSION, circuit: state, viewport: { zoom, panX: pan.x, panY: pan.y } };
  triggerDownload(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }), filename);
}

export function loadFromJSON(text: string): SaveFile | { error: string } {
  try {
    const obj = JSON.parse(text);
    if (obj.version !== 1 && obj.version !== SAVE_VERSION) return { error: 'Unsupported file version' };
    if (!obj.circuit || !Array.isArray(obj.circuit.components) || !Array.isArray(obj.circuit.wires))
      return { error: 'Invalid circuit file' };
    const file = obj as SaveFile;
    if (file.version === 1) return { ...file, version: SAVE_VERSION, circuit: migrateLeads(file.circuit) };
    return file;
  } catch {
    return { error: 'Invalid JSON' };
  }
}

/**
 * Versie 1 → 2: de aansluitingen liggen nu op LEAD i.p.v. OLD_LEAD van het
 * midden. Een draadeinde dat op een oude aansluiting lag, schuift mee naar de
 * nieuwe. Loopt het eerste stuk draad dwars op die verschuiving, dan schuiven
 * de volgende knopen mee tot het eerste stuk dat in de verschuifrichting ligt,
 * zodat alle stukken horizontaal of verticaal blijven.
 */
export function migrateLeads(state: CircuitState): CircuitState {
  const moves: { from: Point; to: Point }[] = [];
  for (const c of state.components) {
    if (isChipType(c.type)) continue;
    for (let t = 0; t < getTerminalCount(c.type); t++) {
      const now = getTerminal(c, t);
      const oldLocal = terminalLocalPos(c.type, t, OLD_LEAD);
      const cos = Math.cos((c.rotation * Math.PI) / 180);
      const sin = Math.sin((c.rotation * Math.PI) / 180);
      const old = {
        x: Math.round(c.x + oldLocal.x * cos - oldLocal.y * sin),
        y: Math.round(c.y + oldLocal.x * sin + oldLocal.y * cos),
      };
      const to = { x: Math.round(now.x), y: Math.round(now.y) };
      if (old.x !== to.x || old.y !== to.y) moves.push({ from: old, to });
    }
  }
  const shiftFrom = (nodes: Point[], order: number[]) => {
    const first = nodes[order[0]];
    const m = moves.find(mv => mv.from.x === first.x && mv.from.y === first.y);
    if (!m) return;
    const dx = m.to.x - m.from.x, dy = m.to.y - m.from.y;
    const orig = nodes.map(n => ({ ...n }));
    nodes[order[0]] = { x: first.x + dx, y: first.y + dy };
    for (let k = 1; k < order.length; k++) {
      const prev = orig[order[k - 1]], cur = orig[order[k]];
      // Stuk in de verschuifrichting: dat wordt alleen korter of langer, klaar.
      const alongShift = dx !== 0 ? prev.y === cur.y : prev.x === cur.x;
      if (alongShift) break;
      nodes[order[k]] = { x: cur.x + dx, y: cur.y + dy };
    }
  };
  const wires = state.wires.map(w => {
    if (w.nodes.length < 2) return w;
    const nodes = w.nodes.map(n => ({ ...n }));
    const idx = nodes.map((_, i) => i);
    shiftFrom(nodes, idx);
    shiftFrom(nodes, [...idx].reverse());
    return { ...w, nodes };
  });
  return { ...state, wires };
}

export function exportPNG(state: CircuitState, hideValues = false): void {
  const bb = computeBoundingBox(state);
  if (!bb) return;
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(bb.w * scale);
  canvas.height = Math.ceil(bb.h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.translate(-bb.x, -bb.y);
  state.wires.forEach(w => drawWire(ctx, w, false, null));
  state.components.forEach(c => drawComponent(ctx, c, false));
  if (!hideValues) state.components.forEach(c => drawComponentValue(ctx, c));
  state.labels.forEach(l => drawLabel(ctx, l, false));
  drawWireCrossings(ctx, state.wires, new Set(state.connectedCrossings));
  canvas.toBlob(blob => {
    if (blob) triggerDownload(blob, 'circuit.png');
  });
}
