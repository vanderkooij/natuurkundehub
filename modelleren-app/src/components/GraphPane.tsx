import { useEffect, useState } from "react";

import { InteractiveChart, type ChartSeries } from "../_reusable/InteractiveChart";
import type { DisplayRun } from "../runs";

interface Props {
  runs: DisplayRun[];
  activeId: number | null;
  xVar: string;
  yVar: string;
  onXVar: (v: string) => void;
  onYVar: (v: string) => void;
  unitOf: (name: string) => string;
  themeMode: "light" | "dark";
  /** Aanwezig als deze grafiek verwijderd mag worden (meer dan één grafiek). */
  onRemove?: () => void;
}

function pointsFrom(data: Record<string, number>[], xVar: string, yVar: string) {
  const pts: { x: number; y: number }[] = [];
  for (const row of data) {
    const x = row[xVar];
    const y = row[yVar];
    if (typeof x === "number" && typeof y === "number" && isFinite(x) && isFinite(y)) {
      pts.push({ x, y });
    }
  }
  return pts;
}

export function GraphPane({ runs, activeId, xVar, yVar, onXVar, onYVar, unitOf, themeMode, onRemove }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [tangentActive, setTangentActive] = useState(false);
  const [zoomReset, setZoomReset] = useState(0); // ophogen = chart terug naar autozoom

  const active = runs.find((r) => r.id === activeId) ?? runs[runs.length - 1] ?? null;

  // Selectie resetten als de actieve run wisselt (indices verschillen per run).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setSelectedIdx(null), [activeId]);

  // Pijltjestoetsen: loop met ← → over de meetpunten van de actieve run.
  // Wordt genegeerd zolang de focus in een invoerveld staat.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!active) return;
      const count = pointsFrom(active.data, xVar, yVar).length;
      if (!count) return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      setSelectedIdx((cur) => {
        if (cur == null) return dir === 1 ? 0 : count - 1;
        return Math.max(0, Math.min(count - 1, cur + dir));
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, xVar, yVar]);

  const vars = active?.varNames ?? [];
  const label = (n: string) => {
    const u = unitOf(n);
    return u ? `${n} (${u})` : n;
  };

  // Actieve run als series[0] (krijgt puntmarkers + raaklijn/selectie); de rest
  // als dunne lijn (lineOnly) zodat de actieve run er duidelijk uitspringt.
  const series: ChartSeries[] = [];
  if (active) {
    series.push({
      label: "Run " + active.number,
      points: pointsFrom(active.data, xVar, yVar),
      color: active.color,
    });
  }
  for (const run of runs) {
    if (run.id === active?.id) continue;
    series.push({
      label: "Run " + run.number,
      points: pointsFrom(run.data, xVar, yVar),
      color: run.color,
      lineOnly: true,
    });
  }

  const selPoint =
    selectedIdx != null && series[0] && series[0].points[selectedIdx]
      ? series[0].points[selectedIdx]
      : null;

  return (
    <div className="card graph-pane">
      <div className="chart-controls">
        <label className="chart-label">x-as</label>
        <select className="axis-select" value={xVar} onChange={(e) => onXVar(e.target.value)}>
          {vars.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <label className="chart-label">y-as</label>
        <select className="axis-select" value={yVar} onChange={(e) => onYVar(e.target.value)}>
          {vars.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <button
          className={"tangent-btn" + (tangentActive ? " active" : "")}
          onClick={() => setTangentActive((a) => !a)}
          title="Toon raaklijn op het geselecteerde punt van de actieve run"
        >
          Raaklijn
        </button>
        <button
          className="tangent-btn"
          onClick={() => setZoomReset((z) => z + 1)}
          title="Zet de assen terug naar passend op de data"
        >
          ⤢ Autozoom
        </button>
        <span className="point-info">
          {active ? `Actief: Run ${active.number}` : ""}
          {selPoint
            ? ` · punt ${selectedIdx! + 1}: ${xVar}=${fmt(selPoint.x)}, ${yVar}=${fmt(selPoint.y)}`
            : active
              ? " · klik een punt of loop met ← →"
              : ""}
        </span>
        {onRemove && (
          <button className="run-remove" onClick={onRemove} title="Verwijder deze grafiek">
            ×
          </button>
        )}
      </div>

      <div className="chart-fill">
        {series.length ? (
          <InteractiveChart
            series={series}
            xLabel={label(xVar)}
            yLabel={label(yVar)}
            themeMode={themeMode}
            height="100%"
            selectedIdx={selectedIdx}
            resetTrigger={zoomReset}
            tangent={{ active: tangentActive, atIdx: selectedIdx }}
            onPointClick={(seriesIdx, pointIdx) => {
              if (seriesIdx === 0) setSelectedIdx(pointIdx);
            }}
          />
        ) : (
          <div className="graph-placeholder">Voer een simulatie uit om de grafiek te tekenen.</div>
        )}
      </div>
    </div>
  );
}

function fmt(v: number): string {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e5 || abs < 1e-3) return v.toExponential(3);
  return String(+v.toPrecision(5));
}
