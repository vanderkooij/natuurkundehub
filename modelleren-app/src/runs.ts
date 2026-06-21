import type { SvRow } from "./engine";

export interface SavedRun {
  id: number;
  data: Record<string, number>[];
  varNames: string[];
  svSnapshot: SvRow[];
  model: string;
}

/** Een run verrijkt met positie-afhankelijke weergave-info (nummer + kleur). */
export interface DisplayRun extends SavedRun {
  number: number;
  color: string;
}

// Onderscheidende run-kleuren; Run 1 = cyaan (accent), daarna doorlopend.
// LET OP: amber (#D4923A) is bewust GERESERVEERD voor de raaklijn en mag hier
// niet in voorkomen (harde eis — raaklijn moet altijd afwijken van elke run).
export const TANGENT_COLOR = "#D4923A";
export const RUN_PALETTE = [
  "#0BB5C8", // cyaan
  "#22c55e", // groen
  "#8b5cf6", // paars
  "#ef4444", // rood
  "#ec4899", // roze
  "#3b82f6", // blauw
  "#14b8a6", // teal
  "#6366f1", // indigo
];

export function colorForIndex(i: number): string {
  return RUN_PALETTE[i % RUN_PALETTE.length];
}

/** Verrijkt de runs met nummer (positie) en kleur. */
export function toDisplayRuns(runs: SavedRun[]): DisplayRun[] {
  return runs.map((run, i) => ({ ...run, number: i + 1, color: colorForIndex(i) }));
}

/**
 * Namen van startwaarden waarvan de waarde tussen runs verschilt, gemeten t.o.v.
 * de eerste run (de basis). Dit zijn de parameters die de runs onderscheiden —
 * precies wat je per run wilt tonen zodat ook run 1's waarde zichtbaar is.
 */
export function varyingParamNames(runs: SavedRun[]): string[] {
  if (runs.length < 2) return [];
  const base = runs[0].svSnapshot;
  const names: string[] = [];
  const seen = new Set<string>();
  for (const run of runs.slice(1)) {
    for (const r of run.svSnapshot) {
      if (seen.has(r.name)) continue;
      const b = base.find((x) => x.name === r.name);
      if (!b || b.value !== r.value) {
        seen.add(r.name);
        names.push(r.name);
      }
    }
  }
  return names;
}

/** Waarde van `name` in een run-snapshot (of "—" als afwezig). */
export function valueIn(run: SavedRun, name: string): string {
  const r = run.svSnapshot.find((x) => x.name === name);
  return r ? r.value : "—";
}

/** True als twee snapshots + model identiek zijn (voor dedupe van her-simulaties). */
export function sameSetup(aRows: SvRow[], aModel: string, bRows: SvRow[], bModel: string): boolean {
  if (aModel !== bModel) return false;
  if (aRows.length !== bRows.length) return false;
  for (let i = 0; i < aRows.length; i++) {
    if (
      aRows[i].name !== bRows[i].name ||
      aRows[i].value !== bRows[i].value ||
      aRows[i].unit !== bRows[i].unit
    ) {
      return false;
    }
  }
  return true;
}
