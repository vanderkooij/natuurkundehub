/**
 * @reusable
 * @category layout
 * @description NatuurkundeHub-headerbalk: sticky, blur, JK-logo + breadcrumb links,
 *   gecentreerde tool-naam, help-knop + theme-toggle rechts. Visueel consistent
 *   met de mockup-stijl die in alle NH-tools wordt aangehouden. Logo-paden zijn
 *   relatief vanaf het tool-pad (zoals gedeployed onder `/videometen/`); via
 *   `logoBase` aan te passen voor andere tools.
 */
import { Moon, Sun, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNhTheme } from "@/_reusable/useNhTheme";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface AppHeaderProps {
  toolName: string;
  breadcrumb: BreadcrumbItem[];
  logoBase?: string;
  onHelpClick?: () => void;
  /** Optionele extra controls die LINKS van de help-knop in de rechter-cluster
   *  worden gerenderd (bv. tool-menu, save-status). */
  extraActions?: React.ReactNode;
}

export function AppHeader({
  toolName,
  breadcrumb,
  logoBase = "../assets/logo",
  onHelpClick,
  extraActions,
}: AppHeaderProps) {
  const { theme, toggleTheme } = useNhTheme();
  const logoSrc = theme === "dark" ? `${logoBase}/JK_dark.svg` : `${logoBase}/JK_light.svg`;

  return (
    <header
      className="relative flex flex-shrink-0 items-center justify-between border-b px-6"
      style={{
        minHeight: "var(--header-h)",
        borderColor: "var(--border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        background: theme === "dark" ? "rgba(15,17,23,0.6)" : "rgba(255,255,255,0.6)",
      }}
    >
      <div className="flex items-center gap-4">
        <a href="/" className="flex items-center gap-2.5 text-(--text-primary) no-underline">
          <img src={logoSrc} alt="NatuurkundeHub logo" className="h-[26px]" />
          <span className="text-[16px] font-bold tracking-[-0.3px]">
            Natuurkunde<span className="text-(--accent)">Hub</span>
          </span>
        </a>
        <nav className="font-mono text-xs text-(--text-muted)">
          {breadcrumb.map((item, i) => (
            <span key={`${item.href}-${i}`}>
              {i > 0 && <span className="mx-1">/</span>}
              <a
                href={item.href}
                className="text-(--text-muted) no-underline transition-colors hover:text-(--accent)"
              >
                {item.label}
              </a>
            </span>
          ))}
        </nav>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold tracking-[-0.2px]">
        {toolName}
      </div>

      {/* Actie-cluster rechts: menu + help + theme. 40px clickable area; het
          menu draagt een "Menu"-tekstlabel zodat 't makkelijk vindbaar is. */}
      <div className="flex items-center gap-2">
        {extraActions}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-(--border-solid) text-(--text-muted) hover:border-(--accent) hover:text-(--accent)"
              onClick={onHelpClick}
              aria-label="Help"
            >
              <HelpCircle className="size-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Help</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-(--border-solid) text-(--text-muted) hover:border-(--accent) hover:text-(--accent)"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "Schakel naar lichte modus" : "Schakel naar donkere modus"
              }
            >
              {theme === "dark" ? (
                <Sun className="size-[18px]" />
              ) : (
                <Moon className="size-[18px]" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === "dark" ? "Licht thema" : "Donker thema"}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
