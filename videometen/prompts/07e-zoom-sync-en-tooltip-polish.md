# Claude Code prompt 07e — Videometen: Zoom-knop, tijd-sync, tooltip-claim, extrapolatie-zicht

## Context

Vervolg na 07d. Vijf kleine maar belangrijke verfijningen rond zoom/sync UX en pedagogische correctheid van de fit-tooltips:

1. **Reset-zoom-knop is onterecht grijs** wanneer Tijd-as sync aan staat — dat is een bug. Reset moet altijd werken. Icoontje (refresh-pijl) is bovendien verwarrend.
2. **Tijd-as sync werkt niet en is conceptueel onduidelijk** — bedoeling: x-as-bereik synct over panes met tijd als x-as, y-as blijft per pane. Daarnaast: sync hoort **alleen** te triggeren bij expliciete x-as-actie (as-sleep middel/eind), niet bij wheel-zoom (waar y meegaat en sync alleen voor x rommelig wordt).
3. **vx-t bug "alle punten op t=0"** is door Jop zelf opgelost: was de combinatie van auto-zoom + sync. Geen aparte fix nodig — punt 1+2 dekken dit.
4. **Coefficient-tooltip claim "zwaartekracht"** te sterk — kwadratische y-fit is niet per definitie vrije val. Neutraal maken.
5. **Fit-curve stopt bij fit-range** terwijl 'ie wiskundig gewoon door zou kunnen lopen. Doortrekken over de hele zichtbare x-range, en visueel drie zones onderscheiden: binnen fit-range, buiten fit-range maar binnen meetbereik, en pure extrapolatie voorbij meetbereik.

Plus help-sectie korte uitleg over trim-range vs fit-range.

Voor context:

- `videometen/prompts/07b-fit-range-extra-types-scatter-fix.md` — extrapolatie-styling
- `videometen/prompts/07d-zoom-en-pedagogisch.md` — coefficient-tooltips, dataset-legend
- `videometen/src/features/measurements/Graphs.tsx` — container met sync-toggle
- `videometen/src/features/measurements/GraphPane.tsx` — reset-zoom-knop, fit-curve rendering
- `videometen/src/_reusable/InteractiveChart.tsx` — AxisOverlays + as-sleep handlers
- `videometen/src/features/measurements/fitFormula.ts` — coefficient-tooltips

---

## Te realiseren

### Tweak 1 — Reset-zoom-knop: altijd werkend + duidelijk label

In `GraphPane.tsx`:

#### Werking

- **Niet meer disabled wanneer Tijd-as sync aan staat** — reset moet onafhankelijk werken. Verwijder die condition uit de disabled-check.
- Disabled mag alleen op **één** legitieme grond: er is geen zoom-state om te resetten (= pane staat al op autozoom). Optioneel: laat 'm altijd enabled, klik is dan een no-op, geen gedoe met disabled-state. Mijn neiging: **altijd enabled** voor simpliciteit.
- Bij klik: reset zoom van die specifieke pane, **én** als sync aan staat: reset ook van alle peer-panes (zelfde x-as) — anders ben je terug naar autozoom op één pane en blijft sync inconsistent. Maar dat is een keuze. Alternatief: reset alleen lokaal, sync re-synchroniseert vanzelf bij volgende sync-trigger.
- Veiligste keuze: **reset alleen lokaal**, en cross-pane sync werkt vanzelf bij volgende as-sleep (de sync is event-gebaseerd, niet state-aware).

#### Icoontje + label

Vervang de refresh-pijl door:

- **Icoon**: `Maximize` of `ZoomOut` van Lucide (laat Claude Code de visueel-passendste kiezen)
- **Label**: tekst "Auto zoom" direct na het icoon

Compacte knop: `[⛶ Auto zoom]` of `[🔍 Auto zoom]`. Hover-tooltip: "Reset zoom naar automatisch passend bij data".

Pas dit aan in alle panes (consistent).

### Tweak 2 — Tijd-as sync: werkend + duidelijke naam + alleen bij expliciete x-as actie

In `Graphs.tsx` container-header en `InteractiveChart.tsx`:

#### Naam

Vervang "X-zoom sync" door **"Tijd-as sync"**.

Tooltip op de toggle: "Bij slepen op de tijd-as wordt het bereik gesynchroniseerd over alle grafieken met tijd op de x-as. Wheel-zoom en y-as wijzigen zijn altijd lokaal."

#### Werking

Sync triggert **alleen** bij **expliciete x-as-actie** — dat betekent de as-sleep handlers uit 05b (middel = pan, eind = zoom). Niet bij wheel-zoom, niet bij as-sleep op de y-as.

Implementatie:

1. In de as-sleep-handlers (`InteractiveChart.tsx`, `AxisOverlays`): voeg een `axis: 'x' | 'y'` parameter toe aan de `onZoomChange`-callback aanroep (of een aparte `onAxisDrag(axis, newZoomState)` callback)
2. De `Graphs`-container ontvangt deze info. Bij `axis === 'x'` en sync aan: propageer de nieuwe x-range naar alle panes met t als x-as. Bij `axis === 'y'` of bij wheel: geen propagatie
3. Wheel-zoom's `onZoom`-callback uit chartjs-plugin-zoom blijft lokaal — propageert NIET

#### Sync-implementatie

In de propagatie-logica (per peer-pane):

```ts
function propagateXSync(sourceZs: ZoomState, peer: PaneState): PaneState {
  if (!peer.zoomState) {
    // Peer heeft nog geen zoom — schrijf alleen x-bounds, laat y autozoom
    return {
      ...peer,
      zoomState: {
        xMin: sourceZs.xMin,
        xMax: sourceZs.xMax,
        yMin: peer.chart?.scales.y.min ?? -Infinity,
        yMax: peer.chart?.scales.y.max ?? Infinity,
      },
    };
  }
  // Behoud peer's y-bounds, overschrijf alleen x
  return {
    ...peer,
    zoomState: { ...peer.zoomState, xMin: sourceZs.xMin, xMax: sourceZs.xMax },
  };
}
```

Belangrijk: y-bounds van peer **niet** wijzigen. De fix uit 07c (geen `-Infinity/Infinity` zonder bestaande zoom) blijft van kracht.

#### Edge-cases

- Sync toggle aanzetten **achteraf**: panes blijven hun huidige x-range houden totdat de eerstvolgende x-as-actie gebeurt
- `y-x`-panes: geen tijd-as, dus geen sync (zoals nu)

### Tweak 3 — Coefficient-tooltip neutraal: geen vrije-val-claim meer

In `fitFormula.ts`:

#### Voor kwadratische y-fit (derivative 0), de `a`-coefficient

**Oud**:

> "**Halve versnelling** — als dit een y(t)-fit van een vallend voorwerp is, dan is je gemeten zwaartekracht **g = {abs(2a)} m/s²** (theoretisch 9,81 m/s²)"

**Nieuw**:

> "**Halve versnelling in y-richting**: 2·a = {2a} m/s²"

Geen "als dit vrije val is" meer, geen `g`-claim, geen theoretische vergelijking. Alleen het feit: de coefficient `a` correspondeert met halve versnelling.

#### Voor kwadratische x-fit

Was al neutraal in 07d ("halve versnelling in x-richting"). Geen wijziging.

#### Voor lineaire fits

`a` = snelheid (m/s) — geen claim, gewoon de fysische interpretatie. Geen wijziging.

#### Voor sinus en exponentieel

`ω` → periode + frequentie als afgeleide waardes blijven prima (zijn algemene wiskundige eigenschappen van sinus, geen claim over specifiek scenario).

`k` → tijdconstante blijft prima (algemene exp-eigenschap).

Géén claim "dit is een slinger" of "dit is RC-verval" — dat is al neutraal.

#### Conditionele physica-uitleg in 07f

In **07f-presets** komen presets per fysisch scenario (vrije val, slinger, RC-circuit). Pas dan claimen we: gebruiker kiest expliciet "dit is vrije val" → tooltip op `a` wordt: "Bij vrije val: g = {|2a|} m/s² (theoretisch 9,81)". Conditioneel op gebruiker-bevestigd scenario, niet op enkel-fit-type.

### Tweak 4 — Fit-curve doortrekken + drie zones visueel onderscheiden

In `GraphPane.tsx` (of waar fit-curve rendering gebeurt):

#### Huidige situatie + probleem

De fit-curve loopt nu **alleen binnen de fit-range** — buiten die range wordt 'ie niet doorgetrokken, zelfs niet als de chart-area daar nog zichtbaar is. Dat is jammer: de wiskundige vergelijking mag gewoon doorlopen, ook voorbij je meetbereik.

#### Drie zones onderscheiden

Sampleer de fit-curve over de **volledige zichtbare x-range** (van `chart.scales.x.min` tot `chart.scales.x.max`), N=200 punten. Splits in drie segmenten op basis van waar elke x valt:

| Zone                                           | Definitie                                                        | Styling                                       |
| ---------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| **A. In fit-range**                            | `t ∈ [fitStart_t, fitEnd_t]`                                     | Solid lijn, volle kleur (amber), full opacity |
| **B. Buiten fit-range, binnen meetbereik**     | `t ∈ [eerste_meting_t, laatste_meting_t]` maar NIET in fit-range | Solid lijn, opacity ~0,7 (lichter)            |
| **C. Voorbij meetbereik (echte extrapolatie)** | `t` voor eerste meetpunt of na laatste meetpunt                  | Dashed lijn, opacity ~0,5 (gedimd)            |

Bij `fit-range = trim-range` (default): zone B verdwijnt (fit-range = data-range), je hebt alleen A en C.

#### Implementatie

Drie Chart.js-datasets in plaats van één fit-curve:

- `Fit (fit-range)`
- `Fit (buiten fit-range)`
- `Fit (extrapolatie)`

Bij sampling: voor elk van de 200 punten bepaal de zone (A/B/C) en push 'm naar het juiste array. Datasets krijgen elk hun eigen `borderDash` en `opacity`.

#### Tooltip-labels

Bij hover op een segment toont Chart.js het dataset-label:

- Zone A: `Uit fit-model · t = … · y = …`
- Zone B: `Uit fit-model (buiten fit-bereik) · t = … · y = …`
- Zone C: `Uit fit-model (extrapolatie) · t = … · y = …`

#### Visuele markering van de fit-range zelf

Behoud de huidige lichte achtergrond-tint tussen `fitStart_t` en `fitEnd_t` (uit 07b). Geen extra markering voor data-range nodig — de meetpunt-dots zijn de natuurlijke marker daarvoor.

Tussen `fitEnd_t` en `laatste_meting_t` (zone B aan de rechterkant): geen tint, gewoon de meetpunten met de lichter-fit-segment eroverheen.

### Tweak 5 — Help-sectie "Trim-range vs fit-range"

In `HelpPanel.tsx`, nieuwe of uitgebreide sectie:

#### "Wat is het verschil tussen trim-range en fit-range?"

> Twee verschillende selecties die makkelijk te verwarren zijn:
>
> **Trim-range** is welk deel van de video je _in zijn geheel_ meeneemt voor analyse. Stel je in via stap 3 in de werkbalk. Buiten de trim worden punten gedimd weergegeven en tellen niet mee in tabel en grafieken.
>
> **Fit-range** is welk deel van je meetpunten je gebruikt om een **fit-curve** door te trekken. Stel je in via de Fit-knop bovenaan de grafieken. Standaard gebruikt 'ie je hele trim, maar je kunt 'm strikter zetten — bijvoorbeeld bij een stuiterende bal: trim alle metingen, maar fit alleen op de eerste vrije-val fase.
>
> **Drie zones op de fit-curve**: de wiskundige vergelijking loopt door over de hele zichtbare tijd-as, maar wordt visueel onderscheiden:
>
> - **Binnen je fit-range** (volle lijn): hier is de fit op gebaseerd.
> - **Buiten fit-range, binnen je meetbereik** (lichter): hier heb je wel metingen, maar je hebt 'm bewust niet meegenomen in de fit. Bijvoorbeeld bij een stuiterende bal: het opwaartse stuk na de stuiter is meting, maar valt buiten je vrije-val-fit.
> - **Voorbij je meetbereik** (stippellijn): pure extrapolatie. Dit is wat het wiskundig model voorspelt voor tijden waarop je niets gemeten hebt. Handig om "wat zou er zijn gebeurd als…?" te visualiseren, maar niet onderbouwd door data.
>
> Praktisch: voor een vallende bal trim je van vóór de bal valt tot na de eerste bounce. Je fit-range zet je strikter, alleen op het vallende stuk. De fit-curve loopt door als lichter segment over je opwaartse meetpunten heen, en als stippellijn voorbij je laatste meetpunt — handig om te zien waar de bal volgens je model zou zijn geweest zonder stuiter.

---

## Niet doen (parkeren naar 07f of later)

- ❌ Presets per fysisch scenario (vrije val / slinger / RC) met theorie-vergelijkingen — **07f**
- ❌ Interactieve sliders voor handmatige coefficient-aanpassing — **07f**
- ❌ Pijltjes-navigatie over fit-curve — **niet** (besloten met Jop: meetpunten zijn de echte data)
- ❌ Fit-waardes in tabel — **niet** (besloten met Jop: tabel = ruwe meetdata)
- ❌ Wijziging aan fit-algoritme of fit-types
- ❌ Wijziging aan tracking, kalibratie, andere features

---

## Acceptatie-criteria

### Reset-zoom-knop

- [ ] Knop is niet meer disabled wanneer Tijd-as sync aan staat
- [ ] Icoon vervangen door visueel duidelijker keuze (`Maximize` of `ZoomOut`)
- [ ] Tekst-label "Auto zoom" naast het icoon
- [ ] Hover-tooltip uitleg
- [ ] Bij klik: reset zoom van die pane (lokaal, niet noodzakelijk peers)

### Tijd-as sync

- [ ] Toggle heet "Tijd-as sync" met uitlegtooltip
- [ ] Sync triggert **alleen** bij as-sleep op x-as (middel = pan, eind = zoom)
- [ ] Sync triggert **niet** bij wheel-zoom (waar y meegaat)
- [ ] Sync triggert **niet** bij as-sleep op y-as
- [ ] Bij x-as actie: x-bounds propageren naar peers met t als x-as, y-bounds blijven lokaal
- [ ] Peers zonder eigen zoom-state krijgen wel x-bounds maar geen `-Infinity/Infinity` op y (07c-fix blijft van kracht)

### Coefficient-tooltip

- [ ] Kwadratische y-fit `a`-tooltip: alleen "Halve versnelling in y-richting: 2·a = {2a} m/s²" — geen vrije-val-claim, geen `g`-vergelijking
- [ ] Kwadratische x-fit `a`-tooltip: ongewijzigd ("halve versnelling in x-richting")
- [ ] Lineaire `a`-tooltip: snelheid (ongewijzigd)
- [ ] Sinus `ω`-tooltip: periode + frequentie (ongewijzigd, algemeen)
- [ ] Exponentieel `k`-tooltip: tijdconstante (ongewijzigd, algemeen)

### Fit-curve drie zones

- [ ] Fit-curve gesampled over volledige zichtbare x-range, niet alleen fit-range
- [ ] Drie Chart.js-datasets: fit-range / buiten-fit-binnen-data / extrapolatie
- [ ] Zone A (in fit-range): solid lijn, volle kleur, full opacity
- [ ] Zone B (buiten fit-range, binnen meetbereik): solid lijn, opacity ~0,7
- [ ] Zone C (voorbij meetbereik): dashed lijn, opacity ~0,5
- [ ] Bij `fit-range = trim-range`: zone B is leeg, alleen A en C zichtbaar
- [ ] Tooltip-labels per zone duidelijk (`Uit fit-model`, `… (buiten fit-bereik)`, `… (extrapolatie)`)
- [ ] Fit-range visueel gemarkeerd met lichte achtergrond-tint (zoals 07b)

### Help-sectie

- [ ] Nieuwe of uitgebreide sectie "Wat is het verschil tussen trim-range en fit-range?" met uitleg incl. extrapolatie-concept

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **07f**: presets per fysisch scenario (vrije val, horizontale worp, slinger, RC-circuit, radioactief verval) met expliciete scenario-keuze door gebruiker → conditionele physica-uitleg activeert (bv. zwaartekracht-vergelijking bij "vrije val"-preset). Eventueel interactieve sliders voor handmatige coefficient-aanpassing als ontdek-modus.
- **08-meerdere-meetreeksen**: multi-series datamodel
- **09-ui-polish**: heroverwegen werkbalk-indeling
