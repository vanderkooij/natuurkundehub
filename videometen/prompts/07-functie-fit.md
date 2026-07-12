# Claude Code prompt 07 — Videometen: Functie-fit (lineair + kwadratisch)

## Context

Vervolg na 06. De volledige meet-analyse-export pipeline staat. Nu komt de pedagogisch belangrijkste laag: **functie-fit**. Leerlingen kunnen een wiskundig model door hun meetdata trekken (lineair of kwadratisch) en zien:

- Hoe goed het model past (R²)
- Welke formule erbij hoort (`y(t) = a t² + b t + c`)
- Wat de **analytische afgeleiden** geven voor snelheid en versnelling — gladde curves i.p.v. de ruisige numerieke differentiatie van ruwe data

Dat laatste lost het probleem op uit gebruik: ruwe `ax-t` voor een vallend voorwerp toonde een patroon rond −9,8 m/s² met enorme uitschieters. Met een kwadratische fit van y(t) wordt de tweede afgeleide een nette horizontale lijn op −9,8 m/s². Krachtige demo van waarom modellen bestaan.

Voor context:

- Alle prior prompts, in het bijzonder 04 (`buildRows`), 05 (Graphs-architectuur), 06 (project-JSON schema v1)
- `videometen/src/_reusable/InteractiveChart.tsx` — gebruikt straks fit-curve als extra series
- `videometen/src/features/measurements/Graphs.tsx`, `GraphPane.tsx`, `graph-types.ts`

---

## Doel van deze prompt

1. **Globale fit-config** per coördinaat: x(t) en y(t) krijgen elk een fit-type-keuze (geen / lineair / kwadratisch). UI in de Graphs-container-header.
2. **Per pane toggle "Fit"** in de pane-header die bepaalt of die pane de fit gebruikt voor visualisatie en/of afgeleiden.
3. **Fit-curve rendering**: doorlopende gladde lijn over de scatter, op alle relevante grafiektypes.
4. **Afgeleide-van-fit** als alternatieve data-bron voor vx/vy/|v|/ax/ay/|a|-grafieken. Analytisch berekend uit de fit-formule.
5. **Fit-parameters + R² weergave** per pane onder de chart.
6. **Raaklijn op fit** wanneer fit-toggle aan: analytische helling op het meetpunt-anker.
7. **JSON-schema bump naar v2** met migratie van v1.

## Ontwerpkeuzes (vastgelegd met Jop)

- **Fit-scope = globaal per coördinaat, per pane gebruik** (keuze B uit overleg): één fit-type voor x(t), één voor y(t). Alle panes gebruiken die fits, maar elke pane kiest zelf via een toggle of de fit zichtbaar/actief is.
- **Vergelijking = beide in één pane** (keuze A): scatter (ruwe data) + fit-curve over elkaar in positie-grafieken. Voor afgeleiden-grafieken bepaalt de fit-toggle de **bron** (ruw vs analytisch uit fit).
- **Fit-types v1 = lineair + kwadratisch** (keuze B): dekt eenparige beweging en eenparig versnelde (vrije val). Closed-form least squares, geen library. Sinus en exponentieel komen in **07b** (later).
- **Fit-parameters zichtbaar = ja**: per pane onder de chart een compacte regel met formule + R².
- **Fit wordt berekend op binnen-trim meetpunten** (consistent met andere afgeleiden in `derive.ts`).
- **Default fit-type = none** voor zowel x als y. Leerling activeert bewust.

---

## Te realiseren

### 1. Fit-berekenings-helpers

Nieuw bestand `src/features/fit/fit.ts`:

```ts
export type FitType = "none" | "linear" | "quadratic";

export type Fit1D = {
  type: Exclude<FitType, "none">;
  /** Coefficients in volgorde van hoogste graad eerst, zoals polyfit.
   *  Linear: [a, b] voor y = a·t + b
   *  Quadratic: [a, b, c] voor y = a·t² + b·t + c */
  coefficients: number[];
  /** Determinatiecoëfficiënt, 0..1. Hoger = beter. */
  rSquared: number;
  /** Welke t-waardes zijn gebruikt (handig voor sampling-range). */
  tMin: number;
  tMax: number;
};

/** Linear least-squares fit van y = a·t + b. Pure functie. */
export function fitLinear(points: { t: number; y: number }[]): Fit1D | null;

/** Kwadratische fit y = a·t² + b·t + c via Vandermonde matrix + normal equations.
 *  Pure functie. Numeriek stabiel voor de aantallen meetpunten in onze use case. */
export function fitQuadratic(points: { t: number; y: number }[]): Fit1D | null;

/** Evalueert fit op een t-waarde. */
export function evalFit(fit: Fit1D, t: number): number;

/** Eerste afgeleide. */
export function evalFitDerivative(fit: Fit1D, t: number): number;

/** Tweede afgeleide. */
export function evalFitSecondDerivative(fit: Fit1D, t: number): number;

/** R² berekenen gegeven fit en originele data. */
function computeRSquared(points: { t: number; y: number }[], fit: Fit1D): number;
```

#### Implementatie-notes

- **Lineair**: closed-form via `Σt`, `Σy`, `Σty`, `Σt²` en `n`. Standaard formules — geen externe library nodig.
- **Kwadratisch**: closed-form via Vandermonde 3×3 normal equations (`AᵀA · x = Aᵀy`). Implementeer een kleine 3×3 lineair systeem oplosser (Cramer's regel of Gaussian elimination — beide werken). Voor onze typische N (10–100 punten) numeriek prima stabiel.
- **Edge cases**:
  - Minder dan 2 punten voor lineair, of minder dan 3 voor kwadratisch: return `null`
  - Alle t-waardes gelijk (degenerate): return `null`
  - Determinant ~ 0 bij kwadratisch: return `null` (gevangen door numerieke check)
- **Geen iteratie**: alleen closed-form. Geen `regression-js`, `numeric.js` etc.

Test informeel: implementeer een unit-test-stijl check in een comment of een ad-hoc dev-script — `y = 2t² - 3t + 1` met punten op t=0..5 moet `[2, -3, 1]` retourneren met R² = 1.

### 2. Globale fit-state + UI (Graphs-container-header)

Nieuwe state in `GraphsLayoutState` (of een nieuwe `FitState` provider — kies wat consistent is):

```ts
type FitConfig = {
  xFit: FitType; // welk fit-type voor x(t)
  yFit: FitType; // welk fit-type voor y(t)
};
```

Default `{ xFit: 'none', yFit: 'none' }`. Reset bij nieuwe video. Persisteert in project-JSON (zie §8).

#### Afgeleide selectors

Een helper die de huidige fits berekent op basis van `buildRows` en `fitConfig`:

```ts
type FitsResult = {
  x: Fit1D | null; // geactiveerd of null
  y: Fit1D | null;
};

function computeFits(rows: MeasurementRow[], config: FitConfig): FitsResult;
```

`useMemo` op `(rows-binnen-trim, fitConfig)`.

#### UI: Fit-knop in Graphs-container-header

Naast `X-zoom sync` en `+`: nieuwe knop **"Fit"** met klein icoon (sigma of curve-icoontje).

- Klik opent een **popover** met twee kolommen (`x` en `y`), elk met radio-knoppen voor `geen`, `lineair`, `kwadratisch`
- Live update: wijziging propageert direct naar alle panes
- Bij sluiten popover: state blijft staan
- Visuele state op de knop: als `xFit !== 'none' || yFit !== 'none'`: knop accent-gekleurd, anders neutraal
- Disabled wanneer er minder dan 2 meetpunten zijn

#### Voorbeeld popover-layout

```
┌─ Fit ─────────────────────────┐
│                               │
│  x-richting:    y-richting:   │
│  ○ geen         ○ geen        │
│  ● lineair      ○ lineair     │
│  ○ kwadratisch  ● kwadratisch │
│                               │
│  (sinus en exponentieel       │
│   komen later)                │
│                               │
└───────────────────────────────┘
```

De grijze hint over sinus/exponentieel is bewust — leerlingen kunnen verwachten dat 't komt.

### 3. Per pane: fit-toggle in pane-header

Naast de bestaande knoppen (`Raaklijn`, `Meten`, `Lijn`, `↺`, `⬇ PNG`, `×`): nieuwe knop **"Fit"**.

#### Per pane state-uitbreiding

In `PaneState`:

```ts
showFit: boolean; // default false
```

#### Gedrag

- Knop disabled wanneer de relevante fit (`x` voor x-grafieken, `y` voor y-grafieken, beide voor `y-x` of `|v|`) niet geactiveerd is in `FitConfig`
  - Tooltip bij disabled: "Stel eerst een fit-type in via de Fit-knop bovenaan"
- Klik toggelt `showFit`
- Effect op de pane afhankelijk van type — zie §4 en §5

### 4. Fit-curve rendering in positie-grafieken (`x-t`, `y-t`, `y-x`)

Wanneer `showFit === true` en de relevante fit bestaat:

#### `x-t` en `y-t`

- Sample fit op **N=200 punten** evenredig over de **zichtbare** x-range (na zoom)
- Render als extra `series` in `InteractiveChart` met:
  - `showLine: true`
  - `pointRadius: 0` (geen dots, alleen lijn)
  - Kleur: amber (`#D4923A`, consistent met raaklijn-stijl)
  - `dashed: false` (solid line)
- Scatter (ruwe data) blijft zichtbaar — beide datasets in dezelfde chart

#### `y-x` (baan)

- Bouw parametrische curve: voor elke t in zichtbare range, bereken `(evalFit(x, t), evalFit(y, t))`
- Sample N=200 op `t` (de gemeenschappelijke parameter)
- Render als extra series, zelfde stijl als boven

### 5. Afgeleide-van-fit voor `vx`/`vy`/`|v|`/`ax`/`ay`/`|a|`

Wanneer `showFit === true` en de relevante fit bestaat in een afgeleiden-pane:

#### Bron-switch

- Standaard (`showFit: false`): scatter van numerieke central-differences (huidige gedrag)
- Met `showFit: true`: **vervang** de scatter door een **doorlopende fit-afgeleide-curve**:
  - `vx-t`: `vx(t) = evalFitDerivative(xFit, t)` op N=200 samples
  - `vy-t`: idem voor `yFit`
  - `|v|-t`: `√(vx(t)² + vy(t)²)` op samples (vereist beide fits)
  - `ax-t`: `evalFitSecondDerivative(xFit, t)` — voor lineair is dat constant 0, voor kwadratisch constant `2a`
  - `ay-t`: idem voor `yFit`
  - `|a|-t`: `√(ax(t)² + ay(t)²)` (vereist beide fits)

#### UI

- Geen extra dataset bij gebruik — vervangt de scatter helemaal
- Lijn-styling: amber, solid, geen dots
- Toon nog steeds individuele dot voor `currentFrame` (rode active dot) — bereken `y` op currentFrame's t via `evalFit*`

#### Bij ontbrekende fit voor één van twee

- `|v|-t` of `|a|-t` met alleen `xFit` geactiveerd: toon waarschuwing "Fit voor y ontbreekt — kan |v| niet uit fit berekenen" + val terug op ruwe data, of toon empty-state met tip
- Keuze: tonen wat wel kan + duidelijke notice

### 6. Fit-parameters en R² weergave

Onder elke pane waarin `showFit === true`:

- Compacte info-balk (zelfde patroon als de meet-info-balk):

```
y(t) = −4,90 t² + 5,02 t + 1,21       R² = 0,997
```

- Nederlandse komma, 2 decimalen voor coëfficiënten (3 voor R²)
- Tekens correct geformatteerd: `+`/`−` met spaties, geen `+-`
- Voor `y-x` panes: toon beide formules:

```
x(t) = 3,12 t + 0,15
y(t) = −4,90 t² + 5,02 t + 1,21       R²ₓ = 0,99 · R²ᵧ = 0,997
```

- JetBrains Mono voor de getallen + formule
- Bij niet-gemodelleerde grafiek-types (geen relevante fit): geen info-balk

### 7. Raaklijn op fit (analytische slope)

Wanneer **zowel** raaklijn-toggle (`ƒ′`/`Raaklijn`) **als** fit-toggle (`Fit`) aan staan in een pane:

- Raaklijn-helling op het anker-meetpunt wordt **analytisch** uit de fit berekend (niet via central difference op meetpunten)
- Voor `x-t`-pane met `showFit: true` en `xFit !== 'none'`:
  - `slope = evalFitDerivative(xFit, t)` op de anker-t
- Idem voor andere pane-types met hun relevante fit
- Lijn-rendering en label-positie blijven zoals nu (uit 05c/05h)
- Voor `y-x` parametrische: `dy/dx = (dy/dt) / (dx/dt) = evalFitDerivative(yFit, t) / evalFitDerivative(xFit, t)` — alleen geldig als `dx/dt ≠ 0`

Wanneer raaklijn aan maar fit uit: bestaand gedrag (central-difference op meetpunten).

### 8. JSON-schema bump naar v2 + migratie

#### Schema v2

In `projectSchema.ts`:

```ts
export const PROJECT_SCHEMA_VERSION = 2

export type ProjectJSON = {
  schemaVersion: 2
  meta: { ... }     // ongewijzigd
  video: { ... }    // ongewijzigd
  calibration: { ... }  // ongewijzigd
  tracking: { ... } // ongewijzigd
  ui: {
    mode: 'verken' | 'analyseren'
    trailColor: 'teal' | 'amber' | 'magenta' | 'white'
    fitConfig: { xFit: FitType; yFit: FitType }  // NIEUW
    graphs: {
      panes: Array<{
        type: GraphTypeKey
        showLine: boolean
        showFit: boolean  // NIEUW
        zoom: ZoomState | null
        tangentActive: boolean
        measureActive: boolean
        measureX1: number | null
        measureX2: number | null
      }>
      syncXZoom: boolean
    }
  }
}
```

#### Migratie v1 → v2

```ts
function migrateV1toV2(v1: ProjectV1JSON): ProjectV2JSON {
  return {
    ...v1,
    schemaVersion: 2,
    ui: {
      ...v1.ui,
      fitConfig: { xFit: "none", yFit: "none" }, // defaults
      graphs: {
        ...v1.ui.graphs,
        panes: v1.ui.graphs.panes.map((p) => ({
          ...p,
          showFit: false, // default
        })),
      },
    },
  };
}
```

In `deserializeProject`:

- Bij `schemaVersion === 1`: roep `migrateV1toV2(json)` aan, ga door met v2-flow
- Bij `schemaVersion === 2`: directe v2-flow
- Bij andere versies: zoals nu — error

Save schrijft altijd versie 2.

---

## Hergebruik-markering

| Kandidaat                                          | Categorie | Beslissing                                                                                                                               |
| -------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `fit.ts` (`fitLinear`, `fitQuadratic`, `evalFit*`) | data      | **Wel markeren** (`@reusable @category data`) — generieke 1D fit-helpers, bruikbaar in modelleren of elke toekomstige tool met regressie |
| `Fit1D`, `FitType` types                           | data      | Mee-exporteren uit reusable bestand                                                                                                      |
| `FitConfig` + popover-UI                           | —         | **Niet markeren** — tool-specifiek (videometen-coördinaten)                                                                              |
| Fit-parameters info-balk styling                   | —         | **Niet markeren** — heel specifiek aan deze UX                                                                                           |

Voeg `fit.ts` toe aan `SHARED.md`.

---

## Niet doen (uitgesteld)

- ❌ **Sinus-fit** (`y = A·sin(ωt + φ) + C`) — komt in **07b** of later. Vereist iteratieve fit (Levenberg-Marquardt of grid-search), substantieel meer code.
- ❌ **Exponentiële fit** (`y = A·e^(kt) + C`) — idem 07b.
- ❌ Auto-detectie van fit-type ("welke fit past 't beste?") — niet pedagogisch wenselijk, leerling moet zelf kiezen
- ❌ Fit op deelreeksen van meetpunten (piecewise fit) — v3+
- ❌ Confidence intervals of error bars op de fit-curve — overengineering voor onderwijs-niveau
- ❌ Per pane verschillende fit-types voor zelfde coördinaat — bewust uit ontwerp gehouden (één fysisch model)
- ❌ Wijziging aan tracking, kalibratie, tabel, export-flow

---

## Acceptatie-criteria

### Fit-helpers

- [ ] `fitLinear` op `y = 2t + 3` met 5+ punten retourneert coefficients `[2, 3]` (±0.01) en R² ≈ 1.0
- [ ] `fitQuadratic` op `y = -4.9t² + 5t + 1` met 5+ punten retourneert coefficients `[-4.9, 5, 1]` (±0.01) en R² ≈ 1.0
- [ ] Bij te weinig punten of degenerate data: return `null`
- [ ] `evalFit`, `evalFitDerivative`, `evalFitSecondDerivative` zijn pure functies en correct

### Globale fit-config UI

- [ ] "Fit"-knop in Graphs-container-header
- [ ] Klik opent popover met radio's voor x-richting en y-richting (geen / lineair / kwadratisch)
- [ ] Wijzigingen propageren direct naar alle panes
- [ ] Knop is accent-gekleurd wanneer minstens één fit-type actief is
- [ ] Disabled bij < 2 meetpunten
- [ ] Hint in popover over sinus/exponentieel als toekomstige optie

### Per pane fit-toggle

- [ ] "Fit"-knop in elke pane-header
- [ ] Disabled wanneer relevante globale fit `none` is, met tooltip
- [ ] Aan-state: visueel duidelijk (zoals andere actieve toggles)
- [ ] State (showFit per pane) overleeft Verken↔Analyseren wissel

### Fit-curve rendering

- [ ] Bij `x-t`-pane met `xFit` actief + `showFit: true`: doorlopende amber lijn over scatter
- [ ] Idem voor `y-t` met `yFit`
- [ ] `y-x`-pane: parametrische curve via beide fits
- [ ] Sampling N=200 punten over zichtbare x-range — past zich aan zoom
- [ ] Scatter blijft zichtbaar onder de fit-lijn

### Afgeleide-van-fit

- [ ] `vx-t`-pane met `showFit: true`: scatter vervangen door analytische `evalFitDerivative(xFit, t)`-curve
- [ ] Lineair → constante horizontale lijn; kwadratisch → schuine lijn — visueel checkbaar
- [ ] `ax-t` met kwadratische xFit: horizontale lijn op `2a` (bv. −9,8 voor vrije val)
- [ ] `|v|-t`/`|a|-t` werken met beide fits; bij ontbreken één: nette terugvalmelding

### Parameters + R²

- [ ] Info-balk onder pane toont formule met Nederlandse komma + R²
- [ ] Voor `y-x` panes: beide formules + R²ₓ en R²ᵧ
- [ ] JetBrains Mono, correcte teken-formatting

### Raaklijn op fit

- [ ] Met raaklijn-toggle + fit-toggle beide aan: helling via `evalFitDerivative` op anker-t
- [ ] Voor `y-x` parametrisch: `dy/dx = (dy/dt) / (dx/dt)`, gewatcht voor `dx/dt = 0`
- [ ] Zonder fit-toggle: bestaand gedrag (central difference op meetpunten)

### Schema-migratie

- [ ] Save schrijft `schemaVersion: 2` met nieuwe velden
- [ ] Load van v1-JSON: migratie naar v2 met defaults (`fitConfig: { none, none }`, alle `showFit: false`)
- [ ] Load van v2-JSON: directe load
- [ ] Onbekende versie: nette error

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **07b-meer-fit-types**: sinus-fit (`A·sin(ωt + φ) + C`) en exponentiële fit (`A·e^(kt) + C`). Iteratieve fitting (Levenberg-Marquardt of grid-search), uitgebreid popover met startwaardes en convergentie-fallback. Vereist mogelijk een kleine ext library (`ml-levenberg-marquardt` of zelf-implementatie). Schema bumpen naar v3.
- **08-meerdere-meetreeksen**: multi-series datamodel
- **09-ui-polish**: heroverwegen werkbalk-indeling
