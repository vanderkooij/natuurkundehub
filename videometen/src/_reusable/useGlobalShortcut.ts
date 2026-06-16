/**
 * @reusable
 * @category ui
 * @description Generieke hook voor globale toetsenbord-shortcuts. Accepteert
 *   ofwel een exacte `key`-string, ofwel een matcher-functie voor modifier-
 *   combinaties (Ctrl+Z, Cmd+Shift+Z, ...). Negeert keystrokes wanneer focus
 *   in een tekstveld of contenteditable element zit, tenzij `allowInInputs`
 *   expliciet aanstaat.
 *
 *   Voorkomt het herhaaldelijk uitschrijven van het inputs-negeren-patroon
 *   in elke tool die een Escape-handler, Ctrl+Z, etc. wil.
 */
import { useEffect, useRef } from "react";

export type KeyMatcher = (e: KeyboardEvent) => boolean;

export interface UseGlobalShortcutOptions {
  /** Wanneer false: handler wordt niet aangebracht. Default true. */
  enabled?: boolean;
  /** Ook vuren wanneer focus in een input/textarea/select/contenteditable staat. Default false. */
  allowInInputs?: boolean;
}

function isInputTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useGlobalShortcut(
  matcher: string | KeyMatcher,
  handler: (e: KeyboardEvent) => void,
  options: UseGlobalShortcutOptions = {},
) {
  const { enabled = true, allowInInputs = false } = options;
  // Stash handler in a ref so callers don't need to memoise to avoid re-binding.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const matcherRef = useRef(matcher);
  matcherRef.current = matcher;

  useEffect(() => {
    if (!enabled) return;
    const fn = (e: KeyboardEvent) => {
      if (!allowInInputs && isInputTarget(e.target)) return;
      const m = matcherRef.current;
      const matches = typeof m === "string" ? e.key === m : m(e);
      if (!matches) return;
      handlerRef.current(e);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [enabled, allowInInputs]);
}
