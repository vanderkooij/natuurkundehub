import { Group, Panel, Separator } from "react-resizable-panels";

export type GraphLayout = "single" | "row" | "col" | "grid";

export function paneCount(layout: GraphLayout): number {
  return layout === "single" ? 1 : layout === "grid" ? 4 : 2;
}

const groupStyle = { height: "100%", width: "100%" } as const;
// Panels: zet de CROSS-as op 100% (zoals videometen h-full/w-full); de hoofd-as
// wordt door de library bepaald via defaultSize. Anders rekent de library
// Infinity/NaN voor geneste groepen.
const hPane = { height: "100%", minWidth: 0, overflow: "hidden" } as const; // in horizontale groep
const vPane = { width: "100%", minHeight: 0, overflow: "hidden" } as const; // in verticale groep

interface Props {
  layout: GraphLayout;
  panes: React.ReactNode[];
}

/**
 * Schikt de grafiek-panes volgens de gekozen layout met resizable splitsingen
 * (react-resizable-panels). De buitenste hoogte is via CSS verticaal sleepbaar.
 */
export function GraphArea({ layout, panes }: Props) {
  if (layout === "single") {
    return <div className="graph-area">{panes[0]}</div>;
  }

  if (layout === "row" || layout === "col") {
    const horizontal = layout === "row";
    const pane = horizontal ? hPane : vPane;
    return (
      <div className="graph-area">
        <Group orientation={horizontal ? "horizontal" : "vertical"} id="g2" style={groupStyle}>
          <Panel defaultSize={50} minSize={20} style={pane}>
            {panes[0]}
          </Panel>
          <Separator className={horizontal ? "rs-handle-h" : "rs-handle-v"} />
          <Panel defaultSize={50} minSize={20} style={pane}>
            {panes[1]}
          </Panel>
        </Group>
      </div>
    );
  }

  // grid (2×2): buitenste verticale groep, elke rij een horizontale groep.
  return (
    <div className="graph-area">
      <Group orientation="vertical" id="grid-v" style={groupStyle}>
        <Panel defaultSize={50} minSize={15} style={vPane}>
          <Group orientation="horizontal" id="grid-h1" style={groupStyle}>
            <Panel defaultSize={50} minSize={20} style={hPane}>
              {panes[0]}
            </Panel>
            <Separator className="rs-handle-h" />
            <Panel defaultSize={50} minSize={20} style={hPane}>
              {panes[1]}
            </Panel>
          </Group>
        </Panel>
        <Separator className="rs-handle-v" />
        <Panel defaultSize={50} minSize={15} style={vPane}>
          <Group orientation="horizontal" id="grid-h2" style={groupStyle}>
            <Panel defaultSize={50} minSize={20} style={hPane}>
              {panes[2]}
            </Panel>
            <Separator className="rs-handle-h" />
            <Panel defaultSize={50} minSize={20} style={hPane}>
              {panes[3]}
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}
