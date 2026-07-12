# Claude Code prompt 07l — Videometen: Zoom-stack refactor (chart-als-autoriteit)

## Context

Na vijf pogingen (07f → 07g → 07i → 07j → 07k) op de zoom-state-sync via prop-driven useEffects blijven we nieuwe edge-cases creëren. Elke fix lost iets op en breekt iets anders. De huidige architectuur — een continue prop-sync useEffect met PIN/USE-cfg branches die per render `chart.options.scales` overschrijft — is fundamenteel race-gevoelig omdat React's render-cycle, chartjs-plugin-zoom's emit-cycle, en onze state-update-cycle elk hun eigen timing hebben.

**Tijd voor een fundamentele refactor.** Maak de Chart.js-instance de autoritatieve eigenaar van zoom-state. Geen continue prop-sync. Externe communicatie loopt via expliciete triggers en emits.

Met Jop is een **eisen-inventarisatie** van 18 punten opgesteld die in stand moeten blijven na de refactor. Acceptatie verifieert ze allemaal.

Voor context:

- `videometen/prompts/07k-extrapolatie-altijd-en-mouseleave-fix.md` — laatste poging
- `videometen/src/_reusable/InteractiveChart.tsx` — alle prop-sync logica hier
- `videometen/src/features/measurements/GraphPane.tsx` — Auto zoom-knop, pane-state
- `videometen/src/features/measurements/GraphsLayoutState.tsx` — zoom-state per pane voor save/load

---

## Doel

**Nieuwe architectuur in één zin**: Chart-instance is autoritatieve eigenaar. Externe `zoomState` wordt alleen bij mount geconsumeerd. Wijzigingen lopen via emit (chart → parent) en triggers (parent → chart), niet via continue prop-sync.

---

## Te realiseren

### 1. `InteractiveChart` prop-interface refactor

#### Oude props (te verwijderen)

```ts
zoomState: ZoomState | null   // continue prop, oorzaak van alle races
onZoomChange: (zs) => void    // blijft conceptueel, signatuur wijzigt
```

#### Nieuwe props

```ts
initialZoomState?: ZoomState | null
// Alleen bij mount geconsumeerd. Bij latere wijzigingen genegeerd.
// Voor mode-switch / project-load: pane wordt remount, nieuwe waarde toegepast.

onZoomChange: (zs: ZoomState | null) => void
// Emit bij elke interne wijziging: wheel, pan, as-sleep.
// Reset emit: null.

resetTrigger?: number
// Counter. Bij wijziging: chart.resetZoom('none') aangeroepen.
// Auto zoom-knop in GraphPane increment 'm.
```

### 2. Mount-logica

In `buildConfig`: gebruik `initialZoomState` om `cfg.options.scales.x/y.min/max` te zetten. Als `null` of `undefined`: gebruik `niceAxis`-autozoom-bounds.

```ts
function buildConfig(props, initialZs) {
  const cfg = {
    /* basis */
  };
  if (initialZs) {
    cfg.options.scales.x.min = initialZs.xMin;
    cfg.options.scales.x.max = initialZs.xMax;
    cfg.options.scales.y.min = initialZs.yMin;
    cfg.options.scales.y.max = initialZs.yMax;
  } else {
    // niceAxis-autozoom op data-bounds
    cfg.options.scales.x.min = xBounds.min;
    cfg.options.scales.x.max = xBounds.max;
    cfg.options.scales.y.min = yBounds.min;
    cfg.options.scales.y.max = yBounds.max;
  }
  return cfg;
}
```

Dit wordt alleen bij **mount** uitgevoerd (in `useEffect(() => {}, [])` die `new Chart(ctx, cfg)` aanroept).

### 3. Verwijder de prop-sync useEffect volledig

Alle bestaande logica met PIN/USE-cfg branches, `prevZoomStateRef`, `lastSyncedZoomStateRef`, `chartOwnsZoomRef` (als sync-onderdeel) — **weg**.

Dit is het cruciale punt: geen continue sync van props naar chart-scales meer. Niemand schrijft `chart.options.scales.x/y.min/max` bij elke render. De chart bepaalt zelf wat 'ie toont.

### 4. Emit-mechanisme blijft

`emitZoom` (de callback voor chartjs-plugin-zoom's `onZoom` en `onPan`) blijft bestaan, maar simpler:

```ts
function emitZoom() {
  const chart = chartRef.current;
  if (!chart) return;
  const zs = extractZoomState(chart); // {xMin, xMax, yMin, yMax}
  propsRef.current.onZoomChange?.(zs);
  // GEEN sync terug. Chart heeft 't al gewijzigd.
}
```

As-sleep handlers (in `AxisOverlays`) emit ook via `onZoomChange(zs)` zoals nu. Geen wijziging nodig daar.

### 5. Reset-trigger useEffect

Nieuwe useEffect die alleen op `resetTrigger`-wijzigingen luistert:

```ts
useEffect(() => {
  if (resetTrigger === undefined) return; // initial-mount: niet triggeren
  const chart = chartRef.current;
  if (!chart) return;

  chart.resetZoom("none"); // chartjs-plugin-zoom API
  propsRef.current.onZoomChange?.(null); // emit reset naar parent voor opslag
}, [resetTrigger]);
```

### 6. Data-wijziging detection voor eis 10

Bij data-wijziging (nieuwe meetpunten toegevoegd, of fit-config wijziging): wil je dat autozoom **refit** zolang de gebruiker niet zelf gezoomd heeft, maar **behoud** als wel.

Nieuwe useEffect:

```ts
useEffect(
  () => {
    const chart = chartRef.current;
    if (!chart) return;

    // Bij data-update: chart.update om datasets te tonen
    chart.data = newCfg.data;
    chart.update("none");

    // Refit-check: als gebruiker niet gezoomd heeft, autozoom-refit
    const userHasZoomed = isUserZoomed(chart);
    if (!userHasZoomed) {
      chart.resetZoom("none"); // herberekent scales op nieuwe data
    }
  },
  [
    /* data-deps zoals series content */
  ],
);
```

#### `isUserZoomed(chart)` helper

```ts
function isUserZoomed(chart: Chart): boolean {
  // Primaire: chartjs-plugin-zoom API
  const fn = (chart as any).isZoomedOrPanned;
  if (typeof fn === "function") {
    return fn.call(chart);
  }
  // Fallback: gebruik een ref die bij emit getrackt wordt
  return userZoomedRef.current;
}
```

`userZoomedRef`: simpele ref die bij `emitZoom` op `true` wordt gezet, en bij `chart.resetZoom` op `false`. Robuust als de plugin-API mist.

### 7. `GraphPane` aanpassingen

#### Auto zoom-knop

```ts
const [resetCounter, setResetCounter] = useState(0)

function handleAutoZoom() {
  setResetCounter(c => c + 1)
}

return (
  <InteractiveChart
    initialZoomState={pane.zoomState}
    resetTrigger={resetCounter}
    onZoomChange={(zs) => updatePane({ ...pane, zoomState: zs })}
    /* ... andere props */
  />
)
```

#### Save/load via state

- Bij interne wijziging (wheel/pan/as-sleep): `onZoomChange(zs)` → `updatePane({ zoomState: zs })` → `GraphsLayoutState` bewaart voor save
- Bij Auto zoom: `onZoomChange(null)` → `updatePane({ zoomState: null })`
- Bij mode-switch / pane re-add: pane re-mount → `initialZoomState` wordt gelezen uit pane-state → chart start in opgeslagen stand
- Bij project-load: applyProject zet pane.zoomState → bij volgende render: niet effectief voor bestaande chart. Project-load triggert in deze prompt geen aparte zoom-update aan de chart. Voor nu accepteren we dat project-load alleen werkt bij re-mount (= bij vervangen van video of mode-switch direct daarna). **In toekomst** een aparte `zoomFromProject`-trigger toevoegen als nodig, maar binnen 07l is dat buiten scope.

### 8. Verwijder dode code

Na de refactor moeten verdwijnen:

- Prop-sync useEffect (alle branches)
- `prevZoomStateRef`
- `lastSyncedZoomStateRef`
- `chartOwnsZoomRef` (als sync-onderdeel; kan blijven als `userZoomedRef` voor eis 10 fallback)
- Helper-functies `isEqualZoomState`, `isChartZoomEqualTo` als ze niet meer gebruikt worden
- Alle PIN/USE-cfg branches en logica

#### Hygiëne-check

Tijdens uitvoer rondkijken op stale code, comments die niet meer kloppen, ongebruikte imports. Documenteer in rapport.

### 9. `chartApiRef` voor toekomst

Optioneel: expose een `chartApiRef` via een `forwardRef` of `imperativeHandle` met methodes:

- `resetZoom()`
- `setZoom(zs)` (voor project-load in toekomst)

In 07l alleen aanmaken als triviaal, anders geparkeerd. Belangrijkste is dat de basis-architectuur staat — geavanceerde external triggers kunnen later.

---

## Acceptatie-criteria (gemapt op eisen 1-18)

### Interactie-paden

- [ ] **1. Wheel-zoom**: scroll wijzigt chart-stand. Blijft staan na release én bij mouseleave. Emit naar parent voor opslag.
- [ ] **2. Pan binnen chart**: drag wijzigt stand. Blijft staan na release én bij mouseleave. Emit naar parent.
- [ ] **3. As-sleep** (x en y): pan middel, zoom uiteinden. Emit naar parent.
- [ ] **4. Auto zoom-knop**: reset naar autozoom werkt. Emit `null` naar parent.
- [ ] **5. Project-load**: opgeslagen zoom-state per pane wordt toegepast bij mount na load (re-mount van pane gegarandeerd door pane-vervanging na video-replace).
- [ ] **6. Initial mount**: nieuwe pane krijgt autozoom op basis van data.

### Stabiliteit

- [ ] **7. Mouseleave**: geen reset, zoom blijft.
- [ ] **8. Mode-switch Verken↔Analyseren**: zoom per pane overleeft via `GraphsLayoutState` + remount met `initialZoomState`.
- [ ] **9. Fit-toggle / Lijn-toggle / Raaklijn-toggle**: geen reset.
- [ ] **10. Nieuwe meting toegevoegd**:
  - Niet gezoomd → autozoom refit (bounds updaten naar nieuwe data)
  - Wel gezoomd → behoud zoom-stand
- [ ] **11. Tabel-klik / pijltjes-navigatie / scrubber**: geen reset.
- [ ] **12. Hover-state cleanup (setHoveredIdx(null))**: geen reset.

### Drie-zones

- [ ] **13. `viewTRange`** afgeleid van werkelijke `chart.scales.x.min/max` (niet van props). Zones B/C op juiste posities.
- [ ] **14. Zone C extrapolatie**: altijd 30% uitgerekt voorbij data-range.
- [ ] **15. `excludeFromAutozoom: "y"`**: zone C telt mee voor x-bounds, niet voor y-bounds.

### Save/load

- [ ] **16. Emit naar parent** bij elke interne wijziging, voor opslag in `GraphsLayoutState`.
- [ ] **17. Project-load**: opgeslagen zs uit JSON wordt toegepast (via re-mount).

### Plugin-API

- [ ] **18. `isUserZoomed` met fallback**: gebruikt `chart.isZoomedOrPanned()` als beschikbaar, anders `userZoomedRef`.

### Hygiëne

- [ ] Prop-sync useEffect, `prevZoomStateRef`, `lastSyncedZoomStateRef`, `chartOwnsZoomRef` (als sync-onderdeel) verwijderd
- [ ] Geen dood code, stale comments
- [ ] Comments documenteren de nieuwe architectuur

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Niet doen

- ❌ Geen wijzigingen aan fit-types, tracking, kalibratie, tabel, export
- ❌ Geen nieuwe features buiten de architectuur-refactor
- ❌ Geen `zoomFromProject`-trigger via ref (parkeer naar toekomst tenzij triviaal)

---

## Volgende prompts

- **08-werkbalk-en-video-polish**: compacte werkbalk, video-laden bugs
- **09-presets**: per scenario
- **10-meerdere-meetreeksen**: multi-series datamodel
