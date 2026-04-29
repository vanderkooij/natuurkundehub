export const GRID = 20;

export type Tool = 'select' | 'voltage' | 'voltage_ac' | 'resistor' | 'led' | 'motor' | 'lamp' | 'ammeter' | 'voltmeter' | 'capacitor' | 'inductor' | 'switch' | 'diode' | 'ground' | 'potentiometer' | 'fuse' | 'transformer' | 'transistor' | 'ntc' | 'ptc' | 'ldr' | 'pushbutton' | 'buzzer' | 'relay' | 'wire' | 'text' | 'delete';

export type ComponentType = 'voltage' | 'voltage_ac' | 'resistor' | 'led' | 'motor' | 'lamp' | 'ammeter' | 'voltmeter' | 'capacitor' | 'inductor' | 'switch' | 'diode' | 'ground' | 'potentiometer' | 'fuse' | 'transformer' | 'transistor' | 'ntc' | 'ptc' | 'ldr' | 'pushbutton' | 'buzzer' | 'relay';

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
