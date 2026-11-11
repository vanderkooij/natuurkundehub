import { useEffect, useRef, useState, type ReactNode } from "react";
import { Copy, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { conversionAvailable } from "@/features/video/deviceSupport";
import {
  ConversionCancelled,
  convertVideo,
  type ConvertProgress,
} from "@/features/video/videoConvert";
import { useVideo } from "@/features/video/VideoState";

/**
 * Knoppen onder een laadfout: omzetten, toch proberen, technische info kopiëren.
 * Het omzetten zelf staat in videoConvert.ts; na afloop laden we de omgezette
 * video zonder formaatcontrole (die is dan H.264, dat kan elk apparaat).
 */
/** `children` (tips, technische regel) komen tussen de knoppen en het kopieerlinkje. */
export function ConvertPanel({ children }: { children?: ReactNode }) {
  const { loadError, failedVideo, loadFile } = useVideo();
  const [progress, setProgress] = useState<ConvertProgress | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Een nieuwe fout (ander bestand) wist de oude omzetstatus.
  useEffect(() => {
    setConvertError(null);
    setCopied(false);
  }, [loadError]);

  // Wegnavigeren of een andere video kiezen breekt het omzetten af.
  useEffect(() => () => abortRef.current?.abort(), []);

  if (!loadError) return null;

  const onConvert = async () => {
    if (!failedVideo) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setConvertError(null);
    setProgress({ stage: "laden", fraction: null });
    const started = performance.now();
    try {
      const converted = await convertVideo(
        failedVideo.file,
        failedVideo.track?.duration ?? null,
        setProgress,
        controller.signal,
      );
      if (import.meta.env.DEV) {
        console.info(
          `[VIDEO] omgezet in ${((performance.now() - started) / 1000).toFixed(1)} s`,
          converted.size,
        );
      }
      setProgress(null);
      loadFile(converted, { skipFormatCheck: true });
    } catch (err) {
      setProgress(null);
      if (err instanceof ConversionCancelled) return;
      const text = err instanceof Error ? err.message : String(err);
      setConvertError(
        /memory|geheugen|OOM|allocation/i.test(text)
          ? "Omzetten lukte niet: de video is te groot voor het geheugen van dit apparaat. Film korter of in een lagere resolutie (1080p), of zet hem om op een andere computer."
          : "Omzetten lukte niet. Probeer het op een andere computer, of film opnieuw met de iPhone op Meest compatibel.",
      );
      console.warn("[VIDEO] omzetten mislukt", err);
    } finally {
      abortRef.current = null;
    }
  };

  const onCopy = async () => {
    const text = [
      `Bestand: ${loadError.fileName}${failedVideo ? ` (${(failedVideo.file.size / 1e6).toFixed(1)} MB)` : ""}`,
      `Melding: ${loadError.title}`,
      loadError.detail ? `Detail: ${loadError.detail}` : null,
      convertError ? `Omzetten: ${convertError}` : null,
      `Browser: ${navigator.userAgent}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      window.prompt("Kopieer deze tekst:", text);
    }
  };

  const showConvert = loadError.canConvert && failedVideo && conversionAvailable();

  return (
    <div className="space-y-2 pt-1">
      {progress ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[13px] text-(--text-secondary)">
            <Loader2 className="size-4 animate-spin text-(--accent)" aria-hidden />
            {progress.stage === "laden"
              ? progress.loadedMB !== undefined && progress.totalMB !== undefined
                ? `Stap 1 van 2: omzetter downloaden… ${Math.round(progress.loadedMB)} van ${Math.round(progress.totalMB)} MB`
                : "Stap 1 van 2: omzetter downloaden…"
              : `Stap 2 van 2: video omzetten… ${progress.fraction !== null ? Math.round(progress.fraction * 100) : 0}%`}
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-(--border-solid)"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              progress.fraction !== null ? Math.round(progress.fraction * 100) : undefined
            }
          >
            <div
              className="h-full rounded-full bg-(--accent) transition-[width] duration-300"
              style={{ width: `${Math.round((progress.fraction ?? 0) * 100)}%` }}
            />
          </div>
          <p className="text-[12px] text-(--text-muted)">
            {progress.stage === "laden"
              ? "De omzetter hoef je maar één keer te downloaden. Laat dit tabblad open."
              : "Dit kan een paar minuten duren. Laat dit tabblad open."}
          </p>
          <Button variant="outline" size="sm" onClick={() => abortRef.current?.abort()}>
            Afbreken
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {showConvert ? (
            <Button size="sm" onClick={onConvert} className="gap-1.5">
              <RefreshCw className="size-3.5" aria-hidden />
              Video omzetten
            </Button>
          ) : null}
          {loadError.canTryAnyway && failedVideo ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadFile(failedVideo.file, { skipFormatCheck: true })}
            >
              Toch proberen zonder omzetten
            </Button>
          ) : null}
        </div>
      )}
      {convertError ? (
        <p className="text-[13px] leading-snug text-(--text-secondary)">{convertError}</p>
      ) : null}
      {children}
      {loadError.detail || convertError ? (
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1 text-[11px] text-(--text-muted) hover:text-(--accent)"
        >
          <Copy className="size-3" aria-hidden />
          {copied ? "Gekopieerd" : "Kopieer technische info (voor je docent)"}
        </button>
      ) : null}
    </div>
  );
}
