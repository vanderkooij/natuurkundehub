/**
 * Lees uit de kop van een MP4/MOV-bestand welk videoformaat erin zit.
 *
 * Aanleiding (2026-11-11): iPhone 12/13-video's (HEVC, 10 bit, HDR) laadden
 * niet op goedkope Chromebooks. Chrome heeft geen eigen HEVC-decoder en leunt
 * op de hardware; kan die het niet, dan zegt de browser alleen "kan niet
 * lezen" of speelt hij geluid zonder beeld. Door zelf het formaat te lezen
 * kunnen we de leerling vertellen wat er aan de hand is en omzetten aanbieden.
 *
 * Alleen de kop wordt gelezen (de `moov`-box met de spoorbeschrijving), nooit
 * de videodata zelf. Bewust zonder DOM, zodat het in node te testen is.
 */

export type VideoCodec = "hevc" | "h264" | "vp9" | "av1" | "anders";

export interface VideoTrackInfo {
  /** Merk uit de `ftyp`-box, bv. "qt  " (QuickTime/iPhone) of "isom". */
  brand: string | null;
  /** Vier tekens van de sample entry, bv. "hvc1", "avc1", "dvh1". */
  sampleEntry: string;
  codec: VideoCodec;
  /** Codec-string (RFC 6381) om de browser te vragen, of `null` als onbekend. */
  codecString: string | null;
  /** Opgeslagen afmetingen (vóór eventuele rotatie). */
  width: number;
  height: number;
  bitDepth: number | null;
  hdr: "hlg" | "pq" | null;
  dolbyVision: boolean;
  /** Duur in seconden uit de `mvhd`-box, `null` als onbekend. */
  duration: number | null;
}

export type ProbeResult =
  | { kind: "ok"; track: VideoTrackInfo }
  /** Geen MP4/MOV (bv. WebM/MKV): we weten het niet, de browser beslist. */
  | { kind: "geen-mp4" }
  /** Wel MP4/MOV, maar het bestand houdt te vroeg op (half gedownload). */
  | { kind: "afgekapt" }
  /** MP4/MOV zonder spoorbeschrijving (`moov`) of zonder videospoor. */
  | { kind: "geen-video" };

/** Leest bytes [start, end) uit het bestand. Een `File` kan dit via `slice`. */
export type ByteReader = (start: number, end: number) => Promise<ArrayBuffer>;

export function fileReader(file: Blob): ByteReader {
  return (start, end) => file.slice(start, end).arrayBuffer();
}

/** Grootste `moov` die we inlezen; iPhone-video's zitten ruim onder 1 MB. */
const MAX_MOOV_BYTES = 64 * 1024 * 1024;

const TOP_LEVEL_TYPES = new Set([
  "ftyp", "moov", "mdat", "free", "skip", "wide", "uuid", "pnot", "meta", "styp", "sidx", "moof", "mfra",
]); // prettier-ignore

function fourcc(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

interface Box {
  type: string;
  /** Begin van de inhoud (na de kop), relatief aan de view. */
  start: number;
  /** Einde van de box, relatief aan de view. */
  end: number;
}

/** Alle boxen in `view` tussen `start` en `end` (één niveau diep). */
function childBoxes(view: DataView, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let pos = start;
  while (pos + 8 <= end) {
    let size = view.getUint32(pos);
    const type = fourcc(view, pos + 4);
    let header = 8;
    if (size === 1) {
      if (pos + 16 > end) break;
      size = Number(view.getBigUint64(pos + 8));
      header = 16;
    } else if (size === 0) {
      size = end - pos;
    }
    if (size < header || pos + size > end) break;
    boxes.push({ type, start: pos + header, end: pos + size });
    pos += size;
  }
  return boxes;
}

function findChild(view: DataView, parent: Box, type: string): Box | undefined {
  return childBoxes(view, parent.start, parent.end).find((b) => b.type === type);
}

/** Draai de 32 bits om (voor de compatibiliteitsvlaggen in de HEVC-codecstring). */
function reverseBits32(n: number): number {
  let r = 0;
  for (let i = 0; i < 32; i++) {
    r = (r << 1) | ((n >>> i) & 1);
  }
  return r >>> 0;
}

/**
 * HEVC-codecstring volgens ISO 14496-15 bijlage E, bv. "hvc1.2.4.L123.B0"
 * (Main 10, level 4.1). Chrome leest hieruit vooral het profiel.
 */
function hevcCodecString(view: DataView, hvcC: Box, prefix: string): string | null {
  if (hvcC.end - hvcC.start < 13) return null;
  const b1 = view.getUint8(hvcC.start + 1);
  const profileSpace = ["", "A", "B", "C"][b1 >> 6];
  const tier = (b1 >> 5) & 1 ? "H" : "L";
  const profileIdc = b1 & 0x1f;
  const compat = reverseBits32(view.getUint32(hvcC.start + 2));
  const constraints: number[] = [];
  for (let i = 0; i < 6; i++) constraints.push(view.getUint8(hvcC.start + 6 + i));
  while (constraints.length > 0 && constraints[constraints.length - 1] === 0) constraints.pop();
  const level = view.getUint8(hvcC.start + 12);
  const parts = [
    prefix,
    `${profileSpace}${profileIdc}`,
    compat.toString(16).toUpperCase(),
    `${tier}${level}`,
    ...constraints.map((c) => c.toString(16).toUpperCase().padStart(2, "0")),
  ];
  return parts.join(".");
}

function hevcBitDepth(view: DataView, hvcC: Box): number | null {
  if (hvcC.end - hvcC.start < 19) return null;
  return (view.getUint8(hvcC.start + 17) & 0x07) + 8;
}

function avcCodecString(view: DataView, avcC: Box, prefix: string): string | null {
  if (avcC.end - avcC.start < 4) return null;
  const hex = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
  return `${prefix}.${hex(view.getUint8(avcC.start + 1))}${hex(view.getUint8(avcC.start + 2))}${hex(view.getUint8(avcC.start + 3))}`;
}

const HEVC_ENTRIES = new Set(["hvc1", "hev1", "dvh1", "dvhe"]);
const AVC_ENTRIES = new Set(["avc1", "avc3", "dva1", "dvav"]);

/** Lees de eerste sample entry van een videospoor (`stsd` → entry). */
function parseVisualEntry(view: DataView, entry: Box): Omit<VideoTrackInfo, "brand" | "duration"> {
  const sampleEntry = entry.type;
  // Visuele sample entry: 78 bytes vaste velden, daarna de kind-boxen.
  const width = entry.end - entry.start >= 28 ? view.getUint16(entry.start + 24) : 0;
  const height = entry.end - entry.start >= 28 ? view.getUint16(entry.start + 26) : 0;
  const children =
    entry.end - entry.start > 78 ? childBoxes(view, entry.start + 78, entry.end) : [];
  const child = (type: string) => children.find((c) => c.type === type);

  let codec: VideoCodec = "anders";
  let codecString: string | null = null;
  let bitDepth: number | null = null;

  if (HEVC_ENTRIES.has(sampleEntry)) {
    codec = "hevc";
    const hvcC = child("hvcC");
    if (hvcC) {
      // Dolby Vision 8.x heeft een gewone HEVC-laag; die vragen we de browser.
      const prefix = sampleEntry === "hev1" || sampleEntry === "dvhe" ? "hev1" : "hvc1";
      codecString = hevcCodecString(view, hvcC, prefix);
      bitDepth = hevcBitDepth(view, hvcC);
    }
  } else if (AVC_ENTRIES.has(sampleEntry)) {
    codec = "h264";
    const avcC = child("avcC");
    if (avcC) {
      codecString = avcCodecString(view, avcC, sampleEntry === "avc3" ? "avc3" : "avc1");
      const profile = view.getUint8(avcC.start + 1);
      bitDepth = profile === 110 || profile === 122 || profile === 244 ? 10 : 8;
    }
  } else if (sampleEntry === "vp09") {
    codec = "vp9";
  } else if (sampleEntry === "av01") {
    codec = "av1";
  }

  let hdr: VideoTrackInfo["hdr"] = null;
  const colr = child("colr");
  if (colr && colr.end - colr.start >= 10) {
    const colourType = fourcc(view, colr.start);
    if (colourType === "nclx" || colourType === "nclc") {
      const transfer = view.getUint16(colr.start + 6);
      if (transfer === 18) hdr = "hlg";
      else if (transfer === 16) hdr = "pq";
    }
  }

  const dolbyVision =
    sampleEntry.startsWith("dv") || child("dvcC") !== undefined || child("dvvC") !== undefined;

  return { sampleEntry, codec, codecString, width, height, bitDepth, hdr, dolbyVision };
}

function parseMvhdDuration(view: DataView, mvhd: Box): number | null {
  const version = view.getUint8(mvhd.start);
  if (version === 1) {
    if (mvhd.end - mvhd.start < 32) return null;
    const timescale = view.getUint32(mvhd.start + 20);
    const duration = Number(view.getBigUint64(mvhd.start + 24));
    return timescale > 0 ? duration / timescale : null;
  }
  if (mvhd.end - mvhd.start < 20) return null;
  const timescale = view.getUint32(mvhd.start + 12);
  const duration = view.getUint32(mvhd.start + 16);
  return timescale > 0 ? duration / timescale : null;
}

/** Zoek in een ingelezen `moov` het eerste videospoor. */
export function parseMoov(moovBytes: ArrayBuffer, brand: string | null): VideoTrackInfo | null {
  const view = new DataView(moovBytes);
  const all: Box = { type: "moov", start: 0, end: moovBytes.byteLength };
  const mvhd = findChild(view, all, "mvhd");
  const duration = mvhd ? parseMvhdDuration(view, mvhd) : null;

  for (const trak of childBoxes(view, 0, moovBytes.byteLength)) {
    if (trak.type !== "trak") continue;
    const mdia = findChild(view, trak, "mdia");
    if (!mdia) continue;
    const hdlr = findChild(view, mdia, "hdlr");
    if (!hdlr || hdlr.end - hdlr.start < 12 || fourcc(view, hdlr.start + 8) !== "vide") continue;
    const minf = findChild(view, mdia, "minf");
    const stbl = minf && findChild(view, minf, "stbl");
    const stsd = stbl && findChild(view, stbl, "stsd");
    if (!stsd || stsd.end - stsd.start < 16) continue;
    const entries = childBoxes(view, stsd.start + 8, stsd.end);
    if (entries.length === 0) continue;
    return { brand, duration, ...parseVisualEntry(view, entries[0]) };
  }
  return null;
}

/**
 * Loop de bovenste laag boxen af, lees `ftyp` en `moov`, en beschrijf het
 * videospoor. Leest alleen koppen en de `moov`, dus ook bij grote video's snel.
 */
export async function probeVideo(read: ByteReader, size: number): Promise<ProbeResult> {
  if (size < 8) return { kind: "geen-mp4" };
  let pos = 0;
  let brand: string | null = null;
  let first = true;

  while (pos + 8 <= size) {
    const head = new DataView(await read(pos, Math.min(pos + 16, size)));
    if (head.byteLength < 8) return { kind: "afgekapt" };
    let boxSize = head.getUint32(0);
    const type = fourcc(head, 4);
    let header = 8;
    if (first) {
      // Herken MP4/MOV aan de eerste box; WebM/MKV e.d. laten we aan de browser.
      if (!TOP_LEVEL_TYPES.has(type)) return { kind: "geen-mp4" };
      first = false;
    }
    if (boxSize === 1) {
      if (head.byteLength < 16) return { kind: "afgekapt" };
      boxSize = Number(head.getBigUint64(8));
      header = 16;
    } else if (boxSize === 0) {
      boxSize = size - pos;
    }
    if (boxSize < header) return { kind: "geen-video" };
    if (pos + boxSize > size) {
      // De box loopt voorbij het einde: het bestand is niet compleet.
      return { kind: "afgekapt" };
    }

    if (type === "ftyp" && boxSize >= 12) {
      const ftyp = new DataView(await read(pos + header, pos + header + 4));
      brand = fourcc(ftyp, 0);
    } else if (type === "moov") {
      if (boxSize - header > MAX_MOOV_BYTES) return { kind: "geen-video" };
      const moov = await read(pos + header, pos + boxSize);
      const track = parseMoov(moov, brand);
      return track ? { kind: "ok", track } : { kind: "geen-video" };
    }
    pos += boxSize;
  }
  return { kind: "geen-video" };
}

// ---------------------------------------------------------------------------
// Beschrijven
// ---------------------------------------------------------------------------

const CODEC_NAMES: Record<VideoCodec, string> = {
  hevc: "HEVC (H.265)",
  h264: "H.264",
  vp9: "VP9",
  av1: "AV1",
  anders: "onbekend formaat",
};

/** Korte technische beschrijving, bv. "HEVC (H.265), 10 bit, HDR (HLG), Dolby Vision, 1920×1080". */
export function describeTrack(track: VideoTrackInfo): string {
  const parts = [
    track.codec === "anders"
      ? `${CODEC_NAMES.anders} (${track.sampleEntry})`
      : CODEC_NAMES[track.codec],
  ];
  if (track.bitDepth !== null && track.bitDepth > 8) parts.push(`${track.bitDepth} bit`);
  if (track.hdr) parts.push(`HDR (${track.hdr.toUpperCase()})`);
  if (track.dolbyVision) parts.push("Dolby Vision");
  if (track.width && track.height) parts.push(`${track.width}×${track.height}`);
  return parts.join(", ");
}
