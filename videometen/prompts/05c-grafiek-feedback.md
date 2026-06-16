# Claude Code prompt 05c — Videometen: Grafiek-feedback uit gebruik

## Context

Patch-prompt na 05b. Vijf verfijningen op basis van eerste-gebruik feedback:

1. **Layout Analyseren-modus** voelt nog niet helemaal optimaal — video en tabel naast elkaar nemen breedte die liever naar de grafieken gaat
2. **Actieve dot** in grafieken is te subtiel
3. **Raaklijn** is visueel te kort
4. **Type-namen in dropdown** (`x -- t`) zijn onduidelijk
5. **Klik op een grafiek-punt** springt niet meer naar het bijbehorende frame (regressie t.o.v. 05)

Voor context:
- `videometen/prompts/05-grafieken-reusable.md` en `05b-analyse-tweaks.md`
- `videometen/src/_reusable/InteractiveChart.tsx`
- `videometen/src/features/measurements/Graphs.tsx`, `GraphPane.tsx`, `graph-types.ts`
- `videometen/src/App.tsx` — Analyseren-modus layout

---

## Te realiseren

### Tweak 1 — Layout Analyseren-modus: links verticaal gestapeld

In de Analyseren-modus wordt de left-column verticaal gestapeld in plaats van horizontaal:

```
┌─────────────────┬───────────────────────────┐
│  video (tile)   │                           │
├─────────────────┤        grafieken          │
│  tabel          │                           │
└─────────────────┴───────────────────────────┘
```

#### Specs

- **Buitenste layout**: horizontale `PanelGroup` met twee panels (`react-resizable-panels`)
  - Links: ~30% default, minimum ~22%
  - Rechts (grafieken): ~70% default
  - Sleepbare verdeler tussen beide
- **Linker-panel**: verticale `PanelGroup` met twee sub-panels
  - Boven (video-tile): ~45% default, minimum ~25%
  - Onder (tabel): ~55% default
  - Sleepbare verdeler tussen beide
- **Rechter-panel** (grafieken): zoals nu — `Graphs` component met sub-pane-systeem

#### Video-tile gedrag

- Behoudt alle huidige functionaliteit: scrubber, frame-indicator, play/pause, trail-overlay, kalibratie-overlay (oorsprong + assen, zonder scale-streep)
- Past zich aan aan de pane-breedte/hoogte — geen vaste 200 px meer, gewoon volledig responsive binnen het toegewezen paneel
- Aspect-ratio van de video blijft behouden (`object-fit: contain`)

#### State bij modus-switch

`GraphsLayoutState` blijft zoals 'ie is. Voor de nieuwe Analyseren-layout: pane-sizes mogen tijdens de sessie in geheugen worden onthouden (React-state), maar niet in localStorage (komt straks in 06 bij save/load). Bij switch Verken → Analyseren en terug: layout-percentages mogen resetten naar de defaults — focus is dat *grafiek-pane-state* (types, zoom, raaklijn) overleeft, niet dat de pane-sizes 100% identiek zijn.

#### Verken-modus

**Niet wijzigen**. Verken blijft horizontaal: video links groot, tabel rechtsboven, grafieken rechtsonder.

### Tweak 2 — Actieve dot: vaste contrast-kleur

In `InteractiveChart.tsx`, het "selected"-dataset:

- **Fill-kleur**: `#ef4444` (vaste felrood, consistent met modelleren's `pointSelected`)
- **Border**: 2 px witte ring (huidig)
- **Radius**: huidige `selectedDot.radius`, of marginaal verhogen (+1 px) voor extra visuele klap
- **Geldt voor**: de actieve dot in elke grafiek-pane. **Niet** voor de trail-overlay op de video — daar blijft de bestaande "actief-frame ring in contrast-kleur op trail-fill" gehandhaafd (consistent met 03b's kleur-cycle-systeem)

Reden voor onderscheid: in grafieken moet de actieve dot **altijd** opvallen ongeacht trail-kleur (de grafiek heeft sowieso een eigen lijn-kleur). In de video is de actieve trail-dot onderdeel van de cycle-keuze die de leerling zelf instelt — daar past contrast-via-ring beter dan een opgelegde kleur.

### Tweak 3 — Raaklijn loopt tot de grafiek-randen

Huidige implementatie: raaklijn-span = 15% van de totale data-x-range. Te kort.

Nieuwe implementatie in `InteractiveChart.tsx` (waar de raaklijn als extra dataset wordt toegevoegd):

- Bepaal `xMin`/`xMax` uit de **huidige zichtbare** x-range (`chart.scales.x.min` / `chart.scales.x.max` — dus inclusief eventuele zoom-state)
- Raaklijn-eindpunten:
  - `x1 = xMin`, `y1 = midY + slope * (xMin − midX)`
  - `x2 = xMax`, `y2 = midY + slope * (xMax − midX)`
- Laat Chart.js de lijn `clip: true` afkappen aan de grafiek-randen — bij steile slopes loopt 'ie netjes binnen het y-vlak en gaat 'ie niet over de panel-grens
- Bij zoomen / uitzoomen / as-sleep: raaklijn-lengte past zich automatisch aan (recompute bij elke render via de huidige zoom-state)

Lijn-styling onveranderd: 3 px dashed, `#D4923A` (amber, consistent met modelleren).

### Tweak 4 — Type-namen in dropdown: "x tegen t"

Werk de labels in `graph-types.ts` bij van de huidige scheidings-stijl naar natuurlijk Nederlands:

| Huidige label | Nieuwe label |
|---|---|
| `x — t` | `x tegen t` |
| `y — t` | `y tegen t` |
| `vx — t` | `vx tegen t` |
| `vy — t` | `vy tegen t` |
| `|v| — t` | `|v| tegen t` |
| `ax — t` | `ax tegen t` |
| `ay — t` | `ay tegen t` |
| `|a| — t` | `|a| tegen t` |
| `y — x` (baan) | `y tegen x` (baan) |

De optionele `(baan)`-suffix voor `y-x` mag blijven of weggehaald worden — kies wat consistent voelt. Mijn voorkeur: laat 'm staan, want dat onderscheidt 'm visueel van de tijd-grafieken.

Info-tooltips op versnellings-items (ruis bij ruwe data) blijven onveranderd.

### Tweak 5 — Klik op grafiek-punt springt niet naar frame (regressie)

In 05 was de afspraak: klik op een datapunt → `onPointClick(seriesIdx, pointIdx, point)` → `setCurrentFrame(point.meta.frame)` → alle views syncen. Dat werkt niet meer.

#### Diagnose-pad

Vermoedelijk gebroken door één van deze in 05b:

1. **AxisOverlays** (tweak 3 uit 05b) — transparante divs over de as-areas. Zijn die buiten de as-banden uitgelopen en absorberen ze klik-events op het chart-canvas? Check de absolute positioning + `pointer-events`. As-overlays mogen alleen pointer-events vangen *binnen* hun as-band.
2. **Selectie afgeleid uit currentFrame** (tweak 4 uit 05b) — als de afleiding render-state is geworden maar de klik-handler nog naar oude per-pane state schrijft, valt de update weg. Check of de klik-handler `setCurrentFrame` aanroept en niet een lokale `setSelectedIdx`.
3. **Pane-mouse-zone overlay** (tweak 2 uit 05b) — `data-mouse-zone="graph-pane"` op de pane-wrapper. Als die wrapper z-index of pointer-events anders heeft dan verwacht, kunnen klik-events op het canvas wegvallen.

#### Te doen

- Reproduceer in dev-modus: open Analyseren, klik op een datapunt in een grafiek, controleer of `setCurrentFrame` wordt aangeroepen (console.log of breakpoint)
- Fix de root cause; voeg eventueel een regressie-test toe (handmatig is genoeg, geen unit-test verwacht)
- Verifieer dat het ook in Verken-modus werkt
- Verifieer dat het ook werkt na een as-sleep (pan/zoom kan de internal point-positions verschuiven; chart.js' point-detection moet nog steeds correct mappen naar de juiste rij)

---

## Niet doen

- ❌ Geen wijziging aan trail-dot-styling op de video (alleen grafiek-dot wordt rood)
- ❌ Geen wijziging aan raaklijn-kleur of -dikte
- ❌ Geen wijziging aan Verken-modus layout
- ❌ Geen wijziging aan tabel-kolommen (versnellingen blijven uit de tabel, zoals besproken)
- ❌ Geen interpoleerde / fractionele raaklijn tussen meetpunten (komt natuurlijk via fit in 07)
- ❌ Geen wijziging aan workflow-bar of mode-toggle

---

## Acceptatie-criteria

### Layout

- [ ] In Analyseren-modus staan video (boven) en tabel (onder) verticaal gestapeld in een linker-paneel
- [ ] Tussen video en tabel zit een sleepbare verdeler
- [ ] Tussen het linker-paneel en de grafieken zit een sleepbare verdeler
- [ ] Grafieken nemen default ~70% van de breedte (versus ~51% in 05b)
- [ ] Video-tile is responsive binnen het toegewezen paneel (geen vaste 200 px)
- [ ] Alle video-functionaliteit blijft werken (scrubber, frame-step, play/pause, kalibratie-overlay zonder scale-streep, trail-overlay)
- [ ] Verken-modus layout is onveranderd

### Actieve dot

- [ ] Actieve dot in een grafiek-pane is fel rood (`#ef4444`) met witte ring
- [ ] Actieve dot is duidelijk te onderscheiden van trail-kleur, ongeacht welke kleur de leerling heeft gekozen
- [ ] Trail-dot op de video is onveranderd (cycle-kleur + ring zoals in 03b)

### Raaklijn

- [ ] Raaklijn loopt van de linker- tot de rechter-grens van de **huidige zichtbare** x-range
- [ ] Bij in/uitzoomen of as-sleep past de raaklijn-lengte zich aan
- [ ] Bij steile slopes wordt de raaklijn netjes binnen de grafiek geclipt (geen overflow buiten de pane)
- [ ] Het `dy/dx = …`-label staat nog steeds gecentreerd op de raaklijn-anker

### Type-namen

- [ ] Dropdown toont alle types in de vorm "x tegen t", "vx tegen t", "|v| tegen t", etc.
- [ ] `y-x` toont als "y tegen x" of "y tegen x (baan)"
- [ ] Info-tooltip bij versnellings-items is onveranderd

### Klik-fix

- [ ] Klik op een datapunt in een grafiek-pane springt de video naar dat frame
- [ ] Werkt in zowel Verken- als Analyseren-modus
- [ ] Werkt ook na as-sleep (pan/zoom)
- [ ] As-sleep-overlays absorberen geen klik-events buiten hun eigen zone

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit uit prompts 01–05b blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **06-export-help**: save/load project als JSON met versienummer (inclusief grafiek-layout én huidige modus), CSV-export van de tabel, PNG-export per grafiek via `chart.toBase64Image()`, help-paneel in CircuitSketch-accordion-stijl (incl. camera-vereisten-sectie + uitleg van de werkmodi)
- **07-functie-fit**: per grafiek-pane keuze tussen "ruwe data" en "fit", fit-types lineair / kwadratisch / sinus / exponentieel, afgeleide-van-fit als bron voor v- en a-grafieken (gladder dan numerieke differentiatie + zinvolle raaklijn op fractionele x-waardes), pedagogische vergelijking ruis vs fit
