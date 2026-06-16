/**
 * @reusable
 * @category layout
 * @description Drie-paneel-grid (één links over volle hoogte, twee gestapeld rechts)
 *   met resizable handles via `react-resizable-panels`. Past in elke data-analyse-
 *   of editor-tool waar een primaire viewport links staat en twee secundaire panes
 *   rechts (tabel + grafieken, layers + inspector, etc.). Default-verhoudingen
 *   zijn instelbaar via props.
 */
import type { ReactNode } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

export interface ThreePaneLayoutProps {
  left: ReactNode;
  topRight: ReactNode;
  bottomRight: ReactNode;
  /** Default horizontale verdeling links/rechts (in %). Default 55/45. */
  defaultLeftSize?: number;
  /** Default verticale verdeling boven/onder in rechterkolom (in %). Default 50/50. */
  defaultTopRightSize?: number;
  className?: string;
}

/**
 * Sleepbare verdeler met gripper-dots als visueel "ik ben sleepbaar"-signaal.
 *
 * `orientation`:
 *  - `"vertical"`   — dunne verticale balk tussen kolommen (col-resize),
 *    dots verticaal gestapeld.
 *  - `"horizontal"` — dunne horizontale balk tussen rijen (row-resize),
 *    dots horizontaal naast elkaar.
 *
 * Moet een directe DOM-child van een `Group` blijven; deze component rendert
 * `Separator` direct (geen extra wrapper-div), dus die invariant houdt stand.
 * Bij hover: balk-tint + dots lichten op met accent.
 *
 * `hidden`/`disabled` (09b): in "Verberg"-modus wordt de verdeler tussen video/
 * tabel en grafieken uit beeld gehaald (display:none → ook uit de flex-flow,
 * zodat de grafieken écht 100% pakken) en niet-sleepbaar gemaakt.
 */
export function PaneDivider({
  orientation,
  hidden,
  disabled,
}: {
  orientation: "vertical" | "horizontal";
  hidden?: boolean;
  disabled?: boolean;
}) {
  const isVertical = orientation === "vertical";
  return (
    <Separator
      disabled={disabled}
      className={cn(
        "group/divider relative flex items-center justify-center rounded bg-transparent transition-colors",
        isVertical
          ? "w-1.5 cursor-col-resize hover:bg-(--accent)/30"
          : "h-1.5 cursor-row-resize hover:bg-(--accent)/30",
        hidden && "hidden",
      )}
    >
      <span
        className={cn("flex gap-[2px]", isVertical ? "flex-col" : "flex-row")}
        aria-hidden
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="size-[3px] rounded-full bg-(--text-muted) opacity-50 transition-all group-hover/divider:bg-(--accent) group-hover/divider:opacity-100"
          />
        ))}
      </span>
    </Separator>
  );
}

export function ThreePaneLayout({
  left,
  topRight,
  bottomRight,
  defaultLeftSize = 55,
  defaultTopRightSize = 50,
  className,
}: ThreePaneLayoutProps) {
  return (
    <div className={cn("flex-1 min-h-0 overflow-hidden bg-(--bg-primary)", className)}>
      <Group orientation="horizontal" id="vm-three-pane-h" className="h-full w-full p-2 gap-2">
        <Panel defaultSize={defaultLeftSize} minSize={30} className="h-full">
          {left}
        </Panel>
        <PaneDivider orientation="vertical" />
        <Panel defaultSize={100 - defaultLeftSize} minSize={20} className="h-full">
          <Group orientation="vertical" id="vm-three-pane-v" className="h-full w-full gap-2">
            <Panel defaultSize={defaultTopRightSize} minSize={15} className="w-full">
              {topRight}
            </Panel>
            <PaneDivider orientation="horizontal" />
            <Panel defaultSize={100 - defaultTopRightSize} minSize={15} className="w-full">
              {bottomRight}
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}

/** Shared pane shell: card-achtergrond, border, afgeronde hoeken, overflow-hidden. */
export function Pane({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[14px] border bg-card shadow-[0_1px_3px_rgba(11,181,200,0.04)]",
        className,
      )}
      style={{ borderColor: "var(--border)" }}
    >
      {children}
    </section>
  );
}

export function PaneHeader({
  title,
  actions,
  className,
}: {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-between border-b bg-(--bg-secondary) px-4 py-2.5",
        className,
      )}
      style={{ borderColor: "var(--border)" }}
    >
      <div className="text-[13px] font-semibold text-(--text-secondary)">{title}</div>
      {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}

export function PaneBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex-1 min-h-0 overflow-auto", className)}>{children}</div>;
}
