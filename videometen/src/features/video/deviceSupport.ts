/**
 * Kan dit apparaat een bepaald videoformaat afspelen?
 *
 * Chrome speelt HEVC alleen af als de hardware dat kan; op goedkope
 * Chromebooks verschilt dat per model, en 10 bit/HDR valt vaker af. We vragen
 * het de browser via MediaCapabilities (weegt ook resolutie en HDR mee) met
 * `MediaSource.isTypeSupported` als terugval.
 *
 * Een "nee" is een voorspelling, geen zekerheid: de tool biedt daarom altijd
 * ook "Toch proberen" aan.
 */

import type { VideoTrackInfo } from "./videoProbe";

export type Support = "ja" | "nee" | "onbekend";

interface DecodeQuery {
  codecString: string;
  width: number;
  height: number;
  framerate?: number;
  hdr?: "hlg" | "pq" | null;
}

export async function canDecode(q: DecodeQuery): Promise<Support> {
  const contentType = `video/mp4; codecs="${q.codecString}"`;

  const caps = typeof navigator !== "undefined" ? navigator.mediaCapabilities : undefined;
  if (caps?.decodingInfo) {
    try {
      const video: VideoConfiguration = {
        contentType,
        width: q.width || 1920,
        height: q.height || 1080,
        bitrate: 10_000_000,
        framerate: q.framerate ?? 30,
      };
      if (q.hdr) {
        video.transferFunction = q.hdr === "hlg" ? "hlg" : "pq";
        video.colorGamut = "rec2020";
      }
      const info = await caps.decodingInfo({ type: "file", video });
      return info.supported ? "ja" : "nee";
    } catch {
      // Sommige browsers kennen de HDR-velden niet; val terug.
    }
  }

  if (typeof MediaSource !== "undefined" && typeof MediaSource.isTypeSupported === "function") {
    return MediaSource.isTypeSupported(contentType) ? "ja" : "nee";
  }
  if (typeof document !== "undefined") {
    const answer = document.createElement("video").canPlayType(contentType);
    if (answer === "") return "nee";
    if (answer === "probably") return "ja";
  }
  return "onbekend";
}

/** Kan dit apparaat dit specifieke spoor afspelen? */
export async function canDecodeTrack(track: VideoTrackInfo): Promise<Support> {
  if (!track.codecString) return "onbekend";
  return canDecode({
    codecString: track.codecString,
    width: track.width,
    height: track.height,
    hdr: track.hdr,
  });
}

// ---------------------------------------------------------------------------
// Apparaatcheck (voor de docent: "kan deze Chromebook iPhone-video's aan?")
// ---------------------------------------------------------------------------

export interface DeviceCheck {
  label: string;
  /** Waar dit formaat vandaan komt, in leerlingtaal. */
  hint: string;
  query: DecodeQuery;
}

export const DEVICE_CHECKS: DeviceCheck[] = [
  {
    label: "H.264, 1080p",
    hint: "Android, iPhone op 'Meest compatibel', omgezette video's",
    query: { codecString: "avc1.640028", width: 1920, height: 1080 },
  },
  {
    label: "HEVC 8 bit, 1080p",
    hint: "iPhone op 'Hoge efficiëntie', HDR uit",
    query: { codecString: "hvc1.1.6.L123.B0", width: 1920, height: 1080 },
  },
  {
    label: "HEVC 10 bit HDR, 1080p",
    hint: "iPhone 12 en nieuwer, standaardinstelling",
    query: { codecString: "hvc1.2.4.L123.B0", width: 1920, height: 1080, hdr: "hlg" },
  },
  {
    label: "HEVC 10 bit HDR, 4K 60 fps",
    hint: "iPhone op 4K 60",
    query: {
      codecString: "hvc1.2.4.L153.B0",
      width: 3840,
      height: 2160,
      framerate: 60,
      hdr: "hlg",
    },
  },
];

export interface DeviceReport {
  results: { check: DeviceCheck; support: Support }[];
  /** Kan het omzetten hier draaien (WebAssembly + workers)? */
  canConvert: boolean;
  userAgent: string;
}

export function conversionAvailable(): boolean {
  return typeof WebAssembly === "object" && typeof Worker === "function";
}

export async function runDeviceCheck(): Promise<DeviceReport> {
  const results = await Promise.all(
    DEVICE_CHECKS.map(async (check) => ({ check, support: await canDecode(check.query) })),
  );
  return {
    results,
    canConvert: conversionAvailable(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
}

export function reportAsText(report: DeviceReport): string {
  const lines = report.results.map(
    ({ check, support }) => `${check.label}: ${support} (${check.query.codecString})`,
  );
  lines.push(`Omzetten mogelijk: ${report.canConvert ? "ja" : "nee"}`);
  lines.push(`Browser: ${report.userAgent}`);
  return lines.join("\n");
}
