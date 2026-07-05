/**
 * I-U-karakteristiek van een component: sweep de bronspanning van 0 tot de
 * ingestelde waarde en registreer bij elke stap de spanning *over* en de stroom
 * *door* het gekozen component. Voor een weerstand → rechte lijn, voor een LED →
 * de diode-knik.
 */
import { solve } from "@/sim";
import { LED_COLORS } from "./ledSpec";
import { toNetlist } from "./netlist";
import type { CircuitDoc } from "./types";

export interface IUPoint {
  u: number;
  i: number;
}

export interface Sweep {
  points: IUPoint[];
  /** Index van het huidige werkpunt (bij de ingestelde bronspanning). */
  operating: number;
  sourceEmf: number;
}

export function sweepIU(doc: CircuitDoc, componentId: string, steps = 40): Sweep | null {
  const comp = doc.components.find((c) => c.id === componentId);
  const source = doc.components.find((c) => c.type === "source");
  if (!comp || !source) return null;
  const vmax = source.values.emf ?? 0;
  if (vmax <= 0) return null;

  const points: IUPoint[] = [];
  for (let k = 0; k <= steps; k++) {
    const emf = (k / steps) * vmax;
    const testDoc: CircuitDoc = {
      ...doc,
      components: doc.components.map((c) =>
        c.id === source.id ? { ...c, values: { ...c.values, emf } } : c,
      ),
    };
    const result = solve(toNetlist(testDoc));
    const u =
      (result.nodePotentials.get(comp.v0) ?? 0) - (result.nodePotentials.get(comp.v1) ?? 0);
    const i = result.elementCurrents.get(comp.id) ?? 0;
    points.push({ u: Math.abs(u), i: Math.abs(i) });
  }
  return { points, operating: steps, sourceEmf: vmax };
}

export interface LedColorCurve {
  key: string;
  label: string;
  hex: string;
  sweep: Sweep;
  /** True voor de kleur die de LED nu daadwerkelijk heeft (werkpunt-stip). */
  active: boolean;
}

/**
 * Karakteristieken van álle LED-kleuren naast elkaar: sweep de schakeling met de
 * LED telkens in een andere kleur (= andere Vf). Zo zie je per kleur de eigen knie.
 */
export function sweepLedColors(
  doc: CircuitDoc,
  componentId: string,
  steps = 40,
): LedColorCurve[] {
  const comp = doc.components.find((c) => c.id === componentId);
  if (!comp || comp.type !== "led") return [];
  const activeKey = comp.values.color ?? LED_COLORS[0].key;
  const curves: LedColorCurve[] = [];
  for (const col of LED_COLORS) {
    const testDoc: CircuitDoc = {
      ...doc,
      components: doc.components.map((c) =>
        c.id === componentId ? { ...c, values: { ...c.values, color: col.key } } : c,
      ),
    };
    const sweep = sweepIU(testDoc, componentId, steps);
    if (sweep) {
      curves.push({ key: col.key, label: col.label, hex: col.hex, sweep, active: col.key === activeKey });
    }
  }
  return curves;
}
