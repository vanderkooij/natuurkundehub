import { useCallback, useReducer } from "react";

import { COMPONENT_DEFS, TERMINAL_SPAN } from "@/model/componentDefs";
import { activeRange, analogPortOffsets, isAnalog } from "@/model/meterSpec";
import type { CircuitComponent, CircuitDoc, ComponentType, Vertex } from "@/model/types";
import { EMPTY_DOC } from "@/model/types";

let counter = 0;
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}${counter}`;
}

interface Pt {
  x: number;
  y: number;
}

export type Action =
  | { t: "addComponent"; id: string; type: ComponentType; v0: string; v1: string; cx: number; cy: number }
  | { t: "addAnalogMeter"; id: string; type: ComponentType; cx: number; cy: number; portIds: string[] }
  | { t: "moveAnalogMeter"; id: string; cx: number; cy: number }
  | { t: "moveComponent"; id: string; p0: Pt; p1: Pt }
  | { t: "moveVertex"; vid: string; x: number; y: number }
  | { t: "rotateComponent"; id: string }
  | { t: "mirrorComponent"; id: string }
  | { t: "reversePolarity"; id: string }
  | { t: "setValue"; id: string; patch: Partial<CircuitComponent["values"]> }
  | { t: "duplicateComponent"; id: string; newId: string; newV0: string; newV1: string; newPortIds?: string[] }
  | { t: "deleteComponent"; id: string }
  | { t: "addWire"; wireId: string; from: string; newVid: string; x: number; y: number }
  | { t: "insertWaypoint"; wireId: string; segIndex: number; newVid: string; x: number; y: number }
  | { t: "mergeVertex"; keep: string; drop: string }
  | { t: "detachComponent"; id: string; newVertexIds: string[] }
  | { t: "setAnalogRange"; id: string; rangeIndex: number }
  | { t: "deleteWire"; id: string }
  | { t: "cutNode"; vid: string; newVertexIds: string[]; newWireIds: string[] }
  | { t: "deleteMany"; components: string[]; wires: string[]; labels: string[] }
  | { t: "mergeFragment"; frag: CircuitDoc }
  | {
      t: "moveGroup";
      /** Beginposities bij de start van de sleep; reducer zet basis + delta. */
      vertices: Record<string, Pt>;
      analog: Record<string, Pt>;
      labels: Record<string, Pt>;
      dx: number;
      dy: number;
    }
  | { t: "addLabel"; id: string; x: number; y: number; text: string }
  | { t: "moveLabel"; id: string; x: number; y: number }
  | { t: "setLabelText"; id: string; text: string }
  | { t: "setLabelBoxed"; id: string; boxed: boolean }
  | { t: "deleteLabel"; id: string }
  | { t: "load"; doc: CircuitDoc }
  | { t: "reset" }
  | { t: "undo" }
  | { t: "redo" }
  | { t: "commit" };

/** Houd alleen vertices die nog door een component of draad gebruikt worden. */
function pruneVertices(doc: CircuitDoc): CircuitDoc {
  const used = new Set<string>();
  for (const c of doc.components) {
    used.add(c.v0);
    used.add(c.v1);
    if (c.ports) for (const p of c.ports) used.add(p);
  }
  for (const w of doc.wires) for (const n of w.nodes) used.add(n);
  const vertices: Record<string, Vertex> = {};
  for (const [id, v] of Object.entries(doc.vertices)) if (used.has(id)) vertices[id] = v;
  return { ...doc, vertices };
}

/** Verwijder opeenvolgende dubbele knopen uit een draadpad. */
function collapse(nodes: string[]): string[] {
  const out: string[] = [];
  for (const n of nodes) if (out.length === 0 || out[out.length - 1] !== n) out.push(n);
  return out;
}

function setVertex(doc: CircuitDoc, vid: string, x: number, y: number): CircuitDoc {
  const v = doc.vertices[vid];
  if (!v) return doc;
  return { ...doc, vertices: { ...doc.vertices, [vid]: { ...v, x, y } } };
}

function referencedElsewhere(doc: CircuitDoc, vid: string, exceptComp: string): boolean {
  for (const c of doc.components) {
    if (c.id === exceptComp) continue;
    if (c.v0 === vid || c.v1 === vid) return true;
  }
  for (const w of doc.wires) if (w.nodes.includes(vid)) return true;
  return false;
}

// Exported voor unit-tests (state/__tests__/reducer.test.ts).
export function reducer(doc: CircuitDoc, action: Action): CircuitDoc {
  switch (action.t) {
    case "addComponent": {
      const def = COMPONENT_DEFS[action.type];
      const half = TERMINAL_SPAN / 2;
      const vertices = {
        ...doc.vertices,
        [action.v0]: { id: action.v0, x: action.cx - half, y: action.cy },
        [action.v1]: { id: action.v1, x: action.cx + half, y: action.cy },
      };
      const comp: CircuitComponent = {
        id: action.id,
        type: action.type,
        v0: action.v0,
        v1: action.v1,
        mirrored: false,
        values: { ...def.defaults },
      };
      return { ...doc, vertices, components: [...doc.components, comp] };
    }
    case "addAnalogMeter": {
      const def = COMPONENT_DEFS[action.type];
      const offs = analogPortOffsets();
      const vertices = { ...doc.vertices };
      action.portIds.forEach((pid, i) => {
        vertices[pid] = { id: pid, x: action.cx + offs[i].x, y: action.cy + offs[i].y };
      });
      const comp: CircuitComponent = {
        id: action.id,
        type: action.type,
        v0: action.portIds[0],
        v1: action.portIds[1],
        mirrored: false,
        values: { ...def.defaults },
        cx: action.cx,
        cy: action.cy,
        ports: action.portIds,
      };
      return { ...doc, vertices, components: [...doc.components, comp] };
    }
    case "moveAnalogMeter": {
      const comp = doc.components.find((c) => c.id === action.id);
      if (!comp || !comp.ports) return doc;
      const offs = analogPortOffsets();
      const vertices = { ...doc.vertices };
      comp.ports.forEach((pid, i) => {
        const v = vertices[pid];
        if (v) vertices[pid] = { ...v, x: action.cx + offs[i].x, y: action.cy + offs[i].y };
      });
      const components = doc.components.map((c) =>
        c.id === action.id ? { ...c, cx: action.cx, cy: action.cy } : c,
      );
      return { ...doc, vertices, components };
    }
    case "moveComponent": {
      const comp = doc.components.find((c) => c.id === action.id);
      if (!comp) return doc;
      let next = setVertex(doc, comp.v0, action.p0.x, action.p0.y);
      next = setVertex(next, comp.v1, action.p1.x, action.p1.y);
      return next;
    }
    case "moveVertex":
      return setVertex(doc, action.vid, action.x, action.y);
    case "rotateComponent": {
      const comp = doc.components.find((c) => c.id === action.id);
      if (!comp) return doc;
      const a = doc.vertices[comp.v0];
      const b = doc.vertices[comp.v1];
      if (!a || !b) return doc;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const rot = (p: Vertex) => ({ x: cx - (p.y - cy), y: cy + (p.x - cx) }); // 90°
      const na = rot(a);
      const nb = rot(b);
      return {
        ...doc,
        vertices: {
          ...doc.vertices,
          [comp.v0]: { ...a, x: na.x, y: na.y },
          [comp.v1]: { ...b, x: nb.x, y: nb.y },
        },
      };
    }
    case "mirrorComponent":
      return {
        ...doc,
        components: doc.components.map((c) =>
          c.id === action.id ? { ...c, mirrored: !c.mirrored } : c,
        ),
      };
    case "reversePolarity":
      // Wissel anode/kathode (v0↔v1) zonder de vertices/draden te verplaatsen —
      // keert de LED elektrisch én in het symbool om.
      return {
        ...doc,
        components: doc.components.map((c) =>
          c.id === action.id ? { ...c, v0: c.v1, v1: c.v0 } : c,
        ),
      };
    case "setValue":
      return {
        ...doc,
        components: doc.components.map((c) =>
          c.id === action.id ? { ...c, values: { ...c.values, ...action.patch } } : c,
        ),
      };
    case "duplicateComponent": {
      // Kopieer een component (met waarden) iets verderop; draden gaan niet mee.
      const src = doc.components.find((c) => c.id === action.id);
      if (!src) return doc;
      const OFF = 36;
      const vertices = { ...doc.vertices };
      let copy: CircuitComponent;
      if (src.ports && action.newPortIds) {
        const offs = analogPortOffsets();
        const cx = (src.cx ?? 0) + OFF;
        const cy = (src.cy ?? 0) + OFF;
        action.newPortIds.forEach((pid, i) => {
          vertices[pid] = { id: pid, x: cx + offs[i].x, y: cy + offs[i].y };
        });
        copy = {
          ...src,
          id: action.newId,
          v0: action.newPortIds[0],
          v1: action.newPortIds[1],
          ports: action.newPortIds,
          cx,
          cy,
          values: { ...src.values },
        };
      } else {
        const a = doc.vertices[src.v0];
        const b = doc.vertices[src.v1];
        if (!a || !b) return doc;
        vertices[action.newV0] = { id: action.newV0, x: a.x + OFF, y: a.y + OFF };
        vertices[action.newV1] = { id: action.newV1, x: b.x + OFF, y: b.y + OFF };
        copy = {
          ...src,
          id: action.newId,
          v0: action.newV0,
          v1: action.newV1,
          values: { ...src.values },
        };
      }
      return { ...doc, vertices, components: [...doc.components, copy] };
    }
    case "deleteComponent":
      // Draden blijven liggen (hun uiteinde wordt een vrij punt); alleen
      // verweesde vertices worden opgeruimd.
      return pruneVertices({
        ...doc,
        components: doc.components.filter((c) => c.id !== action.id),
      });
    case "addWire": {
      const vertices = {
        ...doc.vertices,
        [action.newVid]: { id: action.newVid, x: action.x, y: action.y },
      };
      return {
        ...doc,
        vertices,
        wires: [...doc.wires, { id: action.wireId, nodes: [action.from, action.newVid] }],
      };
    }
    case "insertWaypoint": {
      const vertices = {
        ...doc.vertices,
        [action.newVid]: { id: action.newVid, x: action.x, y: action.y },
      };
      const wires = doc.wires.map((w) => {
        if (w.id !== action.wireId) return w;
        const nodes = [...w.nodes];
        nodes.splice(action.segIndex + 1, 0, action.newVid);
        return { ...w, nodes };
      });
      return { ...doc, vertices, wires };
    }
    case "mergeVertex": {
      const components = doc.components.map((c) => ({
        ...c,
        v0: c.v0 === action.drop ? action.keep : c.v0,
        v1: c.v1 === action.drop ? action.keep : c.v1,
        ports: c.ports?.map((p) => (p === action.drop ? action.keep : p)),
      }));
      const wires = doc.wires
        .map((w) => ({ ...w, nodes: collapse(w.nodes.map((n) => (n === action.drop ? action.keep : n))) }))
        .filter((w) => w.nodes.length >= 2);
      const vertices = { ...doc.vertices };
      delete vertices[action.drop];
      return pruneVertices({ ...doc, components, wires, vertices });
    }
    case "detachComponent": {
      const comp = doc.components.find((c) => c.id === action.id);
      if (!comp) return doc;
      const vertices = { ...doc.vertices };
      const ids = action.newVertexIds;

      if (comp.ports) {
        // Analoge meter: elke bedrade poort krijgt een eigen (nieuwe) vertex; de
        // draad blijft op de oude vertex liggen → verbinding verbroken.
        const offs = analogPortOffsets();
        const cx = comp.cx ?? 0;
        const cy = comp.cy ?? 0;
        const newPorts = comp.ports.map((pid, i) => {
          if (!referencedElsewhere(doc, pid, comp.id)) return pid;
          const nid = ids[i];
          vertices[nid] = { id: nid, x: cx + offs[i].x, y: cy + offs[i].y };
          return nid;
        });
        const components = doc.components.map((c) =>
          c.id === comp.id ? { ...c, ports: newPorts, v0: newPorts[0], v1: newPorts[1] } : c,
        );
        return { ...doc, vertices, components };
      }

      let v0 = comp.v0;
      let v1 = comp.v1;
      if (referencedElsewhere(doc, comp.v0, comp.id)) {
        const src = doc.vertices[comp.v0];
        vertices[ids[0]] = { id: ids[0], x: src.x, y: src.y };
        v0 = ids[0];
      }
      if (referencedElsewhere(doc, comp.v1, comp.id)) {
        const src = doc.vertices[comp.v1];
        vertices[ids[1]] = { id: ids[1], x: src.x, y: src.y };
        v1 = ids[1];
      }
      const components = doc.components.map((c) => (c.id === comp.id ? { ...c, v0, v1 } : c));
      return { ...doc, vertices, components };
    }
    case "setAnalogRange": {
      // Verplaats de draad van de huidige rode poort naar de gekozen rode poort
      // (poort-index 0..2 → ports[1..3]). Zo wissel je makkelijk van bereik.
      const comp = doc.components.find((c) => c.id === action.id);
      if (!comp || !comp.ports) return doc;
      const act = activeRange(doc, comp);
      if (!act) return doc; // nog niets op een rode poort aangesloten
      const oldPortId = comp.ports[act.index + 1];
      const newPortId = comp.ports[action.rangeIndex + 1];
      if (!newPortId || oldPortId === newPortId) return doc;
      const wires = doc.wires.map((w) =>
        w.nodes.includes(oldPortId)
          ? { ...w, nodes: collapse(w.nodes.map((n) => (n === oldPortId ? newPortId : n))) }
          : w,
      );
      return { ...doc, wires };
    }
    case "deleteWire":
      return pruneVertices({ ...doc, wires: doc.wires.filter((w) => w.id !== action.id) });
    case "cutNode": {
      // Maak álle aansluitingen op deze knoop los. Eerst draden splitsen waar de
      // knoop een knikpunt (middenin) is, zodat hij overal een uiteinde wordt;
      // daarna krijgt elk uiteinde behalve het eerste een eigen (uitgewaaierde) vertex.
      const { vid, newVertexIds, newWireIds } = action;
      const pos = doc.vertices[vid];
      if (!pos || newVertexIds.length === 0) return doc;

      // 1. Splits draden bij een interne voorkomen van vid.
      let wi = 0;
      const splitWires: typeof doc.wires = [];
      for (const w of doc.wires) {
        const pieces: string[][] = [];
        let cur: string[] = [w.nodes[0]];
        for (let i = 1; i < w.nodes.length; i++) {
          cur.push(w.nodes[i]);
          if (w.nodes[i] === vid && i < w.nodes.length - 1) {
            pieces.push(cur);
            cur = [vid];
          }
        }
        pieces.push(cur);
        if (pieces.length === 1) splitWires.push(w);
        else pieces.forEach((nodes, idx) => splitWires.push({ id: idx === 0 ? w.id : newWireIds[wi++], nodes }));
      }

      // 2. Herverdeel de uiteinden. Is vid een poort van een analoge meter, dan is
      // die meter rigide → hij hóudt de knoop en al het andere (draden) waaiert uit.
      // Anders blijft de eerste aansluiting op vid en waaiert de rest uit.
      const portOwner = doc.components.find((c) => c.ports?.includes(vid));
      const total = newVertexIds.length;
      const newVertices = { ...doc.vertices };
      let used = 0;
      let first = !portOwner; // met een rigide anker blijft niets anders op vid
      const next = (): string => {
        if (first) {
          first = false;
          return vid;
        }
        const nv = newVertexIds[used];
        const ang = ((used + 0.5) / total) * Math.PI * 2;
        newVertices[nv] = { id: nv, x: pos.x + Math.cos(ang) * 34, y: pos.y + Math.sin(ang) * 34 };
        used++;
        return nv;
      };
      const components = doc.components.map((c) => {
        if (c.id === portOwner?.id) return c; // rigide meter: houdt zijn poort op vid
        let v0 = c.v0;
        let v1 = c.v1;
        if (v0 === vid) v0 = next();
        if (v1 === vid) v1 = next();
        return v0 === c.v0 && v1 === c.v1 ? c : { ...c, v0, v1 };
      });
      const wires = splitWires.map((w) =>
        w.nodes.includes(vid)
          ? { ...w, nodes: w.nodes.map((n) => (n === vid ? next() : n)) }
          : w,
      );
      return { ...doc, vertices: newVertices, components, wires };
    }
    case "deleteMany": {
      // Groepsverwijdering uit het selectiekader: alles in één undo-stap.
      const cs = new Set(action.components);
      const ws = new Set(action.wires);
      const ls = new Set(action.labels);
      return pruneVertices({
        ...doc,
        components: doc.components.filter((c) => !cs.has(c.id)),
        wires: doc.wires.filter((w) => !ws.has(w.id)),
        labels: (doc.labels ?? []).filter((l) => !ls.has(l.id)),
      });
    }
    case "mergeFragment":
      // Plak een (al hernummerd) fragment erbij — voor groep-dupliceren.
      return {
        ...doc,
        vertices: { ...doc.vertices, ...action.frag.vertices },
        components: [...doc.components, ...action.frag.components],
        wires: [...doc.wires, ...action.frag.wires],
        labels: [...(doc.labels ?? []), ...(action.frag.labels ?? [])],
      };
    case "moveGroup": {
      // Groep verplaatsen: alle vertices/meters/labels basis + (dx,dy).
      const vertices = { ...doc.vertices };
      for (const [vid, p] of Object.entries(action.vertices)) {
        const v = vertices[vid];
        if (v) vertices[vid] = { ...v, x: p.x + action.dx, y: p.y + action.dy };
      }
      const components = doc.components.map((c) => {
        const base = action.analog[c.id];
        return base ? { ...c, cx: base.x + action.dx, cy: base.y + action.dy } : c;
      });
      const labels = (doc.labels ?? []).map((l) => {
        const base = action.labels[l.id];
        return base ? { ...l, x: base.x + action.dx, y: base.y + action.dy } : l;
      });
      return { ...doc, vertices, components, labels };
    }
    case "addLabel":
      return {
        ...doc,
        labels: [...(doc.labels ?? []), { id: action.id, x: action.x, y: action.y, text: action.text }],
      };
    case "moveLabel":
      return {
        ...doc,
        labels: (doc.labels ?? []).map((l) =>
          l.id === action.id ? { ...l, x: action.x, y: action.y } : l,
        ),
      };
    case "setLabelText":
      return {
        ...doc,
        labels: (doc.labels ?? []).map((l) => (l.id === action.id ? { ...l, text: action.text } : l)),
      };
    case "setLabelBoxed":
      return {
        ...doc,
        labels: (doc.labels ?? []).map((l) => (l.id === action.id ? { ...l, boxed: action.boxed } : l)),
      };
    case "deleteLabel":
      return { ...doc, labels: (doc.labels ?? []).filter((l) => l.id !== action.id) };
    case "load":
      return action.doc;
    case "reset":
      return EMPTY_DOC;
    default:
      return doc;
  }
}

/** Hernummer alle id's (vertices/componenten/draden/poorten) naar verse makeId's,
 *  zodat een ingeladen schakeling nooit botst met later gegenereerde id's. */
export function remapDoc(doc: CircuitDoc): CircuitDoc {
  const map = new Map<string, string>();
  const id = (old: string): string => {
    let v = map.get(old);
    if (!v) {
      v = makeId("v");
      map.set(old, v);
    }
    return v;
  };
  const vertices: Record<string, Vertex> = {};
  for (const v of Object.values(doc.vertices)) {
    const nid = id(v.id);
    vertices[nid] = { ...v, id: nid };
  }
  const components = doc.components.map((c) => ({
    ...c,
    id: makeId("c"),
    v0: id(c.v0),
    v1: id(c.v1),
    ports: c.ports?.map((p) => id(p)),
  }));
  const wires = doc.wires.map((w) => ({ id: makeId("w"), nodes: w.nodes.map((n) => id(n)) }));
  const labels = (doc.labels ?? []).map((l) => ({ ...l, id: makeId("t") }));
  return { vertices, components, wires, labels };
}

// ---- Undo/redo: history-omhulsel rond de reducer ----

export interface HistoryState {
  past: CircuitDoc[];
  present: CircuitDoc;
  future: CircuitDoc[];
  /** Sleutel om opeenvolgende sleep-stappen samen te vouwen tot één undo-stap. */
  lastKey: string | null;
}

const MAX_HISTORY = 100;

/** Sleep-acties (continu tijdens één sleep) → coalescen tot één undo-stap. */
function coalesceKey(action: Action): string | null {
  switch (action.t) {
    case "moveComponent":
      return `mc:${action.id}`;
    case "moveVertex":
      return `mv:${action.vid}`;
    case "moveAnalogMeter":
      return `ma:${action.id}`;
    case "setValue":
      return `sv:${action.id}`; // opeenvolgende waarde-wijzigingen (slider) = 1 stap
    case "moveLabel":
      return `tl:${action.id}`;
    case "moveGroup":
      return "gm"; // hele groepssleep = 1 undo-stap (commit sluit het gebaar af)
    case "setLabelText":
      return `lt:${action.id}`; // typen = 1 undo-stap per bewerksessie
    default:
      return null; // elke andere actie = een losse undo-stap
  }
}

export function historyReducer(state: HistoryState, action: Action): HistoryState {
  if (action.t === "undo") {
    if (state.past.length === 0) return state;
    const present = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      present,
      future: [state.present, ...state.future],
      lastKey: null,
    };
  }
  if (action.t === "redo") {
    if (state.future.length === 0) return state;
    const present = state.future[0];
    return {
      past: [...state.past, state.present],
      present,
      future: state.future.slice(1),
      lastKey: null,
    };
  }
  if (action.t === "commit") {
    // Gebaar afgesloten: volgende wijziging start een nieuwe undo-stap.
    return state.lastKey === null ? state : { ...state, lastKey: null };
  }

  const next = reducer(state.present, action);
  if (next === state.present) return state; // geen wijziging → niets vastleggen

  const key = coalesceKey(action);
  if (key !== null && key === state.lastKey) {
    // Vervolg van dezelfde sleep: vervang de huidige staat, geen nieuwe stap.
    return { ...state, present: next, future: [] };
  }
  const past = [...state.past, state.present];
  if (past.length > MAX_HISTORY) past.shift();
  return { past, present: next, future: [], lastKey: key };
}

export const INITIAL_HISTORY: HistoryState = { past: [], present: EMPTY_DOC, future: [], lastKey: null };

export function useCircuit() {
  const [history, dispatch] = useReducer(historyReducer, INITIAL_HISTORY);
  const doc = history.present;

  const addComponent = useCallback((type: ComponentType, cx: number, cy: number) => {
    const id = makeId("c");
    if (isAnalog(type)) {
      const portIds = [makeId("v"), makeId("v"), makeId("v"), makeId("v")];
      dispatch({ t: "addAnalogMeter", id, type, cx, cy, portIds });
    } else {
      dispatch({ t: "addComponent", id, type, v0: makeId("v"), v1: makeId("v"), cx, cy });
    }
    return id;
  }, []);
  const moveAnalogMeter = useCallback(
    (id: string, cx: number, cy: number) => dispatch({ t: "moveAnalogMeter", id, cx, cy }),
    [],
  );
  const moveComponent = useCallback(
    (id: string, p0: Pt, p1: Pt) => dispatch({ t: "moveComponent", id, p0, p1 }),
    [],
  );
  const moveVertex = useCallback(
    (vid: string, x: number, y: number) => dispatch({ t: "moveVertex", vid, x, y }),
    [],
  );
  const rotateComponent = useCallback((id: string) => dispatch({ t: "rotateComponent", id }), []);
  const mirrorComponent = useCallback((id: string) => dispatch({ t: "mirrorComponent", id }), []);
  const reversePolarity = useCallback((id: string) => dispatch({ t: "reversePolarity", id }), []);
  const setValue = useCallback(
    (id: string, patch: Partial<CircuitComponent["values"]>) =>
      dispatch({ t: "setValue", id, patch }),
    [],
  );
  const duplicateComponent = useCallback(
    (id: string): string => {
      const src = doc.components.find((c) => c.id === id);
      const newId = makeId("c");
      dispatch({
        t: "duplicateComponent",
        id,
        newId,
        newV0: makeId("v"),
        newV1: makeId("v"),
        newPortIds: src?.ports ? src.ports.map(() => makeId("v")) : undefined,
      });
      return newId;
    },
    [doc],
  );
  const deleteComponent = useCallback((id: string) => dispatch({ t: "deleteComponent", id }), []);
  const startWire = useCallback((from: string, x: number, y: number) => {
    const wireId = makeId("w");
    const newVid = makeId("v");
    dispatch({ t: "addWire", wireId, from, newVid, x, y });
    return { wireId, newVid };
  }, []);
  const insertWaypoint = useCallback(
    (wireId: string, segIndex: number, x: number, y: number) => {
      const newVid = makeId("v");
      dispatch({ t: "insertWaypoint", wireId, segIndex, newVid, x, y });
      return newVid;
    },
    [],
  );
  const mergeVertex = useCallback(
    (keep: string, drop: string) => dispatch({ t: "mergeVertex", keep, drop }),
    [],
  );
  const detachComponent = useCallback(
    (id: string) => {
      const comp = doc.components.find((c) => c.id === id);
      const n = comp?.ports ? comp.ports.length : 2;
      const newVertexIds = Array.from({ length: n }, () => makeId("v"));
      dispatch({ t: "detachComponent", id, newVertexIds });
    },
    [doc],
  );
  const setAnalogRange = useCallback(
    (id: string, rangeIndex: number) => dispatch({ t: "setAnalogRange", id, rangeIndex }),
    [],
  );
  const deleteWire = useCallback((id: string) => dispatch({ t: "deleteWire", id }), []);
  const cutNode = useCallback(
    (vid: string) => {
      // Tel de aansluit-uiteinden (segment-einden + component-terminals) op deze
      // knoop, plus het aantal interne voorkomens (knikpunten) die een draad-splitsing
      // vergen.
      // Een rigide analoge-meter-poort houdt de knoop → al het andere waaiert uit
      // (de meter telt dan niet als "blijver").
      const portOwner = doc.components.find((c) => c.ports?.includes(vid));
      let stubs = 0;
      let internal = 0;
      for (const c of doc.components) {
        if (c.id === portOwner?.id) continue; // rigide meter blijft op vid
        if (c.v0 === vid) stubs++;
        if (c.v1 === vid) stubs++;
      }
      for (const w of doc.wires) {
        for (let i = 0; i < w.nodes.length; i++) {
          if (w.nodes[i] !== vid) continue;
          if (i > 0) stubs++;
          if (i < w.nodes.length - 1) stubs++;
          if (i > 0 && i < w.nodes.length - 1) internal++;
        }
      }
      // Zonder anker blijft de eerste stub op vid; met een anker waaieren ze allemaal uit.
      const fanned = portOwner ? stubs : stubs - 1;
      if (fanned < 1) return;
      const newVertexIds = Array.from({ length: fanned }, () => makeId("v"));
      const newWireIds = Array.from({ length: internal }, () => makeId("w"));
      dispatch({ t: "cutNode", vid, newVertexIds, newWireIds });
    },
    [doc],
  );
  const deleteMany = useCallback(
    (sel: { components: string[]; wires: string[]; labels: string[] }) =>
      dispatch({ t: "deleteMany", components: sel.components, wires: sel.wires, labels: sel.labels }),
    [],
  );
  const duplicateMany = useCallback(
    (sel: { components: string[]; wires: string[]; labels: string[] }) => {
      const cs = new Set(sel.components);
      const ws = new Set(sel.wires);
      const ls = new Set(sel.labels);
      const comps = doc.components.filter((c) => cs.has(c.id));
      const wires = doc.wires.filter((w) => ws.has(w.id));
      const labels = (doc.labels ?? []).filter((l) => ls.has(l.id));
      if (!comps.length && !wires.length && !labels.length) return null;
      // Sub-doc van de selectie → verse id's → iets verschoven terugplakken.
      const used = new Set<string>();
      for (const c of comps) {
        used.add(c.v0);
        used.add(c.v1);
        c.ports?.forEach((p) => used.add(p));
      }
      for (const w of wires) w.nodes.forEach((n) => used.add(n));
      const vertices: Record<string, Vertex> = {};
      for (const id of used) if (doc.vertices[id]) vertices[id] = doc.vertices[id];
      const frag = remapDoc({ vertices, components: comps, wires, labels });
      const OFF = 36;
      for (const v of Object.values(frag.vertices)) {
        v.x += OFF;
        v.y += OFF;
      }
      frag.components = frag.components.map((c) =>
        c.ports ? { ...c, cx: (c.cx ?? 0) + OFF, cy: (c.cy ?? 0) + OFF } : c,
      );
      frag.labels = (frag.labels ?? []).map((l) => ({ ...l, x: l.x + OFF, y: l.y + OFF }));
      dispatch({ t: "mergeFragment", frag });
      return {
        components: frag.components.map((c) => c.id),
        wires: frag.wires.map((w) => w.id),
        labels: (frag.labels ?? []).map((l) => l.id),
      };
    },
    [doc],
  );
  const addLabel = useCallback((x: number, y: number, text: string): string => {
    const id = makeId("t");
    dispatch({ t: "addLabel", id, x, y, text });
    return id;
  }, []);
  const moveLabel = useCallback(
    (id: string, x: number, y: number) => dispatch({ t: "moveLabel", id, x, y }),
    [],
  );
  const setLabelText = useCallback(
    (id: string, text: string) => dispatch({ t: "setLabelText", id, text }),
    [],
  );
  const setLabelBoxed = useCallback(
    (id: string, boxed: boolean) => dispatch({ t: "setLabelBoxed", id, boxed }),
    [],
  );
  const moveGroup = useCallback(
    (payload: {
      vertices: Record<string, Pt>;
      analog: Record<string, Pt>;
      labels: Record<string, Pt>;
      dx: number;
      dy: number;
    }) => dispatch({ t: "moveGroup", ...payload }),
    [],
  );
  const deleteLabel = useCallback((id: string) => dispatch({ t: "deleteLabel", id }), []);
  const reset = useCallback(() => dispatch({ t: "reset" }), []);
  const loadDoc = useCallback((incoming: CircuitDoc) => dispatch({ t: "load", doc: remapDoc(incoming) }), []);
  const undo = useCallback(() => dispatch({ t: "undo" }), []);
  const redo = useCallback(() => dispatch({ t: "redo" }), []);
  const commit = useCallback(() => dispatch({ t: "commit" }), []);

  return {
    doc,
    undo,
    redo,
    commit,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    addComponent,
    moveAnalogMeter,
    moveComponent,
    moveVertex,
    rotateComponent,
    mirrorComponent,
    reversePolarity,
    setValue,
    duplicateComponent,
    deleteComponent,
    startWire,
    insertWaypoint,
    mergeVertex,
    detachComponent,
    setAnalogRange,
    deleteWire,
    cutNode,
    deleteMany,
    duplicateMany,
    moveGroup,
    addLabel,
    moveLabel,
    setLabelText,
    setLabelBoxed,
    deleteLabel,
    reset,
    loadDoc,
  };
}
