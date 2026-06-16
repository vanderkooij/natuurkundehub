import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { useVideo } from "@/features/video/VideoState";

/** Compute the largest box of `aspectW × aspectH` that fits inside `outer`. */
function fitBox(outerW: number, outerH: number, aspectW: number, aspectH: number) {
  if (aspectW <= 0 || aspectH <= 0 || outerW <= 0 || outerH <= 0) return { w: 0, h: 0 };
  const aspect = aspectW / aspectH;
  const fitW = outerH * aspect;
  if (fitW <= outerW) return { w: fitW, h: outerH };
  return { w: outerW, h: outerW / aspect };
}

/**
 * Renders the <video> element and keeps it in sync with VideoState:
 *  - state.currentFrame -> video.currentTime
 *  - video.timeupdate    -> state.currentFrame (during playback)
 *  - video.play/pause    -> state.isPlaying
 *
 * Children are rendered as an absolutely-positioned overlay layer that shares
 * the *exact* rendered video bounds — perfect for SVG overlays that need to
 * align with the native pixel grid.
 */
export function VideoPlayer({ children }: { children?: ReactNode }) {
  const { video, currentFrame, isPlaying, videoRef, setFrame, setPlaying, snapCurrentFrame } =
    useVideo();
  const localRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Expose to context
  useEffect(() => {
    videoRef.current = localRef.current;
    return () => {
      videoRef.current = null;
    };
  }, [videoRef]);

  // Recompute the letterboxed bounds whenever the stage or video aspect changes.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !video) return;
    const update = () => {
      const rect = stage.getBoundingClientRect();
      setBox(fitBox(rect.width, rect.height, video.width, video.height));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [video]);

  // When state seeks, push to the element (but don't fight active playback).
  useEffect(() => {
    const el = localRef.current;
    if (!el || !video) return;
    if (el.paused === false) return;
    const target = currentFrame / video.fps;
    if (Math.abs(el.currentTime - target) > 1 / (video.fps * 2)) {
      try {
        el.currentTime = target;
      } catch {
        /* ignore */
      }
    }
  }, [currentFrame, video]);

  if (!video) return null;

  const onTimeUpdate = () => {
    const el = localRef.current;
    if (!el) return;
    // Tijdens playback skipSnap zodat de video soepel doorloopt; bij `pause`
    // (onPause-handler) snappen we currentFrame alsnog naar het dichtstbij
    // meetpunt.
    setFrame(Math.round(el.currentTime * video.fps), { skipSnap: true });
  };

  return (
    <div
      ref={stageRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#1a1f2e]"
    >
      {/* Subtle background grid (only visible if box hasn't filled the stage). */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative" style={{ width: box.w, height: box.h }}>
        <video
          ref={localRef}
          src={video.url}
          className="absolute inset-0 h-full w-full"
          playsInline
          controls={false}
          onTimeUpdate={onTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => {
            setPlaying(false);
            // Bij pauzeren snap naar dichtstbij meetpunt (in tracking-modus
            // is snap uitgezet → no-op).
            snapCurrentFrame();
          }}
          onEnded={() => {
            setPlaying(false);
            snapCurrentFrame();
          }}
        />
        {/* Overlay slot — same bounds as the video, pixel-coord context for children. */}
        {box.w > 0 && box.h > 0 ? (
          <div className="absolute inset-0 h-full w-full">{children}</div>
        ) : null}
      </div>

      {!isPlaying ? (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/40 px-2 py-1 font-mono text-[10px] text-white/80">
          gepauzeerd
        </div>
      ) : null}
    </div>
  );
}
