import type { CircuitState } from './types';
import { GRID } from './types';
import { drawComponent, drawWire, drawLabel, drawWireCrossings } from './renderer';

export interface SaveFile {
  version: 1;
  circuit: CircuitState;
  viewport: { zoom: number; panX: number; panY: number };
}

export interface BBox { x: number; y: number; w: number; h: number }

export function computeBoundingBox(state: CircuitState, padding = 40): BBox | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const c of state.components) {
    xs.push(c.x - GRID * 2.5, c.x + GRID * 2.5);
    ys.push(c.y - GRID * 2.5, c.y + GRID * 2.5);
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
  const file: SaveFile = { version: 1, circuit: state, viewport: { zoom, panX: pan.x, panY: pan.y } };
  triggerDownload(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }), filename);
}

export function loadFromJSON(text: string): SaveFile | { error: string } {
  try {
    const obj = JSON.parse(text);
    if (obj.version !== 1) return { error: 'Unsupported file version' };
    if (!obj.circuit || !Array.isArray(obj.circuit.components) || !Array.isArray(obj.circuit.wires))
      return { error: 'Invalid circuit file' };
    return obj as SaveFile;
  } catch {
    return { error: 'Invalid JSON' };
  }
}

export function exportPNG(state: CircuitState): void {
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
  state.labels.forEach(l => drawLabel(ctx, l, false));
  drawWireCrossings(ctx, state.wires, new Set(state.connectedCrossings));
  canvas.toBlob(blob => {
    if (blob) triggerDownload(blob, 'circuit.png');
  });
}
