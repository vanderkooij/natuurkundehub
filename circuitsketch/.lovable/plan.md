
# Circuit Sketching Tool

A minimalistic black-and-white circuit drawing web app for educational use — like drawing on paper, but with snapping and structure.

## Canvas & Grid
- Full-screen white canvas using HTML5 Canvas (or SVG)
- Invisible snap grid (e.g. 20px) for alignment of all elements
- Pan support for larger circuits

## Toolbar (minimal, top or left)
- **Select** — move/rotate/delete components
- **Voltage Source** — click to place (short/long parallel lines symbol)
- **Resistor** — click to place (rectangle symbol)
- **Wire** — click-to-draw orthogonal wire segments (H/V only)
- **Text** — click to place editable label with subscript support (R₁, U₂)
- **Delete** — click any element to remove
- **Undo / Redo** buttons
- **Reset** button (with confirmation)

## Components
- Voltage source: standard two-line symbol, black only
- Resistor: simple rectangle outline, black only
- Both draggable, rotatable (90° increments via right-click or button), deletable
- Snap to invisible grid

## Wires
- Click to start, click to place orthogonal segments (auto-routes H then V or V then H)
- Editable after placement: drag nodes/segments to reshape
- Can branch, extend, split — wires are node+segment graphs, not point-to-point
- Snap to same grid

## Text Labels
- Free-floating, editable on double-click
- Support Unicode subscripts (₀₁₂₃…) for notation like R₁, U₂
- Not tied to components

## Design
- Pure black and white, thin clean lines
- No colors, no animations, no visual clutter
- Minimal toolbar with simple icons

## State Management
- Undo/redo stack tracking all canvas changes
- Reset clears everything (with confirm dialog)

## Technical Approach
- Single-page app on the index route
- Use HTML5 Canvas with a custom rendering loop for performance
- Store circuit state (components, wires, labels) in React state
- All interaction logic (drag, snap, rotate, wire drawing) handled via mouse events on canvas
