# Claude Code prompt 08 — Videometen: Werkbalk-polish + workflow-stappen + start-layout

## Context

Eerste UX-polish-ronde. Geen architectuur-wijziging, alleen verfijningen rond werkbalk, workflow-stappen, app-header-buttons en de start-layout van de tool.

Vijf concrete dingen die uit gebruik door Jop naar voren kwamen:

1. **Verken/Analyseren-toggle** staat nu **links** van de workflow-stappen — Jop wil 'm **rechts van Start tracking** (= consistente "actie-zone" rechts in de werkbalk).
2. **Stappen-arcering**: stap 5 (Assen) wordt direct als done getoond na video-load, terwijl er geen bewuste actie is geweest. Dat klopt niet — kalibratie van assen vereist actieve aanraking door de leerling.
3. **Start tracking** is nu disabled tot **schaal** gezet is. Moet ook **wachten op assen-actie** (zodat tracking pas mogelijk is na bewuste kalibratie-fase).
4. **App-header-buttons** (drie-puntjes menu, help, theme-toggle) zijn klein t.o.v. de overige werkbalk-elementen. Maakt het menu lastig vindbaar.
5. **Start-layout**: tabel + grafieken-panes verschijnen direct bij upload, terwijl er nog geen metingen zijn — "Stel eerst de schaal in"-empty-states voegen weinig toe. Cleaner is: alleen video-pane zichtbaar zolang er nog geen metingen zijn. Pedagogisch ook beter: video → kalibreren → tracken → analyseren als opbouwende workflow.

Hygiëne-afspraak blijft van kracht (less is more).

Voor context:

- `videometen/src/features/layout/WorkflowBar.tsx` (of waar de stappen zitten) en `AppHeader.tsx`
- `videometen/src/features/calibration/CalibrationState.tsx` — axes-state + bewuste-aanraking-tracking
- `videometen/src/features/app/ToolMenu.tsx` + help-knop + theme-toggle in header
- `videometen/src/features/layout/ThreePaneLayout.tsx` of `App.tsx` — Verken-layout
- `videometen/src/features/measurements/Table.tsx` / `Graphs.tsx` — empty-states

---

## Te realiseren

### Tweak 1 — Verken/Analyseren-toggle naar rechts van Start tracking

In de werkbalk-layout (vermoedelijk `WorkflowBar.tsx`):

- Verplaats de **Verken | Analyseren**-toggle van zijn huidige positie (links naast / boven de stappen) naar **rechts van de "▶ Start tracking"-knop**
- Visueel: een rij die links de stappen heeft, rechts Start tracking + mode-toggle
- Werkbalk verticaal/horizontaal blijft zoals 't is

Geen wijziging aan toggle-functionaliteit zelf — alleen positie.

### Tweak 2 — Stappen-arcering correct per workflow-step

Nieuwe done/todo logica voor de zes workflow-stappen:

| Stap       | Done wanneer                                                                |
| ---------- | --------------------------------------------------------------------------- |
| 1. Video   | Video is geladen (huidige gedrag)                                           |
| 2. fps     | Video is geladen (huidige gedrag — fps wordt automatisch gedetecteerd)      |
| 3. Trim    | Video is geladen (huidige gedrag — default = volledige range)               |
| 4. Schaal  | `scale !== null` (huidige gedrag)                                           |
| 5. Assen   | **NIEUW**: gebruiker heeft minstens één keer de assen-edit-modus aangeraakt |
| 6. Analyse | `points.length >= 2` (huidige gedrag)                                       |

#### Implementatie voor stap 5 (Assen)

In `CalibrationState`:

```ts
// Nieuw veld:
axesTouched: boolean; // default false

// Wanneer true zetten:
// - bij entry in axis-edit-modus (origin-handle of rotation-handle drag), of
// - bij exit van axis-edit-modus (Klaar-knop / Escape), of
// - bij elke wijziging van axes.origin of axes.angle
//
// Simpelste implementatie: in de reducer, bij elke ENTER_AXIS_EDIT-action of bij elke
// axes-mutatie (origin/angle change), zet axesTouched = true.
```

Reset bij:

- Video-load (`LOAD_VIDEO`)
- "Begin opnieuw met deze video"
- "Andere video laden"
- Project-load: forceer `axesTouched = true` zodat geladen assen als bevestigd tellen

Workflow-stap 5 toont "done" wanneer `axesTouched === true`.

#### Visuele state per stap

Drie states blijven: `todo` (grijs), `doing` (huidige stap, blauw), `done` (✓ groen). Stap zonder relevante context: grijs.

### Tweak 3 — Start tracking disabled tot schaal + assen done

In de "▶ Start tracking"-knop:

```ts
const canTrack = scale !== null && axesTouched;
disabled = !canTrack;

// Tooltip bij disabled:
// - Geen schaal: "Stel eerst de schaal in (stap 4)"
// - Geen assen-touch: "Bevestig eerst de assen-oriëntatie (stap 5)"
// - Beide: "Stel eerst de schaal en assen in (stap 4 + 5)"
```

### Tweak 4 — App-header-buttons groter en visueel als groep

In `AppHeader.tsx` rechts: drie-puntjes-menu, help (`?`), theme-toggle.

#### Veranderingen

- **Grootte**: van ~32px naar **~40px** (clickable area)
- **Padding**: meer ademruimte tussen de drie buttons (~8px gap)
- **Visueel groep-effect**: subtiele achtergrond-card achter de drie buttons (zelfde stijl als de chips, bv. `bg-(--bg-card)` met dunne border), zodat ze als één groep visueel uit de header springen
- Iconen blijven, alleen het clickable-omhulsel + padding aanpassen
- Hover-state op de buttons blijft per individueel button

### Tweak 5 — Tabel + grafieken-panes verschijnen pas bij `points.length >= 1`

In `App.tsx` of de Verken-layout-component (`ThreePaneLayout`):

#### Conditionele rendering

- `points.length === 0` → toon **alleen video-pane** op volledige breedte (geen tabel-pane, geen grafieken-pane)
- `points.length >= 1` → toon de huidige 3-pane layout (video links, tabel rechtsboven, grafieken rechtsonder)

#### State-behoud

- `GraphsLayoutState` blijft pane-state behouden ook wanneer panes niet zichtbaar zijn — zodat na verwijderen van metingen ("Alle metingen wissen") en terugkomst de layout weer correct verschijnt zodra er metingen zijn
- React-resizable-panels: de panes worden simpelweg niet gemount tijdens `points.length === 0`. Bij her-mount: gebruikt opgeslagen pane-state (initial sizes / types blijven)

#### Empty-states verdwijnen

De huidige empty-state-teksten in `Table.tsx` ("Geen metingen — start met tracken via stap 6") en `Graphs.tsx` ("Stel eerst de schaal in") zijn nu overbodig — de panes zelf bestaan niet in die fase. Verwijder die specifieke empty-state-uitingen (de "Voeg minimaal nog één meting toe"-hint bij `points.length === 1` mag blijven, want dan zijn de panes wel zichtbaar maar één-rij/leeg).

#### Verken vs Analyseren bij `points.length === 0`

- Beide modi: alleen video-pane op volle breedte
- Mode-toggle blijft zichtbaar maar visueel: in deze fase is er geen verschil zichtbaar. Geen actie nodig om beide modi visueel anders te maken bij 0 punten.

#### Tracking-modus

Onveranderd: video fullscreen, geen tabel/grafieken (al zo).

---

## Hygiëne-afspraak

Tijdens uitvoer: rondkijken of er ergens stale code is door deze wijzigingen, of empty-state-teksten elders verstopt zitten die ook overbodig zijn geworden. Documenteer in rapport.

---

## Niet doen (parkeren naar volgende prompts)

- ❌ Responsive grafiek-pane knoppen (meeschaal of tweede regel) — **09**
- ❌ Layout-flexibiliteit (2 panes onder elkaar met scroll) — **09**
- ❌ Video-laden bugs (venster verkleinen, autoplay-frames) — **10**
- ❌ Richting-beweging als feature in assen-stap — **10**
- ❌ Presets per scenario, meerdere meetreeksen — schuiven door

---

## Acceptatie-criteria

### Werkbalk

- [ ] Verken/Analyseren-toggle staat rechts van "▶ Start tracking"
- [ ] Werkbalk visueel: links workflow-stappen, rechts actie-zone (Start tracking + mode-toggle)

### Stappen-arcering

- [ ] Bij video-load: stap 1, 2, 3 zijn done; stap 4, 5, 6 zijn todo
- [ ] Na axis-edit-aanraking: stap 5 wordt done (`axesTouched: true`)
- [ ] Na schaal-set: stap 4 wordt done
- [ ] Na ≥2 metingen: stap 6 wordt done
- [ ] `axesTouched` reset bij video-load / Begin opnieuw / Andere video laden
- [ ] Project-load: `axesTouched` wordt geforceerd `true`

### Start tracking enabled-logica

- [ ] Disabled wanneer `scale === null`: tooltip "Stel eerst de schaal in (stap 4)"
- [ ] Disabled wanneer `!axesTouched`: tooltip "Bevestig eerst de assen-oriëntatie (stap 5)"
- [ ] Disabled wanneer beide: gecombineerde tooltip
- [ ] Enabled wanneer schaal én assen done

### App-header-buttons

- [ ] Menu / help / theme zijn ~40px groot (was ~32px)
- [ ] Subtiele achtergrond-card achter de drie als visuele groep
- [ ] Hover-states per button blijven werken

### Start-layout

- [ ] Bij `points.length === 0`: alleen video-pane op volledige breedte, geen tabel/grafieken
- [ ] Bij `points.length >= 1`: huidige 3-pane layout
- [ ] Pane-state in `GraphsLayoutState` blijft behouden bij verbergen
- [ ] Na "Alle metingen wissen": panes verdwijnen weer, video-pane volle breedte
- [ ] Empty-state-tekst "Stel eerst de schaal in" e.d. verwijderd uit Table/Graphs

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts

- **09-grafiek-pane-responsive**: knoppen meeschalen of tweede regel, geen wegvallende functies, optie voor 2 panes onder elkaar met scroll voor smalle schermen
- **10-video-bugs-en-richting**: fix venster-verkleining bij video-load, fix autoplay-frames, nieuwe feature richting-beweging in assen-stap
- **11-presets**: per fysisch scenario (vrije val, slinger)
- **12-meerdere-meetreeksen**: multi-series datamodel
