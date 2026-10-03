/**
 * Omzetten van een CircuitSketch-tekening naar een CircuitFlow-schakeling.
 *
 * CircuitSketch slaat een tekening geometrisch op: componenten met een midden en
 * draaiing, draden als lijst van punten, en per draaduiteinde waar het aan vastzit
 * (een aansluiting of een knikpunt van een andere draad). CircuitFlow werkt met een
 * knopengraaf: alles wat elektrisch samenkomt, deelt één vertex.
 *
 * - Alles wordt ×2 geschaald: CircuitSketch heeft raster 20 en aansluitingen op
 *   ±30, CircuitFlow raster 20 en aansluitingen op ±60. Zo valt de tekening precies
 *   op het raster van CircuitFlow.
 * - Onderdelen die CircuitFlow niet kent, vallen weg (met een melding); de draden
 *   die eraan vastzaten, eindigen dan los op de plek van de aansluiting.
 * - Waarden bestaan in CircuitSketch niet; alles krijgt de standaardwaarden.
 */
import { COMPONENT_DEFS } from "@/model/componentDefs";
import { findLedColor, findQuantity, formatQuantity, type Unit } from "./values";
import type { CircuitComponent, CircuitDoc, ComponentType, TextLabel, Wire } from "@/model/types";

// ── De (voor ons relevante) vorm van een CircuitSketch-bestand ──────────────

interface SkPoint {
  x: number;
  y: number;
}
type SkAttach =
  | { kind: "component"; componentId: string; terminal: number }
  | { kind: "wire"; wireId: string; nodeIndex: number }
  | { kind: "wire-segment"; wireId: string; segmentIndex: number; point: SkPoint };
interface SkComponent {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  closed?: boolean;
  value?: string;
}
interface SkWire {
  id: string;
  nodes: SkPoint[];
  startAttach?: SkAttach;
  endAttach?: SkAttach;
}
interface SkState {
  components: SkComponent[];
  wires: SkWire[];
  labels?: { id: string; x: number; y: number; text: string }[];
  connectedCrossings?: string[];
}

export interface SketchImport {
  doc: CircuitDoc;
  /** Onderdelen die niet mee konden, met aantal (bv. "condensator"). */
  skipped: { label: string; count: number }[];
  /** Onderdelen die door een verwant onderdeel vervangen zijn. */
  replaced: { label: string; count: number }[];
  /** Onderdelen zonder (herkenbare) waarde: die kregen de standaardwaarde. */
  defaulted: { label: string; count: number }[];
  /** Waarden buiten het bereik van CircuitFlow, met wat er gebruikt is. */
  clamped: string[];
}

/** Welke eenheid we in de tekst bij dit onderdeel zoeken. */
const VALUE_UNIT: Partial<Record<ComponentType, Unit>> = {
  source: "V",
  resistor: "Ω",
  varresistor: "Ω",
  potmeter: "Ω",
  lamp: "Ω",
  fuse: "A",
};

const SCALE = 2;
const SK_GRID = 20;
/** Lengte aansluitdraadje in CircuitSketch: versie 2 = 1,5 hok, versie 1 = 2 hokken. */
const skLead = (version: number) => (version === 1 ? SK_GRID * 2 : SK_GRID * 1.5);

/** CircuitSketch-type → CircuitFlow-type (alleen tweepolen die we kunnen simuleren). */
const TYPE_MAP: Record<string, ComponentType> = {
  voltage: "source",
  resistor: "resistor",
  varresistor: "varresistor",
  potentiometer: "potmeter",
  lamp: "lamp",
  led: "led",
  diode: "diode",
  fuse: "fuse",
  ldr: "ldr",
  ntc: "ntc",
  switch: "switch",
  pushbutton: "switch",
  voltmeter: "voltmeter",
  ammeter: "ammeter",
};

const REPLACED_LABEL: Record<string, string> = {
  pushbutton: "drukknop (wordt een schakelaar)",
};

const SKIPPED_LABEL: Record<string, string> = {
  voltage_ac: "wisselspanningsbron",
  motor: "motor",
  capacitor: "condensator",
  inductor: "spoel",
  ground: "aarde",
  potentiometer: "potentiometer",
  transformer: "transformator",
  transistor: "transistor",
  transistor_pnp: "pnp-transistor",
  ptc: "PTC",
  buzzer: "zoemer",
  relay: "relais",
};

/** Haalt de tekening uit een CircuitSketch-bestand (of een kale tekening). */
export function parseSketch(input: unknown): { state: SkState; version: number } | null {
  const obj = input as { version?: unknown; circuit?: unknown } | null;
  const state = (obj && typeof obj === "object" && "circuit" in obj ? obj.circuit : obj) as SkState | null;
  if (!state || !Array.isArray(state.components) || !Array.isArray(state.wires)) return null;
  // Een CircuitFlow-bestand heeft ook components/wires, maar vertex-id's als knopen.
  if (state.wires.some((w) => !Array.isArray(w.nodes) || w.nodes.some((n) => typeof n !== "object"))) return null;
  const version = obj && typeof obj === "object" && obj.version === 1 ? 1 : 2;
  return { state, version };
}

function terminalPos(c: SkComponent, terminal: number, lead: number): SkPoint {
  // Potmeter: aansluiting 2 is de loper, boven het midden (zoals in CircuitSketch).
  const local = terminal === 2 ? { x: 0, y: -SK_GRID * 1.1 } : { x: terminal === 0 ? -lead : lead, y: 0 };
  const a = (c.rotation * Math.PI) / 180;
  const cos = Math.round(Math.cos(a));
  const sin = Math.round(Math.sin(a));
  return { x: c.x + local.x * cos - local.y * sin, y: c.y + local.x * sin + local.y * cos };
}

/** Ligt p strikt binnen het rechte stuk a–b? */
function onSegmentInterior(p: SkPoint, a: SkPoint, b: SkPoint): boolean {
  if (a.x === b.x && p.x === a.x) return p.y > Math.min(a.y, b.y) && p.y < Math.max(a.y, b.y);
  if (a.y === b.y && p.y === a.y) return p.x > Math.min(a.x, b.x) && p.x < Math.max(a.x, b.x);
  return false;
}

export function sketchToDoc(state: SkState, version = 2): SketchImport {
  const lead = skLead(version);
  const pos = new Map<string, SkPoint>();
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = k;
    while (parent.get(c) !== r) {
      const n = parent.get(c)!;
      parent.set(c, r);
      c = n;
    }
    return r;
  };
  const add = (k: string, p: SkPoint) => {
    if (!parent.has(k)) {
      parent.set(k, k);
      pos.set(k, p);
    }
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };

  // Componenten
  const skipped = new Map<string, number>();
  const defaulted = new Map<string, number>();
  const clamped: string[] = [];
  const replaced = new Map<string, number>();
  const mapped = new Map<string, ComponentType>();
  const termKey = (cid: string, t: number) => `t:${cid}:${t}`;
  for (const c of state.components) {
    const type = TYPE_MAP[c.type];
    if (!type) {
      const label = SKIPPED_LABEL[c.type] ?? (c.type.startsWith("chip") ? "chip" : c.type);
      skipped.set(label, (skipped.get(label) ?? 0) + 1);
      continue;
    }
    if (REPLACED_LABEL[c.type]) replaced.set(REPLACED_LABEL[c.type], (replaced.get(REPLACED_LABEL[c.type]) ?? 0) + 1);
    mapped.set(c.id, type);
    add(termKey(c.id, 0), terminalPos(c, 0, lead));
    add(termKey(c.id, 1), terminalPos(c, 1, lead));
    if (type === "potmeter") add(termKey(c.id, 2), terminalPos(c, 2, lead));
  }

  // Draadknopen; ingevoegde punten (verbonden kruisingen, aftakking midden op een stuk)
  const wires = state.wires.filter((w) => Array.isArray(w.nodes) && w.nodes.length >= 2);
  const wireById = new Map(wires.map((w) => [w.id, w]));
  const nodeKey = (wid: string, i: number) => `n:${wid}:${i}`;
  for (const w of wires) w.nodes.forEach((n, i) => add(nodeKey(w.id, i), n));
  const inserts = new Map<string, { seg: number; p: SkPoint; key: string }[]>();
  const insertOn = (wid: string, seg: number, p: SkPoint): string => {
    const key = `i:${wid}:${seg}:${p.x},${p.y}`;
    add(key, p);
    const list = inserts.get(wid) ?? [];
    if (!list.some((x) => x.key === key)) list.push({ seg, p, key });
    inserts.set(wid, list);
    return key;
  };

  // Verbonden kruisingen: elk draadstuk dat door het punt loopt, krijgt daar een knoop.
  for (const ck of state.connectedCrossings ?? []) {
    const [x, y] = ck.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const p = { x, y };
    const keys: string[] = [];
    for (const w of wires) {
      w.nodes.forEach((n, i) => {
        if (n.x === x && n.y === y) keys.push(nodeKey(w.id, i));
        else if (i < w.nodes.length - 1 && onSegmentInterior(p, n, w.nodes[i + 1])) keys.push(insertOn(w.id, i, p));
      });
    }
    for (let i = 1; i < keys.length; i++) union(keys[0], keys[i]);
  }

  // Waar een draaduiteinde aan vastzit
  const attachKey = (a: SkAttach | undefined, own: SkPoint): string | null => {
    if (!a) return null;
    if (a.kind === "component") {
      const k = termKey(a.componentId, a.terminal);
      add(k, own); // weggevallen component: losse knoop op de plek van de aansluiting
      return k;
    }
    const tw = wireById.get(a.wireId);
    if (!tw) return null;
    if (a.kind === "wire") return a.nodeIndex >= 0 && a.nodeIndex < tw.nodes.length ? nodeKey(tw.id, a.nodeIndex) : null;
    const seg = a.segmentIndex;
    if (seg < 0 || seg >= tw.nodes.length - 1) return null;
    const p = a.point;
    if (p.x === tw.nodes[seg].x && p.y === tw.nodes[seg].y) return nodeKey(tw.id, seg);
    if (p.x === tw.nodes[seg + 1].x && p.y === tw.nodes[seg + 1].y) return nodeKey(tw.id, seg + 1);
    return insertOn(tw.id, seg, p);
  };
  for (const w of wires) {
    const last = w.nodes.length - 1;
    const s = attachKey(w.startAttach, w.nodes[0]);
    const e = attachKey(w.endAttach, w.nodes[last]);
    if (s) union(nodeKey(w.id, 0), s);
    if (e) union(nodeKey(w.id, last), e);
  }

  // Wat in de tekening op precies dezelfde plek eindigt, hoort bij elkaar:
  // aansluitingen en draaduiteinden (geen knikpunten: die kunnen een boogje zijn).
  const byPos = new Map<string, string>();
  const endish = [...parent.keys()].filter((k) => {
    if (k.startsWith("t:")) return true;
    if (!k.startsWith("n:")) return false;
    const [, wid, idx] = k.split(":");
    const w = wireById.get(wid);
    return !!w && (Number(idx) === 0 || Number(idx) === w.nodes.length - 1);
  });
  for (const k of endish) {
    const p = pos.get(k)!;
    const pk = `${p.x},${p.y}`;
    const other = byPos.get(pk);
    if (other) union(other, k);
    else byPos.set(pk, k);
  }

  // Eén vertex per groep; een aansluiting van een echt component bepaalt de plek.
  const vertexOf = new Map<string, string>();
  const vertices: CircuitDoc["vertices"] = {};
  let vid = 0;
  const groupPos = new Map<string, SkPoint>();
  for (const k of parent.keys()) {
    const r = find(k);
    const isTerm = k.startsWith("t:") && mapped.has(k.split(":")[1]);
    if (!groupPos.has(r) || isTerm) groupPos.set(r, pos.get(k)!);
  }
  const vertexFor = (k: string): string => {
    const r = find(k);
    let id = vertexOf.get(r);
    if (!id) {
      id = `v${++vid}`;
      vertexOf.set(r, id);
      const p = groupPos.get(r)!;
      vertices[id] = { id, x: p.x * SCALE, y: p.y * SCALE };
    }
    return id;
  };

  const components: CircuitComponent[] = [];
  for (const c of state.components) {
    const type = mapped.get(c.id);
    if (!type) continue;
    const a = vertexFor(termKey(c.id, 0));
    const b = vertexFor(termKey(c.id, 1));
    // Bron: in CircuitSketch zit de + rechts (aansluiting 1), in CircuitFlow is v0 de +.
    const [v0, v1] = type === "source" ? [b, a] : [a, b];
    const def = COMPONENT_DEFS[type];
    const values = { ...def.defaults };
    if (type === "switch") values.closed = c.closed ?? false;
    const unit = VALUE_UNIT[type];
    if (unit && def.valueKey) {
      const f = findQuantity(c.value, unit);
      if (!f) defaulted.set(def.label.toLowerCase(), (defaulted.get(def.label.toLowerCase()) ?? 0) + 1);
      else {
        const min = def.min ?? 0;
        const max = def.max ?? Infinity;
        const v = Math.min(max, Math.max(min, f.value));
        if (v !== f.value)
          clamped.push(`${formatQuantity(f.value, unit)} wordt ${formatQuantity(v, unit)}`);
        values[def.valueKey] = v;
      }
    } else if (type === "led") {
      const col = findLedColor(c.value);
      if (col) values.color = col.key;
    }
    components.push({
      id: `c${components.length + 1}`,
      type,
      v0,
      v1,
      ...(type === "potmeter" ? { v2: vertexFor(termKey(c.id, 2)) } : {}),
      mirrored: false,
      values,
      ...(c.value ? { sketchText: c.value } : {}),
    });
  }

  const outWires: Wire[] = [];
  for (const w of wires) {
    const keys: string[] = [];
    const ins = inserts.get(w.id) ?? [];
    w.nodes.forEach((n, i) => {
      keys.push(nodeKey(w.id, i));
      const here = ins
        .filter((x) => x.seg === i)
        .sort((p, q) => Math.abs(p.p.x - n.x) + Math.abs(p.p.y - n.y) - (Math.abs(q.p.x - n.x) + Math.abs(q.p.y - n.y)));
      for (const x of here) keys.push(x.key);
    });
    const nodes: string[] = [];
    for (const k of keys) {
      const v = vertexFor(k);
      if (nodes[nodes.length - 1] !== v) nodes.push(v);
    }
    if (nodes.length >= 2) outWires.push({ id: `w${outWires.length + 1}`, nodes });
  }

  const labels: TextLabel[] = (state.labels ?? [])
    .filter((l) => typeof l.text === "string" && l.text.trim())
    .map((l, i) => ({ id: `l${i + 1}`, x: l.x * SCALE, y: l.y * SCALE, text: l.text }));

  // Links bovenin het beeld zetten. Verschuiven met veelvouden van 40: terug in
  // CircuitSketch (÷2) is dat een heel rasterhok, zodat alles op het raster blijft.
  const xs = [...Object.values(vertices).map((v) => v.x), ...labels.map((l) => l.x)];
  const ys = [...Object.values(vertices).map((v) => v.y), ...labels.map((l) => l.y)];
  if (xs.length) {
    const dx = 160 - Math.floor(Math.min(...xs) / 40) * 40;
    const dy = 160 - Math.floor(Math.min(...ys) / 40) * 40;
    for (const v of Object.values(vertices)) {
      v.x += dx;
      v.y += dy;
    }
    for (const l of labels) {
      l.x += dx;
      l.y += dy;
    }
  }

  const list = (m: Map<string, number>) => [...m].map(([label, count]) => ({ label, count }));
  return { doc: { vertices, components, wires: outWires, labels }, skipped: list(skipped), replaced: list(replaced), defaulted: list(defaulted), clamped };
}

/** Korte Nederlandse melding over wat er bij het omzetten veranderd is (of null). */
export function importNotice(r: SketchImport): string | null {
  const fmt = (xs: { label: string; count: number }[]) =>
    xs.map((x) => (x.count > 1 ? `${x.count}× ${x.label}` : x.label)).join(", ");
  const parts: string[] = [];
  if (r.skipped.length)
    parts.push(`Niet in de simulatie: ${fmt(r.skipped)}. Op die plek is de schakeling nu onderbroken.`);
  if (r.replaced.length) parts.push(`Vervangen: ${fmt(r.replaced)}.`);
  if (r.clamped.length) parts.push(`Buiten het bereik van CircuitFlow: ${r.clamped.join(", ")}.`);
  if (r.defaulted.length)
    parts.push(`Zonder waarde, dus met een standaardwaarde: ${fmt(r.defaulted)}. Klik een onderdeel aan om dat te veranderen.`);
  return parts.length ? parts.join("\n") : null;
}
