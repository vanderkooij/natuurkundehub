import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

function currentTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

/**
 * Houdt de gedeelde `nh-theme` localStorage-key + `data-theme` op <html> in sync.
 * (Lokale variant; wordt in een latere fase vervangen door de gedeelde useNhTheme
 * uit @nh/shared zodra die geëxtraheerd is.)
 */
export function useNhTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("nh-theme", theme);
    } catch {
      /* localStorage kan geblokkeerd zijn */
    }
    const favicon = document.getElementById("favicon") as HTMLLinkElement | null;
    if (favicon) {
      favicon.href =
        theme === "dark" ? "../assets/logo/JK_dark.svg" : "../assets/logo/JK_light.svg";
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
