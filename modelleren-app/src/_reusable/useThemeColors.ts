/**
 * @reusable
 * @category ui
 * @description Leest NH-design-token CSS-variabelen (`--accent`, `--text-muted`,
 *   etc.) op `<html>` en geeft ze terug als concrete strings — bruikbaar in
 *   canvas-renderers, Chart.js opties of andere niet-DOM-stylebare contexten.
 *   Updatet automatisch bij `data-theme`-wissel via MutationObserver.
 */
import { useCallback, useEffect, useState } from "react";

export interface ThemeColors {
  /** Achtergrond van de tool / pane. */
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  /** Standaard tekst-kleur (hoofd-tekst). */
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** Subtiele rasterkleur voor grafiek-grid (light: zwart 6%, dark: wit 6%). */
  grid: string;
  /** Hoofd-accent (NH-cyaan). */
  accent: string;
  /** Tweede accent (oranje). Bewaard voor raaklijn-kleur. */
  accentAmber: string;
  /**
   * 07f: kleur voor fit-curves. Paars (Tailwind purple-500) zodat 't visueel
   * onderscheidbaar is van scatter (teal) en raaklijn (amber). Eén kleur voor
   * alle drie zones; opacity/dash varieert per zone.
   */
  fit: string;
  /** Of de huidige theme dark is — handig voor render-keuzes. */
  isDark: boolean;
}

function read(): ThemeColors {
  if (typeof document === "undefined") {
    return {
      bgPrimary: "#f8f9fa",
      bgSecondary: "#eef6f7",
      bgCard: "#ffffff",
      textPrimary: "#1a1a2e",
      textSecondary: "#2d2d4a",
      textMuted: "#64748b",
      grid: "rgba(0,0,0,0.06)",
      accent: "#0bb5c8",
      accentAmber: "#d4923a",
      fit: "#a855f7",
      isDark: false,
    };
  }
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback = ""): string => cs.getPropertyValue(name).trim() || fallback;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    bgPrimary: v("--bg-primary", isDark ? "#0f1117" : "#f8f9fa"),
    bgSecondary: v("--bg-secondary", isDark ? "#161b26" : "#eef6f7"),
    bgCard: v("--bg-card", isDark ? "#1c2333" : "#ffffff"),
    textPrimary: v("--text-primary", isDark ? "#e2e8f0" : "#1a1a2e"),
    textSecondary: v("--text-secondary", isDark ? "#94a3b8" : "#2d2d4a"),
    textMuted: v("--text-muted", "#64748b"),
    // `--border` is half-transparant — voor grid willen we iets neutraal-grijs:
    grid: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    accent: v("--accent", "#0bb5c8"),
    accentAmber: v("--accent-amber", "#d4923a"),
    fit: v("--fit-color", "#a855f7"),
    isDark,
  };
}

export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(read);

  const refresh = useCallback(() => setColors(read()), []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Reageer op data-theme-attribuut-wisseling op <html>.
    const obs = new MutationObserver(refresh);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, [refresh]);

  return colors;
}
