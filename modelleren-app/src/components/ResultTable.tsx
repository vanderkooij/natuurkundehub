import { useState } from "react";

const MAX_ROWS = 1000;

function fmt(v: number): string {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e5 || abs < 1e-3) return v.toExponential(3);
  return String(+v.toPrecision(5));
}

interface Props {
  data: Record<string, number>[];
  cols: string[];
  /** Label van de run waarvan de tabel getoond wordt, bv. "Run 2". */
  runLabel?: string;
}

export function ResultTable({ data, cols, runLabel }: Props) {
  const [open, setOpen] = useState(false);
  const shown = data.slice(0, MAX_ROWS);
  // Bij afkappen tóch de laatste rij (de eindtoestand) tonen, na een ⋯-rij.
  const truncated = data.length > MAX_ROWS;
  const lastRow = truncated ? data[data.length - 1] : null;

  return (
    <div>
      <button className="table-toggle-btn" onClick={() => setOpen((o) => !o)}>
        <span>{open ? "Verberg tabel" : "Toon tabel"}{runLabel ? ` (${runLabel})` : ""}</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <>
          {!data.length ? (
            <div className="table-note">Nog geen data — voer eerst een simulatie uit.</div>
          ) : (
            <>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      {cols.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((row, i) => (
                      <tr key={i}>
                        {cols.map((c) => (
                          <td key={c}>{c in row ? fmt(row[c]) : ""}</td>
                        ))}
                      </tr>
                    ))}
                    {lastRow && (
                      <>
                        <tr>
                          <td colSpan={cols.length} style={{ textAlign: "center", opacity: 0.6 }}>
                            ⋯
                          </td>
                        </tr>
                        <tr>
                          {cols.map((c) => (
                            <td key={c}>{c in lastRow ? fmt(lastRow[c]) : ""}</td>
                          ))}
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              {truncated && (
                <div className="table-note">
                  Eerste {MAX_ROWS} en de laatste van {data.length} rijen getoond.
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
