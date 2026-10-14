import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

import type { FlowStap, Voorbeeld } from "@/bestand/voorbeelden";

/**
 * Kaartje bij een docentvoorbeeld: de eisen en de flowchart, in dezelfde
 * vormen als in het werkboek (rondje start, rechthoek stap, ruit keuze).
 */
export function EisenKaart({
  voorbeeld,
  sluit,
}: {
  voorbeeld: Voorbeeld;
  sluit: () => void;
}) {
  const [flowchart, setFlowchart] = useState(true);
  return (
    <div className="absolute top-3 left-3 flex max-h-[60%] w-[min(320px,calc(100vw-6rem))] flex-col rounded-xl border border-(--border-solid) bg-card text-sm text-(--text-primary) shadow-lg">
      <div className="flex items-center px-3 pt-3">
        <span className="text-xs font-semibold tracking-wide text-(--text-muted) uppercase">
          Eisen
        </span>
        <button
          type="button"
          onClick={sluit}
          aria-label="Eisen sluiten"
          className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-(--text-secondary) hover:bg-(--bg-card-hover)"
        >
          <X size={15} />
        </button>
      </div>
      <div className="overflow-auto px-3 pb-3">
        <div className="font-semibold">{voorbeeld.naam}</div>
        <p className="mt-1 text-(--text-secondary)">{voorbeeld.eisen}</p>
        <button
          type="button"
          onClick={() => setFlowchart((f) => !f)}
          aria-expanded={flowchart}
          className="mt-3 flex items-center gap-1 text-xs font-semibold tracking-wide text-(--text-muted) uppercase hover:text-(--text-secondary)"
        >
          Flowchart
          <ChevronDown
            size={14}
            className={flowchart ? "" : "-rotate-90"}
            aria-hidden
          />
        </button>
        {flowchart && <Flowchart stappen={voorbeeld.flowchart} />}
      </div>
    </div>
  );
}

const BREEDTE = 290;
const MIDDEN = BREEDTE / 2 + 8;
/** Kolommen van ja en nee onder een ruit. */
const JA_X = MIDDEN - 84;
const NEE_X = MIDDEN + 84;
const TUSSEN = 18;
const REGEL = 14;

/** Knipt een tekst in regels van hoogstens `max` tekens, op spaties. */
function regels(tekst: string, max: number): string[] {
  const uit: string[] = [];
  let regel = "";
  for (const woord of tekst.split(" ")) {
    if (regel && (regel + " " + woord).length > max) {
      uit.push(regel);
      regel = woord;
    } else regel = regel ? `${regel} ${woord}` : woord;
  }
  if (regel) uit.push(regel);
  return uit;
}

function Tekst({
  x,
  y,
  r,
  vet,
}: {
  x: number;
  y: number;
  r: string[];
  vet?: boolean;
}) {
  const begin = y - ((r.length - 1) * REGEL) / 2 + 4;
  return (
    <text
      textAnchor="middle"
      style={{
        fontSize: 11.5,
        fontWeight: vet ? 700 : 600,
        fill: "var(--text-primary)",
      }}
    >
      {r.map((t, i) => (
        <tspan key={i} x={x} y={begin + i * REGEL}>
          {t}
        </tspan>
      ))}
    </text>
  );
}

const vorm = {
  fill: "var(--bg-card)",
  stroke: "var(--sb-flow)",
  strokeWidth: 1.8,
};

function Pijl({ d }: { d: string }) {
  return (
    <path
      d={d}
      fill="none"
      stroke="var(--text-secondary)"
      strokeWidth={1.4}
      markerEnd="url(#sb-flow-pijl)"
    />
  );
}

/** Rechthoek (stap) met tekst, gecentreerd op x; geeft de hoogte terug. */
function blok(x: number, y: number, tekst: string, b: number) {
  const r = regels(tekst, Math.floor(b / 6.6));
  const h = 12 + r.length * REGEL;
  return {
    h,
    el: (
      <g key={`b${x},${y}`}>
        <rect x={x - b / 2} y={y} width={b} height={h} rx={4} {...vorm} />
        <Tekst x={x} y={y + h / 2} r={r} />
      </g>
    ),
  };
}

/** De flowchart van boven naar beneden, met de lus terug naar het begin. */
function Flowchart({ stappen }: { stappen: FlowStap[] }) {
  const delen: React.ReactNode[] = [];
  let y = 4;
  // Start
  delen.push(
    <g key="start">
      <rect x={MIDDEN - 40} y={y} width={80} height={26} rx={13} {...vorm} />
      <Tekst x={MIDDEN} y={y + 13} r={["start"]} vet />
    </g>,
  );
  y += 26;
  // Hier komt de lus weer binnen.
  const lusY = y + TUSSEN / 2;
  for (const [i, s] of stappen.entries()) {
    delen.push(<Pijl key={`p${i}`} d={`M ${MIDDEN} ${y} V ${y + TUSSEN}`} />);
    y += TUSSEN;
    if ("stap" in s) {
      const b = blok(MIDDEN, y, s.stap, 210);
      delen.push(b.el);
      y += b.h;
      continue;
    }
    // Keuze: ruit, met ja links en nee rechts; zonder stap loopt de lijn door.
    const r = regels(s.vraag, 20);
    const rh = 34 + r.length * REGEL,
      rb = 150;
    delen.push(
      <g key={`v${i}`}>
        <path
          d={`M ${MIDDEN} ${y} L ${MIDDEN + rb / 2} ${y + rh / 2} L ${MIDDEN} ${y + rh} L ${MIDDEN - rb / 2} ${y + rh / 2} Z`}
          {...vorm}
        />
        <Tekst x={MIDDEN} y={y + rh / 2} r={r} />
      </g>,
    );
    const hoek = y + rh / 2;
    y += rh;
    const kant = (tekst: string | undefined, x: number) => {
      const top = y + TUSSEN;
      if (!tekst) return { onder: top, top, el: null };
      const b = blok(x, top, tekst, 120);
      return { onder: top + b.h, top, el: b.el };
    };
    const ja = kant(s.ja, JA_X);
    const nee = kant(s.nee, NEE_X);
    const samen = Math.max(ja.onder, nee.onder) + 10;
    delen.push(
      <g key={`k${i}`}>
        {/* ja */}
        <path
          d={`M ${MIDDEN - rb / 2} ${hoek} H ${JA_X} V ${ja.top}`}
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth={1.4}
          markerEnd={s.ja ? "url(#sb-flow-pijl)" : undefined}
        />
        {/* nee */}
        <path
          d={`M ${MIDDEN + rb / 2} ${hoek} H ${NEE_X} V ${nee.top}`}
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth={1.4}
          markerEnd={s.nee ? "url(#sb-flow-pijl)" : undefined}
        />
        {/* weer samen in het midden */}
        <path
          d={`M ${JA_X} ${ja.onder} V ${samen} H ${NEE_X} V ${nee.onder}`}
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth={1.4}
        />
        <text
          x={MIDDEN - rb / 2 - 4}
          y={hoek - 5}
          textAnchor="end"
          style={{ fontSize: 11, fontWeight: 700, fill: "var(--sb-flow)" }}
        >
          ja
        </text>
        <text
          x={MIDDEN + rb / 2 + 4}
          y={hoek - 5}
          style={{ fontSize: 11, fontWeight: 700, fill: "var(--sb-flow)" }}
        >
          nee
        </text>
        {ja.el}
        {nee.el}
      </g>,
    );
    y = samen;
  }
  // Terug naar het begin: het systeem stopt nooit.
  const onder = y + TUSSEN;
  delen.push(
    <g key="lus">
      <path
        d={`M ${MIDDEN} ${y} V ${onder} H 4 V ${lusY} H ${MIDDEN - 4}`}
        fill="none"
        stroke="var(--text-secondary)"
        strokeWidth={1.4}
        markerEnd="url(#sb-flow-pijl)"
      />
      <text
        x={MIDDEN}
        y={onder + 14}
        textAnchor="middle"
        style={{ fontSize: 10.5, fill: "var(--text-muted)" }}
      >
        en dan weer van voren af aan
      </text>
    </g>,
  );
  const hoogte = onder + 20;
  return (
    <svg
      viewBox={`0 0 ${BREEDTE + 16} ${hoogte}`}
      className="mt-2 w-full"
      role="img"
      aria-label="Flowchart van de schakeling"
    >
      <defs>
        <marker
          id="sb-flow-pijl"
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--text-secondary)" />
        </marker>
      </defs>
      {delen}
    </svg>
  );
}
