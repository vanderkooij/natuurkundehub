/**
 * Canvas-overlay over de SVG-laag: de animatie van ladingsdragers (Fase 2) als
 * **deterministisch transport-model**.
 *
 * Elektronen zijn deeltjes die continu een route afleggen op **constante
 * schermsnelheid**. Bij een knoop kiest elk deeltje een uitgaande tak via een
 * **gewogen, gelijkmatig verdeelschema** (smooth weighted round-robin) naar rato
 * van de takstroom — bij 50/50 om-en-om, bij 2:1 ongeveer "2 deze, 1 die", enz.
 * Omdat deeltjes bij een knoop niet verdwijnen maar dóórreizen, **popt er nooit
 * iets**. Het aantal wordt bij elke wijziging gelijkmatig opnieuw gezaaid met
 * **afstand ∝ 1/|I|** (dichtheid ∝ |I|); zolang de schakeling gelijk blijft,
 * stromen ze door en blijft de afstand gelijkmatig.
 *
 * Toggle: elektronen (blauw bolletje −, min → plus) of conventioneel (oranje pijl).
 * Carriers verdwijnen alleen achter de bron-body. Bij I = 0 beweegt niets.
 */
import { useEffect, useRef } from "react";

import type { FlowPath } from "@/model/flows";

export type FlowMode = "electrons" | "conventional";

interface View {
  s: number;
  tx: number;
  ty: number;
}

interface Props {
  width: number;
  height: number;
  flows: FlowPath[];
  view: View;
  mode: FlowMode;
}

const SCREEN_SPEED = 55; // px/s op het scherm (constant)
const SPACING_K = 30; // afstand(worldpx) = SPACING_K / |I| (kleiner = dichter)
const MIN_SP = 12;
const MAX_SP = 170;
const MIN_I = 1e-4;
const MAX_PER_EDGE = 400;

interface OEdge {
  key: string;
  fromNode: string;
  toNode: string;
  sx: number;
  sy: number;
  ux: number;
  uy: number;
  len: number;
  weight: number;
  hideRadius: number;
  midx: number;
  midy: number;
}
interface Particle {
  key: string;
  s: number;
}

const spacing = (I: number) => Math.min(MAX_SP, Math.max(MIN_SP, SPACING_K / Math.abs(I)));

export function CanvasOverlay({ width, height, flows, view, mode }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const flowsRef = useRef(flows);
  const viewRef = useRef(view);
  const modeRef = useRef(mode);
  const particlesRef = useRef<Particle[]>([]);
  const accRef = useRef<Map<string, number[]>>(new Map());
  const sigRef = useRef<string>("");
  flowsRef.current = flows;
  viewRef.current = view;
  modeRef.current = mode;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const v = viewRef.current;
      const electrons = modeRef.current === "electrons";

      // Oriënteer alle takken in de reisrichting; index per knoop.
      const edges = new Map<string, OEdge>();
      const outgoing = new Map<string, OEdge[]>();
      for (const f of flowsRef.current) {
        const I = f.current;
        if (!Number.isFinite(I) || Math.abs(I) < MIN_I) continue;
        const aToB = electrons ? I < 0 : I > 0;
        const fromNode = aToB ? f.aNode : f.bNode;
        const toNode = aToB ? f.bNode : f.aNode;
        const sx = aToB ? f.ax : f.bx;
        const sy = aToB ? f.ay : f.by;
        const ex = aToB ? f.bx : f.ax;
        const ey = aToB ? f.by : f.ay;
        const dx = ex - sx;
        const dy = ey - sy;
        const len = Math.hypot(dx, dy);
        if (len < 1) continue;
        const oe: OEdge = {
          key: f.key,
          fromNode,
          toNode,
          sx,
          sy,
          ux: dx / len,
          uy: dy / len,
          len,
          weight: Math.abs(I),
          hideRadius: f.hideRadius,
          midx: (sx + ex) / 2,
          midy: (sy + ey) / 2,
        };
        edges.set(oe.key, oe);
        const arr = outgoing.get(fromNode);
        if (arr) arr.push(oe);
        else outgoing.set(fromNode, [oe]);
      }
      for (const arr of outgoing.values()) arr.sort((a, b) => (a.key < b.key ? -1 : 1));

      // Signatuur: alleen opnieuw zaaien bij topologie-/stroomwijziging (niet bij
      // louter verschuiven van componenten).
      const sigParts: string[] = [];
      for (const e of edges.values()) {
        sigParts.push(`${e.key}|${e.fromNode}>${e.toNode}|${Math.round(e.weight * 1000)}`);
      }
      sigParts.sort();
      const sig = sigParts.join(";");

      if (sig !== sigRef.current) {
        sigRef.current = sig;
        accRef.current = new Map();
        // Flow-coördinaat D per knoop (BFS) voor een coherente startfase.
        const adj = new Map<string, { other: string; delta: number }[]>();
        const addAdj = (n: string, o: string, dl: number) => {
          const x = adj.get(n);
          if (x) x.push({ other: o, delta: dl });
          else adj.set(n, [{ other: o, delta: dl }]);
        };
        for (const e of edges.values()) {
          addAdj(e.fromNode, e.toNode, +e.len);
          addAdj(e.toNode, e.fromNode, -e.len);
        }
        const D = new Map<string, number>();
        for (const start of adj.keys()) {
          if (D.has(start)) continue;
          D.set(start, 0);
          const q = [start];
          while (q.length) {
            const u = q.shift()!;
            const du = D.get(u)!;
            for (const { other, delta } of adj.get(u) ?? []) {
              if (!D.has(other)) {
                D.set(other, du + delta);
                q.push(other);
              }
            }
          }
        }
        // Zaai gelijkmatig met afstand ∝ 1/I.
        const ps: Particle[] = [];
        for (const e of edges.values()) {
          const d = spacing(e.weight);
          const dStart = D.get(e.fromNode) ?? 0;
          let s = (((-dStart) % d) + d) % d;
          let cnt = 0;
          for (; s < e.len && cnt < MAX_PER_EDGE; s += d, cnt++) ps.push({ key: e.key, s });
        }
        particlesRef.current = ps;
      }

      // Gewogen, gelijkmatig verdeelschema per knoop (smooth weighted round-robin).
      const acc = accRef.current;
      const route = (node: string, outs: OEdge[]): OEdge => {
        if (outs.length === 1) return outs[0];
        let a = acc.get(node);
        if (!a || a.length !== outs.length) {
          a = new Array<number>(outs.length).fill(0);
          acc.set(node, a);
        }
        let total = 0;
        for (let i = 0; i < outs.length; i++) {
          a[i] += outs[i].weight;
          total += outs[i].weight;
        }
        let best = 0;
        for (let i = 1; i < outs.length; i++) if (a[i] > a[best]) best = i;
        a[best] -= total;
        return outs[best];
      };

      // Voortbewegen met constante schermsnelheid; bij een knoop een tak kiezen.
      const step = (SCREEN_SPEED / Math.max(0.1, v.s)) * dt;
      for (const p of particlesRef.current) {
        let e = edges.get(p.key);
        if (!e) continue;
        p.s += step;
        let guard = 0;
        while (p.s >= e.len && guard++ < 8) {
          p.s -= e.len;
          const outs = outgoing.get(e.toNode);
          if (!outs || outs.length === 0) {
            p.s = e.len * 0.999;
            break;
          }
          e = route(e.toNode, outs);
          p.key = e.key;
        }
      }

      // Tekenen.
      const dpr = window.devicePixelRatio || 1;
      const cw = Math.max(1, Math.round(width * dpr));
      const ch = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      for (const p of particlesRef.current) {
        const e = edges.get(p.key);
        if (!e) continue;
        const wx = e.sx + e.ux * p.s;
        const wy = e.sy + e.uy * p.s;
        if (e.hideRadius > 0 && Math.hypot(wx - e.midx, wy - e.midy) < e.hideRadius) continue;
        const px = wx * v.s + v.tx;
        const py = wy * v.s + v.ty;
        if (electrons) {
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#4d7fff";
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.95)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(px - 2, py);
          ctx.lineTo(px + 2, py);
          ctx.stroke();
        } else {
          // Conventionele stroom: fel oranje pijl met wit randje — moet net zo
          // opvallen als de blauwe elektronen, ook op de donkere draadkleur.
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(Math.atan2(e.uy, e.ux));
          ctx.beginPath();
          ctx.moveTo(6.5, 0);
          ctx.lineTo(-4.5, 4.2);
          ctx.lineTo(-4.5, -4.2);
          ctx.closePath();
          ctx.fillStyle = "#ff7a1a";
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.lineWidth = 1.1;
          ctx.stroke();
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <canvas
      ref={ref}
      style={{ position: "absolute", inset: 0, width, height, pointerEvents: "none" }}
    />
  );
}
