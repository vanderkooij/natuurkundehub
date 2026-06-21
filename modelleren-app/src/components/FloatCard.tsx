import { useEffect, useRef, useState } from "react";

import type { LearnExercise } from "../learnExercises";

interface Props {
  exercise: LearnExercise;
  index: number; // 0-based
  total: number;
  onClose: () => void;
  onNext: () => void;
}

export function FloatCard({ exercise, index, total, onClose, onNext }: Props) {
  const [minimized, setMinimized] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sx: number; sy: number; sl: number; st: number } | null>(null);

  // Reset hints/minimize bij wisselen van oefening.
  useEffect(() => {
    setHintsOpen(false);
    setMinimized(false);
  }, [index]);

  function onTopbarDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button")) return; // niet slepen op knoppen
    const r = cardRef.current!.getBoundingClientRect();
    drag.current = { sx: e.clientX, sy: e.clientY, sl: r.left, st: r.top };
    setPos({ left: r.left, top: r.top });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    e.preventDefault();
  }
  function onMove(e: MouseEvent) {
    const d = drag.current;
    if (!d) return;
    const w = cardRef.current?.offsetWidth ?? 0;
    const h = cardRef.current?.offsetHeight ?? 0;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, d.sl + (e.clientX - d.sx)));
    const top = Math.max(8, Math.min(window.innerHeight - h - 8, d.st + (e.clientY - d.sy)));
    setPos({ left, top });
  }
  function onUp() {
    drag.current = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }

  const style = pos ? { left: pos.left, top: pos.top, right: "auto", bottom: "auto" } : undefined;

  return (
    <div ref={cardRef} className={"float-card" + (minimized ? " minimized" : "")} style={style}>
      <div className="float-topbar" onMouseDown={onTopbarDown}>
        <span className="float-ex-num">{index + 1}</span>
        <span className="float-title">{exercise.title}</span>
        <button
          className="float-icon-btn"
          title={minimized ? "Uitklappen" : "Minimaliseer"}
          onClick={() => setMinimized((m) => !m)}
        >
          {minimized ? "+" : "−"}
        </button>
        <button className="float-icon-btn" title="Sluiten" onClick={onClose}>
          ×
        </button>
      </div>

      {!minimized && (
        <>
          <div className="float-body">
            <div className="float-opdracht" dangerouslySetInnerHTML={{ __html: exercise.opdracht }} />
          </div>
          <div className="float-hints-wrap">
            <button
              className={"float-hints-toggle" + (hintsOpen ? " open" : "")}
              onClick={() => setHintsOpen((o) => !o)}
            >
              Hints
            </button>
            {hintsOpen && (
              <div className="float-hints-list">
                {exercise.hints.map((h, i) => (
                  <details key={i}>
                    <summary>{h.label}</summary>
                    <div className="learn-hint-content" dangerouslySetInnerHTML={{ __html: h.text }} />
                  </details>
                ))}
              </div>
            )}
          </div>
          {index + 1 < total && (
            <div className="float-actions">
              <button className="learn-load-btn" onClick={onNext}>
                Volgende oefening →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
