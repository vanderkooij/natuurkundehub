/**
 * Canvas-overlay over de SVG-laag: de animatie van ladingsdragers.
 *
 * De stroom is opgesplitst in **kringen** (zie model/particles.ts): elke kring
 * is een gesloten route met een vaste trein deeltjes op gelijke afstand
 * (∝ 1/I van die kring). Alle treinen schuiven met dezelfde constante
 * schermsnelheid op; hun plek is een vaste functie van één gedeelde afstand,
 * dus niets kan uit de pas raken. Bij een splitsing gaat de ene trein links en
 * de andere rechts: zo zie je welk deel van de stroom welke kant op gaat.
 *
 * Bij elke aanpassing (ook verslepen) begint de afstand opnieuw bij nul: de
 * deeltjes springen dan één keer naar hun nieuwe plek. Tijdens het draaien
 * springt er nooit iets.
 *
 * Toggle: elektronen (blauw bolletje −, min → plus) of conventioneel (oranje pijl).
 * Carriers verdwijnen alleen achter de bron-body. Bij I = 0 beweegt niets.
 */
import { useEffect, useRef } from "react";

import type { FlowPath } from "@/model/flows";
import { bouwKringen, deeltjesOp, type Opbouw } from "@/model/particles";

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
  /** Id's van de bronnen: kringen beginnen bij voorkeur daar. */
  sources: string[];
  view: View;
  mode: FlowMode;
}

const SCREEN_SPEED = 55; // px/s op het scherm (constant)

export function CanvasOverlay({ width, height, flows, sources, view, mode }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef(view);
  const modeRef = useRef(mode);
  const opbouwRef = useRef<Opbouw | null>(null);
  const offsetRef = useRef(0);
  viewRef.current = view;
  modeRef.current = mode;

  // Alleen opnieuw opbouwen als de schakeling (of de weergave) verandert; de
  // signatuur beslist of er een nieuw nulpunt nodig is.
  useEffect(() => {
    const nieuw = bouwKringen(flows, mode === "electrons", new Set(sources));
    if (opbouwRef.current?.signature !== nieuw.signature) offsetRef.current = 0; // nieuw nulpunt
    opbouwRef.current = nieuw;
  }, [flows, sources, mode]);

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
      const opbouw = opbouwRef.current;
      // Constante schermsnelheid: in wereld-px hangt de stap af van de zoom.
      offsetRef.current += (SCREEN_SPEED / Math.max(0.1, v.s)) * dt;
      const deeltjes = opbouw ? deeltjesOp(opbouw, offsetRef.current) : [];

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
      for (const p of deeltjes) {
        const e = p.edge;
        const wx = p.x;
        const wy = p.y;
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
