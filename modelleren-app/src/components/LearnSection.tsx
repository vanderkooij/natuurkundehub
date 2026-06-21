import { LEARN_EXERCISES } from "../learnExercises";

interface Props {
  open: boolean;
  onToggle: () => void;
  unlockedCount: number;
  onLoad: (idx: number, useSol: boolean) => void;
}

export function LearnSection({ open, onToggle, unlockedCount, onLoad }: Props) {
  return (
    <div className="collapse">
      <button className="collapse-head" onClick={onToggle}>
        <span>Leer modelleren</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="learn-body">
          <p className="learn-intro">
            Doorloop de oefeningen stap voor stap. Elke oefening wordt ontgrendeld zodra je de vorige
            hebt gesimuleerd.
          </p>
          {LEARN_EXERCISES.map((ex, i) => {
            const locked = i >= unlockedCount;
            return (
              <div key={i} id={"learn-ex-" + i} className={"learn-exercise" + (locked ? " locked" : "")}>
                <div className="learn-ex-header">
                  <span className={"learn-ex-num" + (locked ? " locked-num" : "")}>{i + 1}</span>
                  <span>{ex.title}</span>
                  {locked && (
                    <span className="learn-lock-badge">🔒 Voltooi oefening {i} om dit te ontgrendelen</span>
                  )}
                </div>
                {locked ? (
                  <div className="learn-ex-body">
                    <span className="learn-locked-text">Voltooi oefening {i} om dit te ontgrendelen.</span>
                  </div>
                ) : (
                  <div className="learn-ex-body">
                    <p style={{ marginBottom: 8 }}>{ex.context}</p>
                    <div className="learn-uitleg" dangerouslySetInnerHTML={{ __html: ex.uitleg }} />
                    <div className="learn-opdracht">
                      <strong>Opdracht</strong>
                      <span dangerouslySetInnerHTML={{ __html: ex.opdracht }} />
                    </div>
                    {ex.hints.length > 0 && (
                      <div className="learn-hint-wrap">
                        {ex.hints.map((h, hi) => (
                          <details key={hi}>
                            <summary>{h.label}</summary>
                            <div
                              className="learn-hint-content"
                              dangerouslySetInnerHTML={{ __html: h.text }}
                            />
                          </details>
                        ))}
                      </div>
                    )}
                    <div className="learn-actions">
                      <button className="learn-load-btn" onClick={() => onLoad(i, false)}>
                        ▶ Laad startmodel
                      </button>
                      <button className="learn-sol-btn" onClick={() => onLoad(i, true)}>
                        ✓ Laat oplossing zien
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
