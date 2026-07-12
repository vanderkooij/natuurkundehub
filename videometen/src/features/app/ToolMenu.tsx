import { useEffect, useRef, useState } from "react";
import {
  FileDown,
  FileOutput,
  FilePlus,
  FileUp,
  MoreVertical,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buildCsvNL, downloadBlob, formatCsvCell } from "@nh/shared/csvNL";
import { toast } from "@/_reusable/Toaster";
import { useAppMode } from "@/features/app/AppMode";
import { useCalibration } from "@/features/calibration/CalibrationState";
import { buildRows } from "@/features/measurements/derive";
import { withAccelerations } from "@/features/measurements/graph-types";
import { useGraphsLayout } from "@/features/measurements/GraphsLayoutState";
import {
  ProjectLoadError,
  dateStampYMD,
  deserializeProject,
  type ProjectJSON,
  sanitizeFilename,
  serializeProject,
  stripExtension,
} from "@/features/project/projectSchema";
import { useTracking } from "@/features/tracking/TrackingState";
import { useVideo } from "@/features/video/VideoState";
import { decimalsForUnit, TIME_DECIMALS } from "@/lib/numbers";
import { cn } from "@/lib/utils";

const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,video/*";
const JSON_ACCEPT = "application/json,.json";
/** Versie van de tool zoals 'ie in een opgeslagen project verschijnt. Stem
 *  af op `package.json` (handmatig — vaste constante is genoeg voor v1). */
const TOOL_VERSION = "1.0.0";

// File System Access API — nog niet in de standaard lib.dom-types, dus een
// minimale eigen declaratie (genoeg voor onze save-flow). Alleen Chromium
// (Chrome/Edge/Opera) heeft 'm; Firefox/Safari vallen terug op download.
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}
interface FileSystemWritableLike {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}
interface FileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableLike>;
}
type ShowSaveFilePicker = (opts?: SaveFilePickerOptions) => Promise<FileSystemFileHandleLike>;

/**
 * Sla JSON op via de native save-dialog (locatie + naam kiezen) wanneer de
 * browser `showSaveFilePicker` ondersteunt; anders val terug op de automatische
 * download. Annuleren (`AbortError`) is geen fout — gewoon niets doen.
 */
async function saveJsonFile(json: string, suggestedName: string) {
  const picker = (window as unknown as { showSaveFilePicker?: ShowSaveFilePicker })
    .showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName,
        types: [{ description: "Videometen project", accept: { "application/json": [".json"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return;
    } catch (err) {
      // Gebruiker klikte "Annuleren" in de dialog → geen actie, geen melding.
      if (err && (err as { name?: string }).name === "AbortError") return;
      // Andere fout (permissie, schrijffout): log + val terug op download.
      console.warn("Save-dialog mislukt, val terug op download:", err);
    }
  }
  downloadBlob(new Blob([json], { type: "application/json;charset=utf-8" }), suggestedName);
}

/**
 * Overflow-menu in de app-header. Top-level acties die niet bij een specifieke
 * pane horen: save/load + export + reset-flows + "andere video laden".
 *
 *  - "Project opslaan..." → snapshot van alle state als JSON-bestand
 *  - "Project openen..." → JSON-bestand inlezen, daarna vraag om bijbehorende
 *    video. Forceert opgeslagen fps.
 *  - "Tabel als CSV" → Excel-NL-vriendelijke CSV-export van de meetreeks
 *  - "Alle metingen wissen" → bulk-remove als ÉÉN undoable stap
 *  - "Begin opnieuw met deze video" → reset kalibratie + trim + tracking +
 *    grafiek-layout. **Niet** undoable
 *  - "Andere video laden..." → reset alles + opent file-picker
 */
export function ToolMenu() {
  const { video, loadFile, clearVideo, resetTrim, setFps, setTrim, trim } = useVideo();
  const {
    points,
    frameStep,
    trailColor,
    removeAllPoints,
    resetTracking,
    loadFromProject: loadTracking,
  } = useTracking();
  const { scale, axes, resetCalibration, loadFromProject: loadCalibration } = useCalibration();
  const {
    panes,
    fitConfig,
    resetLayout,
    setGraphsFocusMode,
    setPaneSize,
    loadFromProject: loadGraphs,
  } = useGraphsLayout();
  const { mode, exitTracking, setWorkMode } = useAppMode();

  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const projectVideoInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [clearMeasurementsOpen, setClearMeasurementsOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [loadOtherOpen, setLoadOtherOpen] = useState(false);

  // Project-load flow: pendingProject wacht op selectie van een videofile
  // door de gebruiker. Daarna wachten we tot de video echt is geladen
  // (useEffect hieronder ziet `video.url` veranderen).
  const [pendingProject, setPendingProject] = useState<ProjectJSON | null>(null);
  // 07m: tweede fase van project-load. Zie root-cause-comment bij de watcher.
  const [projectToApply, setProjectToApply] = useState<ProjectJSON | null>(null);
  const [askVideoFor, setAskVideoFor] = useState<ProjectJSON | null>(null);
  const [confirmOverwriteFor, setConfirmOverwriteFor] = useState<ProjectJSON | null>(null);
  const [confirmShortVideo, setConfirmShortVideo] = useState<{
    project: ProjectJSON;
    actualLastFrame: number;
  } | null>(null);

  const hasVideo = !!video;
  const measurementCount = points.length;
  const hasMeasurements = measurementCount > 0;

  // ---- Menu-open helpers ------------------------------------------------
  const close = () => setOpen(false);

  // ---- Project: opslaan -------------------------------------------------
  const onProjectSave = async () => {
    close();
    if (!video) return;
    const project = serializeProject({
      toolVersion: TOOL_VERSION,
      videoFileName: video.file.name,
      fps: video.fps,
      lastFrame: Math.max(0, video.frameCount - 1),
      trim,
      scale,
      axes,
      points,
      frameStep,
      // Bij save vanuit tracken-modus → opgeslagen modus is "meten" (dat is
      // waar de gebruiker bij open landt; tracken is een tijdelijke flow).
      mode: mode === "tracken" ? "meten" : (mode as "meten" | "analyseren"),
      trailColor,
      panes: panes.map((p) => ({
        type: p.type,
        showLine: p.showLine,
        showFit: p.showFit,
        zoom: p.zoomState,
        tangentActive: p.tangentActive,
        measureActive: p.measureActive,
        measureX1: p.measureX1,
        measureX2: p.measureX2,
      })),
      fitConfig,
    });
    const json = JSON.stringify(project, null, 2);
    const namePart = stripExtension(video.file.name || "project");
    const filename = sanitizeFilename(`videometen-${namePart}-${dateStampYMD()}.json`);
    await saveJsonFile(json, filename);
  };

  // ---- Project: openen --------------------------------------------------
  const onProjectOpen = () => {
    close();
    projectFileInputRef.current?.click();
  };

  const onProjectFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const project = deserializeProject(parsed);
      // Als er al een actieve sessie loopt (video + metingen), bevestiging
      // vragen voordat we overschrijven.
      if (hasVideo && hasMeasurements) {
        setConfirmOverwriteFor(project);
      } else {
        startProjectLoad(project);
      }
    } catch (err) {
      const msg =
        err instanceof ProjectLoadError
          ? err.message
          : err instanceof Error
            ? `Kan project niet inlezen: ${err.message}`
            : "Kan project niet inlezen.";
      toast(msg);
    }
  };

  const startProjectLoad = (project: ProjectJSON) => {
    setAskVideoFor(project);
    // Open de video-picker meteen — de gebruiker krijgt ÉÉN dialog (vraag
    // om video) en kan via knop kiezen.
  };

  const onPickProjectVideo = () => {
    projectVideoInputRef.current?.click();
  };

  const onProjectVideoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file || !askVideoFor) return;
    const project = askVideoFor;
    setAskVideoFor(null);
    // Reset alle state (zonder video-clear-snapshot want we gaan meteen
    // laden) en zet pending. De useEffect-watcher hieronder applyt het
    // project zodra de video echt is ingeladen.
    fullReset();
    clearVideo();
    setPendingProject(project);
    loadFile(file);
  };

  // Watcher: zodra de (nieuwe) video geladen is, project klaarzetten om toe
  // te passen.
  //
  // Root cause 07m (project-load laadde selectief): `loadFile` triggert een
  // nieuwe `video.url`. In DIEZELFDE commit vuren de "reset op nieuwe video"-
  // effects van CalibrationState (`RESET_FOR_VIDEO`), TrackingState
  // (`__RESET`) en GraphsLayoutState (`defaultPanes`). Riepen we hier direct
  // `applyProject` aan, dan draaiden de loads en de resets in dezelfde
  // commit — en omdat een child-effect (deze watcher) VÓÓR de parent-provider-
  // effects vuurt, wonnen de resets (laatste schrijver) → calibration /
  // tracking / graphs / mode werden meteen weer leeggemaakt. fps/trim
  // overleefden omdat die binnen de `LOAD_VIDEO`-reducer worden gezet, niet
  // via een los reset-effect.
  //
  // Fix: defer `applyProject` één commit via `projectToApply`. De reset-
  // effects zijn `lastUrlRef`-guarded en vuren maar één keer per nieuwe url;
  // in de volgende commit draaien ze niet opnieuw, dus is `applyProject` dan
  // de laatste (en enige) schrijver van de geladen state.
  useEffect(() => {
    if (!pendingProject || !video) return;
    const project = pendingProject;
    setPendingProject(null);

    // Lastframe-mismatch waarschuwing.
    const actualLastFrame = Math.max(0, video.frameCount - 1);
    if (actualLastFrame < project.video.lastFrame) {
      // Vraag bevestiging; pas DAARNA pas toe.
      setConfirmShortVideo({ project, actualLastFrame });
      return;
    }
    setProjectToApply(project);
  }, [pendingProject, video]);

  // Fase 2 (07m): pas het project één commit later toe — ná de reset-op-
  // nieuwe-video effects. Zie root-cause-comment hierboven.
  useEffect(() => {
    if (!projectToApply) return;
    applyProject(projectToApply);
    setProjectToApply(null);
  }, [projectToApply]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyProject = (project: ProjectJSON) => {
    // Forceer de fps uit het project — overschrijft elke detectie. Met
    // bron `project-load` glipt 'ie nog door de lock heen omdat de lock
    // pas actief wordt zodra `loadTracking` z'n meetpunten heeft toegevoegd
    // (FrameSnapCoordinator zet `fpsAtFirstMeasurement` daarna). Bij een
    // project zonder meetpunten blijft fps daarna gewoon wijzigbaar.
    setFps(project.video.fps, "project-load");
    setTrim(project.video.trim);
    loadCalibration(project.calibration.scale, project.calibration.axes);
    loadTracking(project.tracking.points, project.tracking.frameStep, project.ui.trailColor);
    // Project-pane gebruikt `zoom`; runtime PaneState heet 't `zoomState`.
    loadGraphs(
      project.ui.graphs.panes.map((p) => ({
        type: p.type,
        showLine: p.showLine,
        showFit: p.showFit,
        zoomState: p.zoom,
        tangentActive: p.tangentActive,
        measureActive: p.measureActive,
        measureX1: p.measureX1,
        measureX2: p.measureX2,
      })),
      project.ui.graphs.fitConfig,
    );
    setWorkMode(project.ui.mode);
    toast(`Project geladen: ${project.tracking.points.length} metingen.`);
  };

  // ---- CSV export -------------------------------------------------------
  const onCsvExport = () => {
    close();
    if (!video || !scale || points.length === 0) return;
    // Zelfde t-referentie als tabel en grafieken (t = 0 op trim-start) —
    // anders wijkt de CSV af van wat de leerling op het scherm ziet. Punten
    // buiten de trim gaan wel mee (net als in de tabel), met negatieve t.
    const rows = withAccelerations(buildRows(points, scale, axes, video.fps, trim.start, trim.end));
    const unit = scale.unit;
    const dec = decimalsForUnit(unit);
    const header = [
      "frame",
      "t (s)",
      `x (${unit})`,
      `y (${unit})`,
      `vx (${unit}/s)`,
      `vy (${unit}/s)`,
      `|v| (${unit}/s)`,
      `ax (${unit}/s²)`,
      `ay (${unit}/s²)`,
      `|a| (${unit}/s²)`,
    ];
    const dataRows = rows.map((row) => [
      formatCsvCell(row.frame),
      formatCsvCell(row.t, TIME_DECIMALS),
      formatCsvCell(row.x, dec),
      formatCsvCell(row.y, dec),
      formatCsvCell(row.vx ?? null, dec),
      formatCsvCell(row.vy ?? null, dec),
      formatCsvCell(row.vMag ?? null, dec),
      formatCsvCell(row.ax ?? null, dec),
      formatCsvCell(row.ay ?? null, dec),
      formatCsvCell(row.aMag ?? null, dec),
    ]);
    const csv = buildCsvNL([header, ...dataRows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const namePart = stripExtension(video.file.name || "tabel");
    const filename = sanitizeFilename(`videometen-tabel-${namePart}-${dateStampYMD()}.csv`);
    downloadBlob(blob, filename);
  };

  // ---- Reset-flows ------------------------------------------------------
  const openClearMeasurements = () => {
    close();
    setClearMeasurementsOpen(true);
  };
  const openRestart = () => {
    close();
    setRestartOpen(true);
  };
  const openLoadOther = () => {
    close();
    setLoadOtherOpen(true);
  };
  const confirmClearMeasurements = () => {
    removeAllPoints();
    // 09b/09c: "Verberg" + "Pane-grootte" zijn tijdelijke view-voorkeuren —
    // reset ze bij het wissen van alle metingen (net als bij nieuwe video /
    // Begin opnieuw, die via resetLayout al resetten).
    setGraphsFocusMode(false);
    setPaneSize(0);
    setClearMeasurementsOpen(false);
  };
  const fullReset = () => {
    if (mode === "tracken") exitTracking();
    resetCalibration();
    resetTrim();
    resetTracking();
    resetLayout();
  };
  const confirmRestart = () => {
    fullReset();
    setRestartOpen(false);
  };
  const confirmLoadOther = () => {
    setLoadOtherOpen(false);
    fullReset();
    clearVideo();
    videoFileInputRef.current?.click();
  };
  const onVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file || !file.type.startsWith("video/")) return;
    loadFile(file);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                aria-label="Tool-menu"
                className="h-10 gap-1.5 px-3 border-(--border-solid) text-(--text-muted) hover:border-(--accent) hover:text-(--accent)"
              >
                <MoreVertical className="size-[18px]" />
                Menu
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Menu</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-64 p-1.5">
          <MenuItem
            icon={<FileDown className="size-4" />}
            label="Project opslaan..."
            hint={hasVideo ? "JSON met sessie-state (geen video)" : "Eerst een video laden"}
            disabled={!hasVideo}
            onClick={onProjectSave}
          />
          <MenuItem
            icon={<FileUp className="size-4" />}
            label="Project openen..."
            hint="Bestaand JSON-project inladen"
            onClick={onProjectOpen}
          />
          <Separator />
          <MenuItem
            icon={<FileOutput className="size-4" />}
            label="Tabel als CSV"
            hint={hasMeasurements ? "Excel-NL formaat" : "Eerst metingen verzamelen"}
            disabled={!hasVideo || !hasMeasurements || !scale}
            onClick={onCsvExport}
          />
          <Separator />
          <MenuItem
            icon={<Trash2 className="size-4" />}
            label="Alle metingen wissen"
            hint={
              measurementCount > 0
                ? `${measurementCount} ${measurementCount === 1 ? "meting" : "metingen"} (Ctrl+Z herstelt)`
                : "Nog geen metingen"
            }
            disabled={!hasVideo || measurementCount === 0}
            onClick={openClearMeasurements}
          />
          <MenuItem
            icon={<RotateCcw className="size-4" />}
            label="Begin opnieuw met deze video"
            hint="Reset kalibratie, trim, metingen en grafiek-layout"
            disabled={!hasVideo}
            onClick={openRestart}
            destructive
          />
          <Separator />
          <MenuItem
            icon={<FilePlus className="size-4" />}
            label="Andere video laden..."
            hint="Wis huidige video + alle instellingen"
            disabled={!hasVideo}
            onClick={openLoadOther}
            destructive
          />
        </PopoverContent>
      </Popover>

      {/* Verborgen inputs voor de drie file-picker-flows. */}
      <input
        ref={videoFileInputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={onVideoFileChange}
      />
      <input
        ref={projectFileInputRef}
        type="file"
        accept={JSON_ACCEPT}
        className="hidden"
        onChange={onProjectFileChange}
      />
      <input
        ref={projectVideoInputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={onProjectVideoSelected}
      />

      {/* Confirm: alle metingen wissen */}
      <Dialog open={clearMeasurementsOpen} onOpenChange={setClearMeasurementsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alle metingen wissen?</DialogTitle>
            <DialogDescription>
              Alle <strong>{measurementCount}</strong>{" "}
              {measurementCount === 1 ? "meting" : "metingen"} worden gewist. Je kunt dit met Ctrl+Z
              meteen ongedaan maken.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setClearMeasurementsOpen(false)}>
              Annuleren
            </Button>
            <Button variant="default" onClick={confirmClearMeasurements}>
              Wissen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm: begin opnieuw */}
      <Dialog open={restartOpen} onOpenChange={setRestartOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Opnieuw beginnen met deze video?</DialogTitle>
            <DialogDescription>
              Je verliest je <strong>kalibratie</strong> (schaal + assen),{" "}
              <strong>trim-range</strong>, alle <strong>metingen</strong> en je{" "}
              <strong>grafiek-layout</strong>. De video zelf blijft geladen. Dit kun je{" "}
              <strong>niet</strong> ongedaan maken.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRestartOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={confirmRestart}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm: andere video laden */}
      <Dialog open={loadOtherOpen} onOpenChange={setLoadOtherOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Andere video laden?</DialogTitle>
            <DialogDescription>
              Hiermee wis je de <strong>huidige video</strong>, kalibratie, trim en alle{" "}
              <strong>{measurementCount}</strong> {measurementCount === 1 ? "meting" : "metingen"}.
              Daarna kun je een nieuw videobestand kiezen. Dit kun je <strong>niet</strong> ongedaan
              maken.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLoadOtherOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={confirmLoadOther}>
              Kies bestand…
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm: actieve sessie overschrijven bij project-load */}
      <Dialog open={!!confirmOverwriteFor} onOpenChange={(o) => !o && setConfirmOverwriteFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Huidige sessie overschrijven?</DialogTitle>
            <DialogDescription>
              Je hebt al een actieve video met <strong>{measurementCount}</strong>{" "}
              {measurementCount === 1 ? "meting" : "metingen"}. Door dit project te openen gaat die
              sessie verloren.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOverwriteFor(null)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const p = confirmOverwriteFor;
                setConfirmOverwriteFor(null);
                if (p) startProjectLoad(p);
              }}
            >
              Doorgaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vraag om de bijbehorende video voor het ingelezen project */}
      <Dialog open={!!askVideoFor} onOpenChange={(o) => !o && setAskVideoFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecteer het bijbehorende videobestand</DialogTitle>
            <DialogDescription>
              Dit project verwijst naar <strong>{askVideoFor?.meta.videoFileName ?? "—"}</strong>.
              Selecteer het bijbehorende videobestand op je computer. (De video zit niet in het
              project-bestand — alleen een verwijzing.)
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAskVideoFor(null)}>
              Annuleren
            </Button>
            <Button variant="default" onClick={onPickProjectVideo}>
              Kies bestand…
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Korte-video-waarschuwing bij project-load */}
      <Dialog open={!!confirmShortVideo} onOpenChange={(o) => !o && setConfirmShortVideo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Korte video</DialogTitle>
            <DialogDescription>
              De geladen video heeft slechts{" "}
              <strong>{confirmShortVideo?.actualLastFrame ?? 0}</strong> frames, terwijl het project{" "}
              <strong>{confirmShortVideo?.project.video.lastFrame ?? 0}</strong> frames verwacht.
              Sommige metingen vallen mogelijk buiten bereik. Doorgaan?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmShortVideo(null)}>
              Annuleren
            </Button>
            <Button
              variant="default"
              onClick={() => {
                const p = confirmShortVideo?.project;
                setConfirmShortVideo(null);
                // Via dezelfde defer-fase als de watcher (07m).
                if (p) setProjectToApply(p);
              }}
            >
              Doorgaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Separator() {
  return <div className="my-1 h-px bg-(--border-solid)" />;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

function MenuItem({ icon, label, hint, onClick, disabled, destructive }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px]",
        "transition-colors",
        disabled
          ? "cursor-not-allowed opacity-50"
          : destructive
            ? "text-(--text-primary) hover:bg-(--destructive)/10 hover:text-(--destructive)"
            : "text-(--text-primary) hover:bg-(--bg-card-hover) hover:text-(--accent)",
      )}
    >
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <span className="flex flex-col">
        <span className="font-medium leading-tight">{label}</span>
        {hint ? (
          <span className="mt-0.5 font-mono text-[10.5px] text-(--text-muted)">{hint}</span>
        ) : null}
      </span>
    </button>
  );
}
