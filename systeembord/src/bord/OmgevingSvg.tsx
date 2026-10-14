import type { ModuleInstantie, Schakeling } from "@/sim";

import { Apparaat } from "./ModuleSvg";
import {
  KEGEL_RAND,
  KEGEL_VOL,
  LAMP_BRON,
  opstelling,
  randen,
  type Kring,
} from "./opstelling";

interface Props {
  schakeling: Schakeling;
  /** Hoe ver het apparaat aan een relais aan staat (0 tot 1). */
  gloed: (relaisId: string) => number;
  relaisGesloten: (relaisId: string) => boolean;
  schaal: number;
  onSensorDown: (m: ModuleInstantie) => (e: React.PointerEvent) => void;
  onApparaatDown: (k: Kring) => (e: React.PointerEvent) => void;
}

/**
 * Alles buiten het bord: de losse sensoren met hun snoertjes, en bij elk
 * relais met een draad ernaartoe de tweede stroomkring met voeding en
 * apparaat. Sensor en apparaat kun je allebei verslepen (zie `opstelling`).
 * Hangt de lamp boven de lichtsensor, dan valt zijn licht erop en zie je de
 * terugkoppeling; leg je de sensor bovenop de lamp, dan niet.
 */
export function OmgevingSvg({
  schakeling,
  gloed,
  relaisGesloten,
  schaal,
  onSensorDown,
  onApparaatDown,
}: Props) {
  const { sensoren, kringen } = opstelling(schakeling);
  // Aanraakvlak minstens ~40 schermpixels, op elk zoomniveau.
  const raak = (r: number) => Math.max(r, 20 / schaal);
  return (
    <g>
      <g pointerEvents="none">
        {kringen.map((k) => (
          <Werking key={`w-${k.relais.id}`} k={k} gloed={gloed(k.relais.id)} />
        ))}
        {sensoren.map((x) => (
          <SensorElement key={x.m.id} m={x.m} soort={x.soort} punt={x.punt} />
        ))}
        {kringen.map((k) => (
          <Stroomkring
            key={k.relais.id}
            schakeling={schakeling}
            k={k}
            aan={gloed(k.relais.id) > 0.15}
            gesloten={relaisGesloten(k.relais.id)}
          />
        ))}
      </g>
      {/* Pak een sensor of apparaat vast om het te verslepen. */}
      {sensoren.map((x) => (
        <circle
          key={`s-${x.m.id}`}
          cx={x.punt.x}
          cy={x.punt.y}
          r={raak(20)}
          fill="transparent"
          style={{ cursor: "grab" }}
          onPointerDown={onSensorDown(x.m)}
        >
          <title>Versleep de sensor</title>
        </circle>
      ))}
      {kringen.map((k) => (
        <circle
          key={`a-${k.relais.id}`}
          cx={k.punt.x}
          cy={k.punt.y}
          r={raak(28)}
          fill="transparent"
          style={{ cursor: "grab" }}
          onPointerDown={onApparaatDown(k)}
        >
          <title>Versleep de {k.apparaat}</title>
        </circle>
      ))}
    </g>
  );
}

/**
 * De losse sensor (LDR of NTC), met een rood en een zwart snoertje naar de
 * rode en zwarte bus van het sensorvak, zoals je hem op het echte bord insteekt.
 */
function SensorElement({
  m,
  soort,
  punt,
}: {
  m: ModuleInstantie;
  soort: "licht" | "temperatuur";
  punt: { x: number; y: number };
}) {
  const { x, y } = punt;
  const rood = { x: m.x + 28, y: m.y + 24 };
  const zwart = { x: m.x + 28, y: m.y + 54 };
  const draad = (
    van: { x: number; y: number },
    naar: { x: number; y: number },
    kleur: string,
  ) => {
    const d = `M ${van.x} ${van.y} C ${van.x + 40} ${van.y}, ${naar.x - 40} ${naar.y}, ${naar.x} ${naar.y}`;
    return (
      <>
        <path d={d} fill="none" stroke="var(--sb-paneel)" strokeWidth={6} />
        <path
          d={d}
          fill="none"
          stroke={kleur}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle
          cx={naar.x}
          cy={naar.y}
          r={6}
          fill={kleur}
          stroke="var(--sb-paneel)"
          strokeWidth={1.5}
        />
      </>
    );
  };
  return (
    <g>
      {draad({ x: x + 14, y: y - 6 }, rood, "#d33")}
      {draad({ x: x + 14, y: y + 6 }, zwart, "#222")}
      {soort === "licht" ? (
        // LDR: schijfje met het slingerende spoor.
        <g transform={`translate(${x} ${y})`}>
          <circle
            r={16}
            fill="#e9d8b4"
            stroke="var(--sb-lijn)"
            strokeWidth={2}
          />
          <path
            d="M -9 -7 H 9 V -3 H -9 V 1 H 9 V 5 H -9"
            fill="none"
            stroke="#b5562b"
            strokeWidth={1.8}
          />
        </g>
      ) : (
        // NTC: een druppeltje met twee pootjes.
        <g transform={`translate(${x} ${y})`}>
          <path
            d="M 4 -6 H 14 M 4 6 H 14"
            stroke="var(--sb-lijn)"
            strokeWidth={2}
          />
          <ellipse
            cx={-4}
            cy={0}
            rx={12}
            ry={10}
            fill="#2f6db5"
            stroke="var(--sb-lijn)"
            strokeWidth={2}
          />
        </g>
      )}
      <text
        className="sb-label"
        x={x}
        y={y + 32}
        textAnchor="middle"
        style={{ fontSize: 12, fill: "var(--text-muted)" }}
      >
        {soort === "licht" ? "LDR" : "NTC"}
      </text>
    </g>
  );
}

/** Spanning van de voeding in de tweede stroomkring (het relais kan tot 30 V aan). */
const VOEDING = "12 V";

/**
 * De tweede stroomkring: voeding, relaiscontacten en apparaat, zoals op het
 * echte bord. De voeding staat rechts naast het bord, aan de onderste twee
 * zwarte bussen van het relais; het apparaat hangt aan de bovenste twee. Zo
 * loopt de stroom van de plus door het maakcontact (links), door het apparaat
 * en via de vaste verbinding (rechts) terug naar de min. Staat het apparaat
 * links van het midden, dan lopen de twee snoeren erheen om het bord heen.
 * Geen snoer kruist een ander. Is het relais dicht, dan kleuren ze mee.
 */
function Stroomkring({
  schakeling,
  k,
  aan,
  gesloten,
}: {
  schakeling: Schakeling;
  k: Kring;
  aan: boolean;
  gesloten: boolean;
}) {
  const { relais, apparaat, index, punt: app } = k;
  const rand = randen(schakeling);
  // Twee snoeren naast elkaar, 12 uit elkaar; een tweede kring ligt eromheen.
  const r0 = rand.rechts + 24 + index * 28;
  const b0 = rand.boven - 24 - index * 28;
  const { x, y } = relais;
  const bron = { x: rand.rechts + 70 + index * 70, y: y + 200 };
  const omBord = app.x < (rand.links + rand.rechts) / 2;
  const kleur = gesloten ? "var(--sb-hoog)" : "var(--sb-lijn)";

  // Apparaat aan de bovenste bussen. Om het bord heen: de linker bus loopt
  // hoog en binnen, de rechter laag en eromheen. Naar rechts: de linker bus
  // hoog naar de verste aansluiting. Voeding aan de onderste bussen.
  const snoeren = [
    omBord
      ? `M ${x + 128} ${y + 54} V ${y + 16} H ${r0} V ${b0} H ${app.x + 12} V ${app.y - 30}`
      : `M ${x + 128} ${y + 54} V ${y + 16} H ${app.x + 12} V ${app.y - 30}`,
    omBord
      ? `M ${x + 174} ${y + 54} V ${y + 28} H ${r0 + 12} V ${b0 - 12} H ${app.x - 12} V ${app.y - 30}`
      : `M ${x + 174} ${y + 54} V ${y + 28} H ${app.x - 12} V ${app.y - 30}`,
    `M ${x + 174} ${y + 146} V ${y + 154} H ${bron.x + 12} V ${bron.y - 22}`,
    `M ${x + 128} ${y + 146} V ${y + 166} H ${bron.x - 12} V ${bron.y - 22}`,
  ];
  const tekst = omBord
    ? { x: (r0 + app.x) / 2, y: b0 - 22 }
    : { x: bron.x, y: bron.y + 42 };

  const snoer = (d: string) => (
    <g key={d}>
      <path
        d={d}
        fill="none"
        stroke="var(--sb-paneel)"
        strokeWidth={7}
        strokeLinejoin="round"
      />
      <path
        d={d}
        fill="none"
        stroke={kleur}
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
    </g>
  );
  // Stekker in een zwarte bus van het relais.
  const stekker = (sx: number, sy: number) => (
    <g key={`${sx},${sy}`}>
      <circle
        cx={sx}
        cy={sy}
        r={9}
        fill={kleur}
        stroke="var(--sb-paneel)"
        strokeWidth={2}
      />
      <circle cx={sx} cy={sy} r={3.5} fill="var(--sb-gat)" />
    </g>
  );
  return (
    <g>
      {snoeren.map(snoer)}
      <Voeding x={bron.x} y={bron.y} />
      {[
        [128, 54],
        [174, 54],
        [128, 146],
        [174, 146],
      ].map(([dx, dy]) => stekker(x + dx, y + dy))}
      <Apparaat soort={apparaat} aan={aan} x={app.x} y={app.y} />
      <text
        className="sb-label"
        x={app.x}
        y={app.y + 40}
        textAnchor="middle"
        style={{ fontSize: 12, fill: "var(--text-muted)" }}
      >
        {apparaat}
      </text>
      <text
        className="sb-label"
        x={tekst.x}
        y={tekst.y}
        textAnchor="middle"
        style={{ fontSize: 12, fill: "var(--text-muted)" }}
      >
        {gesloten
          ? `relais dicht: stroom door de ${apparaat}`
          : `relais open: geen stroom door de ${apparaat}`}
      </text>
    </g>
  );
}

/** Voeding van de tweede stroomkring, plus en min allebei aan de bovenkant. */
function Voeding({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x={-26}
        y={-22}
        width={52}
        height={44}
        rx={6}
        fill="var(--sb-paneel)"
        stroke="var(--sb-lijn)"
        strokeWidth={2}
      />
      <circle
        cx={-12}
        cy={-22}
        r={5}
        fill="#d33"
        stroke="var(--sb-bus-rand)"
        strokeWidth={1.5}
      />
      <circle
        cx={12}
        cy={-22}
        r={5}
        fill="var(--sb-bus-zwart)"
        stroke="var(--sb-zwart-rand)"
        strokeWidth={1.5}
      />
      <text
        className="sb-label"
        y={8}
        textAnchor="middle"
        style={{ fontSize: 13, fontWeight: 600 }}
      >
        {VOEDING}
      </text>
      <text
        className="sb-label"
        x={-12}
        y={-6}
        textAnchor="middle"
        style={{ fontSize: 12 }}
      >
        +
      </text>
      <text
        className="sb-label"
        x={12}
        y={-6}
        textAnchor="middle"
        style={{ fontSize: 12 }}
      >
        −
      </text>
    </g>
  );
}

/**
 * Wat het apparaat doet, zichtbaar gemaakt: de lichtkegel van de lamp (naar
 * beneden, zoals een straatlantaarn), warmte rond de kachel en de wind van de
 * ventilator (naar rechts).
 */
function Werking({ k, gloed }: { k: Kring; gloed: number }) {
  const { x, y } = k.punt;
  if (gloed < 0.05) return null;
  if (k.apparaat === "lamp") {
    const bron = y + LAMP_BRON;
    const lengte = 130;
    const kegel = (hoek: number) => {
      const b = lengte * Math.tan((hoek * Math.PI) / 180);
      return `M ${x - 8} ${bron} L ${x - b} ${bron + lengte} L ${x + b} ${bron + lengte} L ${x + 8} ${bron} Z`;
    };
    return (
      <g>
        <path d={kegel(KEGEL_RAND)} fill="#ffd54a" opacity={0.12 * gloed} />
        <path d={kegel(KEGEL_VOL)} fill="#ffd54a" opacity={0.3 * gloed} />
      </g>
    );
  }
  if (k.apparaat === "kachel")
    return (
      <g fill="none" stroke="var(--sb-hoog)" strokeWidth={2} opacity={gloed}>
        <circle cx={x} cy={y} r={52} strokeDasharray="4 7" opacity={0.7} />
        <circle cx={x} cy={y} r={84} strokeDasharray="4 9" opacity={0.35} />
      </g>
    );
  return gloed > 0.3 ? (
    <path
      d={`M ${x + 30} ${y - 12} l 110 -18 M ${x + 30} ${y} h 120 M ${x + 30} ${y + 12} l 110 18`}
      stroke="var(--accent)"
      strokeWidth={2.5}
      strokeDasharray="6 7"
      strokeLinecap="round"
      fill="none"
      opacity={0.8}
    />
  ) : null;
}
