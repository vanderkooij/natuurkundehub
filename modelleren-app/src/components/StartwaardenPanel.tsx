import type { SvRow } from "../engine";
import { splitValueUnit, toDecimalPoint } from "../engine";
import { isPlainNumber } from "../uiChecks";

interface Props {
  rows: SvRow[];
  onChange: (rows: SvRow[]) => void;
  onStatus: (msg: string, kind: "ok" | "err") => void;
  /** Namen van startwaarden waarvan de formule niet te berekenen is. */
  svErrors: string[];
  /** Eenmalig berekende waarden (voor de live preview van formule-startwaarden). */
  evaluated: Record<string, number>;
  /** Niet-blokkerende eenheden-waarschuwingen. */
  warnings: string[];
}

function fmt(v: number): string {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e5 || abs < 1e-3) return v.toExponential(3);
  return String(+v.toPrecision(5));
}

export function StartwaardenPanel({ rows, onChange, onStatus, svErrors, evaluated, warnings }: Props) {
  const errSet = new Set(svErrors);

  function update(i: number, field: keyof SvRow, value: string) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function addRow() {
    onChange([...rows, { name: "", value: "0", unit: "" }]);
  }
  function deleteRow(i: number) {
    if (rows.length > 1) onChange(rows.filter((_, idx) => idx !== i));
  }

  function kopieer() {
    const used = rows.filter((r) => r.name.trim());
    const text = used
      .map((r) => {
        const u = (r.unit || "").trim();
        return r.name.trim() + " = " + String(r.value).trim() + (u ? " " + u : "");
      })
      .join("\n");
    navigator.clipboard.writeText(text).then(
      () => onStatus("✓ " + used.length + " startwaarden gekopieerd naar het klembord", "ok"),
      () => onStatus("⚠ Kopiëren naar het klembord mislukt", "err"),
    );
  }

  function plak() {
    navigator.clipboard.readText().then(
      (text) => {
        const re = /^(\w+)\s*=\s*(.+)$/;
        const parsed: SvRow[] = [];
        let mislukt = 0;
        for (const line of text.split(/\r?\n/)) {
          const t = line.trim();
          if (!t) continue;
          const m = t.match(re);
          if (!m) {
            mislukt++;
            continue;
          }
          const vu = splitValueUnit(m[2].trim());
          parsed.push({ name: m[1], value: toDecimalPoint(vu.value), unit: vu.unit });
        }
        if (!parsed.length) {
          onStatus("⚠ Geen geldige startwaarden op het klembord", "err");
          return;
        }
        onChange(parsed);
        if (mislukt) onStatus("⚠ " + parsed.length + " geplakt, " + mislukt + " overgeslagen", "err");
        else onStatus("✓ " + parsed.length + " startwaarden geplakt", "ok");
      },
      () => onStatus("⚠ Lezen van het klembord mislukt — sta klembordtoegang toe", "err"),
    );
  }

  return (
    <div className="card">
      <div className="section-head">
        <div className="section-title">Startwaarden</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn-soft" onClick={kopieer} title="Kopieer naar klembord">
            📋 Kopieer
          </button>
          <button className="btn-soft" onClick={plak} title="Plak vanaf klembord">
            📥 Plak
          </button>
        </div>
      </div>

      {warnings.map((w, i) => (
        <div key={i} className="unit-warning-box">
          {w}
        </div>
      ))}

      <table className="sv-table">
        <thead>
          <tr>
            <th>Naam</th>
            <th>Beginwaarde</th>
            <th>Eenheid</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const name = r.name.trim();
            const isErr = !!name && errSet.has(name);
            const isFormula = r.value.trim() !== "" && !isPlainNumber(r.value);
            const evalVal = name ? evaluated[name] : undefined;
            const showEval =
              isFormula && !isErr && typeof evalVal === "number" && isFinite(evalVal);
            return (
              <tr key={i}>
                <td>
                  <input
                    value={r.name}
                    placeholder="naam"
                    onChange={(e) => update(i, "name", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className={isErr ? "sv-input-err" : undefined}
                    value={r.value}
                    placeholder="0 of formule"
                    onChange={(e) => update(i, "value", e.target.value)}
                  />
                  {showEval && <div className="sv-eval">= {fmt(evalVal!)}</div>}
                  {isErr && <div className="sv-eval err">kan niet berekend worden</div>}
                </td>
                <td>
                  <input
                    value={r.unit}
                    placeholder="eenheid (optioneel)"
                    onChange={(e) => update(i, "unit", e.target.value)}
                  />
                </td>
                <td>
                  <button className="del-btn" onClick={() => deleteRow(i)} title="Verwijder rij">
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button className="btn-soft" onClick={addRow}>
        + Variabele toevoegen
      </button>
    </div>
  );
}
