export const GRID = 20;

// Text-label font. Clean sans-serif (not Arial); also used by PNG/SVG export and
// the inline edit field so on-screen text matches what gets exported.
export const LABEL_FONT_FAMILY = '"Segoe UI", system-ui, sans-serif';
export const LABEL_FONT_SIZE = 14;
export const LABEL_FONT = `${LABEL_FONT_SIZE}px ${LABEL_FONT_FAMILY}`;

export type ChipType = 'chip_stepup' | 'chip_stepdown' | 'chip_esp' | 'chip_ic8';

export type Tool = 'select' | 'voltage' | 'voltage_ac' | 'resistor' | 'led' | 'motor' | 'lamp' | 'ammeter' | 'voltmeter' | 'capacitor' | 'inductor' | 'switch' | 'diode' | 'ground' | 'potentiometer' | 'fuse' | 'transformer' | 'transistor' | 'transistor_pnp' | 'ntc' | 'ptc' | 'ldr' | 'pushbutton' | 'buzzer' | 'relay' | ChipType | 'wire' | 'text' | 'delete';

export type ComponentType = 'voltage' | 'voltage_ac' | 'resistor' | 'led' | 'motor' | 'lamp' | 'ammeter' | 'voltmeter' | 'capacitor' | 'inductor' | 'switch' | 'diode' | 'ground' | 'potentiometer' | 'fuse' | 'transformer' | 'transistor' | 'transistor_pnp' | 'ntc' | 'ptc' | 'ldr' | 'pushbutton' | 'buzzer' | 'relay' | ChipType;

export type LRouteOrientation = 'HV' | 'VH';

export interface Point {
  x: number;
  y: number;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  // Switch only: open/closed state. Defaults to open (false).
  closed?: boolean;
  // Chip only: editable name shown in the centre of the block. Falls back to the preset label.
  name?: string;
}

export type WireAttachment =
  | { kind: 'component'; componentId: string; terminal: number }
  | { kind: 'wire'; wireId: string; nodeIndex: number }
  // Transient — only lives in wireStart state during drawing, never committed to CircuitState.
  | { kind: 'wire-segment'; wireId: string; segmentIndex: number; point: Point };

export interface Wire {
  id: string;
  nodes: Point[];
  startAttach?: WireAttachment;
  endAttach?: WireAttachment;
}

export interface TextLabel {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface CircuitState {
  components: CircuitComponent[];
  wires: Wire[];
  labels: TextLabel[];
  // "x,y" keys of crossing points the user has marked as electrically connected (dot).
  // All other crossings are drawn as an arc (not connected).
  connectedCrossings: string[];
}

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

export function snapPoint(p: Point): Point {
  return { x: snap(p.x), y: snap(p.y) };
}

// Build an orthogonal L-shape from a to b.
// orientation 'HV' = horizontal first then vertical (corner at b.x, a.y)
// orientation 'VH' = vertical first then horizontal (corner at a.x, b.y)
// Returns 2 nodes if already aligned, otherwise 3 nodes with the corner.
export function orthogonalRoute(a: Point, b: Point, orientation: LRouteOrientation = 'HV'): Point[] {
  if (a.x === b.x || a.y === b.y) return [a, b];
  if (orientation === 'VH') return [a, { x: a.x, y: b.y }, b];
  return [a, { x: b.x, y: a.y }, b];
}

// Infer orientation from existing 3-node L-shape so re-routes preserve user's choice.
export function inferOrientation(nodes: Point[]): LRouteOrientation {
  if (nodes.length < 3) return 'HV';
  const a = nodes[0], corner = nodes[1];
  // If corner shares Y with start, first segment was horizontal → HV
  return corner.y === a.y ? 'HV' : 'VH';
}

let _id = 0;
export function uid(): string {
  return `el_${Date.now()}_${_id++}`;
}

// ---- Chip / IC blocks --------------------------------------------------------
// Rectangular blocks with a fixed pin layout (presets). Sizes/offsets are in GRID
// units; the lead length (body edge → terminal) is CHIP_LEAD grid cells.

export type ChipSide = 'L' | 'R' | 'T' | 'B';

export interface ChipPin {
  side: ChipSide;
  pos: number;   // offset along the side from the centre, in GRID units
  label: string; // shown inside the block next to the pin
}

export interface ChipPreset {
  label: string; // default centre name
  halfW: number; // half width in GRID units
  halfH: number; // half height in GRID units
  pins: ChipPin[];
}

export const CHIP_LEAD = 1; // grid cells from body edge to terminal point

// A vertical column of pins down one side, evenly spaced one grid apart, centred.
function sidePins(side: ChipSide, labels: string[]): ChipPin[] {
  const start = -(labels.length - 1) / 2;
  return labels.map((label, i) => ({ side, pos: start + i, label }));
}

export const CHIP_PRESETS: Record<ChipType, ChipPreset> = {
  chip_stepup: {
    label: 'Step-up', halfW: 1.75, halfH: 1,
    pins: [...sidePins('L', ['IN+', 'IN−']), ...sidePins('R', ['OUT+', 'OUT−'])],
  },
  chip_stepdown: {
    label: 'Step-down', halfW: 1.75, halfH: 1,
    pins: [...sidePins('L', ['IN+', 'IN−']), ...sidePins('R', ['OUT+', 'OUT−'])],
  },
  chip_esp: {
    label: 'ESP32', halfW: 1.75, halfH: 3,
    pins: [
      ...sidePins('L', ['3V3', 'GND', 'EN', 'IO0', 'IO2', 'IO4']),
      ...sidePins('R', ['VIN', 'GND', 'TX', 'RX', 'IO5', 'IO15']),
    ],
  },
  chip_ic8: {
    label: 'IC', halfW: 1.25, halfH: 2,
    pins: [
      ...sidePins('L', ['1', '2', '3', '4']),
      ...sidePins('R', ['8', '7', '6', '5']),
    ],
  },
};

export function isChipType(type: ComponentType): type is ChipType {
  return type in CHIP_PRESETS;
}

// Local (unrotated) terminal point for a chip pin, in pixels relative to centre.
export function chipTerminalLocal(preset: ChipPreset, terminal: number): Point {
  const pin = preset.pins[terminal];
  switch (pin.side) {
    case 'L': return { x: -(preset.halfW + CHIP_LEAD) * GRID, y: pin.pos * GRID };
    case 'R': return { x:  (preset.halfW + CHIP_LEAD) * GRID, y: pin.pos * GRID };
    case 'T': return { x: pin.pos * GRID, y: -(preset.halfH + CHIP_LEAD) * GRID };
    default:  return { x: pin.pos * GRID, y:  (preset.halfH + CHIP_LEAD) * GRID };
  }
}
