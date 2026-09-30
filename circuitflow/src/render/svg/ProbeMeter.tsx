/**
 * De voltmeter met meetpennen, getekend in wereldcoördinaten (zoomt mee).
 * Het kastje en beide pennen zijn los te slepen; de snoeren lopen van de
 * aansluitbussen onder het kastje naar de achterkant van de pennen.
 */
import { useRef } from "react";

import type { Pt } from "@/model/geometry";
import type { ProbeState } from "@/model/probe";

export type ProbeDeel = "body" | "red" | "black";

interface Props {
  probe: ProbeState;
  /** Tekst op het display, bv. "3,00 V" of "– – –". */
  display: string;
  redContact: boolean;
  blackContact: boolean;
  toWorld: (clientX: number, clientY: number) => Pt;
  onMove: (deel: ProbeDeel, p: Pt) => void;
  onDrop: (deel: ProbeDeel) => void;
  onClose: () => void;
}

const BODY_W = 150;
const BODY_H = 92;
const PEN_LEN = 58; // van punt tot achterkant
const TIP_LEN = 13;

// Aansluitbussen onder het kastje, relatief t.o.v. het midden.
const JACK_COM = { x: -32, y: BODY_H / 2 - 16 };
const JACK_V = { x: 32, y: BODY_H / 2 - 16 };

function Pen({
  tip,
  color,
  contact,
}: {
  tip: Pt;
  color: string;
  contact: boolean;
}) {
  const top = tip.y - PEN_LEN;
  return (
    <g>
      {contact && (
        <circle
          cx={tip.x}
          cy={tip.y}
          r={8}
          fill="none"
          stroke="#22c55e"
          strokeWidth={2.5}
        />
      )}
      <line
        x1={tip.x}
        y1={tip.y}
        x2={tip.x}
        y2={tip.y - TIP_LEN}
        stroke="#cbd5e1"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <rect
        x={tip.x - 6}
        y={top}
        width={12}
        height={PEN_LEN - TIP_LEN}
        rx={5}
        fill={color}
        stroke="var(--cf-probe-halo)"
        strokeWidth={1}
      />
      <rect
        x={tip.x - 7.5}
        y={tip.y - TIP_LEN - 8}
        width={15}
        height={5}
        rx={2}
        fill={color}
        opacity={0.85}
      />
    </g>
  );
}

/**
 * De pennen staan schuin (rood naar rechts, zwart naar links), zodat ze minder
 * vaak precies over een draad of een weerstand heen liggen.
 */
const HOEK: Record<"red" | "black", number> = { red: 28, black: -28 };

/** Richting van de punt naar de achterkant van de pen. */
function richting(hoek: number): Pt {
  const a = (hoek * Math.PI) / 180;
  return { x: Math.sin(a), y: -Math.cos(a) };
}

/** Snoer van een bus naar de achterkant van de pen, met een beetje doorhang. */
function snoer(van: Pt, pen: Pt, hoek: number): string {
  const r = richting(hoek);
  const eind = { x: pen.x + r.x * PEN_LEN, y: pen.y + r.y * PEN_LEN };
  const zak = 60 + Math.abs(eind.x - van.x) * 0.15;
  // Het snoer loopt eerst in het verlengde van de pen door en hangt dan door.
  return `M ${van.x} ${van.y} C ${van.x} ${van.y + zak}, ${eind.x + r.x * zak} ${eind.y + r.y * zak}, ${eind.x} ${eind.y}`;
}

export function ProbeMeter({
  probe,
  display,
  redContact,
  blackContact,
  toWorld,
  onMove,
  onDrop,
  onClose,
}: Props) {
  const drag = useRef<{ deel: ProbeDeel; start: Pt; orig: Pt } | null>(null);

  const begin = (deel: ProbeDeel) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = {
      deel,
      start: toWorld(e.clientX, e.clientY),
      orig: { ...probe[deel] },
    };
  };
  const beweeg = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const w = toWorld(e.clientX, e.clientY);
    onMove(d.deel, {
      x: d.orig.x + (w.x - d.start.x),
      y: d.orig.y + (w.y - d.start.y),
    });
  };
  const eind = () => {
    const d = drag.current;
    drag.current = null;
    if (d) onDrop(d.deel);
  };
  const sleep = (deel: ProbeDeel) => ({
    onPointerDown: begin(deel),
    onPointerMove: beweeg,
    onPointerUp: eind,
    onPointerCancel: eind,
    style: { cursor: "grab", touchAction: "none" } as React.CSSProperties,
  });

  const b = probe.body;
  const com = { x: b.x + JACK_COM.x, y: b.y + JACK_COM.y };
  const v = { x: b.x + JACK_V.x, y: b.y + JACK_V.y };

  return (
    <g>
      {/* Snoeren onder alles, zodat de pennen erbovenop liggen. Een lichte rand
          eronder houdt het zwarte snoer zichtbaar in donkere modus. */}
      {[snoer(com, probe.black, HOEK.black), snoer(v, probe.red, HOEK.red)].map(
        (d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="var(--cf-probe-halo)"
            strokeWidth={6.5}
            strokeLinecap="round"
            pointerEvents="none"
          />
        ),
      )}
      <path
        d={snoer(com, probe.black, HOEK.black)}
        fill="none"
        stroke="#1f2937"
        strokeWidth={3.5}
        strokeLinecap="round"
        pointerEvents="none"
      />
      <path
        d={snoer(v, probe.red, HOEK.red)}
        fill="none"
        stroke="#dc2626"
        strokeWidth={3.5}
        strokeLinecap="round"
        pointerEvents="none"
      />

      {/* Kastje */}
      <g {...sleep("body")}>
        <rect
          x={b.x - BODY_W / 2}
          y={b.y - BODY_H / 2}
          width={BODY_W}
          height={BODY_H}
          rx={12}
          fill="#f5c542"
          stroke="#b58a12"
          strokeWidth={2}
        />
        <rect
          x={b.x - 60}
          y={b.y - BODY_H / 2 + 10}
          width={120}
          height={38}
          rx={5}
          fill="#c9d8b6"
          stroke="#6b7b58"
          strokeWidth={1.5}
        />
        <text
          x={b.x + 52}
          y={b.y - BODY_H / 2 + 38}
          textAnchor="end"
          fontFamily="'JetBrains Mono', monospace"
          fontSize={21}
          fontWeight={600}
          fill="#1f2a14"
          style={{ userSelect: "none" }}
        >
          {display}
        </text>
        <text
          x={b.x - 56}
          y={b.y - BODY_H / 2 + 22}
          fontSize={9}
          fill="#3f4a33"
          fontWeight={700}
          style={{ userSelect: "none" }}
        >
          V
        </text>
        {/* Bussen */}
        <circle
          cx={com.x}
          cy={com.y}
          r={7}
          fill="#1f2937"
          stroke="#0b0f14"
          strokeWidth={1.5}
        />
        <circle
          cx={v.x}
          cy={v.y}
          r={7}
          fill="#dc2626"
          stroke="#7f1d1d"
          strokeWidth={1.5}
        />
        <text
          x={com.x}
          y={com.y - 11}
          textAnchor="middle"
          fontSize={9}
          fontWeight={700}
          fill="#3b2f0a"
          style={{ userSelect: "none" }}
        >
          COM
        </text>
        <text
          x={v.x}
          y={v.y - 11}
          textAnchor="middle"
          fontSize={9}
          fontWeight={700}
          fill="#3b2f0a"
          style={{ userSelect: "none" }}
        >
          V
        </text>
      </g>

      {/* Sluitknop */}
      <g
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose();
        }}
        style={{ cursor: "pointer" }}
      >
        <circle
          cx={b.x + BODY_W / 2 - 4}
          cy={b.y - BODY_H / 2 + 4}
          r={11}
          fill="#ffffff"
          stroke="#94a3b8"
          strokeWidth={1.5}
        />
        <path
          d={`M ${b.x + BODY_W / 2 - 8} ${b.y - BODY_H / 2} l 8 8 m 0 -8 l -8 8`}
          stroke="#475569"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </g>

      {/* Pennen: ruim klikgebied rond de hele pen. */}
      <g
        {...sleep("black")}
        transform={`rotate(${HOEK.black} ${probe.black.x} ${probe.black.y})`}
      >
        <rect
          x={probe.black.x - 16}
          y={probe.black.y - PEN_LEN - 6}
          width={32}
          height={PEN_LEN + 14}
          fill="transparent"
        />
        <Pen tip={probe.black} color="#1f2937" contact={blackContact} />
      </g>
      <g
        {...sleep("red")}
        transform={`rotate(${HOEK.red} ${probe.red.x} ${probe.red.y})`}
      >
        <rect
          x={probe.red.x - 16}
          y={probe.red.y - PEN_LEN - 6}
          width={32}
          height={PEN_LEN + 14}
          fill="transparent"
        />
        <Pen tip={probe.red} color="#dc2626" contact={redContact} />
      </g>
    </g>
  );
}
