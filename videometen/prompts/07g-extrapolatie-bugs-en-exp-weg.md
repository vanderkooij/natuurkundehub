# Claude Code prompt 07g — Videometen: Extrapolatie opt-in + drie-zones bugs + exp-fit verwijderen

## Context

Vervolg na 07f. Vijf dingen, in lijn met de hygiëne-afspraak (minder is meer — verwijderen heeft voorrang op repareren als de feature niet essentieel is):

1. **Extrapolatie standaard uit** — zone C (paars gestippelde lijn voorbij meetbereik) verwart leerlingen. Pedagogisch is voorbij je metingen kijken iets bewusts, geen default-gedrag. Toggle erbij in de fit-popover voor wie 't expliciet wil zien.
2. **Drie-zones consistent in alle afgeleide-panes** — bug. In x-t werken zone B/C wel, in vx-t en ax-t niet (zie user-screenshots).
3. **Autozoom werkt niet in afgeleide-panes** — bug. Jop moest met as-sleep zelf passende bounds maken om zijn vx-t leesbaar te krijgen.
4. **Exponentiële fit volledig verwijderen** — niet relevant voor videometen (radioactief verval, RC-schakelingen meet je niet met video). Verwijderen geeft minder code, minder UI, minder uitleg.
5. **Stabiliteit drie-zones na meerdere acties** — Jop rapporteert dat na "klooien" de fit-curve soms wel, soms niet voorbij meetbereik loopt. Mogelijk samenhangend met tweak 2.

Hygiëne-afspraak blijft van kracht: actief checken of we naar clean code toewerken. Tijdens uitvoer kort rondkijken naar dood-code of stale state na de exp-verwijdering.

Voor context:

- `videometen/prompts/07f-bugs-en-kleur.md` — laatste opruim-ronde
- `videometen/src/features/fit/fit.ts` — `FitType`, fit-functies
- `videometen/src/features/fit/exponentialFit.ts` (of waar `fitExponential` zit) — wordt verwijderd
- `videometen/src/features/measurements/GraphPane.tsx` — drie-zones rendering, autozoom
- `videometen/src/features/measurements/Graphs.tsx` — fit-config-popover
- `videometen/src/features/measurements/fitFormula.ts` — formule-formattering
- `videometen/src/features/project/projectSchema.ts` — schema v4 → v5

---

## Te realiseren

### Tweak 1 — Extrapolatie standaard uit + toggle in fit-popover

#### Concept

Default: fit-curve toont alleen zone A (binnen fit-range) en zone B (buiten fit-range maar binnen meetbereik). Zone C (voorbij meetbereik = pure extrapolatie) is uit.

Wie wel wil zien wat het model voorspelt voorbij de data, zet expliciet aan via een toggle.

#### State

In `FitConfig`:

```ts
type FitConfig = {
  xFit: FitType;
  yFit: FitType;
  range: FitRange;
  showExtrapolation: boolean; // NIEUW, default false
};
```

Reset bij nieuwe video. Persisteert in project-JSON (zie tweak 4: schema bump).

#### UI in fit-popover

Onderaan de popover, na de fit-range sectie:

```
─────────────────────────────────
☐ Toon extrapolatie buiten meetbereik
─────────────────────────────────
```

Checkbox met korte uitleg eronder (gedimd, kleinere tekst):

> "Laat de fit-curve doorlopen voorbij je laatste meetpunt. Handig om voorspellingen te visualiseren."

#### Effect

Wanneer `showExtrapolation === false`: zone C wordt niet gerenderd. Fit-curve loopt van eerste meetpunt-t tot laatste meetpunt-t.

Wanneer `showExtrapolation === true`: zone C verschijnt (dashed, opacity ~0,5) waar de zichtbare x-range buiten het meetbereik valt — gedrag zoals nu.

### Tweak 2 — Drie-zones consistent in alle afgeleide-panes

**Bug**: in x-t pane werken zones B/C correct, in vx-t en ax-t niet.

#### Diagnose-pad

Code-trace in `GraphPane.tsx` en `fits.ts`:

1. Voor afgeleide-panes: wordt `buildFitCurve` met de juiste `viewTRange` aangeroepen?
2. Voor afgeleide-panes: hoe wordt de fit-curve opgebouwd? Verschilt 't pad t.o.v. positie-panes?
3. Voor afgeleide-panes: gebruikt 't `evalFitDerivative` of `evalFitSecondDerivative` over de hele view-range, of stopt 't bij data-range?
4. Wordt `dataTRange` correct doorgegeven aan afgeleide-pane buildFitCurve calls?

Mogelijk verschilt het code-pad tussen positie- en afgeleide-panes en is de zone-classificatie alleen in het positie-pad geïmplementeerd. Maak 't consistent.

#### Verificatie

Met fit-config: yFit = kwadratisch, fit-range = subset van trim, `showExtrapolation: true` (om zone C zichtbaar te maken voor de test).

- x-t: zones A/B/C zichtbaar (al werkend)
- vx-t: zones A/B/C zichtbaar — fit-afgeleide lineaire lijn loopt door buiten fit-range
- ax-t: zones A/B/C zichtbaar — fit-tweede-afgeleide constante lijn loopt door

### Tweak 3 — Autozoom werkt in afgeleide-panes

**Bug**: bij vx-t/ax-t reset-zoom of initial-load geeft een rare range die de data niet goed laat zien.

#### Diagnose

Check in `niceAxis` en in de y-bounds-bepaling van `InteractiveChart` of `GraphPane`:

1. Krijgt de afgeleide-pane de juiste y-data (vx, ax) door voor zijn niceAxis-berekening, of wordt er per ongeluk een leeg array doorgegeven?
2. Bij `showFit: true` en `fitReplacesScatter`-effect (uit 07): wordt de scatter nu nog wel meegenomen in autozoom of alleen de fit-curve?
3. Is de probleem-range gerelateerd aan de fit-curve die over een grote y-bereik kan strekken bij zoom-out?

#### Fix

Autozoom van een afgeleide-pane moet de bounds bepalen op basis van:

- Alle scatter-punten (ruwe central-difference waardes)
- Plus eventueel de fit-curve binnen de **data**-range (niet binnen extrapolatie — anders rekt 'ie de y-as kapot)

Geen fit-extrapolatie meenemen in autozoom. Dat blijft een toggle, niet een drijfveer voor as-schaling.

### Tweak 4 — Exponentiële fit verwijderen

#### Code-verwijdering

Verwijder uit `fit.ts` (of waar 't woont):

- `Fit1DExponential` type
- `fitExponential` functie
- `evalExpFit`, `evalExpDerivative`, `evalExpSecondDerivative`
- `'exponential'` uit `FitType` union — wordt nu: `type FitType = 'none' | 'linear' | 'quadratic' | 'sine'`
- Alle dispatch-takken op `'exponential'` in `evalFit`, `evalFitDerivative`, `evalFitSecondDerivative`
- `fitFormula.ts`: exp-formule-formattering en tooltips
- Bestand `exponentialFit.ts` indien apart — verwijderen

#### UI-verwijdering

In de fit-popover (`Graphs.tsx`): radio-optie "exponentieel" weg uit beide kolommen (x-richting, y-richting).

#### Schema-migratie v4 → v5

`PROJECT_SCHEMA_VERSION = 5` in `projectSchema.ts`.

`migrateV4toV5`:

- Als `ui.fitConfig.xFit === 'exponential'`: vervang door `'none'`
- Als `ui.fitConfig.yFit === 'exponential'`: vervang door `'none'`
- Voeg `ui.fitConfig.showExtrapolation: false` toe (default, van tweak 1)
- Andere velden ongewijzigd

Dispatcher v1 → v2 → v3 → v4 → v5, v2 → v3 → v4 → v5, etc.

Save schrijft altijd v5.

#### Hygiëne-check tijdens uitvoer

Na de verwijdering: rondkijken of er stale exp-gerelateerde code achterblijft (ongebruikte imports, verlaten test-data, type-fields die niet meer nodig zijn). Documenteer eventuele opruim-suggesties in het rapport, voer triviale opruimingen direct uit.

### Tweak 5 — Stabiliteit drie-zones na meerdere acties

**Mogelijk samenhangend met tweak 2.** Jop's "na klooien werkt 't soms wel, soms niet" wijst op een toestand die door bepaalde acties verstoord raakt. Verdachten:

1. Fit-curve recompute bij zoom-state-wijziging — wordt `viewTRange` correct geüpdatet?
2. `showExtrapolation`-toggle wijziging — triggert dat een schone herrender?
3. Mode-switch (Verken↔Analyseren) — overleeft fit-state correct?
4. Toevoegen/verwijderen van meetpunten — herberekent fit + zones consistent?

Tijdens uitvoer van tweak 2: check of deze gevallen ook covered zijn. Eventueel toevoegen aan acceptatie-test-checklist.

---

## Hygiëne-afspraak

We blijven actief sturen op clean code. Tweak 4 is een voorbeeld: exp-fit was technisch in orde maar niet pedagogisch relevant voor videometen. Eruit. Bij twijfel in toekomstige prompts: vraag "is deze feature essentieel?" — zo niet, prefereer weghalen.

---

## Niet doen (parkeren naar volgende prompts)

- ❌ Werkbalk-redesign voor kleinere schermen — komt in **08**
- ❌ Video-laden bugs (venster verkleinen, autoplay van enkele frames) — komt in **08**
- ❌ Presets per fysisch scenario — komt in **09**
- ❌ Meerdere meetreeksen — komt in **10**
- ❌ Wijziging aan tracking, kalibratie, tabel, export, help-paneel

---

## Acceptatie-criteria

### Extrapolatie opt-in

- [ ] Checkbox "Toon extrapolatie buiten meetbereik" in fit-popover (default uit)
- [ ] Met checkbox uit: fit-curve toont alleen zones A en B (geen C)
- [ ] Met checkbox aan: zone C verschijnt (dashed, lichter, paars) waar zichtbare range buiten meetbereik valt
- [ ] State persisteert in project-JSON
- [ ] Reset bij nieuwe video

### Drie-zones consistent in alle afgeleide-panes

- [ ] vx-t met fit aan: zones A/B(/C) zichtbaar zoals in x-t
- [ ] ax-t idem
- [ ] |v|-t en |a|-t (combinatie x+y fit) idem
- [ ] Visuele continuïteit (geen gaps tussen zones)
- [ ] Root cause gedocumenteerd in comment

### Autozoom afgeleide-panes

- [ ] vx-t Auto zoom-knop produceert leesbare range (data goed zichtbaar, geen rare bounds)
- [ ] ax-t idem
- [ ] |v|-t, |a|-t idem
- [ ] Bij initial load (geen zoom): default bounds zijn netjes
- [ ] Fit-extrapolatie wordt NIET meegenomen in autozoom-berekening

### Exp-fit verwijderd

- [ ] `'exponential'` weg uit `FitType` union
- [ ] Geen `Fit1DExponential`, `fitExponential`, `evalExpFit`, etc. meer
- [ ] Fit-popover radio-opties: alleen geen / lineair / kwadratisch / sinus
- [ ] Schema bump v4 → v5 met `migrateV4toV5` die exp-keuzes naar `'none'` zet en `showExtrapolation: false` toevoegt
- [ ] Hygiëne-check: geen stale exp-gerelateerde imports of dood-code

### Stabiliteit

- [ ] Na zoom-wijzigingen, mode-switch, fit-toggle, nieuwe meting: zones blijven consistent zichtbaar
- [ ] `showExtrapolation` toggle aan/uit werkt direct, geen herrender-verlies

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **08-werkbalk-en-video-polish**: compacte werkbalk-redesign voor kleinere schermen, fix venster-verkleining bij video-load, fix autoplay van enkele frames na load
- **09-presets**: presets per fysisch scenario (vrije val, slinger) met scenario-keuze door gebruiker → conditionele physica-uitleg
- **10-meerdere-meetreeksen**: multi-series datamodel
