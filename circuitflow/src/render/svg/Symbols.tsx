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

function SchemFuse({ blown }: { blown: boolean }) {
  return (
    <g>
      <rect x={-20} y={-8} width={40} height={16} fill="none" stroke={SYM} strokeWidth={2} />
      {blown ? (
        <>
          <line x1={-20} y1={0} x2={-5} y2={0} stroke={SYM} strokeWidth={2} strokeLinecap="round" />
          <line x1={5} y1={0} x2={20} y2={0} stroke={SYM} strokeWidth={2} strokeLinecap="round" />
        </>
      ) : (
        <line x1={-20} y1={0} x2={20} y2={0} stroke={SYM} strokeWidth={2} />
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
      <rect x={-16} y={-12} width={32} height={24} rx={5} fill="#3f4a5a" stroke="#2b323c" strokeWidth={1.5} />
      <text x={0} y={5.5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#e8edf3">
        ϑ
      </text>
    </g>
  );
}

function SchemLdr() {
  return (
    <g>
      <rect x={-26} y={-9} width={52} height={18} fill="none" stroke={SYM} strokeWidth={2} />
      <LightArrows color={SYM} />
    </g>
  );
}

function SchemNtc() {
  return (
    <g>
      <rect x={-26} y={-9} width={52} height={18} fill="none" stroke={SYM} strokeWidth={2} />
      {/* schuine −ϑ-lijn met horizontale voet (IEC) */}
      <path d="M -34 20 H -26 L 22 -16" fill="none" stroke={SYM} strokeWidth={1.8} strokeLinejoin="round" />
      <text x={-14} y={22} fontSize={9.5} fontWeight={600} fill={SYM}>
        −ϑ
      </text>
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
// Lijnkleur past zich aan het thema aan; leads tekent CircuitSvg zoals altijd.
const SYM = "var(--text-primary)";

function SchemSource() {
  return (
    <g>
      {/* de wire loopt door tot aan beide platen (zelfde cf-lead-stijl) */}
      <line className="cf-lead" x1={-26} y1={0} x2={-7} y2={0} />
      <line className="cf-lead" x1={7} y1={0} x2={26} y2={0} />
      {/* lange dunne plaat = +, korte dikke plaat = − */}
      <line x1={-7} y1={-15} x2={-7} y2={15} stroke={SYM} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={7} y1={-8} x2={7} y2={8} stroke={SYM} strokeWidth={6} strokeLinecap="round" />
      <text x={-16} y={-7} fontSize={13} fontWeight={700} fill={SYM} className="cf-glyph">＋</text>
      <text x={16} y={-5} fontSize={13} fontWeight={700} fill={SYM} className="cf-glyph">－</text>
    </g>
  );
}

function SchemResistor({ power = 0 }: { power?: number }) {
  const h = heat(power);
  return (
    <g>
      {h > 0 && (
        <circle cx={0} cy={0} r={22 + 12 * h} fill="#ff5a2a" opacity={0.1 + 0.4 * h} filter="url(#cf-glow)" />
      )}
      <rect x={-26} y={-9} width={52} height={18} fill="none" stroke={SYM} strokeWidth={2} />
    </g>
  );
}

function SchemLamp({ brightness }: { brightness: number }) {
  const b = Math.max(0, Math.min(1, brightness));
  const lit = b > 0.02;
  return (
    <g>
      {lit && <circle cx={0} cy={0} r={12 + 30 * b} fill="#ffcf5a" opacity={0.12 + 0.5 * b} filter="url(#cf-glow)" />}
      <circle cx={0} cy={0} r={14} fill={lit ? `rgba(255,214,120,${0.25 + 0.5 * b})` : "none"} stroke={SYM} strokeWidth={2} />
      <line x1={-9.9} y1={-9.9} x2={9.9} y2={9.9} stroke={SYM} strokeWidth={2} />
      <line x1={-9.9} y1={9.9} x2={9.9} y2={-9.9} stroke={SYM} strokeWidth={2} />
    </g>
  );
}

function SchemLed({ color, brightness, burned }: { color: string; brightness: number; burned: boolean }) {
  const b = Math.max(0, Math.min(1, brightness));
  const lit = !burned && b > 0.02;
  const fill = burned ? "#3b3b43" : lit ? color : "none";
  return (
    <g>
      {lit && <circle cx={0} cy={0} r={10 + 26 * b} fill={color} opacity={0.15 + 0.55 * b} filter="url(#cf-glow)" />}
      {/* diode: driehoek anode(links) → kathode(rechts) + balk = met de stroom mee */}
      <path d="M -10 -11 L 9 0 L -10 11 Z" fill={fill} stroke={SYM} strokeWidth={2} strokeLinejoin="round" />
      <line x1={9} y1={-12} x2={9} y2={12} stroke={SYM} strokeWidth={2.5} strokeLinecap="round" />
      {/* twee lichtpijltjes */}
      <g stroke={SYM} strokeWidth={1.4} strokeLinecap="round" fill="none">
        <path d="M -1 -12 L 6 -20 M 6 -20 L 2.5 -19.5 M 6 -20 L 5.5 -16.5" />
        <path d="M 5 -11 L 12 -19 M 12 -19 L 8.5 -18.5 M 12 -19 L 11.5 -15.5" />
      </g>
      {burned && <path d="M -8 -7 L -2 -1 L -6 3 L 1 9" fill="none" stroke="#15151a" strokeWidth={1.6} strokeLinejoin="round" />}
    </g>
  );
}

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
}) {
  if (schematic) {
    switch (type) {
      case "source":
        return <SchemSource />;
      case "resistor":
        return <SchemResistor power={power} />;
      case "lamp":
        return <SchemLamp brightness={brightness} />;
      case "led":
        return <SchemLed color={ledColor} brightness={brightness} burned={burned} />;
      case "fuse":
        return <SchemFuse blown={blown} />;
      case "ldr":
        return <SchemLdr />;
      case "ntc":
        return <SchemNtc />;
      // schakelaar is al schematisch; meters blijven pictoriaal (echte instrumenten)
    }
  }
  switch (type) {
    case "source":
      return <Source />;
    case "resistor":
      return <Resistor resistance={resistance} power={power} />;
    case "lamp":
      return <Lamp brightness={brightness} />;
    case "led":
      return <Led color={ledColor} brightness={brightness} burned={burned} />;
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
