# Claude Code prompt 05g — Videometen: Tracking-start fix + klik-bug diagnostiek

## Context

Patch-prompt na 05f. Twee dingen:

1. **Tracking-start frame** — momenteel start "▶ Start tracking" vanaf `currentFrame` als die `>= trimStart` is. Logischer: altijd vanaf `trimStart` starten, zodat een tracking-sessie consistent bij het begin van de trim begint, ongeacht waar de gebruiker in analyse-modus stond te kijken.
2. **Klik-bug op grafiek-punt** — drie fix-pogingen (05c, 05e, 05f) hebben 'm niet weggekregen. Tijd om te stoppen met gokken en met live console-output te meten waar de event-keten breekt. **Deze prompt voegt alleen logging toe, geen fix.** Daarna runt Jop het en deelt de console-output; op basis daarvan komt er een definitieve fix in 05h.

Voor context:
- `videometen/prompts/05f-klikbug-en-video-laden.md` — laatste fix-poging met `findNearestSeriesHit`
- `videometen/src/_reusable/InteractiveChart.tsx` — chart-event handlers
- `videometen/src/features/measurements/GraphPane.tsx` — `handlePointClick` die `setFrame` aanroept
- `videometen/src/App.tsx` of waar `onStartTracking` zit

---

## Te realiseren

### Tweak 1 — Tracking-start altijd op trimStart

Huidige logica (uit 03):

```ts
if (mode === 'analyse' && currentFrame < trimStart) {
  setFrame(trimStart, { skipSnap: true })
}
setMode('tracking')
```

Vervang door:

```ts
setFrame(trimStart, { skipSnap: true })  // altijd, ongeacht currentFrame
setMode('tracking')
```

Reden: tracking is een nieuwe sessie waarin de leerling chronologisch door zijn meet-bereik wil. Vanaf welk frame ze in analyse-modus zaten te kijken is irrelevant.

Documenteer in een korte comment: `// Tracking begint altijd bij trimStart — consistente startpositie ongeacht analyse-state`.

### Tweak 2 — Console-logging voor klik-bug (GEEN FIX)

**Belangrijk: niet proberen de bug te fixen.** Voeg alleen logging toe. De fix komt in 05h op basis van de console-output die Jop deelt.

#### Logs in `InteractiveChart.tsx`

Op zes plekken in `onChartEvent` (of waar de chart-event-handlers leven):

```ts
// Direct in onClick:
onClick: (event, _activeEls, chart) => {
  const native = event.native as PointerEvent | undefined
  console.log('[VM/CHART] onClick fired', {
    hasNative: !!native,
    cursorPx: native ? cursorPx(native, chart) : null,
    seriesCount,
    datasetCount: chart.data.datasets.length,
  })
  // ... bestaande logica
}

// Direct na de findNearestSeriesHit aanroep in onClick:
const hit = findNearestSeriesHit(chart, cx, cy, seriesCount)
console.log('[VM/CHART] findNearestSeriesHit result', {
  hit,
  hitRadiusPx: POINT_HIT_RADIUS_PX,
  metaDataCounts: chart.data.datasets.slice(0, seriesCount).map(d =>
    chart.getDatasetMeta(chart.data.datasets.indexOf(d)).data.length
  ),
})

// Direct vóór onPointClick wordt aangeroepen:
if (hit && propsRef.current.onPointClick) {
  const point = propsRef.current.series[hit.seriesIdx].points[hit.pointIdx]
  console.log('[VM/CHART] calling onPointClick', {
    seriesIdx: hit.seriesIdx,
    pointIdx: hit.pointIdx,
    point,
    meta: point.meta,
  })
  propsRef.current.onPointClick(hit.seriesIdx, hit.pointIdx, point)
}

// Idem voor onHover (parallel pad), zodat we het verschil tussen klik en hover kunnen vergelijken:
onHover: (event, _activeEls, chart) => {
  const native = event.native as PointerEvent | undefined
  if (!native) return
  const { x: cx, y: cy } = cursorPx(native, chart)
  const hit = findNearestSeriesHit(chart, cx, cy, seriesCount)
  console.log('[VM/CHART] onHover', { hit })
  // ... bestaande logica
}
```

#### Logs in `GraphPane.tsx`

In de `handlePointClick`-functie (of hoe 'ie ook heet) die `setFrame` aanroept:

```ts
const handlePointClick = (seriesIdx, pointIdx, point) => {
  console.log('[VM/PANE] handlePointClick received', {
    paneId,
    type,
    seriesIdx,
    pointIdx,
    point,
    metaFrame: point.meta?.frame,
  })
  if (point.meta?.frame !== undefined) {
    console.log('[VM/PANE] calling setFrame', { frame: point.meta.frame })
    setFrame(point.meta.frame)
  }
}
```

#### Logs in `VideoState.tsx` (in de reducer)

In het `SET_FRAME`-pad:

```ts
case 'SET_FRAME': {
  const { frame, skipSnap } = action
  const snapped = (skipSnap || !state.snapEnabled || state.snapFrames.length === 0)
    ? frame
    : maybeSnap(frame, state)
  console.log('[VM/VIDEO] SET_FRAME', {
    incoming: frame,
    skipSnap: !!skipSnap,
    snapEnabled: state.snapEnabled,
    snapFramesCount: state.snapFrames.length,
    snapped,
    previousCurrentFrame: state.currentFrame,
  })
  return { ...state, currentFrame: snapped }
}
```

#### Geen fix toepassen

Dit is een **diagnose-prompt**. Geen wijzigingen aan `findNearestSeriesHit`, geen aanpassingen aan de hit-detection, geen herstructurering van event-handlers. Alleen logs erbij.

#### Logs duidelijk gelabeld

Alle logs beginnen met `[VM/...]` (Videometen-prefix + sub-systeem) zodat Jop ze in de browser-console makkelijk kan filteren via `[VM/`.

---

## Instructies voor Jop (na uitvoer van deze prompt)

Wanneer 05g succesvol gebouwd is:

1. Open de tool in je browser (`npm run dev` URL)
2. Druk op **`F12`** om dev-tools te openen
3. Klik op het tabblad **"Console"** bovenin dev-tools
4. Optioneel: typ `[VM/` in het filter-vakje om alleen de relevante logs te zien
5. Laad een video, doe een paar metingen zodat er dots in de grafieken staan
6. **Hover** eerst over een grafiek-dot (zie je `[VM/CHART] onHover` logs verschijnen?)
7. **Klik** dan op diezelfde dot (zie je `[VM/CHART] onClick fired`, gevolgd door de andere logs?)
8. Kopieer de logs van die klik (selecteer met muis → rechtermuisknop → "Copy" of `Ctrl+C`) en plak ze in een bericht naar Claude

Wat we verwachten te zien als alles werkt:
- `[VM/CHART] onClick fired` (event komt door)
- `[VM/CHART] findNearestSeriesHit result` met een `hit`-object (detectie werkt)
- `[VM/CHART] calling onPointClick` (handler-call gebeurt)
- `[VM/PANE] handlePointClick received` (pane ontvangt 't)
- `[VM/PANE] calling setFrame` (setFrame wordt aangeroepen)
- `[VM/VIDEO] SET_FRAME` (reducer verwerkt 't)

Waar de keten precies stopt, vertelt waar de bug zit.

---

## Niet doen

- ❌ **Geen poging om de klik-bug te fixen** — alleen logs toevoegen
- ❌ Geen wijzigingen aan andere features
- ❌ Geen logs in productie-code laten staan — maar verwijder ze nog niet (komt in 05h na de fix)
- ❌ Geen logging-framework toevoegen — gewoon `console.log`

---

## Acceptatie-criteria

### Tracking-start

- [ ] "▶ Start tracking" springt altijd naar `trimStart`, ongeacht waar `currentFrame` stond
- [ ] Comment in de code legt uit waarom (consistente startpositie)
- [ ] Bestaande exit-tracking-flow (Escape, exit-knop) blijft onveranderd

### Diagnostiek

- [ ] Alle zes log-punten zijn toegevoegd zoals gespecificeerd, met `[VM/...]`-prefix
- [ ] Logs verschijnen consistent bij klik en hover
- [ ] Geen daadwerkelijke fix aan de klik-detectie
- [ ] Geen TS-errors of build-warnings

### Algemeen

- [ ] `npm run build` succesvol
- [ ] Bestaande functionaliteit blijft intact (alleen logs zijn nieuw + tracking-start gedrag)

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **05h**: definitieve fix klik-bug op basis van Jop's console-output uit 05g. Verwijdert ook alle toegevoegde logs.
- **06-export-help**: save/load project als JSON, CSV-export tabel, PNG-export grafiek, help-paneel
- **07-functie-fit**: fit-types en afgeleide-van-fit
- **08-meerdere-meetreeksen**: multi-series datamodel
- **09-ui-polish**: heroverwegen werkbalk-indeling
