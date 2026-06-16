# Claude Code prompt 05e — Videometen: Reset-acties + bugfixes + UX-tweaks

## Context

Patch-prompt na 05d. Zes verbeteringen op basis van gebruik:

1. **Reset-acties** ontbreken — "alle metingen wissen" en "begin opnieuw" zijn nu alleen via undo (te traag bij veel punten)
2. **Klik op grafiek-punt** werkt niet meer (regressie t.o.v. 05c; pijltjes en tabel-klik werken wel)
3. **Hover-info op video-tijdbalk** ontbreekt — geen feedback over welk frame je aanwijst voor je klikt
4. **Meet-knop toont 1 lijn ipv 2** (regressie t.o.v. 05; was vanaf 't begin twee verticale meet-lijnen)
5. **Raaklijn-knop label** `ƒ′` is technisch maar niet leerling-vriendelijk
6. **Raaklijn-formule-positie** zweeft soms te ver van de lijn — strenger op de raaklijn plakken

Voor context:
- `videometen/prompts/05-grafieken-reusable.md`, `05b`, `05c`, `05d`
- `videometen/src/_reusable/InteractiveChart.tsx`
- `videometen/src/_reusable/chart-plugins/tangent.ts`, `measureLines.ts`
- `videometen/src/_reusable/AppHeader.tsx` (of waar de header-controls leven)
- `videometen/src/features/measurements/GraphPane.tsx`
- `videometen/src/features/video/TrimScrubber.tsx` of vergelijkbare

---

## Te realiseren

### Tweak 1 — Reset-acties: "Alle metingen wissen" + "Begin opnieuw"

#### Plaatsing

In de **app-header** komt rechts (tussen de tool-naam en de theme-toggle, of helemaal rechts) een **overflow-menu** (kebab/three-dots icon, of een hamburger). Klik opent een dropdown met:

- **"Alle metingen wissen"** — primaire reset-actie
- **"Begin opnieuw met deze video"** — volledige reset behalve de video

Het menu kan in een latere prompt uitgebreid worden met andere top-level acties (save/load uit 06), houd de architectuur dus open.

#### Gedrag

**Alle metingen wissen:**
- Vraagt confirm via een lichte dialog: "Weet je het zeker? Alle {N} metingen worden gewist." met "Annuleren" en "Wissen"-knoppen
- Actie: `TrackingState.points = []`
- **Undoable**: voeg de bulk-remove als één action toe aan de undo-stack (`{ kind: 'bulk-remove', points: [...alle] }`), zodat één Ctrl+Z alles terugbrengt
- Frame-positie blijft staan; rode dot verdwijnt (geen meetpunten meer)
- Grafieken en tabel updaten naar hun "Geen metingen" empty-state
- Kalibratie, trim, fps blijven onaangetast

**Begin opnieuw met deze video:**
- Vraagt confirm via een sterker dialog: "Weet je zeker dat je opnieuw wil beginnen? Je verliest je kalibratie, trim én alle metingen. De video blijft geladen." met "Annuleren" (default) en "Reset" (rood/destructive)
- Actie: reset `CalibrationState` (scale=null, axes terug naar default), `TrimState` (full range), `TrackingState` (points=[]), `GraphsLayoutState` (terug naar default twee panes), `TrackingState.frameStep` (terug naar 5)
- **Niet undoable** — te grote reset, dialog dekt confirmation
- Workflow-stappen reflecteren weer "todo" voor alles behalve "1 Video"

Beide acties zijn disabled wanneer er nog geen video geladen is.

### Tweak 2 — Klik op grafiek-punt fix

Klik werkt niet (rode dot springt niet), terwijl pijltjes en tabel-klik wel werken.

#### Diagnose-pad

Vermoedelijk veroorzaakt door één van deze in 05d:

1. **Snap-logic in `setFrame`** — als de klik `setFrame(point.meta.frame)` aanroept zonder `skipSnap`, en de snap-helper rondt naar dichtstbij meetpunt. Zou geen issue moeten zijn (frame IS al een meetpunt), maar check of er een rounding-bug zit (bv. floating-point frame waarden)
2. **Hit-detection met kleinere `pointRadius: 2.5`** — Chart.js' `nearest` mode met `intersect: false` zou royaal moeten zijn, maar bij heel kleine dots kan de event-positie net naast vallen. Verifieer dat `chart.options.interaction.intersect = false` en `mode = 'nearest'`. Eventueel verhoog `pointHoverRadius` naar 8 (was 6) zodat de hit-zone groter is dan de visuele dot
3. **`activeEls`-filter** — uit de 05c-fix gebruikten we `activeEls` van Chart.js' event. Check of die filter (`datasetIndex < series.length`) nog correct werkt nu er extra datasets kunnen zijn (raaklijn, geselecteerd-punt, mogelijk meet-line-overlays?)

#### Te doen

- Reproduceer in dev-modus: open Analyseren, hover over een grafiek-dot (zou een tooltip moeten geven), klik → controleer of `onPointClick` wordt aangeroepen
- Fix de root cause; documenteer 'm in een korte comment in `InteractiveChart.tsx`
- Verifieer dat klik werkt in zowel Verken als Analyseren modi
- Verifieer dat klik werkt op gedimde dots (uit 05d tweak 6)

### Tweak 3 — Hover over video-tijdbalk toont frame + tijd

Op de video-scrubber (trim-scrubber): bij hover boven de track verschijnt een kleine tooltip met:

- **Frame-nummer**: `frame 42`
- **Tijd**: `· 1,40 s` (Nederlandse komma, 2 decimalen)

#### Specs

- Tooltip volgt de cursor horizontaal mee, ~16 px boven de track
- Verschijnt bij `pointerenter` op de track, verdwijnt bij `pointerleave`
- Tijdens slepen blijft 'ie zichtbaar maar volgt de cursor-positie (niet de huidige `currentFrame`, want die kan achterlopen tijdens drag)
- Styling: zelfde pill-look als de fps-chip (kleine compacte achtergrond, JetBrains Mono voor de cijfers)
- Geldig in Verken én Analyseren modi
- Tracking-modus: ook handig daar; dezelfde tooltip
- Tooltip toont het **rauwe** hover-frame (geen snap toepassen), zodat de leerling exact ziet waar 'ie staat — pas bij `pointer-up` snapt currentFrame eventueel

### Tweak 4 — Meet-knop toont weer 2 verticale lijnen

Regressie: meet-functie toont nu maar 1 lijn. Hoort 2 te zijn (twee sleepbare verticale lijnen, cyaan + amber, met info-balk eronder).

#### Te doen

- Check de initial state van `measureLines` in `GraphPane.tsx` wanneer de toggle wordt aangezet — zou `{ x1: ..., x2: ..., onChange: ... }` moeten zijn met beide waardes gevuld
- Check de plugin in `chart-plugins/measureLines.ts` — render beide lijnen als beide x-waardes non-null zijn
- Check de handle-rendering in `InteractiveChart.tsx` — beide handles als absolute divs op de juiste x-pixels
- Default x1/x2 bij activeren: `x1` op 25% van zichtbare range, `x2` op 75% (zoals in 05 spec)
- Info-balk onder de chart: toont `x₁ · x₂ · Δx · y₁ · y₂ · Δy` met live updates bij slepen

### Tweak 5 — Raaklijn-knop label: "Raaklijn"

Vervang `ƒ′` door **"Raaklijn"** als knop-label. Consistent met andere knop-labels in de pane-header ("Meten", "Lijn"). Eventueel klein icoontje ervoor (een schuin lijntje of een tangent-symbool), maar de tekstlabel is primair.

### Tweak 6 — Raaklijn-formule-positie: strakker op de lijn

Huidige implementatie plaatst label `±8/+18 px` boven/onder de raaklijn-eindpunt. Dat is soms visueel te ver weg of suggereert geen koppeling.

#### Nieuwe positie

- Label staat **op de raaklijn-y** van het verre uiteinde — geen verticale offset meer
- Pill-achtergrond is **semi-transparant** (huidige theme-bg met opacity ~0.85) zodat de raaklijn lokaal "wegkleurt" onder de pill maar de tekst leesbaar blijft
- Horizontale positie: net binnen het verre uiteinde, met marge ~12 px naar de chart-rand (zoals nu)
- Bij heel korte raaklijn (< 40 px screen-distance): fallback naar midden (zoals nu)
- Tekst-kleur blijft amber (`#D4923A`), pill-rand subtiel of geen rand

#### Optionele verbetering: kleur-koppeling

Voor extra visuele binding: laat de label een minimale `border-bottom` of `text-decoration` in de raaklijn-kleur hebben, zodat ook bij overlap de associatie duidelijk blijft.

#### Edge-cases

- Als de raaklijn-eindpunt-y buiten de chart valt (clipping): plaats label op het laatste zichtbare punt van de raaklijn (bereken via lijn-vlak-snijpunt met de chartArea-rand)
- Clamp horizontaal en verticaal binnen `chartArea` met de bestaande margin

---

## Niet doen

- ❌ Geen wijziging aan tracking-flow, kalibratie-UI, of trim-handles zelf
- ❌ Geen save/load JSON (komt in 06)
- ❌ Geen CSV/PNG-export (komt in 06)
- ❌ Geen help-paneel (komt in 06)
- ❌ Geen vaste-hoek fallback voor de raaklijn-formule (eerst de strakke dynamische proberen)
- ❌ Geen wijziging aan de "Lijn"-toggle of meetpunt-snap-logica
- ❌ Geen reset van loaded video (alleen "Begin opnieuw" behoudt de video)

---

## Acceptatie-criteria

### Reset-acties

- [ ] App-header rechts heeft een overflow-menu (kebab/hamburger) met twee items
- [ ] "Alle metingen wissen" toont confirm-dialog en wist alle meetpunten bij bevestiging
- [ ] Bulk-remove zit als één action in de undo-stack; één Ctrl+Z herstelt alles
- [ ] "Begin opnieuw met deze video" toont sterker confirm-dialog en reset kalibratie + trim + tracking + grafiek-layout
- [ ] "Begin opnieuw" is **niet** undoable
- [ ] Beide acties zijn disabled wanneer er geen video geladen is
- [ ] Workflow-stappen reflecteren correct hun nieuwe staat na reset

### Klik-bug grafiek

- [ ] Klik op een grafiek-dot (binnen of buiten trim) springt `currentFrame` naar dat meetpunt
- [ ] Rode dot verschijnt op het aangeklikte punt
- [ ] Werkt in zowel Verken als Analyseren
- [ ] Werkt op gedimde (buiten-trim) dots

### Hover tijdbalk

- [ ] Hover over de video-scrubber toont een tooltip met `frame X · t Y,YY s`
- [ ] Tooltip volgt cursor horizontaal mee, ~16 px boven de track
- [ ] Tijdens slepen blijft de tooltip zichtbaar en toont het hover-frame (niet snapped)
- [ ] Werkt in Verken, Analyseren én Tracking-modi

### Meet-knop

- [ ] Meet-toggle activeren toont **twee** verticale lijnen (cyaan + amber)
- [ ] Beide lijnen hebben sleepbare handles bovenaan
- [ ] Info-balk onder de chart toont `x₁ · x₂ · Δx · y₁ · y₂ · Δy` met live updates
- [ ] Default x1/x2 bij activeren: 25%/75% van zichtbare x-range

### Raaklijn-label

- [ ] Knop heet "Raaklijn" (eventueel met klein icoon)
- [ ] Toggle-gedrag onveranderd

### Raaklijn-formule-positie

- [ ] Label staat **exact op de raaklijn-y** van het verre uiteinde
- [ ] Pill-achtergrond is semi-transparant en zorgt voor leesbaarheid over de lijn
- [ ] Bij heel korte raaklijn (< 40 px): fallback naar midden
- [ ] Bij clipping aan chart-rand: label volgt de zichtbare lijn-eind

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit uit prompts 01–05d blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **06-export-help**: save/load project als JSON met versienummer (inclusief grafiek-layout, modus, lijn-toggle-state, pane-sizes), CSV-export van de tabel, PNG-export per grafiek via `chart.toBase64Image()`, help-paneel in CircuitSketch-accordion-stijl (incl. uitleg over frames vs meetpunten, camera-vereisten, de drie werkmodi, reset-acties). Het overflow-menu uit 05e wordt uitgebreid met save/load.
- **07-functie-fit**: per grafiek-pane keuze tussen "ruwe data" en "fit", fit-types lineair / kwadratisch / sinus / exponentieel, afgeleide-van-fit als bron voor v- en a-grafieken, pedagogische vergelijking ruis vs fit
