# Claude Code prompt 07j — Videometen: Wheel-zoom race-fix + extrapolatie-toggle werkend

## Context

Na 07i werken Auto zoom, initial-load, en as-sleep correct. Twee resterende bugs:

1. **Wheel-zoom vanuit null-state springt terug naar autozoom.** As-sleep heeft dit niet. Vanuit non-null-state wel ok. Veroorzaakt door de 07i-fix: `incoming === null → altijd USE-cfg`. Bij wheel-zoom uit null-state: chart wijzigt intern → emit fires → state update gequeued → maar de re-render voor de state-update is doorgekomen, ziet useEffect nog `incoming === null`, applyt autozoom, wist de wheel-wijziging.

2. **"Toon extrapolatie buiten meetbereik"-checkbox doet niets / inconsistent.** Ondanks `showExtrapolation === true` verschijnt zone C (dashed paars voorbij meetbereik) niet. Soms wel zone B (lichter, buiten fit-range maar binnen data). Inconsistent over pane-types.

Voor context:

- `videometen/prompts/07f-bugs-en-kleur.md` — `prevZoomStateRef`-introductie
- `videometen/prompts/07i-zoom-pin-fix.md` — `&& zs !== null` guard
- `videometen/src/_reusable/InteractiveChart.tsx` — prop-sync + `emitZoom`
- `videometen/src/features/measurements/GraphPane.tsx` — fit-curve datasets
- `videometen/src/features/measurements/fits.ts` — `buildFitCurve`, zone-classificatie
- `videometen/src/features/measurements/GraphsLayoutState.tsx` — `FitConfig` met `showExtrapolation`

---

## Te realiseren

### Tweak 1 — Wheel-zoom race-fix via chart-ownership flag

#### Probleem

De 07i prop-sync regel was: bij `incoming === null` altijd USE-cfg (autozoom toepassen). Dat dekt Auto zoom-knop en initial-load correct.

Maar bij **wheel-zoom uit null-state** creëert dit een race:

1. `state.zoomState === null`
2. Gebruiker scrollt → `chartjs-plugin-zoom` wijzigt `chart.scales.x/y.min/max` intern
3. Plugin's `onZoom`-callback → `emitZoom` → `propsRef.current.onZoomChange?.(newZs)` → React `setState(newZs)` gequeued
4. **Voordat** die state-update is doorgekomen, kan er een ander effect re-renderen (bv. een ander prop, of dezelfde useEffect via een ander dep)
5. Re-render ziet `props.zoomState === null` (oude state) → useEffect runs → `incoming = null` → USE-cfg → autozoom toegepast → wheel-wijziging wegevaagd
6. Vervolgens komt de gequeueeerde state-update door → re-render → maar nu is chart al "terug naar autozoom" + state-update krijgt 't even non-null, wat onmiddellijk opnieuw geapplied wordt — eindeloos stuiteren of stable op autozoom

#### Fix-aanpak: chart-ownership ref

Voeg een nieuwe ref toe die markeert dat **de chart zojuist zelf z'n zoom heeft gewijzigd** (via wheel/pinch/pan). De prop-sync useEffect skipt één cycle bij die markering, en reset 'm.

```ts
const chartOwnsZoomRef = useRef(false);

// In emitZoom (de chartjs-plugin-zoom callback):
function emitZoom(newZs) {
  chartOwnsZoomRef.current = true; // markeer: chart heeft zojuist intern gewijzigd
  prevZoomStateRef.current = newZs; // ref ook bijwerken zoals nu
  propsRef.current.onZoomChange?.(newZs);
}

// In de prop-sync useEffect:
useEffect(
  () => {
    const chart = chartRef.current;
    if (!chart) return;

    if (chartOwnsZoomRef.current) {
      // Chart heeft net zelf gewijzigd via wheel/pinch/pan.
      // Skip deze sync zodat we de chart-stand niet overschrijven.
      // De volgende useEffect-run (na state-update is doorgekomen) doet de sync normaal.
      chartOwnsZoomRef.current = false;
      return;
    }

    // ... bestaande logica met PIN/USE-cfg branches
  },
  [
    /* deps */
  ],
);
```

#### Belangrijke verifications

- **As-sleep**: triggert `onChange({...state, zoomState: newZs})` direct in user-handler, niet via emit-pad. `chartOwnsZoomRef` blijft `false`. Sync werkt normaal — GEEN regressie.
- **Auto zoom-knop**: zet `setZoomState(null)` direct, geen emit. `chartOwnsZoomRef = false`. Sync gebruikt USE-cfg-branch (na 07i-fix) → autozoom toegepast. GEEN regressie.
- **Cross-pane externe wijziging** (toekomstig, of project-load): externe `setZoomState` zet ref niet → sync werkt normaal.
- **Wheel-zoom uit null**: emit zet ref → skip sync → chart blijft staan → state-update komt later door → volgende sync ziet `incoming = nieuwe non-null, previous = nieuwe non-null` (via prevZoomStateRef in emit) → PIN → blijft staan. ✓
- **Wheel-zoom uit non-null**: idem, sync skipt → state-update komt door → PIN → blijft staan. ✓

#### Comment-update boven useEffect

```ts
// Prop-sync regels:
// 1. chartOwnsZoomRef: skip één cycle als chart zojuist intern wijzigde
//    (wheel/pinch/pan via chartjs-plugin-zoom) — voorkomt overschrijving van
//    interne wijzigingen door een nog-niet-bijgewerkte zs-prop.
// 2. incoming === null → USE-cfg (autozoom): Auto zoom-knop / initial-load.
// 3. incoming === non-null en gelijk aan previous → PIN: wheel-race-bescherming
//    (state-update na emit komt door met dezelfde waarde — chart heeft 't al).
// 4. incoming === non-null en verschilt van previous → USE-cfg: echte externe wijziging.
```

### Tweak 2 — Extrapolatie-toggle daadwerkelijk laten werken

#### Probleem

`showExtrapolation === true` in `FitConfig` zou zone C moeten activeren: dashed paars voorbij meetbereik. Maar in user-screenshots is zone C niet zichtbaar in `x-t` en inconsistent in `ax-t`.

#### Diagnose-pad

Code-trace door de keten:

1. **`FitConfig.showExtrapolation`** — wordt 'm correct ge-update wanneer de checkbox toggelt?
2. **`GraphsLayoutState.tsx`** — propageert hij naar `fits` of via een prop naar `GraphPane`?
3. **`GraphPane.tsx`** — geeft 'ie `showExtrapolation` mee aan `buildFitCurve`?
4. **`fits.ts` `buildFitCurve`** — wordt zone C-array gevuld wanneer `showExtrapolation === true`?
5. **`GraphPane.tsx`** `chartSeries` — wordt de zone C-dataset toegevoegd aan series array, met juiste styling (dashed, opacity ~0,5)?
6. **`InteractiveChart.tsx`** — wordt zone C-dataset gerenderd? (check of `excludeFromAutozoom` correct toegepast is — alleen op zone C, niet op B)

Lees deze code-paden door. Identificeer welke schakel breekt.

#### Mogelijke oorzaken (hypotheses om te checken)

- `showExtrapolation` ontbreekt in de props doorgegeven aan `buildFitCurve` (vergeten te wiren door)
- Zone C wordt wel opgebouwd maar het sample-loop classificeert alle punten naar B of A (classify-bug)
- Zone C-dataset wordt opgebouwd maar mist `excludeFromAutozoom: true`, waardoor 't de bounds verstoort en visueel wegvalt
- Zone C-dataset heeft fouten in styling (kleur ontbreekt, dash-array onjuist) waardoor 't onzichtbaar lijkt
- Zone C wordt alleen voor positie-panes opgebouwd, niet voor afgeleide-panes (inconsistente code-paden)

#### Fix

Op basis van wat de code-trace aantoont: gerichte fix in de juiste schakel. Documenteer de root cause in een comment.

#### Verificatie-scenario na fix

1. Fit-config: `yFit = quadratic`, `range = subset van trim`, `showExtrapolation = true`
2. Open `x-t` pane: zone A in oranje + zone B lichter voorbij oranje binnen data + zone C dashed buiten data (bij uitzoomen)
3. Open `vx-t` pane: idem, lineaire fit-afgeleide → drie zones zichtbaar
4. Open `ax-t` pane: idem, constante fit-tweede-afgeleide → drie zones zichtbaar
5. `showExtrapolation` uitvinken: zone C verdwijnt direct, zone A en B blijven

---

## Niet doen

- Geen wijzigingen aan de PIN-fix uit 07i (alleen aanvullen met chart-ownership)
- Geen wijzigingen aan andere features
- Geen logs achterlaten

---

## Acceptatie-criteria

### Wheel-zoom race-fix

- [ ] `chartOwnsZoomRef` is toegevoegd aan `InteractiveChart.tsx`
- [ ] `emitZoom` zet de ref op `true`
- [ ] Prop-sync useEffect skipt één cycle bij ref-true en reset 'm naar `false`
- [ ] Wheel-zoom in een x-t pane vanuit autozoom-state: nieuwe zoom blijft staan (springt niet terug)
- [ ] Wheel-zoom vanuit non-null state: blijft staan (geen regressie)
- [ ] As-sleep blijft werken (geen regressie)
- [ ] Auto zoom-knop blijft werken (geen regressie)
- [ ] Comment boven useEffect documenteert de vier regels
- [ ] Initial-load van vx-t blijft werken (geen regressie van 07i)

### Extrapolatie-toggle

- [ ] Code-trace heeft root cause aangetoond, gedocumenteerd in comment
- [ ] Met `yFit = quadratic`, sub-range fit, `showExtrapolation = true`: zone C (dashed paars) zichtbaar voorbij meetbereik in alle pane-types (`x-t`, `y-t`, `vx-t`, `vy-t`, `|v|-t`, `ax-t`, `ay-t`, `|a|-t`, `y-x`)
- [ ] Met `showExtrapolation = false`: zone C verdwijnt onmiddellijk
- [ ] Zone C beïnvloedt autozoom NIET (blijft `excludeFromAutozoom: true`)

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts

- **08-werkbalk-en-video-polish**: compacte werkbalk voor kleinere schermen, fix venster-verkleining bij video-load, fix autoplay van enkele frames na load
- **09-presets**: presets per fysisch scenario
- **10-meerdere-meetreeksen**: multi-series datamodel
