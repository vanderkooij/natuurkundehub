/**
 * Pictoriale component-bodies, getekend in lokale coördinaten rond de oorsprong,
 * met de as langs x. De leads naar de terminal-vertices worden NIET hier getekend
 * maar door CircuitSvg in wereldcoördinaten (flexibel, naar de echte vertexpositie).
 * De body hecht aan op ±LEAD_ATTACH[type].
 */
import type { ComponentType } from "@/model/types";

/** Lineaire RGB-interpolatie tussen twee hex-kleuren. */
function lerpHex(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function Source() {
  return (
    <g>
      <rect x={-31} y={-6} width={6} height={12} rx={2} fill="#c9a24a" stroke="#9c7d34" strokeWidth={1} />
      <rect x={-26} y={-17} width={52} height={34} rx={6} fill="#4b5564" stroke="#2b323c" strokeWidth={1.5} />
      <rect x={-26} y={-17} width={14} height={34} rx={6} fill="#c5543a" />
      <rect x={-16} y={-17} width={4} height={34} fill="#c5543a" />
      <rect x={-22} y={-13} width={44} height={6} rx={3} fill="rgba(255,255,255,0.18)" />
      <text x={-19} y={5} className="cf-glyph" textAnchor="middle">＋</text>
      <text x={19} y={5} className="cf-glyph" textAnchor="middle">－</text>
    </g>
  );
}

// Standaard weerstand-kleurcode: cijfer 0..9 → kleur.
const BAND_COLORS = [
  "#1c1c1c", // 0 zwart
  "#6b3f1d", // 1 bruin
  "#d0342c", // 2 rood
  "#e8792b", // 3 oranje
  "#eaca3f", // 4 geel
  "#3a9b4e", // 5 groen
  "#2f6fb2", // 6 blauw
  "#7a4bc4", // 7 violet
  "#8a8a8a", // 8 grijs
  "#f0f0f0", // 9 wit
];
const GOLD = "#caa14a"; // ×0,1 en tolerantie ±5%
const SILVER = "#c7ccd1"; // ×0,01

/**
 * Vier kleurbanden uit de weerstandwaarde: 2 significante cijfers + machtsband,
 * plus een gouden tolerantieband. Ontkoppeld van de exacte R (netjes afgerond
 * naar de kleurcode): 474 Ω → geel-violet-bruin (= 470).
 */
function resistorBands(ohm: number): [string, string, string] {
  const v = Math.max(0.1, ohm);
  let exp = Math.floor(Math.log10(v));
  let two = Math.round(v / Math.pow(10, exp - 1)); // 2 sig. cijfers (10..99, soms 100)
  if (two >= 100) {
    two = Math.round(two / 10);
    exp += 1;
  }
  const d1 = Math.floor(two / 10);
  const d2 = two % 10;
  const multN = exp - 1;
  const mult =
    multN >= 0 ? BAND_COLORS[Math.min(9, multN)] : multN === -1 ? GOLD : SILVER;
  return [BAND_COLORS[d1], BAND_COLORS[d2], mult];
}

/** Warmte-gloed 0..1: vanaf ~0,5 W zichtbaar, rond 8 W vol ("een weerstand wordt warm"). */
function heat(power: number): number {
  return Math.max(0, Math.min(1, (power - 0.5) / 7.5));
}

function Resistor({ resistance, power = 0 }: { resistance: number; power?: number }) {
  const [c1, c2, c3] = resistorBands(resistance);
  const h = heat(power);
  const band = (x: number, fill: string, key: string) => (
    <rect key={key} x={x} y={-13} width={4.5} height={26} fill={fill} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
  );
  return (
    <g>
      {h > 0 && (
        <circle cx={0} cy={0} r={24 + 12 * h} fill="#ff5a2a" opacity={0.1 + 0.4 * h} filter="url(#cf-glow)" />
      )}
      <rect x={-30} y={-13} width={60} height={26} rx={9} fill="#e2c187" stroke="#b6904f" strokeWidth={1.5} />
      <rect x={-26} y={-11} width={52} height={5} rx={2} fill="rgba(255,255,255,0.22)" />
      {/* kleurbanden: 2 cijfers + macht (links) + gouden tolerantieband (rechts) */}
      {band(-18, c1, "d1")}
      {band(-10.5, c2, "d2")}
      {band(-3, c3, "mult")}
      {band(15, GOLD, "tol")}
    </g>
  );
}

/** Regelbare weerstand: weerstand met een schuine pijl erdoorheen. */
function VarResistor({ resistance, power = 0 }: { resistance: number; power?: number }) {
  return (
    <g>
      <Resistor resistance={resistance} power={power} />
      <path d="M -26 18 L 22 -15" stroke="#2d3a48" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M 30 -20.5 L 17.5 -17.5 L 23.5 -8.5 Z" fill="#2d3a48" />
    </g>
  );
}

/**
 * Potmeter (pictoriaal) als schuifweerstand, zoals op het practicum: een
 * keramische buis met draadwindingen, een metalen stang erlangs (kant side) en
 * een schuifcontact op de plek van de loper (wx langs de as). De draad naar de
 * loper tekent CircuitSvg; het schuifje kun je op het canvas verslepen.
 */
function Pot({ power = 0, wx, side }: { power?: number; wx: number; side: 1 | -1 }) {
  const h = heat(power);
  const rail = side * 17; // hartlijn van de stang
  const windings = Array.from({ length: 17 }, (_, i) => -24 + i * 3);
  return (
    <g>
      {h > 0 && (
        <circle cx={0} cy={0} r={24 + 12 * h} fill="#ff5a2a" opacity={0.1 + 0.4 * h} filter="url(#cf-glow)" />
      )}
      {/* steuntjes aan de uiteinden, van buis naar stang */}
      <rect x={-31} y={Math.min(rail, 0) - 2} width={5} height={Math.abs(rail) + 4} rx={1.5} fill="#7b8794" />
      <rect x={26} y={Math.min(rail, 0) - 2} width={5} height={Math.abs(rail) + 4} rx={1.5} fill="#7b8794" />
      {/* keramische buis met windingen */}
      <rect x={-28} y={-9} width={56} height={18} rx={4} fill="#efe6d2" stroke="#b9a77f" strokeWidth={1.3} />
      {windings.map((x) => (
        <line key={x} x1={x} y1={-8} x2={x + 1.4} y2={8} stroke="#9a7b45" strokeWidth={1.1} />
      ))}
      {/* metalen stang */}
      <rect x={-30} y={rail - 2} width={60} height={4} rx={2} fill="#c3c9d1" stroke="#8a929c" strokeWidth={0.8} />
      {/* schuifcontact: blokje op de stang met een veertje naar de windingen */}
      <line x1={wx} y1={rail} x2={wx} y2={side * 8} stroke="#6b7280" strokeWidth={2.2} strokeLinecap="round" />
      <rect x={wx - 6} y={rail - 6} width={12} height={12} rx={2.5} fill="#3f4a5a" stroke="#222932" strokeWidth={1} />
      <rect x={wx - 3.5} y={rail - 3.5} width={7} height={2} rx={1} fill="rgba(255,255,255,0.35)" />
    </g>
  );
}

function Lamp({ brightness }: { brightness: number }) {
  const b = Math.max(0, Math.min(1, brightness));
  const lit = b > 0.02;
  // Gloeiende draad blijft amberkleurig (niet wit) zodat de spiraal zichtbaar
  // blijft tegen de warme gloed.
  const filament = lerpHex("#6b5a33", "#ffb733", b);
  // Spiraalvormige gloeidraad (helix van overlappende lussen) i.p.v. de scherpe
  // zigzag die te veel op een (Amerikaans) weerstandssymbool leek. Startpunt op
  // y=6,5 zodat de lussen verticaal om het midden (y=0) van de ballon vallen.
  const coil = "M -10 6.5 a 3 7.5 0 1 1 4 0 a 3 7.5 0 1 1 4 0 a 3 7.5 0 1 1 4 0 a 3 7.5 0 1 1 4 0 a 3 7.5 0 1 1 4 0";
  return (
    <g>
      {/* zachte puntgloed: kleur schuift met het vermogen van warmgeel naar
          feller wit (zoals een gloeidraad heter wordt) */}
      {lit && (
        <circle
          cx={0}
          cy={0}
          r={14 + 44 * b}
          fill={lerpHex("#ffc94a", "#fff4dd", b)}
          opacity={0.13 + 0.55 * b}
          filter="url(#cf-glow)"
        />
      )}
      {lit && (
        <circle
          cx={0}
          cy={0}
          r={4 + 11 * b}
          fill={lerpHex("#ffe9a8", "#ffffff", b)}
          opacity={0.3 + 0.32 * b}
          filter="url(#cf-glow)"
        />
      )}
      {/* glazen ballon */}
      <circle
        cx={0}
        cy={0}
        r={20}
        fill={lit ? "#fff6cf" : "rgba(255,255,255,0.16)"}
        fillOpacity={lit ? 0.25 + 0.6 * b : 1}
        stroke="#9fb3c9"
        strokeWidth={1.5}
      />
      {/* draadjes naar de spiraal (die nu op y≈6,5 aanhecht) */}
      <line className="cf-lead-thin" x1={-21} y1={0} x2={-10} y2={6.5} />
      <line className="cf-lead-thin" x1={21} y1={0} x2={10} y2={6.5} />
      {/* spiraalvormige gloeidraad (iets dikker bij branden, blijft zichtbaar) */}
      <path
        d={coil}
        fill="none"
        stroke={filament}
        strokeWidth={2.2 + 0.9 * b}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  );
}

function Led({
  color,
  brightness,
  burned,
}: {
  color: string;
  brightness: number;
  burned: boolean;
}) {
  const b = Math.max(0, Math.min(1, brightness));
  const lit = !burned && b > 0.02;
  // Lens als kogel met de punt naar de KATHODE (rechts, v1): de vorm wijst dus
  // van anode → kathode, met de (afgesproken) conventionele stroom mee. Uit =
  // gedempte kleur zodat "branden" duidelijk oplicht (fel + puntgloed).
  const muted = lerpHex(color, "#8b9098", 0.5);
  const lensFill = burned ? "#3b3b43" : lit ? lerpHex(color, "#ffffff", 0.12 + 0.3 * b) : muted;
  const lensOpacity = burned ? 1 : lit ? 0.95 : 0.62;
  const dieFill = lit ? lerpHex(color, "#ffffff", 0.55 + 0.4 * b) : burned ? "#26262c" : muted;

  return (
    <g>
      {/* puntgloed: zachte gekleurde halo + feller kerntje, sterk bij branden */}
      {lit && (
        <circle cx={-1} cy={0} r={11 + 30 * b} fill={color} opacity={0.2 + 0.62 * b} filter="url(#cf-glow)" />
      )}
      {lit && (
        <circle cx={-1} cy={0} r={5 + 12 * b} fill={lerpHex(color, "#ffffff", 0.55)} opacity={0.5 + 0.4 * b} filter="url(#cf-glow)" />
      )}
      {/* lens-body: dikke ronde achterkant bij de anode (links), spitse neus bij
          de kathode (rechts) — de "pijl" wijst met de stroom mee */}
      <path
        d="M -12 -12 L 3 -12 Q 15 -12 19 0 Q 15 12 3 12 L -12 12 Q -16 12 -16 7 L -16 -7 Q -16 -12 -12 -12 Z"
        fill={lensFill}
        fillOpacity={lensOpacity}
        stroke={burned ? "#2b2b31" : "#7d92a8"}
        strokeWidth={1.5}
      />
      {/* glans op de lens */}
      {!burned && <path d="M -10 -7 Q -13 0 -10 6" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.4} strokeLinecap="round" />}
      {/* die / lichtpunt */}
      <circle cx={-2} cy={0} r={4} fill={dieFill} />
      {/* kathode-streep (polariteit) net vóór de neus */}
      <line x1={12} y1={-8} x2={12} y2={8} stroke={burned ? "#5a5a63" : "#2d3a48"} strokeWidth={2.6} strokeLinecap="round" />
      {/* doorgebrand: scheur */}
      {burned && (
        <path d="M -8 -7 L -2 -1 L -6 3 L 1 9" fill="none" stroke="#15151a" strokeWidth={1.6} strokeLinejoin="round" />
      )}
    </g>
  );
}

function Fuse({ blown }: { blown: boolean }) {
  return (
    <g>
      {/* metalen eindkapjes */}
      <rect x={-23} y={-9} width={7} height={18} rx={2} fill="#b8bfc9" stroke="#8a929c" strokeWidth={1} />
      <rect x={16} y={-9} width={7} height={18} rx={2} fill="#b8bfc9" stroke="#8a929c" strokeWidth={1} />
      {/* glazen buis */}
      <rect x={-18} y={-9} width={36} height={18} rx={5} fill="rgba(205,214,226,0.35)" stroke="#9fb3c9" strokeWidth={1.5} />
      {blown ? (
        <>
          <ellipse cx={0} cy={0} rx={9} ry={5.5} fill="rgba(40,40,50,0.28)" />
          <line x1={-16} y1={0} x2={-4} y2={-1} stroke="#5b616b" strokeWidth={1.6} strokeLinecap="round" />
          <line x1={4} y1={1} x2={16} y2={0} stroke="#5b616b" strokeWidth={1.6} strokeLinecap="round" />
          <circle cx={-3.5} cy={-1} r={2} fill="#2b2b31" />
          <circle cx={3.5} cy={1} r={2} fill="#2b2b31" />
        </>
      ) : (
        <line x1={-16} y1={0} x2={16} y2={0} stroke="#6b7280" strokeWidth={1.8} strokeLinecap="round" />
      )}
    </g>
  );
}

/** Pijltjes die op een sensor "invallen" (licht op de LDR). */
function LightArrows({ color }: { color: string }) {
  return (
    <g stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none">
      <path d="M -26 -26 L -17 -17 M -17 -17 L -21 -16.5 M -17 -17 L -17.5 -21" />
      <path d="M -18 -31 L -9 -22 M -9 -22 L -13 -21.5 M -9 -22 L -9.5 -26" />
    </g>
  );
}

function Ldr() {
  return (
    <g>
      {/* aansluitbeentjes tot ±LEAD_ATTACH zodat de draden flush aansluiten */}
      <line className="cf-lead" x1={-30} y1={0} x2={-12} y2={0} />
      <line className="cf-lead" x1={30} y1={0} x2={12} y2={0} />
      {/* ronde sensor-schijf met slingerspoor, zoals een echte LDR */}
      <circle cx={0} cy={0} r={14} fill="#e8ddc4" stroke="#b6904f" strokeWidth={1.5} />
      <path
        d="M -9 -8 H 9 M -9 -3 H 9 M -9 2 H 9 M -9 7 H 9 M -9 -8 V -3 M 9 -3 V 2 M -9 2 V 7"
        fill="none"
        stroke="#c0392b"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <LightArrows color="#d4923a" />
    </g>
  );
}

function Ntc() {
  return (
    <g>
      {/* aansluitbeentjes tot ±LEAD_ATTACH zodat de draden flush aansluiten */}
      <line className="cf-lead" x1={-30} y1={0} x2={-15} y2={0} />
      <line className="cf-lead" x1={30} y1={0} x2={15} y2={0} />
      <rect x={-16} y={-12} width={32} height={24} rx={5} fill="#3f4a5a" stroke="#2b323c" strokeWidth={1.5} />
      <text x={0} y={5.5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#e8edf3">
        ϑ
      </text>
    </g>
  );
}

/** Gewone diode: zwart cilindertje met een zilveren ring aan de kathodekant (v1). */
function Diode({ burned }: { burned: boolean }) {
  return (
    <g>
      <rect x={-20} y={-10} width={40} height={20} rx={4} fill={burned ? "#26262c" : "#2a2d33"} stroke="#15171b" strokeWidth={1.5} />
      <rect x={-17} y={-8} width={34} height={4} rx={2} fill="rgba(255,255,255,0.14)" />
      <rect x={9} y={-10} width={6} height={20} fill="#c7ccd1" />
      {burned && (
        <path d="M -10 -7 L -4 -1 L -8 3 L -1 8" fill="none" stroke="#c5543a" strokeWidth={1.6} strokeLinejoin="round" />
      )}
    </g>
  );
}

function Switch({ closed }: { closed: boolean }) {
  return (
    <g>
      <circle cx={-16} cy={0} r={3.5} className="cf-contact" />
      <circle cx={16} cy={0} r={3.5} className="cf-contact" />
      {/* hefboom: dicht = vlak over beide contacten, open = opgetild */}
      {closed ? (
        <line className="cf-lever" x1={-16} y1={0} x2={18} y2={0} />
      ) : (
        <line className="cf-lever" x1={-16} y1={0} x2={11} y2={-17} />
      )}
      <circle cx={-16} cy={0} r={2} fill="var(--cf-wire)" />
    </g>
  );
}

function DigitalMeter({ letter }: { letter: string }) {
  return (
    <g>
      <rect x={-34} y={-26} width={68} height={46} rx={6} fill="#39414f" stroke="#222932" strokeWidth={1.5} />
      {/* LCD-venster bovenin (uitlezing tekent CircuitSvg er rechtop op); de
          bolletjes lopen onder het scherm langs door de meter heen (y=0). */}
      <rect x={-29} y={-22} width={58} height={16} rx={3} fill="#0d1a13" stroke="#0a3a28" strokeWidth={1} />
      <text x={29} y={16} className="cf-meter-letter" textAnchor="end">{letter}</text>
    </g>
  );
}

// ── Schematische (schoolboek) symbolen ──────────────────────────────────────
// Precies de symbolen van CircuitSketch, twee keer zo groot (raster 20 → 40,
// aansluitingen op ±60 = TERMINAL_SPAN / 2). Zo ziet een schakeling die uit
// CircuitSketch komt er hier hetzelfde uit. De lijnkleur volgt het thema; de
// leads vanaf ±SCHEM_ATTACH naar de terminals tekent CircuitSvg.
const SYM = "var(--text-primary)";
const G = 40;
const SW = 3;
const line = { stroke: SYM, strokeWidth: SW, strokeLinecap: "round" as const, fill: "none" };

/** Gevulde pijlpunt die bij (x2,y2) eindigt, van (x1,y1) af gezien. */
function ArrowHead({ x1, y1, x2, y2, len, w }: { x1: number; y1: number; x2: number; y2: number; len: number; w: number }) {
  const d = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / d;
  const uy = (y2 - y1) / d;
  const bx = x2 - ux * len;
  const by = y2 - uy * len;
  return <path d={`M ${x2} ${y2} L ${bx - uy * w} ${by + ux * w} L ${bx + uy * w} ${by - ux * w} Z`} fill={SYM} />;
}

/**
 * Bron: lange dunne plaat = + (v0, links), korte plaat = −. `side` kiest de
 * kant (lokale y) van de +/−-tekens; CircuitSvg legt ze tegenover de waarde.
 */
function SchemSource({ side, angle }: { side: 1 | -1; angle: number }) {
  const gap = G * 0.18;
  const ty = G * 0.38 * side;
  const tx = gap + G * 0.34;
  // De tekens staan rechtop, hoe de bron ook gedraaid is.
  const sign = (x: number, t: string) => (
    <text
      x={x}
      y={ty}
      transform={`rotate(${-angle} ${x} ${ty})`}
      fill={SYM}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 18, fontWeight: 600, pointerEvents: "none" }}
    >
      {t}
    </text>
  );
  return (
    <g>
      <line {...line} x1={-gap} y1={-G * 0.6} x2={-gap} y2={G * 0.6} />
      <line {...line} x1={gap} y1={-G * 0.35} x2={gap} y2={G * 0.35} />
      {sign(-tx, "+")}
      {sign(tx, "−")}
    </g>
  );
}

function SchemResistor({ power = 0 }: { power?: number }) {
  const h = heat(power);
  return (
    <g>
      {h > 0 && (
        <circle cx={0} cy={0} r={30 + 12 * h} fill="#ff5a2a" opacity={0.1 + 0.4 * h} filter="url(#cf-glow)" />
      )}
      <rect {...line} x={-G} y={-G * 0.4} width={G * 2} height={G * 0.8} />
    </g>
  );
}

function SchemVarResistor({ power = 0 }: { power?: number }) {
  // Pijl van linksonder naar rechtsboven, met de punt buiten het lichaam
  const x1 = -G * 0.95;
  const y1 = G * 0.75;
  const x2 = G * 0.95;
  const y2 = -G * 0.75;
  const d = Math.hypot(x2 - x1, y2 - y1);
  const k = 1 - 8.4 / d; // lijn stopt net vóór de punt
  return (
    <g>
      <SchemResistor power={power} />
      <line {...line} x1={x1} y1={y1} x2={x1 + (x2 - x1) * k} y2={y1 + (y2 - y1) * k} />
      <ArrowHead x1={x1} y1={y1} x2={x2} y2={y2} len={14} w={7} />
    </g>
  );
}

/** Potmeter: weerstand met een pijl (de loper) die op het lichaam drukt. */
function SchemPot({ power = 0, wx, side }: { power?: number; wx: number; side: 1 | -1 }) {
  const y0 = side * G * 0.4; // rand van het lichaam
  const y1 = side * G * 0.7; // achterkant van de pijlpunt
  return (
    <g>
      <SchemResistor power={power} />
      <path d={`M ${wx} ${y0} L ${wx - 8} ${y1} L ${wx + 8} ${y1} Z`} fill={SYM} />
    </g>
  );
}

function SchemLamp({ brightness }: { brightness: number }) {
  const b = Math.max(0, Math.min(1, brightness));
  const lit = b > 0.02;
  const r = G * 0.7;
  const d = r * 0.55;
  return (
    <g>
      {lit && <circle cx={0} cy={0} r={16 + 34 * b} fill="#ffcf5a" opacity={0.12 + 0.5 * b} filter="url(#cf-glow)" />}
      <circle {...line} cx={0} cy={0} r={r} fill={lit ? `rgba(255,214,120,${0.25 + 0.5 * b})` : "none"} />
      <path {...line} d={`M ${-d} ${-d} L ${d} ${d} M ${d} ${-d} L ${-d} ${d}`} />
    </g>
  );
}

/** Diode en LED: driehoek van anode (v0) naar kathode (v1) met een streep. */
function SchemDiode({ fill = "none" }: { fill?: string }) {
  const a = G * 0.6;
  return (
    <g>
      <path {...line} d={`M ${-a} ${-a} L ${-a} ${a} L ${a} 0 Z`} fill={fill} strokeLinejoin="round" />
      <line {...line} x1={a} y1={-a} x2={a} y2={a} />
    </g>
  );
}

function SchemLed({ color, brightness, burned }: { color: string; brightness: number; burned: boolean }) {
  const b = Math.max(0, Math.min(1, brightness));
  const lit = !burned && b > 0.02;
  const s = G * 0.3;
  return (
    <g>
      {lit && <circle cx={0} cy={0} r={14 + 30 * b} fill={color} opacity={0.15 + 0.55 * b} filter="url(#cf-glow)" />}
      <SchemDiode fill={burned ? "#3b3b43" : lit ? color : "none"} />
      {/* twee lichtpijltjes naar buiten */}
      {[-G * 0.6, -G * 0.9].map((dy) => (
        <path
          key={dy}
          {...line}
          strokeWidth={2}
          d={`M ${s} ${dy} L ${s + G * 0.5} ${dy - G * 0.3} M ${s + G * 0.5} ${dy - G * 0.3} L ${s + G * 0.3} ${dy - G * 0.2} M ${s + G * 0.5} ${dy - G * 0.3} L ${s + G * 0.4} ${dy - G * 0.1}`}
        />
      ))}
      {burned && <path d="M -14 -10 L -6 -2 L -12 4 L -2 12" fill="none" stroke="#c5543a" strokeWidth={2} strokeLinejoin="round" />}
    </g>
  );
}

function SchemDiodeBody({ burned }: { burned: boolean }) {
  return (
    <g>
      <SchemDiode fill={burned ? "#3b3b43" : "none"} />
      {burned && <path d="M -14 -10 L -6 -2 L -12 4 L -2 12" fill="none" stroke="#c5543a" strokeWidth={2} strokeLinejoin="round" />}
    </g>
  );
}

function SchemFuse({ blown }: { blown: boolean }) {
  const w = G * 0.8;
  return (
    <g>
      <rect {...line} x={-w} y={-G * 0.3} width={w * 2} height={G * 0.6} />
      {blown ? (
        <path {...line} d={`M ${-w} 0 H -8 M 8 0 H ${w}`} />
      ) : (
        <line {...line} x1={-w} y1={0} x2={w} y2={0} />
      )}
    </g>
  );
}

function SchemLdr() {
  const arrows: [number, number, number, number][] = [
    [G * 1.3, -G * 1.4, G * 0.3, -G * 0.4],
    [G * 1.8, -G * 1.4, G * 0.8, -G * 0.4],
  ];
  return (
    <g>
      <rect {...line} x={-G} y={-G * 0.4} width={G * 2} height={G * 0.8} />
      {arrows.map(([x1, y1, x2, y2]) => (
        <g key={x1}>
          <line {...line} strokeWidth={2.2} x1={x1} y1={y1} x2={x2} y2={y2} />
          <ArrowHead x1={x1} y1={y1} x2={x2} y2={y2} len={10} w={5} />
        </g>
      ))}
    </g>
  );
}

function SchemNtc({ angle }: { angle: number }) {
  const cx = G * 1.5;
  const cy = -G * 0.6;
  return (
    <g>
      <rect {...line} x={-G} y={-G * 0.4} width={G * 2} height={G * 0.8} />
      <line {...line} x1={-G * 0.9} y1={G * 0.38} x2={cx} y2={cy} />
      <circle {...line} cx={cx} cy={cy} r={G * 0.22} fill="var(--cf-canvas)" />
      <text x={cx} y={cy + 1} transform={`rotate(${-angle} ${cx} ${cy})`} fontSize={G * 0.32} fontWeight={700} fill={SYM} textAnchor="middle" dominantBaseline="central">
        −
      </text>
    </g>
  );
}

function SchemSwitch({ closed }: { closed: boolean }) {
  const a = G * 0.6;
  return (
    <g>
      <circle cx={-a} cy={0} r={5} fill={SYM} />
      <circle cx={a} cy={0} r={5} fill={SYM} />
      {closed ? (
        <line {...line} x1={-a} y1={0} x2={a} y2={0} />
      ) : (
        <line {...line} x1={-a} y1={0} x2={a - G * 0.2} y2={-G * 0.7} />
      )}
    </g>
  );
}

/** Meter: cirkel; de letter (V/A) zet CircuitSvg er rechtop in. */
function SchemMeter() {
  return <circle {...line} cx={0} cy={0} r={G * 0.7} fill="var(--cf-canvas)" />;
}

/** Waar de leads aan het schematische symbool vastzitten (±, langs de as). */
export const SCHEM_ATTACH: Partial<Record<ComponentType, number>> = {
  source: G * 0.18,
  resistor: G,
  varresistor: G,
  potmeter: G,
  lamp: G * 0.7,
  led: G * 0.6,
  diode: G * 0.6,
  fuse: G * 0.8,
  ldr: G,
  ntc: G,
  switch: G * 0.6,
  voltmeter: G * 0.7,
  ammeter: G * 0.7,
};

export function ComponentSymbol({
  type,
  brightness = 0,
  closed = true,
  ledColor = "#ff2d2d",
  burned = false,
  blown = false,
  resistance = 10,
  power = 0,
  schematic = false,
  side = -1,
  angle = 0,
  wiperX = 0,
  wiperSide = -1,
}: {
  type: ComponentType;
  brightness?: number;
  closed?: boolean;
  ledColor?: string;
  burned?: boolean;
  blown?: boolean;
  resistance?: number;
  power?: number;
  schematic?: boolean;
  /** Alleen schematische bron: kant (lokale y) van de +/−-tekens. */
  side?: 1 | -1;
  /** Draaihoek van het symbool (graden), om tekst rechtop te zetten. */
  angle?: number;
  /** Alleen potmeter: plek van de loper langs de as en de kant ervan. */
  wiperX?: number;
  wiperSide?: 1 | -1;
}) {
  if (schematic) {
    switch (type) {
      case "source":
        return <SchemSource side={side} angle={angle} />;
      case "resistor":
        return <SchemResistor power={power} />;
      case "varresistor":
        return <SchemVarResistor power={power} />;
      case "potmeter":
        return <SchemPot power={power} wx={wiperX} side={wiperSide} />;
      case "lamp":
        return <SchemLamp brightness={brightness} />;
      case "led":
        return <SchemLed color={ledColor} brightness={brightness} burned={burned} />;
      case "fuse":
        return <SchemFuse blown={blown} />;
      case "ldr":
        return <SchemLdr />;
      case "ntc":
        return <SchemNtc angle={angle} />;
      case "diode":
        return <SchemDiodeBody burned={burned} />;
      case "switch":
        return <SchemSwitch closed={closed} />;
      case "voltmeter":
      case "ammeter":
        return <SchemMeter />;
    }
  }
  switch (type) {
    case "source":
      return <Source />;
    case "resistor":
      return <Resistor resistance={resistance} power={power} />;
    case "varresistor":
      return <VarResistor resistance={resistance} power={power} />;
    case "potmeter":
      return <Pot power={power} wx={wiperX} side={wiperSide} />;
    case "lamp":
      return <Lamp brightness={brightness} />;
    case "led":
      return <Led color={ledColor} brightness={brightness} burned={burned} />;
    case "diode":
      return <Diode burned={burned} />;
    case "fuse":
      return <Fuse blown={blown} />;
    case "ldr":
      return <Ldr />;
    case "ntc":
      return <Ntc />;
    case "switch":
      return <Switch closed={closed} />;
    case "voltmeter":
      return <DigitalMeter letter="V" />;
    case "ammeter":
      return <DigitalMeter letter="A" />;
  }
}
