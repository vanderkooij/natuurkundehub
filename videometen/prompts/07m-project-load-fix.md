# Claude Code prompt 07m — Videometen: Fix project-load (selectief geladen state)

## Context

Project-load (Project openen... uit ToolMenu) werkt selectief:

**Wel geladen** (zichtbaar in user-screenshot):

- fps (chip toont juiste waarde)
- video (in canvas)
- trim-handles (al staat currentFrame niet op trim.start)
- toast meldt "11 metingen geladen"

**Niet geladen**:

- schaal (chip toont "niet ingesteld" — JSON heeft 'm wel)
- calibration-overlay (oorsprong + assen niet zichtbaar over video)
- mode (toggle staat niet op "Analyseren" zoals JSON aangeeft)
- trail-dots op video (geen magenta dots zichtbaar)
- tabel + grafieken tonen empty-states "Stel eerst de schaal in"

Console toont geen errors.

JSON-bestand is v6 (huidige schema), volledig ingevuld. Geen migratie-issue.

Voor context:

- `videometen/prompts/06-export-help.md` — project-load flow met `pendingProject` + useEffect-watcher
- `videometen/prompts/07c-afgeleide-formule-en-bugs.md` — fps-lock
- `videometen/prompts/07k-extrapolatie-altijd-en-mouseleave-fix.md` — schema v6, `showExtrapolation` weg
- `videometen/prompts/07l-zoom-refactor.md` — `GraphsLayoutState` pane-state structuur kan veranderd zijn
- `videometen/src/features/app/ToolMenu.tsx` — `applyProject` flow
- `videometen/src/features/calibration/CalibrationState.tsx` — `loadFromProject`
- `videometen/src/features/tracking/TrackingState.tsx` — `__LOAD_FROM_PROJECT` action
- `videometen/src/features/measurements/GraphsLayoutState.tsx` — `loadFromProject`
- `videometen/src/features/video/VideoState.tsx` — `LOAD_VIDEO`, side-effects
- `videometen/src/features/app/AppMode.tsx` — `setWorkMode`

---

## Aanpak: code-trace + gerichte fix

**Geen tijdelijke logs deze ronde tenzij code-trace echt geen duidelijke bevinding geeft.** Vijf concrete verdachten om te onderzoeken.

### Verdachte 1 — `applyProject` keten breekt halverwege

In `ToolMenu.tsx` `applyProject` (of waar 't ook zit):

```ts
function applyProject(project: ProjectJSON) {
  setFps(project.video.fps, "user"); // werkt (fps zichtbaar)
  setTrim(project.video.trim); // werkt (trim-knoppen zichtbaar)
  loadCalibration(project.calibration); // ← werkt NIET (chip "niet ingesteld")
  loadTracking(project.tracking); // toast meldt 11 metingen — werkt? of niet?
  loadGraphs(project.ui.graphs); // grafieken empty — werkt niet
  setWorkMode(project.ui.mode); // mode niet op "Analyseren" — werkt niet
}
```

Mogelijke oorzaken:

- **Silent error** in `loadCalibration`-tak: een undefined property access (bv. `project.calibration.scale.unit` als calibration-shape mismatch) → throw → rest van applyProject runt niet → loadTracking/loadGraphs/setWorkMode worden niet aangeroepen
- Maar de toast meldt 11 metingen — wordt die toast vóór of na de keten getoond? Als ervoor (op basis van `project.tracking.points.length`): is misleidend, want loadTracking heeft mogelijk niet gerunt
- **Try/catch slikt error op**: applyProject in een try-catch met algemene catch die niet logt

#### Te doen

Lees de `applyProject`-functie. Check:

1. Is er een try/catch dat silent slikt?
2. Worden de loadXxx-calls sequentieel aangeroepen of in een Promise.all/async?
3. Waar zit de "11 metingen geladen" toast? Wordt 'ie op basis van `project.tracking.points.length` getoond of na succesvolle `loadTracking`?

Als de toast op basis van JSON-data wordt getoond (niet op basis van bevestiging): hij is misleidend. Loop alle loadXxx-functies één voor één na — minimaal één throwt vermoedelijk silent.

### Verdachte 2 — `loadCalibration` payload-shape mismatch

In `CalibrationState.tsx` `LOAD_FROM_PROJECT` action / `loadFromProject` methode:

Verwachte payload-shape uit JSON:

```ts
{
  scale: {
    p1: { x: number, y: number },
    p2: { x: number, y: number },
    length: number,
    unit: 'm' | 'cm' | 'mm'
  } | null,
  axes: {
    origin: { x: number, y: number },
    angle: number
  }
}
```

Check of de reducer/dispatcher exact deze shape verwacht. Een type-mismatch (bv. property heet `points` ipv `p1/p2`, of `unit` ontbreekt) kan een TypeError veroorzaken die silent door React's render-cycle gaat zonder console-error.

### Verdachte 3 — `loadGraphs` na 07l-refactor

In 07l hebben we de pane-state structuur uitgebreid: `initialZoomState`, `resetTrigger`. De per-pane-state in `GraphsLayoutState` is mogelijk uitgebreid met velden die `loadFromProject` niet meeneemt, of velden die uit de JSON komen die niet meer in de huidige state-shape passen.

Check `GraphsLayoutState.loadFromProject`:

- Worden alle JSON-velden (type, showLine, showFit, zoom, tangentActive, measureActive, measureX1, measureX2) correct overgenomen?
- Worden missende velden (bv. nieuwe in de state) ingevuld met defaults?
- Worden de pane-ids hernieuwd (zoals 06 zei: "vermijdt collisions met react-resizable-panels group-ids")?
- Is er een mismatch tussen `zoom`-veld in JSON en `zoomState`-veld in state (naming)?

JSON heeft veld `zoom`, state misschien `zoomState`? Een naming-mismatch zou een silent fallback naar default geven.

### Verdachte 4 — Volgorde-probleem met video-load side-effects

In `VideoState.tsx`: bij `LOAD_VIDEO`-actie wordt `fpsAtFirstMeasurement` gereset (`null`), trim wordt opnieuw berekend op basis van nieuwe video (start=0, end=lastFrame), eventueel andere fields.

De pendingProject + useEffect-watcher uit 06 wachtte tot video is geladen voordat applyProject werd aangeroepen. Maar misschien fires de video.onloadedmetadata of een vergelijkbare callback **na** applyProject, en reset dan iets wat applyProject net heeft gezet.

Check `VideoState`-acties en `loadFile`-flow voor side-effects die NA `applyProject` kunnen fires en state resetten.

### Verdachte 5 — `setWorkMode` wordt geblokkeerd

In `AppMode.tsx`: `setWorkMode('analyseren')` werkt mogelijk niet als de huidige mode `'tracken'` is (uit 07a: enterTracking onthoudt vorige mode, exit gaat terug naar verken). Bij project-load is de mode default `'verken'` (uit pendingProject's `fullReset()`-flow). Een setWorkMode-call zou direct moeten lukken.

Tenzij er een race is waarbij iets de mode kort na applyProject weer reset.

---

## Te realiseren

### Stap 1 — Code-trace door applyProject

Begin in `ToolMenu.tsx` bij `applyProject`. Identificeer:

1. Toast-locatie en -bron (showt 'm op basis van `project.tracking.points.length` of na bevestiging?)
2. Try/catch om de loadXxx-calls
3. Volgorde + async/sync van de calls

### Stap 2 — Code-trace door elke loadXxx

Voor elk: `loadCalibration`, `loadTracking`, `loadGraphs`, `setWorkMode`:

1. Check payload-shape matching met JSON
2. Check action-dispatcher voor state-shape mismatches
3. Check of er useEffect-side-effects zijn die de net-geladen state direct overschrijven

### Stap 3 — Code-trace door VideoState's LOAD_VIDEO

Identificeer welke side-effects bij video-laden plaats vinden:

- Worden andere state-providers gereset (calibration, tracking, graphs)?
- Wanneer fires dit relatief aan applyProject?

### Stap 4 — Gerichte fix

Op basis van bevinding: pas één gerichte fix toe. Documenteer root cause in een comment.

**Mogelijke fixes**:

- Try/catch verwijderen of error-logging toevoegen aan silent catch
- Payload-shape correctie in loadXxx
- Veld-naming-mismatch corrigeren in loadGraphs (`zoom` ↔ `zoomState`)
- Volgorde van applyProject + video-load fixen (bv. applyProject pas aanroepen na alle video-side-effects zijn uitgevoerd, via een `await` of een tweede useEffect-tick)
- Een resetting useEffect uitschakelen tijdens applyProject (via een ref `isApplyingProject`)

### Stap 5 — Verificatie

Test met het JSON-bestand dat Jop heeft gedeeld (videometen-20201022_131908-2026-06-11.json):

- Schaal-chip toont `1,20 m`
- Calibration-overlay (oorsprong + assen) zichtbaar over video
- 11 magenta trail-dots zichtbaar
- Tabel toont 11 metingen
- Twee grafieken (x-t + vx-t) met fit aan
- Mode-toggle op "Analyseren"

Plus: opslaan + opnieuw openen van een verse sessie blijft werken.

---

## Bij twijfel: één ronde logs

Als de code-trace niet eenduidig is, voeg dan logs toe:

- `[VM/LOAD] applyProject start`
- `[VM/LOAD] after setFps`
- `[VM/LOAD] after setTrim`
- `[VM/LOAD] before loadCalibration`, `[VM/LOAD] after loadCalibration`
- Idem voor andere loadXxx
- `[VM/LOAD] applyProject end`
- In CalibrationState reducer: `[VM/CAL] LOAD_FROM_PROJECT received`, `[VM/CAL] state updated`
- Idem in andere reducers

Stop dan met fixen, vraag Jop om logs te delen, schrijf 07n met de fix.

---

## Niet doen

- Geen wijzigingen aan zoom-architectuur (07l blijft staan)
- Geen wijzigingen aan tracking, kalibratie of grafieken-rendering buiten de load-flow
- Geen UI-veranderingen
- Geen schema-bump

---

## Acceptatie-criteria

- [ ] Root cause gevonden via code-trace, gedocumenteerd in comment
- [ ] Project-load van het JSON-bestand laadt alle state correct: schaal, calibration, tracking, graphs, mode
- [ ] Visueel zichtbaar: schaal-chip ingesteld, calibration-overlay, trail-dots, tabel, grafieken, mode-toggle
- [ ] Opslaan + opnieuw openen van een verse sessie blijft werken (round-trip test)
- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit (tracking, video-laden, zoom) blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts

- **08-werkbalk-en-video-polish**: compacte werkbalk voor kleinere schermen, fix venster-verkleining bij video-load, fix autoplay van enkele frames na load
- **09-presets**: presets per fysisch scenario
- **10-meerdere-meetreeksen**: multi-series datamodel
