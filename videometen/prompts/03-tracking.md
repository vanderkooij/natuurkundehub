# Claude Code prompt 03 — Videometen: Tracking

## Context

Vervolg op prompt 02 (kalibratie). Het project staat: video laden, afspelen, frame-stepping, trim, schaal, oorsprong en assen werken. Nu komt de **tracking-laag** erbij: het handmatig aanklikken van een punt op de geselecteerde frames, met undo/redo en een aparte tracking-modus.

Bekend van eerdere prompts:

- `videometen/PLAN.md` — spec
- `videometen/mockup-analyse.html` — visuele referentie (de teal puntenwolk = trail, met het actieve frame als grotere dot met witte rand)
- `videometen/SHARED.md` — lopende lijst reusables
- `workflow.md` (root) — project-brede conventies
- Bestaande state: `CalibrationState` (scale + axes), `VideoState` (video + fps + trim)

Geen nieuwe Vite-init; bouw voort op de huidige feature-structuur.

## Doel van deze prompt

Compleet handmatig tracken mogelijk maken: vanuit de analyse-modus drukt de leerling op **"▶ Start tracking"**, komt in een gefocuste fullscreen-modus, klikt frame voor frame een punt aan (auto-advance), keert daarna terug naar analyse-modus waar de trail zichtbaar is. Undo/redo werkt voor elke actie. Verkeerde klikken zijn vergevingsgezind te corrigeren.

Tabel en grafieken zijn **niet** in deze prompt — die komen in 04. We slaan nu alleen pixel-data per frame op; conversie naar wereld-coördinaten gebeurt in 04 bij display.

## Ontwerpkeuzes (vastgelegd met Jop)

- **Auto-advance.** Elke klik plaatst een punt op het huidige frame en springt direct naar `current + frameStep`. Snelste workflow.
- **Re-klik = overschrijven met undo-log.** Klikken op een frame waar al een punt staat: nieuwe positie vervangt oude; één Ctrl+Z herstelt. Geen bevestigings-dialog.
- **Trim wijziging behoudt punten.** Punten die buiten een nieuwe trim-range vallen blijven in de state maar worden gedimd weergegeven en tellen niet mee in tabel/grafieken (die conditie wordt in 04 uitgewerkt). Niet-destructief.

---

## Te realiseren

### 1. State

Nieuwe feature-map `src/features/tracking/` met state-provider en helpers.

```ts
type TrackedPoint = {
  frame: number   // absoluut frame-nummer (niet relatief aan trim)
  pixel: Pixel    // klik-positie in native videocoördinaten
}

type TrackingState = {
  points: TrackedPoint[]      // gesorteerd op frame, geen duplicaten op zelfde frame
  frameStep: number           // default 5, alleen positieve gehele waarden
}

type TrackingAction =
  | { kind: 'set-point';    point: TrackedPoint;  previous?: TrackedPoint /* voor undo */ }
  | { kind: 'remove-point'; point: TrackedPoint /* gehele entry voor undo-redo */ }
  | { kind: 'move-point';   frame: number; from: Pixel; to: Pixel }
  | { kind: 'set-step';     from: number; to: number }
```

State leeft in een React-context (`TrackingProvider`) of dezelfde store als kalibratie — kies wat consistent is met de keuze die je in prompt 02 hebt gemaakt. Serialiseerbaar voor save/load in prompt 05.

Reset bij elke nieuwe video. `frameStep` reset naar 5.

### 2. Undo/Redo

Generieke history-stack als hook in `src/_reusable/useUndoRedo.ts` (markeer als `@reusable`, `@category data`).

```ts
type UndoRedoApi<TAction> = {
  dispatch: (action: TAction) => void   // pusht actie + voert 'm uit
  undo: () => void                      // ongedaan maken via inverse
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}
```

De hook accepteert een `apply(action)` en `invert(action)` functie zodat hij domein-agnostisch is.

- Toetsenbord: `Ctrl+Z` undo, `Ctrl+Y` of `Ctrl+Shift+Z` redo
- Geblokkeerd in inputs (zoals `useEscapeMode` al doet — extraheer evt. een `useGlobalShortcut`-hook)
- Stack-limiet: 200 acties (configureerbaar via parameter, default genoeg voor klassikaal gebruik)

Voeg toe aan `SHARED.md`.

### 3. Tracking-modus (fullscreen)

Aparte view-state op app-niveau: `mode: 'analyse' | 'tracking'`. Tracking wordt actief via klik op **"▶ Start tracking"**.

Layout in tracking-modus:

- App-header **blijft zichtbaar** (consistent met de rest van NatuurkundeHub — geen verlies van context)
- Workflow-bar **verbergt zich** — alle stappen zijn gezet, focus is nu op klikken
- Drie-paneel-grid wordt **vervangen** door één paneel: de video full-width, full-height (binnen de container die onder de header valt)
- Bovenaan de video een dunne **tracking-bar** met:
  - links: **exit-knop** (× of "Klaar")
  - midden: **frame-indicator** `frame X / Y · t s · N punten gezet`
  - rechts: **frame-stap-input** (label "stap:", numeric input, min=1, max=lastFrame), **undo/redo knoppen** (← →), **trail aan/uit toggle**
- Geen tabel of grafieken zichtbaar — die zijn voor analyse-modus

Tijdens tracking-modus:

- Kalibratie-overlay: **oorsprong en assen** blijven zichtbaar als referentie maar zijn **niet meer manipuleerbaar** (alle drag-handles uitgeschakeld; pointer-events alleen op de tracking-laag). De **scale-streep is niet zichtbaar** in tracking-modus (consistent met 02b: streep alleen tijdens scale-edit). De scale-chip in de header is wel zichtbaar maar niet klikbaar.
- Cursor op video: `crosshair`
- Cursor op bestaand punt in de trail: `move` (voor verslepen — zie §5)

Exit-condities:

- `Escape` → terug naar analyse-modus
- Klik op exit-knop → terug naar analyse-modus
- State blijft volledig behouden (geen verlies van getrackte punten)

### 4. Klik-flow (auto-advance)

Bij klik op de video:

1. Bepaal pixel-coördinaten (in native videoresolutie, niet displayresolutie)
2. Bestond er al een punt voor het huidige frame? Dan:
   - Dispatch `set-point` met `previous` = oude punt (voor undo)
   - Punt op de stack
3. Anders:
   - Dispatch `set-point` zonder `previous`
4. **Auto-advance**: `nextFrame = currentFrame + frameStep`
   - Als `nextFrame > trimEnd`: blijf op `trimEnd`, toon **toast** "Klaar met tracken! Je hebt N punten gezet." Geen verder advance.
   - Anders: `setCurrentFrame(nextFrame)`

De toast verschijnt eenmalig per "voltooien" — niet bij elke klik op het laatste frame.

### 5. Punt corrigeren (verslepen)

Bestaande punten in de trail zijn versleepbaar:

- Hover op een punt-dot → cursor wordt `move`
- `mousedown` → start drag
- `mousemove` tijdens drag → punt volgt cursor in real-time
- `mouseup` → dispatch `move-point` met `from` en `to`
- Geen auto-advance tijdens correctie (alleen bij verse klik op leeg frame of via overschrijven)

Verslepen werkt in **beide modi** (tracking en analyse) — leerling kan dus na de tracking-sessie nog correcties doen vanuit analyse-modus.

### 6. Trail-overlay

Nieuwe component `features/tracking/TrailOverlay.tsx` als sub-overlay binnen de bestaande `CalibrationOverlay` (of als aparte SVG-laag, naar keuze).

Render alle `TrackingState.points`:

- Default: petrol-blauwe dots (radius ~5px in viewBox-coords; pas evt. aan voor leesbaarheid)
- Optionele dun-stippellijn tussen opeenvolgende punten (zie mockup: zwakke teal stippellijn). Schakelbaar via een knop (trail-aan-uit-toggle in tracking-bar; default aan)
- **Huidige frame's punt** (als er een bestaat): groter (radius ~7px) met witte rand — zoals in de mockup voor frame 40
- **Buiten trim-range**: gedimd (opacity 0.35), geen lijn naar/van dat punt

Trail is zichtbaar in **beide modi** — tijdens tracking voor live feedback, in analyse-modus als overzicht.

Klik op een punt in de trail (in analyse-modus) → spring naar dat frame. In tracking-modus = drag-handle, niet click-handler.

### 7. Frame-step

- Default 5 (cruciaal voor zowel korte als langere video's; in `PLAN.md` vastgelegd)
- Input in tracking-bar (numeric, min 1, max `lastFrame`)
- Bij wijziging tijdens tracking: volgende klik gebruikt nieuwe stap; eerder gezette punten blijven onaangetast (er ontstaat dus rommelig-spaced data; dat is OK en de leerling kan zelf opruimen)
- `set-step`-actie zit in undo-stack (consistent gedrag)
- Frame-step-chip in video-pane-header (analyse-modus) wordt nu functioneel: toont huidige stap, klikbaar → opent popover met dezelfde input

### 8. Workflow-bar in analyse-modus

Update gedrag van **"▶ Start tracking"**:

- Enabled wanneer `scale !== null`
- Disabled wanneer `scale === null`, met inline-hint "Stel eerst de schaal in" (bestaat al uit prompt 02)
- Klik op enabled-knop:
  - Als `mode === 'analyse'` en `currentFrame < trimStart`: spring naar `trimStart`
  - Schakel naar `mode === 'tracking'`

Workflow-stap 6 (Analyse) wordt `done` zodra er minimaal 2 getrackte punten zijn (genoeg voor een grafiek). Anders blijft 'ie `todo`. Stap 6 zelf is niet klikbaar (geen aparte dialog) — het is gewoon een visuele indicator dat er data is.

### 9. Tabel/grafieken-placeholders updaten

Nu er tracking-data is, kunnen de placeholders rechts in de analyse-modus iets minder kaal:

- Tabel-pane: als `points.length === 0` → "Geen metingen — start met tracken via stap 6". Anders → "Tabel verschijnt in de volgende versie (N metingen geregistreerd)" (de echte tabel komt in prompt 04)
- Grafieken-pane: idem

Geen echte tabel of grafiek bouwen — alleen de placeholder-tekst aanpassen aan de state.

### 10. Validatie-tooltip bij Start tracking

Wanneer Start tracking enabled is, de oude tooltip "Volgende stap wordt mogelijk in prompt 03" weghalen — nu gewoon "Start frame-voor-frame tracking" of soortgelijk.

---

## Hergebruik-markering

| Kandidaat | Categorie | Beslissing |
|---|---|---|
| `useUndoRedo` | data | **Wel markeren.** Generiek (action + apply + invert), bruikbaar in elke tool met edit-historie. |
| `useGlobalShortcut` (als je 'm extraheert uit `useEscapeMode`-patroon) | ui | **Wel markeren** als de hook generiek genoeg blijft (key + handler + input-blocking). |
| `TrailOverlay` | — | **Niet markeren.** Tool-specifiek (tracking-data + trail-stijl). |
| `TrackingState` | — | **Niet markeren.** Tool-specifiek. |

Voeg toevoegingen aan `SHARED.md`.

---

## Buiten scope (NIET doen in deze prompt)

- ❌ Tabel met meetdata (komt in 04)
- ❌ Grafieken (komt in 04)
- ❌ Pixel-naar-wereld coördinaten conversie voor display (gebeurt in 04; in 03 slaan we alleen pixel op)
- ❌ Save/load project
- ❌ CSV / PNG export
- ❌ Help-paneel
- ❌ Auto-detectie / OpenCV
- ❌ Meerdere meetreeksen (v3)

---

## Acceptatie-criteria

Na `npm run dev`:

- [ ] Bij `scale === null` is "▶ Start tracking" disabled met hint "Stel eerst de schaal in"
- [ ] Bij geldige schaal is "▶ Start tracking" enabled met tooltip
- [ ] Klik op "▶ Start tracking" → app schakelt naar tracking-modus (workflow-bar verborgen, video fullscreen binnen content-zone)
- [ ] Oorsprong en assen zijn nog zichtbaar als referentie, maar niet sleepbaar; scale-streep is verborgen (alleen chip in header)
- [ ] Tracking-bar toont frame-indicator, stap-input, undo/redo, trail-toggle, exit-knop
- [ ] Klik op video plaatst een teal-dot en springt naar `current + frameStep`
- [ ] Bij laatste frame in trim verschijnt een toast "Klaar met tracken! …" en stopt auto-advance
- [ ] Klik op een al-getrackt frame overschrijft het punt; Ctrl+Z herstelt
- [ ] Verslepen van een bestaand punt past de positie aan zonder advance
- [ ] Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z werken in beide modi (behalve tijdens typen in een input)
- [ ] Trail blijft zichtbaar in analyse-modus; klik op een trail-punt springt naar dat frame
- [ ] Wijziging van trim-range na tracking: punten buiten range worden gedimd (opacity ~0.35)
- [ ] Frame-stap-input werkt in tracking-bar en in de video-pane-chip
- [ ] Wijziging van frame-stap zit in undo-stack
- [ ] Escape of exit-knop verlaat tracking-modus zonder dataverlies
- [ ] Tabel/grafieken-placeholders updaten naar "N metingen geregistreerd"
- [ ] Workflow-stap 6 (Analyse) wordt `done` zodra `points.length >= 2`
- [ ] Geen console-errors of warnings
- [ ] Alle bestaande functionaliteit uit prompts 01 en 02 intact (kalibratie blijft werken, theme, fps, trim)
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **04-tabel-grafieken**: pixel → wereld-coördinaten transformatie (origin + angle + scale), tabel met edit, splittable grafieken-panes (x-t / y-t / y-x), actieve-rij koppeling tussen tabel en trail
- **05-export-help**: save/load JSON (versienummer voor migratie), CSV-export van tabel, PNG-export van grafieken, help-paneel in CircuitSketch-stijl (accordion)
