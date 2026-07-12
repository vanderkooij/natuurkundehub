# Claude Code prompt 09 — Videometen: Grafiek-pane responsive + overflow + help-toevoeging

## Context

Veel leerlingen werken op kleine Chromebooks. De grafiek-pane-header heeft inmiddels veel knoppen (type-dropdown, Raaklijn, Meten, Lijn, Fit, PNG, Auto zoom, ×) en die vallen op smalle panes deels weg buiten beeld. Plus bij 4 panes in een 2x2 grid is elke pane sowieso te smal voor alle knoppen.

Vier wijzigingen:

1. **Help-paneel** krijgt een korte uitbreiding over "modellen en afwijkingen" — pedagogisch belangrijk dat leerlingen weten dat een fit een vereenvoudiging is.
2. **Pane-header responsive met overflow-menu**: alleen essentiële controls altijd zichtbaar; de rest verhuist naar een `⋯`-menu.
3. **Layout automatisch op basis van schermbreedte**: gebruiker kiest aantal panes (1–4), de tool beslist of ze naast of onder elkaar komen.
4. **Focus-modus voor grafieken** op smalle schermen: optionele toggle die tabel + video compacter maakt zodat grafieken meer ruimte krijgen.

Voor context:

- `videometen/src/features/measurements/GraphPane.tsx` — pane-header met knoppen
- `videometen/src/features/measurements/Graphs.tsx` — container met layout-logica
- `videometen/src/features/measurements/GraphsLayoutState.tsx` — pane-state
- `videometen/src/features/help/HelpPanel.tsx` — uit te breiden
- `videometen/src/App.tsx` — Analyseren-layout

---

## Te realiseren

### Tweak 1 — Help-paneel: "Modellen en afwijkingen"

In `HelpPanel.tsx`, nieuwe sectie direct na "Waarom is mijn afgeleide ruisig bij R² = 1?":

#### "Wanneer de fit de meting niet helemaal volgt"

> Bij ideale, voorspelbare bewegingen sluiten fit-curve en scatter heel dicht op elkaar aan. Maar bij echte experimenten zie je vaak afwijkingen — en die kunnen leerzaam zijn.
>
> De fit toont een ideaal-model: een sinus met constante amplitude, een parabool met constante versnelling, etc. In de werkelijkheid kunnen die grootheden veranderen door demping (energie weglekken — luchtweerstand, wrijving) of energie-input (actief schommelen, externe kracht). Afwijkingen tussen scatter en fit-curve geven informatie over die niet-gemodelleerde fenomenen.

Lay-out consistent met andere help-secties. Geen extra interactie nodig.

### Tweak 2 — Pane-header met overflow-menu

#### Concept

De pane-header krijgt twee modi op basis van pane-breedte:

- **Breed (≥ 480 px)**: alle knoppen in lijn zichtbaar (huidige gedrag)
- **Smal (< 480 px)**: alleen essentiële controls + `⋯`-overflow-menu

De drempel 480 px is een **richtwaarde** — gebruik wat visueel werkt op test (laat Claude Code pragmatisch tunen).

#### Altijd zichtbaar in pane-header

1. **Type-dropdown** (`x tegen t` etc.) — essentieel voor pane-identificatie
2. **Auto zoom** — essentieel voor reset
3. **`⋯`-overflow-menu** — toegang tot rest van functies
4. **×** (sluiten) — essentieel voor pane-management

#### In overflow bij smal

Verhuizen naar overflow:

- Raaklijn
- Meten
- Lijn
- Fit
- PNG

In het overflow-menu blijven de tekst-labels staan (geen icon-only menu — consistent met onze label-policy).

#### Visuele indicator voor actieve toggles

Op de `⋯`-knop een **kleine accent-dot** of `badge`-indicator wanneer een van de toggles binnen het menu actief is (Raaklijn, Meten, Lijn, of Fit). Zo ziet de leerling in één oogopslag of er "ergens iets aan staat" zonder het menu te openen.

PNG is een actie, geen toggle — telt niet mee voor de indicator.

#### Brede pane: niet veranderen

Bij ≥ 480 px blijft alles inline. Geen overflow-menu zichtbaar.

#### Tussenliggende breedtes

Als 't pragmatisch werkt: bij medium breedte mag een subset al naar overflow (bv. eerst PNG en Lijn, daarna Meten, dan Raaklijn). Cascade. Of: hard cutover bij 480 px. Kies wat visueel rustig oogt.

### Tweak 3 — Layout automatisch op basis van schermbreedte

#### Aantal panes door gebruiker

`+`-knop (max 4 panes) en `×`-knop per pane — onveranderd.

#### Layout bepaling: tool kiest

Op basis van **schermbreedte** (window-resize-listener of CSS-media-queries):

| Panes | Brede scherm (≥ 1024 px) | Medium (640-1024 px) | Smal (< 640 px)    |
| ----- | ------------------------ | -------------------- | ------------------ |
| 1     | full width               | full width           | full width         |
| 2     | naast elkaar (1×2)       | naast elkaar (1×2)   | onder elkaar (2×1) |
| 3     | naast elkaar (1×3)       | 2-naast + 1-onder    | onder elkaar (3×1) |
| 4     | 2×2 grid                 | 2×2 grid             | onder elkaar (4×1) |

Drempelwaardes zijn richtwaardes — laat Claude Code valideren op gebruikelijke device-breedtes (1366 px laptop, 1280 px iPad landscape, etc.) en eventueel finetunen.

#### Implementatie

In `Graphs.tsx`: lees window-breedte (via `useEffect` + resize-listener of via Tailwind responsive classes). Bepaal layout-mode (`'horizontaal'` / `'hybride'` / `'vertikaal'`). Verdeel panes over `react-resizable-panels` Groups in passende structuur.

`react-resizable-panels` ondersteunt geneste Groups — verticaal voor onder-elkaar, horizontaal voor naast-elkaar. Mix mogelijk voor 4-panes-2x2 (twee horizontale rijen binnen een verticale group, of andersom).

### Tweak 4 — "Grafieken vergroten"-toggle voor smalle schermen

#### Concept

Bij smal scherm met meerdere panes onder elkaar wordt de Analyseren-layout (video links klein + tabel + grafieken) krap. Optionele **toggle** die de tabel + video samen verkleint zodat grafieken meer ruimte krijgen. Bij scroll mogen tabel + video tijdelijk uit beeld vallen — dat is de bewuste keuze van de gebruiker.

#### Plaatsing

In de **Graphs-container-header** (naast `Fit`-knop, of waar pasend):

- Knop **"Grafieken vergroten"** met expand-icoon
- Toggle-state in lichte UI-state (`graphsFocusMode: boolean`, default `false`)
- Reset bij Meten ↔ Analyseren-wissel, nieuwe video, of "Begin opnieuw"

#### Effect

- **`graphsFocusMode: false`** (default): huidige Analyseren-layout — video + tabel links (compact), grafieken rechts groot. `react-resizable-panels` met huidige verhoudingen
- **`graphsFocusMode: true`**: tabel + video samen gecollapsed naar minimum-breedte (bv. 200 px of helemaal verborgen onderaan via scroll), grafieken vullen volledige beschikbare breedte. Scroll om bij tabel/video te komen.

Bij brede schermen heeft de toggle minder effect maar werkt nog steeds — leerling kan 'm gebruiken om grafieken extra prominent te maken bij presentatie.

#### Niet doen

- Niet automatisch toggelen op basis van scherm-breedte. Gebruiker beslist.
- Niet voor Meten-modus relevant (geen tabel/grafieken zichtbaar daar). Toggle alleen zichtbaar in Analyseren-modus.

---

## Hygiëne-check

- Bekijk welke iconen consistent zijn met de bestaande Lucide-icoonset
- Tijdens uitvoer noteren of bepaalde Tailwind responsive utilities (`md:`, `lg:`) elegant samenwerken met `react-resizable-panels` of dat we breakpoints zelf moeten doen via JS

---

## Niet doen (parkeren naar 10+)

- ❌ Video-laden bugs (venster-verkleining, autoplay-frames) — **10**
- ❌ Assen-stap herontwerp (+x richting, +y richting, sleep-tooltip) — **10**
- ❌ Sliders / inputs voor fit-coefficient tweaking — later (apart pedagogisch ontwerp)
- ❌ Mobile-stijl layout (zoals webshop op telefoon) — niet nodig, leerlingen werken op Chromebooks

---

## Acceptatie-criteria

### Help

- [ ] Nieuwe sectie "Wanneer de fit de meting niet helemaal volgt" in help-paneel, na "Waarom is mijn afgeleide ruisig bij R² = 1?"
- [ ] Tekst correct, zonder slotzinnetje "dat is leerwaarde geen meetfout"

### Pane-header responsive

- [ ] Bij ≥ 480 px pane-breedte: alle knoppen inline (huidige gedrag)
- [ ] Bij < 480 px: alleen type-dropdown, Auto zoom, `⋯`-menu, × zichtbaar
- [ ] Overflow-menu bevat: Raaklijn, Meten, Lijn, Fit, PNG met tekst-labels
- [ ] Toggle-state (Raaklijn / Meten / Lijn / Fit) blijft werken vanuit menu
- [ ] Accent-indicator op `⋯`-knop wanneer een toggle actief is
- [ ] Type-dropdown blijft uitklappen bij smal — geen overflow voor essentials

### Layout automatisch

- [ ] 1 pane: full width op alle scherm-breedtes
- [ ] 2 panes: naast bij breed/medium, onder bij smal (< 640 px)
- [ ] 3 panes: 1×3 bij breed, 2+1 bij medium, 3×1 bij smal
- [ ] 4 panes: 2×2 bij breed/medium, 4×1 bij smal
- [ ] Window-resize triggert herberekening
- [ ] Pane-state in `GraphsLayoutState` overleeft layout-changes

### Focus-modus

- [ ] "Grafieken vergroten"-toggle zichtbaar in Analyseren-modus container-header
- [ ] Default uit; toggle aan → tabel + video compacter, grafieken groter
- [ ] State `graphsFocusMode` reset bij Meten ↔ Analyseren-wissel / nieuwe video / Begin opnieuw
- [ ] Toggle niet zichtbaar in Meten-modus

### Algemeen

- [ ] Bestaande functionaliteit blijft intact (zoom, fit, sleep, etc.)
- [ ] Geen console-errors of warnings
- [ ] `npm run build` succesvol

---

## Volgende prompts

- **10-video-bugs-en-assen-herontwerp**: video-laden bugs (venster-verkleining, autoplay-frames) + assen-stap herontwerp (sleep-tooltip, +x richting links/rechts, +y richting omhoog/omlaag)
- **11-presets**: per fysisch scenario (vrije val, slinger) met conditionele physica-uitleg
- **12-meerdere-meetreeksen**: multi-series datamodel
