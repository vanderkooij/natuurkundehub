# Claude Code prompt 05b — Videometen: Analyse-modus + grafiek-interactie

## Context

Patch-prompt na 05. De grafieken-stack staat, maar drie observaties uit gebruik vragen om uitbreiding:

1. **Grafieken zijn klein** in de 3-pane-default. Video neemt veel ruimte, terwijl video buiten tracking-modus alleen nog dient voor referentie/scrubben.
2. **Pijltjes-navigatie** zit nu vast op frame-step. Tijdens grafiek-analyse wil je met ←/→ door datapunten van de actieve grafiek lopen.
3. **As-interactie** is beperkt tot wheel-zoom en chart-area-drag-pan. Slepen op de as zelf (pan of zoom afhankelijk van waar je grijpt) is een natuurlijker patroon.

Daarnaast: selectie-sync werkt nog niet over panes. Eén geselecteerd punt komt overeen met één tijdsframe — dus zou overal hetzelfde moeten zijn.

Voor context:
- `videometen/prompts/05-grafieken-reusable.md` — basis-implementatie
- `videometen/src/_reusable/InteractiveChart.tsx` — wrapper rond Chart.js
- `videometen/src/features/measurements/Graphs.tsx` — sub-pane container

---

## Te realiseren

### Tweak 1 — Werk-modi top-level toggle

Naast de bestaande workflow-bar komt een **modus-toggle** in de app-header (rechts naast tool-naam, of in de workflow-bar uiterst links — kies wat visueel rustig blijft):

| Modus | Status | Layout |
|---|---|---|
| **Verken** (default) | nieuw label voor huidige 3-pane | video links groot, tabel rechtsboven, grafieken rechtsonder — zoals nu |
| **Analyseren** | nieuw | video klein (~200 px breed) in linkerbovenhoek of als compacte balk, tabel + grafieken nemen de rest van de content-zone |
| **Tracken** | bestaand | fullscreen video, geen panels — onveranderd, schakelt via "▶ Start tracking" |

#### Analyseren-modus details

- Video-tile blijft klein maar volledig functioneel: scrubber, frame-indicator, play/pause, trail-overlay, kalibratie-overlay (oorsprong + assen, niet de scale-streep — consistent met bestaande regels)
- Frame-stappen / play / scrub blijven werken — dit is *kijken naar de meting* op een specifiek moment, niet *opnieuw meten*
- Tabel + grafieken delen de rest van de breedte via `react-resizable-panels` (default 40% tabel / 60% grafieken; sleepbaar)
- Workflow-bar blijft zichtbaar
- Switchen tussen Verken ↔ Analyseren behoudt:
  - Welke grafiek-panes openstaan (en hun types, zoom, raaklijn/meet-state)
  - Tabel scroll-positie
  - currentFrame, selectedFrame
- Switchen verliest niet: helemaal niets bewust, alle state is shared via providers
- Schakelen naar Tracken-modus vanuit Analyseren werkt zoals altijd via "▶ Start tracking"; bij exit Tracken keer je terug naar de modus waar je vandaan kwam (Verken of Analyseren)

#### Visuele toggle

Compacte segmented-toggle met twee opties zichtbaar: `Verken | Analyseren`. (Tracken is geen handmatige optie in deze toggle — die wordt automatisch geactiveerd via de Start-tracking-knop en automatisch verlaten via Escape.) Bij switch: smooth layout-transition (geen jarring jump).

State leeft in app-level `mode: 'verken' | 'analyseren' | 'tracken'`. Default `'verken'`.

### Tweak 2 — Pijltjes context-aware via muis-positie

Vervang de huidige globale frame-step pijltjes-handler door een **context-aware versie** die kijkt waar de muis zich bevindt op het moment van de key-press:

| Cursor over... | ←/→ doet... | Shift+←/→ |
|---|---|---|
| een grafiek-pane | navigeert naar vorig/volgend datapunt in die pane (sync `currentFrame`, zie tweak 4) | 10 punten terug/vooruit |
| de video-tile | frame-step (huidige gedrag) | 10 frames terug/vooruit |
| tabel of elders (geen specifieke zone) | frame-step (default) | 10 frames terug/vooruit |

#### Implementatie

- Global `mousemove`-listener op de app-root die de huidige `MouseZone` bijhoudt: `'graph-pane' | 'video' | null`
- Bij `mouseleave` van de window: zone wordt `null` (= default-gedrag)
- Pane-elementen krijgen een `data-mouse-zone="graph-pane"` attribuut met `data-pane-id="…"` zodat de zone-detectie weet *welke* grafiek-pane onder de cursor zit
- Video-container krijgt `data-mouse-zone="video"`
- Pijltjes-handler leest de huidige zone + pane-id en dispatcht passend
- Inputs/selects blokkeren de pijltjes nog steeds (bestaande regel uit 01)
- Tijdens Tracken-modus: pijltjes altijd frame-step (er zijn geen grafieken zichtbaar)

#### Visuele cue

Subtiele accent-outline (1px, `var(--accent)`, opacity 0.4) rond de pane die "actief" is voor pijltjes-input. Verschijnt als de muis erin staat en je een navigatie-toets gebruikt. Vervaagt na ~600ms idle. Doel: leerling beseft "ah, ik kan met de pijltjes door deze grafiek lopen".

### Tweak 3 — As-sleep voor pan en zoom

Op elke as (x én y) van een grafiek-pane: pointer-down + drag levert pan of zoom op, afhankelijk van waar je grijpt.

#### Zone-indeling per as

Elke as wordt verdeeld in drie zones:

```
[zoom-laag] [        pan        ] [zoom-hoog]
 ←—— 20% ——→  ←—— 60% middel ——→  ←—— 20% ——→
```

- **Middelste 60%** → cursor `grab` (tijdens drag: `grabbing`), drag = **pan**: alle as-bounds schuiven gelijk mee, andere as blijft
- **Buitenste 20% aan elk eind** → cursor `ew-resize` (x-as) / `ns-resize` (y-as), drag = **zoom vanaf dat eind**: het tegenovergestelde uiteinde blijft vast, het sleep-uiteinde beweegt

Pixel-conversie: bereken hoeveel data-units één pixel verplaatsing is op de huidige schaal, en schuif/rek de as-bounds entsprechend.

#### Implementatie

- Transparante absolute overlay-divs over de as-areas binnen `InteractiveChart` (Chart.js geeft daar geen native ondersteuning voor)
- Drie kindelementen per as-overlay (lo-zone / mid-zone / hi-zone) met eigen cursor-style + pointerdown-handler
- Tijdens drag: window-listeners voor `pointermove` + `pointerup`
- Per move-event: bereken nieuwe `xMin`/`xMax` of `yMin`/`yMax`, update via dezelfde route als wheel-zoom (`zoomState` + `onZoomChange`)
- Drag-snelheid: 1:1 met pixel-displacement
- Edge-cases:
  - Pan beyond auto-fit data range: toegestaan (gebruiker mag uitzoomen om context te zien)
  - Zoom tot bijna-nul range: clamp op minimum-range (bijv. data-range / 1000)
  - Inverteren (sleep-uiteinde voorbij het andere uiteinde): clamp, geen flip

#### As-overlay-disable in InteractiveChart-props

Optionele prop `axisDrag?: { x?: boolean; y?: boolean }` (default beide `true`). Zo kan een toekomstige consumer dit uitschakelen als ze het niet willen.

### Tweak 4 — Selectie sync over panes + sync-toggle uitbreiding

#### Selectie = currentFrame, overal hetzelfde

Eén geselecteerd punt = één tijdsframe = consistent overal:

- Verwijder per-pane `selectedIdx`-state. Vervang door afgeleide: `selectedIdx = rows.findIndex(r => r.frame === currentFrame)` per pane
- Klik op een punt in pane A → `setCurrentFrame(row.frame)` → alle panes (en tabel + trail) tonen synchroon de actieve selectie
- Pijltjes-navigatie binnen een pane (uit tweak 2): vorige/volgende datapunt-rij → vertaalt naar `setCurrentFrame(rows[newIdx].frame)`
- Voor `y-x`-panes: geen tijd-as, maar selectie werkt nog steeds correct (alle rijen hebben een frame, dus selectedIdx blijft definieerbaar)

#### X-zoom-sync uitbreiden met as-sleep

De bestaande "X-zoom synchroniseren"-toggle uit 05 propageert nu ook **as-sleep-bewegingen**:

- Pan op x-as van pane A → x-as van alle andere t-panes pant mee (zelfde delta)
- Zoom op x-as-uiteinde van pane A → x-as van andere t-panes zoomt mee
- Y-as-bewegingen blijven altijd lokaal per pane
- Ping-pong-suppressie zoals bestaand patroon (een gepropageerde update mag niet opnieuw triggeren)

---

## Niet doen

- ❌ Geen apart "alleen grafieken"-modus (Analyseren met klein video-tile is de uitkomst — gebruiker kan video-pane verder verkleinen via de bestaande resize-handle als 'ie écht weg wil)
- ❌ Geen tweede reset-zoom-knop voor losse assen (huidige globale reset blijft)
- ❌ Geen wijziging aan wheel-zoom of chart-area drag-pan (`chartjs-plugin-zoom` doet die nog steeds)
- ❌ Geen aanpassing aan kalibratie / tracking / tabel / kleur-cycle / save-load
- ❌ Geen nieuwe modus-keuze in de toggle behalve Verken/Analyseren (Tracken is een geactiveerde state, geen handmatige optie)

---

## Acceptatie-criteria

### Werk-modi

- [ ] Segmented toggle "Verken | Analyseren" zit in de app-header / workflow-bar
- [ ] In Verken-modus is de layout zoals voorheen (video links groot, tabel + grafieken rechts)
- [ ] In Analyseren-modus is de video een compacte tile (~200 px breed), tabel + grafieken nemen de rest
- [ ] Video in Analyseren-modus heeft nog steeds scrubber, frame-indicator, play/pause en kalibratie-overlay (zonder scale-streep)
- [ ] Switchen Verken ↔ Analyseren behoudt grafiek-panes (types, zoom, raaklijn-state) en `currentFrame`
- [ ] Switchen naar Tracken werkt zoals altijd via "▶ Start tracking"; bij exit keert app terug naar de modus waarvanuit Tracken werd gestart

### Pijltjes context-aware

- [ ] Cursor over een grafiek-pane: ←/→ navigeert naar vorig/volgend datapunt in die pane
- [ ] Cursor over de video: ←/→ doet frame-step (huidige gedrag)
- [ ] Cursor elders (tabel, header, niemandsland): ←/→ valt terug op frame-step
- [ ] `Shift+←/→` werkt als 10×-multiplier in beide contexten
- [ ] Pijltjes in inputs/selects worden niet onderschept
- [ ] Subtiele accent-outline verschijnt op de actieve pane bij navigatie en vervaagt na ~600ms
- [ ] In Tracken-modus zijn pijltjes altijd frame-step (geen grafiek zichtbaar)

### As-sleep

- [ ] Op elke x-as en y-as: cursor wordt `grab` over de middelste 60%
- [ ] Drag in midden = pan: hele as schuift, andere as blijft
- [ ] Cursor wordt `ew-resize` / `ns-resize` aan de buitenste 20% van elk uiteinde
- [ ] Drag aan een uiteinde = zoom vanaf dat uiteinde: tegenoverliggend uiteinde blijft vast
- [ ] Zoom kan niet onder een minimum-range (clamp)
- [ ] Pan voorbij auto-data-range is toegestaan
- [ ] Wheel-zoom en chart-area-pan blijven werken (geen conflict)

### Selectie + sync

- [ ] Klik op een datapunt in pane A: alle andere t-panes + tabel + trail tonen synchroon dat frame als actief
- [ ] Pijltjes binnen een grafiek-pane verplaatsen `currentFrame` naar het volgende meetpunt; alle views volgen
- [ ] X-zoom-sync toggle is aan: as-sleep op de x-as van één t-pane propageert naar alle andere t-panes
- [ ] X-zoom-sync toggle is uit: as-sleep blijft lokaal aan één pane
- [ ] Y-as-bewegingen zijn altijd lokaal, ongeacht de sync-toggle
- [ ] Geen ping-pong (oneindige loop) bij gepropageerde updates

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit uit prompts 01–05 blijft intact (tracking, kalibratie, theme, trim, kleur-cycle, tabel, raaklijn, meet-lijnen)
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **06-export-help**: save/load project als JSON met versienummer (inclusief grafiek-layout én huidige modus), CSV-export van de tabel, PNG-export per grafiek via `chart.toBase64Image()`, help-paneel in CircuitSketch-accordion-stijl (incl. camera-vereisten-sectie + uitleg van de werkmodi)
- **07-functie-fit**: per grafiek-pane keuze tussen "ruwe data" en "fit", fit-types lineair / kwadratisch / sinus / exponentieel, afgeleide-van-fit als bron voor v- en a-grafieken, pedagogische vergelijking ruis vs fit
