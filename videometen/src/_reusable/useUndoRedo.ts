/**
 * @reusable
 * @category data
 * @description Domein-agnostische undo/redo-stack op basis van inverse-acties.
 *   De caller levert `apply(action)` en `invert(action)`; deze hook houdt
 *   verleden + toekomst bij. Het `apply` wordt zowel bij `dispatch` als bij
 *   `undo`/`redo` aangeroepen — de hook weet niets van de domein-state zelf.
 *
 *   Limit (default 200) voorkomt onbeperkt groeiend geheugen.
 *
 *   Bruikbaar voor elke edit-tool: kalibratie, schema-editor, plot-bewerker, ...
 */
import { useCallback, useReducer, useRef } from "react";

export interface UndoRedoOptions<A> {
  /** Voert de actie uit op de domein-state. */
  apply: (action: A) => void;
  /** Retourneert de inverse-actie. `apply(invert(action))` herstelt de pre-state. */
  invert: (action: A) => A;
  /**
   * Optionele hook die na elke `undo` of `redo` wordt aangeroepen met de actie
   * die zojuist is toegepast (bij undo: de geïnverteerde actie; bij redo: de
   * originele). Wordt NIET aangeroepen voor `dispatch` — daar staat de domein-
   * state al op de "natuurlijke" plek. Bedoeld voor cross-feature side-effects
   * zoals "spring naar het frame van het herstelde punt".
   */
  onUndoRedo?: (appliedAction: A) => void;
  /** Maximum aantal acties in de undo-stack. Default 200. */
  limit?: number;
}

export interface UndoRedoApi<A> {
  dispatch: (action: A) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Wis beide stacks (bv. bij nieuwe video). */
  reset: () => void;
}

export function useUndoRedo<A>({
  apply,
  invert,
  onUndoRedo,
  limit = 200,
}: UndoRedoOptions<A>): UndoRedoApi<A> {
  const past = useRef<A[]>([]);
  const future = useRef<A[]>([]);
  // bump on stack mutations so consumers re-render with fresh canUndo/canRedo
  const [, force] = useReducer((n: number) => (n + 1) & 0xffff, 0);

  // Pin to refs so the returned closures stay stable.
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const invertRef = useRef(invert);
  invertRef.current = invert;
  const onUndoRedoRef = useRef(onUndoRedo);
  onUndoRedoRef.current = onUndoRedo;

  const dispatch = useCallback(
    (action: A) => {
      applyRef.current(action);
      past.current.push(action);
      if (past.current.length > limit) past.current.shift();
      future.current = [];
      force();
    },
    [limit],
  );

  const undo = useCallback(() => {
    const action = past.current.pop();
    if (!action) return;
    const inverted = invertRef.current(action);
    applyRef.current(inverted);
    future.current.push(action);
    force();
    onUndoRedoRef.current?.(inverted);
  }, []);

  const redo = useCallback(() => {
    const action = future.current.pop();
    if (!action) return;
    applyRef.current(action);
    past.current.push(action);
    if (past.current.length > limit) past.current.shift();
    force();
    onUndoRedoRef.current?.(action);
  }, [limit]);

  const reset = useCallback(() => {
    past.current = [];
    future.current = [];
    force();
  }, []);

  return {
    dispatch,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    reset,
  };
}
