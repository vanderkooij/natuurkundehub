# Modelleren — Migratieplan (React + grafiek-hergebruik + layout-herontwerp)

> Status: **plan, nog niet in uitvoering.** Dit document legt het traject vast
> waarin de Modelleer-tool van een single-file vanilla `index.html` naar een
> Vite/React-app gaat, zodat ze Videometens herbruikbare grafiek-laag kan
> gebruiken én een betere layout krijgt.
>
> Basis: [`videometen/SHARED.md`](../videometen/SHARED.md) markeert de
> `_reusable`-laag al en noemt **Modelleren expliciet als de "tweede
> gebruiker"** die extractie naar een gedeelde bibliotheek triggert.
> `InteractiveChart` + de chart-plugins staan er met de notitie *"vervangt
> bestaande tangentLabelPlugin/measureLinesPlugin"*; `niceAxis` is zelfs ooit
> *uit* Modelleren geport. De migratie lost een al-ontworpen plan in.

## Doel & principes

- Modelleren wordt herbouwd als Vite/React-app **náást** Videometen, en wordt de
  tweede consumer van `videometen/src/_reusable/`.
- **Reken-engine** (parser + simulatie) is puur en port 1-op-1 als geteste
  TS-modules. De **grafieken** worden vervangen door `InteractiveChart`. De
  **layout** (#2) en **run-herkenning** (#1) ontwerp je vers bovenop die
  bouwstenen.
- *Niet vooraf overdesignen* (zelfde principe als Videometen): extraheer alleen
  wat de tweede consumer nu echt raakt; laat de rest staan.
- **Vanilla blijft live tot pariteit.** De nieuwe app leeft in een aparte map
  (`modelleren-app/`) en neemt pas in de laatste fase de URL `/modelleren/` over.

## Hergebruik-kaart (Videometen `_reusable` → Modelleren)

| Reusable | Vervangt in Modelleren | Koppeling |
|---|---|---|
| `InteractiveChart.tsx` | hele bespoke Chart.js-opzet (`makeChartConfig`, `updateChart`) | alleen react + chart.js ✅ |
| `chart-plugins/{playhead,tangent,measureLines}` | `tangentLabelPlugin`, `measureLinesPlugin` | schoon ✅ |
| `niceAxis.ts` | inline `niceAxis` (kwam hiervandaan) | schoon ✅ |
| `useThemeColors` / `useNhTheme` | `chartColors()`, `applyTheme`/`toggleTheme` | schoon ✅ |
| `csvNL.ts` | `downloadCSV()` (krijgt meteen Excel-NL `;`+`,`+BOM) | schoon ✅ |
| `fit.ts` | *nieuw* — optioneel trendlijn/afgeleide op sim-output | schoon ✅ |
| `useGlobalShortcut.ts` | pijltjestoets-navigatie op grafiekpunten | schoon ✅ |
| `AppHeader.tsx` | inline header/breadcrumb | trekt shadcn-`ui` + `cn()` mee ⚠️ |
| `ModalPanel.tsx` | help-paneel-omhulsel | idem ⚠️ |
| `ThreePaneLayout.tsx` | basis voor nieuwe layout | idem + `react-resizable-panels` ⚠️ |

✅ = zelfstandig te extraheren. ⚠️ = vereist dat de gedeelde laag óók `cn()`
(`@/lib/utils`) + de gebruikte shadcn-primitives (`button`, `tooltip`) +
een gedeelde Tailwind-config meeneemt. → **Chrome-groep later; data-groep eerst.**

## Wat alléén Modelleren heeft → te porten (geen tegenhanger in Videometen)

- **Reken-engine (puur, zeer testbaar — grootste winst):** `toDecimalPoint`,
  `splitValueUnit`, `parseExpr` (mét alle notatie-uitbreidingen: komma, `*10^`,
  `pi`/`π`, `wortel`/`√`, `×`/`·`, `²`/`³`, `log`/`ln`), `checkParens`,
  `validateSyntax`, `parseLine`, `checkFirstIteration`, en de iteratielus van
  `runModel`.
- **Startwaarden-model**: rijen naam/waarde/eenheid, formule-startwaarden
  (eenmalig geëvalueerd), kopiëren/plakken.
- **Model-editor**: textarea + regelnummers + rode foutregels.
- **Domein-data**: `EXAMPLES`, "Leer modelleren" (begeleide oefeningen +
  zwevend kaartje), opgeslagen modellen (localStorage), deel-link (LZString
  `?model=`), JSON import/export.

## Layout-herontwerp (#2, ingebed)

- **Breed boven**: startwaarden en modelregels náást elkaar.
- **Breed eronder**: grafiek(en).
- **Uitklapbaar onderaan**: datatabel.
- Responsive: onder ~900px alles gestapeld.
- Andere indeling dan Videometens 3-paneel → óf `ThreePaneLayout`
  generaliseren, óf een simpele `StackedLayout` als nieuwe (chrome-)reusable.

## Run-herkenning (#1, ingebed)

In React: elke run (live + bewaard) is een `ChartSeries` met label + kleur; een
echte legenda-component die **óók de live-run toont**, een leesbaar "wat
veranderde t.o.v. ijkpunt"-label, en per-run verwijderen.

## Build / deploy / compatibiliteit

- [`build.sh`](../build.sh): ✅ blok toegevoegd — `cd modelleren-app && npm install
  && npm run build`, en `cp -r modelleren-app/dist dist/modelleren` (Fase 6a).
- [`netlify.toml`](../netlify.toml): de `/modelleren → /modelleren/` 301 blijft;
  **geen SPA-redirect nodig** (Modelleren routeert via `?model=`, niet via
  paden — net als Videometen).
- **Deellinks-compat = harde eis**: bestaande `?model=`-links (LZString +
  JSON-schema `{sv, model, iter}`) moeten blijven werken, of krijgen een
  schema-migratie. Vroeg vastleggen.

## Gefaseerde route

| Fase | Inhoud | Risico |
|---|---|---|
| **0** | Gedeelde-code-thuis: npm-workspace + `@nh/shared`, **data-groep** extraheren, videometen hertesten | laag |
| **1 ✅** | Scaffold `modelleren-app`: Vite+React, NH-theme + nieuwe gestapelde layout, engine ingehangen (draait + tabel) — **KLAAR** | laag |
| **2 ✅** | Engine geport als pure TS + tests (gedrag bevroren) — **KLAAR**, zie [`../modelleren-app/`](../modelleren-app/) (28 tests groen) | laag-mid |
| **3 ✅** | Startwaarden + model-editor UI + live validatie (eenheden-tips, formule-preview, foutmarkering) + Voorbeeldmodellen-grid met auto-run — **KLAAR** | mid |
| **4 ✅** | Grafieken via **gevendorde** `InteractiveChart` (x/y-keuze, raaklijn, zoom, kleinere punten, **← → over meetpunten lopen**) + run-herkenning: elke simulatie wordt **automatisch een genummerde run** (geen Bewaar-knop), verticale lijst onder de grafiek, **activeerbaar** (actieve run springt eruit + draagt raaklijn/selectie/pijltjes), diff t.o.v. Run 1 toont de variërende parameter per run, per-run × + Wis alle. Raaklijn-kleur (**amber**) is gereserveerd — geen run gebruikt 'm. **⤢ Autozoom**-knop per grafiek. **Flexibele indeling** (1 / 2 naast / 2 onder / 2×2) met **resizable panes** via `react-resizable-panels` + verticaal sleepbare bloktotaalhoogte. — **KLAAR** | mid |
| **5a ✅** | Opgeslagen modellen (localStorage `nh_modellen`), **deel-URL** (`?model=` via lz-string, backward-compatible), JSON import/export, **CSV-export** (gevendorde `csvNL`, Excel-NL) — **KLAAR**. (Examples al in Fase 3.) | mid |
| **5b ✅** | Leer-modelleren: 13 oefeningen (programmatisch geport), lock/unlock-progressie (`nh_learn_unlocked`), laad start-/oplossingsmodel, **zwevend oefenkaartje** (sleepbaar, minimaliseer, hints, volgende), unlock-na-simuleren + **Help-paneel** (slide-in, 4 secties, inline i.p.v. shadcn-`ModalPanel`) — **KLAAR** | mid-hoog |
| **6a ✅** | **Cut-over** — pariteitscheck (28 tests groen, `?model=`-deellinks interop geverifieerd, deeplink-smoketest in browser), [`build.sh`](../build.sh) bouwt nu `modelleren-app` → `dist/modelleren`, `netlify.toml` ongewijzigd (geen SPA-redirect nodig), vanilla `modelleren/index.html` **verwijderd** — **KLAAR** | mid |
| **6b ✅** | **Extractie** — gevendorde chart-laag (InteractiveChart + chart-plugins, niceAxis, useThemeColors, csvNL) verhuisd naar npm-workspace-package [`@nh/shared`](../packages/shared/); beide apps importeren nu `@nh/shared/…`. InteractiveChart geünificeerd (`compact`-prop voor kleine punten + null-guard). Root `workspaces`, `build.sh` doet root-install, vite/vitest in modelleren-app gelijkgetrokken naar v7/v3 (één Vite-kopie, geen dubbele React). Videometen + modelleren-app builds groen, 28 tests groen, runtime-smoketest beide apps OK — **KLAAR** | mid |

Fase 0 en Fase 2 zijn onderling **onafhankelijk** en kunnen parallel; beide
samen vormen de risicoloze kern. Fase 2 heeft wél een minimale Vite+Vitest-
harness nodig (= het begin van Fase 1's scaffold), om de tests te draaien.

> **Volgorde-update (consumer-eerst).** Bij het scopen van Fase 0a bleek de
> extractie nú vroeg volgens Videometens eigen [`SHARED.md`](../videometen/SHARED.md)-
> principe ("extraheren pas zodra een tweede tool het écht gebruikt") — en
> `modelleren-app` had nog geen UI die de reusables importeert. Daarom is besloten
> **eerst de consumer te bouwen** (Fase 1 ✅) en de eigenlijke extractie van de
> data-groep **uit te stellen tot Fase 4**, wanneer de grafiek-UI `InteractiveChart`
> daadwerkelijk nodig heeft (dan is er een live validator). Fase 0 hieronder blijft
> de blauwdruk; alleen het *moment* schuift op.
>
> **Update na Fase 4:** de schone extractie naar `@nh/shared` vereist een echte
> npm-workspaces-opzet (bare `react`/`chart.js`-imports + dubbele-React-risico),
> wat `build.sh` en de Netlify-build van álle tools raakt. Omdat `modelleren-app`
> nog niet gedeployed wordt, is gekozen om in Fase 4 de chart-bestanden te
> **vendoren** (`InteractiveChart` + plugins + `niceAxis` + `useThemeColors` één-op-
> één naar [`modelleren-app/src/_reusable/`](../modelleren-app/src/_reusable/)) en de
> echte extractie + workspaces **uit te stellen tot Fase 6**, wanneer `build.sh`
> tóch wijzigt en de hele build end-to-end getest wordt. Tot dan: bewust tijdelijke
> duplicatie met Videometens `_reusable`.

---

# Fase 0 (uitgewerkt, uitgesteld tot Fase 6) — Gedeelde-code-thuis

**Doel:** `_reusable` promoveren tot een echte gedeelde bibliotheek die zowel
Videometen als (straks) Modelleren importeert, zonder Videometen te breken.

### Beslissing
**npm-workspaces + intern package `@nh/shared`** (optie A uit het overleg). De
root [`package.json`](../package.json) is al `private` — workspaces toevoegen is
laagdrempelig en schaalt naar tool 3/4.

### Gefaseerde extractie (belangrijk)
De grep-analyse toont dat binnen `_reusable` alleen **AppHeader, ModalPanel,
ThreePaneLayout** naar buiten reiken (`@/components/ui/button`,
`@/components/ui/tooltip`, `@/lib/utils`). De rest is zelfstandig.

- **Fase 0a — data-groep (nu):** verplaats `InteractiveChart`, `chart-plugins/*`,
  `niceAxis`, `useThemeColors`, `useNhTheme`, `csvNL`, `fit`, `useGlobalShortcut`,
  `useUndoRedo`, `Toaster` (verifiëren) naar `@nh/shared`. Dit is precies wat
  grafiek-hergebruik nodig heeft, en het breekt geen Tailwind/shadcn-grenzen.
- **Fase 0b — chrome-groep (later, bij Fase 1/5):** `AppHeader`, `ModalPanel`,
  `ThreePaneLayout`. Vereist dat `@nh/shared` óók `cn()` + de gebruikte
  shadcn-primitives + een gedeelde Tailwind-preset meeneemt. Uitstellen tot de
  data-groep bewezen werkt.

### Concrete stappen (Fase 0a)
1. Root `package.json`: `"workspaces": ["packages/*", "videometen",
   "circuitsketch"]` (modelleren-app wordt later toegevoegd).
2. Maak `packages/shared/` met eigen `package.json` (`"name": "@nh/shared"`,
   `"type": "module"`, peerDeps: react, chart.js, chartjs-plugin-zoom) en een
   `tsconfig`.
3. Verplaats de data-groep-bestanden; vervang interne `@/_reusable/…`-imports
   door relatieve imports binnen het package.
4. Videometen: laat `@/_reusable` een dunne re-export van `@nh/shared` worden
   (één regel per bestand) **óf** herschrijf de imports naar `@nh/shared`. Eerste
   is minder diff en houdt de bestaande `@reusable`-doc-conventie intact.
5. Vite/TS-aliassen: `@nh/shared` resolven in `vite.config` + `tsconfig.paths`
   van elke consumer.
6. `build.sh` ongewijzigd (workspaces installeren transitief), maar verifieer
   `npm install` op root.

### Definition of done (Fase 0)
- `cd videometen && npm run build` groen; de tool draait identiek (rook-test:
  video laden, tracken, grafiek + zoom + raaklijn + meetlijnen, CSV-export).
- `SHARED.md`-tabel bijgewerkt: data-groep status → "geëxtraheerd naar
  `@nh/shared`".
- Geen gedrags- of stijlverschil in Videometen (chart-kleuren, theme-wissel).

### Risico's / let op
- **Extractie-churn**: imports in Videometen verschuiven — met aliassen +
  re-export-shim klein houden, en Videometen volledig hertesten.
- **Tailwind v4**: de data-groep gebruikt géén Tailwind-classes (alleen
  CSS-vars via `useThemeColors`), dus 0a is veilig. De chrome-groep (0b) heeft
  wél een gedeelde Tailwind-preset nodig.

---

# Fase 2 (uitgewerkt) — Engine-extractie + tests

> **Status: ✅ gerealiseerd.** De engine staat in [`../modelleren-app/src/engine/`](../modelleren-app/src/engine/)
> (`decimal`, `expr`, `parse`, `simulate`, `examples` + barrel `index.ts`), DOM-vrij,
> met 28 Vitest-tests groen (`npm run test:run`) en een schone `tsc --noEmit`.
> De golden runs van alle 9 voorbeeldmodellen zijn geijkt tegen de live
> vanilla-uitkomsten. Een minimale Vitest-harness (geen UI) host het geheel.

**Doel:** de pure reken-engine uit [`modelleren/index.html`](index.html) lichten
als TS-modules met Vitest-tests die het **huidige gedrag bevriezen**, vóórdat er
één regel UI wordt herbouwd. De engine is domein-specifiek → woont in
`modelleren-app/src/engine/` (niet in `@nh/shared`); alleen `fit` (regressie) is
gedeeld.

### Voorwaarde
Een minimale `modelleren-app/`-scaffold (Vite+React+TS+Vitest) — het kale begin
van Fase 1, genoeg om tests te draaien. Nog geen UI.

### Module-indeling
| Module | Inhoud (uit `index.html`) |
|---|---|
| `engine/decimal.ts` | `toDecimalPoint` |
| `engine/expr.ts` | `parseExpr` (incl. alle notatie-normalisatie + `eval`) |
| `engine/parse.ts` | `splitValueUnit`, `checkParens`, `validateSyntax`, `parseLine` |
| `engine/simulate.ts` | `evalStartwaarden`, `checkFirstIteration`, en `simulate()` |
| `engine/examples.ts` | de `EXAMPLES`-data |

### Sleutelrefactor: pure `simulate()`
De huidige `runModel()` ([index.html](index.html) ~regel 1414) is verweven met
DOM (`status-bar`, `max-iter`-veld, `checkUnits`). Splits de pure kern af:

```ts
interface SvRow { name: string; value: string; unit: string }
interface SimResult {
  data: Record<string, number>[];   // snapshot per iteratie
  varNames: string[];                // incl. tussenvariabelen
  stopped: boolean;
  error: string | null;              // bv. "Fout in iteratie 12, Regel 3: …"
  svErrors: string[];                // niet-berekenbare startformules
}
function simulate(sv: SvRow[], modelLines: string[], maxIter: number): SimResult
```

DOM/status, `checkUnits` (waarschuwing) en het lezen van invoervelden blijven
bewust **buiten** de engine (gaan naar de React-laag). `eval()` blijft in
`parseExpr` — acceptabel voor een lokale edu-tool, maar expliciet genoteerd.

### Testplan (Vitest) — bevries het gedrag
1. **Notatie-matrix** (de tests die deze sessie handmatig zijn gedraaid, nu
   geautomatiseerd): `9,8` == `9.8`; `1,5*10^-3`; `pi`/`π`/`PI`; `wortel`==`sqrt`==`√`;
   `×`/`·`; `d²`/`r³`; `log(1000)==3`; `ln(1)==0`; `6.67e-11`. Plus de regressie
   tegen de oude `Math.Math.PI`-bug.
2. **`splitValueUnit`**: `1,5*10^-3` (geen eenheid), `9,81 m/s^2`, `998 kg/m^3`,
   `Vtot-(mwater/rho)`, `Vtot - (mwater/rho)` (spaties), `0,25*pi*d²`.
3. **Formule-startwaarden**: `Vlucht = Vtot-(mwater/rho)` eenmalig berekend;
   vooruitverwijzing → `svErrors`.
4. **Golden runs** uit `EXAMPLES` (beschrijvingen bevatten verwachte waarden):
   vrije val ≈ 4,5 s en v ≈ 44 m/s bij grond; val-met-luchtweerstand v_eind
   ≈ 44 m/s; RC τ = 1 s; harmonische oscillator T ≈ 2,0 s; planetenbaan r
   constant ≈ 1,5·10¹¹. Tolerantie ruim (numeriek Euler).
5. **Foutpaden**: ontbrekende `dt` → foutmelding; deling door nul / NaN /
   Infinity → nette regelfout; `als` zonder `dan`; ongebalanceerde haakjes.
6. **STOP**: `als h <= 0 dan STOP` stopt de lus; overshoot-clip op 0.

### Definition of done (Fase 2)
- `engine/*.ts` bevat de volledige reken-logica, **zonder DOM-referenties**.
- `vitest run` groen; de golden-run-waarden komen overeen met de huidige
  vanilla-tool (handmatig één keer kruis-gecheckt).
- De engine is importeerbaar zonder React (puur), klaar voor Fase 3/4.

### Risico's / let op
- **Gedragspariteit**: tests moeten éérst tegen de *huidige* vanilla-uitkomsten
  geijkt worden (kopieer een paar runs als fixtures), anders bevries je per
  ongeluk een afwijking.
- **`maxIter`-clamp** (`Math.min(10000, …)`) en de `t`/`dt`-defaults horen bij de
  engine-rand, niet bij de UI — meeporten.
