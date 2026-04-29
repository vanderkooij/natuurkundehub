import type { CircuitState } from './types';
import { computeBoundingBox } from './io';
import { drawComponent, drawWire, drawLabel, drawWireCrossings } from './renderer';

function n(v: number): string {
  return (Math.round(v * 100) / 100).toString();
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface CtxState {
  tx: number; ty: number; rot: number;
  strokeStyle: string; fillStyle: string;
  lineWidth: number; lineCap: string; lineJoin: string;
  font: string; textAlign: string; textBaseline: string;
  ld: number[];
}

class SVGContext {
  private _tx = 0;
  private _ty = 0;
  private _rot = 0;
  private _stack: CtxState[] = [];

  private _d = '';
  private _hasPoint = false;
  private _cx = 0;
  private _cy = 0;
  private _sx = 0;
  private _sy = 0;

  private _els: string[] = [];

  strokeStyle = '#000';
  fillStyle = '#000';
  lineWidth = 1.5;
  lineCap = 'butt';
  lineJoin = 'miter';
  font = '10px sans-serif';
  textAlign = 'start';
  textBaseline = 'alphabetic';
  private _ld: number[] = [];

  save() {
    this._stack.push({
      tx: this._tx, ty: this._ty, rot: this._rot,
      strokeStyle: this.strokeStyle, fillStyle: this.fillStyle,
      lineWidth: this.lineWidth, lineCap: this.lineCap, lineJoin: this.lineJoin,
      font: this.font, textAlign: this.textAlign, textBaseline: this.textBaseline,
      ld: [...this._ld],
    });
  }

  restore() {
    const s = this._stack.pop();
    if (!s) return;
    this._tx = s.tx; this._ty = s.ty; this._rot = s.rot;
    this.strokeStyle = s.strokeStyle; this.fillStyle = s.fillStyle;
    this.lineWidth = s.lineWidth; this.lineCap = s.lineCap; this.lineJoin = s.lineJoin;
    this.font = s.font; this.textAlign = s.textAlign; this.textBaseline = s.textBaseline;
    this._ld = s.ld;
  }

  translate(x: number, y: number) {
    const c = Math.cos(this._rot), s = Math.sin(this._rot);
    this._tx += c * x - s * y;
    this._ty += s * x + c * y;
  }

  rotate(angle: number) {
    this._rot += angle;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  scale(_x: number, _y: number) { /* no-op for SVG */ }

  private _pt(x: number, y: number): [number, number] {
    const c = Math.cos(this._rot), s = Math.sin(this._rot);
    return [this._tx + c * x - s * y, this._ty + s * x + c * y];
  }

  beginPath() {
    this._d = '';
    this._hasPoint = false;
  }

  moveTo(x: number, y: number) {
    const [px, py] = this._pt(x, y);
    this._d += `M ${n(px)} ${n(py)} `;
    this._cx = px; this._cy = py; this._sx = px; this._sy = py;
    this._hasPoint = true;
  }

  lineTo(x: number, y: number) {
    const [px, py] = this._pt(x, y);
    if (!this._hasPoint) {
      this._d += `M ${n(px)} ${n(py)} `;
      this._sx = px; this._sy = py;
    } else {
      this._d += `L ${n(px)} ${n(py)} `;
    }
    this._cx = px; this._cy = py;
    this._hasPoint = true;
  }

  arc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, anticlockwise = false) {
    const [pcx, pcy] = this._pt(cx, cy);
    const sa = startAngle + this._rot;
    const ea = endAngle + this._rot;
    const sx = pcx + r * Math.cos(sa);
    const sy = pcy + r * Math.sin(sa);
    const ex = pcx + r * Math.cos(ea);
    const ey = pcy + r * Math.sin(ea);

    if (!this._hasPoint) {
      this._d += `M ${n(sx)} ${n(sy)} `;
      this._sx = sx; this._sy = sy;
      this._hasPoint = true;
    } else if (Math.abs(this._cx - sx) > 0.01 || Math.abs(this._cy - sy) > 0.01) {
      this._d += `L ${n(sx)} ${n(sy)} `;
    }

    let delta = anticlockwise ? startAngle - endAngle : endAngle - startAngle;
    while (delta < 0) delta += 2 * Math.PI;
    if (delta > 2 * Math.PI) delta = 2 * Math.PI;

    const sweep = anticlockwise ? 0 : 1;

    if (Math.abs(delta - 2 * Math.PI) < 0.001) {
      // Full circle: two semicircles to avoid degenerate SVG arc
      const ma = sa + Math.PI;
      const mx = pcx + r * Math.cos(ma);
      const my = pcy + r * Math.sin(ma);
      this._d += `A ${n(r)} ${n(r)} 0 0 ${sweep} ${n(mx)} ${n(my)} `;
      this._d += `A ${n(r)} ${n(r)} 0 0 ${sweep} ${n(ex)} ${n(ey)} `;
    } else {
      const large = delta > Math.PI ? 1 : 0;
      this._d += `A ${n(r)} ${n(r)} 0 ${large} ${sweep} ${n(ex)} ${n(ey)} `;
    }

    this._cx = ex; this._cy = ey;
  }

  closePath() {
    this._d += 'Z ';
    this._cx = this._sx; this._cy = this._sy;
  }

  stroke() {
    if (!this._d) return;
    const dash = this._ld.length ? ` stroke-dasharray="${this._ld.join(',')}"` : '';
    this._els.push(
      `<path d="${this._d.trim()}" fill="none" stroke="${this.strokeStyle}" stroke-width="${this.lineWidth}" stroke-linecap="${this.lineCap}" stroke-linejoin="${this.lineJoin}"${dash}/>`
    );
  }

  fill() {
    if (!this._d) return;
    this._els.push(`<path d="${this._d.trim()}" fill="${this.fillStyle}" stroke="none"/>`);
  }

  strokeRect(x: number, y: number, w: number, h: number) {
    const corners: [number, number][] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const pts = corners.map(([px, py]) => this._pt(px, py)).map(([px, py]) => `${n(px)},${n(py)}`).join(' ');
    const dash = this._ld.length ? ` stroke-dasharray="${this._ld.join(',')}"` : '';
    this._els.push(
      `<polygon points="${pts}" fill="none" stroke="${this.strokeStyle}" stroke-width="${this.lineWidth}" stroke-linecap="${this.lineCap}"${dash}/>`
    );
  }

  fillRect(x: number, y: number, w: number, h: number) {
    const corners: [number, number][] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const pts = corners.map(([px, py]) => this._pt(px, py)).map(([px, py]) => `${n(px)},${n(py)}`).join(' ');
    this._els.push(`<polygon points="${pts}" fill="${this.fillStyle}" stroke="none"/>`);
  }

  setLineDash(segs: number[]) { this._ld = [...segs]; }

  fillText(text: string, x: number, y: number) {
    const [px, py] = this._pt(x, y);
    const m = this.font.match(/(\d+(?:\.\d+)?)px\s+(.+)/);
    const fontSize = m ? m[1] : '12';
    const fontFamily = m ? m[2] : 'sans-serif';
    const anchor = ({ start: 'start', center: 'middle', end: 'end', left: 'start', right: 'end' } as Record<string, string>)[this.textAlign] ?? 'start';
    const svgBase = ({ alphabetic: 'alphabetic', middle: 'central', top: 'hanging', bottom: 'text-after-edge', hanging: 'hanging', ideographic: 'ideographic' } as Record<string, string>)[this.textBaseline] ?? 'alphabetic';
    this._els.push(
      `<text x="${n(px)}" y="${n(py)}" font-size="${fontSize}" font-family="${esc(fontFamily)}" text-anchor="${anchor}" dominant-baseline="${svgBase}" fill="${this.fillStyle}">${esc(text)}</text>`
    );
  }

  measureText(text: string): { width: number } {
    const m = this.font.match(/(\d+(?:\.\d+)?)px/);
    return { width: text.length * (m ? parseFloat(m[1]) : 12) * 0.6 };
  }

  clearRect() { /* no-op */ }

  getResult(): string { return this._els.join('\n'); }
}

export function exportSVG(state: CircuitState): void {
  const bb = computeBoundingBox(state);
  if (!bb) return;

  const ctx = new SVGContext();
  ctx.translate(-bb.x, -bb.y);

  state.wires.forEach(w => drawWire(ctx as unknown as CanvasRenderingContext2D, w, false, null));
  state.components.forEach(c => drawComponent(ctx as unknown as CanvasRenderingContext2D, c, false));
  state.labels.forEach(l => drawLabel(ctx as unknown as CanvasRenderingContext2D, l, false));
  drawWireCrossings(ctx as unknown as CanvasRenderingContext2D, state.wires, new Set(state.connectedCrossings));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${n(bb.w)}" height="${n(bb.h)}" viewBox="0 0 ${n(bb.w)} ${n(bb.h)}">
<rect width="${n(bb.w)}" height="${n(bb.h)}" fill="white"/>
${ctx.getResult()}
</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'circuit.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
