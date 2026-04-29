import type { CircuitComponent, Wire, TextLabel, Point, WireAttachment, LRouteOrientation } from './types';
import { GRID, snap, orthogonalRoute } from './types';

export function clearCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
}

function drawVoltageSource(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';

  // Plates closer together
  const gap = GRID * 0.18;
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0);
  ctx.lineTo(-gap, 0);
  ctx.moveTo(gap, 0);
  ctx.lineTo(GRID * 2, 0);
  ctx.stroke();

  // Short plate (negative)
  ctx.beginPath();
  ctx.moveTo(-gap, -GRID * 0.4);
  ctx.lineTo(-gap, GRID * 0.4);
  ctx.stroke();

  // Long plate (positive)
  ctx.beginPath();
  ctx.moveTo(gap, -GRID * 0.7);
  ctx.lineTo(gap, GRID * 0.7);
  ctx.stroke();

  ctx.fillStyle = selected ? '#555' : '#000';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('+', gap + GRID * 0.3, -GRID * 0.85);
  ctx.fillText('−', -gap - GRID * 0.3, -GRID * 0.55);

  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 1.2);
  ctx.restore();
}

function drawACVoltageSource(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';

  const r = GRID * 0.7;

  // Leads
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0);
  ctx.lineTo(-r, 0);
  ctx.moveTo(r, 0);
  ctx.lineTo(GRID * 2, 0);
  ctx.stroke();

  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Sine wave inside
  ctx.lineWidth = selected ? 2 : 1.3;
  ctx.beginPath();
  const w = r * 0.75;
  const amp = r * 0.4;
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const x = -w + (2 * w * i) / steps;
    const y = -Math.sin((i / steps) * Math.PI * 2) * amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID);
  ctx.restore();
}

function drawResistor(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0);
  ctx.lineTo(-GRID, 0);
  ctx.moveTo(GRID, 0);
  ctx.lineTo(GRID * 2, 0);
  ctx.stroke();

  ctx.strokeRect(-GRID, -GRID * 0.4, GRID * 2, GRID * 0.8);

  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 0.7);
  ctx.restore();
}

function drawLED(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.fillStyle = 'transparent';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0);
  ctx.lineTo(-GRID * 0.6, 0);
  ctx.moveTo(GRID * 0.6, 0);
  ctx.lineTo(GRID * 2, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-GRID * 0.6, -GRID * 0.6);
  ctx.lineTo(-GRID * 0.6, GRID * 0.6);
  ctx.lineTo(GRID * 0.6, 0);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(GRID * 0.6, -GRID * 0.6);
  ctx.lineTo(GRID * 0.6, GRID * 0.6);
  ctx.stroke();

  ctx.lineWidth = 1;
  const arrowStart = GRID * 0.3;
  for (const dy of [-GRID * 0.6, -GRID * 0.9]) {
    ctx.beginPath();
    ctx.moveTo(arrowStart, dy);
    ctx.lineTo(arrowStart + GRID * 0.5, dy - GRID * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(arrowStart + GRID * 0.5, dy - GRID * 0.3);
    ctx.lineTo(arrowStart + GRID * 0.3, dy - GRID * 0.2);
    ctx.moveTo(arrowStart + GRID * 0.5, dy - GRID * 0.3);
    ctx.lineTo(arrowStart + GRID * 0.4, dy - GRID * 0.1);
    ctx.stroke();
  }

  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 1.1);
  ctx.restore();
}

function drawMotor(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';

  const r = GRID * 0.7;

  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0);
  ctx.lineTo(-r, 0);
  ctx.moveTo(r, 0);
  ctx.lineTo(GRID * 2, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = selected ? '#555' : '#000';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.rotate((-c.rotation * Math.PI) / 180);
  ctx.fillText('M', 0, 0);

  if (selected) {
    ctx.rotate((c.rotation * Math.PI) / 180);
    drawSelectionBox(ctx, GRID * 2.2, GRID);
  }
  ctx.restore();
}

function drawLamp(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';

  const r = GRID * 0.7;

  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0);
  ctx.lineTo(-r, 0);
  ctx.moveTo(r, 0);
  ctx.lineTo(GRID * 2, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  const d = r * 0.55;
  ctx.beginPath();
  ctx.moveTo(-d, -d);
  ctx.lineTo(d, d);
  ctx.moveTo(d, -d);
  ctx.lineTo(-d, d);
  ctx.stroke();

  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID);
  ctx.restore();
}

function drawSelectionBox(ctx: CanvasRenderingContext2D, hw: number, hh: number) {
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
  ctx.setLineDash([]);
}

export function drawComponent(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  switch (c.type) {
    case 'voltage': return drawVoltageSource(ctx, c, selected);
    case 'voltage_ac': return drawACVoltageSource(ctx, c, selected);
    case 'resistor': return drawResistor(ctx, c, selected);
    case 'led': return drawLED(ctx, c, selected);
    case 'motor': return drawMotor(ctx, c, selected);
    case 'lamp': return drawLamp(ctx, c, selected);
    case 'ammeter': return drawMeter(ctx, c, selected, 'A');
    case 'voltmeter': return drawMeter(ctx, c, selected, 'V');
    case 'capacitor': return drawCapacitor(ctx, c, selected);
    case 'inductor': return drawInductor(ctx, c, selected);
    case 'switch': return drawSwitch(ctx, c, selected);
    case 'diode': return drawDiode(ctx, c, selected);
    case 'ground': return drawGround(ctx, c, selected);
    case 'potentiometer': return drawPotentiometer(ctx, c, selected);
    case 'fuse': return drawFuse(ctx, c, selected);
    case 'transformer': return drawTransformer(ctx, c, selected);
    case 'transistor': return drawTransistor(ctx, c, selected);
    case 'ntc': return drawThermistor(ctx, c, selected, 'NTC');
    case 'ptc': return drawThermistor(ctx, c, selected, 'PTC');
    case 'ldr': return drawLDR(ctx, c, selected);
    case 'pushbutton': return drawPushButton(ctx, c, selected);
    case 'buzzer': return drawBuzzer(ctx, c, selected);
    case 'relay': return drawRelay(ctx, c, selected);
  }
}

function drawMeter(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean, letter: string) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';
  const r = GRID * 0.7;
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-r, 0);
  ctx.moveTo(r, 0); ctx.lineTo(GRID * 2, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = selected ? '#555' : '#000';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.rotate((-c.rotation * Math.PI) / 180);
  ctx.fillText(letter, 0, 0);
  if (selected) { ctx.rotate((c.rotation * Math.PI) / 180); drawSelectionBox(ctx, GRID * 2.2, GRID); }
  ctx.restore();
}

function drawCapacitor(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';
  const gap = GRID * 0.25;
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-gap, 0);
  ctx.moveTo(gap, 0); ctx.lineTo(GRID * 2, 0);
  ctx.moveTo(-gap, -GRID * 0.6); ctx.lineTo(-gap, GRID * 0.6);
  ctx.moveTo(gap, -GRID * 0.6); ctx.lineTo(gap, GRID * 0.6);
  ctx.stroke();
  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 0.8);
  ctx.restore();
}

function drawInductor(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';
  const bumps = 4;
  const w = GRID * 2; // total bumps span -w/2..w/2 = GRID
  const r = GRID * 0.25;
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-bumps * r, 0);
  for (let i = 0; i < bumps; i++) {
    const cx = -bumps * r + r + i * 2 * r;
    ctx.arc(cx, 0, r, Math.PI, 0, false);
  }
  ctx.moveTo(bumps * r, 0); ctx.lineTo(GRID * 2, 0);
  ctx.stroke();
  void w;
  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 0.6);
  ctx.restore();
}

function drawSwitch(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.fillStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';
  const a = GRID * 0.6; // hinge points
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-a, 0);
  ctx.moveTo(a, 0); ctx.lineTo(GRID * 2, 0);
  ctx.stroke();
  // Hinge dots
  ctx.beginPath(); ctx.arc(-a, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(a, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  // Lever
  ctx.beginPath();
  if (c.closed) {
    ctx.moveTo(-a, 0); ctx.lineTo(a, 0);
  } else {
    ctx.moveTo(-a, 0); ctx.lineTo(a - GRID * 0.2, -GRID * 0.7);
  }
  ctx.stroke();
  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 0.9);
  ctx.restore();
}

function drawDiode(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.fillStyle = 'transparent';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-GRID * 0.6, 0);
  ctx.moveTo(GRID * 0.6, 0); ctx.lineTo(GRID * 2, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-GRID * 0.6, -GRID * 0.6);
  ctx.lineTo(-GRID * 0.6, GRID * 0.6);
  ctx.lineTo(GRID * 0.6, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(GRID * 0.6, -GRID * 0.6);
  ctx.lineTo(GRID * 0.6, GRID * 0.6);
  ctx.stroke();
  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 0.9);
  ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';
  // Lead from terminal (top, at 0,-GRID*2) down to first bar
  ctx.beginPath();
  ctx.moveTo(0, -GRID * 2); ctx.lineTo(0, -GRID * 0.3);
  ctx.stroke();
  // Three bars of decreasing width
  ctx.beginPath();
  ctx.moveTo(-GRID * 0.6, -GRID * 0.3); ctx.lineTo(GRID * 0.6, -GRID * 0.3);
  ctx.moveTo(-GRID * 0.4,  GRID * 0.1); ctx.lineTo(GRID * 0.4,  GRID * 0.1);
  ctx.moveTo(-GRID * 0.2,  GRID * 0.5); ctx.lineTo(GRID * 0.2,  GRID * 0.5);
  ctx.stroke();
  if (selected) drawSelectionBox(ctx, GRID * 0.8, GRID * 2.2);
  ctx.restore();
}

function drawPotentiometer(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.fillStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';
  // Resistor body
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-GRID, 0);
  ctx.moveTo(GRID, 0); ctx.lineTo(GRID * 2, 0);
  ctx.stroke();
  ctx.strokeRect(-GRID, -GRID * 0.4, GRID * 2, GRID * 0.8);
  // Wiper: lead from terminal (0, -GRID*1.1) down to arrowhead at body top
  ctx.beginPath();
  ctx.moveTo(0, -GRID * 1.1); ctx.lineTo(0, -GRID * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -GRID * 0.4);
  ctx.lineTo(-4, -GRID * 0.7);
  ctx.lineTo(4, -GRID * 0.7);
  ctx.closePath();
  ctx.fill();
  // Wiper terminal dot
  ctx.beginPath();
  ctx.arc(0, -GRID * 1.1, 2.5, 0, Math.PI * 2);
  ctx.fill();
  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 1.3);
  ctx.restore();
}

function drawFuse(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';

  // Leads
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0);
  ctx.lineTo(-GRID * 0.8, 0);
  ctx.moveTo(GRID * 0.8, 0);
  ctx.lineTo(GRID * 2, 0);
  ctx.stroke();

  // Fuse body: narrow rectangle (smaller than resistor)
  ctx.strokeRect(-GRID * 0.8, -GRID * 0.3, GRID * 1.6, GRID * 0.6);

  // Line through the middle (fuse wire)
  ctx.beginPath();
  ctx.moveTo(-GRID * 0.8, 0);
  ctx.lineTo(GRID * 0.8, 0);
  ctx.stroke();

  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 0.6);
  ctx.restore();
}

function drawTransformer(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';

  const bumps = 3;
  const r = GRID / 3; // 3 bumps × 2r = 2*GRID → spans from -GRID to +GRID
  const spine = GRID * 1.2; // x-position of coil spines
  const coreGap = GRID * 0.15;

  // Primary leads (top and bottom left)
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, -GRID); ctx.lineTo(-spine, -GRID);
  ctx.moveTo(-GRID * 2, GRID);  ctx.lineTo(-spine, GRID);
  ctx.stroke();

  // Primary coil: vertical, bumps face right (inward toward core)
  ctx.beginPath();
  ctx.moveTo(-spine, -GRID);
  for (let i = 0; i < bumps; i++) {
    const cy = -GRID + r + i * 2 * r;
    ctx.arc(-spine, cy, r, -Math.PI / 2, Math.PI / 2, false);
  }
  ctx.stroke();

  // Core lines
  ctx.beginPath();
  ctx.moveTo(-coreGap, -GRID * 0.8); ctx.lineTo(-coreGap, GRID * 0.8);
  ctx.moveTo(coreGap, -GRID * 0.8);  ctx.lineTo(coreGap, GRID * 0.8);
  ctx.stroke();

  // Secondary coil: vertical, bumps face left (inward toward core)
  ctx.beginPath();
  ctx.moveTo(spine, -GRID);
  for (let i = 0; i < bumps; i++) {
    const cy = -GRID + r + i * 2 * r;
    ctx.arc(spine, cy, r, -Math.PI / 2, Math.PI / 2, true);
  }
  ctx.stroke();

  // Secondary leads (top and bottom right)
  ctx.beginPath();
  ctx.moveTo(GRID * 2, -GRID); ctx.lineTo(spine, -GRID);
  ctx.moveTo(GRID * 2, GRID);  ctx.lineTo(spine, GRID);
  ctx.stroke();

  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 1.2);
  ctx.restore();
}

function drawTransistor(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.fillStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';

  // Base lead: terminal 0 (-GRID*2, 0) → base bar
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-GRID * 0.5, 0);
  ctx.stroke();

  // Base bar (vertical)
  ctx.beginPath();
  ctx.moveTo(-GRID * 0.5, -GRID); ctx.lineTo(-GRID * 0.5, GRID);
  ctx.stroke();

  // Collector: base bar → terminal 1 (GRID*2, -GRID*1.5)
  ctx.beginPath();
  ctx.moveTo(-GRID * 0.5, -GRID * 0.6); ctx.lineTo(GRID * 2, -GRID * 1.5);
  ctx.stroke();

  // Emitter: base bar → terminal 2 (GRID*2, GRID*1.5)
  const ex1 = -GRID * 0.5, ey1 = GRID * 0.6;
  const ex2 = GRID * 2, ey2 = GRID * 1.5;
  ctx.beginPath();
  ctx.moveTo(ex1, ey1); ctx.lineTo(ex2, ey2);
  ctx.stroke();

  // Emitter arrow (filled triangle near tip)
  const edx = ex2 - ex1, edy = ey2 - ey1;
  const elen = Math.sqrt(edx * edx + edy * edy);
  const enx = edx / elen, eny = edy / elen;
  const epx = -eny, epy = enx;
  const aLen = 7, aW = 3.5;
  const ax = ex2 - aLen * enx, ay = ey2 - aLen * eny;
  ctx.beginPath();
  ctx.moveTo(ex2, ey2);
  ctx.lineTo(ax + aW * epx, ay + aW * epy);
  ctx.lineTo(ax - aW * epx, ay - aW * epy);
  ctx.closePath();
  ctx.fill();

  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 1.7);
  ctx.restore();
}

function drawThermistor(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean, label: string) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  const color = selected ? '#555' : '#000';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';
  // Leads + body
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-GRID, 0);
  ctx.moveTo(GRID, 0); ctx.lineTo(GRID * 2, 0);
  ctx.stroke();
  ctx.strokeRect(-GRID, -GRID * 0.4, GRID * 2, GRID * 0.8);
  // Diagonal line extending from lower-left through body to upper-right, exiting the body
  const cx = GRID * 1.5, cy = -GRID * 0.6;
  ctx.beginPath();
  ctx.moveTo(-GRID * 0.9, GRID * 0.38); ctx.lineTo(cx, cy);
  ctx.stroke();
  // Small circle at tip with "−" (NTC) or "+" (PTC)
  const cr = GRID * 0.22;
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `bold ${GRID * 0.32}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label === 'NTC' ? '−' : '+', cx, cy + 0.5);
  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 0.9);
  ctx.restore();
}

function drawLDR(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.fillStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';
  // Leads + body
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-GRID, 0);
  ctx.moveTo(GRID, 0); ctx.lineTo(GRID * 2, 0);
  ctx.stroke();
  ctx.strokeRect(-GRID, -GRID * 0.4, GRID * 2, GRID * 0.8);
  // Two parallel arrows from upper-right at 45°, tips landing on top edge of body
  ctx.lineWidth = selected ? 2 : 1.1;
  const arrows: [number, number, number, number][] = [
    [GRID * 1.3, -GRID * 1.4, GRID * 0.3, -GRID * 0.4],
    [GRID * 1.8, -GRID * 1.4, GRID * 0.8, -GRID * 0.4],
  ];
  for (const [sx, sy, ex, ey] of arrows) {
    ctx.beginPath();
    ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
    ctx.stroke();
    const dx = ex - sx, dy = ey - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len, ny = dy / len;
    const px = -ny, py = nx;
    const aL = 5, aW = 2.5;
    const bx = ex - aL * nx, by = ey - aL * ny;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(bx + aW * px, by + aW * py);
    ctx.lineTo(bx - aW * px, by - aW * py);
    ctx.closePath();
    ctx.fill();
  }
  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 1.2);
  ctx.restore();
}

function drawPushButton(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.fillStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';
  const a = GRID * 0.6;
  // Leads
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-a, 0);
  ctx.moveTo(a, 0); ctx.lineTo(GRID * 2, 0);
  ctx.stroke();
  // Contact dots
  ctx.beginPath(); ctx.arc(-a, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(a, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  // Floating bar: above when open, connecting when closed
  const barY = c.closed ? 0 : -GRID * 0.7;
  ctx.beginPath();
  ctx.moveTo(-a, barY); ctx.lineTo(a, barY);
  ctx.stroke();
  // Vertical actuator lines when open
  if (!c.closed) {
    ctx.lineWidth = selected ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(0, barY); ctx.lineTo(0, -GRID * 1.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -GRID * 1.25, GRID * 0.18, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 1.4);
  ctx.restore();
}

function drawBuzzer(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';
  const r = GRID * 0.65;
  // Leads
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-r, 0);
  ctx.moveTo(r, 0); ctx.lineTo(GRID * 2, 0);
  ctx.stroke();
  // Circle body
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  // "Bz" label (rotation-corrected, like motor/meter)
  ctx.fillStyle = selected ? '#555' : '#000';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.rotate((-c.rotation * Math.PI) / 180);
  ctx.fillText('Bz', 0, 0);
  if (selected) { ctx.rotate((c.rotation * Math.PI) / 180); drawSelectionBox(ctx, GRID * 2.2, GRID); }
  ctx.restore();
}

function drawRelay(ctx: CanvasRenderingContext2D, c: CircuitComponent, selected: boolean) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.fillStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.lineCap = 'round';

  const coilX = -GRID * 1.2;
  const r = GRID / 2; // 2 bumps × 2r = 2*GRID → spans -GRID to +GRID

  // Coil leads
  ctx.beginPath();
  ctx.moveTo(-GRID * 2, -GRID); ctx.lineTo(coilX, -GRID);
  ctx.moveTo(-GRID * 2,  GRID); ctx.lineTo(coilX,  GRID);
  ctx.stroke();

  // Coil: 2 vertical bumps facing right (toward core)
  ctx.beginPath();
  ctx.moveTo(coilX, -GRID);
  for (let i = 0; i < 2; i++) {
    const cy = -GRID + r + i * 2 * r;
    ctx.arc(coilX, cy, r, -Math.PI / 2, Math.PI / 2, false);
  }
  ctx.stroke();

  // Dashed coupling line
  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(0, -GRID * 0.8); ctx.lineTo(0, GRID * 0.8);
  ctx.stroke();
  ctx.restore();

  // Switch leads
  const contactX = GRID * 0.8;
  ctx.beginPath();
  ctx.moveTo(GRID * 2, -GRID); ctx.lineTo(contactX, -GRID);
  ctx.moveTo(GRID * 2,  GRID); ctx.lineTo(contactX,  GRID);
  ctx.stroke();

  // Contact dots
  ctx.beginPath(); ctx.arc(contactX, -GRID, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(contactX,  GRID, 2.5, 0, Math.PI * 2); ctx.fill();

  // Switch lever (open by default)
  ctx.beginPath();
  ctx.moveTo(contactX, GRID);
  ctx.lineTo(contactX + GRID * 0.25, -GRID + GRID * 0.35);
  ctx.stroke();

  if (selected) drawSelectionBox(ctx, GRID * 2.2, GRID * 1.2);
  ctx.restore();
}

export function drawWire(ctx: CanvasRenderingContext2D, w: Wire, selected: boolean, selectedNode: number | null) {
  if (w.nodes.length < 2) return;
  ctx.strokeStyle = selected ? '#555' : '#000';
  ctx.lineWidth = selected ? 2 : 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(w.nodes[0].x, w.nodes[0].y);
  for (let i = 1; i < w.nodes.length; i++) {
    ctx.lineTo(w.nodes[i].x, w.nodes[i].y);
  }
  ctx.stroke();


  if (selected) {
    w.nodes.forEach((n, i) => {
      ctx.fillStyle = selectedNode === i ? '#000' : '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }
}

export function drawLabel(ctx: CanvasRenderingContext2D, l: TextLabel, selected: boolean) {
  ctx.font = '14px "SF Mono", "Fira Code", monospace';
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'middle';
  ctx.fillText(l.text || '(text)', l.x, l.y);

  if (selected) {
    const m = ctx.measureText(l.text || '(text)');
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(l.x - 2, l.y - 10, m.width + 4, 20);
    ctx.setLineDash([]);
  }
}

// Live preview: draw the given route (pre-computed) or fall back to orthogonal
export function drawPreviewWire(ctx: CanvasRenderingContext2D, start: Point, cursor: Point, orientation: LRouteOrientation = 'HV', route?: Point[]) {
  if (!route) route = orthogonalRoute(start, cursor, orientation);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(route[0].x, route[0].y);
  for (let i = 1; i < route.length; i++) ctx.lineTo(route[i].x, route[i].y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Start marker
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(start.x, start.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

// Draw alignment guide lines (dashed) across the visible canvas
export function drawAlignmentGuides(
  ctx: CanvasRenderingContext2D,
  guides: { x?: number; y?: number }[],
  viewW: number,
  viewH: number,
  panX: number,
  panY: number,
  zoom = 1,
) {
  ctx.save();
  ctx.strokeStyle = '#ff3b30';
  ctx.lineWidth = 0.8 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  for (const g of guides) {
    ctx.beginPath();
    if (g.x !== undefined) {
      ctx.moveTo(g.x, -panY / zoom);
      ctx.lineTo(g.x, (viewH - panY) / zoom);
    }
    if (g.y !== undefined) {
      ctx.moveTo(-panX / zoom, g.y);
      ctx.lineTo((viewW - panX) / zoom, g.y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

// Draw distance labels between aligned components, with bracket marks
export function drawDistanceLabels(
  ctx: CanvasRenderingContext2D,
  labels: { a: Point; b: Point; axis: 'x' | 'y'; px: number }[],
) {
  ctx.save();
  ctx.strokeStyle = '#ff3b30';
  ctx.fillStyle = '#ff3b30';
  ctx.lineWidth = 1;
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tick = 4;
  for (const l of labels) {
    if (l.px <= 0) continue;
    if (l.axis === 'y') {
      // Vertical gap on shared X column → draw a small tick at each end and label to the right
      const x = l.a.x + 14;
      ctx.beginPath();
      ctx.moveTo(x - tick, l.a.y); ctx.lineTo(x + tick, l.a.y);
      ctx.moveTo(x - tick, l.b.y); ctx.lineTo(x + tick, l.b.y);
      ctx.moveTo(x, l.a.y); ctx.lineTo(x, l.b.y);
      ctx.stroke();
      // Label background
      const text = `${Math.round(l.px)}`;
      const m = ctx.measureText(text);
      const tx = x + 8 + m.width / 2;
      const ty = (l.a.y + l.b.y) / 2;
      ctx.fillStyle = '#fff';
      ctx.fillRect(tx - m.width / 2 - 2, ty - 7, m.width + 4, 14);
      ctx.fillStyle = '#ff3b30';
      ctx.fillText(text, tx, ty);
    } else {
      const y = l.a.y - 14;
      ctx.beginPath();
      ctx.moveTo(l.a.x, y - tick); ctx.lineTo(l.a.x, y + tick);
      ctx.moveTo(l.b.x, y - tick); ctx.lineTo(l.b.x, y + tick);
      ctx.moveTo(l.a.x, y); ctx.lineTo(l.b.x, y);
      ctx.stroke();
      const text = `${Math.round(l.px)}`;
      const m = ctx.measureText(text);
      const tx = (l.a.x + l.b.x) / 2;
      const ty = y - 10;
      ctx.fillStyle = '#fff';
      ctx.fillRect(tx - m.width / 2 - 2, ty - 7, m.width + 4, 14);
      ctx.fillStyle = '#ff3b30';
      ctx.fillText(text, tx, ty);
    }
  }
  ctx.restore();
}

// Highlight a snap target (terminal or wire-node) under the cursor
export function drawSnapHint(ctx: CanvasRenderingContext2D, p: Point) {
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
  ctx.stroke();
}

// Find all strictly interior wire-segment crossings (one horizontal × one vertical).
// Returns each crossing once, noting which wire is horizontal (draws the arc).
export function findWireCrossings(wires: Wire[]): { p: Point; hWireId: string; vWireId: string }[] {
  const result: { p: Point; hWireId: string; vWireId: string }[] = [];
  for (let i = 0; i < wires.length; i++) {
    for (let j = i + 1; j < wires.length; j++) {
      const w1 = wires[i], w2 = wires[j];
      for (let s1 = 0; s1 < w1.nodes.length - 1; s1++) {
        const a1 = w1.nodes[s1], b1 = w1.nodes[s1 + 1];
        const h1 = a1.y === b1.y, v1 = a1.x === b1.x;
        if (!h1 && !v1) continue;
        for (let s2 = 0; s2 < w2.nodes.length - 1; s2++) {
          const a2 = w2.nodes[s2], b2 = w2.nodes[s2 + 1];
          const h2 = a2.y === b2.y, v2 = a2.x === b2.x;
          if (!h2 && !v2) continue;
          if (h1 === h2) continue; // same direction, no crossing
          // Assign horizontal / vertical
          const [hA, hB, vA, vB, hId, vId] = h1
            ? [a1, b1, a2, b2, w1.id, w2.id]
            : [a2, b2, a1, b1, w2.id, w1.id];
          const x = vA.x, y = hA.y;
          if (
            x > Math.min(hA.x, hB.x) && x < Math.max(hA.x, hB.x) &&
            y > Math.min(vA.y, vB.y) && y < Math.max(vA.y, vB.y)
          ) {
            result.push({ p: { x, y }, hWireId: hId, vWireId: vId });
          }
        }
      }
    }
  }
  return result;
}

// Draw crossings: arc (hop) when not connected, filled dot when connected.
// Also draws junction dots at T-junctions (wire endpoints meeting another wire's interior).
export function drawWireCrossings(
  ctx: CanvasRenderingContext2D,
  wires: Wire[],
  connectedKeys: Set<string>,
) {
  const crossings = findWireCrossings(wires);
  const R = 5;

  for (const { p } of crossings) {
    const key = `${p.x},${p.y}`;
    if (connectedKeys.has(key)) {
      // Connected: filled dot
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Not connected: white gap on horizontal wire, then arc over it
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(p.x - R, p.y);
      ctx.lineTo(p.x + R, p.y);
      ctx.stroke();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, Math.PI, 0, false);
      ctx.stroke();
    }
  }

  // T-junction dots: wire endpoint lies on another wire's segment interior
  for (const w of wires) {
    for (const endPt of [w.nodes[0], w.nodes[w.nodes.length - 1]]) {
      for (const other of wires) {
        if (other.id === w.id) continue;
        for (let s = 0; s < other.nodes.length - 1; s++) {
          const a = other.nodes[s], b = other.nodes[s + 1];
          const isH = a.y === b.y;
          const hit = isH
            ? endPt.y === a.y && endPt.x > Math.min(a.x, b.x) && endPt.x < Math.max(a.x, b.x)
            : a.x === b.x && endPt.x === a.x && endPt.y > Math.min(a.y, b.y) && endPt.y < Math.max(a.y, b.y);
          if (hit) {
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(endPt.x, endPt.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }
}

export function hitTestComponent(c: CircuitComponent, p: Point): boolean {
  const dx = GRID * 2.2;
  const dy = c.type === 'transistor' ? GRID * 1.7 : c.type === 'ground' ? GRID * 2.2 : GRID * 1.2;
  const cos = Math.cos((-c.rotation * Math.PI) / 180);
  const sin = Math.sin((-c.rotation * Math.PI) / 180);
  const lx = (p.x - c.x) * cos - (p.y - c.y) * sin;
  const ly = (p.x - c.x) * sin + (p.y - c.y) * cos;
  return Math.abs(lx) <= dx && Math.abs(ly) <= dy;
}

// Returns the number of connectable terminals for a given component type.
export function getTerminalCount(type: CircuitComponent['type']): number {
  if (type === 'potentiometer') return 3;
  if (type === 'transformer') return 4;
  if (type === 'transistor') return 3;
  if (type === 'relay') return 4;
  if (type === 'ground') return 1;
  return 2;
}

// Local (unrotated) position of a terminal relative to component center.
function terminalLocalPos(type: CircuitComponent['type'], terminal: number): Point {
  switch (type) {
    case 'potentiometer':
      if (terminal === 0) return { x: -GRID * 2, y: 0 };
      if (terminal === 1) return { x: GRID * 2, y: 0 };
      return { x: 0, y: -GRID * 1.1 }; // wiper
    case 'transformer':
      if (terminal === 0) return { x: -GRID * 2, y: -GRID };
      if (terminal === 1) return { x: -GRID * 2, y: GRID };
      if (terminal === 2) return { x: GRID * 2, y: -GRID };
      return { x: GRID * 2, y: GRID };
    case 'ground':
      return { x: 0, y: -GRID * 2 };
    case 'relay':
      if (terminal === 0) return { x: -GRID * 2, y: -GRID };
      if (terminal === 1) return { x: -GRID * 2, y: GRID };
      if (terminal === 2) return { x: GRID * 2, y: -GRID };
      return { x: GRID * 2, y: GRID };
    case 'transistor':
      if (terminal === 0) return { x: -GRID * 2, y: 0 };        // base
      if (terminal === 1) return { x: GRID * 2, y: -GRID * 1.5 }; // collector
      return { x: GRID * 2, y: GRID * 1.5 };                      // emitter
    default:
      return { x: terminal === 0 ? -GRID * 2 : GRID * 2, y: 0 };
  }
}

export function getTerminal(c: CircuitComponent, terminal: number): Point {
  const local = terminalLocalPos(c.type, terminal);
  const cos = Math.cos((c.rotation * Math.PI) / 180);
  const sin = Math.sin((c.rotation * Math.PI) / 180);
  return {
    x: c.x + local.x * cos - local.y * sin,
    y: c.y + local.x * sin + local.y * cos,
  };
}

export function findTerminalNear(
  components: CircuitComponent[],
  p: Point,
  tolerance: number,
): { componentId: string; terminal: number; point: Point } | null {
  let best: { componentId: string; terminal: number; point: Point; d: number } | null = null;
  for (const c of components) {
    const count = getTerminalCount(c.type);
    for (let t = 0; t < count; t++) {
      const tp = getTerminal(c, t);
      const d = Math.hypot(tp.x - p.x, tp.y - p.y);
      if (d <= tolerance && (!best || d < best.d)) {
        best = { componentId: c.id, terminal: t, point: tp, d };
      }
    }
  }
  return best ? { componentId: best.componentId, terminal: best.terminal, point: best.point } : null;
}

// Find a wire-node (any node) near point p, excluding a specific wire id (so we don't snap to ourselves)
export function findWireNodeNear(
  wires: Wire[],
  p: Point,
  tolerance: number,
  excludeWireId?: string,
): { wireId: string; nodeIndex: number; point: Point } | null {
  let best: { wireId: string; nodeIndex: number; point: Point; d: number } | null = null;
  for (const w of wires) {
    if (w.id === excludeWireId) continue;
    for (let i = 0; i < w.nodes.length; i++) {
      const n = w.nodes[i];
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d <= tolerance && (!best || d < best.d)) {
        best = { wireId: w.id, nodeIndex: i, point: n, d };
      }
    }
  }
  return best ? { wireId: best.wireId, nodeIndex: best.nodeIndex, point: best.point } : null;
}

// Snap to an arbitrary point on a wire segment (mid-segment T-junction).
// Returns the grid-snapped interior point on the closest axis-aligned segment.
function findWireSegmentNear(
  wires: Wire[],
  p: Point,
  tolerance: number,
  excludeWireId?: string,
): { wireId: string; segmentIndex: number; point: Point } | null {
  let best: { wireId: string; segmentIndex: number; point: Point; d: number } | null = null;
  for (const w of wires) {
    if (w.id === excludeWireId) continue;
    for (let i = 0; i < w.nodes.length - 1; i++) {
      const a = w.nodes[i], b = w.nodes[i + 1];
      const isH = a.y === b.y, isV = a.x === b.x;
      if (!isH && !isV) continue;
      // Compute closest point on segment
      let pt: Point;
      if (isH) {
        const x = snap(Math.max(Math.min(a.x, b.x), Math.min(Math.max(a.x, b.x), p.x)));
        pt = { x, y: a.y };
      } else {
        const y = snap(Math.max(Math.min(a.y, b.y), Math.min(Math.max(a.y, b.y), p.y)));
        pt = { x: a.x, y };
      }
      // Skip if snapped to either endpoint (those are handled by findWireNodeNear)
      if ((pt.x === a.x && pt.y === a.y) || (pt.x === b.x && pt.y === b.y)) continue;
      const d = Math.hypot(p.x - pt.x, p.y - pt.y);
      if (d <= tolerance && (!best || d < best.d)) {
        best = { wireId: w.id, segmentIndex: i, point: pt, d };
      }
    }
  }
  return best ? { wireId: best.wireId, segmentIndex: best.segmentIndex, point: best.point } : null;
}

// Combined snap target lookup: terminal → wire node → wire segment mid-point
export function findSnapTarget(
  components: CircuitComponent[],
  wires: Wire[],
  p: Point,
  tolerance: number,
  excludeWireId?: string,
): { attach: WireAttachment; point: Point } | null {
  const term = findTerminalNear(components, p, tolerance);
  if (term) {
    return { attach: { kind: 'component', componentId: term.componentId, terminal: term.terminal }, point: term.point };
  }
  const wn = findWireNodeNear(wires, p, tolerance, excludeWireId);
  if (wn) {
    return { attach: { kind: 'wire', wireId: wn.wireId, nodeIndex: wn.nodeIndex }, point: wn.point };
  }
  const ws = findWireSegmentNear(wires, p, tolerance, excludeWireId);
  if (ws) {
    return { attach: { kind: 'wire-segment', wireId: ws.wireId, segmentIndex: ws.segmentIndex, point: ws.point }, point: ws.point };
  }
  return null;
}

export function hitTestWire(w: Wire, p: Point): boolean {
  for (let i = 0; i < w.nodes.length - 1; i++) {
    if (distToSegment(p, w.nodes[i], w.nodes[i + 1]) < 8) return true;
  }
  return false;
}

export function hitTestWireNode(w: Wire, p: Point): number | null {
  for (let i = 0; i < w.nodes.length; i++) {
    const dx = w.nodes[i].x - p.x;
    const dy = w.nodes[i].y - p.y;
    if (Math.sqrt(dx * dx + dy * dy) < 10) return i;
  }
  return null;
}

export function hitTestLabel(ctx: CanvasRenderingContext2D, l: TextLabel, p: Point): boolean {
  ctx.font = '14px "SF Mono", "Fira Code", monospace';
  const m = ctx.measureText(l.text || '(text)');
  return p.x >= l.x - 2 && p.x <= l.x + m.width + 2 && p.y >= l.y - 10 && p.y <= l.y + 10;
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return Math.sqrt((p.x - px) ** 2 + (p.y - py) ** 2);
}
