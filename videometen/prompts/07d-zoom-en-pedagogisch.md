# Claude Code prompt 07d — Videometen: Zoom-wheel-fix + pedagogische lagen rond fit

## Context

Vervolg na 07c. Vier dingen:

1. **Zoom-wheel race fix** — as-sleep werkt sinds 07c, maar wheel-zoom springt na de actie terug naar de vorige stand. Klassieke controlled-component race: chart's interne zoom-wijziging wordt overschreven door een prop-sync useEffect die de oude `zoomState` terugzet vóór de state-update is doorgekomen.
2. **Dataset-onderscheid in afgeleide-panes met fit aan** — in `vy-t` etc. staan nu scatter (ruwe central-difference) en fit-curve (analytische afgeleide) over elkaar. Visueel niet onderscheidbaar voor leerlingen — beide zijn "een lijn met dots". Pedagogisch waardevol om expliciet te benoemen wat wat is.
3. **Help-sectie uitbreiding** met "Waarom is mijn afgeleide ruisig bij R²=1?" — concrete uitleg van het verschil tussen R² (over positie-fit) en afgeleide-ruis (uit central difference).
4. **Coefficiënt-tooltips in FitInfoBar** — hover op een coefficient (`a`, `b`, `c`, `ω`, etc.) toont fysische betekenis. Voor specifieke gevallen (kwadratisch met `−½g`) wordt de gemeten waarde apart benoemd. Vergelijking met theoretische waardes parkeren naar 07e.

Voor context:
- `videometen/prompts/07c-afgeleide-formule-en-bugs.md` — vorige fix
- `videometen/src/_reusable/InteractiveChart.tsx` — chart-config + prop-sync
- `videometen/src/features/measurements/GraphPane.tsx` — FitInfoBar + scatter/fit-rendering
- `videometen/src/features/help/HelpPanel.tsx` — bestaande secties incl. "Wat zegt R²?"
- `videometen/src/features/measurements/fitFormula.ts` — formule-formattering

---

## Te realiseren

### Tweak 1 — Zoom-wheel race fix

#### Symptoom

Wheel-zoom op een grafiek-pane: chart toont kort de nieuwe zoom, springt dan terug naar de vorige stand. As-sleep heeft dit probleem niet (sinds 07c-fix). Geldt ook bij scroll-uit ná scroll-in: je verliest beide.

#### Diagnose (al uitgewerkt in 07c-vervolg-discussie)

Race tussen twee paden:

1. **Wheel-zoom** wijzigt zoom intern in Chart.js (via `chartjs-plugin-zoom`) → `onZoom`-callback vuurt → `setZoomState` (queued)
2. Vóór die state-update is doorgekomen: een **prop-sync useEffect** ziet `zoomState` (de oude) en schrijft die naar `chart.options.scales.x.min/max` etc. → wheel-wijziging overschreven

As-sleep werkt wel omdat de drag direct via `onZoomChange` de externe state update, in de juiste volgorde — geen race omdat as-sleep zelf de prop-update triggert. Bij wheel zit `chartjs-plugin-zoom` ertussen, dat geeft een microtask-vertraging.

#### Fix-strategie

In `InteractiveChart.tsx`, in de useEffect die `zoomState`-prop naar `chart.options.scales` schrijft:

Voeg een **`lastSyncedZoomStateRef`** toe die bijhoudt welke `zoomState`-waarde we het laatst aan de chart hebben gegeven:

```ts
const lastSyncedZoomStateRef = useRef<ZoomState | null>(null)

// In de prop-sync useEffect:
useEffect(() => {
  const chart = chartRef.current
  if (!chart) return
  const { zoomState } = propsRef.current

  // Skip als 't dezelfde waarde is als we al hebben gepushed
  if (isEqualZoomState(zoomState, lastSyncedZoomStateRef.current)) return

  // Skip als de chart's huidige zoom al overeenkomt met wat we proberen te zetten
  // (= er was net een interne wheel-wijziging die we niet willen overschrijven)
  if (zoomState && isChartZoomEqualTo(chart, zoomState)) {
    lastSyncedZoomStateRef.current = zoomState
    return
  }

  // Sync naar de chart
  if (zoomState) {
    chart.options.scales.x.min = zoomState.xMin
    chart.options.scales.x.max = zoomState.xMax
    chart.options.scales.y.min = zoomState.yMin
    chart.options.scales.y.max = zoomState.yMax
  } else {
    delete chart.options.scales.x.min
    // ... etc voor autozoom
  }
  chart.update('none')
  lastSyncedZoomStateRef.current = zoomState
}, [/* zoomState dependency */])

// In de onZoom-callback van chartjs-plugin-zoom:
onZoom: (event) => {
  const chart = event.chart
  const newZoom = extractZoomState(chart)
  // Markeer als 'laatst gesynced' voordat we de externe state updaten
  lastSyncedZoomStateRef.current = newZoom
  propsRef.current.onZoomChange?.(newZoom)
}
```

Het cruciale punt: bij wheel-zoom updaten we de `lastSyncedZoomStateRef` **vóór** de state-update naar buiten — dus wanneer de prop-sync useEffect daarna fired met de nieuwe state, ziet 'ie dat de chart al gelijk is aan wat 'ie wil zetten, en skipt.

#### Helpers

```ts
function isEqualZoomState(a: ZoomState | null, b: ZoomState | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const tol = 1e-9
  return (
    Math.abs(a.xMin - b.xMin) < tol &&
    Math.abs(a.xMax - b.xMax) < tol &&
    Math.abs(a.yMin - b.yMin) < tol &&
    Math.abs(a.yMax - b.yMax) < tol
  )
}

function isChartZoomEqualTo(chart: Chart, zs: ZoomState): boolean {
  return (
    Math.abs(chart.scales.x.min - zs.xMin) < 1e-9 &&
    Math.abs(chart.scales.x.max - zs.xMax) < 1e-9 &&
    Math.abs(chart.scales.y.min - zs.yMin) < 1e-9 &&
    Math.abs(chart.scales.y.max - zs.yMax) < 1e-9
  )
}

function extractZoomState(chart: Chart): ZoomState {
  return {
    xMin: chart.scales.x.min,
    xMax: chart.scales.x.max,
    yMin: chart.scales.y.min,
    yMax: chart.scales.y.max,
  }
}
```

#### Verificatie

- Wheel-zoom in (rol naar boven) → blijft staan
- Wheel-zoom uit (rol naar beneden) na een eerdere wheel-in → nieuwe stand blijft, geen sprong terug
- As-sleep blijft ook werken (geen regressie)
- Reset-zoom-knop reset alles naar autozoom (geen regressie)
- Cross-pane X-zoom-sync werkt nog: zoom op pane A propageert naar pane B met dezelfde x-as (geen regressie)

#### Comment in code

Korte comment boven de prop-sync useEffect:

```ts
// Race-conditie fix (07d): bij wheel-zoom updatet Chart.js de zoom intern,
// gevolgd door onZoom → setZoomState. Voordat die state-update doorkomt,
// kan deze useEffect fired met de OUDE zoomState en de wheel-wijziging
// overschrijven. lastSyncedZoomStateRef voorkomt dat: bij onZoom markeren
// we direct wat we hebben gepushed, en deze sync skipt als chart's huidige
// zoom al overeenkomt met wat we proberen te zetten.
```

### Tweak 2 — Dataset-onderscheid in afgeleide-panes met fit aan

In afgeleide-panes (`vx-t`, `vy-t`, `|v|-t`, `ax-t`, `ay-t`, `|a|-t`) met `showFit: true` staan twee datasets:

- **Scatter** uit central-difference op ruwe meetpunten — natuurlijk ruisig
- **Fit-curve** analytisch uit positie-fit — glad

Visueel niet onderscheidbaar voor leerlingen. Maak het expliciet:

#### Dataset-labels in Chart.js tooltip

Geef beide datasets een duidelijke `label`-eigenschap. Chart.js' tooltip toont die automatisch bij hover:

- Scatter: `"Ruwe meting"` of `"Uit metingen"`
- Fit-curve: `"Uit fit-model"` of `"Model"`

Tooltip toont dan bij hover op een scatter-dot: `Ruwe meting · t = 0,17 s · vy = −1,37 m/s`. Bij hover op fit-curve: `Uit fit-model · t = 0,17 s · vy = −1,35 m/s`.

#### Permanente legend onder de chart (compact)

Een kleine legend-strook onder de chart, alleen zichtbaar wanneer fit aan staat in een afgeleide-pane:

```
●  Ruwe afgeleide (uit meetpunten — gevoelig voor ruis)
─  Fit-afgeleide (uit wiskundig model — glad)
```

- Compact, één regel per dataset
- Kleur-blok overeenkomstig de scatter (teal-dot) en de curve (amber-lijn)
- Text-stijl: klein, dimmed (`text-muted`), niet opdringerig
- Niet in positie-panes (daar is het verschil trivialer: meetpunten + fit-overlay)
- Niet in `y-x`-panes

Plaatsing: tussen de chart en de FitInfoBar. Hoogte ~20px.

#### Implementatie

In `GraphPane.tsx`:

```tsx
{showFit && isDerivativePane(type) && (
  <DatasetLegend>
    <LegendItem color="trail-current" symbol="dot">
      Ruwe afgeleide (uit meetpunten — gevoelig voor ruis)
    </LegendItem>
    <LegendItem color="accent-amber" symbol="line">
      Fit-afgeleide (uit wiskundig model — glad)
    </LegendItem>
  </DatasetLegend>
)}
```

Helper `isDerivativePane(type)` retourneert `true` voor `vx-t`, `vy-t`, `|v|-t`, `ax-t`, `ay-t`, `|a|-t`.

### Tweak 3 — Help-sectie uitbreiding

In `HelpPanel.tsx`, **direct na de sectie "Wat zegt R²?"** een nieuwe sectie:

#### "Waarom is mijn afgeleide ruisig bij R² = 1?"

> Dit is een veelgestelde vraag — en de uitleg is pedagogisch belangrijk:
>
> **R² beschrijft de positie-fit.** Als je een fit maakt op `y(t)`, zegt R² hoe goed de fit-curve door je positie-meetpunten loopt. Een R² van 1,000 betekent: elke positie-meting valt op de parabool.
>
> **De scatter in `vy-t` of `ay-t` komt uit ruwe meetpunten.** De tool berekent de afgeleide via **central difference**: het verschil tussen twee opeenvolgende metingen. Zelfs als je positie-fit perfect is, zit er natuurlijke variatie in je meetpunten — door pixel-onnauwkeurigheid bij het klikken, of door subtiele timing-verschillen tussen frames. Dat verschil wordt door het differentiëren versterkt.
>
> **De gladde fit-curve in `vy-t` is iets anders.** Die is geen numerieke benadering, maar de **analytische afgeleide** van je positie-fit. Wiskundig exact, geen ruis mogelijk.
>
> **Het verschil tussen scatter en fit-curve is de pedagogische boodschap.** Het laat letterlijk zien waarom we wiskundige modellen gebruiken: ruwe data heeft ruis, het onderliggende fysische gedrag is glad. De fit destilleert de fysica uit de meting.
>
> Bij een experiment met veel meet-ruis (lage R²) zie je: de scatter rommelt sterk rond de fit-curve. Bij een netjes experiment (R² → 1) liggen ze dichter bij elkaar — maar de scatter blijft altijd iets ruisiger door de versterkende werking van differentiëren.

### Tweak 4 — Coefficiënt-tooltips in FitInfoBar

Elke numerieke coefficient in de fit-formule krijgt een hover-tooltip met **fysische betekenis** afhankelijk van het fit-type + de positie van de coefficient.

#### Tooltip-content per fit-type

**Lineair** `y(t) = a · t + b`:
- `a`: "**Snelheid** — toename van y per seconde (m/s als y in meter)"
- `b`: "**Startwaarde** — y op tijdstip t = 0"

**Kwadratisch** `y(t) = a · t² + b · t + c`:
- `a`: "**Halve versnelling** — als dit een y(t)-fit van een vallend voorwerp is, dan is je gemeten zwaartekracht **g = {abs(2a)} m/s²** (theoretisch 9,81 m/s²)"
- `b`: "**Startsnelheid** in y-richting (m/s)"
- `c`: "**Startwaarde** — y op tijdstip t = 0"

**Sinus** `y(t) = A · sin(ω · t + φ) + C`:
- `A`: "**Amplitude** — maximale uitwijking vanaf het midden"
- `ω`: "**Hoekfrequentie** (rad/s). Periode T = 2π/ω = **{2π/ω} s**, frequentie f = ω/2π = **{ω/(2π)} Hz**"
- `φ`: "**Faseverschuiving** (rad) — bepaalt waar in de cyclus t = 0 valt"
- `C`: "**Middelwaarde** — het centrum waar de oscillatie omheen schommelt"

**Exponentieel** `y(t) = A · e^(k · t) + C`:
- `A`: "**Beginafwijking** vanaf de asymptoot"
- `k`: "**Vervalconstante** (1/s). Tijdconstante τ = −1/k = **{-1/k} s** — tijd waarin de afwijking met factor 1/e (~37%) verkleind is"
- `C`: "**Asymptoot** — waar de curve naartoe gaat bij grote t"

#### Speciale dynamische berekeningen

In de tooltip-tekst worden de **uitkomsten** ingevuld:

- Kwadratisch `a = −4,90`: tooltip toont *"je gemeten zwaartekracht g = 9,80 m/s² (theoretisch 9,81 m/s²)"*
- Sinus `ω = 6,28`: tooltip toont *"Periode T = 1,00 s, frequentie f = 1,00 Hz"*
- Exponentieel `k = −3,00`: tooltip toont *"Tijdconstante τ = 0,33 s"*

#### Implementatie

In `FitInfoBar.tsx` (of `fitFormula.ts`): de formule wordt nu geparsed als reeks **tokens** (coefficient-numbers + tekst-tussenstukken) zodat we per coefficient een hover-tooltip kunnen koppelen.

```ts
type FormulaToken =
  | { kind: 'text'; value: string }   // bv. " · t² + "
  | { kind: 'coefficient'; value: number; label: string; tooltip: string }
```

`formatFitFormulaTokens(fit, derivative, varName)` genereert deze token-lijst. De FitInfoBar rendert ze:

```tsx
{tokens.map((tok, i) =>
  tok.kind === 'text'
    ? <span key={i}>{tok.value}</span>
    : <Tooltip key={i} content={tok.tooltip}>
        <span className="underline decoration-dotted cursor-help">{formatNumber(tok.value)}</span>
      </Tooltip>
)}
```

Hover-feedback: stippellijn onder de coefficient + `cursor-help`, consistent met de R²-tooltip uit 07c.

#### Conditionele uitleg

Niet elke coefficient krijgt een "g = X m/s²"-vermelding — alleen als pane-type + derivative-niveau passen bij het fysisch geval. Specifiek:

- `y-t` pane met kwadratische fit: `a` tooltip vermeldt zwaartekracht-interpretatie
- `x-t` pane met kwadratische fit: `a` tooltip vermeldt alleen "Halve versnelling" (geen g-context, want x is horizontaal)
- `x-t` of `y-t` pane met lineaire fit: `a` is snelheid in die richting

Dit voorkomt dat we onzin schrijven (zwaartekracht-uitleg bij een horizontale baan zou misleidend zijn).

#### Niet doen in deze prompt

- Geen vergelijking met andere theoretische waardes dan `g = 9,81` (komt eventueel in 07e met presets)
- Geen interactieve sliders waarmee leerling coefficiënten zelf zet
- Geen "wist je dat?"-uitklap-blokken — alleen hover-tooltips

---

## Niet doen (parkeren naar later)

- ❌ Presets per fysisch scenario (vrije val / slinger / RC-circuit) met verwachte waarde-vergelijkingen — **07e**
- ❌ Interactieve sliders voor handmatige coefficient-aanpassing — **07e of later**
- ❌ Wijziging aan fit-algoritme of fit-types
- ❌ Wijziging aan tracking, kalibratie, tabel, export, help-paneel-structuur (alleen sectie toevoegen)

---

## Acceptatie-criteria

### Zoom-wheel race fix

- [ ] Wheel-scroll op chart: zoom-in blijft staan
- [ ] Wheel-scroll na eerdere wheel-in: zoom-uit blijft staan, geen sprong terug
- [ ] As-sleep blijft werken (geen regressie sinds 07c)
- [ ] Reset-zoom knop reset naar autozoom (geen regressie)
- [ ] Cross-pane X-zoom-sync werkt nog (geen regressie)
- [ ] `lastSyncedZoomStateRef` en helper-functies zijn aanwezig met comment uitleg

### Dataset-onderscheid

- [ ] In afgeleide-panes met `showFit: true`: legend-strook onder de chart toont twee items met kleur-symbolen
- [ ] Chart.js tooltip op hover toont dataset-label ("Ruwe meting" of "Uit fit-model")
- [ ] Niet zichtbaar in positie-panes (`x-t`, `y-t`, `y-x`)
- [ ] Niet zichtbaar wanneer fit uit staat

### Help-sectie

- [ ] Nieuwe sectie "Waarom is mijn afgeleide ruisig bij R² = 1?" staat direct na "Wat zegt R²?"
- [ ] Tekst zoals gespecificeerd, leesbaar in modal-body

### Coefficiënt-tooltips

- [ ] Elke numerieke coefficient in de fit-formule heeft dotted-underline + cursor-help
- [ ] Hover toont fysische betekenis-tooltip
- [ ] Voor kwadratische `y-t` fit: `a`-tooltip vermeldt gemeten zwaartekracht met formule en theoretische waarde
- [ ] Voor sinus `ω`-tooltip: berekende periode en frequentie
- [ ] Voor exponentieel `k`-tooltip: berekende tijdconstante
- [ ] Horizontale (`x-t`) fits krijgen geen zwaartekracht-uitleg

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **07e**: presets per fysisch scenario (vrije val, horizontale worp, slinger, RC-circuit) met verwachte waardes en interactieve vergelijking; eventueel sliders voor handmatige coefficient-aanpassing als ontdek-modus
- **08-meerdere-meetreeksen**: multi-series datamodel
- **09-ui-polish**: heroverwegen werkbalk-indeling
