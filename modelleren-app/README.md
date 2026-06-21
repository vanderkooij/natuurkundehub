# modelleren-app (WIP React-migratie)

React-herbouw van de Modelleer-tool. Zie [`../modelleren/MIGRATION.md`](../modelleren/MIGRATION.md)
voor het volledige plan.

**Huidige fase: 6 — cut-over voltooid.** Deze React-app is nu de live Modelleer-tool:
[`build.sh`](../build.sh) bouwt `modelleren-app` en serveert de output op `/modelleren/`,
en de vanilla single-file `modelleren/index.html` is verwijderd. De pure engine (parser + simulatie)
staat in `src/engine/` (DOM-vrij, met Vitest golden-run-tests geijkt tegen de
vanilla tool). De React/Vite-UI heeft de nieuwe gestapelde layout met live
validatie, Voorbeeldmodellen-grid, **interactieve grafieken** (flexibele indeling
1/2-naast/2-onder/2×2 met resizable panes, x/y-keuze, raaklijn, ← →-navigatie,
autozoom), **run-herkenning** (genummerde
runs, activeerbaar, diff t.o.v. Run 1), **model-I/O** (opgeslagen modellen,
deel-URL `?model=`, JSON, CSV Excel-NL), **Leer-modelleren** (13 oefeningen +
zwevend kaartje + unlock-progressie) en een **Help-paneel**.

De cut-over zelf (`build.sh` omzetten, `/modelleren/` naar deze build, vanilla verwijderen)
is **gedaan**. Resteert als **Fase 6-vervolg**: de echte extractie van de gevendorde
reusables naar `@nh/shared` (npm-workspaces), zodat de tijdelijke duplicatie met
Videometen verdwijnt. Bewust uitgesteld om de cut-over los te koppelen van Videometens build.

> **Let op — tijdelijke duplicatie.** De chart-code in `src/_reusable/`
> (`InteractiveChart`, `chart-plugins/`, `niceAxis`, `useThemeColors`) is in Fase 4
> **gevendord** uit `videometen/src/_reusable/` (vrijwel identiek; één bewuste
> afwijking: kleinere `pointRadius` in `InteractiveChart.tsx` omdat modelregels veel
> dichtere puntenreeksen geven dan videometen). De echte
> unificatie naar een gedeeld `@nh/shared` (npm-workspaces) gebeurt in Fase 6,
> samen met de `build.sh`/deploy-wijziging. Zie [`../modelleren/MIGRATION.md`](../modelleren/MIGRATION.md).

## Commando's

```bash
npm install
npm run test:run   # alle engine-tests éénmalig
npm test           # watch-modus
npm run typecheck  # tsc --noEmit
```

## Engine-API (`src/engine/`)

- `parseExpr(expr, vars)` — expressie → getal (komma/`*10^`/`pi`/`π`/`wortel`/`√`/`×`/`²`/`log`…)
- `simulate(sv, modelLines, maxIter)` — pure simulatie → `{ data, varNames, stopped, error, svErrors }`
- `validateSyntax` / `parseLine` / `checkParens` / `splitValueUnit` / `toDecimalPoint`
- `EXAMPLES` — voorbeeldmodellen (functionele velden)
