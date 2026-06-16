# Claude Code prompt 05d — Videometen: Sync-fix + meetpunt-snapping + verbindingslijn-toggle

## Context

Patch-prompt na 05c. Eén root-cause-bug + zes gerelateerde verbeteringen die samen hangen rond de sync tussen playhead, geselecteerd punt en raaklijn, plus een conceptuele simplificatie van het navigatie-model.

**Achtergrond + conceptueel besluit.** Frames in de video en meetpunten zijn niet hetzelfde: meetpunten zijn een **subset** van alle frames (de frames waarop tijdens tracking is geklikt). In analyse-fase is tussen-frame-navigatie weinig zinvol — er is geen data voor zo'n frame, en nieuwe metingen toevoegen gebeurt via tracking-modus. Daarom: **`currentFrame` snapt in analyse altijd naar een meetpunt-frame**. Tracking-modus blijft onveranderd vrij door alle frames kunnen lopen (daar wil je juist tussen-frame-controle voor het plaatsen van metingen).

Wat we in gebruik zagen:

1. Pijltjes binnen een grafiek-pane verplaatsten `currentFrame` met een onlogische stap (lijkt op `+1` of `+frameStep`), in plaats van naar het volgende meetpunt-frame te springen
2. Daardoor viel `currentFrame` zelden samen met een meetpunt → geen rode dot → raaklijn-anker viel terug op "laatste meting" → raaklijn helemaal rechts, los van waar de stippellijn stond
3. Het `dy/dx = …`-label staat midden op de raaklijn vlak bij de geselecteerde dot — overlapt visueel
4. Verbindingslijn tussen meetpunten staat default aan voor positie-grafieken; dat botst straks met fit-curves (07)
5. Klik en pijltjes werken niet op gedimde (buiten-trim) punten, terwijl scrubben in de video buiten trim wél mag — inconsistent
6. De verticale stippellijn (playhead) is in analyse-fase visueel redundant nu currentFrame altijd op een meetpunt komt — kan weg, rode dot is voldoende indicator

Voor context:
- `videometen/prompts/05-grafieken-reusable.md`, `05b-analyse-tweaks.md`, `05c-grafiek-feedback.md`
- `videometen/src/_reusable/InteractiveChart.tsx`
- `videometen/src/features/measurements/GraphPane.tsx`, `Graphs.tsx`, `graph-types.ts`
- `videometen/src/features/measurements/MeasurementHoverState.tsx`
- Implementatie-detail uit 05b: `InteractionZoneState` + `useVideoKeyboard.ts` → `navigateInPane(paneId, ±1 | ±10)` → `GraphPane`'s `navigate(delta)`

---

## Te realiseren

### Tweak 1 — Pijltjes-navigatie springt naar het volgende meetpunt-frame

In `GraphPane.tsx`, de `navigate(delta)`-functie die in `InteractionZoneState` wordt geregistreerd:

#### Gewenst gedrag

- Pijltje binnen grafiek-pane → ga naar het volgende meetpunt-frame in **de gefilterde `points` van die pane**
- Voor `ax-t` / `ay-t` / `|a|-t`: het eerste en laatste meetpunt vallen weg (geen afgeleide aan de randen), dus de "punten in deze pane" is een subset — pijltjes moeten door die subset lopen, niet door alle `rows`
- `delta = +1` → volgend meetpunt-frame, `delta = -1` → vorig, `±10` → 10 stappen
- Aan de randen: clamp op `[0, points.length − 1]`. Geen wrap-around.

#### Implementatie

```ts
function navigate(delta: number) {
  if (points.length === 0) return
  // Bepaal huidige index op basis van currentFrame
  const currentIdx = points.findIndex(p => p.meta?.frame === currentFrame)
  // Als currentFrame niet op een meetpunt valt: snap naar dichtstbijzijnde meetpunt eerst
  const startIdx = currentIdx === -1
    ? nearestPointIdx(points, currentFrame)
    : currentIdx
  const nextIdx = clamp(startIdx + delta, 0, points.length - 1)
  setCurrentFrame(points[nextIdx].meta.frame)
}
```

`nearestPointIdx(points, frame)` is een helper die het meetpunt met de minimale `|p.meta.frame − frame|` retourneert. Bij gelijke afstand: kies het hogere frame (naar voren is intuïtiever).

#### Bonus

Bij `currentFrame` niet op een meetpunt: het eerste pijltje "snapt" naar het dichtstbijzijnde meetpunt zonder verder te bewegen. Dat voelt fout. Beter: snap + verplaats in één key-press. Dus:

```ts
const startIdx = currentIdx === -1
  ? nearestPointIdx(points, currentFrame)
  : currentIdx + delta  // alleen optellen als we al op een punt zaten
// Bij snap: de "snap zelf" is de verplaatsing; geen extra delta nodig.
```

Kies de variant die natuurlijk aanvoelt — bij twijfel: snap zonder extra delta (eerste pijltje pakt 'm in beeld; tweede zet 'm op de volgende).

### Tweak 2 — Verticale stippellijn (playhead) weghalen + snap-to-meetpunt

Twee samenhangende wijzigingen:

#### 2a. CurrentFrame snapt naar dichtstbij meetpunt buiten tracking-modus

In **Verken** en **Analyseren** modi: zodra `currentFrame` zou worden gezet op een waarde die niet samenvalt met een meetpunt-frame, snap automatisch naar het **dichtstbijzijnde meetpunt-frame**. Geldt voor:

- Video-scrubber slepen → bij `pointer-up` snap naar dichtstbij meetpunt
- Globale frame-step pijltjes (cursor over video of elders, niet in grafiek-pane) → springt naar volgend/vorig meetpunt in plaats van `±1 frame`
- `Space` / play: video kan vrij doorlopen, maar zodra je pauzeert snap naar dichtstbij meetpunt (zelfde patroon als scrubber-release)
- Klik op trail-dot → al sync met meetpunt (geen wijziging)
- Klik op tabel-rij of grafiek-punt → al sync (geen wijziging)
- Klik op gedimde dots/rijen → ook snap (zie tweak 6)

In **Tracking-modus** blijft `currentFrame` vrij door alle frames lopen — geen snap. Dat is essentieel voor het plaatsen van nieuwe meetpunten op willekeurige frames.

Implementatie: voeg in de `VideoState`-reducer (of waar `currentFrame` wordt gezet) een snap-helper toe die wordt toegepast op alle setters **behalve** wanneer `mode === 'tracken'`. Bij `points.length === 0`: geen snap (er is niets om naar te snappen — gewoon doorlaten).

Edge-case: bij play/scrubben tijdens een actieve drag wil je geen flikkering. Snap pas bij `pointer-up` / `pause`, niet tijdens de continue drag/play.

#### 2b. Playhead-stippellijn verwijderen uit grafieken

Nu `currentFrame` in analyse altijd op een meetpunt valt, is de stippellijn redundant — de rode dot toont al precies waar je staat.

- Verwijder de `playheadPlugin`-aanroep in `GraphPane.tsx` / `InteractiveChart.tsx` props (zet `playheadX={null}` of laat de prop weg)
- De plugin zelf blijft bestaan in `_reusable/chart-plugins/playhead.ts` — kan later weer ingezet worden door andere consumenten als ze 'm nodig hebben. Markeer in een korte comment dat videometen 'm bewust niet gebruikt.

### Tweak 3 — Raaklijn-anker: simpel via selectedIdx

Door tweak 2a (snap-to-meetpunt) valt `currentFrame` in analyse altijd op een meetpunt, dus `selectedIdx >= 0` is hier de regel. De fallback-logica is daarmee triviaal:

- `tangentAnchorIdx = selectedIdx` (in analyse altijd geldig)
- Bij `selectedIdx === -1` (alleen mogelijk bij `points.length === 0` of voor `ax-t`-achtige panes waar het huidige meetpunt buiten de gefilterde subset valt): val terug op het dichtstbijzijnde punt in de pane's eigen `points`-array

Effect: raaklijn blijft altijd in beeld én altijd op de rode dot. Geen "verdwaalde raaklijn" meer.

#### Edge-case: ax-t / ay-t / |a|-t

Bij deze types valt het eerste en laatste meetpunt weg. Als `currentFrame` op het eerste of laatste meetpunt staat, vindt `points.findIndex(p => p.meta.frame === currentFrame)` niets → val terug op `nearestPointIdx(panePoints, currentFrame)`. De rode dot in die pane staat dan op het eerste/laatste meetpunt dat wél geldig is — visueel niet 100% gelijk aan andere panes, maar correct gegeven de afgeleide-randen.

### Tweak 4 — `dy/dx = …` label-positie: dynamisch weg van de actieve dot

Huidige plek: midden op de raaklijn (midX, midY). Overlapt visueel met de geselecteerde dot.

Nieuwe plek:

- Bepaal welk uiteinde van de raaklijn binnen de viewport **het verst van de actieve dot** ligt (in pixel-afstand)
- Plaats het label net binnen dat uiteinde, met een marge van ~12 px naar de chart-rand
- Vertikaal: net boven de raaklijn als het uiteinde naar boven loopt (positieve slope rechts / negatieve slope links), net eronder als 't omgekeerd is — zo houd je de label niet bovenop de lijn zelf
- Behoud de bestaande pill-achtergrond (semi-transparant theme-bg) voor leesbaarheid

#### Implementatie-hint

In de `tangentPlugin`:

```ts
const leftPx  = xScale.getPixelForValue(tangentLine.x1)
const rightPx = xScale.getPixelForValue(tangentLine.x2)
const dotPx   = xScale.getPixelForValue(anchorX)
const placeRight = Math.abs(rightPx - dotPx) > Math.abs(leftPx - dotPx)
const px = placeRight ? rightPx - margin : leftPx + margin
const py = yScale.getPixelForValue(placeRight ? tangentLine.y2 : tangentLine.y1)
// Verticale offset: kies de kant waar de lijn vandaan komt (above/below)
const slopeUp = (tangentLine.y2 > tangentLine.y1) === placeRight
const labelOffsetY = slopeUp ? -8 : +18
```

Clamp `px` en `py` binnen `chartArea` met een marge, zodat 't label niet over de assen valt.

Bij heel korte raaklijn (uitgezoomd waar beide einden bij dezelfde dot liggen): val terug op de huidige midden-plek. Geen actie nodig dan.

### Tweak 5 — Verbindingslijn als toggle, default uit

Nu staat de lijn-verbinding default aan voor positie-grafieken (`x-t`, `y-t`, `y-x`) en uit voor v/a. Verander naar **default uit voor alle types**, met een **toggle in de pane-header**.

#### Pane-header uitbreiding

Naast de bestaande knoppen (`ƒ′` raaklijn, `Meten` meet-lijnen) komt:

- **Lijn-toggle**: knop met icoon `╱` of label `lijn` of `verbind`. Toggle-state per pane, niet globaal.
- Standaard uit. Wie 'm aanzet ziet de scatter-dots verbonden door dunne lijn-segmenten (huidige stijl).

#### State

- Per `PaneState` (binnen `GraphsLayoutState`): nieuw veld `showLine: boolean`, default `false`
- Overleeft Verken↔Analyseren-wissel (zoals de andere pane-state)
- Bij nieuwe video: reset naar default (`false` voor alle panes)

#### Effect op gedimde punten

Onveranderd: ook met lijn-toggle aan worden gedimde punten **niet** verbonden door de lijn (segment-color = transparant rond gedimde punten, of segment-break). Huidige logica blijft.

### Tweak 6 — Klik en pijltjes op gedimde (buiten-trim) punten

Maak gedimde punten **navigatief equivalent** aan binnen-trim punten:

#### Klik op gedimde grafiek-dot

- Roept `onPointClick` aan, net als binnen-trim dots
- `setCurrentFrame(point.meta.frame)` → playhead en eventueel rode dot springen erheen
- Visueel blijft de gedimde-styling (opacity ~0.35), maar 'ie is **niet meer onhitbaar**

#### Pijltjes binnen grafiek-pane

- Doorloop **alle** `points` in de pane, ook de gedimde
- `navigate(delta)` springt door de volledige lijst, niet door een gefilterde "alleen binnen trim"-subset

#### Klik op gedimde tabel-rij

- Maak ook klikbaar (was tot nu toe niet, conform 04). `setCurrentFrame(row.frame)`
- Visueel blijft de gedimde tekst (opacity 0.5, grijs); cursor wordt nu `pointer` ipv `default`
- `×`-verwijderknop op gedimde rijen mag blijven werken (was al het geval)

#### Reden

Scrubben in de video buiten de trim-range is bewust toegestaan (uit 01) — leerlingen mogen kijken naar context vóór of na hun meet-window. Dezelfde logica geldt voor klikken en pijltjes vanuit tabel/grafiek. De `withinTrim`-styling is een **filter-indicator** ("dit telt straks niet mee in de standaard analyse"), geen navigatie-blokkade.

---

## Niet doen

- ❌ Geen snap-to-meetpunt in **tracking-modus** — daar moet currentFrame vrij door alle frames lopen (essentieel voor nieuwe metingen plaatsen)
- ❌ Geen verwijdering van `playheadPlugin` zelf — alleen niet meer gebruikt in videometen, plugin blijft beschikbaar in `_reusable/` voor andere consumers
- ❌ Geen wrap-around bij pijltjes aan de randen
- ❌ Geen wijziging aan trail-overlay op de video
- ❌ Geen wijziging aan kalibratie of tracking-flow
- ❌ Geen verandering aan default grafiek-types of layout
- ❌ Geen "klik op leeg video-deel in analyse-modus = nieuw meetpunt"-feature (workflow blijft: nieuwe metingen via tracking-modus)

---

## Acceptatie-criteria

### Pijltjes-navigatie

- [ ] Cursor over grafiek-pane: ←/→ springt naar het volgende/vorige meetpunt-frame van die pane
- [ ] In een pane waar het eerste/laatste meetpunt wegvalt (`ax-t`, `ay-t`, `|a|-t`): pijltjes lopen door de gefilterde subset
- [ ] Bij `currentFrame` tussen meetpunten: eerste pijltje snapt naar het dichtstbijzijnde meetpunt
- [ ] Shift+←/→ = 10 meetpunten verschuiven
- [ ] Aan de randen: clamp, geen wrap-around
- [ ] Op een meetpunt-frame: stippellijn en rode dot vallen exact samen

### Snap-to-meetpunt + playhead weg

- [ ] In Verken en Analyseren modi: video-scrubber slepen + loslaten snapt `currentFrame` naar het dichtstbijzijnde meetpunt
- [ ] Globale frame-step pijltjes (buiten grafiek-pane) springen van meetpunt naar meetpunt
- [ ] Bij pauzeren na play: snap naar dichtstbij meetpunt
- [ ] In Tracking-modus is `currentFrame` nog steeds vrij door alle frames (geen snap)
- [ ] Bij `points.length === 0`: geen snap, currentFrame mag op elk frame staan
- [ ] Verticale stippellijn is niet meer zichtbaar in grafieken (verken/analyseren)
- [ ] `playheadPlugin` bestaat nog wel in `_reusable/chart-plugins/` voor toekomstige consumers
- [ ] Rode dot zit altijd op `currentFrame` na navigatie

### Raaklijn-anker

- [ ] Raaklijn-anker = rode dot (selectedIdx), altijd zichtbaar bij ≥ 2 meetpunten en raaklijn-toggle aan
- [ ] In `ax-t` / `ay-t` / `|a|-t` panes waar het huidige meetpunt buiten de gefilterde subset valt: val terug op dichtstbij geldig punt

### Label-positie

- [ ] `dy/dx = …` label staat aan het uiteinde van de raaklijn dat het verst van de actieve dot ligt
- [ ] Label heeft pill-achtergrond voor leesbaarheid
- [ ] Label valt nooit over de assen — geclampt binnen chartArea
- [ ] Bij heel korte raaklijn: val terug op midden-plaatsing

### Verbindingslijn-toggle

- [ ] Per pane-header zit een lijn-toggle naast `ƒ′` en `Meten`
- [ ] Default uit voor alle types
- [ ] Lijn-toggle-state overleeft Verken↔Analyseren-wissel
- [ ] Bij nieuwe video: reset naar default
- [ ] Gedimde punten worden niet verbonden door de lijn (segment-break)

### Buiten-trim navigatie

- [ ] Klik op gedimde grafiek-dot springt video naar dat frame
- [ ] Pijltjes binnen pane lopen door alle meetpunten, ook gedimde
- [ ] Klik op gedimde tabel-rij springt video naar dat frame; cursor `pointer`
- [ ] Visuele dimming blijft (opacity 0.35 grafiek / 0.5 tabel) — alleen navigatie is open

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit uit prompts 01–05c blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **06-export-help**: save/load project als JSON met versienummer (inclusief grafiek-layout, modus, lijn-toggle-state), CSV-export van de tabel, PNG-export per grafiek, help-paneel in CircuitSketch-accordion-stijl (incl. uitleg over frames vs meetpunten, camera-vereisten, en de drie werkmodi)
- **07-functie-fit**: per grafiek-pane keuze tussen "ruwe data" en "fit", fit-types lineair / kwadratisch / sinus / exponentieel, afgeleide-van-fit als bron voor v- en a-grafieken (gladder dan numerieke differentiatie + zinvolle raaklijn op fractionele x-waardes), pedagogische vergelijking ruis vs fit
