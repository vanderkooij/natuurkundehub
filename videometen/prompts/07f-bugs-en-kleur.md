# Claude Code prompt 07f — Videometen: Regressie-fixes + tooltip/kleur polish

## Context

Na 07e zijn een aantal regressies en niet-volledig-doorgevoerde features opgedoken in echt gebruik. Eén feature (Tijd-as sync) gaat **er volledig uit** in plaats van fixen — past in de afspraak om actief op clean code te sturen en niet alles toe te voegen "omdat het kan".

1. **Tijd-as sync feature volledig verwijderen** — werkt niet betrouwbaar, en is conceptueel minder belangrijk dan andere dingen. Verwijderen geeft minder code, minder edge-cases, minder visuele rommel in de werkbalk
2. **Zoom-state reset spontaan** terug naar autozoom (07d-race-fix lekt ergens)
3. **Fit-curve blijft binnen fit-range** — drie zones (A/B/C) niet zichtbaar; alleen A wordt gerenderd
4. **Auto zoom-knop werkt soms wel, soms niet** — flakey behavior
5. **Extra fit-lijn verschijnt random** — twee fit-curves over elkaar (zichtbaar in user-screenshots); vermoedelijk een dataset die niet wordt opgeruimd

Plus twee kleine UX-fixes:

6. **Tooltip-label simpeler** — "Uit fit-model", "(buiten fit-bereik)", "(extrapolatie)" naar gewoon **"Fit"**. Tooltip moet ALTIJD de y-waarde tonen — gebruiker rapporteert dat 't wel het label ziet maar geen waarde.
7. **Raaklijn en fit-kleur onderscheiden** — beide amber nu, visueel niet uit elkaar te halen.

Voor context:

- `videometen/prompts/07d-zoom-en-pedagogisch.md` — zoom race-fix
- `videometen/prompts/07e-zoom-sync-en-tooltip-polish.md` — tijd-sync + drie zones
- `videometen/src/_reusable/InteractiveChart.tsx` — chart-options + tooltip + onZoom
- `videometen/src/features/measurements/GraphPane.tsx` — fit-curve datasets, raaklijn
- `videometen/src/features/measurements/Graphs.tsx` + `GraphsLayoutState.tsx` — sync logica
- `videometen/src/features/measurements/fits.ts` — `buildFitCurve`, zone-classificatie

---

## Te realiseren

### Tweak 1 — Tijd-as sync feature volledig verwijderen

Werkt niet betrouwbaar en is conceptueel niet de moeite waard. Eruit, schoon.

#### Te verwijderen

- **UI**: toggle "Tijd-as sync" in `Graphs.tsx` container-header verwijderen
- **State**: `syncXZoom: boolean` veld uit `GraphsLayoutState` weg
- **Logica**: peer-propagatie in `updatePane` (de hele `if (syncSource === "axis-x" && syncXZoom)`-tak en bijbehorende peer-loop) weg
- **Source-tag**: `ZoomChangeSource = "wheel" | "axis-x" | "axis-y"` mag blijven want 't is een nette typering, maar wordt nu nergens meer gebruikt voor sync — alleen voor eventuele toekomstige doeleinden. Of: simpelweg weg als 't nergens meer geraakt wordt. Kies pragmatisch.
- **JSON-schema**: `syncXZoom` veld uit `ui.graphs` weg. Schema-bump naar v4 met migratie v3 → v4 die dat veld negeert (of: leave-as-is bij load, gewoon niet meer schrijven bij save). Kies de schoonste route — bij twijfel: bump naar v4 met expliciete `migrateV3toV4` die `syncXZoom` weglaat.

#### Verificatie

Geen sync-toggle meer zichtbaar. Elke pane heeft onafhankelijke zoom. `npm run build` schoon (geen ongebruikte imports of variabelen).

#### Hygiëne-check

Tegelijk met deze verwijdering: kort even rondkijken of er **andere** stale code is die uit eerdere niet-uitgevoerde features is achtergebleven (ongebruikte helpers, dood-code). Niet diep zoeken — gewoon de oppervlakte bekijken tijdens het uitvoeren. Documenteer eventuele opruim-suggesties in het rapport-bericht (niet zelf uitvoeren tenzij triviaal).

### Tweak 2 — Zoom-state reset spontaan terug naar autozoom

**Symptoom**: na een zoom-actie blijft 't moment werken, maar bij een ander event (klik, hover, mode-switch, nieuwe meting) verspringt 'ie terug naar autozoom.

#### Diagnose-pad

Verdachten:

1. **Prop-sync useEffect** in `InteractiveChart.tsx` — de `lastSyncedZoomStateRef` uit 07d voorkomt overschrijving alleen als de chart en de ref overeenkomen. Maar als de useEffect fired met `zoomState: null` (= reset) op een verkeerd moment, gaat 'ie alsnog autozoom doen
2. **`updatePane` reset zoom** ergens onbedoeld — check of er een pad is dat `zoomState: null` zet zonder dat de gebruiker erom vroeg
3. **GraphsLayoutState** mode-switch — bij Verken↔Analyseren wisseling wordt zoom-state per pane normaal gepreserveerd, maar mogelijk wordt 'ie nu gereset
4. **Fit-curve recompute** — wanneer `viewTRange` verandert door zoom, recomputed fit-curve, mogelijk triggert dat een chart-update die zoom-state wist
5. **`fitConfig` change** — fit-toggle aan/uit klikken kan een chart-rebuild triggeren die zoom-state niet meegeeft

#### Te doen

Code-trace door deze paden. Voeg eventueel een `console.log` toe in `setZoomState` calls om te zien wanneer `null` (= reset) wordt gezet zonder gebruikersactie. Identificeer root cause, fix, documenteer.

### Tweak 3 — Fit-curve drie zones (regressie / incompleet)

**Symptoom**: ondanks 07e die expliciet zone A (in fit-range), B (buiten fit-range, binnen meetbereik) en C (extrapolatie) specificeert, ziet Jop alleen zone A.

#### Diagnose

Check in `fits.ts` en `GraphPane.tsx`:

1. Komt `viewTRange` correct binnen in `buildFitCurve` als de **zichtbare** range (uit `zoomState.xMin/xMax`) en niet alleen als fit-range?
2. Bij default `fit-range = trim-range`: zone B is leeg (correct), maar zone C moet zichtbaar zijn als de zichtbare range groter is dan trim
3. Worden zone B en C-datasets daadwerkelijk aan `chartSeries` toegevoegd? Of stop de loop bij zone A?
4. Hebben zone B en C de juiste `borderDash` en `opacity` waardes?

Mogelijke gerichte fix: als `viewTRange` niet als input bereikt of als de classify-functie alles naar zone A pusht, daar de bug.

#### Verificatie scenario

Set fit-range expliciet kleiner dan trim-range (bv. fit op frame 100-150 terwijl trim 0-200 is). Met scrollwiel uitzoomen voorbij trim. Dan moeten zichtbaar zijn:

- Zone A (solid amber) tussen frame 100-150
- Zone B (lichter solid) op frame 0-100 en 150-200
- Zone C (dashed) voorbij frame 0 of 200

### Tweak 4 — Auto zoom-knop flakey

**Symptoom**: klik op "Auto zoom" werkt soms wel, soms niet. Geen reproducerbaar patroon door Jop genoemd.

#### Diagnose

Mogelijke oorzaken:

1. Timing met de useEffect die `zoomState: null` toepast op de chart
2. Bug in de prop-sync (7d's `lastSyncedZoomStateRef`) die de reset weigert omdat 'ie denkt dat de chart al gelijk is
3. Race met fit-curve recompute die de zoom direct daarna weer wijzigt

#### Aanpak

Mogelijk hangt deze samen met tweak 2 (zoom-state reset). Als de root cause van tweak 2 is gevonden, check of deze flakey-behavior daarmee ook is opgelost. Anders apart diagnosticeren.

### Tweak 5 — Extra fit-lijn die spontaan verschijnt

**Symptoom**: in user-screenshots zijn twee oranje sin-curves over elkaar zichtbaar in dezelfde pane. Lijkt op een dataset die niet wordt opgeruimd bij her-render.

#### Diagnose

Check in `GraphPane.tsx`:

1. Wanneer `chartSeries` opnieuw wordt opgebouwd (bij wijziging van fit-config, zoom, etc.) — worden de oude datasets correct vervangen of blijven ze hangen?
2. In `InteractiveChart.tsx`: wordt `chart.data.datasets = newDatasets` toegepast of wordt `chart.data.datasets.push(...)` per ongeluk gedaan?
3. Wordt `chart.update('none')` aangeroepen na dataset-vervanging?
4. Wordt de drie-zones-splitsing per render schoon herberekend, of komen er stale datasets bij?

#### Aanpak

Code-trace, vind welk pad de oude dataset niet opruimt. Fix met expliciete `chart.data.datasets = [...]` assignment + `chart.update('none')`.

### Tweak 6 — Tooltip-label vereenvoudigen + altijd y-waarde

In `InteractiveChart.tsx`, de Chart.js tooltip-config:

#### Label-naming

Drie fit-zones krijgen allemaal het label **"Fit"** (zonder variatie):

- Zone A `"Uit fit-model"` → `"Fit"`
- Zone B `"Uit fit-model (buiten fit-bereik)"` → `"Fit"`
- Zone C `"Uit fit-model (extrapolatie)"` → `"Fit"`

Dat is de hoofdwijziging.

Voor scatter: blijft `"Ruwe meting"` (al duidelijk genoeg).

#### Y-waarde in tooltip altijd

Jop rapporteert dat 't label wel zichtbaar is, maar de y-waarde ontbreekt. Check de tooltip-callbacks in `InteractiveChart.tsx`:

- `title`-callback: `[dataset-label] · t = X`
- `label`-callback (per item): `y = Y`

Beide moeten altijd gevuld zijn. Verwijder de "alleen prepend label als afwijkend van yLabel"-conditie uit 07d-tweak-2 — die was er om duplicatie te voorkomen maar maakt nu de y-waarde onzichtbaar wanneer dataset-label gelijk aan yLabel is.

Gewenste output bij hover op een fit-zone:

```
Fit · t = 1,633
x (m): 0,7559
```

### Tweak 7 — Raaklijn en fit visueel onderscheiden

Beide gebruiken nu amber (`#D4923A`). Voor visueel onderscheid:

#### Voorstel

- **Raaklijn**: behoudt amber `#D4923A` (vertrouwd, blijft hangen aan "helling-aanduiding")
- **Fit**: nieuwe kleur — **paars/magenta** `#A855F7` (Tailwind purple-500). Sterk visueel onderscheid van zowel scatter (teal) als raaklijn (amber). Werkt in beide thema's (light en dark).

Toegepast op:

- Fit-curve (alle drie zones — alleen opacity/dash varieert per zone)
- `dy/dx`-label van de raaklijn: blijft amber (kleur-koppeling met de raaklijn-lijn)
- Eventuele fit-formule-tekst in FitInfoBar: blijft default tekst-kleur

Update CSS-variabele (of constant in code) zodat de fit-kleur op één plek beheerd wordt. Markeer als `--fit-color` in `index.css` als dat consistent is met bestaande NH-stijl.

Pas ook de DatasetLegend uit 07d aan: het lijn-symbool voor "Fit-afgeleide" toont nu paars i.p.v. amber.

---

## Hygiëne-afspraak

Bij elke prompt vanaf nu houden we actief in de gaten of we naar **clean code** toewerken. Wanneer een feature niet betrouwbaar werkt en niet essentieel is voor de tool: liever verwijderen dan blijven repareren. Dat geldt nu voor Tijd-as sync (tweak 1) en mogelijk later voor andere features. Less is more — minder code = minder bugs = minder onderhoud = duidelijker voor leerling én docent.

---

## Niet doen (parkeren naar volgende prompts)

- ❌ Werkbalk-redesign voor kleinere schermen — komt in **08**
- ❌ Video-laden bugs (venster verkleinen, autoplay van enkele frames) — komt in **08**
- ❌ Presets per fysisch scenario — komt in **09**
- ❌ Meerdere meetreeksen — komt in **10**
- ❌ Wijziging aan fit-algoritme, fit-types, tracking, kalibratie, tabel, export, help

---

## Acceptatie-criteria

### Tijd-as sync verwijderd

- [ ] Geen toggle "Tijd-as sync" meer in `Graphs`-container-header
- [ ] `syncXZoom` veld weg uit `GraphsLayoutState`
- [ ] Peer-propagatie logica in `updatePane` weg
- [ ] JSON-schema bump v3 → v4 met `migrateV3toV4` die `syncXZoom` veld dropt
- [ ] Hygiëne-check rondom: dood-code / stale imports opgemerkt en zo mogelijk opgeruimd

### Zoom-state stabiliteit

- [ ] Na wheel-zoom of as-sleep: zoom blijft staan bij hover, klik, mode-switch, nieuwe meting, fit-toggle
- [ ] Reset alleen via "Auto zoom"-knop of expliciete actie
- [ ] Root cause van spontaan resetten gedocumenteerd

### Fit-curve drie zones

- [ ] Met fit-range < trim-range én uitgezoomd voorbij trim: zichtbaar zijn
  - Zone A (solid, full opacity) tussen fit-range grenzen
  - Zone B (solid, opacity ~0,7) buiten fit-range maar binnen meetbereik
  - Zone C (dashed, opacity ~0,5) voorbij meetbereik
- [ ] Met fit-range = trim-range (default): zone B leeg, alleen A binnen + C buiten (als zoom buiten data)
- [ ] Visueel doorlopend (geen gaps tussen zones)

### Auto zoom-knop

- [ ] Bij klik werkt altijd: reset zoom naar autozoom passend bij data
- [ ] Werkt onafhankelijk van Tijd-as sync toggle-state

### Extra fit-lijn opgeruimd

- [ ] Per pane is er nooit meer dan één fit-curve-set (zone A/B/C) zichtbaar
- [ ] Stale datasets worden opgeruimd bij her-render
- [ ] Reproductie scenario (wat Jop deed om de tweede lijn op te wekken) lukt niet meer

### Tooltip

- [ ] Alle fit-zones hebben label "Fit" (geen variaties)
- [ ] Bij hover op scatter: tooltip toont `Ruwe meting · t = X` + `y (m): Y` (twee regels)
- [ ] Bij hover op fit-curve: tooltip toont `Fit · t = X` + `y (m): Y` (twee regels)
- [ ] Y-waarde is altijd zichtbaar, ongeacht of label gelijk is aan yLabel of niet

### Kleur-onderscheid

- [ ] Raaklijn: amber (`#D4923A`)
- [ ] Fit-curve (alle drie zones): paars (`#A855F7` Tailwind purple-500) — alleen opacity/dash varieert
- [ ] DatasetLegend gebruikt paars voor fit-lijn-symbool
- [ ] Visueel direct onderscheidbaar in beide thema's

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **08-werkbalk-en-video-polish**: compacte werkbalk-redesign voor kleinere schermen (laptops, leerling-devices); fix venster-verkleining bij video-load; fix autoplay van enkele frames na load. Pane-headers en pane-controls misschien ook compacter.
- **09-presets**: presets per fysisch scenario (vrije val, slinger, RC-circuit) met scenario-keuze door gebruiker → conditionele physica-uitleg activeert. Eventueel sliders voor handmatige coefficient-aanpassing.
- **10-meerdere-meetreeksen**: multi-series datamodel.
