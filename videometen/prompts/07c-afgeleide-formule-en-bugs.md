# Claude Code prompt 07c — Videometen: Afgeleide-formule + R²-uitleg + zoom-fix + fps-lock

## Context

Vervolg na 07b. Vier dingen:

1. **Afgeleide-formule per pane** — in afgeleide-panes (vy-t, ay-t, etc.) wordt nu de positie-fit-formule herhaald. Dat is misleidend: leerling ziet `y(t) = …` onder een grafiek die `vy` toont. De formule moet analytisch worden afgeleid en als afgeleide-formule worden weergegeven (`vy(t) = …`, `ay(t) = …`).
2. **R²-tooltip + help-uitleg** — leerlingen weten niet wat R² is. Snelle tooltip-uitleg op de R²-tekst plus uitgebreidere sectie in het help-paneel.
3. **Zoom-bug fix** — zoom-state reset random naar autozoom zonder dat de gebruiker erom vraagt. Voor diagnose: eerst code-trace om plausibele oorzaak te vinden; alleen bij twijfel logs toevoegen.
4. **Fps-lock na eerste meting** — fps-detectie shuffelt nog steeds spontaan. Defensieve fix: zodra er een meting bestaat, is de fps **vergrendeld**. Alleen via expliciete reset-actie ("Alle metingen wissen" / "Begin opnieuw" / "Andere video laden") komt 'ie weer vrij. Geen confirm-dialog meer voor wijziging — gewoon dicht.

Voor context:

- `videometen/prompts/07-functie-fit.md` + `07b-fit-range-extra-types-scatter-fix.md`
- `videometen/src/features/fit/fit.ts` — fit-types en eval-helpers
- `videometen/src/features/measurements/FitInfoBar.tsx` (of waar formule + R² wordt weergegeven)
- `videometen/src/features/help/HelpPanel.tsx` — sectie "Sync-problemen?" bestaat al
- `videometen/src/features/video/FpsChip.tsx` (uit 06)
- `videometen/src/features/video/VideoState.tsx` — `fpsAtFirstMeasurement`-marker

---

## Te realiseren

### Tweak 1 — Afgeleide-formule per pane-type

In `FitInfoBar.tsx` (of analoog): de formule-weergave moet afhankelijk zijn van het pane-type:

| Pane-type | Bron-fit | Weergegeven formule                                 |
| --------- | -------- | --------------------------------------------------- |
| `x-t`     | xFit     | `x(t) = …` (positie-fit)                            |
| `y-t`     | yFit     | `y(t) = …` (positie-fit)                            |
| `vx-t`    | xFit     | `vx(t) = d/dt[x(t)] = …` (eerste afgeleide)         |
| `vy-t`    | yFit     | `vy(t) = d/dt[y(t)] = …` (eerste afgeleide)         |
| `\|v\|-t` | beide    | `vx(t) = …`, `vy(t) = …`, `\|v\|(t) = √(vx² + vy²)` |
| `ax-t`    | xFit     | `ax(t) = d²/dt²[x(t)] = …` (tweede afgeleide)       |
| `ay-t`    | yFit     | `ay(t) = d²/dt²[y(t)] = …` (tweede afgeleide)       |
| `\|a\|-t` | beide    | `ax(t) = …`, `ay(t) = …`, `\|a\|(t) = √(ax² + ay²)` |
| `y-x`     | beide    | `x(t) = …`, `y(t) = …` (beide positie-formules)     |

#### Analytische afgeleiden per fit-type

Implementeer in `fit.ts` of een nieuwe `fitFormula.ts`:

```ts
function formatFitFormula(fit: Fit1D, derivative: 0 | 1 | 2, varName: string): string;
```

Voorbeelden voor kwadratische fit `y = a·t² + b·t + c`:

- `derivative = 0`: `y(t) = a·t² + b·t + c` (zoals nu)
- `derivative = 1`: `y'(t) = 2a·t + b` (lineair, één lagere graad)
- `derivative = 2`: `y'(t) = 2a` (constant)

Voor lineaire fit `y = a·t + b`:

- `derivative = 0`: `y(t) = a·t + b`
- `derivative = 1`: `y'(t) = a`
- `derivative = 2`: `y''(t) = 0`

Voor sinus `y = A·sin(ω·t + φ) + C`:

- `derivative = 0`: `y(t) = A · sin(ω · t + φ) + C`
- `derivative = 1`: `y'(t) = A·ω · cos(ω · t + φ)`
- `derivative = 2`: `y''(t) = −A·ω² · sin(ω · t + φ)`

Voor exponentieel `y = A·e^(k·t) + C`:

- `derivative = 0`: `y(t) = A · e^(k·t) + C`
- `derivative = 1`: `y'(t) = A·k · e^(k·t)`
- `derivative = 2`: `y''(t) = A·k² · e^(k·t)`

#### Variabelnaam-prefix

Per pane gebruik de juiste variabelnaam:

- `x-t` pane met derivative 0: variable `x`
- `vx-t` pane met derivative 1: variable `vx`
- `ax-t` pane met derivative 2: variable `ax`
- Idem voor y-as

Bv: `vx(t) = 2·a·t + b` met de daadwerkelijke numerieke waardes ingevuld.

#### R² weergave

R² blijft de R² van de **positie-fit** (dat is de bron). Toon één keer, niet meermaals.

#### `|v|-t` en `|a|-t`

Hier wordt het complex omdat het twee fits combineert. Layout:

```
vx(t) = 2·a₁·t + b₁
vy(t) = 2·a₂·t + b₂
|v|(t) = √(vx² + vy²)                R²ₓ = 0,99 · R²ᵧ = 0,997
```

Drie regels in plaats van één. De `|v|`-regel zelf heeft geen expliciete uitwerking — geef de symbolische vorm.

### Tweak 2 — R²-tooltip + help-paneel-sectie

#### Tooltip in FitInfoBar

De `R² = 0,997` tekst krijgt een tooltip (op hover):

> "**R²** zegt hoe netjes de fit door je metingen loopt.
> 1 = perfect (elke meting valt op de curve)
> 0,95+ = uitstekend
> 0,8-0,95 = redelijk
> < 0,8 = misschien past een ander fit-type beter"

Korte, klikbare info-icoon (`ⓘ`) naast `R²` of cursor-help op de tekst zelf.

#### Help-paneel uitbreiding

Nieuwe sectie in `HelpPanel.tsx`, ingevoegd na **"Analyseren"** of als deel van die sectie:

**Sectie "Wat zegt R²?"**

> Wanneer je een fit toepast op je metingen, berekent de tool ook een **R²-waarde** (uitgesproken: "R-kwadraat"). Dat is een maat voor hoe goed het wiskundige model door je data loopt.
>
> - `R² = 1,000` → de fit-curve gaat exact door elk meetpunt. Perfect model.
> - `R² ≈ 0,95-0,99` → uitstekende fit. De ~5% afwijking is meet-ruis.
> - `R² ≈ 0,80-0,95` → redelijke fit. Kijk of een ander type beter past.
> - `R² < 0,80` → het model past slecht. Misschien gebruik je het verkeerde fit-type, of zit er een knik in je data (bijv. een stuiterende bal die je in één keer probeert te fitten).
>
> Voor schoolexperimenten is R² > 0,95 een sterk signaal dat je experiment goed is gelukt en het model klopt.

Plus een sub-sectie over de **formule** zelf:

**Sectie "Wat doe je met de formule?"**

> De fit geeft je een wiskundige formule. De coefficiënten daarin zijn vaak fysisch betekenisvol:
>
> - **Vrije val** `y(t) = −4,9·t² + …` → de −4,9 = −½g, dus je hebt de zwaartekracht gemeten: g = 9,8 m/s².
> - **Constante snelheid** `x(t) = v·t + x₀` → v is de snelheid in m/s.
> - **Slinger** `y(t) = A·sin(ω·t + φ)` → periode T = 2π/ω.
> - **Exponentieel verval** `y(t) = A·e^(k·t)` → tijdconstante τ = −1/k.

### Tweak 3 — Zoom-bug fix (code-trace eerst)

Symptoom: zoom-state op een grafiek-pane reset spontaan naar autozoom, zonder dat de gebruiker op `↺` drukt.

#### Aanpak

**Stap 1 — Code-trace.** Lees de relevante files (`GraphPane.tsx`, `Graphs.tsx`, `InteractiveChart.tsx`, `GraphsLayoutState.tsx`) en zoek naar plekken waar zoom-state per pane wordt gereset of overschreven. Verdachten:

1. `useEffect` met dependency op `rows` of `points` die zoom-state reset bij nieuwe data
2. `useEffect` op `mode`-change (Verken↔Analyseren) die layout-state regenereert inclusief zoom
3. `chart.resetZoom()`-aanroep ergens onbedoeld
4. Bij chart-data-update wordt nieuwe config opgebouwd zonder zoomState mee te geven
5. `pendingProject`-load uit 06 die ergens iets reset
6. Synchronisatie tussen panes via `syncXZoom` die per ongeluk de y-as ook reset
7. Re-mount van GraphPane bij wijziging van pane-id of order

**Stap 2 — Gerichte fix.** Documenteer welke verdachte je hebt geïdentificeerd in een comment in de code. Pas een minimale fix toe.

**Stap 3 — Verificatie.** Test in dev-modus:

- Zet zoom op een pane (wheel of as-sleep)
- Doe diverse acties: hover, klik op punt, switch tussen modi, nieuwe meting toevoegen, fit-toggle, lijn-toggle
- Check dat zoom-state in alle gevallen behouden blijft

#### Indien code-trace niet eenduidig

Voeg `console.log` op de plekken waar zoom-state wijzigt en stuur output naar Jop voor verdere diagnose (aanpak zoals 05g). Niet gokken zonder bewijs.

### Tweak 4 — Fps-lock na eerste meting

#### Concept

Zodra er minimaal één meetpunt bestaat (`fpsAtFirstMeasurement !== null`): de **fps wordt vergrendeld**. Geen wijzigingen meer mogelijk via UI of detectie, behalve via de expliciete reset-routes.

#### Implementatie

In `VideoState.tsx`:

```ts
case 'SET_FPS': {
  // Hard lock: als fpsAtFirstMeasurement !== null en source !== 'reset': blokkeer
  if (
    state.fpsAtFirstMeasurement !== null &&
    action.source !== 'reset'  // alleen reset-routes mogen door
  ) {
    return state  // negeer de wijziging
  }
  return { ...state, fps: action.fps, /* eventueel snap-frames herberekenen */ }
}
```

#### Source-tag op SET_FPS

Voeg een verplichte `source`-parameter toe aan de fps-setter:

```ts
type FpsSource = 'user' | 'detection' | 'project-load' | 'reset'
setFps(fps: number, source: FpsSource): void
```

Update alle callers:

- Fps-detectie bij video-load: `setFps(detected, 'detection')`
- Fps-chip user input: `setFps(typed, 'user')`
- Project-load: `setFps(project.video.fps, 'project-load')`
- Reset-routes ("Alle metingen wissen", "Begin opnieuw", "Andere video laden"): impliciet via LOAD_VIDEO of reset-actions, mogen door

Bij lock + niet-reset source: log een dev-warning (alleen in dev-mode, niet in productie):

```ts
if (import.meta.env.DEV) {
  console.warn(
    `[VIDEO] SET_FPS blocked (lock active). Source: ${action.source}, fps: ${action.fps}`,
  );
}
```

Dat helpt voor toekomstige debug wanneer fps stiekem probeert te wijzigen.

#### UI: fps-chip in locked-state

In `FpsChip.tsx`:

- Bij `fpsAtFirstMeasurement !== null`:
  - Chip toont een klein **slot-icoon** (`🔒` of een hangslotje van Lucide)
  - Tooltip: "**Fps is vergrendeld** sinds je eerste meting. Om te wijzigen: gebruik 'Begin opnieuw' of 'Alle metingen wissen' via het menu rechtsboven."
  - Chip is **niet klikbaar** voor het openen van de wijzig-popover (cursor `not-allowed`)
- De gele warning-styling uit 06 (`fpsWarning: true` bij wijziging na eerste meting) is nu **overbodig** voor user-acties (die kunnen niet meer) — maar blijft wel relevant als signaal voor detectie-wijzigingen die geblokkeerd zijn. Mag blijven, of mag opgeruimd worden — kies pragmatisch
- Bij `fpsAtFirstMeasurement === null` (nog geen meting): chip is normaal klikbaar, geen slot

#### Effect op reset-flows

- "Alle metingen wissen" → `clearFirstMeasurementFps()` → chip wordt weer klikbaar
- "Begin opnieuw met deze video" → idem, plus fps mag teruggezet worden naar detectie
- "Andere video laden" → idem, plus nieuwe detectie bij nieuwe video
- "Project openen" → fps wordt geforceerd uit JSON, daarna meteen weer vergrendeld omdat `fpsAtFirstMeasurement` gevuld wordt door de geladen meetpunten

---

## Niet doen

- ❌ Geen pedagogische uitbreidingen (tooltips bij coefficiënten, interactieve sliders, presets) — komt in **07d** of een aparte ontwerp-sessie
- ❌ Geen wijziging aan fit-algoritme of fit-types
- ❌ Geen wijziging aan tracking-, kalibratie-, of tabel-logica
- ❌ Geen wijziging aan grafiek-types of layout
- ❌ Geen verwijdering van de bestaande `fpsAtFirstMeasurement`-marker (die blijft het anker)
- ❌ Geen "ben je zeker?"-confirm voor fps-wijziging — gewoon hard slot

---

## Acceptatie-criteria

### Afgeleide-formule

- [ ] `vy-t`-pane met kwadratische yFit toont `vy(t) = 2·a·t + b` met numerieke waardes (geen positie-formule meer)
- [ ] `ay-t`-pane met kwadratische yFit toont `ay(t) = 2·a` (constante)
- [ ] `ax-t` met lineaire xFit toont `ax(t) = 0`
- [ ] Sinus-fit afgeleiden: `vy(t) = A·ω·cos(ω·t + φ)`, `ay(t) = −A·ω²·sin(ω·t + φ)`
- [ ] Exponentiële fit afgeleiden: `vy(t) = A·k·e^(k·t)`, `ay(t) = A·k²·e^(k·t)`
- [ ] `|v|-t` toont drie regels: vx-formule, vy-formule, `|v|(t) = √(vx² + vy²)` symbolisch
- [ ] `|a|-t` analoog
- [ ] `y-x` toont x(t) en y(t) beide
- [ ] R² blijft van de bron-fit; correct gelabeld bij paren (R²ₓ + R²ᵧ)

### R²-tooltip + help

- [ ] Hover op R²-tekst (of `ⓘ`-icoon) toont uitleg met de vier niveau-categorieën
- [ ] Help-paneel heeft sectie "Wat zegt R²?"
- [ ] Help-paneel heeft sectie "Wat doe je met de formule?" met fysische voorbeelden

### Zoom-bug fix

- [ ] Root cause geïdentificeerd via code-trace, gedocumenteerd met comment in de fix-plek
- [ ] Zoom-state per pane blijft behouden bij:
  - Toevoegen van een nieuwe meting tijdens analyse
  - Hover over een grafiek-punt
  - Klik op een grafiek-punt
  - Wisselen tussen Verken en Analyseren
  - Toggle van fit / raaklijn / meten / lijn
  - Wijziging van fit-config (type of range)
- [ ] Bij expliciete `↺`-knop: zoom reset naar autozoom (zoals altijd)
- [ ] Geen logs achtergelaten in de code

### Fps-lock

- [ ] `setFps(fps, source)` heeft een verplichte source-parameter
- [ ] Alle callers geüpdatet met juiste source
- [ ] Met `fpsAtFirstMeasurement !== null` én niet-reset source: SET_FPS-actie wordt genegeerd (state onveranderd)
- [ ] Fps-chip toont slot-icoon en is niet klikbaar zolang lock actief
- [ ] Tooltip op chip vertelt hoe te ontgrendelen (via reset-acties)
- [ ] Na "Alle metingen wissen" of "Begin opnieuw" of "Andere video laden": fps weer wijzigbaar
- [ ] Bij "Project openen": fps uit JSON wordt geforceerd, daarna weer vergrendeld door de geladen meetpunten
- [ ] Dev-warning in console bij geblokkeerde wijziging (helpt toekomstige diagnose)

### Algemeen

- [ ] Geen console-errors of warnings (behalve de bewuste dev-warning bij fps-lock-blocks)
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **07d-fit-pedagogisch**: tooltips bij coefficiënten ("deze waarde is je gemeten zwaartekracht"), vergelijking met theorie (`g = 9,81`), interactieve sliders voor handmatige aanpassing, presets per fysisch scenario (vrije val / slinger / RC-circuit), eventueel "wist je dat?"-uitklap-blokken per fit-type
- **08-meerdere-meetreeksen**: multi-series datamodel
- **09-ui-polish**: heroverwegen werkbalk-indeling
