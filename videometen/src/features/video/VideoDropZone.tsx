import { useRef, useState, type DragEvent } from "react";
import { AlertTriangle, FileVideo, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConvertPanel } from "@/features/video/ConvertPanel";
import { DeviceCheckDialog } from "@/features/video/DeviceCheckDialog";
import { useVideo } from "@/features/video/VideoState";
import { cn } from "@/lib/utils";

// Extensies erbij: op Chromebooks hebben bestanden uit Drive soms geen MIME-type,
// en dan verbergt een filter op alleen video/* ze in de bestandskiezer.
const ACCEPT = "video/*,.mp4,.m4v,.mov,.webm,.mkv,.3gp";

export function VideoDropZone() {
  const { loadFile, loadError, clearLoadError, isLoading } = useVideo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [deviceCheckOpen, setDeviceCheckOpen] = useState(false);

  const onPick = () => inputRef.current?.click();

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Controle en eventuele foutmelding zitten in loadFile (VideoState).
    loadFile(files[0]);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    onFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        // Scrollbaar, en 'safe' centreren: met een lange foutmelding op een
        // laag scherm (Chromebook ~650 px) viel de onderkant er anders af,
        // inclusief de knop Omzetten.
        "flex min-h-0 flex-1 flex-col items-center justify-center-safe overflow-y-auto p-8 transition-colors",
        dragging ? "bg-(--accent)/10" : "bg-transparent",
      )}
    >
      <div
        className={cn(
          "flex max-w-md flex-shrink-0 flex-col items-center rounded-2xl border-2 border-dashed px-10 text-center transition-colors",
          // Met een melding eronder: compacter, zodat de melding meer ruimte krijgt.
          loadError ? "gap-3 py-5" : "gap-4 py-12",
          dragging ? "border-(--accent) bg-(--bg-card)" : "border-(--border-solid) bg-(--bg-card)",
        )}
      >
        {loadError ? null : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-(--accent)/10 text-(--accent)">
            <FileVideo className="size-7" />
          </div>
        )}
        <div>
          <p className="text-base font-semibold text-(--text-primary)">Sleep een video hierheen</p>
          <p className="mt-1 text-sm text-(--text-muted)">of klik om er een te kiezen</p>
        </div>
        <Button variant="default" size="default" onClick={onPick} className="gap-2">
          <Upload className="size-4" />
          Kies video
        </Button>
        <p className="font-mono text-[11px] text-(--text-muted)">
          MP4, MOV, WebM · blijft 100% lokaal in je browser
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            onFiles(e.target.files);
            // Leegmaken, zodat hetzelfde bestand na een fout opnieuw te kiezen is.
            e.target.value = "";
          }}
        />
      </div>
      {isLoading ? (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm text-(--text-secondary)">
          <Loader2 className="size-4 animate-spin text-(--accent)" aria-hidden />
          Video laden…
        </p>
      ) : null}
      {loadError ? (
        <div
          role="alert"
          className="mt-4 w-full max-w-md flex-shrink-0 rounded-xl border border-(--accent-amber)/50 bg-(--accent-amber)/10 px-4 py-3 text-left"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="mt-0.5 size-4 flex-shrink-0 text-(--accent-amber)"
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-semibold text-(--text-primary)">{loadError.title}</p>
              <p className="break-all font-mono text-[11px] text-(--text-muted)">
                {loadError.fileName}
              </p>
              <p className="text-[13px] leading-snug text-(--text-secondary)">
                {loadError.message}
              </p>
              {/* Eerst de oplossing (omzetten), daarna pas de tips voor als
                  dat niet lukt of voor de volgende keer. */}
              <ConvertPanel>
                {loadError.tips.length > 0 ? (
                  <div className="space-y-1 pt-1">
                    {loadError.canConvert &&
                    !loadError.tips.every((t) => t.startsWith("Voor de volgende keer")) ? (
                      <p className="text-[12px] font-semibold text-(--text-secondary)">
                        Lukt omzetten niet?
                      </p>
                    ) : null}
                    <ul className="list-disc space-y-1 pl-4 text-[13px] leading-snug text-(--text-secondary)">
                      {loadError.tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {loadError.detail ? (
                  <p className="break-words font-mono text-[10.5px] text-(--text-muted)">
                    {loadError.detail}
                  </p>
                ) : null}
              </ConvertPanel>
            </div>
            <button
              type="button"
              onClick={clearLoadError}
              aria-label="Melding sluiten"
              className="-mr-1 -mt-1 rounded px-1.5 text-(--text-muted) hover:text-(--text-primary)"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
      {/* Lichte hint over film-condities. Bewust zacht (geen icoon/kader);
          uitgebreide help volgt in een latere prompt. */}
      <p className="mt-4 max-w-md text-center text-xs text-(--text-muted) opacity-70">
        <span className="font-semibold">Tip:</span> film met een stilstaande camera (geen pan, zoom
        of trilling) voor de meest precieze metingen.
      </p>
      <a
        href="/videometen/over/"
        className="mt-2 text-xs text-(--text-muted) hover:text-(--accent) hover:underline"
      >
        Wat is Videometen?
      </a>
      <button
        type="button"
        onClick={() => setDeviceCheckOpen(true)}
        className="mt-1 text-xs text-(--text-muted) hover:text-(--accent) hover:underline"
      >
        Kan dit apparaat iPhone-video's afspelen?
      </button>
      <DeviceCheckDialog open={deviceCheckOpen} onOpenChange={setDeviceCheckOpen} />
    </div>
  );
}
