/**
 * @reusable
 * @category ui
 * @description NatuurkundeHub theme-hook. Leest en muteert de gedeelde `nh-theme`
 *   localStorage-key (consistent met alle andere NH-tools) en houdt het
 *   `data-theme` attribuut op `<html>` in sync. De initiele waarde wordt al door
 *   het inline-script in `index.html` toegepast om FOUC te voorkomen.
 */
import { useCallback, useEffect, useState } from "react";

export type NhTheme = "light" | "dark";

const STORAGE_KEY = "nh-theme";

function readInitialTheme(): NhTheme {
  if (typeof document === "undefined") return "light";
  const fromAttr = document.documentElement.getAttribute("data-theme");
  if (fromAttr === "dark" || fromAttr === "light") return fromAttr;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function applyToDom(theme: NhTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  const favicon = document.getElementById("favicon") as HTMLLinkElement | null;
  if (favicon) {
    favicon.href = theme === "dark" ? "../assets/logo/JK_dark.svg" : "../assets/logo/JK_light.svg";
  }
}

export function useNhTheme() {
  const [theme, setThemeState] = useState<NhTheme>(readInitialTheme);

  useEffect(() => {
    applyToDom(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const setTheme = useCallback((next: NhTheme) => setThemeState(next), []);

  return { theme, setTheme, toggleTheme };
}
