import type { Theme } from "../useNhTheme";

interface Props {
  theme: Theme;
  onToggle: () => void;
  onHelp: () => void;
}

/**
 * NH-header (inline). Wordt in een latere fase vervangen door de gedeelde
 * AppHeader uit @nh/shared (Fase 0b — die hangt aan shadcn-ui + Tailwind).
 */
export function Header({ theme, onToggle, onHelp }: Props) {
  const logo = theme === "dark" ? "../assets/logo/JK_dark.svg" : "../assets/logo/JK_light.svg";
  return (
    <header className="app-header">
      <div className="header-left">
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src={logo} alt="NatuurkundeHub logo" className="header-logo" />
          <span className="app-title">
            Natuurkunde<span>Hub</span>
          </span>
        </a>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-cur">Modelleren</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button className="theme-toggle" onClick={onHelp} title="Help &amp; Uitleg" style={{ fontWeight: 700 }}>
          ?
        </button>
        <button className="theme-toggle" onClick={onToggle} title="Wissel licht/donker">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
