# Claude Code prompt 04 — Videometen: Data uit video + tabel

## Context

Vervolg op prompt 03 + tweaks (03b, 03c). De tracking-laag staat: getrackte punten zitten als `TrackedPoint[]` in `TrackingState` met pixel-coördinaten. Kalibratie (scale + origin + angle) staat ook. Nu komt de **datalaag** tot leven: pixel-data wordt omgezet naar wereldcoördinaten en netjes weergegeven in de tabel-pane.

**Grafieken zitten niet in deze prompt** — die komen in 05 als losse stap, omdat ze als reusable interactieve-grafiek-component worden gebouwd (cross-pane sync, raaklijn, meet-lijnen, zoom/pan, op basis van wat in modelleren al staat).

Voor context:
- `videometen/PLAN.md` — spec, datamodel
- `videometen/mockup-analyse.html` — visuele referentie voor tabel-styling
- `videometen/prompts/02-kalibratie.md` — `CalibrationState`
- `videometen/prompts/03-tracking.md` — `TrackingState` met `TrackedPoint[]`

## Doel van deze prompt

Vanaf het moment dat er minimaal 1 punt is getrackt, ziet de leerling in het rechtsboven-paneel een nette tabel:

1. Kolommen `frame · t · x · y` in wereldcoördinaten (Nederlandse komma, JetBrains Mono)
2. Expand-toggle voor `vx · vy · |v|` (extra kolommen)
3. Klikken op een rij springt de video naar dat frame
4. De rij van het huidige frame is duidelijk gehighlight
5. Per rij een `×`-knop om dat losse meetpunt te verwijderen (undoable)
6. Punten buiten trim-range blijven zichtbaar maar gedimd

Pixel → wereldcoördinaten is een **display-transformatie**: de onderliggende `TrackedPoint`-data blijft puur pixel. Conversie gebeurt afgeleid bij rendering. Bij latere wijziging van scale/origin/angle hoef je dus niets te hercomputen in de tracking-state.

De grafieken-pane (rechtsonder) blijft in deze prompt een placeholder — die wordt in 05 ingevuld.

## Ontwerpkeuzes (vastgelegd met Jop)

- **Afgeleiden in v1**: positie (x, y) + snelheden (vx, vy, |v|). Versnellingen worden in 05 als grafiek-types beschikbaar, in de tabel houden we 't bij positie en snelheden.
- **Differentiatie-methode**: central difference in het midden, forward/backward aan de randen. Eenheid `unit/s` waarbij `unit` de gekozen scale-unit is.
- **Tabel-kolommen**: compact default (`frame · t · x · y`), expand-knop voegt `vx · vy · |v|` toe.
- **Tabel-edit**: per-rij verwijderen (× achter elke rij, undoable). Geen edit van x/y waardes — corrigeren gebeurt via trail-verslepen in analyse-modus.
- **Tijd-as**: `t = (frame − trimStart) / fps` zodat de eerste meting binnen trim op `t = 0` valt.
- **Y-as omkering**: pixels groeien naar beneden, fysica-y groeit naar boven — bij de coördinaten-transformatie wordt y geflipt.
- **Decimaal-notatie**: Nederlandse komma (`1,20` niet `1.20`). Standaard 2 cijfers achter de komma voor `m` en `cm`, 1 cijfer voor `mm`. Cijfers in `JetBrains Mono`.

---

## Te realiseren

### 1. Pixel → wereldcoördinaten transformatie

Nieuwe utility in `src/features/calibration/coords.ts` (toevoegen naast bestaande kalibratie-bestanden):

```ts
type WorldPoint = { x: number; y: number }  // in gekozen scale-unit
type Pixel = { x: number; y: number }       // in native videoresolutie

function pixelToWorld(p: Pixel, cal: CalibrationState): WorldPoint
```

Logica:

1. **Translate** naar origin: `dx = p.x − origin.x`, `dy = p.y − origin.y`
2. **Rotate** met `−angle` (zodat de gebruiker's `+x`-richting horizontaal wordt in het lokale frame):
   - `rx = dx · cos(−angle) − dy · sin(−angle)`
   - `ry = dx · sin(−angle) + dy · cos(−angle)`
3. **Flip y** (screen-down → physics-up): `ry = −ry`
4. **Scale**: `pxPerUnit = scale.pixelLength / scale.length` (waarbij `pixelLength` de pixel-afstand tussen `p1` en `p2` is)
   - `worldX = rx / pxPerUnit`
   - `worldY = ry / pxPerUnit`

Resultaat: `{ x: worldX, y: worldY }` in `scale.unit`.

Edge-case: `scale === null` → de tabel is überhaupt niet relevant (kalibratie nog niet klaar). Render een lege state met hint "Stel eerst de schaal in".

### 2. Afgeleide-helpers (meetreeks bouwen)

In `src/features/measurements/derive.ts`:

```ts
type MeasurementRow = {
  frame: number
  t: number               // seconden, t = (frame - trimStart) / fps
  x: number               // wereld-x in scale.unit
  y: number               // wereld-y in scale.unit
  vx?: number             // unit/s
  vy?: number             // unit/s
  vMag?: number           // |v| = √(vx² + vy²)
  withinTrim: boolean
}

function buildRows(
  points: TrackedPoint[],
  cal: CalibrationState,
  fps: number,
  trimStart: number,
  trimEnd: number
): MeasurementRow[]
```

- Sorteer op frame oplopend (defensief — `TrackingState` houdt dit al bij)
- Bereken `t`, `x`, `y` per rij
- Snelheden via central difference: `vx[i] = (x[i+1] − x[i−1]) / (t[i+1] − t[i−1])`
- Randen: `vx[0] = (x[1] − x[0]) / (t[1] − t[0])`, idem `vx[n−1]`
- `withinTrim = frame >= trimStart && frame <= trimEnd`
- Bij < 2 rijen: geen snelheden, alleen positie

`buildRows` is een pure functie — `useMemo` op (points, cal, fps, trim).

> Versnellingen (ax, ay, |a|) zitten **niet** in deze functie. Ze komen in 05 als afgeleide bron voor grafieken (waar 'ze visueel beter passen dan in een tabel-kolom). Architectuur dichthouden: een latere uitbreiding van `MeasurementRow` met `ax?: number` etc. moet niet bestaande consumenten breken.

### 3. Tabel-pane

In `src/features/measurements/Table.tsx`:

#### Layout

- Sticky header bovenaan het paneel
- Kolommen default: `Frame · t (s) · x ({unit}) · y ({unit}) · [×]`
- Expand-toggle linksboven het paneel: knop "Toon snelheden" / "Verberg snelheden". Bij actief: extra kolommen `vx · vy · |v|`
- Eenheid in kolomkop: bv. `x (m)`, dynamisch op basis van `scale.unit`
- Cijfers in `JetBrains Mono`, rechts uitgelijnd
- 2 decimalen voor `m`/`cm`, 1 voor `mm`
- Tabel scrollt verticaal als 'ie te lang wordt; header blijft staan

#### Rij-styling

- Standaard: subtiele hover-highlight
- **Actieve rij** (rij waarvan `frame === currentFrame`): duidelijke achtergrond-highlight in `var(--accent)`-tinten, font-weight medium
- **Buiten trim** (`withinTrim === false`): opacity 0.5, grijze tekstkleur, niet klikbaar
- **Verwijder-knop** (`×`): rechts in de rij, klein, alleen zichtbaar bij hover. Klik dispatch `remove-point` (undoable via bestaande stack — gedrag al gebouwd in 03)

#### Interactie

- Klik op een rij (binnen trim) → `setCurrentFrame(row.frame)`
- Hover op rij → tijdelijke highlight in trail (zie §4 sync)
- Geen edit van waardes

#### Empty / incomplete state

- 0 punten: "Geen metingen — start met tracken via stap 6"
- 1 punt: tabel toont die ene rij (positie, geen snelheden), eronder hint "Voeg minimaal nog één meting toe voor snelheden"
- ≥ 2 punten: tabel rendert volledig

### 4. Sync tussen tabel en trail

Een lichte UI-context `MeasurementHoverProvider` (of als state in het Analyse-paneel — kies wat minst spaghetti is):

```ts
type HoverState = { hoveredFrame: number | null }
```

- Hover op tabel-rij → `setHovered(row.frame)`
- Hover op trail-dot in analyse-modus → `setHovered(point.frame)`
- Mouseleave → `setHovered(null)`

Visuele uitwerking:

- **Tabel**: rij met `frame === hoveredFrame` krijgt extra outline (subtieler dan de actieve-frame highlight)
- **Trail**: dot met dat frame krijgt accent-ring (dunner dan de actieve-frame ring uit 03)

Hovered ≠ actief. De `currentFrame`-highlight (na klik) blijft prominenter dan hover.

> In 05 wordt deze context uitgebreid zodat ook grafiek-panes erop reageren. Zorg dat de provider-API dat netjes accepteert (geen aanname dat er alleen twee consumenten zijn).

### 5. Update bestaande placeholders

In `App.tsx` / `ThreePaneLayout.tsx`:

- **Rechtsboven-pane**: vervang placeholder door `<Table>`-component
- **Rechtsonder-pane**: **blijft placeholder**, maar update de tekst naar de tracking-aware varianten:
  - 0 punten: "Grafieken komen in een volgende versie. Begin met tracken via stap 6."
  - ≥ 1 punt: "Grafieken komen in een volgende versie. ({N} metingen geregistreerd)"
- Workflow-stap 6 (Analyse) blijft `done` bij ≥ 2 punten (geërfd uit 03, niets te wijzigen)

---

## Hergebruik-markering

| Kandidaat | Categorie | Beslissing |
|---|---|---|
| `pixelToWorld` | data | **Wel markeren** (`@reusable @category data`) — generieke 2D affine transformatie, bruikbaar in elke meet-tool met scale + origin + angle |
| `buildRows` | — | **Niet markeren** — combineert te veel tool-specifieke types |
| `Table` | — | **Niet markeren** — kolom-schema en empty-states tool-specifiek |
| `MeasurementHoverProvider` | — | **Niet markeren** — context-vorm is generiek maar gebruiks-scenario te specifiek |

Voeg `pixelToWorld` toe aan `SHARED.md`.

---

## Niet doen (komt later)

- ❌ Grafieken (sub-panes, types, raaklijn, meet-lijnen, zoom/pan) — **prompt 05** als reusable `InteractiveChart` op basis van Chart.js + plugins
- ❌ Versnellingen (ax, ay, |a|) in tabel — komen in 05 als grafiek-types
- ❌ Functie-fit (lineair / kwadratisch / sinus / exponentieel) — **prompt 07**
- ❌ Save/load JSON van project — **prompt 06**
- ❌ CSV-export van tabel — **prompt 06**
- ❌ Help-paneel — **prompt 06**
- ❌ Edit van x/y waardes in tabel
- ❌ Meerdere meetreeksen — v3
- ❌ Auto-detectie / OpenCV — v3+

---

## Acceptatie-criteria

Na `npm run dev`:

- [ ] Met ≥ 1 getrackt punt vult de tabel zich met `frame · t · x · y` in de gekozen scale-unit
- [ ] Decimalen worden weergegeven met Nederlandse komma in `JetBrains Mono`
- [ ] "Toon snelheden"-knop voegt drie extra kolommen toe (`vx`, `vy`, `|v|`) met eenheid `unit/s`
- [ ] Snelheden zijn berekend met central difference (en forward/backward aan de randen)
- [ ] Bij precies 1 punt: tabel toont die rij zonder snelheden, met hint over minimaal 2 punten
- [ ] Klik op een rij springt de video naar dat frame
- [ ] De rij van het huidige frame is duidelijk gehighlight
- [ ] Een rij van een punt buiten de trim-range is gedimd en niet klikbaar
- [ ] `×`-knop achter een rij verwijdert dat punt; Ctrl+Z herstelt
- [ ] Hover op een rij of een trail-dot highlight datzelfde frame in beide views
- [ ] Bij wijziging van scale, origin of angle wordt de tabel automatisch herberekend (geen rerun van tracking nodig)
- [ ] Rechtsonder-pane is nog placeholder met "Grafieken komen in een volgende versie" + count
- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit uit prompts 01–03c blijft intact (tracking, kalibratie, theme, trim, kleur-cycle)
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **05-grafieken-reusable**: bouw `src/_reusable/InteractiveChart.tsx` op basis van Chart.js + `chartjs-plugin-zoom` + custom plugins voor raaklijn en meet-lijnen. Cross-pane sync van currentFrame ("playhead"). Integratie in videometen: sub-pane systeem met `react-resizable-panels`, default `x-t` + `y-t`, types t/m versnellingen (`ax-t`, `ay-t`, `|a|-t`) met ruis-tooltip.
- **06-export-help**: save/load project als JSON (met versienummer voor migratie), CSV-export van de tabel, PNG-export van grafieken, help-paneel in CircuitSketch-accordion-stijl (inclusief camera-vereisten-sectie)
- **07-functie-fit**: per grafiek-pane keuze tussen "ruwe data" en "fit", fit-types lineair / kwadratisch / sinus / exponentieel, fit als doorlopende lijn over de scatter heen, afgeleide-van-fit als bron voor v- en a-grafieken (gladder dan numerieke differentiatie), pedagogische vergelijking ruis vs fit
