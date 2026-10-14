import { BUS_STRAAL, type BusVorm } from "./geometrie";

const KLEUR = {
  geel: "var(--sb-bus-geel)",
  blauw: "var(--sb-bus-blauw)",
  wit: "var(--sb-bus-wit)",
  zwart: "var(--sb-bus-zwart)",
} as const;

interface Props {
  vorm: BusVorm;
  /** Plaats op het werkvlak. */
  x: number;
  y: number;
  hoog: boolean;
  /** Wacht op een tweede tik om een draad te maken. */
  gekozen: boolean;
  /** Mogelijk eindpunt tijdens het slepen van een draad. */
  doel: boolean;
  /** Schermpixels per werkvlakeenheid, voor een aanraakvlak van vaste schermmaat. */
  schaal: number;
  onPointerDown: (e: React.PointerEvent) => void;
}

/** Een bus (aansluitbus) in de kleur van het echte bord, met een gloed als hij hoog is. */
export function BusSvg({
  vorm,
  x,
  y,
  hoog,
  gekozen,
  doel,
  schaal,
  onPointerDown,
}: Props) {
  // Minstens 40 schermpixels doorsnee om te raken, ook uitgezoomd (vinger).
  const raak = Math.max(BUS_STRAAL + 8, 20 / schaal);
  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ cursor: "crosshair" }}
      onPointerDown={onPointerDown}
    >
      <circle r={raak} fill="transparent" />
      {hoog && (
        <circle r={BUS_STRAAL + 7} fill="var(--sb-hoog)" opacity={0.35} />
      )}
      {(gekozen || doel) && (
        <circle
          r={BUS_STRAAL + 6}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={3}
          strokeDasharray={gekozen ? "5 4" : undefined}
        />
      )}
      <circle
        r={BUS_STRAAL}
        fill={KLEUR[vorm.kleur]}
        stroke="var(--sb-bus-rand)"
        strokeWidth={2}
      />
      <circle r={BUS_STRAAL * 0.42} fill="var(--sb-gat)" />
    </g>
  );
}
