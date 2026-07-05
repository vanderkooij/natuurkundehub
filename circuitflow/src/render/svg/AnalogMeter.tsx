/**
 * Schematische analoge VOS-meter: kastje met venster, een boog met hoofd- en
 * tussenstreepjes, drie getalrijen die de boog volgen (elk getal recht onder z'n
 * streepje, waar de naald wijst — net als op de foto) en een wijzer. De actieve
 * rij (het aangesloten bereik) wordt geaccentueerd. Bij doorslaan kleurt de naald
 * rood. De 4 poorten (klikbaar) tekent CircuitSvg eroverheen.
 */
import { ANALOG_H, ANALOG_W, analogPortOffsets, type AnalogSpec } from "@/model/meterSpec";

const PX = -37; // pivot x (in het venster)
const PY = 56; // pivot y
const R = 116; // boogstraal
const SWEEP = 56; // halve hoek (graden) vanaf verticaal
const ROW_R = [R - 15, R - 32, R - 49]; // straal per getalrij (dicht bij de buitenboog)

const ptAt = (angDeg: number, r: number) => {
  const a = (angDeg * Math.PI) / 180;
  return { x: PX + r * Math.sin(a), y: PY - r * Math.cos(a) };
};
const angFor = (frac: number) => -SWEEP + frac * 2 * SWEEP;
const fmt = (v: number) =>
  Number.isInteger(v) ? String(v) : v.toLocaleString("nl-NL", { maximumFractionDigits: 3 });

interface Props {
  spec: AnalogSpec;
  /** Wijzeruitslag als fractie van het actieve bereik (kan >1 = doorslaan). */
  deflection: number;
  /** Index (0..2) van het actieve bereik, of null als niets aangesloten. */
  activeIndex: number | null;
  overRange: boolean;
}

export function AnalogMeter({ spec, deflection, activeIndex, overRange }: Props) {
  const hw = ANALOG_W / 2;
  const hh = ANALOG_H / 2;
  const majors = spec.intervals;

  const ticks = [];
  for (let k = 0; k <= majors; k++) {
    const ang = angFor(k / majors);
    const o = ptAt(ang, R);
    const iN = ptAt(ang, R - 10);
    ticks.push(<line key={`M${k}`} x1={o.x} y1={o.y} x2={iN.x} y2={iN.y} stroke="#334155" strokeWidth={1.7} />);
    if (k < majors) {
      for (let m = 1; m < 5; m++) {
        const ang2 = angFor((k + m / 5) / majors);
        const a = ptAt(ang2, R);
        const b = ptAt(ang2, R - 5);
        ticks.push(<line key={`m${k}-${m}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#94a3b8" strokeWidth={0.9} />);
      }
    }
  }

  // Drie getalrijen die de boog volgen.
  const numbers = [];
  for (let r = 0; r < 3; r++) {
    const active = r === activeIndex;
    for (let k = 0; k <= majors; k++) {
      const p = ptAt(angFor(k / majors), ROW_R[r]);
      numbers.push(
        <text
          key={`n${r}-${k}`}
          x={p.x}
          y={p.y + 3}
          textAnchor="middle"
          fontSize={9.5}
          fontWeight={active ? 700 : 400}
          fill={active ? "var(--accent)" : "#475569"}
        >
          {fmt((k / majors) * spec.ranges[r])}
        </text>,
      );
    }
  }

  // Negatieve uitslag = verkeerd om aangesloten → naald prikt links tegen de aanslag.
  const needleFrac = Math.max(-0.09, Math.min(1.08, deflection));
  const tip = ptAt(angFor(needleFrac), R - 5);
  const reversed = deflection < -0.002;
  const needleColor = overRange || reversed ? "#dc2626" : "#b3192a";

  return (
    <g>
      {/* kastje */}
      <rect x={-hw} y={-hh} width={ANALOG_W} height={ANALOG_H} rx={12} fill="#e3e8ee" stroke="#aab4c0" strokeWidth={1.8} />
      <text x={-hw + 14} y={-hh + 22} fontSize={14} fontWeight={700} fill="#1f5fa8">
        VOS
      </text>
      {/* venster */}
      <rect x={-144} y={-90} width={214} height={154} rx={6} fill="#ffffff" stroke="#9fb3c9" strokeWidth={1.2} />
      {ticks}
      {numbers}
      {/* grote A/V */}
      <text x={PX} y={54} textAnchor="middle" fontSize={30} fontWeight={800} fill="#1a1a2e">
        {spec.letter}
      </text>
      {/* naald + as */}
      <line x1={PX} y1={PY} x2={tip.x} y2={tip.y} stroke={needleColor} strokeWidth={2.6} strokeLinecap="round" />
      <circle cx={PX} cy={PY} r={4.5} fill="#1a1a2e" />
      {/* bereik-labels bij de poorten */}
      {analogPortOffsets().map((off, i) => (
        <text
          key={`pl${i}`}
          x={off.x - 12}
          y={off.y + 4}
          textAnchor="end"
          fontSize={10}
          fontWeight={600}
          fill="#2d2d4a"
        >
          {i === 0 ? "0" : fmt(spec.ranges[i - 1])}
        </text>
      ))}
    </g>
  );
}
