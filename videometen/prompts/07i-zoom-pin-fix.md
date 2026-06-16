# Claude Code prompt 07i — Videometen: Echte fix prop-sync + opruim 07h-logs

## Context

De diagnostische logs uit 07h hebben de root cause aangetoond. Eén regel zegt 't:

```
[VM/SYNC] prop-sync useEffect 
Object { incoming: null, previous: null, zoomChangedSincePrev: false, branch: "PIN-on-chart" }
[VM/SYNC] PIN: keeping chart scales as-is
```

**Root cause**: de PIN-branch (uit 07f's wheel-race-fix) wordt ook actief wanneer `incoming === null && previous === null`. Dat is verkeerd:

- Bij **wheel-zoom**: chart wijzigt intern → onZoom → setZoomState(nieuwe waarde) → parent re-render → `previous = oude waarde, incoming = nieuwe waarde, beide non-null en gelijk via ref-tracking` → PIN voorkomt overschrijving → correct, dat was de bedoeling
- Bij **Auto zoom-klik**: `setZoomState(null)` — was al null, blijft null → re-render → `previous = null, incoming = null` → PIN → chart blijft staan op stale bounds → **bug**
- Bij **initial-load na eerste render**: zoomState is al null → re-render → null === null → PIN → chart pinned op Chart.js-default bounds (= leeg / 0-0,026 voor vx-t) → **bug**

Verklaart drie symptomen tegelijk: Auto zoom-knop doet niets, afgeleide-panes leeg bij initial-load, en zone-classificatie inconsistent (omdat `viewTRange` van stale chart-bounds afgeleid wordt).

Voor context:
- `videometen/prompts/07f-bugs-en-kleur.md` — introductie PIN-branch + `prevZoomStateRef`
- `videometen/prompts/07h-zoom-diagnose.md` — diagnose-logs
- `videometen/src/_reusable/InteractiveChart.tsx` — prop-sync useEffect

---

## Te realiseren

### Tweak 1 — Fix prop-sync PIN-branch

In `InteractiveChart.tsx`, de prop-sync useEffect:

#### Huidige logica (fout)

```ts
const zoomChangedSincePrev = !isEqualZoomState(incoming, previous)
if (zoomChangedSincePrev) {
  // USE-cfg: apply incoming
} else {
  // PIN: keep chart as-is
}
```

Probleem: bij `incoming === null && previous === null` is `zoomChangedSincePrev === false` → PIN. Maar `null` betekent "ik wil autozoom" — moet altijd geapplied worden.

#### Nieuwe logica

```ts
const zoomChangedSincePrev = !isEqualZoomState(incoming, previous)
// PIN-branch alleen voor wheel-race-bescherming: 
// echte zoom-state in props, identiek aan vorige render
// (= wheel emitte deze waarde net en parent re-rendert ermee)
const shouldPin = !zoomChangedSincePrev && incoming !== null

if (shouldPin) {
  // PIN: keep chart as-is (wheel-race-bescherming)
} else {
  // USE-cfg: apply incoming (echte wijziging, of null = autozoom)
}
```

Effectief: PIN alleen wanneer `incoming !== null && incoming === previous`. In alle andere gevallen → USE-cfg.

#### Comment-update boven de useEffect

Vervang/voeg toe:

```ts
// Prop-sync regel:
// - incoming === null → altijd USE-cfg branch (autozoom toepassen).
//   PIN bij null + null zou de chart op stale bounds laten staan terwijl 
//   gebruiker juist reset wilde (Auto zoom-knop) of initial-render afmaakt.
// - incoming !== null en gelijk aan previous → PIN (wheel-race-bescherming:
//   chart heeft zelf al ge-update via onZoom, prop-update mag dat niet overschrijven).
// - incoming !== null en verschilt van previous → USE-cfg (echte externe wijziging,
//   bv. as-sleep, project-load, of cross-pane sync — toepassen).
```

### Tweak 2 — Opruim 07h-diagnostiek-logs

Verwijder **alle zeven** log-punten uit 07h met hun comment-markers:

In `InteractiveChart.tsx`:
- Log 2 (`[VM/SYNC] prop-sync useEffect`)
- Log 3 (`[VM/AUTOZOOM/BOUNDS] x-bounds` + `y-bounds`)
- Log 7 (`[VM/SYNC] after chart.update` + `prevZoomStateRef updated`)

In `GraphPane.tsx`:
- Log 1 (`[VM/AUTOZOOM] button clicked` + `updatePane called`)
- Log 4 (`[VM/PANE/SCATTER]`)

In `fits.ts`:
- Log 5 (`[VM/FIT/BUILD] starting` + `zones built`)

In `GraphsLayoutState.tsx`:
- Log 6 (`[VM/STATE] updatePane`)

Alle `// DIAGNOSTIEK 07h — verwijderen na 07i.`-comments mee verwijderd. Een `grep` op `VM/CHART|VM/SYNC|VM/AUTOZOOM|VM/PANE|VM/FIT|VM/STATE|DIAGNOSTIEK 07h` moet niets meer opleveren in de codebase.

### Tweak 3 — Verifieer dat drie-zones nu werkt

Met de PIN-fix toegepast: `viewTRange` reflecteert weer de werkelijke chart-bounds (niet de stale gepinde versie). Dus de zone-classificatie in `buildFitCurve` zou nu correct moeten werken in alle pane-types — zone B en C verschijnen waar verwacht.

Geen aparte code-wijziging nodig — alleen tijdens uitvoer verifiëren of de drie-zones-bug uit screenshot 3 (x-t) opgelost is door de PIN-fix.

Als 't NIET opgelost is: documenteer in het rapport en we doen een aparte ronde voor zone-classificatie.

---

## Niet doen

- Geen verdere fixes aan zoom-logica buiten deze PIN-correctie
- Geen wijzigingen aan andere features

---

## Acceptatie-criteria

### PIN-fix

- [ ] PIN-branch wordt alleen geactiveerd wanneer `incoming !== null && incoming === previous`
- [ ] Bij `incoming === null`: altijd USE-cfg branch (autozoom toepassen)
- [ ] Auto zoom-knop klik in x-t: chart reset naar data-bounds (niet meer "pinned" op vorige stand)
- [ ] Auto zoom-knop klik in vx-t/ax-t: idem
- [ ] Initial-load van vx-t pane: y-bounds matchen de scatter-data (geen meer 0–0,026 leeg)
- [ ] Wheel-zoom blijft stabiel staan (geen regressie van 07d's race-fix)
- [ ] As-sleep blijft werken (geen regressie van 07c)
- [ ] Comment boven useEffect documenteert de drie cases

### Drie-zones

- [ ] In x-t met fit aan en meetpunten buiten fit-range: zone B (lichter) zichtbaar
- [ ] In vx-t / ax-t met fit aan: idem
- [ ] Met "Toon extrapolatie" aan + uitgezoomd voorbij data: zone C (dashed) zichtbaar

### Logs opgeruimd

- [ ] Geen `[VM/CHART]`, `[VM/SYNC]`, `[VM/AUTOZOOM]`, `[VM/PANE]`, `[VM/FIT]`, `[VM/STATE]` logs meer
- [ ] Geen `// DIAGNOSTIEK 07h`-comments meer
- [ ] `grep` op die patterns levert leeg op

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts

- **08-werkbalk-en-video-polish**: compacte werkbalk voor kleinere schermen, fix venster-verkleining bij video-load, fix autoplay van enkele frames na load
- **09-presets**: presets per fysisch scenario
- **10-meerdere-meetreeksen**: multi-series datamodel
