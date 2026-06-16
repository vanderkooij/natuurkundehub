# Claude Code prompt 02 — Videometen: Kalibratie

## Context

Vervolg op prompt 01 (fundament). Het project staat: video laden, afspelen, frame-stepping, trim, layout en theme werken. Nu komt de **kalibratie-laag** erbij: het stukje waar de leerling de meetkundige referentie van de video vastlegt voordat er getrackt kan worden.

Bekend van eerdere prompts:

- `videometen/PLAN.md` — spec
- `videometen/mockup-analyse.html` — visuele referentie (let op de schaal-streep in oranje en het assenstelsel in petrol-blauw)
- `videometen/SHARED.md` — lopende lijst reusables
- `workflow.md` (root) — project-brede conventies

Stack en bestandsstructuur zijn al opgezet — bouw daarop voort, geen nieuwe Vite-init.

## Doel van deze prompt

Drie kalibratie-tools toevoegen, allemaal als overlay op de video:

1. **Schaal** — bekend object aanklikken + lengte invoeren → meters per pixel
2. **Oorsprong** — punt op de video aanwijzen waar (0, 0) ligt
3. **Assen** — richting van de positieve x-as bepalen (kantelen)

Daarnaast: workflow-bar-stappen 4 (Schaal) en 5 (Assen) worden klikbaar en functioneel, en een lichte validatie bij "Start tracking" (die nog steeds disabled blijft tot prompt 03).

## Ontwerpkeuzes (vastgelegd met Jop)

- **Workflow niet streng, wel validatie.** Leerling kan stappen in elke volgorde doen; bij "Start tracking" wordt vriendelijk gemeld als de schaal nog ontbreekt en gesprongen naar die stap. Oorsprong + assen hebben defaults, dus blokkeren tracking niet.
- **Defaults bij nieuwe video:**
  - **Oorsprong** linksonder in het frame (klassiek fysica-coördinatenstelsel)
  - **x-as** horizontaal naar rechts (`axisAngle = 0`)
  - **y-as** omhoog (rechtsdraaiend stelsel met y-omhoog — visuele conventie)
  - **Schaal** géén default; expliciet door leerling.
- **Assen kantelen via drag-to-rotate.** Aan de tip van de +x-pijl zit een kleine rotatie-handle. Klik en sleep → de hele as draait mee om de oorsprong, met directe visuele feedback. De y-as blijft altijd 90° loodrecht op x. Consistent met hoe de oorsprong-marker al direct sleepbaar is. Numerieke hoek-invoer in graden is beschikbaar als precisie-alternatief.

---

## Te realiseren

### 1. State

Kalibratie-state als nieuwe feature-map `src/features/calibration/`, exporteert hooks/components. Vorm:

```ts
type Pixel = { x: number; y: number }  // pixel-coords in video native resolution

type ScaleCalibration = {
  p1: Pixel
  p2: Pixel
  length: number     // reëele lengte
  unit: 'm' | 'cm' | 'mm'
  // derived: metersPerPixel = (length × unitToMeters) / pixelDistance(p1,p2)
}

type AxisCalibration = {
  origin: Pixel
  angle: number      // rad; 0 = x naar rechts, y omhoog (rechtsdraaiend stelsel)
}

type CalibrationState = {
  scale: ScaleCalibration | null
  axes: AxisCalibration   // altijd aanwezig, met defaults
}
```

Default `axes` bij nieuwe video:
- `origin = { x: 0.08 × videoWidth, y: 0.92 × videoHeight }` (linksonder met wat marge)
- `angle = 0`

State leeft in een React-context of een lichte store (Zustand mag, niet verplicht). Wat je kiest moet later goed serialiseerbaar zijn voor save/load (prompt 05).

### 2. Overlay-architectuur

Eén SVG-overlay over de video die meeschaalt met de video-grootte:

- SVG `viewBox` matcht de native video-resolutie (`videoWidth × videoHeight`)
- Pointer-events alleen actief in de juiste mode (anders `pointer-events: none` zodat video-klik niet onderschept wordt)
- Rendert: schaal-streep (als gezet), oorsprong-marker, x-pijl, y-pijl

Verdeel verstandig over kleinere componenten (`ScaleOverlay`, `AxesOverlay`, `OriginMarker`, …) in `features/calibration/overlays/`.

### 3. Tool-modi (UI-flow)

De tool kent een "actieve modus" voor kalibratie. Modes:

- `idle` (default) — geen edit-flow actief. Oorsprong en assen blijven direct manipuleerbaar via hun handles (zie §5 en §6).
- `scale-edit` — wachten op p1, dan p2, dan dialog voor lengte/eenheid
- `origin-edit` — eerstvolgende klik plaatst oorsprong (alternatief voor drag-handle)
- `axis-edit-by-angle` — popover/dialog met numerieke hoek-input (graden)

Mode wordt gestart door:

- Workflow-bar **stap 4 (Schaal)** → `scale-edit`
- Workflow-bar **stap 5 (Assen)** → `axis-edit-by-angle` (precisie-popover). Drag-to-rotate werkt los daarvan altijd via de handle op de +x-pijl.
- Oorsprong heeft geen workflow-stap — wel een sleepbare handle op de oorsprong-marker zelf. Optioneel een klein "verplaats oorsprong"-knopje naast de schaal/assen-chips in de video-pane-header voor expliciete `origin-edit` mode.

Visuele feedback per mode:

- Cursor: crosshair tijdens `scale-edit` en `origin-edit`; rotate-cursor bij hover op de assen-handle
- Instruction-overlay (kleine non-modale chip onderaan video): "Klik eerste punt voor de schaal-streep", "Klik tweede punt", etc.
- `Escape` annuleert de huidige mode-actie en gaat terug naar `idle`

### 4. Schaal-tool

Stappen in `scale-edit`:

1. Cursor wordt crosshair, instruction "Klik eerste punt op een bekend object"
2. Klik 1 → punt p1 plaatsen, visueel als amber dot, instruction wordt "Klik tweede punt"
3. Klik 2 → punt p2 plaatsen + amber lijn tussen beide
4. Dialog opent met:
   - Voorbeeldweergave van de pixel-afstand: "*Afstand: 247 px*"
   - Input: lengte (number, decimaal — Nederlandse komma toegestaan in input maar opslaan als JS number)
   - Select: eenheid (`m`, `cm`, `mm`)
   - Knoppen: "Bevestigen" / "Annuleren"
5. Na bevestigen: schaal opgeslagen, schaal-streep blijft zichtbaar op video met label (bv. "1,20 m") boven de lijn — exact zoals in de mockup
6. Workflow-bar stap 4 krijgt visuele state `done`

Bewerken / verwijderen van schaal:

- Klikken op de bestaande schaal-streep (of een klein × naast de chip "schaal 1,20 m" in video-pane-header) → opties "Bewerken" / "Verwijderen"
- Bewerken = opnieuw `scale-edit` starten, oude schaal blijft tot bevestigd of geannuleerd

### 5. Oorsprong

- Render een kleine teal-dot + label "O" op de oorsprong-positie (zie mockup)
- Drag-handle gedrag: hover op de dot → cursor wordt move; sleep → oorsprong volgt; loslaten → state update
- `origin-edit` mode: eerstvolgende klik op video zet oorsprong daar
- Bij wijzigen oorsprong: bestaande assen-hoek blijft staan (rotatie is relatief)

### 6. Assen

- Render +x-pijl en +y-pijl vanuit de oorsprong, gedraaid volgens `angle`
- Lengte van de pijlen ~15-20% van de video-breedte, in petrol-blauw met label `+x` / `+y` aan de uiteinden
- Y blijft **altijd** 90° loodrecht op x (rechtsdraaiend stelsel met y-omhoog t.o.v. de fysica-conventie). Geen onafhankelijke y-rotatie.

**Primaire interactie: drag-to-rotate**

- Aan de tip van de +x-pijl zit een kleine rotatie-handle: een opvallend genoeg dot (~8px radius) zodat hij grijpbaar is, maar niet visueel dominant
- Hover op de handle → cursor wordt rotate (`cursor: grab` of `cursor: ew-resize` als rotate niet portable is)
- `mousedown` op de handle → start rotatie (`cursor: grabbing`)
- `mousemove` tijdens drag → `angle = Math.atan2(-(cursor.y - origin.y), cursor.x - origin.x)` (let op: videocoördinaten hebben y-omlaag, dus y-component negeren voor fysica-conventie waarin y omhoog positief is)
- Tijdens dragging draait het hele assenstelsel real-time mee; y volgt automatisch (90° tegen de klok in t.o.v. x)
- `mouseup` → commit, stap 5 wordt `done`
- Snap optioneel: als de cursor binnen ~3° van een veelvoud van 15° komt, snap naar dat veelvoud (alleen tijdens drag, niet bij final commit). Houd dit subtiel — leerlingen mogen 'm bewust niet-snap-bare hoeken zetten. Als deze snap te eigenwijs aanvoelt, voeg een `Shift`-modifier toe die snap uitschakelt (of juist activeert — kies wat consistent is met andere design-tools).

**Secundair: numerieke hoek-input**

- Workflow-bar stap 5 (Assen) → popover met input "Hoek in graden" (default toont huidige hoek, 1 decimaal)
- Bevestigen → `angle = degrees * π / 180`
- Mode → `idle`, stap 5 wordt `done`

De drag-handle werkt altijd, ongeacht of stap 5 ooit is aangeklikt. Stap 5 markeer je als `done` zodra de hoek minimaal één keer is aangepast (drag of input), of laat 'm `done` zijn vanaf start omdat de defaults al een geldige configuratie geven — beoordeel zelf wat het minst verwarrend is voor leerlingen.

### 7. Workflow-bar gedrag

- Stappen krijgen een visuele state:
  - `todo` (default grijs, klikbaar)
  - `active` (petrol-blauw met glow) — huidige edit-mode
  - `done` (lichtblauw met vinkje of soortgelijke aanduiding)
- Stap 4 (Schaal) → `scale-edit` mode
- Stap 5 (Assen) → opens mini-popover (zie boven)
- Stappen 1, 2, 3 blijven zoals in prompt 01 (Video upload, fps, Trim)
- Stap 6 (Analyse) blijft placeholder/disabled
- "▶ Start tracking" knop:
  - Blijft visueel disabled
  - Bij hover: tooltip "Volgende stap wordt mogelijk in prompt 03"
  - In voorbereiding op die volgende prompt: als schaal `null` is, toon onder de knop een subtiele inline-melding "Stel eerst de schaal in" — alvast als demonstratie van de validatie-flow

### 8. Video-pane-header chips

Update de bestaande chips-strook in de video-pane-header (zie mockup, rechts in de pane-header):

- `fps` chip — bestaat al uit prompt 01
- `schaal` chip — toont "schaal: niet ingesteld" als `scale === null`, anders "schaal: 1,20 m". Klikbaar → opent klein menu (Bewerken / Verwijderen)
- `stap` chip — placeholder voor frame-stap (komt in prompt 03), nu nog niet renderen of disabled tonen

### 9. Numeriek format

- Nederlandse komma in weergave (`1,20` niet `1.20`)
- Inputs accepteren zowel `1,20` als `1.20` (intern altijd `Number`)
- Drie significante cijfers default voor schaal-weergave (`1,20 m`, `12,3 cm`)
- JetBrains Mono voor alle getal-weergaven, conform mockup

---

## Hergebruik-markering

Nieuwe reusables die je mogelijk in deze fase tegenkomt:

| Kandidaat | Categorie | Wanneer markeren |
|---|---|---|
| `OverlaySvg` (een herbruikbaar SVG-overlay-frame dat meeschaalt met een onderliggend media-element) | layout | als het generiek genoeg is om in andere tools een rol te spelen |
| `ToolModeContext` (mode-flow voor edit/view modes) | ui | alleen als het generiek genoeg blijft (waarschijnlijk niet — laat het in `features/`) |

De *kalibratie-state* zelf hoort **niet** in `_reusable/` — die is tool-specifiek.

Voeg toevoegingen aan `SHARED.md` toe.

---

## Buiten scope (NIET doen in deze prompt)

- ❌ Tracking / klikken op video voor meetpunten
- ❌ Trail-overlay
- ❌ Frame-stap-instelling (placeholder in chip-strook is OK, functionaliteit komt in 03)
- ❌ Tabel met meetdata
- ❌ Grafieken
- ❌ Save/load project
- ❌ CSV / PNG export
- ❌ Help-paneel
- ❌ Tracking-modus (fullscreen video)
- ❌ Auto-detectie

---

## Acceptatie-criteria

Na `npm run dev`:

- [ ] Bij nieuwe video staat oorsprong linksonder, met +x naar rechts en +y omhoog (default-assen)
- [ ] Klik op workflow-stap 4 → cursor wordt crosshair, instruction-overlay verschijnt
- [ ] Twee klikken zetten p1 en p2, dialog vraagt lengte + eenheid
- [ ] Bevestigen → schaal-streep blijft zichtbaar met label "1,20 m" (of wat ingevuld), workflow-stap 4 markeert `done`
- [ ] `schaal`-chip in video-pane-header toont de gezette schaal
- [ ] Klik op schaal-chip → menu met Bewerken/Verwijderen werkt
- [ ] Oorsprong kan met de muis versleept worden via de O-handle
- [ ] Hover op de rotatie-handle aan de +x-pijl → cursor wordt rotate/grab
- [ ] Klik en sleep op die handle → assen draaien real-time mee, y blijft 90° loodrecht op x
- [ ] Klik op workflow-stap 5 → popover met numerieke hoek-input verschijnt, invoer past de hoek aan
- [ ] `Escape` annuleert lopende edit-mode
- [ ] "Start tracking" toont onder de knop "Stel eerst de schaal in" als schaal `null`
- [ ] Nederlandse komma overal in weergave, inputs accepteren beide
- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit uit prompt 01 nog steeds intact (video, frame-stepping, trim, theme)
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **03-tracking**: tracking-modus (fullscreen video), klik-flow per frame, trail-overlay, frame-step-instelling, undo/redo, tracking-data-state
- **04-tabel-grafieken**: tabel met meetdata gekoppeld aan kalibratie (pixel → wereld-coördinaten via origin + angle + scale), splittable grafieken-panes (x-t / y-t / y-x)
- **05-export-help**: save/load JSON, CSV/PNG export, help-paneel
