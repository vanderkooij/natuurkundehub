# Claude Code prompt 05 — Videometen: Grafieken-reusable + integratie

## Context

Vervolg op prompt 04 (data + tabel). De `MeasurementRow[]` is nu beschikbaar via `buildRows()` — pixel → wereldcoördinaten + snelheden via central difference. De rechtsonder-pane is nog een placeholder. In deze prompt vullen we 'm in **als eerste klant van een nieuwe reusable**: `InteractiveChart`, een React-wrapper rond Chart.js + plugins voor rijke interactie.

**Achtergrond:** in de bestaande tool `modelleren/` (vanille HTML, single-file) staat al een rijk grafiek-systeem: raaklijn met `dy/dx`-label, twee sleepbare meet-lijnen met interpolerende y-aflezing, wheel/pinch zoom + pan, cross-chart x-as-sync, klik-selectie van datapunten, pijltjes-navigatie. Die feature-set willen we nu hergebruikbaar maken voor alle React-gebaseerde NH-tools (te beginnen met videometen, later eventueel een gemigreerde modelleren).

Voor context:
- `videometen/PLAN.md` — sub-pane systeem, grafiek-types
- `videometen/mockup-analyse.html` — visuele referentie voor sub-pane lay-out
- `modelleren/index.html` regels 666–1060 — bestaande Chart.js implementatie met `tangentLabelPlugin`, `measureLinesPlugin`, `chartjs-plugin-zoom` setup, `syncCursor`, `niceAxis`, `interpolateMeasureY`. **Bestudeer dit als referentie**, maar zonder de plain-JS code letterlijk te kopiëren — we bouwen 'm opnieuw in TypeScript + React.
- `videometen/prompts/04-data-tabel.md` — `MeasurementRow`, `MeasurementHoverProvider`

## Doel van deze prompt

Twee duidelijk gescheiden lagen:

**A. Reusable `InteractiveChart`-component** in `src/_reusable/InteractiveChart.tsx` met een nette, ge-typede React-API. Volledig domein-agnostisch — kent geen `MeasurementRow`, geen frame-getallen, geen video-concept. Levert plugins voor playhead, raaklijn, meet-lijnen en wraps `chartjs-plugin-zoom`. Theme-aware via `nh-theme`.

**B. Tool-integratie in videometen**: rechtsonder-pane wordt een sub-pane-grid met `react-resizable-panels`, max 4 panes. Default 2 panes naast elkaar (`x-t` + `y-t`). Per pane: type-dropdown, raaklijn-toggle, meet-lijnen-toggle, close, reset-zoom. Cross-pane sync van een **playhead** op `t = (currentFrame − trimStart) / fps`, plus hover-sync met tabel + trail via de uitgebreide `MeasurementHoverProvider`.

## Ontwerpkeuzes (vastgelegd met Jop)

- **Playhead-gedrag tussen meetpunten**: scatter + dunne verbindingslijn (default aan voor positie, uit voor v en a). Playhead is een verticale stippellijn op `currentFrame`-tijd. Tussen meetpunten loopt 'ie continu; de tooltip toont de geïnterpoleerde waarde op de verbindingslijn.
- **Raaklijn op ruwe data**: beschikbaar in 05 voor alle types. Voor versnellingen wordt 'ie ruisig — dat is OK, fungeert als pedagogisch haakje naar prompt 07 (fit-afgeleide is gladder).
- **Cross-pane x-zoom-sync**: opt-in via een toggle in de Graphs-container-header (niet default aan). Voor panes met `t` op de x-as.
- **Modelleren-migratie**: voorlopig **niet**. Modelleren houdt zijn eigen Chart.js-kopie. SHARED.md noteert 'm als kandidaat — extractie van plugins als losse JS-files wacht op een derde gebruiker of op een React-migratie van modelleren.
- **Reusable mag groeien**: liever lichtgewicht API nu met ruimte voor uitbreiding, dan alles in één keer. Voor 07 (functie-fit) hebben we straks waarschijnlijk een extra `overlays`-prop nodig — laat de prop-structuur dat accepteren.

---

## Te realiseren

### 1. Dependencies

```bash
npm install chart.js@^4.4.2 chartjs-plugin-zoom@^2.0.1
```

Geen wrapper-libraries zoals `react-chartjs-2` — we bouwen onze eigen wrapper omdat we volledige controle willen over de plugin-registratie en `update('none')`-aanroepen.

### 2. Reusable `InteractiveChart`

In `src/_reusable/InteractiveChart.tsx` met `@reusable @category data` JSDoc-header.

#### Types

```ts
export type ChartPoint = {
  x: number
  y: number
  /** Optioneel: door consumer mee te geven metadata. InteractiveChart raakt 'm niet aan,
   *  maar geeft 'm terug in onPointClick/onHover events. */
  meta?: unknown
  /** Als true: punt wordt gedimd weergegeven (opacity ~0.35), geen verbindingslijn naar/van */
  dimmed?: boolean
}

export type ChartSeries = {
  label: string
  points: ChartPoint[]
  /** Default: huidige theme-accent. */
  color?: string
  /** Default true. Bij false: alleen scatter dots zonder verbindingslijn. */
  showLine?: boolean
  /** Default false. */
  dashed?: boolean
}

export type TangentConfig = {
  active: boolean
  /** Index in series[0].points waar de raaklijn berekend wordt.
   *  Default: het laatst geselecteerde / gehoverde punt. */
  atIdx?: number | null
}

export type MeasureLinesConfig = {
  x1: number | null
  x2: number | null
  /** Roept consumer aan bij sleep van handles. */
  onChange?: (next: { x1: number | null; x2: number | null }) => void
}

export type ZoomState = {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

export type InteractiveChartProps = {
  /** Meestal 1 serie; >1 voorzien voor latere overlay-types (zie 07). */
  series: ChartSeries[]
  xLabel: string  // bv. "t (s)"
  yLabel: string  // bv. "x (m)"

  /** Verticale stippellijn op deze x-waarde. Null = geen playhead. */
  playheadX?: number | null
  /** Welke punt in series[0] is 'geselecteerd' (grotere dot met ring). */
  selectedIdx?: number | null
  /** Welke punt in series[0] is gehoverd (subtiele ring). */
  hoveredIdx?: number | null

  tangent?: TangentConfig
  measureLines?: MeasureLinesConfig

  /** Reset zoom op nieuwe data — als false (default), behoudt 'ie zoom-state. */
  resetZoomOnDataChange?: boolean
  /** Externe zoom-control (voor cross-pane sync). Als gezet: chart respecteert deze bounds. */
  zoomState?: ZoomState | null
  onZoomChange?: (z: ZoomState) => void

  /** Klik op een datapunt (binnen ~hit-radius). */
  onPointClick?: (seriesIdx: number, pointIdx: number, point: ChartPoint) => void
  /** Klik in lege grafiek-area (niet op een punt). Levert geïnterpoleerde x-waarde. */
  onAreaClick?: (x: number) => void
  /** Hover over een punt (of null bij mouseleave). */
  onPointHover?: (info: { seriesIdx: number; pointIdx: number; point: ChartPoint } | null) => void

  /** Default volgt document `[data-theme]`. Override per chart mogelijk. */
  themeMode?: 'light' | 'dark'

  /** Default 100%. */
  height?: number | string
  /** Default false. */
  showLegend?: boolean
}
```

#### Custom plugins

Drie custom plugins in `src/_reusable/chart-plugins/`:

1. **`playheadPlugin`** — tekent verticale stippellijn op `chart.options.plugins.playhead.x`. Kleur uit `chart.options.plugins.playhead.color` (default semi-transparant theme-text). Renderdt alleen als x binnen de visible x-range valt.

2. **`tangentPlugin`** — gebaseerd op modelleren's `tangentLabelPlugin`. Verwacht `chart.options.plugins.tangent` met `{ active, midX, midY, label }`. Tekent label-pill met `dy/dx = … unit/unit`. Lijn zelf wordt door consumer als extra dataset toegevoegd (zie hieronder).

3. **`measureLinesPlugin`** — gebaseerd op modelleren's gelijknamige plugin. Twee verticale lijnen op `x1` en `x2` (cyan + amber). De handles (sleepbare grippen aan de top van elke lijn) zitten **niet** in de plugin — die overlayed het wrapper-component bovenop het canvas met absolute positioning (zie modelleren regels 923–957 voor het patroon).

Registreer alle plugins eenmalig bij module-load.

#### Wrapper-implementatie

`InteractiveChart` is een functional component dat:

- Een `<canvas>` rendert met een wrapper-div voor positionering
- Bij mount: `new Chart(ctx, config)` met `chartjs-plugin-zoom` geregistreerd
- Bij prop-wijzigingen: `chart.options` updaten + `chart.data` updaten + `chart.update('none')` (geen animatie — synchroniseert sneller met playhead)
- Bij unmount: `chart.destroy()`
- Beheert de meet-lijn-handles als absolute-positioned divs binnen de wrapper, sleep-handler via `pointerdown` → window-listeners (patroon uit modelleren)
- Roept `onZoomChange` aan in de `onZoom`/`onPan` callbacks van het zoom-plugin
- Berekent raaklijn via central difference op `series[0].points` rond `tangent.atIdx`, en voegt 'm toe als extra dataset (`{ showLine: true, pointRadius: 0, borderDash: [6,3] }`)

#### As-bounds

Default: auto-fit op data binnen serie-punten (gedimde punten **wel** meenemen om assen niet te laten springen bij dim-toggle). Bij `zoomState` aanwezig: gebruik die. `niceAxis`-helper (uit modelleren) overnemen als utility binnen `_reusable/`.

#### Theme

Kleuren komen uit CSS-variabelen via `getComputedStyle(document.documentElement)` op mount + bij theme-change. Helper `useThemeColors()`. Grid-kleur, tekst-kleur, default lijn-kleur etc. uit CSS-vars. Bij `data-theme`-wisseling: chart herrenderen.

#### Edge-cases

- `series[0].points.length === 0` → render een lege grafiek met assen + "Geen data" centraal
- `series[0].points.length === 1` → render één scatter-dot, geen lijn, geen raaklijn mogelijk (raaklijn-prop wordt genegeerd)
- Resize: `chart.resize()` via `ResizeObserver` op de wrapper

#### Aanvulling in SHARED.md

Voeg toe als nieuwe rij:

| Component | Categorie | Kandidaat-tools | Extractie-status |
|---|---|---|---|
| `InteractiveChart` | data | modelleren (na React-migratie), toekomstige grafische tools | actief — eerste klant videometen |

### 3. Tool-integratie: `Graphs` + `GraphPane`

In `src/features/measurements/Graphs.tsx` en `GraphPane.tsx`. Tool-specifiek, **niet** in `_reusable/`.

#### Grafiektypes

Een mapping `GRAPH_TYPES` definieert per type-key hoe `MeasurementRow[]` → `ChartSeries` + labels:

| key | label | x-bron | y-bron | xLabel | yLabel | line-default |
|---|---|---|---|---|---|---|
| `x-t` | x tegen tijd | `row.t` | `row.x` | `t (s)` | `x ({unit})` | aan |
| `y-t` | y tegen tijd | `row.t` | `row.y` | `t (s)` | `y ({unit})` | aan |
| `vx-t` | vx tegen tijd | `row.t` | `row.vx` | `t (s)` | `vx ({unit}/s)` | aan |
| `vy-t` | vy tegen tijd | `row.t` | `row.vy` | `t (s)` | `vy ({unit}/s)` | aan |
| `vmag-t` | \|v\| tegen tijd | `row.t` | `row.vMag` | `t (s)` | `\|v\| ({unit}/s)` | aan |
| `ax-t` | ax tegen tijd | `row.t` | central-diff van `vx` | `t (s)` | `ax ({unit}/s²)` | uit |
| `ay-t` | ay tegen tijd | `row.t` | central-diff van `vy` | `t (s)` | `ay ({unit}/s²)` | uit |
| `amag-t` | \|a\| tegen tijd | `row.t` | √(ax²+ay²) | `t (s)` | `\|a\| ({unit}/s²)` | uit |
| `y-x` | baan (y tegen x) | `row.x` | `row.y` | `x ({unit})` | `y ({unit})` | aan |

`unit` komt uit `scale.unit`. Versnellingen worden **lokaal in `Graphs.tsx`** berekend (niet in `derive.ts` — daar staat bewust alleen positie + snelheid uit 04).

#### Sub-pane layout

- Container `Graphs` met `react-resizable-panels`
- Default: 2 panes horizontaal naast elkaar (`x-t` links, `y-t` rechts)
- `+`-knop in de container-header: voeg pane toe (type wordt het eerste type uit `GRAPH_TYPES` dat nog niet zichtbaar is, of `vx-t` als alle types al ergens zichtbaar zijn)
- Max 4 panes. Bij 1 over: close-knop disabled
- Layout-progressie:
  - 1 pane: full width
  - 2 panes: 1×2 horizontaal
  - 3 panes: 1×3 horizontaal
  - 4 panes: 2×2 grid (boven + onder, elk 1×2)
- Container-header rechts: kleine toggle "X-as zoom synchroniseren" (default uit). Bij aan: zoom op een t-pane propageert naar andere t-panes (zie §3.5).

#### Pane-header

Per pane bovenaan een compacte balk:

- **Type-dropdown** (links): toont alle 9 types. Versnellings-entries (`ax-t`, `ay-t`, `amag-t`) krijgen een info-icoon met tooltip "Versnelling uit ruwe data is gevoelig voor meetruis. Een functie-fit (komt later) geeft een gladdere afgeleide."
- **Raaklijn-toggle** (knop "ƒ′" of "raaklijn"): toggle. Bij aan + een geselecteerd punt: raaklijn + label
- **Meet-lijnen-toggle** (knop "meten"): toggle. Bij activeren: twee lijnen verschijnen op 25% en 75% van de zichtbare x-range. Sleepbare handles. Onder de grafiek verschijnt een dunne info-balk: `x1 = … · x2 = … · Δx = … · Δy = …`
- **Reset zoom** (↺-knop): klein
- **Close** (×): klein, rechts

#### Pane-body

`<InteractiveChart>` met props uit de pane's state + de globaal-doorgegeven `playheadX`, `selectedIdx`, `hoveredIdx`.

Klik-handlers:
- `onPointClick(_, idx, point)`: lees `point.meta.frame` (door `Graphs` als `meta` meegegeven bij het bouwen van series), call `setCurrentFrame(frame)`
- `onAreaClick(x)`: voor t-grafieken: bereken `frame = Math.round(x * fps) + trimStart`, clamp op `[trimStart, trimEnd]`, `setCurrentFrame(frame)`. Voor `y-x`: doe niets (geen tijd-as)
- `onPointHover`: lees frame uit meta → `setHovered(frame)` via `MeasurementHoverProvider`

#### Gedimde punten

Voor elke `MeasurementRow` met `withinTrim === false`: `point.dimmed = true`. `InteractiveChart` rendert die met opacity ~0.35 en zonder verbindingslijn naar/van.

#### Empty / incomplete state per pane

- Type vereist snelheden maar `< 2` punten? → render placeholder "Meer metingen nodig"
- Type vereist versnellingen maar `< 3` punten? → idem
- Geen punten überhaupt: niet relevant want hele Graphs-component toont dan de overall empty-state

### 4. Cross-pane sync

#### Playhead

In `Graphs`: bereken `playheadX = (currentFrame − trimStart) / fps`. Geef door aan elke pane mét `t` als x-as. Voor `y-x`-panes: geen playhead (er is geen tijd-as om op te projecteren).

#### Hover

Breid `MeasurementHoverProvider` uit zodat grafiek-panes erop reageren. Bij hover in pane → `setHovered(frame)`. Andere panes (en tabel + trail) lichten datzelfde frame op. Mouseleave → `setHovered(null)`.

`selectedIdx` voor de raaklijn = de index in de series die overeenkomt met `currentFrame` (of `hoveredFrame` als dat actueel is). Bij geen actief frame: laatste meting.

#### X-zoom-sync (opt-in)

Wanneer toggle in container-header aan staat: een `onZoomChange` op een t-pane propageert de `xMin`/`xMax` naar alle andere t-panes. `yMin`/`yMax` blijft per pane.

Patroon zoals modelleren regels 1019–1037 (`saveZoomState`). Vermijd ping-pong: een gepropageerde update mag niet opnieuw `onZoomChange` triggeren.

### 5. Update bestaande placeholder

In `App.tsx` / `ThreePaneLayout.tsx`:

- **Rechtsonder-pane**: vervang placeholder door `<Graphs>`
- Bij `points.length === 0`: `<Graphs>` zelf toont "Geen metingen — start met tracken via stap 6"
- Bij `points.length === 1`: `<Graphs>` toont "Voeg minimaal nog één meting toe om grafieken te zien"
- Bij `points.length >= 2`: default twee panes (`x-t` + `y-t`)

### 6. Persistentie van grafiek-layout

Tijdens de sessie: layout (welke panes, welk type per pane, splits, zoom-state) leeft in React-state. **Niet** in localStorage — komt in prompt 06 bij save/load project. Bij nieuwe video: reset naar default (twee panes `x-t` + `y-t`).

---

## Hergebruik-markering

| Kandidaat | Categorie | Beslissing |
|---|---|---|
| `InteractiveChart` | data | **Wel markeren** — generieke interactieve grafiek-component, eerste klant videometen |
| `playheadPlugin`, `tangentPlugin`, `measureLinesPlugin` | data | **Wel markeren** als losse exporten — anderen kunnen Chart.js direct gebruiken en alleen onze plugins importeren |
| `niceAxis` | data | **Wel markeren** als utility — handig bij elke as-handmatige rendering |
| `useThemeColors` | ui | **Wel markeren** — generieke hook voor theme-aware CSS-var-lezing |
| `Graphs` / `GraphPane` | — | **Niet markeren** — tool-specifiek (kent `MeasurementRow`, video-frame-mapping, scale-unit) |

Voeg toe aan `SHARED.md`. Update kolom "kandidaat-tools" met `modelleren (na React-migratie)`.

---

## Niet doen (komt later)

- ❌ Functie-fit (lineair / kwadratisch / sinus / exponentieel) — **prompt 07**
- ❌ Afgeleide-van-fit als alternatieve data-bron — **prompt 07**
- ❌ Save/load JSON van project (incl. grafiek-layout) — **prompt 06**
- ❌ CSV-export — **prompt 06**
- ❌ PNG-export van grafieken — **prompt 06** (gebruikt `chart.toBase64Image()` uit Chart.js, triviaal)
- ❌ Help-paneel — **prompt 06**
- ❌ Modelleren refactoren — apart project
- ❌ Meerdere meetreeksen per grafiek — v3
- ❌ Logaritmische schalen — v3

---

## Acceptatie-criteria

Na `npm run dev`:

### Reusable

- [ ] `src/_reusable/InteractiveChart.tsx` bestaat met JSDoc `@reusable @category data` header
- [ ] Component rendert een Chart.js line-chart met scatter-dots
- [ ] Props `series`, `xLabel`, `yLabel`, `playheadX`, `selectedIdx`, `hoveredIdx`, `tangent`, `measureLines`, `onPointClick`, `onAreaClick`, `onPointHover`, `onZoomChange` werken zoals gespecificeerd
- [ ] Theme-wissel (light/dark) past chart-kleuren live aan
- [ ] Wheel-zoom, pinch-zoom en pan werken via `chartjs-plugin-zoom`
- [ ] `playheadPlugin`, `tangentPlugin` en `measureLinesPlugin` zijn losse exporten en geregistreerd bij module-load
- [ ] `niceAxis` en `useThemeColors` exporteerd uit `_reusable/`
- [ ] Geen tool-specifieke imports in `_reusable/` (geen `MeasurementRow`, geen video-state)

### Tool-integratie

- [ ] Rechtsonder-pane toont default twee grafieken naast elkaar: `x-t` (links) en `y-t` (rechts) bij ≥ 2 metingen
- [ ] Per pane: type-dropdown wisselt het grafiektype real-time
- [ ] Versnellings-types in dropdown hebben een info-tooltip over ruis
- [ ] Raaklijn-toggle per pane werkt; raaklijn toont label `dy/dx = … unit/unit`
- [ ] Meet-lijnen-toggle per pane werkt; twee sleepbare lijnen, info-balk toont x1, x2, Δx, Δy
- [ ] `+`-knop voegt panes toe tot maximaal 4
- [ ] Layout-progressie: 1 full → 2 horizontaal → 3 horizontaal → 4 als 2×2
- [ ] Close-knop per pane werkt; bij 1 over is 'ie disabled
- [ ] Reset-zoom-knop per pane werkt
- [ ] Container-header heeft toggle "X-as zoom synchroniseren"; bij aan synct x-zoom over alle t-panes
- [ ] Playhead = verticale stippellijn op `(currentFrame − trimStart) / fps`, beweegt mee met video-scrub
- [ ] Klik op grafiek-punt springt video naar dat frame
- [ ] Klik in lege grafiek-area van een t-pane springt video naar het dichtstbijzijnde frame
- [ ] Hover op een grafiek-punt highlight datzelfde frame in tabel, trail én andere grafiek-panes
- [ ] Punten buiten trim zijn gedimd in alle grafieken en hebben geen verbindingslijn naar/van
- [ ] Bij scale/origin/angle/trim wijziging worden grafieken automatisch herberekend
- [ ] Bij nieuwe video: grafiek-layout reset naar default
- [ ] Versnellings-grafieken (`ax-t` etc.) zijn beschikbaar maar **niet** default getoond
- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit uit prompts 01–04 blijft intact (tracking, kalibratie, theme, trim, kleur-cycle, tabel)
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **06-export-help**: save/load project als JSON met versienummer (inclusief grafiek-layout!), CSV-export van de tabel, PNG-export per grafiek via `chart.toBase64Image()`, help-paneel in CircuitSketch-accordion-stijl (incl. camera-vereisten-sectie)
- **07-functie-fit**: per grafiek-pane keuze tussen "ruwe data" en "fit" (extra `overlays`-prop op `InteractiveChart`), fit-types lineair / kwadratisch / sinus / exponentieel, fit als doorlopende lijn over de scatter heen, afgeleide-van-fit als bron voor v- en a-grafieken (gladder dan numerieke differentiatie), pedagogische vergelijking ruis vs fit
