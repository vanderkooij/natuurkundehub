import { X } from "lucide-react";

import { METER, METER_SCHAAL, type VoltmeterStand } from "./geometrie";

/** Maat van de tekening van het kastje, voor het vergroten. */
const T = { breedte: 170, hoogte: 100 };

interface Props {
  stand: VoltmeterStand;
  /** Gemeten spanning, of null als de pen op geen bus staat. */
  spanning: number | null;
  schaal: number;
  onKastDown: (e: React.PointerEvent) => void;
  onPenDown: (e: React.PointerEvent) => void;
  onSluit: () => void;
}

/**
 * Voltmeter zoals in opdracht 2 van het werkboek: de min zit aan de aarde
 * (zwarte bus), met de rode pen meet je de spanning op elke bus.
 */
export function Voltmeter({
  stand,
  spanning,
  schaal,
  onKastDown,
  onPenDown,
  onSluit,
}: Props) {
  const { x, y, pen } = stand;
  const uit = { x: x + METER.breedte - 26 * METER_SCHAAL, y: y + METER.hoogte }; // waar het snoer uit het kastje komt
  const hang = Math.min(
    120,
    30 + Math.hypot(pen.x - uit.x, pen.y - uit.y) * 0.2,
  );
  const snoer = `M ${uit.x} ${uit.y} C ${uit.x} ${uit.y + hang} ${pen.x} ${pen.y + 40 + hang / 2} ${pen.x} ${pen.y + 44}`;
  const tekst =
    spanning === null ? "– – –" : `${spanning.toFixed(2).replace(".", ",")} V`;
  return (
    <g>
      <path
        d={snoer}
        fill="none"
        stroke="#c62828"
        strokeWidth={4}
        strokeLinecap="round"
        pointerEvents="none"
      />
      <g transform={`translate(${x} ${y}) scale(${METER_SCHAAL})`}>
        <rect
          width={T.breedte}
          height={T.hoogte}
          rx={12}
          fill="#f2c230"
          stroke="#7a5b00"
          strokeWidth={2}
          style={{
            cursor: "grab",
            filter: "drop-shadow(0 3px 5px var(--sb-schaduw))",
          }}
          onPointerDown={onKastDown}
        />
        <rect
          x={14}
          y={14}
          width={T.breedte - 28}
          height={44}
          rx={6}
          fill="#1f2a1f"
          pointerEvents="none"
        />
        <text
          x={T.breedte - 22}
          y={46}
          textAnchor="end"
          pointerEvents="none"
          style={{
            fill: "#b9f6a6",
            fontFamily: "var(--font-mono)",
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          {tekst}
        </text>
        <text
          x={16}
          y={82}
          pointerEvents="none"
          style={{ fill: "#3b2d00", fontSize: 13, fontWeight: 600 }}
        >
          V
        </text>
        <text
          x={34}
          y={82}
          pointerEvents="none"
          style={{ fill: "#3b2d00", fontSize: 11 }}
        >
          min aan aarde
        </text>
        <circle
          cx={T.breedte - 26}
          cy={80}
          r={8}
          fill="#c62828"
          stroke="#3b2d00"
          strokeWidth={1.5}
          pointerEvents="none"
        />
        {/* Sluitknopje, op elk zoomniveau even groot. */}
        <g
          transform={`translate(${T.breedte} 0) scale(${Math.max(1, 1 / schaal) / METER_SCHAAL})`}
          style={{ cursor: "pointer" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onSluit();
          }}
        >
          <title>Voltmeter weg</title>
          <circle
            r={13}
            fill="var(--bg-card)"
            stroke="var(--border-solid)"
            strokeWidth={1.5}
          />
          <foreignObject
            x={-8}
            y={-8}
            width={16}
            height={16}
            pointerEvents="none"
          >
            <X size={16} color="var(--text-secondary)" />
          </foreignObject>
        </g>
      </g>
      {/* De rode meetpen: de punt is het meetpunt. */}
      <g
        transform={`translate(${pen.x} ${pen.y})`}
        style={{ cursor: "grab" }}
        onPointerDown={onPenDown}
      >
        <title>Sleep de rode pen naar een bus</title>
        <circle r={Math.max(22, 18 / schaal)} fill="transparent" />
        <path
          d="M 0 0 L -5 10 H 5 Z"
          fill="#9e9e9e"
          stroke="#424242"
          strokeWidth={1}
        />
        <rect
          x={-7}
          y={10}
          width={14}
          height={34}
          rx={4}
          fill="#c62828"
          stroke="#7f1010"
          strokeWidth={1.5}
        />
        <circle r={3} fill="#212121" />
      </g>
    </g>
  );
}
