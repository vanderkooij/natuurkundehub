/**
 * Zet een video in de browser om naar H.264 (720p, zonder geluid), zodat ook
 * een Chromebook zonder HEVC-hardware hem kan afspelen.
 *
 * Gebruikt ffmpeg.wasm. Die is ruim 30 MB en wordt pas geladen als iemand op
 * "Omzetten" klikt; daarna staat hij in de browsercache. Alles blijft lokaal:
 * de video gaat niet over internet.
 *
 * Belangrijk voor het meten: de tijdstempels van de frames blijven gelijk
 * (`-fps_mode passthrough`), dus elk frame van het origineel is precies één
 * frame in de omgezette video. Een opgeslagen project past dus op beide.
 */

import coreURL from "@ffmpeg/core?url";
import wasmURL from "@ffmpeg/core/wasm?url";

export interface ConvertProgress {
  /** 0 t/m 1, of `null` als nog onbekend. */
  fraction: number | null;
  stage: "laden" | "omzetten";
  /** Bij "laden": hoeveel MB al binnen is en hoeveel in totaal. */
  loadedMB?: number;
  totalMB?: number;
}

/**
 * Grootte van ffmpeg-core.wasm (0.12.10), voor de voortgang als de server
 * hem ingepakt stuurt: Content-Length is dan de ingepakte grootte, terwijl
 * de lezer uitgepakte bytes telt.
 */
const WASM_BYTES = 32_232_419;

/**
 * Download de wasm met voortgang en geef een blob-URL terug. Komt hij uit de
 * browsercache, dan is dit vrijwel meteen klaar.
 */
async function fetchWithProgress(
  url: string,
  onProgress: (loaded: number, total: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(url, { signal });
  if (!res.ok || !res.body) throw new Error(`Omzetter downloaden mislukt (${res.status})`);
  const length = Number(res.headers.get("content-length"));
  const total = !res.headers.get("content-encoding") && length > 0 ? length : WASM_BYTES;
  const reader = res.body.getReader();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.byteLength;
    onProgress(loaded, Math.max(total, loaded));
  }
  return URL.createObjectURL(new Blob(parts, { type: "application/wasm" }));
}

/** Leest "time=00:00:03.53" uit een ffmpeg-logregel. */
export function parseLogTime(line: string): number | null {
  const m = /time=\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** Bestandsnaam van de omgezette video: "IMG_0042.MOV" → "IMG_0042 (omgezet).mp4". */
export function convertedName(name: string): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return `${stem} (omgezet).mp4`;
}

/**
 * ffmpeg-argumenten. Kortste zijde hooguit 720 px (rotatie is dan al
 * toegepast), 8 bit 4:2:0, een sleutelframe per 15 frames zodat frame-voor-
 * frame zoeken vlot blijft.
 */
export function ffmpegArgs(input: string, output: string): string[] {
  return [
    "-i", input,
    "-map", "0:v:0",
    "-an", "-sn", "-dn",
    "-vf",
    "scale='trunc(iw*min(1,720/min(iw,ih))/2)*2':'trunc(ih*min(1,720/min(iw,ih))/2)*2':out_color_matrix=bt709,format=yuv420p",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "20",
    "-g", "15",
    "-fps_mode", "passthrough",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-movflags", "+faststart",
    output,
  ]; // prettier-ignore
}

export class ConversionCancelled extends Error {
  constructor() {
    super("Omzetten afgebroken");
  }
}

/**
 * Zet `file` om. `duration` (s) is voor de voortgang; `signal` kan afbreken.
 * Gooit `ConversionCancelled` bij afbreken, en een gewone Error als ffmpeg faalt
 * (de laatste logregels staan dan in de melding).
 */
export async function convertVideo(
  file: File,
  duration: number | null,
  onProgress: (p: ConvertProgress) => void,
  signal?: AbortSignal,
): Promise<File> {
  onProgress({ stage: "laden", fraction: null });
  const { FFmpeg, FFFSType } = await import("@ffmpeg/ffmpeg");
  const ffmpeg = new FFmpeg();

  const log: string[] = [];
  ffmpeg.on("log", ({ message }) => {
    log.push(message);
    if (log.length > 40) log.shift();
    const t = parseLogTime(message);
    if (t !== null && duration && duration > 0) {
      onProgress({ stage: "omzetten", fraction: Math.min(0.99, t / duration) });
    }
  });

  const onAbort = () => ffmpeg.terminate();
  signal?.addEventListener("abort", onAbort);

  let wasmBlobURL: string | null = null;
  try {
    wasmBlobURL = await fetchWithProgress(
      wasmURL,
      (loaded, total) =>
        onProgress({
          stage: "laden",
          fraction: loaded / total,
          loadedMB: loaded / 1e6,
          totalMB: total / 1e6,
        }),
      signal,
    );
    await ffmpeg.load({ coreURL, wasmURL: wasmBlobURL });
    URL.revokeObjectURL(wasmBlobURL);
    wasmBlobURL = null;
    if (signal?.aborted) throw new ConversionCancelled();
    onProgress({ stage: "omzetten", fraction: 0 });

    // WORKERFS: ffmpeg leest het bestand rechtstreeks, zonder kopie in het
    // geheugen. Scheelt op een Chromebook met 4 GB veel.
    await ffmpeg.createDir("/in");
    await ffmpeg.mount(FFFSType.WORKERFS, { files: [file] }, "/in");
    const output = "/uit.mp4";
    const code = await ffmpeg.exec(ffmpegArgs(`/in/${file.name}`, output));
    if (signal?.aborted) throw new ConversionCancelled();
    if (code !== 0) {
      throw new Error(`ffmpeg stopte met code ${code}\n${log.slice(-8).join("\n")}`);
    }
    const data = await ffmpeg.readFile(output);
    if (typeof data === "string" || data.byteLength === 0) {
      throw new Error(`ffmpeg gaf geen uitvoer\n${log.slice(-8).join("\n")}`);
    }
    onProgress({ stage: "omzetten", fraction: 1 });
    return new File([data as Uint8Array<ArrayBuffer>], convertedName(file.name), {
      type: "video/mp4",
    });
  } catch (err) {
    if (signal?.aborted) throw new ConversionCancelled();
    throw err;
  } finally {
    if (wasmBlobURL) URL.revokeObjectURL(wasmBlobURL);
    signal?.removeEventListener("abort", onAbort);
    // Worker opruimen: geeft het (grote) wasm-geheugen direct terug.
    ffmpeg.terminate();
  }
}
