/**
 * Controle van een gekozen bestand en de foutteksten als een video niet laadt.
 *
 * Aanleiding (2026-10-10): in klas 2 laadde een filmpje op de Chromebooks
 * stil niet. Het bestand was kapotgegaan bij versturen via Signal (de stsc-
 * tabel van het geluidsspoor verwees naar een chunk die niet bestond);
 * Windows negeerde dat, Chrome op ChromeOS niet. De leerling zag niets
 * gebeuren. Daarom: nooit meer stil weigeren, altijd zeggen wat er mis is
 * en wat je kunt doen, in leerlingtaal.
 *
 * Bewust zonder React of DOM, zodat het in node te testen is.
 */

/** Extensies die we als video accepteren als de browser geen MIME-type geeft. */
export const VIDEO_EXTENSIONS = ["mp4", "m4v", "mov", "webm", "mkv", "3gp"] as const;

export interface VideoLoadError {
  fileName: string;
  title: string;
  message: string;
  tips: string[];
  /** Technische regel voor de docent (foutcode); klein weergegeven. */
  detail?: string;
  /** Omzetten in de browser aanbieden (videoConvert.ts). */
  canConvert?: boolean;
  /** "Toch proberen" aanbieden: de browser zei vooraf nee, maar dat is een voorspelling. */
  canTryAnyway?: boolean;
}

/** Wat we van een bestand nodig hebben; een echte `File` voldoet. */
export interface FileLike {
  name: string;
  type: string;
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

const TIP_DIRECT =
  "Stuur filmpjes niet via WhatsApp of Signal: die apps passen het bestand aan. Zet de video rechtstreeks van je telefoon op je Chromebook, met een kabel of via Google Drive.";
const TIP_IPHONE =
  "Gefilmd met een iPhone? Zet dan Instellingen > Camera > Formaten op Meest compatibel en film opnieuw.";
const TIP_ANDERS = "Lukt het nog steeds niet? Probeer de video op een andere computer.";
const TIP_VOLGENDE_KEER =
  "Voor de volgende keer: zet op je iPhone Instellingen > Camera > Formaten op Meest compatibel. Dan hoeft omzetten niet meer.";

/**
 * Is dit een video die we mogen proberen te laden? `null` = ja.
 *
 * Een leeg MIME-type weigeren we niet: op Chromebooks komen bestanden uit
 * Google Drive of de Android-map vaak zonder `type` binnen. Dan beslist de
 * extensie.
 */
export function checkVideoFile(file: FileLike): VideoLoadError | null {
  const type = file.type.toLowerCase();
  const ext = fileExtension(file.name);
  if (type.startsWith("video/")) return null;
  const typeOnbekend = type === "" || type === "application/octet-stream";
  if (typeOnbekend && (VIDEO_EXTENSIONS as readonly string[]).includes(ext)) return null;

  if (type.startsWith("image/")) {
    return {
      fileName: file.name,
      title: "Dit is een foto, geen video",
      message: "Videometen heeft een filmpje nodig. Kies een video van je telefoon of camera.",
      tips: [],
    };
  }
  if (ext === "json") {
    return {
      fileName: file.name,
      title: "Dit is een projectbestand",
      message:
        "Een opgeslagen project open je via Menu (rechtsboven) > Project openen. Daarna vraagt Videometen om de bijbehorende video.",
      tips: [],
    };
  }
  return {
    fileName: file.name,
    title: "Dit bestand is geen video",
    message: "Kies een videobestand, bijvoorbeeld een MP4 of MOV van je telefoon.",
    tips: [],
  };
}

/** Namen van de MediaError-codes, voor de technische regel. */
const MEDIA_ERROR_NAMES: Record<number, string> = {
  1: "MEDIA_ERR_ABORTED",
  2: "MEDIA_ERR_NETWORK",
  3: "MEDIA_ERR_DECODE",
  4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
};

/**
 * Foutmelding bij een `error`-event van een `<video>`. `code` is
 * `MediaError.code` (of `null` als de browser niets meegeeft).
 */
export function describeMediaError(
  file: FileLike,
  code: number | null,
  browserMessage?: string,
  format?: FormatInfo,
): VideoLoadError {
  const detail = [
    code !== null ? `Foutcode ${code} (${MEDIA_ERROR_NAMES[code] ?? "onbekend"})` : "Geen foutcode",
    browserMessage ? browserMessage : null,
    formatDetail(format),
  ]
    .filter(Boolean)
    .join(" · ");

  if (code === 1 || code === 2) {
    return {
      fileName: file.name,
      title: "Het laden van de video is afgebroken",
      message: "Probeer de video nog een keer te kiezen.",
      tips: [TIP_ANDERS],
      detail,
    };
  }
  if (format?.codec === "hevc") {
    return {
      fileName: file.name,
      title: "Deze video kan je browser niet afspelen",
      message: `De video is opgeslagen als ${format.description}. Dit apparaat kan dat formaat niet afspelen. Zet hem hieronder om; dat gebeurt alleen op dit apparaat.`,
      tips: [TIP_VOLGENDE_KEER],
      detail,
      canConvert: true,
    };
  }
  return {
    fileName: file.name,
    title: "Deze video kan je browser niet lezen",
    message:
      "Het bestand is beschadigd of in een formaat opgeslagen dat je browser niet kan afspelen. Omzetten lost dat vaak op.",
    tips: [TIP_DIRECT, TIP_IPHONE, TIP_ANDERS],
    detail,
    canConvert: true,
  };
}

/** Foutmelding als het bestand wel opent maar geen beeld heeft (alleen geluid). */
export function describeNoPicture(file: FileLike, format?: FormatInfo): VideoLoadError {
  return {
    fileName: file.name,
    title: "Deze video heeft geen beeld",
    message:
      format?.codec === "hevc"
        ? `Het beeld is opgeslagen als ${format.description}, en dat kan dit apparaat niet afspelen. Zet de video hieronder om; dat gebeurt alleen op dit apparaat.`
        : "Het bestand bevat alleen geluid, of het beeld kan je browser niet lezen. Omzetten lost dat vaak op.",
    tips: format?.codec === "hevc" ? [TIP_VOLGENDE_KEER] : [TIP_DIRECT, TIP_IPHONE],
    detail: ["videoWidth = 0", formatDetail(format)].filter(Boolean).join(" · "),
    canConvert: true,
  };
}

// ---------------------------------------------------------------------------
// Meldingen op basis van het videoformaat (videoProbe.ts)
// ---------------------------------------------------------------------------

/** Wat we uit de kop van het bestand weten; los van videoProbe zodat dit DOM-vrij blijft. */
export interface FormatInfo {
  codec: string;
  /** Leesbare beschrijving, bv. "HEVC (H.265), 10 bit, HDR (HLG), 1920×1080". */
  description: string;
  codecString: string | null;
  /** Wat de browser vooraf zei: kan dit apparaat dit afspelen? */
  support: "ja" | "nee" | "onbekend";
}

function formatDetail(format?: FormatInfo): string | null {
  if (!format) return null;
  return `${format.description} (${format.codecString ?? "?"}), apparaat: ${format.support}`;
}

/** De browser zegt vooraf al: dit formaat kan dit apparaat niet afspelen. */
export function describeUnsupportedFormat(file: FileLike, format: FormatInfo): VideoLoadError {
  const iphone = format.codec === "hevc";
  return {
    fileName: file.name,
    title: "Deze video moet eerst worden omgezet",
    message: `De video is opgeslagen als ${format.description}${
      iphone ? ", het standaardformaat van een iPhone" : ""
    }. Dit apparaat kan dat niet afspelen. Zet hem hieronder om; dat gebeurt alleen op dit apparaat en de video gaat niet over internet.`,
    tips: iphone ? [TIP_VOLGENDE_KEER] : [],
    detail: formatDetail(format) ?? undefined,
    canConvert: true,
    canTryAnyway: true,
  };
}

/** Het bestand houdt te vroeg op: downloaden of kopiëren is niet gelukt. */
export function describeTruncated(file: FileLike): VideoLoadError {
  return {
    fileName: file.name,
    title: "Deze video is niet compleet",
    message:
      "Het bestand houdt te vroeg op. Waarschijnlijk is het downloaden of kopiëren niet helemaal gelukt.",
    tips: [
      "Download of kopieer de video opnieuw en wacht tot dat helemaal klaar is.",
      "Staat de video in Google Drive? Klik er met rechts op en kies Offline beschikbaar, en probeer het daarna opnieuw.",
    ],
    detail: "Bestand afgekapt (box loopt voorbij het einde)",
  };
}

// ---------------------------------------------------------------------------
// Slowmotion
// ---------------------------------------------------------------------------

/**
 * Telefoons nemen slowmotion op met 120 of 240 fps maar slaan het op als een
 * gewone video van 30 fps die vertraagd afspeelt. Elk frame in het bestand is
 * dan 1/240 s echte tijd, niet 1/30 s. Zonder correctie zijn alle tijden een
 * factor 8 te lang (v 8× te klein, a 64× te klein).
 *
 * Daarom twee fps-waarden: de afspeel-fps van het bestand (voor het stappen en
 * zoeken door frames) en de opname-fps (voor de tijd per frame). Zonder
 * slowmotion is de opname-fps gelijk aan de afspeel-fps.
 */
export const SLOWMO_PRESETS = [120, 240] as const;

export function timeFpsOf(video: { fps: number; captureFps: number | null }): number {
  return video.captureFps ?? video.fps;
}

/** Hoeveel keer vertraagd de video afspeelt (1 = gewone video). */
export function slowdownFactor(video: { fps: number; captureFps: number | null }): number {
  return video.captureFps !== null && video.fps > 0 ? video.captureFps / video.fps : 1;
}
