/**
 * @reusable
 * @category ui
 * @description Minimalistische toast-mounter. Eén actieve toast tegelijk,
 *   auto-dismiss na een instelbare duur (default 3 s), of klik om te sluiten.
 *   Aanroepen via de geëxporteerde `toast(msg, durationMs?)`-functie van buiten
 *   React (handig vanuit reducers / event-handlers). `msg` mag een string of
 *   een `ReactNode` zijn (voor een geaccentueerd woord o.i.d.).
 *
 *   Bewust geen externe dependency — een tool die de hub-stijl-conventies
 *   volgt heeft zelden meer dan één type tijdelijk pop-uppje nodig. Voor
 *   complexer (multiple toasts, varianten, queues) → switch naar `sonner`.
 */
import { useEffect, useState, type ReactNode } from "react";

interface ToastState {
  node: ReactNode;
  duration: number;
}

let listener: ((t: ToastState) => void) | null = null;

/**
 * Toon een toast (vervangt een eventueel actieve toast). `durationMs` bepaalt
 * de auto-dismiss-tijd; klik sluit altijd direct.
 */
export function toast(msg: ReactNode, durationMs = 3000) {
  listener?.({ node: msg, duration: durationMs });
}

export function Toaster() {
  const [state, setState] = useState<ToastState | null>(null);

  useEffect(() => {
    listener = setState;
    return () => {
      if (listener === setState) listener = null;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    const id = window.setTimeout(() => setState(null), state.duration);
    return () => window.clearTimeout(id);
  }, [state]);

  if (!state) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 cursor-pointer rounded-lg border bg-(--bg-card) px-4 py-2.5 font-display text-[13px] text-(--text-primary) shadow-lg"
      style={{ borderColor: "var(--border-solid)" }}
      onClick={() => setState(null)}
    >
      {state.node}
    </div>
  );
}
