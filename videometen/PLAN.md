# Videometen — Ontwikkelplan

## Doel

Een browser-tool waarmee leerlingen een videofragment kunnen analyseren: schaal instellen, assenstelsel plaatsen, frame voor frame een punt tracken, en de resulterende meetdata in een tabel + grafieken bekijken. Vergelijkbaar met Tracker (open source), maar drempelloos, in het Nederlands, en geïntegreerd in NatuurkundeHub.

## Doelgroep

Bovenbouw havo/vwo natuurkunde. Gebruik in practica (vrije val, projectielen, hellingen, slingers, botsingen) en bij data-analyseopdrachten.

## Werkstroom (vanuit leerlingperspectief)

1. Video uploaden (blijft lokaal in de browser, niets naar server)
2. fps controleren / corrigeren
3. Start- en eindframe instellen (trimmen)
4. Schaal kalibreren door twee punten op een bekend object te klikken + lengte invoeren
5. Oorsprong + assenstelsel plaatsen, eventueel kantelen
6. Frame-stap kiezen (elk frame, of bv. elke 5 frames)
7. Punt tracken: op elk geselecteerd frame klikken waar het object zit
8. Tabel bekijken / corrigeren
9. Grafieken bekijken (x-t, y-t, eventueel v-t, a-t)
10. Eventueel: trendlijn fitten + afgeleides
11. Exporteren: CSV / PNG / project (.json)

## Datamodel (concepten)

- **Video**: bestand (alleen lokaal), duur, fps, breedte/hoogte (px)
- **Frame range**: `startFrame`, `endFrame`
- **Schaal**: twee klikpunten in pixels + reële lengte + eenheid → meters per pixel
- **Coördinatenstelsel**: oorsprong (px), hoek (rad), positieve x-richting
- **Tracking-instellingen**: `frameStep` (1, 2, 5, 10, …)
- **Meetpunt**: `frameIndex`, `pixelX`, `pixelY` → afgeleid: `t`, `x`, `y` (in eenheid)
- **Trendlijn-fit**: type (linear, quadratic, …), coëfficiënten, R²

## Layout

De tool heeft twee duidelijk verschillende **werkmodi** met elk een eigen layout:

### Tracking-modus

Doel: leerling klikt frame voor frame een punt aan zonder afleiding.

- Video **fullscreen** (zo groot mogelijk)
- Trail-overlay (alle tot nu toe getrackte punten als puntenwolk op de video)
- Minimale UI: huidige frame-indicator (bv. "frame 47 / 120"), frame-stap-instelling, escape/exit-knop terug naar analyse-modus
- Geen tabel, geen grafieken, geen toolbar zichtbaar

### Analyse-modus (default)

Doel: data bekijken, corrigeren, grafieken interpreteren, configureren.

Drie-paneel-grid met `react-resizable-panels`:

- **Links**: video + overlay (schaalstreep, assenstelsel, tracking-punten)
- **Rechtsboven**: tabel met meetdata
- **Rechtsonder**: grafieken-paneel met intern splitsbare sub-panes (max 4)

Het grafieken-paneel toont standaard één sub-pane. Via "+ pane" voeg je er sub-panes bij die ernaast of eronder komen. Layouts: 1 / 2 horizontaal / 2 verticaal / 2×2. Elke sub-pane heeft een eigen type-selector (dropdown) en sluitknop.

Toolbar bovenaan met workflow-stappen als knoppen (visuele scaffolding).

Een duidelijke knop "Start tracking" wisselt naar tracking-modus.

---

## v1 — fundament (eerste release)

### Project & video

- [ ] Vite + React + TS project opzetten onder `videometen/`
- [ ] Header in NatuurkundeHub-stijl (consistent met andere tools)
- [ ] Video-upload via file picker (blijft lokaal — `URL.createObjectURL`)
- [ ] Video-player met play/pause, scrubber, volume
- [ ] fps-detectie via metadata + handmatige override (default 30 als detectie faalt; 60 wordt ook veel gebruikt)
- [ ] Frame-precieze stappen (←/→ toetsen en knoppen)
- [ ] Start- en eindframe markeren (trim)

### Kalibratie

- [ ] Schaal-tool: klik twee punten, voer lengte + eenheid in (m/cm/mm) → m/px
- [ ] Schaalstreepje blijft zichtbaar op video, hernoemen/verwijderen mogelijk
- [ ] Oorsprong plaatsen (klikken of slepen)
- [ ] Assen kantelen (tweede punt plaatsen of hoek invoeren)
- [ ] Bewegingsrichting aangeven (positieve x-richting)

### Tracking

- [ ] Frame-stap instellen — vrij invoerbaar getal (1 = elk frame; default 5). Belangrijk voor zowel korte bewegingen (kleine stap) als langere video's (grotere stap)
- [ ] Klikken op video plaatst meetpunt voor huidig frame + spring naar volgend
- [ ] Trail overlay: alle tot nu toe getrackte punten zichtbaar
- [ ] Punt verslepen om te corrigeren
- [ ] Springen naar specifieke meting (klik op tabel-rij → naar dat frame)
- [ ] Undo/redo (Ctrl+Z / Ctrl+Y)

### Tabel & grafiek

- [ ] Tabel met kolommen: frame, t (s), x, y (in gekozen eenheid)
- [ ] Tabel-cellen handmatig bewerkbaar (correctie)
- [ ] Grafieken-paneel met splitsbaar sub-pane-systeem: - "+ pane" knop voegt sub-pane toe (max 4) - Layouts: 1 / 2 horizontaal / 2 verticaal / 2×2 - Elke sub-pane heeft type-selector + sluitknop
- [ ] Grafiek-types in v1 (positie): - **x-t** — x-positie tegen tijd - **y-t** — y-positie tegen tijd - **y-x** — baan (trajectorie, geen tijd-as)
- [ ] Default bij eerste keer openen: één sub-pane met x-t
- [ ] Actief tabel-rij ↔ highlighted punt in grafiek (visuele koppeling)

### Project & export

- [ ] Project opslaan als `.json` (alles behalve video)
- [ ] Project laden — vraagt opnieuw om video, herstelt rest
- [ ] CSV-export van tabel
- [ ] PNG-export van grafiek

### UX & help

- [ ] Toetsenbordbediening: spatie, ←/→, Z, Y, Enter
- [ ] Reset-knop (vraagt bevestiging)
- [ ] Help-paneel in CircuitSketch-stijl (accordion) met: - Workflow stap voor stap - Sneltoetsen - Veelgestelde vragen (waarom werkt mijn fps niet, etc.)
- [ ] Validatie-meldingen ("Stel eerst de schaal in")
- [ ] Light/dark thema via gedeelde `nh-theme` localStorage-key

---

## v2 — analyse-uitbreidingen

- [ ] Polynoom-fit (graad 1-4) op x-t en y-t met R²
- [ ] Analytische afgeleide van fit → snelheid en versnelling
- [ ] Numerieke afgeleide (voorwaarts en centraal verschil) als alternatief
- [ ] Glijdend gemiddelde over n frames
- [ ] Nieuwe grafiek-types beschikbaar in de type-selector: - **vx-t**, **vy-t** — snelheidscomponenten tegen tijd - **|v|-t** — snelheidsgrootte tegen tijd - **ax-t**, **ay-t** — versnellingscomponenten tegen tijd - **|a|-t** — versnellingsgrootte tegen tijd
- [ ] Snelheids- en versnellingsvectoren als pijlen op de video tonen
- [ ] Theoretisch model overlay (bv. parabool met g = 9,81 m/s² over data)
- [ ] Zoom + pan op video voor precieze klikken
- [ ] Helderheid / contrast filters

---

## v3 — automatisering & uitbreidingen

- [ ] Auto-tracking via opencv.js (kleur of template matching)
- [ ] **Meerdere meetreeksen** in dezelfde video (twee objecten tegelijk tracken, bv. botsende karren). Vereist UI-uitbreiding: actieve-reeks-selector, kleurtoekenning per reeks, tabel-filter of extra kolommen, meerdere lijnen per grafiek met legenda. Bewust uitgesteld tot v3 zodat we het in één keer goed kunnen ontwerpen.
- [ ] Mobile/tablet ondersteuning
- [ ] Eerste-keer-rondleiding (geleide tour door de tool)
- [ ] Exporteren naar verslag-sjabloon (PDF met grafiek, tabel, conclusie)

---

## Technische keuzes

- **Stack**: Vite + React + TypeScript + Tailwind + shadcn/ui (zoals CircuitSketch)
- **Layout**: `react-resizable-panels`
- **Grafieken**: `recharts` (al gebruikt in CircuitSketch)
- **Math / fitting**: `simple-statistics` of `ml-regression` voor polynoom-fits
- **Video**: native `<video>` met `currentTime`-controle; later eventueel WebCodecs
- **Bestanden lokaal**: `URL.createObjectURL` voor video, `Blob` / `File` API voor opslaan
- **Project-formaat**: JSON met versienummer (toekomstbestendige migratie)

---

## Beslissingen

- **Default fps**: 30 als detectie faalt; 60 wordt ook veel gebruikt. Gebruiker kan altijd handmatig overrulen.
- **Frame-stap**: instelbaar, default 5. Cruciaal voor zowel korte als langere video's.
- **Mockup-focus**: analyse-modus (tracking-modus is gewoon fullscreen video + minimale UI, geen mockup nodig).
- **Gedeelde componenten met CircuitSketch**: niet extraheren. Wel: componenten in deze tool die een universeel karakter hebben (geschikt voor andere tools) worden duidelijk gemarkeerd en geregistreerd, zodat een latere extractie makkelijk is. Zie sectie "Hergebruik-markering" hieronder.
- **Grafieken-layout**: splitsbare sub-panes (max 4) in plaats van tabs. Geeft directe vergelijking tussen bv. x-t en vx-t zonder klikken.
- **Snelheid / versnelling grafiek-types**: altijd uitgesplitst per richting (vx-t / vy-t, ax-t / ay-t), nooit een richting-loze "v-t". Plus optioneel |v|-t en |a|-t voor grootte.
- **Meerdere meetreeksen**: niet in v1. Use case (twee objecten tegelijk) bestaat wel, maar UI-prijs is hoog voor de 80% enkelvoudige analyses. Pas in v3 toevoegen wanneer we de multi-tracking-UI bewust kunnen ontwerpen.
- **Component voor sub-pane-systeem**: gemarkeerd als `@reusable` (categorie `layout`) — vrijwel zeker bruikbaar in andere data-tools.

## Hergebruik-markering

Wanneer een component, hook of utility wordt gebouwd die in andere NatuurkundeHub-tools zinvol zou kunnen zijn, markeer 'm als volgt:

- Plaats 'm in een aparte map `src/_reusable/` (of vergelijkbaar) — visueel onderscheidbaar in de bestandsstructuur
- Voeg bovenaan het bestand een JSDoc-comment toe:
  ```ts
  /**
   * @reusable
   * @category ui | data | layout | sim
   * @description Korte uitleg van het algemene doel
   */
  ```
- Houd een lopende lijst bij in `videometen/SHARED.md` met naam, korte beschrijving en kandidaat-tools waar 't ook nuttig zou zijn

Doel: extractie naar een echte gedeelde bibliotheek wordt pas relevant zodra een tweede tool hier gebruik van wil maken (zie ontwerpprincipe "niet vooraf overdesignen" in `workflow.md`). De markering zorgt dat we dat moment niet missen en het extractiewerk overzichtelijk blijft.

## Open vragen / beslispunten

- Hoe omgaan met variabele frame rate (VFR) van smartphones?
- Tabel-precisie: hoeveel decimalen voor x, y, t?
- Hoe omgaan met deelmetingen? (leerling tracked 10 frames, wil iets anders proberen — overschrijven of nieuwe sessie?)
- Wat doen we met punten buiten de trim-range als de gebruiker de trim later wijzigt?

---

## Niet in scope

- Server-side opslag (alle data blijft lokaal)
- Accounts / login
- Cloud-opslag van video's
- Real-time tracking tijdens opname
- Mobile-native app

---

## Status & afhankelijkheden

- Wordt op homepage geplaatst zodra v1 functioneel is
- Eerste-tegel-tekst en categorie volgen bij oplevering v1
- Update `ideeen.md`: vink "Video-analyse / bewegings-tracker" af bij v1-release
- Update `workflow.md`: tool toevoegen aan mapstructuur + paginanamen-tabel
- Toevoegen aan `build.sh` (Vite-build → kopieer `videometen/dist/` → `dist/videometen/`)
