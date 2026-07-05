import { X } from "lucide-react";

import { COMPONENT_DEFS } from "@/model/componentDefs";
import type { CircuitDoc } from "@/model/types";
import { formatCurrent, formatOhm, formatPower, formatVoltage } from "@/lib/format";
import type { SolveResult } from "@/sim";

interface Props {
  doc: CircuitDoc;
  result: SolveResult;
  onClose: () => void;
}

/** Componenttypen die in de tabel horen (geen meters/draden). */
const TABLE_TYPES = new Set(["source", "resistor", "lamp", "led", "fuse", "switch"]);

/**
 * Meetwaardentabel: U, I en P per component — handig bij serie/parallel-sommen
 * ("spanningen optellen in serie", "stromen optellen in parallel").
 */
export function ValuesTable({ doc, result, onClose }: Props) {
  // Nummering per type: "Weerstand 1", "Weerstand 2", …
  const counts = new Map<string, number>();
  const rows = doc.components
    .filter((c) => TABLE_TYPES.has(c.type))
    .map((c) => {
      const n = (counts.get(c.type) ?? 0) + 1;
      counts.set(c.type, n);
      const sameType = doc.components.filter((x) => x.type === c.type).length;
      const label = COMPONENT_DEFS[c.type].label + (sameType > 1 ? ` ${n}` : "");
      const u = Math.abs(
        (result.nodePotentials.get(c.v0) ?? 0) - (result.nodePotentials.get(c.v1) ?? 0),
      );
      const i = Math.abs(result.elementCurrents.get(c.id) ?? 0);
      return { id: c.id, label, u, i, p: u * i };
    });

  // Totaal-rij: bronspanning + geleverde stroom → vervangingsweerstand R_v = U/I.
  const sources = doc.components.filter((c) => c.type === "source");
  const uSrc = sources.length
    ? Math.abs(
        (result.nodePotentials.get(sources[0].v0) ?? 0) -
          (result.nodePotentials.get(sources[0].v1) ?? 0),
      )
    : 0;
  const iSrc = sources.reduce((sum, s) => {
    const i = result.elementCurrents.get(s.id) ?? 0;
    return sum + (Number.isFinite(i) ? Math.abs(i) : 0);
  }, 0);
  const showTotal = sources.length > 0 && iSrc > 1e-9;

  return (
    <div className="absolute right-3 top-3 z-20 w-[300px] rounded-xl border border-(--border-solid) bg-card p-3 shadow-xl">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-(--text-primary)">Meetwaarden</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="grid h-6 w-6 place-items-center rounded-md text-(--text-muted) hover:bg-(--bg-card-hover)"
        >
          <X size={14} />
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="px-1 py-4 text-center text-sm text-(--text-muted)">
          Nog geen componenten op het canvas.
        </p>
      ) : (
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-(--text-muted)">
              <th className="pb-1 font-medium">Component</th>
              <th className="pb-1 text-right font-medium">U</th>
              <th className="pb-1 text-right font-medium">I</th>
              <th className="pb-1 text-right font-medium">P</th>
            </tr>
          </thead>
          <tbody className="text-(--text-secondary)">
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-(--border-solid)">
                <td className="py-1 pr-1">{r.label}</td>
                <td className="py-1 text-right tabular-nums">{formatVoltage(r.u)}</td>
                <td className="py-1 text-right tabular-nums">{formatCurrent(r.i)}</td>
                <td className="py-1 text-right tabular-nums">{formatPower(r.p)}</td>
              </tr>
            ))}
            {showTotal && (
              <tr className="border-t-2 border-(--border-solid) font-semibold text-(--text-primary)">
                <td className="py-1 pr-1">Totaal</td>
                <td className="py-1 text-right tabular-nums">{formatVoltage(uSrc)}</td>
                <td className="py-1 text-right tabular-nums">{formatCurrent(iSrc)}</td>
                <td className="py-1 text-right tabular-nums">{formatPower(uSrc * iSrc)}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {showTotal && (
        <p className="mt-1.5 px-0.5 text-[11px] text-(--text-muted)">
          Vervangingsweerstand R<sub>v</sub> = U / I = {formatOhm(uSrc / iSrc)}
        </p>
      )}
    </div>
  );
}
