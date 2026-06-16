import { useEffect } from "react";

import { useVideo } from "@/features/video/VideoState";

const DETECTION_TIMEOUT_MS = 800;
const MIN_SAMPLES = 8;
const COMMON_FPS = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 120];

interface VideoFrameMetadata {
  presentationTime: DOMHighResTimeStamp;
  mediaTime: number;
}

type FrameCallback = (now: DOMHighResTimeStamp, metadata: VideoFrameMetadata) => void;

interface HtmlVideoExt {
  requestVideoFrameCallback?: (cb: FrameCallback) => number;
  cancelVideoFrameCallback?: (id: number) => void;
}

/** Snap detected fps to the nearest common value if within 0.5 fps. */
function snapToCommonFps(raw: number): number {
  let best = raw;
  let bestDiff = Infinity;
  for (const candidate of COMMON_FPS) {
    const diff = Math.abs(raw - candidate);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = candidate;
    }
  }
  return bestDiff < 0.5 ? best : Math.round(raw);
}

/**
 * Detect fps from a loaded video by sampling `requestVideoFrameCallback`
 * timestamps. Falls back to default 30 if detection cannot complete in time.
 * Skips if the user already set fps manually.
 *
 * 12 (Bug B — autoplay-frames): de detectie speelde voorheen de ZICHTBARE
 * `<video>` kort (muted) af om frame-callbacks te krijgen → de leerling zag een
 * paar frames "vanzelf" afspelen direct na upload. rVFC vuurt alleen bij
 * gepresenteerde frames, dus afspelen leek nodig.
 *
 * Fix: sample op een EIGEN, verborgen probe-`<video>` met dezelfde objectURL.
 * Die spelen we kort muted af; de zichtbare video blijft onaangeroerd op frame
 * 0. De probe staat wél in de DOM (1px, `opacity:0`) want `display:none` zou
 * frame-presentatie — en dus rVFC — onderdrukken. De objectURL wordt NIET
 * gerevoked bij cleanup (de zichtbare video gebruikt 'm nog); we halen alleen
 * het probe-element weg.
 */
export function useFpsDetection() {
  const { video, setFps } = useVideo();
  const videoUrl = video?.url;
  const fpsSource = video?.fpsSource;

  useEffect(() => {
    if (!videoUrl) return;
    if (fpsSource === "user") return; // respect user override

    let cancelled = false;
    let frameCbId: number | null = null;
    let timeoutId: number | null = null;
    let tornDown = false;

    const probe = document.createElement("video") as HTMLVideoElement & HtmlVideoExt;
    const supported = typeof probe.requestVideoFrameCallback === "function";

    // Probe netjes opruimen zodra de detectie klaar is (idempotent). De
    // objectURL wordt NIET gerevoked — de zichtbare video gebruikt 'm nog.
    const teardownProbe = () => {
      if (tornDown) return;
      tornDown = true;
      if (frameCbId !== null && probe.cancelVideoFrameCallback) {
        probe.cancelVideoFrameCallback(frameCbId);
      }
      try {
        probe.pause();
      } catch {
        /* ignore */
      }
      probe.removeAttribute("src");
      probe.load();
      probe.remove();
    };

    // Detectie- en fallback-paden gebruiken beide source `"detection"` — de
    // SET_FPS-reducer blokkeert ze automatisch zodra fps-lock actief is. Na
    // finaliseren is de probe overbodig → meteen opruimen (niet pas bij de
    // volgende video-load).
    const finalize = (fps: number) => {
      if (cancelled) return;
      setFps(fps, "detection");
      teardownProbe();
    };

    if (!supported) {
      // Geen manier om te samplen (bv. Firefox); houd default. Geen probe nodig.
      timeoutId = window.setTimeout(() => finalize(30), 50);
      return () => {
        cancelled = true;
        if (timeoutId !== null) window.clearTimeout(timeoutId);
      };
    }

    // Verborgen, maar in de DOM zodat frames gepresenteerd worden (rVFC).
    probe.src = videoUrl;
    probe.muted = true;
    probe.playsInline = true;
    probe.preload = "auto";
    probe.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(probe);

    const samples: number[] = [];
    let lastTime: number | null = null;

    const cb: FrameCallback = (_now, metadata) => {
      if (cancelled) return;
      if (lastTime !== null) {
        const dt = metadata.mediaTime - lastTime;
        if (dt > 0.001 && dt < 1) samples.push(dt);
      }
      lastTime = metadata.mediaTime;

      if (samples.length >= MIN_SAMPLES) {
        samples.sort((a, b) => a - b);
        const median = samples[Math.floor(samples.length / 2)];
        finalize(snapToCommonFps(1 / median)); // finalize ruimt de probe op
        return;
      }
      frameCbId = probe.requestVideoFrameCallback!(cb);
    };

    const startProbe = () => {
      if (cancelled) return;
      try {
        frameCbId = probe.requestVideoFrameCallback!(cb);
        void probe.play().catch(() => finalize(30));
      } catch {
        finalize(30);
      }
    };

    if (probe.readyState >= 2) {
      startProbe();
    } else {
      const onReady = () => {
        probe.removeEventListener("loadeddata", onReady);
        startProbe();
      };
      probe.addEventListener("loadeddata", onReady);
    }

    timeoutId = window.setTimeout(() => {
      // Te weinig samples binnen de tijd → houd default 30; ruim de probe
      // sowieso op. (Bij 0 samples finaliseert dit ook expliciet op 30.)
      if (samples.length === 0) finalize(30);
      else teardownProbe();
    }, DETECTION_TIMEOUT_MS);

    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      teardownProbe();
    };
    // Only re-run when a new video is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);
}
