# Claude Code prompt 07h — Videometen: Diagnose autozoom + drie-zones (geen fix)

## Context

Na 07f's prop-sync herstructurering en 07g's `excludeFromAutozoom`-fix zijn drie symptomen overgebleven die we niet via code-trace alleen opgelost krijgen:

1. **Auto zoom-knop doet niets** — klik geeft geen reactie, niet in x-t, niet in vx-t. Sinds 07f-herstructurering.
2. **Vx-t en andere afgeleide-panes** krijgen bij initial-load rare bounds (y-as 0 tot 0,026 terwijl vx ≈ 0,5 m/s — pane is dus visueel leeg). Na uitzoomen ontstaat kapotte x-as range (-136 tot +70 s).
3. **Drie-zones inconsistent** — in x-t (screenshot 3 van Jop) loopt de fit-curve niet door buiten de fit-range terwijl er meetpunten zijn die zone B zouden moeten triggeren. In vx-t van diezelfde screenshot loopt zone B wél door. Inconsistent gedrag tussen pane-types.

**Belangrijke instructie: niet proberen te fixen.** Drie eerdere pogingen (07e/07f/07g) hebben deze bugs niet weggekregen of ze gecreëerd. Tijd om eerst écht te meten waar de event-keten breekt of waar de logica afwijkt van wat we verwachten. Fix komt in 07i op basis van Jop's console-output.

Voor context:
- `videometen/prompts/07f-bugs-en-kleur.md` — prop-sync herstructurering met `prevZoomStateRef`
- `videometen/prompts/07g-extrapolatie-bugs-en-exp-weg.md` — `excludeFromAutozoom` flag, drie-zones aanpassing
- `videometen/src/_reusable/InteractiveChart.tsx` — prop-sync useEffect, autozoom logica
- `videometen/src/features/measurements/GraphPane.tsx` — Auto zoom-knop click handler, drie-zones rendering, scatter+fit
- `videometen/src/features/measurements/fits.ts` — `buildFitCurve`, zone-classificatie

---

## Te realiseren

Console-logs op zeven plekken in de event-keten. Alle logs met `[VM/...]`-prefix zodat Jop ze in dev-tools makkelijk kan filteren via `[VM/`.

### Log 1 — Auto zoom-knop click handler

In `GraphPane.tsx`, in de Auto zoom click-handler:

```ts
onClick={() => {
  console.log('[VM/AUTOZOOM] button clicked', {
    paneId: state.id,
    paneType: state.type,
    currentZoomState: state.zoomState,
  })
  // ... bestaande logica die setZoomState(null) of vergelijkbaar aanroept
  updatePane(state.id, { ...state, zoomState: null })
  console.log('[VM/AUTOZOOM] updatePane called with zoomState: null')
}}
```

### Log 2 — Prop-sync useEffect in `InteractiveChart.tsx`

In de useEffect die `zoomState`-prop synct met de chart-options:

```ts
useEffect(() => {
  const chart = chartRef.current
  if (!chart) return

  const zs = propsRef.current.zoomState
  const prev = prevZoomStateRef.current
  const isEqual = isEqualZoomState(zs, prev)

  console.log('[VM/SYNC] prop-sync useEffect', {
    incoming: zs,
    previous: prev,
    isEqual,
    branch: isEqual ? 'PIN-on-chart' : 'USE-cfg-values',
    chartScales: {
      x: { min: chart.scales.x.min, max: chart.scales.x.max },
      y: { min: chart.scales.y.min, max: chart.scales.y.max },
    },
  })

  // ... bestaande logica
  if (isEqual) {
    // PIN branch
    console.log('[VM/SYNC] PIN: keeping chart scales as-is')
    // ... pin logica
  } else {
    // USE-cfg branch
    console.log('[VM/SYNC] USE-cfg: applying', zs ?? 'autozoom (null)')
    // ... cfg logica
  }

  prevZoomStateRef.current = zs
  console.log('[VM/SYNC] prevZoomStateRef updated to', zs)
}, [/* deps */])
```

### Log 3 — Autozoom-bounds berekening in `InteractiveChart.tsx`

Op de plek waar `niceAxis` of vergelijkbare bounds-berekening wordt aangeroepen voor x en y:

```ts
const xBounds = niceAxis(/* x-data */)
console.log('[VM/AUTOZOOM/BOUNDS] x-bounds', {
  inputDataLength: xData.length,
  inputMin: Math.min(...xData),
  inputMax: Math.max(...xData),
  output: xBounds,
})

const yBounds = niceAxis(/* y-data */)
console.log('[VM/AUTOZOOM/BOUNDS] y-bounds', {
  inputDataLength: yData.length,
  inputMin: Math.min(...yData),
  inputMax: Math.max(...yData),
  output: yBounds,
  excludedSeries: series.filter(s => s.excludeFromAutozoom).map(s => s.label),
  includedSeries: series.filter(s => !s.excludeFromAutozoom).map(s => s.label),
})
```

### Log 4 — Scatter-data in afgeleide-panes

In `GraphPane.tsx`, waar de scatter-series wordt opgebouwd voor afgeleide-types:

```ts
// Voor vx-t / vy-t / |v|-t / ax-t / ay-t / |a|-t
const scatterPoints = /* bestaande build */
console.log('[VM/PANE/SCATTER]', {
  paneId: state.id,
  paneType: state.type,
  rowsCount: rows.length,
  scatterPointsCount: scatterPoints.length,
  firstPoint: scatterPoints[0],
  lastPoint: scatterPoints[scatterPoints.length - 1],
  excludeFromAutozoom: false, // of wat het ook is
})
```

### Log 5 — `buildFitCurve` zone-classificatie

In `fits.ts`, in de `classifyZone`-functie (of waar de zones worden opgebouwd):

```ts
function buildFitCurve(/* args */) {
  console.log('[VM/FIT/BUILD] starting buildFitCurve', {
    paneType: type,
    viewTRange,
    fitRange: fits.x?.range ?? fits.y?.range,
    dataTRange: fits.dataTRange,
    showExtrapolation: /* config */,
  })

  // ... sample loop met classifyZone

  console.log('[VM/FIT/BUILD] zones built', {
    zoneA_count: zoneA.length,
    zoneB_count: zoneB.length,
    zoneC_count: zoneC.length,
    firstZoneA: zoneA[0],
    lastZoneA: zoneA[zoneA.length - 1],
    firstZoneB: zoneB[0],
    firstZoneC: zoneC[0],
  })
}
```

### Log 6 — `updatePane` in `GraphsLayoutState.tsx`

Op de plek waar `updatePane` wordt aangeroepen om state te wijzigen:

```ts
function updatePane(id, next) {
  console.log('[VM/STATE] updatePane', {
    id,
    nextZoomState: next.zoomState,
    nextFitConfig: { /* if relevant */ },
  })
  // ... bestaande logica
}
```

### Log 7 — Chart.js scales.x.min/max NA `chart.update()`

In `InteractiveChart.tsx`, direct na `chart.update('none')` in de prop-sync useEffect:

```ts
chart.update('none')
console.log('[VM/SYNC] after chart.update', {
  scalesAfterUpdate: {
    x: { min: chart.scales.x.min, max: chart.scales.x.max },
    y: { min: chart.scales.y.min, max: chart.scales.y.max },
  },
})
```

Dit vertelt of de chart na onze sync ook daadwerkelijk de juiste waardes heeft, of dat 'r tussen sync en render iets misgaat.

---

## Geen fix toepassen

- Geen aanpassingen aan `prevZoomStateRef`-logica
- Geen aanpassingen aan `excludeFromAutozoom`-toepassing
- Geen aanpassingen aan `niceAxis` of bounds-berekening
- Geen aanpassingen aan `buildFitCurve`
- Geen aanpassingen aan Auto zoom-handler
- **Alleen logs erbij** zoals gespecificeerd

Markeer elke log-regel met een korte comment: `// DIAGNOSTIEK 07h — verwijderen na 07i.`

---

## Instructies voor Jop (na uitvoer)

Wanneer 07h gebouwd is, run je deze drie test-scenario's:

### Scenario A: Initial-load afgeleide-pane

1. `npm run dev`, browser openen
2. `F12` → Console, filter `[VM/`
3. Laad video, doe 10+ metingen via tracking, ga naar Verken-modus
4. Voeg nieuwe pane toe via `+` en kies type `vx-t`
5. Selecteer alle `[VM/...]`-logs vanaf de pane-creatie
6. Plak in bericht — labelen als "Scenario A — initial load vx-t"

### Scenario B: Auto zoom-knop

1. Klik op de Auto zoom-knop in x-t pane (of een andere pane waar 't ook niet werkt)
2. Selecteer alle nieuwe `[VM/...]`-logs vanaf de klik
3. Plak in bericht — labelen als "Scenario B — Auto zoom click"

### Scenario C: Drie-zones bij verschillende fit-config

1. Open Fit-popover, zet `yFit` op `quadratic`, fit-range op een sub-deel van trim
2. Vink "Toon extrapolatie buiten meetbereik" aan
3. Open een x-t pane met fit aan
4. Open een vx-t pane met fit aan
5. Selecteer `[VM/FIT/BUILD]`-logs van beide panes
6. Plak in bericht — labelen als "Scenario C — drie-zones vergelijking"

Met deze drie sets logs heb ik genoeg om de root causes voor alle drie de bugs te bepalen.

---

## Acceptatie-criteria

- [ ] Alle zeven log-punten zijn toegevoegd met `[VM/...]`-prefix
- [ ] Comment `// DIAGNOSTIEK 07h — verwijderen na 07i.` boven elke nieuwe log
- [ ] Geen functionele wijzigingen
- [ ] `npm run build` succesvol (logs zijn syntactisch OK)
- [ ] Bestaand gedrag blijft hetzelfde (de bugs blijven bestaan — dat is OK, het gaat om diagnose)

---

## Volgende prompt

**07i** komt op basis van Jop's console-output uit deze drie scenarios. Daar staan de fixes plus opruim van alle 07h-logs.
