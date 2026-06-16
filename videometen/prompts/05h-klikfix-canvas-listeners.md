# Claude Code prompt 05h — Videometen: Klik-bug fix via directe canvas-listeners

## Context

Patch-prompt na 05g. De diagnostische logs uit 05g hebben de root cause aangewezen:

**Chart.js' `options.onClick` en `options.onHover` worden niet aangeroepen** ondanks dat het canvas events ontvangt (geverifieerd via DOM-inspect: canvas zit bovenop, alle overlays hebben `pointer-events: none`). De bug zit dus in Chart.js' event-routing zelf, niet in een DOM-niveau obstructie.

**Strategie: omzeilen.** In plaats van verder graven in Chart.js' interne event-systeem (waarvan we niet weten waarom 't faalt — gewijzigde `events`-array, gestale closure, plugin-conflict?), vervangen we de `options.onClick`/`onHover` door **directe `canvas.addEventListener`-luisteraars**. Dat geeft volledige controle en is robuuster voor toekomstig onderhoud.

Voor context:
- `videometen/prompts/05f-klikbug-en-video-laden.md` — vorige fix-poging met `findNearestSeriesHit`
- `videometen/prompts/05g-tracking-start-en-klikdiagnose.md` — diagnostiek
- `videometen/src/_reusable/InteractiveChart.tsx` — chart-event handlers + propsRef + findNearestSeriesHit

---

## Te realiseren

### Tweak 1 — Directe canvas-listeners (fix klik-bug)

In `InteractiveChart.tsx`:

#### 1. Verwijder Chart.js' `options.onClick` en `options.onHover`

Uit de chart-config alle event-handler-options weghalen:

```ts
// Verwijderen uit options-object:
// onClick: (event, ...) => ...
// onHover: (event, ...) => ...
```

Behoud wel `options.plugins.tooltip` (Chart.js' eigen tooltip-engine blijft werken — die hangt niet aan onHover) en `options.interaction` (mode/intersect blijven van invloed op tooltip-positie).

#### 2. Voeg `useEffect` toe voor directe canvas-listeners

Na de chart-creatie (binnen het bestaande `useEffect` waarin de chart wordt aangemaakt, of een nieuwe `useEffect` met afhankelijkheid op de chart-instance):

```ts
useEffect(() => {
  const chart = chartRef.current
  if (!chart) return
  const canvas = chart.canvas as HTMLCanvasElement
  if (!canvas) return

  const handleClick = (e: PointerEvent) => {
    const { x: cx, y: cy } = cursorPx(e, chart)
    const seriesCount = propsRef.current.series.length
    const hit = findNearestSeriesHit(chart, cx, cy, seriesCount)

    if (hit && propsRef.current.onPointClick) {
      const point = propsRef.current.series[hit.seriesIdx].points[hit.pointIdx]
      propsRef.current.onPointClick(hit.seriesIdx, hit.pointIdx, point)
      return
    }

    // Fallback: leeg gebied → onAreaClick met geinterpoleerde x
    if (propsRef.current.onAreaClick && chart.scales.x) {
      const xValue = chart.scales.x.getValueForPixel(cx)
      if (xValue !== undefined) {
        propsRef.current.onAreaClick(xValue)
      }
    }
  }

  const handleMove = (e: PointerEvent) => {
    const { x: cx, y: cy } = cursorPx(e, chart)
    const seriesCount = propsRef.current.series.length
    const hit = findNearestSeriesHit(chart, cx, cy, seriesCount)

    if (propsRef.current.onPointHover) {
      if (hit) {
        const point = propsRef.current.series[hit.seriesIdx].points[hit.pointIdx]
        propsRef.current.onPointHover({
          seriesIdx: hit.seriesIdx,
          pointIdx: hit.pointIdx,
          point,
        })
      } else {
        propsRef.current.onPointHover(null)
      }
    }
  }

  const handleLeave = () => {
    propsRef.current.onPointHover?.(null)
  }

  canvas.addEventListener('click', handleClick)
  canvas.addEventListener('pointermove', handleMove)
  canvas.addEventListener('pointerleave', handleLeave)

  return () => {
    canvas.removeEventListener('click', handleClick)
    canvas.removeEventListener('pointermove', handleMove)
    canvas.removeEventListener('pointerleave', handleLeave)
  }
}, [/* dependency op chartRef.current of de chart-instance-creatie */])
```

**Belangrijke notes:**

- Gebruik `propsRef.current.*` voor callbacks zodat de listeners niet hoeven te re-mounten bij prop-wijzigingen
- Cleanup-functie verwijdert listeners + chart.destroy() blijft elders zoals 't is
- Event-type: `'click'` voor klik (PointerEvent in moderne browsers), `'pointermove'` voor hover, `'pointerleave'` voor mouseleave-equivalent
- `cursorPx(e, chart)` en `findNearestSeriesHit(chart, cx, cy, seriesCount)` worden hergebruikt — geen wijzigingen daar nodig

#### 3. Verifieer dat Chart.js' tooltip nog werkt

Chart.js' built-in tooltip hangt aan zijn eigen interaction-pad (niet aan onHover). Verifieer dat de tooltip nog correct verschijnt bij hover over een dot — die functie was niet kapot in de diagnostiek (`[VM/CHART] onHover` werd niet gefired maar de tooltip kwam wel op, vermoedelijk omdat Chart.js de tooltip via een ander intern pad rendert). Niets te veranderen, alleen visueel controleren.

### Tweak 2 — Diagnostische logs opruimen

Verwijder alle `console.log`-statements met `[VM/...]`-prefix uit:

- `InteractiveChart.tsx`
- `GraphPane.tsx`
- `VideoState.tsx`

Plus de `// DIAGNOSTIEK 05g — verwijderen na 05h.`-comments en `// eslint-disable-next-line no-console` regels.

Niets anders aanraken in die bestanden.

### Tweak 3 — Documenteer de root cause + fix

In `InteractiveChart.tsx`, boven het useEffect met de canvas-listeners, een korte comment:

```ts
// Chart.js' options.onClick/onHover bleek niet betrouwbaar te vuren in deze setup
// (zie diagnostiek 05g — canvas ontving events maar handlers werden niet aangeroepen,
// vermoedelijk een plugin-of-config-conflict). Directe canvas-listeners zijn
// robuuster en geven volledige controle over hit-detection en callbacks.
```

Geen referentie naar prompts 05c/05e/05f's tussenstadia — die zijn al opgeruimd. Alleen de huidige werkende oplossing documenteren.

---

## Niet doen

- ❌ Geen wijziging aan `findNearestSeriesHit`, `cursorPx`, of `POINT_HIT_RADIUS_PX`
- ❌ Geen wijziging aan Chart.js-options buiten `onClick` en `onHover` weghalen
- ❌ Geen wijziging aan AxisOverlays of mouse-zone-tracking
- ❌ Geen nieuwe features
- ❌ Geen wijziging aan tracking-start fix uit 05g (die werkt al)

---

## Acceptatie-criteria

### Klik werkt eindelijk

- [ ] Klik op binnen-trim grafiek-dot in Verken-modus → rode dot springt naar geklikt punt, video-frame synced
- [ ] Klik op binnen-trim grafiek-dot in Analyseren-modus → idem
- [ ] Klik op gedimde (buiten-trim) dot werkt ook
- [ ] Klik na as-sleep (pan/zoom) werkt
- [ ] Klik in `ax-t`/`ay-t`/`|a|-t` pane werkt
- [ ] Klik in leeg gebied van een grafiek triggert `onAreaClick` (snap naar dichtstbij meetpunt)

### Hover werkt

- [ ] Hover over een dot triggert `onPointHover` → cross-pane highlight in tabel + trail + andere grafieken
- [ ] Pointer-leave wist de hover-state
- [ ] Chart.js' eigen tooltip blijft correct verschijnen op hover

### Logs opgeruimd

- [ ] Alle `[VM/CHART]`, `[VM/PANE]` en `[VM/VIDEO]`-console.logs verwijderd
- [ ] Alle `// DIAGNOSTIEK 05g`-comments verwijderd
- [ ] Geen verweesde `eslint-disable`-comments

### Documentatie

- [ ] Korte comment boven het canvas-listener `useEffect` legt uit waarom we deze aanpak gebruiken i.p.v. Chart.js' options.onClick

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Cleanup van event-listeners werkt (geen memory-lek bij chart-destroy of pane-close)
- [ ] Bestaande functionaliteit uit prompts 01–05g blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **06-export-help**: save/load project als JSON met versienummer, CSV-export tabel, PNG-export grafiek, help-paneel in CircuitSketch-accordion-stijl
- **07-functie-fit**: fit-types lineair / kwadratisch / sinus / exponentieel, afgeleide-van-fit als bron voor v- en a-grafieken
- **08-meerdere-meetreeksen**: multi-series datamodel
- **09-ui-polish**: heroverwegen werkbalk-indeling
