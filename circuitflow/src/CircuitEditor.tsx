import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { COMPONENT_DEFS } from "@/model/componentDefs";
import { componentGeom, dist, nearestSnap, resolveVertex, type Pt } from "@/model/geometry";
import { computeFlows } from "@/model/flows";
import { LED_IMAX } from "@/model/ledSpec";
import { activeRange, ANALOG_H, ANALOG_SPEC, ANALOG_W, isAnalog } from "@/model/meterSpec";
import { toNetlist } from "@/model/netlist";
import { sweepIU, sweepLedColors } from "@/model/sweep";
import type { CircuitDoc, ComponentType } from "@/model/types";
import { docToJson, exportPng, jsonToDoc, sharePayloadFromHash } from "@/lib/io";
import { GraphPanel } from "@/ui/GraphPanel";
import { ValuesTable } from "@/ui/ValuesTable";
import { CanvasOverlay, type FlowMode } from "@/render/CanvasOverlay";
import { AnalogMeter } from "@/render/svg/AnalogMeter";
import { CircuitSvg, type MultiSelection, type Selection } from "@/render/svg/CircuitSvg";
import { ComponentSymbol } from "@/render/svg/Symbols";
import { solve } from "@/sim";
import { ContextPanel } from "@/ui/ContextPanel";
import { InstrumentRail } from "@/ui/InstrumentRail";
import { Toolbar } from "@/ui/Toolbar";
import { useCircuit } from "@/state/useCircuit";

interface View {
  s: number;
  tx: number;
  ty: number;
}

type Drag =
  | {
      type: "move";
      id: string;
      v0: string;
      v1: string;
      orig0: Pt;
      orig1: Pt;
      startW: Pt;
      analog?: boolean;
      ocx?: number;
      ocy?: number;
    }
  | { type: "wire"; wireId: string; newVid: string; fromVid: string; fromPos: Pt }
  | { type: "vertex"; vid: string; startW: Pt }
  | { type: "bend"; wireId: string; segIndex: number; startW: Pt; vid: string | null }
  | { type: "pan"; startX: number; startY: number; startTx: number; startTy: number }
  | { type: "place"; ctype: ComponentType }
  | { type: "labelmove"; id: string; startW: Pt; ox: number; oy: number }
  | { type: "marquee"; startW: Pt }
  | {
      type: "groupmove";
      startW: Pt;
      vertices: Record<string, Pt>;
      analog: Record<string, Pt>;
      labels: Record<string, Pt>;
    };

const MIN_S = 0.35;
const MAX_S = 3;

/** Wat valt er binnen het selectiekader? Component = beide terminals erin
 *  (analoge meter: het middelpunt), draad = alle knopen erin, label = ankerpunt. */
function marqueeHits(doc: CircuitDoc, a: Pt, b: Pt): MultiSelection | null {
  const x1 = Math.min(a.x, b.x);
  const x2 = Math.max(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const y2 = Math.max(a.y, b.y);
  const inside = (p: { x: number; y: number } | null | undefined) =>
    !!p && p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;

  const components = new Set<string>();
  for (const c of doc.components) {
    if (c.ports) {
      if (inside({ x: c.cx ?? 0, y: c.cy ?? 0 })) components.add(c.id);
    } else if (inside(doc.vertices[c.v0]) && inside(doc.vertices[c.v1])) {
      components.add(c.id);
    }
  }
  const wires = new Set<string>();
  for (const w of doc.wires) {
    if (w.nodes.every((n) => inside(doc.vertices[n]))) wires.add(w.id);
  }
  const labels = new Set<string>();
  for (const l of doc.labels ?? []) if (inside(l)) labels.add(l.id);

  if (!components.size && !wires.size && !labels.size) return null;
  return { components, wires, labels };
}
const BEND_THRESHOLD = 5; // wereld-px voordat een segment-sleep een knikpunt maakt

export function CircuitEditor() {
  const circuit = useCircuit();
  const { doc } = circuit;
  const result = useMemo(() => solve(toNetlist(doc)), [doc]);
  const flows = useMemo(() => computeFlows(doc, result), [doc, result]);

  // Doorbranden: een LED boven de doorbrandstroom (of een zekering boven zijn
  // nominale stroom) licht/vonkt eerst kort en gaat dan uit (permanent open tot
  // vervangen). Grijpt de leerling op tijd in, dan overleeft het onderdeel.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const c of doc.components) {
      const i = result.elementCurrents.get(c.id) ?? 0;
      if (!Number.isFinite(i)) continue;
      if (c.type === "led" && !c.values.burned && Math.abs(i) > LED_IMAX) {
        timers.push(setTimeout(() => circuit.setValue(c.id, { burned: true }), 260));
      } else if (c.type === "fuse" && !c.values.blown && Math.abs(i) > (c.values.imax ?? 1)) {
        timers.push(setTimeout(() => circuit.setValue(c.id, { blown: true }), 220));
      }
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);
  const [mode, setMode] = useState<FlowMode>("conventional");
  const [schematic, setSchematic] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [task, setTask] = useState<string | null>(null);
  const [graphId, setGraphId] = useState<string | null>(null);
  const graphComp = doc.components.find((c) => c.id === graphId) ?? null;
  // LED → alle kleuren naast elkaar (elk hun eigen knie); anders één curve.
  const graphCurves = useMemo(() => {
    if (!graphId) return [];
    const comp = doc.components.find((c) => c.id === graphId);
    if (!comp) return [];
    if (comp.type === "led") {
      return sweepLedColors(doc, graphId).map((c) => ({
        label: c.label,
        color: c.hex,
        sweep: c.sweep,
        active: c.active,
      }));
    }
    const s = sweepIU(doc, graphId);
    return s ? [{ label: COMPONENT_DEFS[comp.type].label, sweep: s, active: true }] : [];
  }, [doc, graphId]);

  const [view, setViewState] = useState<View>({ s: 1, tx: 0, ty: 0 });
  const [selection, setSelection] = useState<Selection>(null);
  // Selectiekader (rubber band) + de groepsselectie die eruit volgt.
  const [marquee, setMarquee] = useState<{ a: Pt; b: Pt } | null>(null);
  const [multiSel, setMultiSel] = useState<MultiSelection | null>(null);
  const [snapTargetId, setSnapTargetId] = useState<string | null>(null);
  const [placing, setPlacing] = useState<{ type: ComponentType; x: number; y: number } | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  // De toets "T" moet een label toevoegen; de handler staat in een mount-effect,
  // dus via een ref (onAddLabel wordt verderop gedefinieerd).
  const onAddLabelRef = useRef<() => void>(() => {});
  // Groepsselectie ook leesbaar in de stabiele pointer-handlers.
  const multiSelRef = useRef<MultiSelection | null>(null);
  const docRef = useRef(doc);
  const viewRef = useRef(view);
  // useCircuit geeft elke render een nieuw object terug; via een ref houden we de
  // globale pointer-listeners stabiel (mount-only) i.p.v. ze elke render opnieuw
  // te abonneren.
  const circuitRef = useRef(circuit);
  docRef.current = doc;
  circuitRef.current = circuit;
  multiSelRef.current = multiSel;

  // Herstel bij openen: een deellink (#c=…) wint van de lokale autosave.
  useEffect(() => {
    const shared = sharePayloadFromHash();
    if (shared) {
      circuitRef.current.loadDoc(shared.doc);
      if (shared.measure) setMeasureMode(true);
      if (shared.task) setTask(shared.task);
      return;
    }
    try {
      const raw = localStorage.getItem("cf-doc");
      if (raw) {
        const saved = jsonToDoc(raw);
        if (saved && (saved.components.length || saved.wires.length)) {
          circuitRef.current.loadDoc(saved);
        }
      }
    } catch {
      /* localStorage kan geblokkeerd zijn */
    }
  }, []);

  // Autosave (licht gedebounced) zodat een refresh geen werk kost.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem("cf-doc", docToJson(doc));
      } catch {
        /* quota/blokkade: stilzwijgend overslaan */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [doc]);

  // Toast-melding (deellink gekopieerd, ongeldig bestand, …) verdwijnt vanzelf.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const applyView = useCallback((next: View) => {
    viewRef.current = next;
    setViewState(next);
  }, []);

  const screenToWorld = useCallback((clientX: number, clientY: number): Pt => {
    const rect = svgRef.current?.getBoundingClientRect();
    const v = viewRef.current;
    const sx = clientX - (rect?.left ?? 0);
    const sy = clientY - (rect?.top ?? 0);
    return { x: (sx - v.tx) / v.s, y: (sy - v.ty) / v.s };
  }, []);

  const overSvg = useCallback((clientX: number, clientY: number): boolean => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return false;
    return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  }, []);

  // Sleep aan één lid van de groepsselectie = de héle groep verplaatsen.
  const startGroupMove = useCallback(
    (e: React.PointerEvent): boolean => {
      const sel = multiSelRef.current;
      if (!sel) return false;
      const d = docRef.current;
      const vertices: Record<string, Pt> = {};
      const analog: Record<string, Pt> = {};
      const labels: Record<string, Pt> = {};
      for (const c of d.components) {
        if (!sel.components.has(c.id)) continue;
        if (c.ports) {
          analog[c.id] = { x: c.cx ?? 0, y: c.cy ?? 0 };
          for (const p of c.ports) {
            const v = d.vertices[p];
            if (v) vertices[p] = { x: v.x, y: v.y };
          }
        } else {
          for (const vid of [c.v0, c.v1]) {
            const v = d.vertices[vid];
            if (v) vertices[vid] = { x: v.x, y: v.y };
          }
        }
      }
      for (const w of d.wires) {
        if (!sel.wires.has(w.id)) continue;
        for (const n of w.nodes) {
          const v = d.vertices[n];
          if (v) vertices[n] = { x: v.x, y: v.y };
        }
      }
      for (const l of d.labels ?? []) {
        if (sel.labels.has(l.id)) labels[l.id] = { x: l.x, y: l.y };
      }
      dragRef.current = {
        type: "groupmove",
        startW: screenToWorld(e.clientX, e.clientY),
        vertices,
        analog,
        labels,
      };
      return true;
    },
    [screenToWorld],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Globale pointer-afhandeling tijdens een drag (leest refs → geen stale closures).
  useEffect(() => {
    const moveVertexSnapped = (vid: string, w: Pt, exclude: Set<string>) => {
      const snap = nearestSnap(docRef.current, w, exclude);
      setSnapTargetId(snap?.id ?? null);
      const p = snap ? snap.pos : w;
      circuitRef.current.moveVertex(vid, p.x, p.y);
    };

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.type === "place") {
        setPlacing((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : p));
        return;
      }
      const w = screenToWorld(e.clientX, e.clientY);
      if (drag.type === "move") {
        const dx = w.x - drag.startW.x;
        const dy = w.y - drag.startW.y;
        if (drag.analog) {
          circuitRef.current.moveAnalogMeter(drag.id, (drag.ocx ?? 0) + dx, (drag.ocy ?? 0) + dy);
        } else {
          const p0 = { x: drag.orig0.x + dx, y: drag.orig0.y + dy };
          const p1 = { x: drag.orig1.x + dx, y: drag.orig1.y + dy };
          circuitRef.current.moveComponent(drag.id, p0, p1);
          const ex = new Set([drag.v0, drag.v1]);
          const s0 = nearestSnap(docRef.current, p0, ex);
          const s1 = nearestSnap(docRef.current, p1, ex);
          setSnapTargetId(s0?.id ?? s1?.id ?? null);
        }
      } else if (drag.type === "labelmove") {
        circuitRef.current.moveLabel(drag.id, drag.ox + (w.x - drag.startW.x), drag.oy + (w.y - drag.startW.y));
      } else if (drag.type === "groupmove") {
        circuitRef.current.moveGroup({
          vertices: drag.vertices,
          analog: drag.analog,
          labels: drag.labels,
          dx: w.x - drag.startW.x,
          dy: w.y - drag.startW.y,
        });
      } else if (drag.type === "marquee") {
        setMarquee({ a: drag.startW, b: w });
      } else if (drag.type === "pan") {
        applyView({
          s: viewRef.current.s,
          tx: drag.startTx + (e.clientX - drag.startX),
          ty: drag.startTy + (e.clientY - drag.startY),
        });
      } else if (drag.type === "wire") {
        moveVertexSnapped(drag.newVid, w, new Set([drag.newVid, drag.fromVid]));
      } else if (drag.type === "vertex") {
        moveVertexSnapped(drag.vid, w, new Set([drag.vid]));
      } else if (drag.type === "bend") {
        if (drag.vid === null) {
          if (dist(drag.startW, w) < BEND_THRESHOLD) return;
          const vid = circuitRef.current.insertWaypoint(
            drag.wireId,
            drag.segIndex,
            drag.startW.x,
            drag.startW.y,
          );
          drag.vid = vid;
        }
        moveVertexSnapped(drag.vid, w, new Set([drag.vid]));
      }
    };

    const onUp = (e: PointerEvent) => {
      // Einde van elk gebaar: sluit de undo-samenvouwing af (sleep/slider = 1 stap).
      circuitRef.current.commit();
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) {
        setSnapTargetId(null);
        return;
      }
      const w = screenToWorld(e.clientX, e.clientY);
      if (drag.type === "move" && drag.analog) {
        // Analoge meter: alleen verplaatst (al via moveAnalogMeter), geen snap/toggle.
      } else if (drag.type === "move") {
        // Alleen snappen als er echt versleept is (een tik = enkel selecteren).
        if (dist(drag.startW, w) >= 4) {
          const dx = w.x - drag.startW.x;
          const dy = w.y - drag.startW.y;
          const p0 = { x: drag.orig0.x + dx, y: drag.orig0.y + dy };
          const p1 = { x: drag.orig1.x + dx, y: drag.orig1.y + dy };
          const ex = new Set([drag.v0, drag.v1]);
          const s0 = nearestSnap(docRef.current, p0, ex);
          if (s0) ex.add(s0.id);
          const s1 = nearestSnap(docRef.current, p1, ex);
          if (s0) circuitRef.current.mergeVertex(s0.id, drag.v0);
          if (s1 && s1.id !== drag.v0) circuitRef.current.mergeVertex(s1.id, drag.v1);
        } else {
          // Tik (geen sleep) op een schakelaar → open/dicht togglen.
          const comp = docRef.current.components.find((c) => c.id === drag.id);
          if (comp?.type === "switch") {
            circuitRef.current.setValue(drag.id, { closed: !(comp.values.closed ?? true) });
          }
        }
      } else if (drag.type === "wire") {
        const snap = nearestSnap(docRef.current, w, new Set([drag.newVid, drag.fromVid]));
        if (snap) circuitRef.current.mergeVertex(snap.id, drag.newVid);
        else if (dist(drag.fromPos, w) < 8) circuitRef.current.deleteWire(drag.wireId);
      } else if (drag.type === "vertex") {
        if (dist(drag.startW, w) >= 4) {
          const snap = nearestSnap(docRef.current, w, new Set([drag.vid]));
          if (snap) circuitRef.current.mergeVertex(snap.id, drag.vid);
        }
      } else if (drag.type === "bend" && drag.vid) {
        const snap = nearestSnap(docRef.current, w, new Set([drag.vid]));
        if (snap) circuitRef.current.mergeVertex(snap.id, drag.vid);
      } else if (drag.type === "place") {
        if (overSvg(e.clientX, e.clientY)) {
          const id = circuitRef.current.addComponent(drag.ctype, w.x, w.y);
          setSelection({ kind: "component", id });
        }
        setPlacing(null);
      } else if (drag.type === "marquee") {
        setMarquee(null);
        if (dist(drag.startW, w) >= 6) setMultiSel(marqueeHits(docRef.current, drag.startW, w));
      }
      setSnapTargetId(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // Mount-only: alle veranderlijke waarden worden via refs gelezen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // Escape: deselecteren en panelen sluiten.
      if (e.key === "Escape") {
        setSelection(null);
        setMultiSel(null);
        setGraphId(null);
        setEditingLabel(null);
        return;
      }

      // Groepsselectie: Delete verwijdert, Ctrl+D dupliceert de hele groep.
      if (multiSel) {
        const asArrays = {
          components: [...multiSel.components],
          wires: [...multiSel.wires],
          labels: [...multiSel.labels],
        };
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          circuit.deleteMany(asArrays);
          setMultiSel(null);
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
          e.preventDefault();
          const res = circuit.duplicateMany(asArrays);
          if (res) {
            setMultiSel({
              components: new Set(res.components),
              wires: new Set(res.wires),
              labels: new Set(res.labels),
            });
          }
          return;
        }
      }

      // Ongedaan maken / opnieuw (werkt zonder selectie).
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "z" && !e.shiftKey) {
          e.preventDefault();
          circuit.undo();
          setSelection(null);
          return;
        }
        if (k === "y" || (k === "z" && e.shiftKey)) {
          e.preventDefault();
          circuit.redo();
          setSelection(null);
          return;
        }
        if (k === "d") {
          e.preventDefault(); // browser-bladwijzer onderdrukken
          if (selection?.kind === "component") {
            const nid = circuit.duplicateComponent(selection.id);
            setSelection({ kind: "component", id: nid });
          }
          return;
        }
      }

      // T: nieuw tekstlabel (zelfde als de T-knop in de balk).
      if (e.key.toLowerCase() === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onAddLabelRef.current();
        return;
      }

      if (!selection) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selection.kind === "component") circuit.deleteComponent(selection.id);
        else if (selection.kind === "wire") circuit.deleteWire(selection.id);
        else if (selection.kind === "label") circuit.deleteLabel(selection.id);
        else return; // knoop-selectie: niets verwijderen
        setSelection(null);
        return;
      }

      // Pijltjestoetsen: waarde van het geselecteerde component bijstellen
      // (rechts/omhoog = groter, links/omlaag = kleiner; Shift = grovere stap).
      const dir =
        e.key === "ArrowRight" || e.key === "ArrowUp"
          ? 1
          : e.key === "ArrowLeft" || e.key === "ArrowDown"
            ? -1
            : 0;
      if (dir !== 0 && selection.kind === "component") {
        const comp = docRef.current.components.find((c) => c.id === selection.id);
        const def = comp && COMPONENT_DEFS[comp.type];
        if (!comp || !def || !def.valueKey) return;
        e.preventDefault();
        const step = (def.step ?? 1) * (e.shiftKey ? 10 : 1);
        const min = def.min ?? 0;
        const max = def.max ?? 0;
        const cur = comp.values[def.valueKey] ?? 0;
        const next = Math.min(max, Math.max(min, Number((cur + dir * step).toFixed(6))));
        if (next !== cur) circuit.setValue(comp.id, { [def.valueKey]: next });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [circuit, selection, multiSel]);

  // Eén ding tegelijk geselecteerd: een enkel-klik wist de groepsselectie.
  useEffect(() => {
    if (selection) setMultiSel(null);
  }, [selection]);

  // ---- pointer-down handlers ----
  const onComponentPointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (multiSelRef.current?.components.has(id) && startGroupMove(e)) return;
      setSelection({ kind: "component", id });
      const comp = docRef.current.components.find((c) => c.id === id);
      if (!comp) return;
      const startW = screenToWorld(e.clientX, e.clientY);
      if (isAnalog(comp.type)) {
        dragRef.current = {
          type: "move",
          id,
          v0: comp.v0,
          v1: comp.v1,
          orig0: { x: 0, y: 0 },
          orig1: { x: 0, y: 0 },
          startW,
          analog: true,
          ocx: comp.cx ?? 0,
          ocy: comp.cy ?? 0,
        };
        return;
      }
      const g = componentGeom(docRef.current, comp);
      if (!g) return;
      dragRef.current = { type: "move", id, v0: comp.v0, v1: comp.v1, orig0: g.c0, orig1: g.c1, startW };
    },
    [screenToWorld, startGroupMove],
  );

  const onTerminalPointerDown = useCallback(
    (vid: string, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      // Aantikken selecteert de knoop (→ knip/+-nubje verschijnt, ook op een
      // terminal met draden eraan); slepen tekent een nieuwe draad.
      setSelection({ kind: "vertex", id: vid });
      const from = resolveVertex(docRef.current, vid);
      if (!from) return;
      const { wireId, newVid } = circuit.startWire(vid, from.x, from.y);
      dragRef.current = { type: "wire", wireId, newVid, fromVid: vid, fromPos: from };
    },
    [circuit],
  );

  // Knoop slepen = altijd verplaatsen; aantikken = selecteren (dan verschijnt
  // het trek-nubje voor een nieuwe draad).
  const onVertexPointerDown = useCallback(
    (vid: string, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setSelection({ kind: "vertex", id: vid });
      dragRef.current = { type: "vertex", vid, startW: screenToWorld(e.clientX, e.clientY) };
    },
    [screenToWorld],
  );

  // Trek-nubje bij een geselecteerde knoop → start een nieuwe draad vanaf die knoop.
  const onVertexTabPointerDown = useCallback((vid: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const from = resolveVertex(docRef.current, vid);
    if (!from) return;
    const { wireId, newVid } = circuitRef.current.startWire(vid, from.x, from.y);
    dragRef.current = { type: "wire", wireId, newVid, fromVid: vid, fromPos: from };
  }, []);

  // Knip-knop bij een geselecteerde knoop → alle aansluitingen losmaken.
  const onCutNode = useCallback((vid: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    circuitRef.current.cutNode(vid);
    setSelection(null);
  }, []);

  // ---- tekstlabels ----
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const onLabelPointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (multiSelRef.current?.labels.has(id) && startGroupMove(e)) return;
      setSelection({ kind: "label", id });
      const l = (docRef.current.labels ?? []).find((x) => x.id === id);
      if (!l) return;
      dragRef.current = {
        type: "labelmove",
        id,
        startW: screenToWorld(e.clientX, e.clientY),
        ox: l.x,
        oy: l.y,
      };
    },
    [screenToWorld, startGroupMove],
  );
  const onLabelDoubleClick = useCallback((id: string) => setEditingLabel(id), []);
  const onAddLabel = useCallback(() => {
    // Plaats in het midden van het zichtbare canvas en open direct de editor.
    const v = viewRef.current;
    const wx = (size.w / 2 - v.tx) / v.s;
    const wy = (size.h / 2 - v.ty) / v.s;
    const id = circuitRef.current.addLabel(wx, wy, "");
    setSelection({ kind: "label", id });
    setEditingLabel(id);
  }, [size.w, size.h]);
  onAddLabelRef.current = onAddLabel;
  const closeLabelEditor = useCallback(() => {
    if (editingLabel) {
      const l = (docRef.current.labels ?? []).find((x) => x.id === editingLabel);
      if (l && !l.text.trim()) circuitRef.current.deleteLabel(editingLabel); // leeg = weg
      circuitRef.current.commit();
    }
    setEditingLabel(null);
  }, [editingLabel]);

  const onWireSegmentPointerDown = useCallback(
    (wireId: string, segIndex: number, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (multiSelRef.current?.wires.has(wireId) && startGroupMove(e)) return;
      setSelection({ kind: "wire", id: wireId });
      dragRef.current = {
        type: "bend",
        wireId,
        segIndex,
        startW: screenToWorld(e.clientX, e.clientY),
        vid: null,
      };
    },
    [screenToWorld, startGroupMove],
  );

  // Slepen op leeg canvas = selectiekader; pannen = Alt+slepen of middelste muisknop.
  const onBackgroundPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setSelection(null);
      setMultiSel(null);
      if (e.altKey || e.button === 1) {
        const v = viewRef.current;
        dragRef.current = { type: "pan", startX: e.clientX, startY: e.clientY, startTx: v.tx, startTy: v.ty };
      } else {
        dragRef.current = { type: "marquee", startW: screenToWorld(e.clientX, e.clientY) };
      }
    },
    [screenToWorld],
  );

  const onPalettePointerDown = useCallback((type: ComponentType, e: React.PointerEvent) => {
    e.preventDefault();
    setSelection(null);
    dragRef.current = { type: "place", ctype: type };
    setPlacing({ type, x: e.clientX, y: e.clientY });
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const v = viewRef.current;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const ns = Math.min(MAX_S, Math.max(MIN_S, v.s * factor));
      const wx = (mx - v.tx) / v.s;
      const wy = (my - v.ty) / v.s;
      applyView({ s: ns, tx: mx - wx * ns, ty: my - wy * ns });
    },
    [applyView],
  );

  const onReset = useCallback(() => {
    circuit.reset();
    setSelection(null);
    applyView({ s: 1, tx: 0, ty: 0 });
  }, [applyView, circuit]);

  // Zoom via de knoppen: gecentreerd op het canvasmidden.
  const zoomButton = useCallback(
    (factor: number) => {
      const v = viewRef.current;
      const cx = size.w / 2;
      const cy = size.h / 2;
      const ns = Math.min(MAX_S, Math.max(MIN_S, v.s * factor));
      const wx = (cx - v.tx) / v.s;
      const wy = (cy - v.ty) / v.s;
      applyView({ s: ns, tx: cx - wx * ns, ty: cy - wy * ns });
    },
    [applyView, size.w, size.h],
  );
  const resetView = useCallback(() => applyView({ s: 1, tx: 0, ty: 0 }), [applyView]);

  const onLoadDoc = useCallback(
    (d: CircuitDoc) => {
      circuit.loadDoc(d);
      setSelection(null);
      applyView({ s: 1, tx: 0, ty: 0 });
    },
    [applyView, circuit],
  );
  const onExportPng = useCallback(() => {
    setSelection(null); // selectie-UI niet in de export
    setTimeout(() => {
      if (svgRef.current) void exportPng(svgRef.current);
    }, 40);
  }, []);

  const gpad = 300;
  const gridRect = {
    x: -view.tx / view.s - gpad,
    y: -view.ty / view.s - gpad,
    w: size.w / view.s + 2 * gpad,
    h: size.h / view.s + 2 * gpad,
  };

  const selectedComp =
    selection?.kind === "component"
      ? doc.components.find((c) => c.id === selection.id) ?? null
      : null;
  const panelPos = (() => {
    if (!selectedComp) return null;
    const g = componentGeom(doc, selectedComp);
    if (!g) return null;
    // Klem binnen het canvas zodat het paneel (±240 breed, ±270 hoog) niet
    // buiten beeld valt bij componenten langs de rand.
    const x = Math.min(Math.max(g.center.x * view.s + view.tx, 130), Math.max(130, size.w - 130));
    const y = Math.min(Math.max(g.center.y * view.s + view.ty + 64, 8), Math.max(8, size.h - 280));
    return { x, y };
  })();

  // Meldingen (kortsluiting / conflict / onbepaald).
  const banner = result.shortedSources.length
    ? "Kortsluiting: de bron is kortgesloten."
    : result.conflicts.length
      ? "Bronnenconflict: parallelle bronnen met verschillende spanning."
      : !result.ok
        ? "Deze schakeling is onbepaald (bijv. ideale bronnen die elkaar tegenwerken)."
        : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar
        onPalettePointerDown={onPalettePointerDown}
        onReset={onReset}
        onUndo={circuit.undo}
        onRedo={circuit.redo}
        canUndo={circuit.canUndo}
        canRedo={circuit.canRedo}
        mode={mode}
        onModeChange={setMode}
        schematic={schematic}
        onSchematicChange={setSchematic}
        measureMode={measureMode}
        onMeasureModeChange={(m) => {
          setMeasureMode(m);
          if (m) {
            // Grafiek en tabel verklappen de te meten waarden.
            setGraphId(null);
            setShowTable(false);
          }
        }}
        showTable={showTable}
        onToggleTable={() => setShowTable((s) => !s)}
        onAddLabel={onAddLabel}
        doc={doc}
        onLoad={onLoadDoc}
        onExportPng={onExportPng}
        onNotify={setToast}
      />
      <div className="flex min-h-0 flex-1">
        <div ref={containerRef} className="relative min-w-0 flex-1 overflow-hidden cf-canvas">
          {doc.components.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <p className="rounded-xl bg-card/80 px-4 py-2 text-sm text-(--text-muted)">
                Sleep een component uit de balk hierboven om te beginnen
              </p>
            </div>
          )}
          {banner && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-lg bg-destructive px-3 py-1.5 text-sm font-semibold text-white shadow-lg">
              {banner}
            </div>
          )}
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ touchAction: "none", display: "block" }}
            onPointerDown={onBackgroundPointerDown}
            onWheel={onWheel}
          >
            <defs>
              <pattern id="cf-grid" width={28} height={28} patternUnits="userSpaceOnUse">
                <circle cx={1} cy={1} r={1} fill="var(--cf-grid)" />
              </pattern>
            </defs>
            <g transform={`translate(${view.tx} ${view.ty}) scale(${view.s})`}>
              <rect x={gridRect.x} y={gridRect.y} width={gridRect.w} height={gridRect.h} fill="url(#cf-grid)" />
              <CircuitSvg
                doc={doc}
                result={result}
                selection={selection}
                multi={multiSel}
                schematic={schematic}
                measureMode={measureMode}
                snapTargetId={snapTargetId}
                onComponentPointerDown={onComponentPointerDown}
                onTerminalPointerDown={onTerminalPointerDown}
                onWireSegmentPointerDown={onWireSegmentPointerDown}
                onVertexPointerDown={onVertexPointerDown}
                onVertexTabPointerDown={onVertexTabPointerDown}
                onCutNode={onCutNode}
                onLabelPointerDown={onLabelPointerDown}
                onLabelDoubleClick={onLabelDoubleClick}
              />
              {marquee && (
                <rect
                  x={Math.min(marquee.a.x, marquee.b.x)}
                  y={Math.min(marquee.a.y, marquee.b.y)}
                  width={Math.abs(marquee.b.x - marquee.a.x)}
                  height={Math.abs(marquee.b.y - marquee.a.y)}
                  fill="var(--cf-select)"
                  fillOpacity={0.08}
                  stroke="var(--cf-select)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  pointerEvents="none"
                />
              )}
            </g>
          </svg>

          <CanvasOverlay width={size.w} height={size.h} flows={flows} view={view} mode={mode} />

          {/* Groepsactie-balk bij een selectiekader-selectie */}
          {multiSel && (
            <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-(--border-solid) bg-card px-3 py-2 shadow-xl">
              <span className="text-sm font-medium text-(--text-primary)">
                {multiSel.components.size + multiSel.wires.size + multiSel.labels.size} geselecteerd
              </span>
              <button
                type="button"
                onClick={() => {
                  const res = circuit.duplicateMany({
                    components: [...multiSel.components],
                    wires: [...multiSel.wires],
                    labels: [...multiSel.labels],
                  });
                  if (res) {
                    setMultiSel({
                      components: new Set(res.components),
                      wires: new Set(res.wires),
                      labels: new Set(res.labels),
                    });
                  }
                }}
                className="rounded-md border border-(--border-solid) px-2.5 py-1 text-sm text-(--text-secondary) hover:bg-(--bg-card-hover)"
              >
                Dupliceren
              </button>
              <button
                type="button"
                onClick={() => {
                  circuit.deleteMany({
                    components: [...multiSel.components],
                    wires: [...multiSel.wires],
                    labels: [...multiSel.labels],
                  });
                  setMultiSel(null);
                }}
                className="rounded-md border border-(--border-solid) px-2.5 py-1 text-sm text-(--text-secondary) hover:bg-destructive hover:text-white"
              >
                Verwijderen
              </button>
              <span className="text-xs text-(--text-muted)">Esc = annuleren</span>
            </div>
          )}

          {/* Zoomknoppen (rechtsonder) */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center overflow-hidden rounded-lg border border-(--border-solid) bg-card shadow-sm">
            <button
              type="button"
              onClick={() => zoomButton(1 / 1.2)}
              aria-label="Uitzoomen"
              className="grid h-8 w-8 place-items-center text-(--text-secondary) hover:bg-(--bg-card-hover)"
            >
              <Minus size={15} />
            </button>
            <button
              type="button"
              onClick={resetView}
              title="Terug naar 100%"
              className="w-14 border-x border-(--border-solid) py-1.5 text-center text-xs tabular-nums text-(--text-secondary) hover:bg-(--bg-card-hover)"
            >
              {Math.round(view.s * 100)}%
            </button>
            <button
              type="button"
              onClick={() => zoomButton(1.2)}
              aria-label="Inzoomen"
              className="grid h-8 w-8 place-items-center text-(--text-secondary) hover:bg-(--bg-card-hover)"
            >
              <Plus size={15} />
            </button>
          </div>

          {selectedComp && panelPos && (
            <ContextPanel
              comp={selectedComp}
              x={panelPos.x}
              y={panelPos.y}
              onValue={(v) => {
                const key = COMPONENT_DEFS[selectedComp.type].valueKey;
                if (key) circuit.setValue(selectedComp.id, { [key]: v });
              }}
              onToggleClosed={() =>
                circuit.setValue(selectedComp.id, { closed: !(selectedComp.values.closed ?? true) })
              }
              onSetColor={(color) => circuit.setValue(selectedComp.id, { color })}
              onReplace={() =>
                circuit.setValue(
                  selectedComp.id,
                  selectedComp.type === "fuse" ? { blown: false } : { burned: false },
                )
              }
              onReverse={() => circuit.reversePolarity(selectedComp.id)}
              analogActiveIndex={
                isAnalog(selectedComp.type) ? (activeRange(doc, selectedComp)?.index ?? null) : null
              }
              onSetRange={(i) => circuit.setAnalogRange(selectedComp.id, i)}
              onRotate={() => circuit.rotateComponent(selectedComp.id)}
              onMirror={() => circuit.mirrorComponent(selectedComp.id)}
              onDetach={() => circuit.detachComponent(selectedComp.id)}
              onDelete={() => {
                circuit.deleteComponent(selectedComp.id);
                setSelection(null);
              }}
              onDuplicate={() => {
                const nid = circuit.duplicateComponent(selectedComp.id);
                setSelection({ kind: "component", id: nid });
              }}
              onGraph={() => setGraphId(selectedComp.id)}
              onToggleNonOhmic={() =>
                circuit.setValue(selectedComp.id, {
                  nonOhmic: !(selectedComp.values.nonOhmic ?? false),
                })
              }
              measureMode={measureMode}
            />
          )}

          {graphComp && (
            <GraphPanel
              title={COMPONENT_DEFS[graphComp.type].label}
              curves={graphCurves}
              onClose={() => setGraphId(null)}
            />
          )}

          {showTable && !measureMode && (
            <ValuesTable doc={doc} result={result} onClose={() => setShowTable(false)} />
          )}

          {task && (
            <div className="absolute left-3 top-3 z-20 w-[300px] rounded-xl border border-(--accent) bg-card p-3 shadow-xl">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-(--accent)">Opdracht</span>
                <button
                  type="button"
                  onClick={() => setTask(null)}
                  aria-label="Opdracht sluiten"
                  className="grid h-6 w-6 place-items-center rounded-md text-(--text-muted) hover:bg-(--bg-card-hover)"
                >
                  ✕
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm text-(--text-secondary)">{task}</p>
            </div>
          )}

          {toast && (
            <div className="pointer-events-none absolute bottom-16 left-1/2 z-30 -translate-x-1/2 rounded-lg bg-(--text-primary) px-3.5 py-2 text-sm font-medium text-(--bg-primary) shadow-lg">
              {toast}
            </div>
          )}

          {editingLabel &&
            (() => {
              const l = (doc.labels ?? []).find((x) => x.id === editingLabel);
              if (!l) return null;
              // Sluit alleen als de focus het kaartje echt verlaat (niet bij de checkbox).
              const onEditorBlur = (e: React.FocusEvent) => {
                const card = (e.currentTarget as HTMLElement).closest("[data-label-editor]");
                if (!card?.contains(e.relatedTarget as Node)) closeLabelEditor();
              };
              return (
                <div
                  data-label-editor
                  className="absolute z-30 w-64 rounded-xl border border-(--border-solid) bg-card p-2.5 shadow-xl"
                  style={{
                    left: Math.min(Math.max(l.x * view.s + view.tx, 8), Math.max(8, size.w - 270)),
                    top: Math.min(Math.max(l.y * view.s + view.ty + 10, 8), Math.max(8, size.h - 140)),
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
                    Tekstlabel
                  </div>
                  <input
                    autoFocus
                    value={l.text}
                    placeholder="Typ je tekst…"
                    onChange={(e) => circuit.setLabelText(l.id, e.target.value)}
                    onBlur={onEditorBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") closeLabelEditor();
                    }}
                    className="w-full rounded-md border border-(--accent) bg-(--bg-primary) px-2 py-1.5 text-sm text-(--text-primary) placeholder:text-(--text-muted)"
                  />
                  <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-[11px] text-(--text-secondary)">
                    <input
                      type="checkbox"
                      checked={l.boxed ?? false}
                      onChange={(e) => circuit.setLabelBoxed(l.id, e.target.checked)}
                      onBlur={onEditorBlur}
                      className="accent-(--accent)"
                    />
                    Met kader (opdracht-kaartje)
                  </label>
                  <div className="mt-1 text-[11px] text-(--text-muted)">
                    Enter = klaar · leeg laten = verwijderen
                  </div>
                </div>
              );
            })()}
        </div>
        <InstrumentRail onInstrumentPointerDown={onPalettePointerDown} />
      </div>

      {placing && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 opacity-80"
          style={{ left: placing.x, top: placing.y }}
        >
          {isAnalog(placing.type) ? (
            <svg
              viewBox={`${-ANALOG_W / 2 - 4} ${-ANALOG_H / 2 - 4} ${ANALOG_W + 8} ${ANALOG_H + 8}`}
              width={ANALOG_W}
              height={ANALOG_H}
            >
              <AnalogMeter
                spec={ANALOG_SPEC[placing.type]!}
                deflection={0.5}
                activeIndex={null}
                overRange={false}
              />
            </svg>
          ) : (
            <svg viewBox="-40 -30 80 60" width={70} height={52}>
              <ComponentSymbol type={placing.type} brightness={0.6} />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
