import { describe, expect, it } from "vitest";

import { describeTrack, probeVideo, type ByteReader } from "./videoProbe";

// ---------------------------------------------------------------------------
// Hulpjes om een MP4/MOV-kop na te bouwen
// ---------------------------------------------------------------------------

function ascii(s: string): number[] {
  return [...s].map((c) => c.charCodeAt(0));
}
function u16(n: number): number[] {
  return [(n >> 8) & 0xff, n & 0xff];
}
function u32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}
function box(type: string, ...content: number[][]): number[] {
  const body = content.flat();
  return [...u32(body.length + 8), ...ascii(type), ...body];
}
function zeros(n: number): number[] {
  return new Array(n).fill(0);
}

function visualEntry(type: string, width: number, height: number, ...children: number[][]) {
  const fixed = [
    ...zeros(6), ...u16(1), // reserved, data_reference_index
    ...zeros(16), // pre_defined, reserved, pre_defined
    ...u16(width), ...u16(height),
    ...u32(0x00480000), ...u32(0x00480000), // resolutie
    ...zeros(4), ...u16(1), // reserved, frame_count
    ...zeros(32), // compressorname
    ...u16(0x18), ...u16(0xffff), // depth, pre_defined
  ]; // prettier-ignore
  expect(fixed.length).toBe(78);
  return box(type, fixed, ...children);
}

/** hvcC zoals een iPhone 12/13 hem schrijft: Main 10, level 4.1. */
const HVCC_MAIN10 = box("hvcC", [
  1,
  0x02,
  ...u32(0x20000000),
  0xb0,
  0,
  0,
  0,
  0,
  0,
  123,
  0xf0,
  0x00,
  0xfc,
  0xfd,
  0xfa,
  0xfa,
  0,
  0,
  0x0f,
  0,
]);
const HVCC_MAIN8 = box("hvcC", [
  1,
  0x01,
  ...u32(0x60000000),
  0x90,
  0,
  0,
  0,
  0,
  0,
  93,
  0xf0,
  0x00,
  0xfc,
  0xfd,
  0xf8,
  0xf8,
  0,
  0,
  0x0f,
  0,
]);
const AVCC_HIGH = box("avcC", [1, 0x64, 0x00, 0x28, 0xff, 0xe1]);
const COLR_HLG = box("colr", ascii("nclx"), u16(9), u16(18), u16(9), [0]);
const DVVC = box("dvvC", zeros(24));

function trak(handler: string, entry: number[]) {
  return box(
    "trak",
    box("tkhd", zeros(84)),
    box(
      "mdia",
      box("mdhd", zeros(24)),
      box("hdlr", zeros(8), ascii(handler), zeros(13)),
      box("minf", box("stbl", box("stsd", u32(0), u32(1), entry))),
    ),
  );
}

function mvhd(timescale: number, duration: number) {
  return box("mvhd", [0, 0, 0, 0], zeros(8), u32(timescale), u32(duration), zeros(80));
}

const AUDIO = trak("soun", box("mp4a", zeros(28)));

function file(...boxes: number[][]): Uint8Array {
  return new Uint8Array(boxes.flat());
}

function readerOf(bytes: Uint8Array): ByteReader {
  return async (start, end) => bytes.slice(start, end).buffer;
}

async function probe(bytes: Uint8Array) {
  return probeVideo(readerOf(bytes), bytes.length);
}

const FTYP_QT = box("ftyp", ascii("qt  "), u32(0), ascii("qt  "));
const FTYP_ISOM = box("ftyp", ascii("isom"), u32(512), ascii("isommp41"));
const MDAT = box("mdat", zeros(500));

// ---------------------------------------------------------------------------

describe("probeVideo", () => {
  it("herkent een iPhone-HDR-video: HEVC, 10 bit, HLG, Dolby Vision", async () => {
    const moov = box(
      "moov",
      mvhd(600, 6000),
      AUDIO,
      trak("vide", visualEntry("hvc1", 1920, 1080, HVCC_MAIN10, COLR_HLG, DVVC)),
    );
    // iPhone: mdat vóór moov.
    const result = await probe(file(FTYP_QT, box("wide"), MDAT, moov));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.track).toMatchObject({
      brand: "qt  ",
      sampleEntry: "hvc1",
      codec: "hevc",
      codecString: "hvc1.2.4.L123.B0",
      width: 1920,
      height: 1080,
      bitDepth: 10,
      hdr: "hlg",
      dolbyVision: true,
      duration: 10,
    });
    expect(describeTrack(result.track)).toBe(
      "HEVC (H.265), 10 bit, HDR (HLG), Dolby Vision, 1920×1080",
    );
  });

  it("herkent gewone 8-bit HEVC (iPhone zonder HDR)", async () => {
    const moov = box(
      "moov",
      mvhd(600, 600),
      trak("vide", visualEntry("hvc1", 1920, 1080, HVCC_MAIN8)),
    );
    const result = await probe(file(FTYP_QT, moov, MDAT));
    expect(result.kind === "ok" && result.track).toMatchObject({
      codecString: "hvc1.1.6.L93.90",
      bitDepth: 8,
      hdr: null,
      dolbyVision: false,
    });
  });

  it("herkent H.264 (Meest compatibel / Android)", async () => {
    const moov = box(
      "moov",
      mvhd(1000, 5000),
      trak("vide", visualEntry("avc1", 1280, 720, AVCC_HIGH)),
    );
    const result = await probe(file(FTYP_ISOM, moov, MDAT));
    expect(result.kind === "ok" && result.track).toMatchObject({
      codec: "h264",
      codecString: "avc1.640028",
      bitDepth: 8,
      duration: 5,
    });
  });

  it("meldt een afgekapt bestand (half gedownload)", async () => {
    const moov = box(
      "moov",
      mvhd(600, 600),
      trak("vide", visualEntry("hvc1", 1920, 1080, HVCC_MAIN8)),
    );
    const whole = file(FTYP_QT, MDAT, moov);
    expect((await probe(whole.slice(0, whole.length - 40))).kind).toBe("afgekapt");
  });

  it("meldt een MP4 zonder videospoor", async () => {
    expect((await probe(file(FTYP_ISOM, box("moov", mvhd(600, 600), AUDIO), MDAT))).kind).toBe(
      "geen-video",
    );
  });

  it("laat WebM aan de browser over", async () => {
    const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0, 0, 0]);
    expect((await probe(webm)).kind).toBe("geen-mp4");
  });

  it("leest 64-bit boxgroottes (lange video's)", async () => {
    const big = [...u32(1), ...ascii("mdat"), ...u32(0), ...u32(16 + 100), ...zeros(100)];
    const moov = box(
      "moov",
      mvhd(600, 600),
      trak("vide", visualEntry("avc1", 640, 480, AVCC_HIGH)),
    );
    const result = await probe(file(FTYP_ISOM, big, moov));
    expect(result.kind).toBe("ok");
  });
});
