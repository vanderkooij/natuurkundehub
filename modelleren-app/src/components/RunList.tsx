import { valueIn, type DisplayRun } from "../runs";

interface Props {
  runs: DisplayRun[];
  activeId: number | null;
  varyingNames: string[];
  onActivate: (id: number) => void;
  onRemove: (id: number) => void;
  onClearAll: () => void;
}

export function RunList({ runs, activeId, varyingNames, onActivate, onRemove, onClearAll }: Props) {
  if (!runs.length) {
    return <div className="run-empty">Nog geen runs — klik op ▶ Simuleer om er een te maken.</div>;
  }
  return (
    <div className="run-list-wrap">
      <div className="run-list-head">
        <span>Runs ({runs.length})</span>
        <button className="run-clear" onClick={onClearAll} title="Verwijder alle runs">
          Wis alle
        </button>
      </div>
      <div className="run-list">
        {runs.map((run) => {
          const params = varyingNames.map((n) => `${n} = ${valueIn(run, n)}`).join(" · ");
          return (
            <div
              key={run.id}
              className={"run-row" + (run.id === activeId ? " active" : "")}
              onClick={() => onActivate(run.id)}
              title="Klik om deze run te activeren"
            >
              <span className="run-dot" style={{ background: run.color }} />
              <span className="run-name">Run {run.number}</span>
              <span className="run-params">{params || "basis"}</span>
              <button
                className="run-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(run.id);
                }}
                title="Verwijder deze run"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
