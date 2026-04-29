# CircuitSketch — Ontwikkelplan

Vink items af met [x] zodra ze klaar zijn.

---

## Componenten

- [x] NPN transistor toevoegen
- [x] Potmeter: 3 aansluitpunten (links, rechts, wiper)
- [x] Transformator: 4 aansluitpunten (2 links, 2 rechts)
- [x] NTC thermistor (rechthoek + diagonale streep + -t°)
- [x] PTC thermistor (rechthoek + diagonale streep + +t°)
- [x] LDR / fotoweerstand (rechthoek + lichtpijltjes)
- [x] Drukknop / push button (momentary, anders dan bestaande schakelaar)
- [x] Buzzer / piëzo
- [x] Relais

---

## Canvas & interactie

- [x] Click-to-place: component selecteren in toolbar → op canvas klikken om te plaatsen
- [x] Rubber-band selectie: in select-modus slepen op leeg canvas → stippelrechthoek → alles wat erin valt (componenten + draden) wordt geselecteerd
- [x] Toolbar iets groter / leesbaarder
- [x] Slimmere wires bij verplaatsen component (orthogonaal re-routen via syncWires + auto-connect)
- [x] Auto-connect: component plaatsen op bestaand wire-eindpunt/terminal snapt en verbindt automatisch
- [x] Wire splitsen bij plaatsen op bestaande wire (alleen 2-terminal componenten):
      - Component neerzetten op wire → wire splitst, component ingevoegd
      - Component weghalen → twee draadfragmenten worden samengevoegd
      - Niet van toepassing op componenten met 3+ terminals (potmeter, transformator)

---

## Help & documentatie

- [ ] Vraagteken-knop in toolbar (togglebaar) opent een paneel met tips per categorie:
      - Basisinteractie (selecteren, slepen, roteren, verwijderen)
      - Draden tekenen (klikken, L-vorm, spatiebalk, snap)
      - Componenten (overzicht symbolen + korte uitleg per component)
      - Sneltoetsen (W, R, Ctrl+Z, Delete, Esc, ...)
- [ ] Verbeterde tooltips op toolbar-knoppen (huidig: alleen naam, uitbreiden met korte gebruikstip)

---

## Visueel / UX

- [ ] Kruisende draden: arc (niet verbonden) vs. stip (verbonden), klikken om te togglen
- [ ] Undo/redo verbeterd: werkt voor alle acties inclusief load, copy/paste, wire-toggle

---

## Bestand & export

- [ ] Opslaan als .json (download), laden uit .json (file picker)
      - Bevestigingsdialoog bij laden met niet-opgeslagen wijzigingen
- [ ] Export als PNG (alleen circuit-gebied + padding, witte achtergrond)
- [ ] Export als SVG

---

## Navigatie

- [ ] Zoom: scrollwiel gecentreerd op cursor, min 25% / max 400%
      - Zoompercentage zichtbaar rechtsonder
      - Knoppen: +, -, reset naar 100%
- [ ] Bestaande canvas-panning blijft werken naast zoom

---

## Selectie & klembord

- [ ] Kopiëren (Ctrl+C) en plakken (Ctrl+V) van componenten + verbonden draden
- [ ] Knippen (Ctrl+X)
- [ ] Dupliceren (Ctrl+D en rechtermuisklik → Dupliceer)
- [ ] Geplakte/gedupliceerde componenten zijn direct geselecteerd

---

## Mobile

- [ ] Mobiel (< 768px): alleen-lezen modus
      - Pinch-to-zoom en touch-panning
      - Toolbar verborgen
      - Banner: "Alleen-lezen weergave. Open op een computer om te bewerken."
      - Open-knop en export-knop blijven werken
