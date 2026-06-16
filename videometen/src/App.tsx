import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Group, Panel, useGroupRef } from "react-resizable-panels";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/_reusable/AppHeader";
import { PaneDivider } from "@/_reusable/ThreePaneLayout";
import { Toaster } from "@/_reusable/Toaster";
import { useGlobalShortcut } from "@/_reusable/useGlobalShortcut";
import { AppModeProvider, useAppMode } from "@/features/app/AppMode";
import { InteractionZoneProvider } from "@/features/app/InteractionZoneState";
import { ToolMenu } from "@/features/app/ToolMenu";
import { WorkModeToggle } from "@/features/app/WorkModeToggle";
import {
  CalibrationProvider,
  isAxisEditing,
  useCalibration,
} from "@/features/calibration/CalibrationState";
import { CalibrationOverlay } from "@/features/calibration/overlays/CalibrationOverlay";
import { HelpPanel } from "@/features/help/HelpPanel";
import { WorkflowBar, type WorkflowStep } from "@/features/layout/WorkflowBar";
import { Graphs } from "@/features/measurements/Graphs";
import { GraphsLayoutProvider, useGraphsLayout } from "@/features/measurements/GraphsLayoutState";
import { cn } from "@/lib/utils";
import { MeasurementHoverProvider } from "@/features/measurements/MeasurementHoverState";
import { MeasurementTable } from "@/features/measurements/Table";
import { TrackingBar } from "@/features/tracking/TrackingBar";
import { TrackingProvider, useTracking } from "@/features/tracking/TrackingState";
import { VideoPane } from "@/features/video/VideoPane";
import { VideoPlayer } from "@/features/video/VideoPlayer";
import { VideoProvider, useVideo } from "@/features/video/VideoState";
import { useVideoKeyboard } from "@/features/video/useVideoKeyboard";

/** Globale undo/redo: actief in beide modi, geblokkeerd in inputs door useGlobalShortcut. */
function UndoRedoShortcuts() {
  const { history } = useTracking();
  useGlobalShortcut(
    (e) => (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z",
    (e) => {
      if (!history.canUndo) return;
      e.preventDefault();
      history.undo();
    },
  );
  useGlobalShortcut(
    (e) =>
      ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "y") ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z"),
    (e) => {
      if (!history.canRedo) return;
      e.preventDefault();
      history.redo();
    },
  );
  return null;
}

/** Escape verlaat tracken-modus. Inputs blokkeren is automatisch in useGlobalShortcut. */
function TrackingExitShortcut() {
  const { mode, exitTracking } = useAppMode();
  useGlobalShortcut("Escape", () => exitTracking(), { enabled: mode === "tracken" });
  return null;
}

function TrackingViewport() {
  return (
    <div className="relative flex flex-1 min-h-0 items-stretch justify-stretch overflow-hidden bg-(--bg-primary) p-2">
      <div
        className="relative flex flex-1 overflow-hidden rounded-[14px] border bg-card"
        data-mouse-zone="video"
      >
        <VideoPlayer>
          <CalibrationOverlay />
        </VideoPlayer>
      </div>
    </div>
  );
}

/** Wrapper rond VideoPane die de `data-mouse-zone="video"` aanbiedt. */
function VideoPaneWithZone() {
  return (
    <div className="h-full w-full" data-mouse-zone="video">
      <VideoPane />
    </div>
  );
}

/**
 * Video-pane op volle breedte. 08: getoond zolang er nog geen metingen zijn —
 * tabel + grafieken verschijnen pas zodra de leerling begint te tracken
 * (opbouwende workflow: video → kalibreren → tracken → analyseren).
 */
function VideoOnlyLayout() {
  return (
    <div className="flex-1 min-h-0 overflow-hidden bg-(--bg-primary) p-2">
      <VideoPaneWithZone />
    </div>
  );
}

/**
 * Horizontale verdeling links-kolom / grafieken (percentages). 09b: "Verberg"
 * (graphsFocusMode) is binair — niet meer 16/84, maar de linker kolom helemaal
 * dicht (0) zodat de grafieken 100 % pakken.
 */
const ANALYSEREN_SPLIT_NORMAL = { "analyseren-left": 30, "analyseren-graphs": 70 };
const ANALYSEREN_SPLIT_HIDDEN = { "analyseren-left": 0, "analyseren-graphs": 100 };

/**
 * Analyseren: links-kolom (~30%) met video-tile boven en tabel onder
 * (verticaal gestapeld, sleepbare verdeler), rechts (~70%) de grafieken.
 * Beide verdelers blijven sleepbaar. Bij 0 metingen: alleen de video
 * (consistent met Meten-modus — geen lege panes).
 *
 * 09b: "Verberg" (graphsFocusMode) verbergt video + tabel volledig en geeft de
 * grafieken 100 %. Cruciaal: de linker kolom wordt NIET ge-unmount maar
 * dichtgeklapt (`setLayout` → 0 %) + `display:none` op de inhoud — zo blijven
 * video-currentframe en tabel-scrollpositie behouden. De verdeler wordt
 * verborgen + uitgeschakeld en de Group-gap valt weg, zodat er geen sliver of
 * 8 px-kier overblijft. `minSize` van links zakt naar 0 in deze modus zodat de
 * 0-% layout door de validatie komt (normaal blijft 22 % de sleep-ondergrens).
 */
function AnalyserenLayout({ hasMeasurements }: { hasMeasurements: boolean }) {
  const { graphsFocusMode } = useGraphsLayout();
  const outerGroupRef = useGroupRef();

  // useLayoutEffect (i.p.v. useEffect) zodat de breedte-herverdeling vóór de
  // browser-paint gebeurt — geen flits van een leeg 30 %-vlak bij het toggelen.
  useLayoutEffect(() => {
    outerGroupRef.current?.setLayout(
      graphsFocusMode ? ANALYSEREN_SPLIT_HIDDEN : ANALYSEREN_SPLIT_NORMAL,
    );
  }, [graphsFocusMode, hasMeasurements, outerGroupRef]);

  if (!hasMeasurements) return <VideoOnlyLayout />;
  return (
    <div className="flex-1 min-h-0 overflow-hidden bg-(--bg-primary)">
      <Group
        orientation="horizontal"
        id="analyseren-outer"
        groupRef={outerGroupRef}
        className={cn("h-full w-full p-2", graphsFocusMode ? "gap-0" : "gap-2")}
      >
        <Panel
          id="analyseren-left"
          defaultSize={30}
          minSize={graphsFocusMode ? 0 : 22}
          className={cn(graphsFocusMode && "hidden")}
        >
          <Group
            orientation="vertical"
            id="analyseren-left-stack"
            className="h-full w-full gap-2"
          >
            <Panel defaultSize={45} minSize={25}>
              <VideoPaneWithZone />
            </Panel>
            <PaneDivider orientation="horizontal" />
            <Panel defaultSize={55} minSize={20}>
              <MeasurementTable />
            </Panel>
          </Group>
        </Panel>
        <PaneDivider orientation="vertical" hidden={graphsFocusMode} disabled={graphsFocusMode} />
        <Panel id="analyseren-graphs" defaultSize={70} minSize={35}>
          <Graphs />
        </Panel>
      </Group>
    </div>
  );
}

/** Dunne tussenlaag die videoKeyboard binnen de InteractionZoneProvider laat lopen. */
function VideoKeyboardBinder() {
  useVideoKeyboard();
  return null;
}

/**
 * Coordinator: synct de actieve mode + tracked points naar VideoState's
 * snap-config. Daar gebruikt de reducer 'm om setFrame in Meten/Analyseren
 * automatisch te snappen naar het dichtstbij meetpunt-frame. In Tracken-modus
 * staat snap uit (essentieel: tracking moet alle frames vrij kunnen aanwijzen).
 */
function FrameSnapCoordinator() {
  const { mode } = useAppMode();
  const { points } = useTracking();
  const { video, setSnapConfig, markFirstMeasurementFps, clearFirstMeasurementFps } = useVideo();

  const frames = useMemo(() => {
    // TrackingState houdt punten al op frame-volgorde — defensieve sort om
    // nearestMeasurementIdx's invariant ("oplopend gesorteerd") te garanderen.
    return points.map((p) => p.frame).sort((a, b) => a - b);
  }, [points]);

  useEffect(() => {
    setSnapConfig(mode !== "tracken", frames);
  }, [mode, frames, setSnapConfig]);

  // Fps-defensie: wanneer een nieuwe meting verschijnt (transitie 0 → ≥1
  // punten) zetten we de huidige fps vast als "fps op moment van eerste
  // meetpunt". Wanneer de meetreeks weer leeg is (bv. door "alle metingen
  // wissen") wissen we de marker zodat warning-styling op de chip uitgaat.
  useEffect(() => {
    if (!video) return;
    if (points.length > 0) {
      markFirstMeasurementFps(video.fps);
    } else {
      clearFirstMeasurementFps();
    }
  }, [video, points.length, markFirstMeasurementFps, clearFirstMeasurementFps]);

  return null;
}

/**
 * 08c: schakel eenmalig automatisch naar Analyseren zodra de leerling z'n
 * tweede meetpunt zet (dan is er een grafiek te zien). Vervangt de 08b-toast
 * — de layout-overgang spreekt voor zich, geen melding nodig. `usedRef` reset
 * zodra de meetreeks leeg is (nieuwe video / Begin opnieuw / Alle metingen
 * wissen / Andere video laden — allemaal zetten points op 0), zodat 't bij een
 * volgende sessie opnieuw kan. Niet getriggerd als de leerling al in
 * Analyseren staat of tijdens tracken.
 */
function AutoSwitchToAnalyseren() {
  const { points } = useTracking();
  const { mode, setWorkMode } = useAppMode();
  const usedRef = useRef(false);

  useEffect(() => {
    if (points.length === 0) {
      usedRef.current = false;
      return;
    }
    if (points.length >= 2 && mode === "meten" && !usedRef.current) {
      usedRef.current = true;
      setWorkMode("analyseren");
    }
  }, [points.length, mode, setWorkMode]);

  return null;
}

function AppShell() {
  const { video, trim, setFrame } = useVideo();
  const { scale, axesTouched, mode, startScaleEdit, startAxisEdit, cancelMode } = useCalibration();
  const { points } = useTracking();
  const { mode: appMode, enterTracking } = useAppMode();
  const { setGraphsFocusMode, setPaneSize } = useGraphsLayout();
  const [helpOpen, setHelpOpen] = useState(false);

  // 11b: huidige calibration-mode in een ref, zodat de mode-wissel-effect 'm
  // kan lezen zonder erop te dependen (anders zou enter-axis-edit het effect
  // direct opnieuw triggeren en de modus meteen weer sluiten).
  const calibModeRef = useRef(mode);
  calibModeRef.current = mode;

  // 09/09c: "Verberg" en "Pane-grootte" zijn tijdelijke view-voorkeuren — reset
  // ze bij elke mode-wissel (Meten ↔ Analyseren ↔ Tracken). 11b: verlaat ook
  // axis-edit, anders blijven de assen-hint + richting-toggles hangen in de
  // nieuwe modus (bv. zichtbaar in Analyseren).
  useEffect(() => {
    setGraphsFocusMode(false);
    setPaneSize(0);
    if (isAxisEditing(calibModeRef.current)) cancelMode();
  }, [appMode, setGraphsFocusMode, setPaneSize, cancelMode]);

  const steps = useMemo<WorkflowStep[]>(() => {
    const trimNonDefault =
      !!video && (trim.start > 0 || trim.end < Math.max(0, video.frameCount - 1));
    return [
      { num: 1, label: "Video", state: video ? "done" : "active", enabled: false },
      { num: 2, label: "fps", state: video ? "done" : "todo", enabled: false },
      { num: 3, label: "Trim", state: trimNonDefault ? "done" : "todo", enabled: false },
      {
        num: 4,
        label: "Schaal",
        state: mode === "scale-edit" ? "active" : scale ? "done" : "todo",
        enabled: !!video,
        onClick: startScaleEdit,
      },
      {
        num: 5,
        label: "Assen",
        // 08: "done" pas na bewuste aanraking van de assen-fase (axesTouched),
        // niet automatisch na video-load.
        state: mode === "axis-edit-by-angle" ? "active" : axesTouched ? "done" : "todo",
        enabled: !!video,
        onClick: startAxisEdit,
      },
      // 10: stap 6 "Analyse" verwijderd — die deed niets. Na voorbereiding
      // (1-5) ga je via "Start tracking" verder; de auto-switch naar Analyseren
      // bij het 2e meetpunt dekt de overgang naar de analyse-fase.
    ];
  }, [video, trim.start, trim.end, scale, axesTouched, mode, startScaleEdit, startAxisEdit]);

  // 08: tracking pas mogelijk na de bewuste kalibratie-fase: schaal én assen.
  const startTrackingEnabled = !!video && !!scale && axesTouched;
  const startTrackingReason =
    !video || startTrackingEnabled
      ? undefined
      : !scale && !axesTouched
        ? "Stel eerst de schaal en assen in (stap 4 + 5)"
        : !scale
          ? "Stel eerst de schaal in (stap 4)"
          : "Bevestig eerst de assen-oriëntatie (stap 5)";
  const startTrackingHint =
    video && !startTrackingEnabled
      ? !scale && !axesTouched
        ? "Schaal + assen instellen"
        : !scale
          ? "Stel eerst de schaal in"
          : "Bevestig de assen"
      : null;

  const onStartTracking = () => {
    if (!startTrackingEnabled) return;
    // Tracking begint altijd bij trimStart — consistente startpositie ongeacht
    // analyse-state. SkipSnap voorkomt dat de snap-coordinator (tussen het
    // dispatchen en de mode-switch nog actief) 'm naar een nabij meetpunt
    // duwt.
    setFrame(trim.start, { skipSnap: true });
    enterTracking();
  };

  return (
    <div className="flex h-full w-full flex-col">
      <AppHeader
        toolName="Videometen"
        breadcrumb={[
          { label: "home", href: "/" },
          { label: "videometen", href: "/videometen/" },
        ]}
        extraActions={<ToolMenu />}
        onHelpClick={() => setHelpOpen((v) => !v)}
      />
      <HelpPanel
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        toolVersion="1.0.0"
      />
      {appMode === "tracken" ? (
        <>
          <TrackingBar />
          <TrackingViewport />
        </>
      ) : (
        <>
          <WorkflowBar
            steps={steps}
            startTrackingEnabled={startTrackingEnabled}
            startTrackingHint={startTrackingHint}
            startTrackingTooltip={startTrackingReason}
            onStartTracking={onStartTracking}
            trailingSlot={<WorkModeToggle />}
          />
          {appMode === "meten" ? (
            // Meten: altijd alleen de video (kalibreer- + meet-fase).
            <VideoOnlyLayout />
          ) : (
            <AnalyserenLayout hasMeasurements={points.length >= 1} />
          )}
        </>
      )}
      <UndoRedoShortcuts />
      <TrackingExitShortcut />
      <VideoKeyboardBinder />
      <FrameSnapCoordinator />
      <AutoSwitchToAnalyseren />
    </div>
  );
}

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <AppModeProvider>
        <VideoProvider>
          <CalibrationProvider>
            <TrackingProvider>
              <MeasurementHoverProvider>
                {/* GraphsLayout en InteractionZone wrappen samen alles wat over
                    mode-switches heen blijft leven. Graphs-panes overleven dus
                    een wissel Meten ↔ Analyseren. */}
                <GraphsLayoutProvider>
                  <InteractionZoneProvider>
                    <AppShell />
                    <Toaster />
                  </InteractionZoneProvider>
                </GraphsLayoutProvider>
              </MeasurementHoverProvider>
            </TrackingProvider>
          </CalibrationProvider>
        </VideoProvider>
      </AppModeProvider>
    </TooltipProvider>
  );
}
