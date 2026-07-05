/**
 * De SVG-schakellaag: tekent polylijn-draden, componenten (pictoriaal) met
 * flexibele leads naar hun terminal-vertices, vertakkingsstippen, sleepbare
 * knopen en uitlezingen. Puur presentatie + pointer-callbacks; alle interactie
 * zit in CircuitEditor. Coördinaten zijn wereldcoördinaten (binnen de pan/zoom-g).
 */
import { useLayoutEffect, useRef, useState } from "react";

import { LEAD_ATTACH } from "@/model/componentDefs";
import { componentGeom, incidentCount, resolveVertex } from "@/model/geometry";
import { ledBrightness, ledColor } from "@/model/ledSpec";
import { isSensor, sensorR } from "@/model/sensorSpec";
import {
  ANALOG_H,
  ANALOG_W,
  ANALOG_SPEC,
  activeRange,
  analogPortPos,
  isAnalog,
} from "@/model/meterSpec";
import type { CircuitComponent, CircuitDoc, TextLabel } from "@/model/types";
import { formatCurrent, formatOhm, formatVoltage, formatVolts } from "@/lib/format";
import type { SolveResult } from "@/sim";
import { AnalogMeter } from "./AnalogMeter";
import { ComponentSymbol } from "./Symbols";

export type Selection = { kind: "component" | "wire" | "vertex" | "label"; id: string } | null;

/** Groepsselectie uit het selectiekader (rubber band). */
export interface MultiSelection {
  components: Set<string>;
  wires: Set<string>;
  labels: Set<string>;
}

/**
 * Lamphelderheid 0..1 uit het vermogen, **logaritmisch** in [Pmin, Pmax]. Log
 * spreidt multiplicatieve verschillen gelijkmatig, zodat ook in het veel-
 * voorkomende lage-vermogensbereik (0,05–1 W) de verschillen goed zichtbaar zijn.
 */
function lampBrightness(power: number): number {
  if (power <= 0) return 0;
  const Pmin = 0.01; // ≈ uit
  const Pmax = 16; // ≈ vol (6 W zit in het bovenste-midden; 36 W klemt op vol)
  const b = Math.log(power / Pmin) / Math.log(Pmax / Pmin);
  return Math.max(0, Math.min(1, b));
}

interface Props {
  doc: CircuitDoc;
  result: SolveResult;
  selection: Selection;
  multi: MultiSelection | null;
  schematic: boolean;
  measureMode: boolean;
  snapTargetId: string | null;
  onComponentPointerDown: (id: string, e: React.PointerEvent) => void;
  onTerminalPointerDown: (vid: string, e: React.PointerEvent) => void;
  onWireSegmentPointerDown: (wireId: string, segIndex: number, e: React.PointerEvent) => void;
  onVertexPointerDown: (vid: string, e: React.PointerEvent) => void;
  onVertexTabPointerDown: (vid: string, e: React.PointerEvent) => void;
  onCutNode: (vid: string, e: React.PointerEvent) => void;
  onLabelPointerDown: (id: string, e: React.PointerEvent) => void;
  onLabelDoubleClick: (id: string) => void;
}

const isMeter = (t: CircuitComponent["type"]) => t === "voltmeter" || t === "ammeter";

/** Tekstlabel: los bijschrift, of (boxed) een kaartje met kader — bv. een opdracht. */
function CanvasLabel({
  l,
  sel,
  onPointerDown,
  onDoubleClick,
}: {
  l: TextLabel;
  sel: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
}) {
  const ref = useRef<SVGTextElement>(null);
  const [bb, setBb] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    if (!l.boxed) {
      setBb(null);
      return;
    }
    const b = ref.current?.getBBox();
    if (b) setBb({ x: b.x, y: b.y, w: b.width, h: b.height });
  }, [l.text, l.x, l.y, l.boxed]);
  return (
    <g onPointerDown={onPointerDown} onDoubleClick={onDoubleClick} style={{ cursor: "grab" }}>
      {l.boxed && bb && (
        <rect
          x={bb.x - 10}
          y={bb.y - 7}
          width={bb.w + 20}
          height={bb.h + 14}
          rx={8}
          fill="var(--bg-card)"
          stroke={sel ? "var(--cf-select)" : "var(--accent)"}
          strokeWidth={1.5}
        />
      )}
      <text
        ref={ref}
        x={l.x}
        y={l.y}
        className="cf-note"
        fill={sel ? "var(--accent)" : "var(--text-secondary)"}
      >
        {l.text}
      </text>
    </g>
  );
}

function valueLabel(c: CircuitComponent): string {
  if (c.type === "source") return formatVolts(c.values.emf ?? 0);
  if (c.type === "switch") return (c.values.closed ?? true) ? "dicht" : "open";
  if (c.type === "led") return c.values.burned ? "doorgebrand" : ledColor(c.values.color).label;
  if (c.type === "fuse")
    return c.values.blown ? "doorgebrand" : `${(c.values.imax ?? 0).toLocaleString("nl-NL")} A`;
  if (isSensor(c.type)) {
    const unit = c.type === "ldr" ? "%" : "°C";
    return `${Math.round(c.values.env ?? 50)} ${unit} → ${formatOhm(sensorR(c.values.env))}`;
  }
  return formatOhm(c.values.resistance ?? 0);
}

/** Meter-uitlezing (met teken): voltmeter = ΔV tussen z'n punten, ampèremeter = stroom. */
function meterReading(result: SolveResult, c: CircuitComponent): string {
  if (c.type === "voltmeter") {
    // Alleen een waarde als béíde poten echt verbonden zijn (endpoint van een
    // element). Een zwevende pool staat niet in nodePotentials → geen meting.
    if (!result.nodePotentials.has(c.v0) || !result.nodePotentials.has(c.v1)) return "– –";
    const va = result.nodePotentials.get(c.v0) ?? 0;
    const vb = result.nodePotentials.get(c.v1) ?? 0;
    return formatVoltage(va - vb);
  }
  const i = result.elementCurrents.get(c.id) ?? 0;
  return formatCurrent(i);
}

function statusLabel(result: SolveResult, c: CircuitComponent): { text: string; warn: boolean } | null {
  if (result.shortedSources.includes(c.id)) return { text: "kortsluiting", warn: true };
  if (result.conflicts.includes(c.id)) return { text: "conflict", warn: true };
  if (c.type === "switch") return null; // status zit al in valueLabel (open/dicht)
  const i = result.elementCurrents.get(c.id);
  if (i === undefined || !Number.isFinite(i)) return null;
  return { text: formatCurrent(Math.abs(i)), warn: false };
}

export function CircuitSvg({
  doc,
  result,
  selection,
  multi,
  schematic,
  measureMode,
  snapTargetId,
  onComponentPointerDown,
  onTerminalPointerDown,
  onWireSegmentPointerDown,
  onVertexPointerDown,
  onVertexTabPointerDown,
  onCutNode,
  onLabelPointerDown,
  onLabelDoubleClick,
}: Props) {
  const terminalIds = new Set<string>();
  for (const c of doc.components) {
    terminalIds.add(c.v0);
    terminalIds.add(c.v1);
    if (c.ports) for (const p of c.ports) terminalIds.add(p);
  }
  const junctions = Object.keys(doc.vertices).filter((id) => incidentCount(doc, id) >= 3);
  const shortedSet = new Set(result.shortedNodes);

  return (
    <g className="cf-root">
      <defs>
        <filter id="cf-glow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Draden (polylijnen) */}
      {doc.wires.map((w) => {
        const sel =
          (selection?.kind === "wire" && selection.id === w.id) || (multi?.wires.has(w.id) ?? false);
        return (
          <g key={w.id}>
            {w.nodes.slice(0, -1).map((_, i) => {
              const a = resolveVertex(doc, w.nodes[i]);
              const b = resolveVertex(doc, w.nodes[i + 1]);
              if (!a || !b) return null;
              const hot = shortedSet.has(w.nodes[i]) && shortedSet.has(w.nodes[i + 1]);
              return (
                <g
                  key={i}
                  onPointerDown={(e) => onWireSegmentPointerDown(w.id, i, e)}
                  style={{ cursor: "pointer" }}
                >
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={16} />
                  <line
                    className={hot ? "cf-wire cf-hot-wire" : "cf-wire"}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={sel ? "var(--cf-select)" : hot ? undefined : "var(--cf-wire)"}
                  />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Vertakkingsstippen */}
      {junctions.map((id) => {
        const p = resolveVertex(doc, id);
        return p ? <circle key={`j-${id}`} cx={p.x} cy={p.y} r={5.5} fill="var(--cf-wire)" /> : null;
      })}

      {/* Componenten */}
      {doc.components.map((c) => {
        // Analoge VOS-meter: eigen render-pad (4 poorten, boog, naald).
        if (isAnalog(c.type) && c.ports) {
          const spec = ANALOG_SPEC[c.type]!;
          const sel =
            (selection?.kind === "component" && selection.id === c.id) ||
            (multi?.components.has(c.id) ?? false);
          const act = activeRange(doc, c);
          let reading = 0;
          if (act) {
            if (c.type === "analogAmmeter") reading = result.elementCurrents.get(c.id) ?? 0;
            else if (result.nodePotentials.has(c.ports[0]) && result.nodePotentials.has(act.portId))
              // Alleen meten als de common (zwart) én de actieve rode poort verbonden zijn.
              // Rood = +, zwart = −: V(rood) − V(common), zodat de naald bij juist
              // aansluiten naar rechts uitslaat en bij omgekeerd naar links.
              reading =
                (result.nodePotentials.get(act.portId) ?? 0) -
                (result.nodePotentials.get(c.ports[0]) ?? 0);
          }
          const range = act?.range ?? 1;
          const r = Number.isFinite(reading) ? reading : range * 2; // ∞ → doorslaan
          // Teken behouden: bij omgekeerd aansluiten slaat de naald de verkeerde
          // kant op (onder 0), i.p.v. gewoon een geldige waarde te tonen.
          const deflection = act ? r / range : 0;
          const overRange = !!act && Math.abs(r) > range;
          const cx = c.cx ?? 0;
          const cy = c.cy ?? 0;
          return (
            <g key={c.id}>
              {sel && (
                <rect
                  x={cx - ANALOG_W / 2 - 4}
                  y={cy - ANALOG_H / 2 - 4}
                  width={ANALOG_W + 8}
                  height={ANALOG_H + 8}
                  rx={10}
                  fill="var(--cf-select)"
                  opacity={0.12}
                  stroke="var(--cf-select)"
                  strokeWidth={1.5}
                />
              )}
              <g
                transform={`translate(${cx} ${cy})`}
                onPointerDown={(e) => onComponentPointerDown(c.id, e)}
                style={{ cursor: "grab" }}
              >
                <AnalogMeter
                  spec={spec}
                  deflection={deflection}
                  activeIndex={act ? act.index : null}
                  overRange={overRange}
                />
              </g>
              {c.ports.map((pid, i) => {
                const p = analogPortPos(c, i);
                const isActive = act?.portId === pid;
                return (
                  <g key={pid}>
                    {isActive && (
                      <circle cx={p.x} cy={p.y} r={12} fill="none" stroke="var(--cf-select)" strokeWidth={2} />
                    )}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={7.5}
                      fill={i === 0 ? "#1a1a2e" : "#c5543a"}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      style={{ cursor: "crosshair" }}
                      onPointerDown={(e) => onTerminalPointerDown(pid, e)}
                    />
                  </g>
                );
              })}
            </g>
          );
        }
        const g = componentGeom(doc, c);
        if (!g) return null;
        const sel =
            (selection?.kind === "component" && selection.id === c.id) ||
            (multi?.components.has(c.id) ?? false);
        const attach = LEAD_ATTACH[c.type];
        // Meters staan altijd rechtop (anders lijnt de uitlezing niet uit); leads
        // hechten dan horizontaal aan en lopen naar de terminals.
        const meter = isMeter(c.type);
        const ux = meter ? 1 : g.ux;
        const uy = meter ? 0 : g.uy;
        const bodyAngle = meter ? 0 : g.angleDeg;
        const a0 = { x: g.center.x - ux * attach, y: g.center.y - uy * attach };
        const a1 = { x: g.center.x + ux * attach, y: g.center.y + uy * attach };
        const power = result.elementPowers.get(c.id) ?? 0;
        const brightness =
          c.type === "lamp"
            ? lampBrightness(power)
            : c.type === "led"
              ? ledBrightness(result.elementCurrents.get(c.id) ?? 0)
              : 0;
        const status = statusLabel(result, c);
        const shorted = result.shortedSources.includes(c.id);
        return (
          <g key={c.id}>
            {/* hete gloed bij een kortgesloten bron */}
            {shorted && (
              <circle
                className="cf-hot"
                cx={g.center.x}
                cy={g.center.y}
                r={38}
                fill="#ff5a2a"
                filter="url(#cf-glow)"
              />
            )}

            {/* leads naar de terminals */}
            <line className="cf-lead" x1={a0.x} y1={a0.y} x2={g.c0.x} y2={g.c0.y} />
            <line className="cf-lead" x1={a1.x} y1={a1.y} x2={g.c1.x} y2={g.c1.y} />

            {/* body */}
            <g
              transform={`translate(${g.center.x} ${g.center.y}) rotate(${bodyAngle})${c.mirrored ? " scale(1 -1)" : ""}`}
              onPointerDown={(e) => onComponentPointerDown(c.id, e)}
              style={{ cursor: "grab" }}
            >
              {sel && (
                <rect
                  x={-attach - 8}
                  y={-26}
                  width={(attach + 8) * 2}
                  height={52}
                  rx={12}
                  fill="var(--cf-select)"
                  opacity={0.14}
                  stroke="var(--cf-select)"
                  strokeWidth={1.5}
                />
              )}
              <ComponentSymbol
                type={c.type}
                brightness={brightness}
                closed={c.values.closed ?? true}
                ledColor={ledColor(c.values.color).hex}
                burned={c.values.burned ?? false}
                blown={c.values.blown ?? false}
                resistance={c.values.resistance ?? 10}
                power={Number.isFinite(power) ? power : 0}
                schematic={schematic}
              />
            </g>

            {/* terminal-nubs; bij digitale meters rood (+) en zwart (COM), zodat
                het teken van de uitlezing uitlegbaar is (zoals echte meetsnoeren).
                Voltmeter: + = v0 (uitlezing = V(v0) − V(v1)); ampèremeter: + = v1
                (stroom die daar binnenkomt telt positief). */}
            {[
              { p: g.c0, vid: c.v0 },
              { p: g.c1, vid: c.v1 },
            ].map(({ p, vid }, ti) => {
              const meterFill =
                c.type === "voltmeter"
                  ? ti === 0
                    ? "#c5543a"
                    : "#1a1a2e"
                  : c.type === "ammeter"
                    ? ti === 1
                      ? "#c5543a"
                      : "#1a1a2e"
                    : undefined;
              return (
                <circle
                  key={vid}
                  cx={p.x}
                  cy={p.y}
                  r={7}
                  className="cf-terminal"
                  style={meterFill ? { fill: meterFill } : undefined}
                  onPointerDown={(e) => onTerminalPointerDown(vid, e)}
                />
              );
            })}

            {isMeter(c.type) ? (
              /* Meter: uitlezing rechtop op het LCD-venster. */
              <text x={g.center.x} y={g.center.y - 10} className="cf-lcd" textAnchor="middle">
                {meterReading(result, c)}
              </text>
            ) : (
              <>
                {/* uitlezing onder het component (rechtop) */}
                <text x={g.center.x} y={g.center.y + 34} className="cf-label" textAnchor="middle">
                  {valueLabel(c)}
                </text>
                {status && (!measureMode || status.warn) && (
                  <text
                    x={g.center.x}
                    y={g.center.y + 49}
                    className={status.warn ? "cf-label cf-label-warn" : "cf-label cf-label-muted"}
                    textAnchor="middle"
                  >
                    {status.text}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}

      {/* Vrije vertices (draaduiteinden/knikpunten) — sleepbaar = verplaatsen */}
      {Object.values(doc.vertices).map((v) => {
        if (terminalIds.has(v.id)) return null;
        const isJunction = incidentCount(doc, v.id) >= 3;
        const vsel = selection?.kind === "vertex" && selection.id === v.id;
        return (
          <circle
            key={`v-${v.id}`}
            cx={v.x}
            cy={v.y}
            r={isJunction ? 7 : 6}
            className="cf-vertex"
            stroke={vsel ? "var(--cf-select)" : undefined}
            strokeWidth={vsel ? 2.5 : undefined}
            onPointerDown={(e) => onVertexPointerDown(v.id, e)}
          />
        );
      })}

      {/* Trek-nubje bij een geselecteerde knoop → sleep eraan voor een nieuwe draad */}
      {selection?.kind === "vertex" &&
        (() => {
          const v = doc.vertices[selection.id];
          if (!v) return null;
          const tx = v.x + 18;
          const ty = v.y - 18;
          return (
            <g>
              <line x1={v.x} y1={v.y} x2={tx} y2={ty} stroke="var(--cf-select)" strokeWidth={1.5} />
              <circle
                className="cf-tab"
                cx={tx}
                cy={ty}
                r={9}
                fill="var(--cf-select)"
                style={{ cursor: "crosshair" }}
                onPointerDown={(e) => onVertexTabPointerDown(selection.id, e)}
              />
              <path
                d={`M ${tx - 4} ${ty} H ${tx + 4} M ${tx} ${ty - 4} V ${ty + 4}`}
                stroke="#fff"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
              {/* Knip-knop: maakt alle aansluitingen op deze knoop los (graad ≥2). */}
              {incidentCount(doc, selection.id) >= 2 && (
                <g
                  style={{ cursor: "pointer" }}
                  onPointerDown={(e) => onCutNode(selection.id, e)}
                >
                  <line x1={v.x} y1={v.y} x2={v.x - 18} y2={v.y - 18} stroke="var(--accent-amber)" strokeWidth={1.5} />
                  <circle cx={v.x - 18} cy={v.y - 18} r={9} fill="var(--accent-amber)" />
                  <text x={v.x - 18} y={v.y - 18 + 3.6} textAnchor="middle" fontSize={11} fill="#fff">
                    ✂
                  </text>
                </g>
              )}
            </g>
          );
        })()}

      {/* Tekstlabels (dubbelklik = bewerken, slepen = verplaatsen) */}
      {(doc.labels ?? []).map((l) => (
        <CanvasLabel
          key={l.id}
          l={l}
          sel={
            (selection?.kind === "label" && selection.id === l.id) ||
            (multi?.labels.has(l.id) ?? false)
          }
          onPointerDown={(e) => onLabelPointerDown(l.id, e)}
          onDoubleClick={() => onLabelDoubleClick(l.id)}
        />
      ))}

      {/* Snap-doel highlight */}
      {snapTargetId &&
        (() => {
          const p = resolveVertex(doc, snapTargetId);
          return p ? (
            <circle cx={p.x} cy={p.y} r={12} fill="none" stroke="var(--cf-select)" strokeWidth={2.5} />
          ) : null;
        })()}
    </g>
  );
}
