import { useEffect, useMemo, useRef, useState } from "react";

import {
  EXAMPLES,
  evalStartwaarden,
  simulate,
  validateSyntax,
  type SvRow,
} from "./engine";
import { unitWarnings } from "./uiChecks";
import { sameSetup, toDisplayRuns, varyingParamNames, type SavedRun } from "./runs";
import {
  buildShareUrl,
  downloadRunCsv,
  exportModelJson,
  loadSavedModels,
  parseImportedJson,
  parseShareParam,
  persistSavedModels,
  type ModelDoc,
} from "./modelIO";
import { LEARN_EXERCISES } from "./learnExercises";
import { useNhTheme } from "./useNhTheme";
import { Header } from "./components/Header";
import { LearnSection } from "./components/LearnSection";
import { FloatCard } from "./components/FloatCard";
import { HelpPanel } from "./components/HelpPanel";
import { StartwaardenPanel } from "./components/StartwaardenPanel";
import { ModelEditor } from "./components/ModelEditor";
import { ResultTable } from "./components/ResultTable";
import { ExamplesSection } from "./components/ExamplesSection";
import { ModelToolbar } from "./components/ModelToolbar";
import { GraphPane } from "./components/GraphPane";
import { GraphArea, paneCount, type GraphLayout } from "./components/GraphArea";
import { RunList } from "./components/RunList";

interface Status {
  msg: string;
  kind: "ok" | "err" | "";
}

interface ChartCfg {
  id: number;
  xVar: string;
  yVar: string;
}

const START = EXAMPLES.find((e) => e.name === "Vrije val")!;

export function App() {
  const { theme, toggle } = useNhTheme();

  const [svRows, setSvRows] = useState<SvRow[]>(START.sv.map((r) => ({ ...r })));
  const [modelText, setModelText] = useState<string>(START.model);
  const [maxIter, setMaxIter] = useState<number>(START.iter);
  const [status, setStatus] = useState<Status>({ msg: "", kind: "" });
  const [charts, setCharts] = useState<ChartCfg[]>([{ id: 0, xVar: START.defaultX, yVar: START.defaultY }]);
  const [layout, setLayout] = useState<GraphLayout>("single");
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [savedModels, setSavedModels] = useState<ModelDoc[]>(() => loadSavedModels());
  const [unlockedCount, setUnlockedCount] = useState<number>(() => {
    const n = parseInt(localStorage.getItem("nh_learn_unlocked") || "1", 10);
    return Number.isFinite(n) ? Math.min(LEARN_EXERCISES.length, Math.max(1, n)) : 1;
  });
  const [currentLearnIdx, setCurrentLearnIdx] = useState(-1);
  const [floatVisible, setFloatVisible] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const nextId = useRef(1);
  const nextChartId = useRef(1);

  const errorLines = useMemo(() => validateSyntax(modelText.split("\n")), [modelText]);
  const svEval = useMemo(() => evalStartwaarden(svRows), [svRows]);
  const warnings = useMemo(() => unitWarnings(svRows), [svRows]);

  const displayRuns = useMemo(() => toDisplayRuns(runs), [runs]);
  const varying = useMemo(() => varyingParamNames(runs), [runs]);
  const activeRun = displayRuns.find((r) => r.id === activeId) ?? displayRuns[displayRuns.length - 1] ?? null;

  const unitOf = (name: string) =>
    (activeRun?.svSnapshot ?? svRows).find((r) => r.name === name)?.unit ?? "";

  /**
   * Simuleer en bewaar het resultaat automatisch als run. Identieke her-simulaties
   * (zelfde startwaarden + model als de laatste run) vervangen die laatste run i.p.v.
   * een duplicaat toe te voegen. `base` = de runs om op voort te bouwen ([] bij een
   * nieuw voorbeeld).
   */
  function commitRun(rows: SvRow[], text: string, iter: number, base: SavedRun[]) {
    const lines = text.split("\n");
    const syntax = validateSyntax(lines);
    if (syntax.length) {
      setStatus({ msg: "⚠ Syntaxfout op regel " + syntax.join(", ") + " — geen run aangemaakt", kind: "err" });
      return;
    }
    const res = simulate(rows, lines, iter);
    if (res.error) {
      setStatus({ msg: "⚠ " + res.error, kind: "err" });
      return;
    }
    const snapshot = rows.map((r) => ({ ...r }));
    const last = base[base.length - 1];
    let nextRuns: SavedRun[];
    let active: number;
    if (last && sameSetup(last.svSnapshot, last.model, rows, text)) {
      nextRuns = [...base.slice(0, -1), { ...last, data: res.data, varNames: res.varNames }];
      active = last.id;
    } else {
      const id = nextId.current++;
      nextRuns = [...base, { id, data: res.data, varNames: res.varNames, svSnapshot: snapshot, model: text }];
      active = id;
    }
    setRuns(nextRuns);
    setActiveId(active);
    const n = nextRuns.findIndex((r) => r.id === active) + 1;
    const tail = res.stopped ? "gestopt na " + res.data.length + " iteraties" : res.data.length + " iteraties";
    setStatus({ msg: "✓ Run " + n + " · " + tail, kind: "ok" });
    // Leer-modelleren: ontgrendel de volgende oefening na een geslaagde simulatie.
    if (currentLearnIdx >= 0) {
      setUnlockedCount((prev) => {
        const nu = Math.min(LEARN_EXERCISES.length, Math.max(prev, currentLearnIdx + 2));
        if (nu !== prev) localStorage.setItem("nh_learn_unlocked", String(nu));
        return nu;
      });
    }
  }

  // Bij eerste render: een gedeeld model uit de URL (?model=) laden, anders het
  // Vrije val-voorbeeld auto-draaien.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const shared = parseShareParam();
    if (shared) applyDoc(shared);
    else commitRun(svRows, modelText, maxIter, []);
  }, []);

  // Houd elke grafiek-as geldig voor de actieve run.
  useEffect(() => {
    if (!activeRun || !activeRun.varNames.length) return;
    const vns = activeRun.varNames;
    setCharts((prev) =>
      prev.map((c) => {
        let x = c.xVar;
        let y = c.yVar;
        if (!vns.includes(x)) x = vns.includes("t") ? "t" : vns[0];
        if (!vns.includes(y)) y = vns.find((v) => v !== x) ?? vns[0];
        return x !== c.xVar || y !== c.yVar ? { ...c, xVar: x, yVar: y } : c;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  function loadExample(name: string) {
    const ex = EXAMPLES.find((e) => e.name === name);
    if (!ex) return;
    const rows = ex.sv.map((r) => ({ ...r }));
    setSvRows(rows);
    setModelText(ex.model);
    setMaxIter(ex.iter);
    setCharts([{ id: nextChartId.current++, xVar: ex.defaultX, yVar: ex.defaultY }]);
    setLayout("single");
    commitRun(rows, ex.model, ex.iter, []); // verse start: wist bestaande runs
  }

  // Laadt een model (uit opslag / import / deel-URL) en draait het vers.
  function applyDoc(doc: ModelDoc) {
    const rows = doc.sv.map((r) => ({ ...r }));
    const yGuess = rows.map((r) => r.name).find((n) => n && n !== "t" && n !== "dt") ?? "t";
    setSvRows(rows);
    setModelText(doc.model);
    setMaxIter(doc.iter);
    setCharts([{ id: nextChartId.current++, xVar: "t", yVar: yGuess }]);
    setLayout("single");
    commitRun(rows, doc.model, doc.iter, []);
  }

  // ─── Model in/uit ─────────────────────────────────────────────────────────
  function saveCurrentModel() {
    const name = window.prompt("Naam voor dit model:");
    if (!name) return;
    const doc: ModelDoc = { name, sv: svRows.map((r) => ({ ...r })), model: modelText, iter: maxIter };
    const next = [...savedModels, doc];
    setSavedModels(next);
    persistSavedModels(next);
    setStatus({ msg: "💾 Model '" + name + "' opgeslagen", kind: "ok" });
  }
  function shareModel() {
    const url = buildShareUrl({ sv: svRows, model: modelText, iter: maxIter });
    navigator.clipboard.writeText(url).then(
      () => setStatus({ msg: "🔗 Deel-link gekopieerd naar het klembord", kind: "ok" }),
      () => window.prompt("Kopieer deze link:", url),
    );
  }
  function exportCurrentModel() {
    exportModelJson({ name: "mijn-model", sv: svRows, model: modelText, iter: maxIter });
  }
  function importModelFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const doc = parseImportedJson(String(reader.result));
      if (!doc) {
        setStatus({ msg: "⚠ Ongeldig JSON-modelbestand", kind: "err" });
        return;
      }
      applyDoc(doc);
      setStatus({ msg: "⬆ Model geïmporteerd", kind: "ok" });
    };
    reader.readAsText(file);
  }
  function downloadCsv() {
    if (!activeRun) return;
    downloadRunCsv(activeRun.data, activeRun.varNames, unitOf);
  }
  function loadSaved(i: number) {
    const doc = savedModels[i];
    if (doc) applyDoc(doc);
  }
  function deleteSaved(i: number) {
    const next = savedModels.filter((_, idx) => idx !== i);
    setSavedModels(next);
    persistSavedModels(next);
  }

  // ─── Leer-modelleren ──────────────────────────────────────────────────────
  function loadLearnModel(idx: number, useSol: boolean) {
    const ex = LEARN_EXERCISES[idx];
    const sv = useSol ? ex.solSv : ex.startSv;
    const model = useSol ? ex.solModel : ex.startModel;
    const iter = useSol ? ex.solIter : ex.startIter;
    const rows = sv.map((r) => ({ ...r }));
    const yGuess = rows.map((r) => r.name).find((n) => n && n !== "t" && n !== "dt") ?? "t";
    setSvRows(rows);
    setModelText(model);
    setMaxIter(iter);
    setCharts([{ id: nextChartId.current++, xVar: "t", yVar: yGuess }]);
    setLayout("single");
    setRuns([]);
    setActiveId(null);
    setStatus({ msg: "", kind: "" });
    setCurrentLearnIdx(idx);
    setFloatVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function closeFloat() {
    setFloatVisible(false);
    setCurrentLearnIdx(-1);
  }
  function nextExercise() {
    if (currentLearnIdx < 0) return;
    const next = currentLearnIdx + 1;
    setLearnOpen(true);
    setTimeout(() => {
      document.getElementById("learn-ex-" + next)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function setChartAxis(id: number, axis: "xVar" | "yVar", value: string) {
    setCharts((prev) => prev.map((c) => (c.id === id ? { ...c, [axis]: value } : c)));
  }
  // Kies een grafiek-indeling (1 / 2 naast / 2 onder / 2×2) en pas het aantal panes aan.
  function setLayoutMode(l: GraphLayout) {
    setLayout(l);
    const need = paneCount(l);
    setCharts((prev) => {
      if (prev.length === need) return prev;
      const vns = activeRun?.varNames ?? [];
      const x = vns.includes("t") ? "t" : vns[0] ?? "t";
      const y = vns.find((v) => v !== x) ?? vns[0] ?? "";
      const next = prev.slice(0, need);
      while (next.length < need) next.push({ id: nextChartId.current++, xVar: x, yVar: y });
      return next;
    });
  }

  function removeRun(id: number) {
    const next = runs.filter((r) => r.id !== id);
    setRuns(next);
    if (id === activeId) setActiveId(next.length ? next[next.length - 1].id : null);
  }
  function clearRuns() {
    setRuns([]);
    setActiveId(null);
    setStatus({ msg: "", kind: "" });
  }

  return (
    <>
      <div className="ambient-glow ambient-glow--cyan" />
      <div className="ambient-glow ambient-glow--amber" />
      <Header theme={theme} onToggle={toggle} onHelp={() => setHelpOpen(true)} />

      <div className="page-wrap">
        <h1 className="tool-name">Modelleren</h1>
        <p className="tool-sub">
          Begin bij <strong style={{ color: "var(--accent)" }}>Leer modelleren</strong> voor een
          begeleide introductie, gebruik de <strong>Voorbeeldmodellen</strong> om snel te starten,
          of bouw direct je eigen model.
        </p>

        {/* Boven: startwaarden + modelregels naast elkaar */}
        <div className="input-row">
          <StartwaardenPanel
            rows={svRows}
            onChange={setSvRows}
            onStatus={(msg, kind) => setStatus({ msg, kind })}
            svErrors={svEval.svErrors}
            evaluated={svEval.vars}
            warnings={warnings}
          />
          <ModelEditor value={modelText} onChange={setModelText} errorLines={errorLines} />
        </div>

        {/* Run-balk */}
        <div className="card">
          <div className="settings-row">
            <label htmlFor="maxiter">Max. iteraties</label>
            <input
              id="maxiter"
              type="number"
              min={1}
              max={10000}
              value={maxIter}
              onChange={(e) => setMaxIter(Number(e.target.value) || 1000)}
            />
            <button
              className="start-btn"
              style={{ marginLeft: "auto" }}
              onClick={() => commitRun(svRows, modelText, maxIter, runs)}
            >
              ▶ Simuleer
            </button>
          </div>
          <div className={"status-bar " + status.kind}>{status.msg}</div>
        </div>

        {/* Model opslaan / delen / export */}
        <ModelToolbar
          savedModels={savedModels}
          canDownloadCsv={!!activeRun}
          onSave={saveCurrentModel}
          onShare={shareModel}
          onExport={exportCurrentModel}
          onImport={importModelFile}
          onDownloadCsv={downloadCsv}
          onLoadSaved={loadSaved}
          onDeleteSaved={deleteSaved}
        />

        {/* Grafieken */}
        <div className="section-title" style={{ margin: "4px 0 10px" }}>
          Grafieken
        </div>
        <div className="layout-selector">
          <span className="layout-label">Indeling:</span>
          {(
            [
              ["single", "◻ 1 grafiek"],
              ["row", "▮▮ 2 naast"],
              ["col", "⬓ 2 onder"],
              ["grid", "⊞ 2×2"],
            ] as [GraphLayout, string][]
          ).map(([l, lab]) => (
            <button
              key={l}
              className={"layout-btn" + (layout === l ? " active" : "")}
              onClick={() => setLayoutMode(l)}
            >
              {lab}
            </button>
          ))}
        </div>
        <GraphArea
          key={layout}
          layout={layout}
          panes={charts.map((c) => (
            <GraphPane
              key={c.id}
              runs={displayRuns}
              activeId={activeRun?.id ?? null}
              xVar={c.xVar}
              yVar={c.yVar}
              onXVar={(v) => setChartAxis(c.id, "xVar", v)}
              onYVar={(v) => setChartAxis(c.id, "yVar", v)}
              unitOf={unitOf}
              themeMode={theme}
            />
          ))}
        />
        <RunList
          runs={displayRuns}
          activeId={activeRun?.id ?? null}
          varyingNames={varying}
          onActivate={setActiveId}
          onRemove={removeRun}
          onClearAll={clearRuns}
        />

        {/* Tabel (uitklapbaar, toont de actieve run) */}
        <ResultTable
          data={activeRun?.data ?? []}
          cols={activeRun?.varNames ?? []}
          runLabel={activeRun ? "Run " + activeRun.number : undefined}
        />

        {/* Voorbeeldmodellen */}
        <ExamplesSection onLoad={loadExample} />

        {/* Leer modelleren */}
        <LearnSection
          open={learnOpen}
          onToggle={() => setLearnOpen((o) => !o)}
          unlockedCount={unlockedCount}
          onLoad={loadLearnModel}
        />
      </div>

      {floatVisible && currentLearnIdx >= 0 && (
        <FloatCard
          exercise={LEARN_EXERCISES[currentLearnIdx]}
          index={currentLearnIdx}
          total={LEARN_EXERCISES.length}
          onClose={closeFloat}
          onNext={nextExercise}
        />
      )}

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
