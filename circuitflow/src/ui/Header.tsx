import { HelpCircle, Moon, Sun } from "lucide-react";
import { useState } from "react";

import { useNhTheme } from "@/useNhTheme";
import { HelpModal } from "./HelpModal";

export function Header() {
  const { theme, toggle } = useNhTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const logoSrc = theme === "dark" ? "../assets/logo/JK_dark.svg" : "../assets/logo/JK_light.svg";
  const iconBtn =
    "grid h-9 w-9 place-items-center rounded-lg border border-(--border-solid) text-(--text-secondary) hover:bg-(--bg-card-hover)";
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-(--border-solid) bg-card px-4">
      {/* NatuurkundeHub-logo + woordmerk, consistent met de andere tools. */}
      <a href="/" className="flex items-center gap-2.5 no-underline">
        <img src={logoSrc} alt="NatuurkundeHub logo" className="h-[26px]" />
        <span className="hidden text-base font-bold tracking-[-0.3px] text-(--text-primary) sm:inline">
          Natuurkunde<span className="text-(--accent)">Hub</span>
        </span>
      </a>
      <span className="text-(--text-muted)">/</span>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-lg font-semibold text-(--text-primary)">CircuitFlow</span>
        <span className="hidden text-sm text-(--text-muted) sm:inline">
          gelijkstroom-schakelsimulator
        </span>
      </div>
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        aria-label="Uitleg en feedback"
        title="Uitleg &amp; feedback"
        className={`${iconBtn} ml-auto`}
      >
        <HelpCircle size={18} />
      </button>
      <button
        type="button"
        onClick={toggle}
        aria-label="Wissel licht/donker"
        className={iconBtn}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </header>
  );
}
