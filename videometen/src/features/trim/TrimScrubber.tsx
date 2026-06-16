import { useCallback, useEffect, useRef, useState } from "react";

import { useVideo } from "@/features/video/VideoState";
import { formatSeconds } from "@/lib/format";
import { cn } from "@/lib/utils";

type DragHandle = "position" | "trimStart" | "trimEnd";

export function TrimScrubber() {
  const { video, currentFrame, trim, setFrame, setTrim, snapCurrentFrame } = useVideo();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragHandle | null>(null);

  // Hover-tooltip-state: welk frame onder de cursor zit + de pixel-positie
  // (track-relatief) waar de tooltip moet staan. Beide null = tooltip uit.
  const [hoverInfo, setHoverInfo] = useState<{ frame: number; trackPx: number } | null>(null);

  const lastFrame = video ? Math.max(0, video.frameCount - 1) : 0;
  const fps = video?.fps ?? 30;

  const frameFromClientX = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track || !video || lastFrame <= 0) return 0;
      const rect = track.getBoundingClientRect();
      const rel = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(rel * lastFrame);
    },
    [video, lastFrame],
  );

  /** Update hover-tooltip op basis van een client-X. */
  const updateHover = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || !video || lastFrame <= 0) return;
      const rect = track.getBoundingClientRect();
      const trackPx = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const rel = trackPx / rect.width;
      const frame = Math.round(rel * lastFrame);
      setHoverInfo({ frame, trackPx });
    },
    [video, lastFrame],
  );

  const applyDrag = useCallback(
    (handle: DragHandle, clientX: number) => {
      const frame = frameFromClientX(clientX);
      if (handle === "position") {
        // skipSnap tijdens de drag — anders flikkert het naar het dichtstbij
        // meetpunt voordat de gebruiker zijn cursor heeft losgelaten.
        setFrame(frame, { skipSnap: true });
      } else if (handle === "trimStart") {
        setTrim({ start: Math.min(frame, trim.end), end: trim.end });
      } else if (handle === "trimEnd") {
        setTrim({ start: trim.start, end: Math.max(frame, trim.start) });
      }
    },
    [frameFromClientX, setFrame, setTrim, trim.start, trim.end],
  );

  // Global pointer move/up so the user can drag outside the element.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      // Tooltip ook tijdens drag bijwerken — toont het rauwe hover-frame,
      // niet de currentFrame (die loopt soms een tick achter).
      if (dragRef.current) {
        applyDrag(dragRef.current, e.clientX);
        updateHover(e.clientX);
      }
    };
    const onUp = () => {
      // Bij release van de positie-thumb (of track-klik): snap naar het
      // dichtstbij meetpunt. Trim-handles snappen niet (die hangen aan trim).
      const wasPositionDrag = dragRef.current === "position";
      dragRef.current = null;
      if (wasPositionDrag) snapCurrentFrame();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [applyDrag, snapCurrentFrame, updateHover]);

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!video) return;
    dragRef.current = "position";
    (e.target as Element).setPointerCapture?.(e.pointerId);
    applyDrag("position", e.clientX);
    updateHover(e.clientX);
  };

  const onTrackPointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!video) return;
    updateHover(e.clientX);
  };

  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!video) return;
    // Hover-positie bijwerken — ook als we niet aan 't slepen zijn (dan komt
    // de globale listener niet aan bod want dragRef.current is null).
    updateHover(e.clientX);
  };

  const onTrackPointerLeave = () => {
    // Tooltip alleen wegen als we NIET aan 't slepen zijn — anders verdwijnt
    // 'ie zodra je cursor even buiten de track komt.
    if (!dragRef.current) setHoverInfo(null);
  };

  const startHandleDrag = (handle: DragHandle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!video) return;
    dragRef.current = handle;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    updateHover(e.clientX);
  };

  if (!video || lastFrame <= 0) {
    return (
      <div
        ref={trackRef}
        className="relative h-1.5 flex-1 rounded bg-(--border-solid) opacity-40"
        aria-hidden
      />
    );
  }

  const pct = (frame: number) => (frame / lastFrame) * 100;
  const positionPct = pct(currentFrame);
  const trimStartPct = pct(trim.start);
  const trimEndPct = pct(trim.end);

  const tooltipT = hoverInfo ? hoverInfo.frame / fps : 0;

  return (
    <div className="relative flex-1 px-2 py-2.5">
      {/* Hover-tooltip — boven de track, volgt cursor mee. */}
      {hoverInfo ? (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-md border bg-(--bg-card) px-2 py-1 font-mono text-[11px] text-(--text-secondary) shadow-md"
          style={{
            // +2 px voor de track-padding (px-2 = 8px) zodat trackPx (0=track-left) goed mapt.
            left: 8 + hoverInfo.trackPx,
            bottom: "calc(100% + 4px)",
            borderColor: "var(--border-solid)",
          }}
        >
          <span className="text-(--text-muted)">frame</span> {hoverInfo.frame}
          <span className="mx-1.5 text-(--text-muted)">·</span>
          {formatSeconds(tooltipT)} s
        </div>
      ) : null}

      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={onTrackPointerDown}
        onPointerEnter={onTrackPointerEnter}
        onPointerMove={onTrackPointerMove}
        onPointerLeave={onTrackPointerLeave}
        className="relative h-2 rounded-md bg-(--border-solid) cursor-pointer"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={lastFrame}
        aria-valuenow={currentFrame}
        aria-label="Video scrubber"
      >
        {/* Trim range overlay */}
        <div
          className="absolute top-0 bottom-0 bg-(--accent)/30 rounded-md pointer-events-none"
          style={{ left: `${trimStartPct}%`, right: `${100 - trimEndPct}%` }}
        />
        {/* Out-of-trim shading on left */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-(--text-muted)/10 pointer-events-none rounded-l-md"
          style={{ width: `${trimStartPct}%` }}
        />
        {/* Out-of-trim shading on right */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-(--text-muted)/10 pointer-events-none rounded-r-md"
          style={{ width: `${100 - trimEndPct}%` }}
        />

        {/* Trim start handle */}
        <button
          type="button"
          onPointerDown={startHandleDrag("trimStart")}
          aria-label="Trim start"
          className={cn(
            "absolute -top-1 h-4 w-2 -translate-x-1/2 cursor-ew-resize rounded-sm",
            "bg-(--accent) shadow-[0_0_0_2px_var(--bg-card)] hover:scale-110 transition-transform",
          )}
          style={{ left: `${trimStartPct}%` }}
        />
        {/* Trim end handle */}
        <button
          type="button"
          onPointerDown={startHandleDrag("trimEnd")}
          aria-label="Trim end"
          className={cn(
            "absolute -top-1 h-4 w-2 -translate-x-1/2 cursor-ew-resize rounded-sm",
            "bg-(--accent) shadow-[0_0_0_2px_var(--bg-card)] hover:scale-110 transition-transform",
          )}
          style={{ left: `${trimEndPct}%` }}
        />

        {/* Position thumb (on top) */}
        <div
          onPointerDown={startHandleDrag("position")}
          aria-label="Huidige frame"
          className="absolute -top-[5px] h-3 w-3 -translate-x-1/2 cursor-grab rounded-full bg-(--accent) shadow-[0_0_0_3px_var(--accent-glow)]"
          style={{ left: `${positionPct}%` }}
        />
      </div>
    </div>
  );
}
