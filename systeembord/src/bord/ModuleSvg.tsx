import {
  isHoog,
  MODULES,
  RELAIS_APPARATEN,
  SENSOREN,
  type ModuleInstantie,
} from "@/sim";

import {
  BUS_STRAAL,
  KNOP_BEREIK,
  knopVan,
  vormVan,
  type BusVorm,
  type KnopVorm,
} from "./geometrie";

export interface ModuleActies {
  /** Een knop die alleen werkt zolang je hem vasthoudt (drukschakelaar, resetknop). */
  onKnopDown: (param: string) => (e: React.PointerEvent) => void;
  /** Schakelaar "vast" van de drukschakelaar. */
  onVast: () => void;
  /** Tik op de geluidsensor. */
  onTik: () => void;
  /** Tik op het keuzeknopje van een sensorbus: volgende sensor. */
  onSensorKeuze: () => void;
  /** Tik op het apparaat aan het relais: volgende apparaat. */
  onApparaat: () => void;
  /** Een draaiknop vastpakken. */
  onDraaiDown: (k: KnopVorm) => (e: React.PointerEvent) => void;
  /** Tik op het invulvakje bij een draaiknop. */
  onWaardeTik: (k: KnopVorm) => void;
  /** Muiswiel boven een draaiknop. */
  onDraaiWiel: (k: KnopVorm) => (e: React.WheelEvent) => void;
}

interface Props extends ModuleActies {
  m: ModuleInstantie;
  /** Spanning op een bus van deze module. */
  spanning: (bus: string) => number;
  /** Tellerstand, voor het display. */
  stand: number;
  /** Contacten van het relais dicht (volgt de ingang met wat schakeltijd). */
  relaisGesloten: boolean;
  /** Licht (lux) en gemeten temperatuur (°C) bij de sensoren. */
  omgeving: { licht: number; gemetenTemperatuur: number };
  geselecteerd: boolean;
  /** Schermpixels per werkvlakeenheid (voor de aanraakvlakken). */
  schaal?: number;
  /** Vast op een bord: dan zonder eigen schaduw, zoals een vak in het paneel. */
  opBord: boolean;
  onVakDown: (e: React.PointerEvent) => void;
}

/** Kleinste aanraakvlak in schermpixels (een vingertop is ongeveer 44 px). */
export const MIN_RAAK = 40;

const nl = (v: number, dec = 1) => v.toFixed(dec).replace(".", ",");

/** Het vak van een module met symbool en label; de bussen tekent de laag erboven. */
export function ModuleSvg(p: Props) {
  const v = vormVan(p.m.soort);
  const knop = knopVan(p.m.soort);
  return (
    <g transform={`translate(${p.m.x} ${p.m.y})`}>
      <rect
        width={v.breedte}
        height={v.hoogte}
        rx={p.opBord ? 2 : 4}
        fill="var(--sb-paneel)"
        stroke={p.geselecteerd ? "var(--accent)" : "var(--sb-paneel-rand)"}
        strokeWidth={p.geselecteerd ? 4 : p.opBord ? 1.5 : 2}
        style={{
          cursor: p.opBord ? "default" : "grab",
          filter: p.opBord
            ? undefined
            : "drop-shadow(0 2px 3px var(--sb-schaduw))",
        }}
        onPointerDown={p.onVakDown}
      />
      {knop && knopZichtbaar(p.m) && (
        // Invulvakje: tik op de waarde om hem te typen.
        <rect
          x={knop.vak.x}
          y={knop.vak.y}
          width={knop.vak.b}
          height={knop.vak.h}
          rx={4}
          fill="var(--bg-card)"
          stroke="var(--sb-paneel-rand)"
          strokeWidth={1.2}
          pointerEvents="none"
        />
      )}
      <Inhoud {...p} />
      {knop &&
        !(p.m.soort === "sensor" && Number(p.m.params.sensor ?? 0) !== 0) && (
          <Draaiknop
            k={knop}
            waarde={Number(p.m.params[knop.param] ?? knop.min)}
            onDown={p.onDraaiDown(knop)}
            onWiel={p.onDraaiWiel(knop)}
          />
        )}
      {v.bussen.map((b) => b.label && <BusLabel key={b.bus} b={b} />)}
      <text
        className="sb-label"
        x={v.label.x}
        y={v.label.y}
        textAnchor={
          v.label.uitlijning === "midden"
            ? "middle"
            : v.label.uitlijning === "rechts"
              ? "end"
              : "start"
        }
      >
        {moduleNaam(p.m)}
      </text>
    </g>
  );
}

/** Een sensorbus met een echte sensor erin heeft geen draaiknop. */
const knopZichtbaar = (m: ModuleInstantie) =>
  !(m.soort === "sensor" && Number(m.params.sensor ?? 0) !== 0);

/** Naam in het vak; een sensorbus heet naar wat erin zit. */
function moduleNaam(m: ModuleInstantie): string {
  if (m.soort === "sensor") {
    const soort = SENSOREN[Number(m.params.sensor ?? 0)];
    if (soort === "licht") return "lichtsensor";
    if (soort === "temperatuur") return "temperatuursensor";
  }
  return MODULES[m.soort].naam;
}

/** Korte labels (8, 4, 2, 1) boven de bus, langere (set, reset) ernaast. */
function BusLabel({ b }: { b: BusVorm }) {
  const kort = b.label!.length <= 2;
  const boven = b.labelBoven === true;
  return (
    <text
      className="sb-label"
      style={{ fontSize: 15 }}
      x={kort ? b.x : b.x + BUS_STRAAL + 6}
      y={kort ? b.y - BUS_STRAAL - 6 : boven ? b.y - 8 : b.y + 5}
      textAnchor={kort ? "middle" : "start"}
    >
      {b.label}
    </text>
  );
}

const lijn = {
  stroke: "var(--sb-lijn)",
  strokeWidth: 2,
  fill: "none",
} as const;
const lijnZonderFill = { stroke: "var(--sb-lijn)", strokeWidth: 2 } as const;

/** Draaiknop met schaal, zoals op het bord: slepen rond de knop of het muiswiel erboven. */
function Draaiknop({
  k,
  waarde,
  onDown,
  onWiel,
}: {
  k: KnopVorm;
  waarde: number;
  onDown: (e: React.PointerEvent) => void;
  onWiel: (e: React.WheelEvent) => void;
}) {
  const { cx, cy, r } = k;
  const fractie = (waarde - k.min) / (k.max - k.min);
  const graden = (a: number) => (a * Math.PI) / 180;
  const hoek = graden(
    -KNOP_BEREIK + 2 * KNOP_BEREIK * Math.min(1, Math.max(0, fractie)),
  );
  const streepjes = Array.from({ length: 6 }, (_, i) =>
    graden(-KNOP_BEREIK + ((2 * KNOP_BEREIK) / 5) * i),
  );
  const groot = r >= 15;
  return (
    <g style={{ cursor: "grab" }} onPointerDown={onDown} onWheel={onWiel}>
      <title>{`Draai: sleep rond de knop of gebruik het muiswiel (${nl(k.min, 0)} tot ${nl(k.max, 0)} ${k.eenheid})`}</title>
      {/* Ruim aanraakvlak, ook voor kleine knopjes op het digibord. */}
      <circle cx={cx} cy={cy} r={Math.max(r + 12, 24)} fill="transparent" />
      {streepjes.map((a, i) => (
        <line
          key={i}
          x1={cx + Math.sin(a) * (r + 3)}
          y1={cy - Math.cos(a) * (r + 3)}
          x2={cx + Math.sin(a) * (r + 7)}
          y2={cy - Math.cos(a) * (r + 7)}
          stroke="var(--sb-lijn)"
          strokeWidth={1.5}
          pointerEvents="none"
        />
      ))}
      {groot && (
        <g pointerEvents="none">
          <text
            className="sb-label"
            style={{ fontSize: 11 }}
            x={cx - r - 4}
            y={cy + r + 12}
            textAnchor="middle"
          >
            {nl(k.min, 0)}
          </text>
          <text
            className="sb-label"
            style={{ fontSize: 11 }}
            x={cx + r + 4}
            y={cy + r + 12}
            textAnchor="middle"
          >
            {nl(k.max, 0)} {k.eenheid}
          </text>
        </g>
      )}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="var(--sb-knop-ring)"
        stroke="var(--sb-lijn)"
        strokeWidth={1.5}
      />
      <line
        x1={cx}
        y1={cy}
        x2={cx + Math.sin(hoek) * (r - 3)}
        y2={cy - Math.cos(hoek) * (r - 3)}
        stroke="var(--sb-knop)"
        strokeWidth={3}
        strokeLinecap="round"
        pointerEvents="none"
      />
    </g>
  );
}

const SENSOR_NAAM: Record<(typeof SENSOREN)[number], string> = {
  draaiknop: "een draaiknop als vervanger van een sensor",
  licht: "een lichtsensor",
  temperatuur: "een temperatuursensor",
};

/** Klein icoon voor wat er in de sensorbus zit: draaiknop, zon of thermometer. */
function SensorIcoon({
  soort,
  x,
  y,
  kleur,
}: {
  soort: (typeof SENSOREN)[number];
  x: number;
  y: number;
  kleur: string;
}) {
  const lijn = {
    stroke: kleur,
    strokeWidth: 2,
    fill: "none",
    strokeLinecap: "round",
  } as const;
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      {soort === "draaiknop" && (
        <>
          <circle r={8} {...lijn} />
          <path d="M 0 0 L 4 -6" {...lijn} />
        </>
      )}
      {soort === "licht" && (
        <>
          <circle r={4.5} fill={kleur} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path
              key={a}
              d="M 0 -7.5 V -10.5"
              transform={`rotate(${a})`}
              {...lijn}
            />
          ))}
        </>
      )}
      {soort === "temperatuur" && (
        <>
          <path d="M -2.5 3 V -8 A 2.5 2.5 0 0 1 2.5 -8 V 3" {...lijn} />
          <circle cy={6} r={4.5} fill={kleur} />
        </>
      )}
    </g>
  );
}

/** Hangslotje, open of dicht, in de lijnstijl van het bord. */
function Slot({ x, y, dicht }: { x: number; y: number; dicht: boolean }) {
  const kleur = dicht ? "#fff" : "var(--sb-tekst)";
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <rect x={-7} y={-2} width={14} height={11} rx={2} fill={kleur} />
      <path
        d={
          dicht
            ? "M -4.5 -2 V -5.5 A 4.5 4.5 0 0 1 4.5 -5.5 V -2"
            : "M -4.5 -2 V -5.5 A 4.5 4.5 0 0 1 4.5 -5.5 V -7"
        }
        transform={dicht ? undefined : "translate(5 -1)"}
        fill="none"
        stroke={kleur}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </g>
  );
}

function Inhoud(p: Props) {
  const { m } = p;
  const v = vormVan(m.soort);
  const bus = (naam: string) => v.bussen.find((b) => b.bus === naam)!;
  const num = (naam: string) => Number(m.params[naam] ?? 0);

  switch (m.soort) {
    case "drukschakelaar": {
      const in_ = m.params.ingedrukt === true;
      const vast = m.params.vast === true;
      return (
        <>
          <g
            style={{ cursor: "pointer" }}
            onPointerDown={p.onKnopDown("ingedrukt")}
          >
            {/* Ruim aanraakvlak om de knop, ook voor een vinger op het digibord. */}
            <circle cx={58} cy={40} r={32} fill="transparent" />
            <circle cx={58} cy={40} r={22} fill="var(--sb-knop-ring)" />
            <circle
              cx={58}
              cy={in_ ? 42 : 40}
              r={in_ ? 15 : 17}
              fill="var(--sb-knop)"
              stroke={in_ ? "var(--sb-hoog)" : "none"}
              strokeWidth={3}
            />
          </g>
          {/* Niet op het echte bord: een slotje zet de knop vast, zodat hij als schakelaar werkt. */}
          <g
            style={{ cursor: "pointer" }}
            onPointerDown={(e) => {
              e.stopPropagation();
              p.onVast();
            }}
          >
            <title>
              {vast
                ? "Knop staat vast: elke druk zet hem aan of uit. Tik om los te maken."
                : "Knop vastzetten: dan werkt hij als schakelaar"}
            </title>
            <circle cx={122} cy={40} r={22} fill="transparent" />
            <circle
              cx={122}
              cy={40}
              r={16}
              fill={vast ? "var(--accent)" : "transparent"}
              stroke={vast ? "var(--accent)" : "var(--sb-paneel-rand)"}
              strokeWidth={1.5}
            />
            <Slot x={122} y={40} dicht={vast} />
          </g>
        </>
      );
    }
    case "variabeleSpanning": {
      const u = num("spanning");
      return (
        <>
          <text
            className="sb-label"
            x={146}
            y={46}
            textAnchor="end"
            style={{ fontSize: 14 }}
          >
            {nl(u)} V
          </text>
        </>
      );
    }
    case "pulsgenerator": {
      const f = num("frequentie");
      return (
        <>
          <text
            className="sb-label"
            x={146}
            y={46}
            textAnchor="end"
            style={{ fontSize: 14 }}
          >
            {nl(f, f % 1 === 0 ? 0 : 1)} Hz
          </text>
        </>
      );
    }
    case "sensor": {
      // Voeding van de losse sensor (rood en zwart), een keuzeknopje voor wat er
      // in de bus zit, en de gemeten waarde.
      const soort = SENSOREN[num("sensor")] ?? "draaiknop";
      const u = p.spanning("uit1");
      return (
        <>
          <g pointerEvents="none">
            <circle
              cx={28}
              cy={24}
              r={8}
              fill="#d33"
              stroke="var(--sb-bus-rand)"
              strokeWidth={1.5}
            />
            <circle
              cx={28}
              cy={54}
              r={8}
              fill="var(--sb-bus-zwart)"
              stroke="var(--sb-zwart-rand)"
              strokeWidth={1.5}
            />
            {soort !== "draaiknop" && (
              <text
                className="sb-label"
                x={118}
                y={46}
                textAnchor="middle"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {soort === "licht"
                  ? `${Math.round(p.omgeving.licht)} lux`
                  : `${nl(p.omgeving.gemetenTemperatuur)} °C`}
              </text>
            )}
            <text
              className="sb-label"
              x={118}
              y={72}
              textAnchor="middle"
              style={{ fontSize: 12 }}
            >
              {nl(u)} V
            </text>
          </g>
          <g
            style={{ cursor: "pointer" }}
            onPointerDown={(e) => {
              e.stopPropagation();
              p.onSensorKeuze();
            }}
          >
            <title>
              {`In deze bus: ${SENSOR_NAAM[soort]}. Tik voor een andere sensor.`}
            </title>
            <rect x={42} y={20} width={56} height={40} fill="transparent" />
            <rect
              x={48}
              y={26}
              width={44}
              height={28}
              rx={6}
              fill={
                soort === "draaiknop" ? "var(--sb-paneel)" : "var(--accent)"
              }
              stroke={
                soort === "draaiknop" ? "var(--sb-lijn)" : "var(--accent)"
              }
              strokeWidth={1.5}
            />
            <SensorIcoon
              soort={soort}
              x={70}
              y={40}
              kleur={soort === "draaiknop" ? "var(--sb-tekst)" : "#fff"}
            />
          </g>
        </>
      );
    }
    case "geluidsensor": {
      const u = p.spanning("uit");
      return (
        <g
          style={{ cursor: "pointer" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            p.onTik();
          }}
        >
          <title>Tik op het bord</title>
          <circle cx={92} cy={40} r={34} fill="transparent" />
          {u > 0.05 && (
            <circle
              cx={92}
              cy={40}
              r={6 + u * 4}
              fill="var(--sb-hoog)"
              opacity={0.25}
            />
          )}
          <circle
            cx={92}
            cy={40}
            r={5}
            fill="var(--sb-gat)"
            stroke="var(--sb-zwart-rand)"
            strokeWidth={1.5}
          />
          <text
            className="sb-label"
            x={92}
            y={70}
            textAnchor="middle"
            style={{ fontSize: 12, fill: "var(--text-muted)" }}
          >
            tik hier
          </text>
        </g>
      );
    }
    case "adOmzetter":
      return (
        <g pointerEvents="none">
          <text
            className="sb-label"
            x={30}
            y={24}
            textAnchor="middle"
            style={{ fontSize: 13 }}
          >
            in
          </text>
          <path d="M 88 70 H 184" {...lijn} />
          <text
            className="sb-label"
            x={136}
            y={86}
            textAnchor="middle"
            style={{ fontSize: 13 }}
          >
            uit
          </text>
        </g>
      );
    case "comparator": {
      const i = bus("in"),
        u = bus("uit");
      const uref = num("uref");
      return (
        <g pointerEvents="none">
          <path d="M 62 34 L 62 106 L 128 70 Z" {...lijn} />
          <path
            d={`M ${i.x + BUS_STRAAL} ${i.y} H 62 M 128 ${u.y} H ${u.x - BUS_STRAAL}`}
            {...lijn}
          />
          <text
            className="sb-label"
            x={134}
            y={112}
            textAnchor="end"
            style={{ fontSize: 11 }}
          >
            {nl(uref)} V
          </text>
        </g>
      );
    }
    case "en":
    case "of":
    case "nand":
    case "nor":
    case "xor":
    case "xnor": {
      const i1 = bus("in1"),
        i2 = bus("in2"),
        u = bus("uit");
      // Symbolen volgens IEC: & (EN), ≥1 (OF), =1 (XOR); een rondje aan de
      // uitgang betekent "omgekeerd" (NAND, NOR, XNOR).
      const symbool = {
        en: "&",
        nand: "&",
        of: "≥1",
        nor: "≥1",
        xor: "=1",
        xnor: "=1",
      }[m.soort];
      const omgekeerd =
        m.soort === "nand" || m.soort === "nor" || m.soort === "xnor";
      return (
        <g pointerEvents="none">
          <rect x={64} y={24} width={72} height={92} {...lijn} />
          <path
            d={`M ${i1.x + BUS_STRAAL} ${i1.y} H 64 M ${i2.x + BUS_STRAAL} ${i2.y} H 64 M ${omgekeerd ? 146 : 136} ${u.y} H ${u.x - BUS_STRAAL}`}
            {...lijn}
          />
          {omgekeerd && (
            <circle
              cx={141}
              cy={u.y}
              r={5}
              fill="var(--sb-paneel)"
              {...lijnZonderFill}
            />
          )}
          <text className="sb-symbool" x={100} y={82} textAnchor="middle">
            {symbool}
          </text>
        </g>
      );
    }
    case "geheugencel": {
      const s = bus("set"),
        r = bus("reset"),
        u = bus("uit");
      return (
        <g pointerEvents="none">
          <rect x={84} y={34} width={52} height={72} {...lijn} />
          <path
            d={`M ${s.x} ${s.y + BUS_STRAAL} V 58 H 84 M ${r.x} ${r.y - BUS_STRAAL} V 82 H 84 M 136 ${u.y} H ${u.x - BUS_STRAAL}`}
            {...lijn}
          />
          <text className="sb-symbool" x={110} y={82} textAnchor="middle">
            M
          </text>
        </g>
      );
    }
    case "invertor":
    case "transistor": {
      const i = bus("in"),
        u = bus("uit");
      if (m.soort === "transistor") {
        // Transistorsymbool zoals op het oudere bord.
        return (
          <g pointerEvents="none">
            <circle cx={100} cy={70} r={30} {...lijn} />
            <path
              d={`M ${i.x + BUS_STRAAL} ${i.y} H 88 M 88 52 V 88 M 88 62 L 112 48 V 34 M 88 78 L 112 92 V 106 M 104 87 L 112 92 L 106 84 M 130 ${u.y} H ${u.x - BUS_STRAAL}`}
              {...lijn}
            />
          </g>
        );
      }
      return (
        <g pointerEvents="none">
          <rect x={70} y={34} width={60} height={72} {...lijn} />
          <path
            d={`M ${i.x + BUS_STRAAL} ${i.y} H 70 M 130 ${u.y} H ${u.x - BUS_STRAAL}`}
            {...lijn}
          />
          <text className="sb-symbool" x={100} y={82} textAnchor="middle">
            1
          </text>
        </g>
      );
    }
    case "pulsenteller": {
      const ingang = ["tel", "aan", "reset"].map(bus);
      const uit = ["8", "4", "2", "1"].map(bus);
      const reset = m.params.resetKnop === true;
      return (
        <>
          <g pointerEvents="none">
            <rect x={160} y={22} width={60} height={116} {...lijn} />
            <path
              d={ingang
                .map((b) => `M ${b.x + BUS_STRAAL} ${b.y} H 160`)
                .join(" ")}
              {...lijn}
            />
            <path
              d={uit
                .map(
                  (b, i) =>
                    `M 220 ${54 + i * 6} H ${b.x} V ${b.y + BUS_STRAAL}`,
                )
                .join(" ")}
              {...lijn}
            />
            <text className="sb-symbool" x={190} y={92} textAnchor="middle">
              T
            </text>
            <rect x={262} y={66} width={92} height={62} rx={4} fill="#2a0707" />
            <text
              x={308}
              y={114}
              textAnchor="middle"
              style={{
                fill: "#ff3b3b",
                fontFamily: "var(--font-mono)",
                fontSize: 44,
                fontWeight: 600,
              }}
            >
              {p.stand}
            </text>
          </g>
          {/* Resetknopje op het bord, naast de ingang reset. */}
          <g
            style={{ cursor: "pointer" }}
            onPointerDown={p.onKnopDown("resetKnop")}
          >
            <title>Resetknop van de teller</title>
            <circle cx={190} cy={150} r={18} fill="transparent" />
            <circle cx={190} cy={150} r={9} fill="var(--sb-knop-ring)" />
            <circle cx={190} cy={150} r={reset ? 5 : 6} fill="var(--sb-knop)" />
          </g>
        </>
      );
    }
    case "led": {
      const aan = isHoog(p.spanning("in"));
      return (
        <g pointerEvents="none">
          {aan && (
            <circle
              cx={166}
              cy={40}
              r={20}
              fill="var(--sb-led-aan)"
              opacity={0.3}
            />
          )}
          <circle
            cx={166}
            cy={40}
            r={10}
            fill={aan ? "var(--sb-led-aan)" : "var(--sb-led-uit)"}
            stroke="var(--sb-lijn)"
            strokeWidth={1.5}
          />
        </g>
      );
    }
    case "zoemer": {
      const aan = isHoog(p.spanning("in"));
      return (
        <g pointerEvents="none">
          <rect x={150} y={28} width={10} height={24} {...lijn} />
          <path d="M 160 28 L 172 20 V 60 L 160 52" {...lijn} />
          {aan && (
            <path
              d="M 178 30 Q 184 40 178 50 M 184 24 Q 194 40 184 56"
              stroke="var(--sb-hoog)"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
            />
          )}
        </g>
      );
    }
    case "relais": {
      const aan = p.relaisGesloten;
      const i = bus("in");
      return (
        <g pointerEvents="none">
          {/* Zoals het symbool op het bord: spoel met schuine streep en aarde,
              een maakcontact tussen de linker twee bussen en een vaste
              doorverbinding tussen de rechter twee. */}
          <text className="sb-label" x={80} y={186} style={{ fontSize: 13 }}>
            max 30 V / 2,5 A
          </text>
          <path d={`M ${i.x + BUS_STRAAL} ${i.y} H 58`} {...lijn} />
          <rect x={58} y={80} width={24} height={28} {...lijn} />
          <path d="M 58 108 L 82 80" {...lijn} />
          <path
            d="M 70 108 V 128 M 60 128 H 80 M 64 133 H 76 M 68 138 H 72"
            {...lijn}
          />
          {[
            [128, 54],
            [174, 54],
            [128, 146],
            [174, 146],
          ].map(([x, y]) => (
            <g key={`${x},${y}`}>
              <circle
                cx={x}
                cy={y}
                r={14}
                fill="var(--sb-bus-zwart)"
                stroke="var(--sb-zwart-rand)"
                strokeWidth={2}
              />
              <circle cx={x} cy={y} r={5} fill="var(--sb-gat)" />
            </g>
          ))}
          {/* Maakcontact links: dicht als de spoel het anker aantrekt. */}
          <path
            d={`M 128 68 V 84 M 128 132 V 116 ${aan ? "M 128 116 V 84" : "M 128 116 L 146 88"}`}
            stroke={aan ? "var(--sb-hoog)" : "var(--sb-lijn)"}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
          {/* Doorverbinding rechts: altijd verbonden. */}
          <path d="M 174 68 V 132" {...lijn} />
          {/* Het anker: de spoel bedient de schakelaar. */}
          <path
            d={`M 82 94 H ${aan ? 128 : 136}`}
            {...lijn}
            strokeDasharray="4 4"
          />
          <g
            pointerEvents="all"
            style={{ cursor: "pointer" }}
            onPointerDown={(e) => {
              e.stopPropagation();
              p.onApparaat();
            }}
          >
            <title>Tik om een ander apparaat aan het relais te hangen</title>
            {/* Keuzeknopje: het apparaat zelf staat in de tweede stroomkring,
                buiten het bord. */}
            <rect
              x={14}
              y={20}
              width={96}
              height={30}
              rx={8}
              fill="var(--bg-card)"
              stroke="var(--sb-lijn)"
              strokeWidth={1.5}
            />
            <text
              className="sb-label"
              x={24}
              y={40}
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              {RELAIS_APPARATEN[num("apparaat")] ?? "lamp"}
            </text>
            <path
              d="M 92 32 l 5 5 l 5 -5"
              fill="none"
              stroke="var(--sb-lijn)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      );
    }
  }
}

/** Het apparaat dat het relais schakelt, in de lijnstijl van het bord. */
export function Apparaat({
  soort,
  aan,
  x,
  y,
}: {
  soort: (typeof RELAIS_APPARATEN)[number];
  aan: boolean;
  x: number;
  y: number;
}) {
  const kleur = aan ? "var(--sb-hoog)" : "var(--sb-paneel)";
  switch (soort) {
    case "lamp":
      return (
        <g transform={`translate(${x} ${y})`} pointerEvents="none">
          {/* Straatlantaarn: een kap met de lamp eronder, schijnt naar beneden. */}
          {aan && <circle cy={6} r={20} fill="#ffd54a" opacity={0.35} />}
          <path d="M 0 -14 V -24 H 14" fill="none" {...lijnZonderFill} />
          <circle
            cy={4}
            r={7}
            fill={aan ? "#ffd54a" : "var(--sb-paneel)"}
            {...lijnZonderFill}
          />
          <path
            d="M -22 0 L -12 -14 H 12 L 22 0 Z"
            fill="var(--sb-knop-ring)"
            {...lijnZonderFill}
          />
        </g>
      );
    case "kachel":
      return (
        <g transform={`translate(${x} ${y})`} pointerEvents="none">
          {[-15, -5, 5, 15].map((dx) => (
            <rect
              key={dx}
              x={dx - 4}
              y={-14}
              width={8}
              height={30}
              rx={3}
              fill={kleur}
              {...lijnZonderFill}
            />
          ))}
          <path d="M -22 18 H 22" {...lijnZonderFill} />
          {aan && (
            <path
              d="M -10 -20 q 3 -4 0 -8 M 0 -20 q 3 -4 0 -8 M 10 -20 q 3 -4 0 -8"
              fill="none"
              stroke="var(--sb-hoog)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}
        </g>
      );
    case "ventilator":
      return (
        <g transform={`translate(${x} ${y})`} pointerEvents="none">
          <circle r={24} fill="none" {...lijnZonderFill} />
          <g>
            {[0, 120, 240].map((a) => (
              <path
                key={a}
                d="M 0 0 C 6 -6 6 -18 0 -20 C -6 -18 -6 -6 0 0 Z"
                transform={`rotate(${a})`}
                fill={kleur}
                {...lijnZonderFill}
                strokeWidth={1.5}
              />
            ))}
            {aan && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0"
                to="360"
                dur="0.6s"
                repeatCount="indefinite"
              />
            )}
          </g>
          <circle r={3} fill="var(--sb-lijn)" />
        </g>
      );
  }
}

/**
 * Onzichtbare klikvlakken voor alle bediening van een module (knoppen,
 * draaiknoppen, keuzeknopjes). Deze laag ligt boven de draden, zodat een draad
 * die over een vak loopt de bediening eronder niet blokkeert.
 */
export function BedieningSvg(p: Props) {
  const { m } = p;
  const schaal = p.schaal ?? 1;
  // Elk aanraakvlak minstens MIN_RAAK schermpixels, op elk zoomniveau.
  const minW = MIN_RAAK / schaal;
  const cirkel = (cx: number, cy: number, r: number) => ({
    cx,
    cy,
    r: Math.max(r, minW / 2),
  });
  const rechthoek = (x: number, y: number, b: number, h: number) => {
    const bb = Math.max(b, minW),
      hh = Math.max(h, minW);
    return { x: x - (bb - b) / 2, y: y - (hh - h) / 2, width: bb, height: hh };
  };
  const vlak = { fill: "transparent", style: { cursor: "pointer" } } as const;
  const stop = (f: () => void) => (e: React.PointerEvent) => {
    e.stopPropagation();
    f();
  };
  const knop = knopVan(m.soort);
  return (
    <g transform={`translate(${m.x} ${m.y})`}>
      {m.soort === "drukschakelaar" && (
        <>
          <circle
            {...cirkel(58, 40, 32)}
            {...vlak}
            onPointerDown={p.onKnopDown("ingedrukt")}
          />
          <circle
            {...cirkel(122, 40, 20)}
            {...vlak}
            onPointerDown={stop(p.onVast)}
          >
            <title>Knop vastzetten of losmaken</title>
          </circle>
        </>
      )}
      {m.soort === "sensor" && (
        <rect
          {...rechthoek(44, 22, 52, 36)}
          {...vlak}
          onPointerDown={stop(p.onSensorKeuze)}
        >
          <title>Tik voor een andere sensor</title>
        </rect>
      )}
      {m.soort === "geluidsensor" && (
        <circle {...cirkel(92, 40, 34)} {...vlak} onPointerDown={stop(p.onTik)}>
          <title>Tik op het bord</title>
        </circle>
      )}
      {m.soort === "pulsenteller" && (
        <circle
          {...cirkel(190, 150, 16)}
          {...vlak}
          onPointerDown={p.onKnopDown("resetKnop")}
        >
          <title>Resetknop van de teller</title>
        </circle>
      )}
      {m.soort === "relais" && (
        <rect
          {...rechthoek(14, 20, 96, 30)}
          {...vlak}
          onPointerDown={stop(p.onApparaat)}
        >
          <title>Tik om een ander apparaat aan het relais te hangen</title>
        </rect>
      )}
      {knop && knopZichtbaar(m) && (
        <circle
          {...cirkel(knop.cx, knop.cy, Math.max(knop.r + 10, 22))}
          fill="transparent"
          style={{ cursor: "grab" }}
          onPointerDown={p.onDraaiDown(knop)}
          onWheel={p.onDraaiWiel(knop)}
        />
      )}
      {/* Het invulvakje na de draaiknop, zodat het bij overlap voorgaat. */}
      {knop && knopZichtbaar(m) && (
        <rect
          {...rechthoek(
            knop.vak.x - 4,
            knop.vak.y - 4,
            knop.vak.b + 8,
            knop.vak.h + 8,
          )}
          fill="transparent"
          style={{ cursor: "text" }}
          onPointerDown={stop(() => p.onWaardeTik(knop))}
        >
          <title>Tik om de waarde te typen</title>
        </rect>
      )}
    </g>
  );
}
