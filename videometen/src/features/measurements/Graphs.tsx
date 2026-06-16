import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Maximize2, Plus } from "lucide-react";
import { Group, Panel } from "react-resizable-panels";

import { Pane, PaneBody, PaneHeader, PaneDivider } from "@/_reusable/ThreePaneLayout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCalibration } from "@/features/calibration/CalibrationState";
import { buildRows } from "@/features/measurements/derive";
import { FitButton } from "@/features/measurements/FitButton";
import { computeFits } from "@/features/measurements/fits";
import { GraphPane, type PaneState } from "@/features/measurements/GraphPane";
import { withAccelerations } from "@/features/measurements/graph-types";
import { useGraphsLayout } from "@/features/measurements/GraphsLayoutState";
import { useMeasurementHover } from "@/features/measurements/MeasurementHoverState";
import { useTracking } from "@/features/tracking/TrackingState";
import { useVideo } from "@/features/video/VideoState";
import { cn } from "@/lib/utils";

export function Graphs() {
  const { video, currentFrame, trim, setFrame } = useVideo();
  const { points } = useTracking();
  const { scale, axes } = useCalibration();
  const { hoveredFrame, setHoveredFrame } = useMeasurementHover();
  const {
    panes,
    fitConfig,
    maxPanes,
    graphsFocusMode,
    setGraphsFocusMode,
    paneSize,
    setPaneSize,
    updatePane,
    closePane,
    addPane,
  } = useGraphsLayout();

  // Data-pipeline (memoised): tracked points → MeasurementRow[] → ExtendedRow[] met versnellingen.
  const fps = video?.fps ?? 30;
  const rows = useMemo(() => {
    if (!scale) return [];
    return buildRows(points, scale, axes, fps, trim.start, trim.end);
  }, [points, scale, axes, fps, trim.start, trim.end]);
  const extRows = useMemo(() => withAccelerations(rows), [rows]);

  // Fits worden eenmaal hier berekend en doorgegeven aan alle panes —
  // anders zou elke pane 'm opnieuw doen. De fit-range (sub-selectie van
  // de trim) zit in `fitConfig` en bepaalt welke meetpunten meedoen.
  const fits = useMemo(
    () => computeFits(rows, fitConfig, trim.start, trim.end, fps),
    [rows, fitConfig, trim.start, trim.end, fps],
  );

  const unit = scale?.unit ?? "m";

  // ---- Empty states ------------------------------------------------------
  // 08: geen `!scale` / `rows.length === 0` empty-states meer — de grafieken-
  // pane mount pas bij ≥1 meting (App.tsx-layout-gating) en tracken vereist
  // een schaal. De één-meting-hint blijft: dan is de pane wél zichtbaar maar
  // valt er nog niets te plotten.
  if (rows.length === 1) {
    return (
      <Pane>
        <PaneHeader title="Grafieken" />
        <PaneBody className="flex items-center justify-center p-6">
          <p className="max-w-[34ch] text-center text-sm text-(--text-muted)">
            Voeg minimaal nog één meting toe om grafieken te zien.
          </p>
        </PaneBody>
      </Pane>
    );
  }

  // ---- Render panes ------------------------------------------------------
  const fitDisabled = rows.length < 2;
  const headerActions = (
    <div className="flex items-center gap-1.5">
      <FitButton disabled={fitDisabled} />
      {/* 09b: "Verberg" — verbergt tabel + video volledig zodat de grafieken
          100 % van de breedte pakken. Alleen zinvol/zichtbaar in Analyseren, en
          Graphs rendert sowieso alleen daar. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGraphsFocusMode(!graphsFocusMode)}
            aria-pressed={graphsFocusMode}
            className={cn(
              "h-7 gap-1 border-(--border-solid) px-2 text-[11px]",
              graphsFocusMode
                ? "border-(--accent) text-(--accent)"
                : "text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)",
            )}
          >
            {graphsFocusMode ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            {graphsFocusMode ? "Toon" : "Verberg"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {graphsFocusMode
            ? "Toon tabel en video weer"
            : "Verberg tabel en video om grafieken volledig in beeld te krijgen"}
        </TooltipContent>
      </Tooltip>
      {/* 09c: "Pane-grootte" — continue slider. 0 = auto (panes vullen de
          container), hoger = elke pane krijgt een minimum-afmeting en de
          grafieken-zone scrollt als ze niet meer passen. Klein/auto-icoon
          links, groot-icoon rechts. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-1" aria-label="Pane-grootte">
            <Maximize2 className="size-3 shrink-0 text-(--text-muted)" />
            <Slider
              value={[paneSize]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={([v]) => setPaneSize(v)}
              className="w-[84px]"
              aria-label="Pane-grootte"
            />
            <Maximize2 className="size-4 shrink-0 text-(--text-muted)" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Sleep om panes groter te maken; de grafieken-zone scrollt als ze niet passen
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-7 w-7 border-(--border-solid)",
              panes.length < maxPanes
                ? "text-(--text-secondary) hover:border-(--accent) hover:text-(--accent)"
                : "opacity-40",
            )}
            onClick={addPane}
            disabled={panes.length >= maxPanes}
          >
            <Plus className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {panes.length >= maxPanes ? `Max ${maxPanes} grafieken` : "Voeg grafiek toe"}
        </TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <Pane>
      <PaneHeader title="Grafieken" actions={headerActions} />
      <PaneBody className="bg-(--bg-card) p-2">
        <PaneGrid
          panes={panes}
          paneSize={paneSize}
          renderPane={(state) => (
            <GraphPane
              key={state.id}
              state={state}
              rows={extRows}
              unit={unit}
              currentFrame={currentFrame}
              hoveredFrame={hoveredFrame}
              trimStart={trim.start}
              trimEnd={trim.end}
              fps={fps}
              fitConfig={fitConfig}
              fits={fits}
              canClose={panes.length > 1}
              onClose={() => closePane(state.id)}
              onChange={(next) => updatePane(state.id, next)}
              onFrameSelect={setFrame}
              onHoverFrame={setHoveredFrame}
            />
          )}
        />
      </PaneBody>
    </Pane>
  );
}

// ---------------------------------------------------------------------------
// PaneGrid — layout-progressie 1 / 2 / 3 / 4 met react-resizable-panels.
//
// 09: de leerling kiest het AANTAL panes (1–4); de tool kiest of ze naast óf
// onder elkaar staan op basis van de beschikbare CONTAINER-breedte. Drie
// richt-breakpoints (tunbaar):
//   • brede  (≥ 1024 px): zoveel mogelijk naast elkaar
//   • medium (640–1024):  gemengd (bv. 3 panes → 2 boven + 1 onder)
//   • smal   (< 640 px):  alles onder elkaar
// Een ResizeObserver op de container hermeet bij elke breedte-wijziging (ook
// window-resize en de "Grafieken vergroten"-toggle). De pane-STATE (type,
// toggles, zoom) leeft in GraphsLayoutState en overleeft een layout-omschakeling
// — alleen de panel-verhoudingen resetten naar default, wat hier prima is.
// ---------------------------------------------------------------------------

interface PaneGridProps {
  panes: PaneState[];
  paneSize: number;
  renderPane: (state: PaneState) => React.ReactNode;
}

type Breakpoint = "smal" | "medium" | "brede";

function breakpointFor(width: number): Breakpoint {
  if (width < 640) return "smal";
  if (width < 1024) return "medium";
  return "brede";
}

function PaneGrid({ panes, paneSize, renderPane }: PaneGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Start "breed" zodat de eerste render (vóór de ResizeObserver vuurt) de
  // ruimste layout pakt — geen flits van een te-smalle stapel.
  const [width, setWidth] = useState(Infinity);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? Infinity);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const bp = breakpointFor(width);
  const n = panes.length;

  // 09c: bij paneSize > 0 verlaten we de sleepbare flex-fit-panels en gebruiken
  // we een CSS-grid met minimum-celafmetingen + scroll. De auto-RICHTING blijft
  // gelijk (kolom-aantal volgt dezelfde breakpoint-logica); alleen de afmeting
  // per pane groeit. Bij paneSize === 0 blijft het bestaande gedrag intact.
  if (paneSize > 0) {
    return (
      <div ref={containerRef} className="h-full w-full min-h-0">
        <ScrollableGrid panes={panes} renderPane={renderPane} bp={bp} paneSize={paneSize} />
      </div>
    );
  }

  let content: React.ReactNode = null;
  if (n === 1) {
    content = <div className="h-full w-full">{renderPane(panes[0])}</div>;
  } else if (n === 2) {
    content =
      bp === "smal" ? (
        <PaneStack orientation="vertical" id="graphs-v-2" panes={panes} renderPane={renderPane} />
      ) : (
        <PaneStack orientation="horizontal" id="graphs-h-2" panes={panes} renderPane={renderPane} />
      );
  } else if (n === 3) {
    if (bp === "brede") {
      content = (
        <PaneStack orientation="horizontal" id="graphs-h-3" panes={panes} renderPane={renderPane} />
      );
    } else if (bp === "smal") {
      content = (
        <PaneStack orientation="vertical" id="graphs-v-3" panes={panes} renderPane={renderPane} />
      );
    } else {
      // medium → 2 boven, 1 onder
      content = <TwoPlusOne panes={panes} renderPane={renderPane} />;
    }
  } else if (n === 4) {
    content =
      bp === "smal" ? (
        <PaneStack orientation="vertical" id="graphs-v-4" panes={panes} renderPane={renderPane} />
      ) : (
        <Grid2x2 panes={panes} renderPane={renderPane} />
      );
  }

  return (
    <div ref={containerRef} className="h-full w-full min-h-0">
      {content}
    </div>
  );
}

/** Eén rij (horizontal) of stapel (vertical) van N gelijke panes. */
function PaneStack({
  orientation,
  id,
  panes,
  renderPane,
}: {
  orientation: "horizontal" | "vertical";
  id: string;
  panes: PaneState[];
  renderPane: (state: PaneState) => React.ReactNode;
}) {
  const dividerOrientation = orientation === "horizontal" ? "vertical" : "horizontal";
  return (
    <Group orientation={orientation} id={id} className="h-full w-full gap-1.5">
      {panes.map((p, i) => (
        <Fragment key={p.id}>
          {i > 0 ? <PaneDivider orientation={dividerOrientation} /> : null}
          <Panel defaultSize={100 / panes.length} minSize={15}>
            {renderPane(p)}
          </Panel>
        </Fragment>
      ))}
    </Group>
  );
}

/** 3 panes (medium): twee naast elkaar boven, één breed onder. */
function TwoPlusOne({
  panes,
  renderPane,
}: {
  panes: PaneState[];
  renderPane: (state: PaneState) => React.ReactNode;
}) {
  return (
    <Group orientation="vertical" id="graphs-2plus1" className="h-full w-full gap-1.5">
      <Panel defaultSize={50} minSize={20}>
        <Group orientation="horizontal" id="graphs-2plus1-top" className="h-full w-full gap-1.5">
          <Panel defaultSize={50} minSize={15}>
            {renderPane(panes[0])}
          </Panel>
          <PaneDivider orientation="vertical" />
          <Panel defaultSize={50} minSize={15}>
            {renderPane(panes[1])}
          </Panel>
        </Group>
      </Panel>
      <PaneDivider orientation="horizontal" />
      <Panel defaultSize={50} minSize={20}>
        {renderPane(panes[2])}
      </Panel>
    </Group>
  );
}

// ---------------------------------------------------------------------------
// ScrollableGrid — paneSize > 0: vaste minimum-afmetingen + scroll.
// ---------------------------------------------------------------------------

// Tunbare grenzen voor de "Pane-grootte"-slider (px). paneSize 0→1 schaalt
// lineair van min naar max; bij 0 wordt deze grid niet gebruikt (auto-layout).
const PANE_MIN_W = 300;
const PANE_MAX_W = 820;
const PANE_MIN_H = 240;
const PANE_MAX_H = 600;

/** Aantal kolommen voor de scroll-grid — volgt dezelfde richting als de auto-layout. */
function columnsFor(n: number, bp: Breakpoint): number {
  if (n <= 1) return 1;
  if (n === 2) return bp === "smal" ? 1 : 2;
  if (n === 3) return bp === "brede" ? 3 : bp === "smal" ? 1 : 2;
  return bp === "smal" ? 1 : 2; // 4 panes
}

function ScrollableGrid({
  panes,
  renderPane,
  bp,
  paneSize,
}: {
  panes: PaneState[];
  renderPane: (state: PaneState) => React.ReactNode;
  bp: Breakpoint;
  paneSize: number;
}) {
  const cols = columnsFor(panes.length, bp);
  const minW = Math.round(PANE_MIN_W + paneSize * (PANE_MAX_W - PANE_MIN_W));
  const minH = Math.round(PANE_MIN_H + paneSize * (PANE_MAX_H - PANE_MIN_H));
  return (
    <div className="h-full w-full overflow-auto">
      <div
        className="grid min-h-full gap-1.5"
        style={{
          // minmax(min, 1fr): cellen vullen de ruimte als ze passen, en clampen
          // op `min` (waardoor de grid overflowt → scroll) als ze niet passen.
          gridTemplateColumns: `repeat(${cols}, minmax(${minW}px, 1fr))`,
          gridAutoRows: `minmax(${minH}px, 1fr)`,
        }}
      >
        {panes.map((p, i) => (
          <div
            key={p.id}
            className="min-h-0 min-w-0 overflow-hidden"
            // 3 panes in 2 kolommen → derde pane over de volle breedte (2+1),
            // consistent met de medium auto-layout.
            style={
              panes.length === 3 && cols === 2 && i === 2
                ? { gridColumn: "1 / -1" }
                : undefined
            }
          >
            {renderPane(p)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 4 panes (≥ 640 px): 2×2 grid. */
function Grid2x2({
  panes,
  renderPane,
}: {
  panes: PaneState[];
  renderPane: (state: PaneState) => React.ReactNode;
}) {
  return (
    <Group orientation="vertical" id="graphs-v-4-grid" className="h-full w-full gap-1.5">
      <Panel defaultSize={50} minSize={20}>
        <Group orientation="horizontal" id="graphs-h-4-top" className="h-full w-full gap-1.5">
          <Panel defaultSize={50} minSize={15}>
            {renderPane(panes[0])}
          </Panel>
          <PaneDivider orientation="vertical" />
          <Panel defaultSize={50} minSize={15}>
            {renderPane(panes[1])}
          </Panel>
        </Group>
      </Panel>
      <PaneDivider orientation="horizontal" />
      <Panel defaultSize={50} minSize={20}>
        <Group orientation="horizontal" id="graphs-h-4-bot" className="h-full w-full gap-1.5">
          <Panel defaultSize={50} minSize={15}>
            {renderPane(panes[2])}
          </Panel>
          <PaneDivider orientation="vertical" />
          <Panel defaultSize={50} minSize={15}>
            {renderPane(panes[3])}
          </Panel>
        </Group>
      </Panel>
    </Group>
  );
}
