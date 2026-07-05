import { X } from "lucide-react";

import type { Sweep } from "@/model/sweep";

/** Eén curve in de plot; `active` krijgt de werkpunt-stip en een dikkere lijn. */
export interface GraphCurve {
  label: string;
  /** Lijnkleur; weggelaten = accentkleur. */
  color?: string;
  sweep: Sweep;
  active: boolean;
}

interface Props {
  title: string;
  curves: GraphCurve[];
  onClose: () => void;
}

const W = 300;
const H = 200;
const padL = 46;
const padR = 14;
const padT = 12;
const padB = 32;
const plotW = W - padL - padR;
const plotH = H - padT - padB;

/** Een "mooie" bovengrens (1/2/5 × 10ⁿ) net boven v. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const f = v / base;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return step * base;
}

const fmt = (v: number) => v.toLocaleString("nl-NL", { maximumFractionDigits: 2 });

/** Zeer lichte curvekleuren (wit-LED) → leesbaar alternatief op de lichte kaart. */
const CURVE_TINT: Record<string, string> = { "#fdf6d8": "#c9b96a" };

const TICKS = [0.25, 0.5, 0.75, 1];

export function GraphPanel({ title, curves, onClose }: Props) {
  const allPts = curves.flatMap((c) => c.sweep.points);
  const hasData = allPts.length > 1 && allPts.some((p) => p.i > 1e-9);

  const rawMaxU = Math.max(...allPts.map((p) => p.u), 1e-6);
  const rawMaxI = Math.max(...allPts.map((p) => p.i), 1e-9);
  const mA = rawMaxI < 0.5;
  const iScale = mA ? 1000 : 1;
  const iUnit = mA ? "mA" : "A";
  const maxU = niceMax(rawMaxU);
  const maxIdisp = niceMax(rawMaxI * iScale);

  const x = (u: number) => padL + (u / maxU) * plotW;
  const y = (iDisp: number) => padT + plotH - (iDisp / maxIdisp) * plotH;
  const pathFor = (s: Sweep) =>
    s.points
      .map((p, k) => `${k ? "L" : "M"} ${x(p.u).toFixed(1)} ${y(p.i * iScale).toFixed(1)}`)
      .join(" ");
  const strokeFor = (c: GraphCurve) => CURVE_TINT[c.color ?? ""] ?? c.color ?? "var(--accent)";
  const activeCurve = curves.find((c) => c.active);
  const op = activeCurve ? activeCurve.sweep.points[activeCurve.sweep.operating] : undefined;

  return (
    <div className="absolute bottom-3 left-3 z-20 w-[320px] rounded-xl border border-(--border-solid) bg-card p-3 shadow-xl">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-(--text-primary)">
          {title} · I&#8209;U&#8209;karakteristiek
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="grid h-6 w-6 place-items-center rounded-md text-(--text-muted) hover:bg-(--bg-card-hover)"
        >
          <X size={14} />
        </button>
      </div>

      {hasData ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
            {/* rasterlijnen */}
            {TICKS.map((f) => (
              <line
                key={`gy${f}`}
                x1={padL}
                y1={y(maxIdisp * f)}
                x2={padL + plotW}
                y2={y(maxIdisp * f)}
                stroke="var(--border-solid)"
                strokeWidth={0.6}
              />
            ))}
            {TICKS.map((f) => (
              <line
                key={`gx${f}`}
                x1={x(maxU * f)}
                y1={padT}
                x2={x(maxU * f)}
                y2={padT + plotH}
                stroke="var(--border-solid)"
                strokeWidth={0.6}
              />
            ))}
            {/* assen */}
            <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="var(--text-muted)" strokeWidth={1.2} />
            <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="var(--text-muted)" strokeWidth={1.2} />
            {/* curves: eerst de inactieve (dun), dan de actieve erbovenop */}
            {curves
              .filter((c) => !c.active)
              .map((c) => (
                <path
                  key={c.label}
                  d={pathFor(c.sweep)}
                  fill="none"
                  stroke={strokeFor(c)}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  opacity={0.75}
                />
              ))}
            {activeCurve && (
              <path
                d={pathFor(activeCurve.sweep)}
                fill="none"
                stroke={strokeFor(activeCurve)}
                strokeWidth={2.4}
                strokeLinejoin="round"
              />
            )}
            {/* werkpunt op de actieve curve */}
            {op && activeCurve && (
              <circle cx={x(op.u)} cy={y(op.i * iScale)} r={3.5} fill={strokeFor(activeCurve)} />
            )}
            {/* as-waarden: 0 + tussenliggende ticks + max, op beide assen */}
            <text x={padL} y={padT + plotH + 13} fontSize={9} fill="var(--text-muted)" textAnchor="middle">
              0
            </text>
            {TICKS.map((f) => (
              <text
                key={`tx${f}`}
                x={x(maxU * f)}
                y={padT + plotH + 13}
                fontSize={9}
                fill="var(--text-muted)"
                textAnchor="middle"
              >
                {fmt(maxU * f)}
              </text>
            ))}
            <text x={padL - 5} y={padT + plotH + 3} fontSize={9} fill="var(--text-muted)" textAnchor="end">
              0
            </text>
            {TICKS.map((f) => (
              <text
                key={`ty${f}`}
                x={padL - 5}
                y={y(maxIdisp * f) + 3}
                fontSize={9}
                fill="var(--text-muted)"
                textAnchor="end"
              >
                {fmt(maxIdisp * f)}
              </text>
            ))}
            {/* as-labels */}
            <text x={padL + plotW / 2} y={H - 3} fontSize={10} fill="var(--text-secondary)" textAnchor="middle">
              U (V)
            </text>
            <text
              x={12}
              y={padT + plotH / 2}
              fontSize={10}
              fill="var(--text-secondary)"
              textAnchor="middle"
              transform={`rotate(-90 12 ${padT + plotH / 2})`}
            >
              I ({iUnit})
            </text>
          </svg>
          {curves.length > 1 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
              {curves.map((c) => (
                <span key={c.label} className="flex items-center gap-1 text-[11px] text-(--text-secondary)">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: strokeFor(c), outline: c.active ? "2px solid var(--accent)" : "none", outlineOffset: 1 }}
                  />
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="px-1 py-6 text-center text-sm text-(--text-muted)">
          Sluit een gesloten kring met een spanningsbron aan om de karakteristiek te zien.
        </p>
      )}
    </div>
  );
}
