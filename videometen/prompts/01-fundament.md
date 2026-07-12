# Claude Code prompt 01 — Videometen: Fundament

## Context

Eerste fase van een nieuwe tool in de NatuurkundeHub: **videometen** — een browser-tool voor leerlingen om bewegingen in video's te analyseren (vergelijkbaar met Tracker, maar drempelloos en geïntegreerd).

Voor de volledige specificatie en visuele richting:

- `videometen/PLAN.md` — werkstroom, datamodel, v1/v2/v3 features, ontwerpkeuzes
- `videometen/mockup-analyse.html` — visuele referentie voor layout en styling
- `workflow.md` (root) — project-brede conventies (header-stijl, thema, ontwerpprincipes)

## Doel van deze prompt

Het **fundament** van de tool opzetten. Aan het einde van deze stap kan ik een video uploaden, afspelen en frame voor frame doorlopen — met een werkbare drie-paneel-layout en NatuurkundeHub-stijl. Geen tracking-tools, kalibratie, tabel-data of grafieken: dat komt in latere prompts.

Houd de scope strikt — alles wat onder "Buiten scope" staat, laat je liggen.

---

## Te realiseren

### 1. Project opzetten

- Nieuw **Vite + React + TypeScript** project onder `videometen/`
- **Tailwind + shadcn/ui** geconfigureerd
- Geen router nodig — videometen is een single-page tool. Dus géén TanStack Router / Start (waar CircuitSketch dat wel gebruikt). Houd 't bewust simpeler.
- TypeScript `strict` aan
- ESLint + Prettier zoals in CircuitSketch
- `package.json` scripts: `dev`, `build`, `preview`, `lint`, `format`

### 2. Bestandsstructuur

Organiseer per **feature**, niet per type:

```
videometen/src/
├── features/
│   ├── video/          # video-laad, player, frame-stepping, fps
│   ├── trim/           # start/end frame markeren
│   └── layout/         # 3-paneel-layout, workflow-bar
├── _reusable/          # componenten met universeel karakter (zie hieronder)
├── lib/                # utilities (cn, format, etc.)
├── App.tsx
├── main.tsx
└── index.css
```

### 3. App-header (NatuurkundeHub-stijl)

Zie de mockup voor exacte styling:

- Sticky met `backdrop-filter: blur(12px)`
- Lichte modus: `rgba(255,255,255,0.6)` — donker: `rgba(15,17,23,0.6)`
- Links: JK-logo + "NatuurkundeHub" + breadcrumb (`home / videometen`)
- Midden (geabsoluteerd): gecentreerde tool-naam **"Videometen"**
- Rechts: help-knop (?) en theme-toggle (🌙 / ☀️)

Logo-bestanden zitten in `../assets/logo/` (relatief vanaf de gedeployde tool). Tijdens lokaal dev kun je ze via een Vite-alias of door symlink/copy beschikbaar maken — kies wat in jouw setup het netst is.

### 4. Workflow-bar onder de header

Genummerde stappen (zie mockup): **1 Video → 2 fps → 3 Trim → 4 Schaal → 5 Assen → 6 Analyse**

In deze fase zijn stappen 1, 2 en 3 functioneel. Stappen 4, 5 en 6 zijn placeholders — visueel aanwezig, maar nog niet aanklikbaar / niet doen iets.

Uiterst rechts: oranje knop **"▶ Start tracking"** — in deze fase disabled (komt in latere prompt).

De stappen geven met visuele state aan: _te doen_, _bezig_, _afgerond_. In deze fase staan ze allemaal als "te doen" / standaard, omdat we het workflow-traject zelf nog niet sturen.

### 5. Drie-paneel-layout

Met `react-resizable-panels`:

- **Links**: video-paneel (alle inhoud uit punten 6-9 hieronder)
- **Rechtsboven**: tabel-paneel — voor nu een placeholder met dimmed tekst _"Tabel verschijnt zodra je een punt hebt getrackt"_
- **Rechtsonder**: grafieken-paneel — placeholder _"Grafieken verschijnen zodra je metingen hebt"_

Verhoudingen: video ~55%, tabel ~22%, grafieken ~22% (overige 1% gap). Gebruiker kan ze met de handles aanpassen.

### 6. Video uploaden

- File picker accepteert MP4, MOV, WebM (`accept="video/*"`)
- Als nog niet geladen: toon een drop-zone met instructie ("Sleep een video hierheen of klik om te kiezen")
- Drag & drop ondersteunen
- Bestand blijft 100% lokaal — gebruik `URL.createObjectURL(file)`. Geen upload naar server, geen analytics op het bestand.
- Bij wisselen van video: oude `objectURL` netjes `revokeObjectURL`-en

### 7. Video-player

- Native HTML5 `<video>` element in een "stage"-container (donkere achtergrond, zie mockup)
- Onder de video een controls-bar:
  - Vorige-frame-knop (`‹`)
  - Play/pause-knop (`▶` / `❚❚`)
  - Volgende-frame-knop (`›`)
  - Scrubber (custom, of shadcn `Slider` aangepast) — met **dubbele functie**: scrubber voor huidige positie én zichtbare trim-range (zie punt 9)
  - Frame-indicator: **"frame X / Y · t s"** in JetBrains Mono

### 8. fps-detectie en handmatige override

- Bij video-laden, probeer fps via metadata te bepalen. In de browser is dit lastig — overweeg:
  - `requestVideoFrameCallback` om enkele frames te samplen en de gemiddelde dt te berekenen, **of**
  - Een eenvoudige tool zoals `mediainfo.js` (alleen als snel en compact)
  - Als detectie niet binnen ~500ms een betrouwbaar resultaat geeft, val terug op **default 30**
- Toon huidige fps als een **chip** in de video-pane-header (zie mockup: `fps  30`)
- Klikken op die chip opent een input/popover waarin de gebruiker zelf een fps kan invullen (typisch 24, 25, 30, 60). De frame-stappen passen zich daarop aan.

### 9. Frame-precieze navigatie en trim

**Frame-stepping:**

- `video.currentTime = frameIndex / fps`
- Volgende/vorige-frame knoppen
- Toetsenbord:
  - `Space` — play/pause
  - `←` / `→` — vorige / volgende frame
  - `Shift+←` / `Shift+→` — 10 frames terug / vooruit
- Toetsenbord werkt globaal in de tool, tenzij focus op een input/select staat

**Trim:**

- Twee handles op de scrubber: `trimStart` en `trimEnd`
- Default: trim = volledige bereik (`trimStart=0`, `trimEnd=lastFrame`)
- Buiten de trim-range mag de gebruiker nog scrubben (voor referentie), maar visueel duidelijk gemarkeerd als "buiten bereik"
- Twee snelknoppen: **"trim hier in"** en **"trim hier uit"** — zetten de current frame als nieuwe start of end
- State: `trimStart` en `trimEnd` worden later door tracking gebruikt; voor nu alleen opslaan en visualiseren

### 10. Thema

- Light/dark via `localStorage` key **`nh-theme`** (gedeeld met de rest van NatuurkundeHub — niet hernoemen)
- Inline-script in `index.html` dat de theme toepast vóór de body-render (voorkomt FOUC)
- Theme-toggle in header schakelt `data-theme="dark"` op `<html>`
- Tailwind dark mode via `class` (gericht op `[data-theme="dark"]` selector — of Tailwind's `darkMode: ['class', '[data-theme="dark"]']`)

### 11. shadcn/ui setup

Installeer in elk geval:

- `button`, `input`, `select`, `slider`, `tooltip`, `popover`, `dialog`

De rest pas als je ze nodig hebt.

---

## Hergebruik-markering

Conform `videometen/PLAN.md` (sectie Hergebruik-markering): componenten met universeel karakter krijgen een plek in `src/_reusable/` plus een `@reusable` JSDoc-comment.

Kandidaten in deze fase:

| Component         | Categorie | Beschrijving                                                             |
| ----------------- | --------- | ------------------------------------------------------------------------ |
| `AppHeader`       | layout    | NatuurkundeHub-header met logo, breadcrumb, tool-naam slot, theme-toggle |
| `useNhTheme`      | ui        | hook + provider voor `nh-theme` localStorage (light/dark)                |
| `ThreePaneLayout` | layout    | 3-paneel-grid met react-resizable-panels + standaard pane-styling        |

Maak ook een `videometen/SHARED.md` aan met een tabel waarin deze componenten staan, plus kolommen voor "kandidaat-tools" en "extractie-status". Voor nu zijn alle entries `kandidaat — wacht op tweede gebruiker`.

JSDoc-format bovenaan elk reusable bestand:

```ts
/**
 * @reusable
 * @category layout | ui | data | sim
 * @description Korte uitleg van het algemene doel
 */
```

---

## Conventies & stijl

- CSS-variabelen (`--accent`, `--accent-amber`, `--bg-primary`, etc.) **identiek** aan de mockup en andere NatuurkundeHub-tools. Plaats in `index.css`.
- Fonts: **Space Grotesk** (UI) + **JetBrains Mono** (cijfers, frame-indicator) via Google Fonts in `index.html`.
- Geen "powered by Lovable" of vergelijkbare badges in de UI.
- Geen 'console.log' achterlaten in committed code.
- Functioneel-componenten en hooks. Class components vermijden.
- Bestandsnamen: PascalCase voor componenten, camelCase voor hooks/utilities.

---

## Buiten scope (NIET doen in deze prompt)

Bewust uitgesteld naar latere prompts — laat ongemoeid:

- ❌ Schaal-kalibratie, oorsprong, assenstelsel, bewegingsrichting
- ❌ Tracking / klikken op video / trail-overlay
- ❌ Tabel met meetdata
- ❌ Grafieken (sub-pane-systeem, types, etc.)
- ❌ Save/load project
- ❌ CSV / PNG export
- ❌ Help-paneel
- ❌ Tracking-modus (fullscreen video met minimale UI)
- ❌ Toevoegen aan root-`build.sh` en root-`index.html` (gebeurt bij release v1)
- ❌ Auto-detectie, opencv.js, computer vision

---

## Acceptatie-criteria

Na `npm run dev` (vanuit `videometen/`):

- [ ] Ik kan een video uploaden via de file picker (MP4, MOV, WebM)
- [ ] Drag & drop van een video werkt ook
- [ ] Video speelt af en ik kan pauzeren
- [ ] Scrubber werkt met de muis
- [ ] `←` en `→` springen exact één frame (op basis van fps)
- [ ] `Shift+←` / `Shift+→` springen 10 frames
- [ ] `Space` schakelt play/pause
- [ ] fps wordt automatisch gedetecteerd of valt netjes terug op 30
- [ ] Klik op de fps-chip opent een override-input, en de frame-stappen passen zich aan
- [ ] Ik kan `trimStart` en `trimEnd` zetten via scrubber-handles en via de "trim hier in/uit"-knoppen
- [ ] De frame-indicator toont steeds correct `frame X / Y · t s`
- [ ] Theme-toggle werkt en de voorkeur blijft bewaard na refresh
- [ ] Layout is responsief en panes zijn met de muis te resizen
- [ ] App ziet eruit zoals de mockup qua header en workflow-bar
- [ ] Geen console-errors of warnings
- [ ] `npm run build` succesvol, `npm run preview` werkt

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **02-kalibratie**: schaal-tool, oorsprong, assenstelsel, bewegingsrichting
- **03-tracking**: tracking-modus, klik-flow, trail-overlay, frame-step-instelling, undo/redo
- **04-tabel-grafieken**: data-flow tracking → tabel, splittable grafieken-panes (x-t / y-t / y-x)
- **05-export-help**: save/load JSON, CSV/PNG export, help-paneel in CircuitSketch-stijl
