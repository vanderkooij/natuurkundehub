# Claude Code prompt 07b — Videometen: Fit-range + sinus + exponentieel + scatter-fix

## Context

Vervolg na 07. Vier dingen samen:

1. **Scatter-altijd-zichtbaar fix** — correctie op 07: `fitReplacesScatter` is in afgeleide-panes (`vx-t`, `ax-t`, etc.) een verkeerde interpretatie van het oorspronkelijke ontwerp. Beide datasets (scatter + fit-curve) horen samen zichtbaar te zijn, in elke pane, altijd. Pedagogisch krachtiger: leerling ziet de ruisige central-difference scatter golvend rond de gladde fit-curve.

2. **Fit-range** — bij stuiterende balletjes, slingers, opeenvolgende bewegings-segmenten is één fit op alle meetpunten wiskundig betekenisloos. Sub-selectie van meetpunten voor de fit (los van de globale trim) is essentieel voor klassikaal gebruik.

3. **Sinus-fit** `y = A·sin(ωt + φ) + C` voor slinger-bewegingen.

4. **Exponentiële fit** `y = A·e^(kt) + C` voor RC-schakelingen, radioactief verval, dempinging.

Plus JSON-schema bump naar v3.

Voor context:
- `videometen/prompts/07-functie-fit.md` — basis fit-implementatie (lineair, kwadratisch, closed-form)
- `videometen/src/features/fit/fit.ts` — `fitLinear`, `fitQuadratic`, `evalFit*`
- `videometen/src/features/measurements/Graphs.tsx` — Graphs-container met fit-config-popover
- `videometen/src/features/measurements/GraphPane.tsx` — pane met fit-toggle
- `videometen/src/features/project/projectSchema.ts` — schema v2

---

## Te realiseren

### 1. Scatter-altijd-zichtbaar fix

In `fits.ts` (of waar `fitReplacesScatter`/`buildFitCurve` zit) en in `GraphPane.tsx`:

#### Verwijder `fitReplacesScatter`

- Schrap de flag overal
- In afgeleide-panes (`vx-t`, `vy-t`, `|v|-t`, `ax-t`, `ay-t`, `|a|-t`) met `showFit: true`: render **beide** datasets:
  - Scatter: de bestaande central-difference data (ruwe meting met natuurlijke ruis)
  - Fit-curve: doorlopend, geanalytisch uit fit gederiveerd (`evalFitDerivative` / `evalFitSecondDerivative`), N=200 samples
- Lijn-toggle (`Lijn`) blijft onafhankelijk werken: bepaalt of de scatter-dots **onderling** met dunne lijn-segmenten verbonden worden — los van de fit-curve

#### Voor positie-panes (`x-t`, `y-t`, `y-x`)

Niets veranderen — beide waren al zichtbaar (scatter + fit-overlay).

#### Pane: actieve rode dot

Blijft op currentFrame-positie van de scatter (bestaand). De fit-curve heeft geen eigen dots — alleen een lijn.

### 2. Fit-range: sub-selectie voor de fit-berekening

Nieuw concept: een **fit-range** is een tijd/frame-selectie waarop de fit wordt berekend, los van de globale trim. Default: gelijk aan trim-range. Bij wijziging: fits worden opnieuw berekend over alleen die sub-set.

#### State

In `FitConfig` (uit 07):

```ts
type FitRange = {
  start: number  // frame-nummer
  end: number    // frame-nummer
} | null  // null = gebruik volledige trim-range (default)

type FitConfig = {
  xFit: FitType
  yFit: FitType
  range: FitRange  // NIEUW — gedeeld voor beide fits
}
```

Reden voor één gedeelde range: x(t) en y(t) beschrijven hetzelfde tijdsegment van de beweging. Verschillende ranges per coördinaat is fysisch verwarrend.

Default: `range: null` (gebruik trim). Reset bij nieuwe video.

#### Helper

```ts
function effectiveFitRange(config: FitConfig, trimStart: number, trimEnd: number): { start: number; end: number } {
  if (config.range === null) return { start: trimStart, end: trimEnd }
  return {
    start: Math.max(config.range.start, trimStart),
    end: Math.min(config.range.end, trimEnd),
  }
}

function filterPointsForFit(rows: MeasurementRow[], range: { start: number; end: number }): { t: number; y: number }[]
```

Fits gebruiken nu `effectiveFitRange` om de te-fitten punten te selecteren.

#### UI in fit-config-popover

Voeg sectie onderaan toe:

```
─────────────────────────────────
Fit-range:
  Van frame: [____]  Tot frame: [____]
  ☐ Volledige trim gebruiken
─────────────────────────────────
```

- Twee numerieke inputs voor `start` en `end`, met `min = trimStart`, `max = trimEnd`
- Checkbox "Volledige trim gebruiken": zet `range: null` en disabled de inputs
- Validatie: `start < end`, beide binnen trim
- Bij wijziging: real-time herberekening van fits, R², formules

#### Visuele markering in panes

In t-gebaseerde panes met `showFit: true` én een actieve fit:

- Toon een **lichte achtergrond-tint** (`bg-accent/5` of vergelijkbaar) tussen `t(fitStart)` en `t(fitEnd)` over de hele chart-hoogte
- Of: dunne accent-lijntjes onderaan de chart die de fit-range markeren
- Buiten de fit-range loopt de fit-curve **gewoon door** (extrapolatie) maar met een **kleine visuele indicatie** dat 't extrapolatie is — bv. iets transparanter (opacity 0.5) of dashed
- Doel: leerling ziet duidelijk waar de fit "op gebaseerd" is vs. waar 'ie "voorspelt"

Voor `y-x` panes: geen markering (geen tijd-as, lastig te visualiseren). De fit-curve klopt nog wel met de fit-range — alleen de visualisatie van de range zelf hebben we niet.

### 3. Sinus-fit `y = A·sin(ωt + φ) + C`

#### Implementatie

Niet-lineair in `ω` en `φ` — vereist iteratieve fitting. Twee redelijke aanpakken:

**Aanpak A: grid-search + lineaire refine** (aanbevolen voor robuustheid)

1. Schat dominante frequentie via FFT of via piek-detectie in de data
2. Grid-search over `ω` rond de schatting (bijv. ±50%, 20 stappen)
3. Voor elke `ω`-kandidaat: fit `A·sin(ωt) + B·cos(ωt) + C` als **lineair** systeem (in A, B, C). Dat geeft je optimale A, B, C voor die ω. Combineer A en B naar amplitude en fase: `amp = √(A²+B²)`, `φ = atan2(B, A)`
4. Kies de ω met minimale residuen
5. Optioneel: refine met 1-2 Gauss-Newton-iteraties

**Aanpak B: pure Levenberg-Marquardt** — directer maar gevoeliger voor lokale minima

Implementeer in `fit.ts`. Geen externe library — eigen 50-100 regels code is voldoende.

#### Types

```ts
type Fit1DSine = {
  type: 'sine'
  coefficients: [number, number, number, number]  // [A, omega, phi, C]
  rSquared: number
  tMin: number
  tMax: number
}

// Updaten van Fit1D union:
type Fit1D = Fit1DLinear | Fit1DQuadratic | Fit1DSine | Fit1DExponential
```

#### Eval-helpers

```ts
// y(t) = A·sin(ω·t + φ) + C
function evalSineFit(fit: Fit1DSine, t: number): number {
  const [A, omega, phi, C] = fit.coefficients
  return A * Math.sin(omega * t + phi) + C
}

// y'(t) = A·ω·cos(ω·t + φ)
function evalSineDerivative(fit: Fit1DSine, t: number): number {
  const [A, omega, phi, _C] = fit.coefficients
  return A * omega * Math.cos(omega * t + phi)
}

// y''(t) = -A·ω²·sin(ω·t + φ)
function evalSineSecondDerivative(fit: Fit1DSine, t: number): number {
  const [A, omega, phi, _C] = fit.coefficients
  return -A * omega * omega * Math.sin(omega * t + phi)
}
```

`evalFit` etc. (de generieke versies) dispatchen op `fit.type`.

#### Convergentie-fallback

Als grid-search geen redelijke fit oplevert (R² < 0.5 of NaN): `fitSine` retourneert `null`. UI toont melding "Sinus-fit kon niet convergeren — probeer een ander type of pas de fit-range aan".

### 4. Exponentiële fit `y = A·e^(kt) + C`

#### Implementatie

Niet-lineair in `k`, maar wel **lineaire** transformatie mogelijk bij bekende C. Twee aanpakken:

**Aanpak A: estimate C, dan log-transform** (aanbevolen)

1. Schat `C` op een redelijke manier — bijv. minimum of asymptoot (laatste paar punten als de data afvlakt). Of: probeer een grid van C-waardes
2. Voor elke C-kandidaat: log-transform `log(y - C)` als bestand is, fit `log(A) + k·t` lineair
3. Bereken R² op originele data (niet log-space)
4. Kies beste C, dan optionele Gauss-Newton refine

**Aanpak B: Levenberg-Marquardt direct op `A·exp(k·t) + C`**

Beide werkbaar. Aanpak A is eenvoudiger en robuuster voor klassikaal gebruik.

#### Types

```ts
type Fit1DExponential = {
  type: 'exponential'
  coefficients: [number, number, number]  // [A, k, C]
  rSquared: number
  tMin: number
  tMax: number
}
```

#### Eval-helpers

```ts
// y(t) = A·e^(k·t) + C
function evalExpFit(fit: Fit1DExponential, t: number): number {
  const [A, k, C] = fit.coefficients
  return A * Math.exp(k * t) + C
}

// y'(t) = A·k·e^(k·t)
function evalExpDerivative(fit: Fit1DExponential, t: number): number {
  const [A, k, _C] = fit.coefficients
  return A * k * Math.exp(k * fit.tMin /* nee, gebruik gewoon t */)
  // Correct:
  // return A * k * Math.exp(k * t)
}

// y''(t) = A·k²·e^(k·t)
function evalExpSecondDerivative(fit: Fit1DExponential, t: number): number {
  const [A, k, _C] = fit.coefficients
  return A * k * k * Math.exp(k * t)
}
```

#### Convergentie-fallback

Idem als sinus: bij mislukking retourneer `null`, UI toont melding.

#### Edge-cases

- `y - C` bevat negatieve of zero-waardes (kan niet log-en): probeer ander C, anders return `null`
- `k` blowt op (>~50): clamp of return `null`

### 5. UI updates

#### Fit-config-popover

Update zoals beschreven in §2 (fit-range sectie) en met uitgebreide type-lijst:

```
┌─ Fit ──────────────────────────────────────┐
│                                            │
│  x-richting:        y-richting:            │
│  ○ geen             ○ geen                 │
│  ○ lineair          ○ lineair              │
│  ● kwadratisch      ● kwadratisch          │
│  ○ sinus            ○ sinus                │
│  ○ exponentieel     ○ exponentieel         │
│                                            │
│  ─────────────────────────────────────     │
│  Fit-range:                                │
│  Van frame: [ 36 ]  Tot frame: [ 44 ]      │
│  ☐ Volledige trim gebruiken                │
└────────────────────────────────────────────┘
```

#### Formule-weergave in FitInfoBar

Pas formule-formattering aan per type:

- Lineair: `y(t) = 2,50 · t + 1,20`  (zoals nu)
- Kwadratisch: `y(t) = −4,90 · t² + 5,00 · t + 1,20`  (zoals nu)
- Sinus: `y(t) = 0,87 · sin(6,28 · t + 1,57) + 0,12`
- Exponentieel: `y(t) = 2,50 · e^(−3,00 · t) + 0,10`

Allemaal Nederlandse komma, 2 decimalen, JetBrains Mono. `R² = 0,YYY` aan het einde.

Bij `null` fit (convergentie mislukt): toon `⚠ Sinus-fit kon niet convergeren — probeer ander type of pas de fit-range aan` in plaats van formule.

#### Per pane fit-toggle

Disabled-tooltip aanpassen:
- Bij `none`: zoals nu ("Stel eerst een fit-type in via de Fit-knop bovenaan")
- Bij niet-convergerende fit: "Fit kon niet berekend worden — pas type of range aan"

### 6. JSON-schema bump naar v3 + migratie

#### Schema v3

```ts
export const PROJECT_SCHEMA_VERSION = 3

export type FitType = 'none' | 'linear' | 'quadratic' | 'sine' | 'exponential'

// ProjectJSON wijziging:
ui: {
  // ... bestaand
  fitConfig: {
    xFit: FitType   // nu inclusief sine + exponential
    yFit: FitType
    range: { start: number; end: number } | null  // NIEUW (null = gebruik trim)
  }
  graphs: { /* ongewijzigd */ }
}
```

#### Migratie v2 → v3

```ts
function migrateV2toV3(v2: ProjectV2JSON): ProjectV3JSON {
  return {
    ...v2,
    schemaVersion: 3,
    ui: {
      ...v2.ui,
      fitConfig: {
        ...v2.ui.fitConfig,
        range: null,  // default = volledige trim
      },
    },
  }
}
```

In `deserializeProject`:
- v1 → migrateV1toV2 → migrateV2toV3 → v3-flow
- v2 → migrateV2toV3 → v3-flow
- v3 → direct
- Andere versies → error

Save schrijft altijd v3.

---

## Hergebruik-markering

| Kandidaat | Categorie | Beslissing |
|---|---|---|
| `fitSine`, `fitExponential` + eval-helpers | data | Mee in bestaande `fit.ts` reusable, geen extra markering nodig |
| Iteratieve solver (mini-LM of grid-search helper) | data | **Wel markeren** als losse `iterativeFit.ts` helper indien generiek genoeg, anders inline in `fit.ts` |
| FitRange UI-component (twee number-inputs + checkbox) | — | **Niet markeren** — tool-specifiek aan fit-config-popover |

Geen nieuwe entries in `SHARED.md` tenzij iteratieve solver echt apart staat.

---

## Niet doen

- ❌ Geen piecewise fits (meerdere sub-fits aaneengeschakeld) — v3+
- ❌ Geen confidence intervals of error bars op de fit
- ❌ Geen auto-type-detectie ("welke fit past 't beste?")
- ❌ Geen interactieve fit-range selectie via sleepbare handles in de grafiek (alleen via numerieke input in popover voor nu)
- ❌ Geen Fourier-decompositie als fit-type
- ❌ Geen wijziging aan tracking, kalibratie, tabel, export, help

---

## Acceptatie-criteria

### Scatter-altijd-zichtbaar

- [ ] Met `xFit` of `yFit` actief én `showFit: true` op een afgeleide-pane: scatter blijft zichtbaar, fit-curve eroverheen
- [ ] Geldt voor `vx-t`, `vy-t`, `|v|-t`, `ax-t`, `ay-t`, `|a|-t`
- [ ] `Lijn`-toggle bepaalt onafhankelijk of scatter-dots met lijn-segmenten verbonden zijn
- [ ] Voor positie-panes (`x-t`, `y-t`, `y-x`): ongewijzigd gedrag (al beide zichtbaar)

### Fit-range

- [ ] `range`-veld in `FitConfig`, default `null` (= volledige trim)
- [ ] Numerieke input voor start- en eind-frame in fit-config-popover
- [ ] Checkbox "Volledige trim gebruiken" toggle tussen `null` en custom range
- [ ] Validatie: start < end, beide binnen trim, inputs disabled bij `null`
- [ ] Real-time herberekening van fits, R² en formules bij wijziging
- [ ] In t-panes met fit: visuele markering van fit-range (lichte tint of marker-lijntjes)
- [ ] Fit-curve loopt buiten range door, met lichtere visuele indicatie (opacity of dashed) om extrapolatie te markeren

### Sinus-fit

- [ ] `fitSine(points)` retourneert `Fit1DSine` of `null`
- [ ] Testdata `y = sin(2π·t)` met punten t=0..1: coefficients [1, 2π, 0, 0] (±tolerantie), R² ≈ 1
- [ ] `evalSineFit`, `evalSineDerivative`, `evalSineSecondDerivative` correct
- [ ] In popover beschikbaar als optie
- [ ] Formule in FitInfoBar: `y(t) = A · sin(ω · t + φ) + C` met NL-komma
- [ ] Convergentie-fallback: bij mislukking nette melding in FitInfoBar

### Exponentiële fit

- [ ] `fitExponential(points)` retourneert `Fit1DExponential` of `null`
- [ ] Testdata `y = 2·exp(−3·t) + 0.1` met punten t=0..2: coefficients (±tolerantie), R² ≈ 1
- [ ] Eval-helpers correct
- [ ] In popover beschikbaar
- [ ] Formule in FitInfoBar: `y(t) = A · e^(k · t) + C` met NL-komma
- [ ] Edge-cases (negatieve `y-C`, blowing `k`): nette `null`-fallback

### Schema v3

- [ ] Save schrijft `schemaVersion: 3` met nieuwe `range`-veld en uitgebreide FitType-set
- [ ] Load v1 → migreer naar v2 → v3
- [ ] Load v2 → migreer naar v3 (default `range: null`)
- [ ] Load v3 → direct
- [ ] Onbekende versie → nette error

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **08-meerdere-meetreeksen**: multi-series datamodel (`TrackingSeries[]`), per serie eigen kleur + naam, tabel-pane met serie-tabs of -selector, grafieken per pane optie "één serie / alle gestackt", trail-overlay toont alle series, tracking-flow met serie-keuze, reset-acties per serie
- **09-ui-polish**: heroverwegen werkbalk-indeling (workflow-stappen + start-tracking + mode-toggle + theme/help/menu), eventueel sidebar voor stappen, betere groepering controls
