import { useState } from 'react';
import type { Lang } from './i18n';
import { t } from './i18n';

// ── Content types ────────────────────────────────────────────────────────────

interface Item { term?: string; desc: string }
interface Section { title: string; items: Item[] }
interface Shortcut { keys: string; desc: string }

// ── Bilingual content ────────────────────────────────────────────────────────

const sections: Record<Lang, Section[]> = {
  en: [
    {
      title: 'Basic Interaction',
      items: [
        { term: 'Select', desc: 'Click any component, wire, or label to select it. Click empty canvas to deselect.' },
        { term: 'Multi-select', desc: 'Drag on empty canvas to draw a selection rectangle (rubber-band). Everything inside is selected.' },
        { term: 'Move', desc: 'Drag a selected component. Wires attached to its terminals re-route automatically.' },
        { term: 'Rotate', desc: 'Press R or right-click a selected component to rotate 90° clockwise.' },
        { term: 'Delete', desc: 'Press Delete or Backspace to remove the selection. Or use the ✕ Delete tool and click elements.' },
        { term: 'Pan', desc: 'Hold Alt and drag, or drag with the middle mouse button, to pan the canvas.' },
        { term: 'Zoom', desc: 'Scroll the mouse wheel to zoom in/out, centered on the cursor. Use the +/− buttons bottom-right, or click the percentage to reset to 100%.' },
        { term: 'Text label', desc: 'Select the Text tool (A) or double-click empty canvas to add a text label. Double-click an existing label to edit it.' },
      ],
    },
    {
      title: 'Drawing Wires',
      items: [
        { term: 'Wire tool', desc: 'Press W or click the wire icon in the toolbar to activate the wire tool.' },
        { term: 'Draw', desc: 'Click a start point, move the cursor to the endpoint, then click to finish.' },
        { term: 'L-shape', desc: 'Wires route as L-shapes (one bend). Press Spacebar while drawing to flip between horizontal-first and vertical-first.' },
        { term: 'Snap', desc: 'Wire endpoints snap automatically to component terminals, wire nodes, and wire segment midpoints. A snap indicator circle appears.' },
        { term: 'T-junction', desc: 'End a wire on the interior of another wire to create a T-junction. A filled dot marks the connection.' },
        { term: 'Reshape', desc: 'Drag a wire endpoint to move it. Drag a wire segment sideways to push it perpendicular. Double-click a selected wire to insert a new node.' },
        { term: 'Crossings', desc: 'When two wires cross, a hop arc is shown (not connected). Click the crossing point to toggle it to a filled dot (connected). Click again to revert.' },
      ],
    },
    {
      title: 'Components',
      items: [
        { term: 'DC source', desc: '2 terminals — positive (+) on the right, negative (−) on the left.' },
        { term: 'AC source', desc: '2 terminals — sine wave inside a circle.' },
        { term: 'Resistor', desc: '2 terminals — rectangle (European symbol).' },
        { term: 'LED', desc: '2 terminals — triangle + bar + light arrows. Anode left, cathode right.' },
        { term: 'Switch', desc: '2 terminals. Double-click to toggle open / closed.' },
        { term: 'Push button', desc: '2 terminals — momentary. Double-click to press. Releases when you release the click.' },
        { term: 'Lamp', desc: '2 terminals — circle with a cross inside.' },
        { term: 'Ammeter (A)', desc: '2 terminals — connect in series in the circuit.' },
        { term: 'Voltmeter (V)', desc: '2 terminals — connect in parallel across the element.' },
        { term: 'Capacitor', desc: '2 terminals — two parallel plates.' },
        { term: 'Inductor', desc: '2 terminals — bump/coil symbol.' },
        { term: 'Diode', desc: '2 terminals — current flows from anode (left) to cathode (right).' },
        { term: 'Fuse', desc: '2 terminals — rectangle with a line through it.' },
        { term: 'Ground', desc: '1 terminal — reference potential. Connect to the circuit\'s ground node.' },
        { term: 'Potentiometer', desc: '3 terminals — left and right are the resistor ends; the top terminal is the wiper (adjustable tap).' },
        { term: 'Transformer', desc: '4 terminals — 2 left (primary coil), 2 right (secondary coil).' },
        { term: 'NPN Transistor', desc: '3 terminals — base (left), collector (top-right), emitter (bottom-right, with arrow).' },
        { term: 'NTC thermistor', desc: '2 terminals — resistance decreases as temperature rises.' },
        { term: 'PTC thermistor', desc: '2 terminals — resistance increases as temperature rises.' },
        { term: 'LDR', desc: '2 terminals — resistance decreases as light intensity increases.' },
        { term: 'Buzzer', desc: '2 terminals — piezo buzzer.' },
        { term: 'Relay', desc: '4 terminals — 2 left (coil), 2 right (switch contacts). Coil controls the switch.' },
      ],
    },
    {
      title: 'Copy & Paste',
      items: [
        { term: 'Copy', desc: 'Ctrl+C copies the selected components. Wires that connect two selected components are included.' },
        { term: 'Cut', desc: 'Ctrl+X copies and then removes the selection.' },
        { term: 'Paste', desc: 'Ctrl+V pastes at the current cursor position. Paste multiple times from the same clipboard.' },
        { term: 'Duplicate', desc: 'Ctrl+D duplicates the selection immediately, offset by a few grid steps.' },
        { term: 'Context menu', desc: 'Right-click a component to access Copy, Cut, Paste, Duplicate, Rotate and Delete.' },
      ],
    },
  ],
  nl: [
    {
      title: 'Basisinteractie',
      items: [
        { term: 'Selecteren', desc: 'Klik op een component, draad of label om het te selecteren. Klik op leeg canvas om te deselecteren.' },
        { term: 'Meerdere selecteren', desc: 'Sleep op leeg canvas om een selectierechthoek te tekenen (rubber-band). Alles binnen de rechthoek wordt geselecteerd.' },
        { term: 'Verplaatsen', desc: 'Sleep een geselecteerd component. Verbonden draden worden automatisch opnieuw geschaald.' },
        { term: 'Roteren', desc: 'Druk R of rechtermuisklik op een geselecteerd component om 90° met de klok mee te roteren.' },
        { term: 'Verwijderen', desc: 'Druk Delete of Backspace om de selectie te verwijderen. Of gebruik de ✕ verwijdertool en klik op elementen.' },
        { term: 'Verschuiven', desc: 'Houd Alt ingedrukt en sleep, of sleep met de middelste muisknop, om het canvas te verschuiven.' },
        { term: 'Zoomen', desc: 'Draai het scrollwiel om in/uit te zoomen, gecentreerd op de cursor. Gebruik de +/− knoppen rechtsonder, of klik op het percentage om terug te gaan naar 100%.' },
        { term: 'Tekstvak', desc: 'Selecteer het tekst-tool (A) of dubbelklik op leeg canvas om een tekstvak toe te voegen. Dubbelklik een bestaand label om het te bewerken.' },
      ],
    },
    {
      title: 'Draden tekenen',
      items: [
        { term: 'Draadtool', desc: 'Druk W of klik op het draadpictogram in de toolbar om de draadtool te activeren.' },
        { term: 'Tekenen', desc: 'Klik het startpunt, beweeg de cursor naar het eindpunt en klik om af te ronden.' },
        { term: 'L-vorm', desc: 'Draden lopen als L-vormen (één bocht). Druk Spatiebalk tijdens het tekenen om te wisselen tussen horizontaal-eerst en verticaal-eerst.' },
        { term: 'Snappen', desc: 'Draaduiteinden snappen automatisch op componentterminalen, draadknopen en segmentmidpunten. Een snap-indicator verschijnt als cirkel.' },
        { term: 'T-verbinding', desc: 'Eindig een draad op het midden van een bestaande draad om een T-verbinding te maken. Een gevulde stip geeft de verbinding aan.' },
        { term: 'Aanpassen', desc: 'Sleep een draaduiteinde om het te verplaatsen. Sleep een draadsegment opzij om het loodrecht te schuiven. Dubbelklik op een geselecteerde draad om een knoop toe te voegen.' },
        { term: 'Kruisingen', desc: 'Als twee draden elkaar kruisen, wordt een bochtboog weergegeven (niet verbonden). Klik op het kruispunt om een gevulde stip te tonen (verbonden). Klik nogmaals om terug te keren.' },
      ],
    },
    {
      title: 'Componenten',
      items: [
        { term: 'DC-bron', desc: '2 aansluitpunten — plus (+) rechts, min (−) links.' },
        { term: 'AC-bron', desc: '2 aansluitpunten — sinusgolf in een cirkel.' },
        { term: 'Weerstand', desc: '2 aansluitpunten — rechthoek (Europees symbool).' },
        { term: 'LED', desc: '2 aansluitpunten — driehoek + balk + lichtpijltjes. Anode links, kathode rechts.' },
        { term: 'Schakelaar', desc: '2 aansluitpunten. Dubbelklik om open/dicht te wisselen.' },
        { term: 'Drukknop', desc: '2 aansluitpunten — monoflop. Dubbelklik om in te drukken.' },
        { term: 'Lamp', desc: '2 aansluitpunten — cirkel met kruis.' },
        { term: 'Amperemeter (A)', desc: '2 aansluitpunten — in serie schakelen.' },
        { term: 'Voltmeter (V)', desc: '2 aansluitpunten — parallel schakelen over het element.' },
        { term: 'Condensator', desc: '2 aansluitpunten — twee evenwijdige platen.' },
        { term: 'Spoel', desc: '2 aansluitpunten — bochten/windingen.' },
        { term: 'Diode', desc: '2 aansluitpunten — stroom loopt van anode (links) naar kathode (rechts).' },
        { term: 'Zekering', desc: '2 aansluitpunten — rechthoek met lijn.' },
        { term: 'Massa', desc: '1 aansluitpunt — referentiepotentiaal. Verbind met het massapunt van het circuit.' },
        { term: 'Potmeter', desc: '3 aansluitpunten — links en rechts zijn de weerstandsuiteinden; het bovenste aansluitpunt is de wisselaar.' },
        { term: 'Transformator', desc: '4 aansluitpunten — 2 links (primaire spoel), 2 rechts (secundaire spoel).' },
        { term: 'NPN Transistor', desc: '3 aansluitpunten — basis (links), collector (rechtsboven), emitter (rechtsonder, met pijl).' },
        { term: 'NTC thermistor', desc: '2 aansluitpunten — weerstand daalt naarmate de temperatuur stijgt.' },
        { term: 'PTC thermistor', desc: '2 aansluitpunten — weerstand stijgt naarmate de temperatuur stijgt.' },
        { term: 'LDR', desc: '2 aansluitpunten — weerstand daalt bij toenemend licht.' },
        { term: 'Zoemer', desc: '2 aansluitpunten — piëzo-zoemer.' },
        { term: 'Relais', desc: '4 aansluitpunten — 2 links (spoel), 2 rechts (schakelcontacten). De spoel stuurt de schakelaar.' },
      ],
    },
    {
      title: 'Kopiëren & Plakken',
      items: [
        { term: 'Kopiëren', desc: 'Ctrl+C kopieert de geselecteerde componenten. Draden die twee geselecteerde componenten verbinden worden meegekopieerd.' },
        { term: 'Knippen', desc: 'Ctrl+X kopieert en verwijdert vervolgens de selectie.' },
        { term: 'Plakken', desc: 'Ctrl+V plakt op de huidige cursorpositie. Meerdere keren plakken van hetzelfde klembord is mogelijk.' },
        { term: 'Dupliceren', desc: 'Ctrl+D dupliceert de selectie direct, met een kleine verschuiving.' },
        { term: 'Contextmenu', desc: 'Rechtermuisklik op een component voor Kopiëren, Knippen, Plakken, Dupliceren, Roteren en Verwijderen.' },
      ],
    },
  ],
};

const shortcuts: Record<Lang, Shortcut[]> = {
  en: [
    { keys: 'W', desc: 'Wire tool on/off' },
    { keys: 'R', desc: 'Rotate selected component' },
    { keys: 'Delete / Backspace', desc: 'Delete selection' },
    { keys: 'Ctrl+Z', desc: 'Undo' },
    { keys: 'Ctrl+Shift+Z', desc: 'Redo' },
    { keys: 'Ctrl+C', desc: 'Copy selection' },
    { keys: 'Ctrl+X', desc: 'Cut selection' },
    { keys: 'Ctrl+V', desc: 'Paste at cursor' },
    { keys: 'Ctrl+D', desc: 'Duplicate selection' },
    { keys: 'Escape', desc: 'Cancel / back to Select tool' },
    { keys: 'Space', desc: 'Flip wire L-shape (while drawing)' },
    { keys: 'Alt + drag', desc: 'Pan canvas' },
    { keys: 'Scroll wheel', desc: 'Zoom in/out' },
    { keys: 'Double-click (canvas)', desc: 'New text label' },
    { keys: 'Double-click (switch)', desc: 'Toggle switch open/closed' },
    { keys: 'Double-click (wire)', desc: 'Add wire node' },
    { keys: 'F1 / ?', desc: 'Open/close help panel' },
  ],
  nl: [
    { keys: 'W', desc: 'Draadtool aan/uit' },
    { keys: 'R', desc: 'Geselecteerd component roteren' },
    { keys: 'Delete / Backspace', desc: 'Selectie verwijderen' },
    { keys: 'Ctrl+Z', desc: 'Ongedaan maken' },
    { keys: 'Ctrl+Shift+Z', desc: 'Opnieuw uitvoeren' },
    { keys: 'Ctrl+C', desc: 'Selectie kopiëren' },
    { keys: 'Ctrl+X', desc: 'Selectie knippen' },
    { keys: 'Ctrl+V', desc: 'Plakken op cursorpositie' },
    { keys: 'Ctrl+D', desc: 'Selectie dupliceren' },
    { keys: 'Escape', desc: 'Annuleren / terug naar selectietool' },
    { keys: 'Spatiebalk', desc: 'L-vorm wisselen (tijdens tekenen)' },
    { keys: 'Alt + sleep', desc: 'Canvas verschuiven' },
    { keys: 'Scrollwiel', desc: 'In-/uitzoomen' },
    { keys: 'Dubbelklik (canvas)', desc: 'Nieuw tekstvak' },
    { keys: 'Dubbelklik (schakelaar)', desc: 'Schakelaar open/dicht wisselen' },
    { keys: 'Dubbelklik (draad)', desc: 'Draadknoop toevoegen' },
    { keys: 'F1 / ?', desc: 'Helpvenster openen/sluiten' },
  ],
};

// ── Accordion section ────────────────────────────────────────────────────────

function AccordionSection({ section, isShortcuts, lang }: {
  section: Section;
  isShortcuts?: boolean;
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid #eee' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: '#1a1a1a',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          textAlign: 'left',
        }}
      >
        {section.title}
        <span style={{
          fontSize: 10, color: '#888', transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.18s',
          display: 'inline-block',
        }}>▼</span>
      </button>

      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '9999px' : 0,
        transition: 'max-height 0.25s ease',
      }}>
        <div style={{ padding: '0 16px 14px' }}>
          {isShortcuts ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {shortcuts[lang].map(sc => (
                  <tr key={sc.keys} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '5px 8px 5px 0', verticalAlign: 'top', whiteSpace: 'nowrap', width: 1 }}>
                      <code style={{
                        background: '#f4f4f4', border: '1px solid #ddd', borderRadius: 3,
                        padding: '1px 5px', fontSize: 11,
                        fontFamily: '"SF Mono","Fira Code",monospace',
                        color: '#333', whiteSpace: 'nowrap',
                      }}>{sc.keys}</code>
                    </td>
                    <td style={{ padding: '5px 0 5px 8px', color: '#444', lineHeight: 1.45 }}>{sc.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {section.items.map((item, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>
                  {item.term ? (
                    <>
                      <span style={{ fontWeight: 600, color: '#222' }}>{item.term}</span>
                      <span style={{ color: '#444' }}> — {item.desc}</span>
                    </>
                  ) : (
                    <span style={{ color: '#444' }}>{item.desc}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  lang: Lang;
}

export function HelpPanel({ open, onClose, lang }: HelpPanelProps) {
  const shortcutSectionTitle = lang === 'nl' ? 'Sneltoetsen' : 'Keyboard Shortcuts';
  const dummyShortcutsSection: Section = { title: shortcutSectionTitle, items: [] };

  return (
    <div
      style={{
        position: 'fixed',
        top: 52,
        right: 0,
        bottom: 0,
        width: 380,
        background: '#fafafa',
        borderLeft: '1px solid #e0e0e0',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 48, borderBottom: '1px solid #e8e8e8',
        background: '#fff', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
          {t(lang, 'help.title')}
        </span>
        <button
          onClick={onClose}
          title={t(lang, 'help.close')}
          style={{
            width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
            borderRadius: 4, fontSize: 16, color: '#666', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0f0f0'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
        >×</button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sections[lang].map(section => (
          <AccordionSection key={section.title} section={section} lang={lang} />
        ))}
        <AccordionSection section={dummyShortcutsSection} isShortcuts lang={lang} />
      </div>
    </div>
  );
}
