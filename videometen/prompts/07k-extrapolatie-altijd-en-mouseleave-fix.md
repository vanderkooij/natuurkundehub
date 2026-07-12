# Claude Code prompt 07k — Videometen: Extrapolatie altijd aan + wheel/pan stabiel bij mouseleave

## Context

Twee dingen na 07j:

1. **Extrapolatie altijd aan.** Hygiëne-keuze in lijn met "less is more": de toggle wordt verwijderd, zone C is altijd zichtbaar. Minder UI, minder state, minder schema-veld om te migreren bij toekomstige bumps.

2. **Wheel-zoom en pan verliezen hun stand bij mouseleave.** De 07j-fix met `chartOwnsZoomRef` houdt de zoom stabiel zolang de muis in de chart staat. Zodra de cursor de chart verlaat, springt 'ie terug naar autozoom. Pan via chartjs-plugin-zoom (slepen binnen chart-area) heeft hetzelfde patroon.

Vermoedelijke oorzaak voor #2: bij mouseleave triggert een hover-state-cleanup (`setHoveredIdx(null)` of vergelijkbaar) een React re-render. Tijdens die re-render bouwt `buildConfig` een nieuwe `cfg.options` met **niceAxis-autozoom-bounds** in `scales.x/y.min/max`. De prop-sync useEffect doet daarna PIN — maar tegen die tijd is `cfg.options` met autozoom-bounds mogelijk al toegepast op de chart. PIN heeft dan niets meer te pinnen.

Voor context:

- `videometen/prompts/07j-wheel-race-en-extrapolatie.md` — `chartOwnsZoomRef`
- `videometen/prompts/07i-zoom-pin-fix.md` — null-guard PIN
- `videometen/src/_reusable/InteractiveChart.tsx` — `buildConfig`, prop-sync, mouseleave handler
- `videometen/src/features/measurements/FitButton.tsx` — extrapolatie-checkbox
- `videometen/src/features/measurements/GraphsLayoutState.tsx` — `FitConfig.showExtrapolation`
- `videometen/src/features/project/projectSchema.ts` — schema v5 → v6

---

## Te realiseren

### Tweak 1 — Extrapolatie altijd aan, checkbox weg

#### Verwijderen

- **UI**: checkbox + uitleg-tekst "Toon extrapolatie buiten meetbereik" uit fit-popover (`FitButton.tsx`)
- **State**: `showExtrapolation: boolean` veld uit `FitConfig` in `GraphsLayoutState`
- **Logica**: alle `if (showExtrapolation)`-takken — vervang door **altijd aan**:
  - `viewTRange`-extensie met 30% margin altijd toepassen wanneer er een fit actief is (geen voorwaardelijke check meer)
  - Zone C-dataset altijd opbouwen
- **JSON-schema**: `showExtrapolation`-veld uit `ui.fitConfig` weg

#### Schema-migratie v5 → v6

```ts
PROJECT_SCHEMA_VERSION = 6;

function migrateV5toV6(v5: ProjectV5JSON): ProjectV6JSON {
  // Verwijder showExtrapolation; alles anders ongewijzigd
  const { showExtrapolation, ...fitConfigZonderField } = v5.ui.fitConfig;
  return {
    ...v5,
    schemaVersion: 6,
    ui: {
      ...v5.ui,
      fitConfig: fitConfigZonderField,
    },
  };
}
```

Dispatcher-keten v1 → v2 → ... → v6. Save schrijft altijd v6.

#### Hygiëne-check tijdens uitvoer

Na de verwijdering kort rondkijken of er ergens stale code achterblijft (ongebruikte imports, geslote takken). Documenteer eventuele opruim-suggesties in het rapport.

### Tweak 2 — Wheel-zoom en pan stabiel bij mouseleave

#### Diagnose-pad (eerst code-trace)

Lees `InteractiveChart.tsx` en check:

1. **Wat gebeurt bij mouseleave?** Is er een `onMouseLeave` of `onPointerLeave` handler die `setHoveredIdx(null)` aanroept, of een vergelijkbare state-clean? Triggert dat een re-render?
2. **Wat doet `buildConfig` bij elke render?** Bouwt 'm `cfg.options.scales.x/y.min/max` op uit `niceAxis` (= autozoom)? Of overschrijft 'm met zoomState? In welke volgorde?
3. **Hoe wordt `cfg` toegepast op `chart`?** In welk useEffect, met welke deps? Loopt de prop-sync (PIN/USE-cfg) **vóór** of **na** de `chart.options = cfg.options`-assignment?
4. **Is er een aparte useEffect die `chart.options = cfg.options` doet zonder PIN-correctie?** Dan zou die mouseleave-render altijd autozoom-bounds toepassen, en de PIN-useEffect heeft daarna niets meer te beschermen.

Hypothese die de symptomen het beste verklaart:

- Bij re-render (door mouseleave) wordt `buildConfig` opnieuw aangeroepen → `cfg.options.scales.x.min/max` krijgt niceAxis-autozoom-waardes
- Eén useEffect schrijft `chart.options = cfg.options` (of vergelijkbaar) → chart heeft nu autozoom-bounds
- Vervolg-useEffect (PIN/USE-cfg) probeert te pinnen op chart's "huidige" scales, maar die zijn al weer autozoom

#### Fix-richting

Twee mogelijke patronen om aan te brengen:

**A. Eén useEffect met juiste volgorde**: vóór `chart.options = cfg.options` (of `chart.update`), pas de PIN-logica toe op `cfg.options.scales.x/y.min/max` direct (zet ze op `chart.scales.x.min/max` als we willen pinnen). Dan is de assignment self-consistent.

**B. `buildConfig` houdt zelf rekening met `chartOwnsZoomRef`**: als die `true` is, gebruik dan `chart.scales.x.min/max` in `cfg.options.scales` i.p.v. niceAxis-autozoom. Maar dat brengt rendering- en effect-logica te dicht op elkaar.

Patroon A is meestal cleaner. Pas de fix toe op basis van wat de code-trace aantoont.

Belangrijk: `chartOwnsZoomRef` moet `true` **blijven** zolang de gebruiker niet expliciet reset (= Auto zoom-klik) of een nieuwe externe wijziging doorgeeft. Niet meer one-shot reset na één cycle. Want elke re-render in dezelfde "zoom-sessie" moet de wheel-stand respecteren.

#### Pan via chartjs-plugin-zoom

Pan loopt via dezelfde emit-keten als wheel. Als de fix voor #2 generiek genoeg is, dekt 'ie pan automatisch. Verifieer in acceptatie.

#### Verificatie-scenario's

1. **Wheel-zoom + mouseleave**: scroll op een chart, beweeg cursor uit de chart → zoom-stand blijft
2. **Wheel-zoom + mouseleave + terug**: scroll, leave, kom terug → nog steeds de gezoomde stand
3. **Pan (drag binnen chart)**: slepen + loslaten → stand blijft, ook na mouseleave
4. **Auto zoom-knop**: reset naar autozoom werkt nog (klik triggert geen `chartOwnsZoomRef` = true)
5. **As-sleep**: gaat via directe `onChange` → werkt nog, geen interferentie
6. **Initial-load**: vx-t pane y-bounds matchen scatter (07i-fix blijft)
7. **Wheel + Auto zoom + wheel**: nieuwe zoom-sessie werkt vanuit reset-staat

---

## Niet doen

- Geen verdere wijzigingen aan de PIN-logica buiten wat strikt nodig is voor de mouseleave-fix
- Geen nieuwe features
- Geen wijzigingen aan tracking, kalibratie, tabel, export

---

## Acceptatie-criteria

### Extrapolatie altijd aan

- [ ] Checkbox weg uit fit-popover
- [ ] `showExtrapolation` veld weg uit `FitConfig`
- [ ] Alle `if (showExtrapolation)`-takken vervangen door altijd-actief gedrag
- [ ] Zone C is altijd zichtbaar wanneer er een fit actief is
- [ ] Schema bump v5 → v6 met `migrateV5toV6` die het veld dropt
- [ ] Hygiëne-check uitgevoerd, opmerkingen in rapport

### Wheel/pan stabiel bij mouseleave

- [ ] Wheel-zoom blijft staan bij mouseleave
- [ ] Pan-zoom (drag binnen chart) blijft staan bij mouseleave en na loslaten
- [ ] Auto zoom-knop blijft werken
- [ ] As-sleep blijft werken
- [ ] Initial-load van vx-t/ax-t blijft correct
- [ ] Root cause gedocumenteerd in comment
- [ ] `chartOwnsZoomRef` of equivalent reset bij expliciete autozoom-actie

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts

- **08-werkbalk-en-video-polish**: compacte werkbalk voor kleinere schermen, fix venster-verkleining bij video-load, fix autoplay van enkele frames na load
- **09-presets**: presets per fysisch scenario
- **10-meerdere-meetreeksen**: multi-series datamodel
