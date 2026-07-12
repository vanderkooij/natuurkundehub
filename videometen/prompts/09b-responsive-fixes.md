# Claude Code prompt 09b — Videometen: Responsive drempel + verberg-mode + dialog-fix

## Context

Drie verfijningen na 09:

1. **Responsive-drempel werkt niet bij groot scherm met smalle panes.** Op een desktop met twee panes naast elkaar waarvan de rechter ~520-560px is, valt de Auto zoom-knop al deels buiten beeld, maar de overflow-toolbar triggert niet. Drempel 480px is te laag.
2. **Focus-mode "Vergroten" voelt marginaal.** 16/84 vs 30/70 is wat de gebruiker ook met de resize-handle kan bereiken. Maak 'm écht effectief: verberg tabel + video volledig zodat grafieken 100% van de container nemen. Label naar **"Verberg"**.
3. **Confirmation-dialog onzichtbaar op smal scherm.** Bij mobiele weergave / sterk versmald viewport: dialog wordt afgesneden of overlapt verkeerd. Zichtbaarheid fixen via viewport-aware sizing.

Voor context:

- `videometen/prompts/09-grafiek-responsive.md` — basis-implementatie
- `videometen/src/features/measurements/GraphPane.tsx` — `ResizeObserver` + `compactToolbar` drempel
- `videometen/src/features/measurements/Graphs.tsx` — focus-mode toggle + container
- `videometen/src/App.tsx` — Analyseren-layout met focus-mode-effect
- `videometen/src/_reusable/ConfirmDialog.tsx` (of waar de "Andere video laden?"-dialog leeft)
- `videometen/src/_reusable/ModalPanel.tsx` — generieke modal-structuur

---

## Te realiseren

### Tweak 1 — Drempel responsive-toolbar: dynamisch of hogere statisch

Twee opties — kies wat het meest robuust werkt:

#### Optie A (voorkeur): dynamische berekening

In `GraphPane.tsx`:

```ts
const inlineToolbarRef = useRef<HTMLDivElement | null>(null);
const [naturalInlineWidth, setNaturalInlineWidth] = useState<number | null>(null);

// Bij eerste render meten: render de toolbar tijdelijk in volledige inline-modus,
// meet de scrollWidth, sla op als drempel.
// useEffect met empty deps + tijdelijke render via useState.

const compactToolbar = naturalInlineWidth !== null && paneWidth < naturalInlineWidth + 24;
//                                                                    ^ kleine buffer voor padding/marges
```

Dit detecteert automatisch hoeveel de toolbar minimaal nodig heeft, dus als er ooit een knop bijkomt of weggaat past de drempel zich aan.

Edge-case: de "natuurlijke" breedte meten vraagt om een renderpass waar de toolbar in inline-modus staat. Een verborgen meet-element (`opacity: 0; pointer-events: none; position: absolute;`) met dezelfde knop-set kan dat oplossen zonder dat de gebruiker iets ziet.

#### Optie B (eenvoudig): hogere statische drempel

```ts
const compactToolbar = paneWidth < 600; // was 480
```

Werkt voor de huidige knop-set. Bij toevoegen/verwijderen knoppen moet de drempel later bijgesteld worden.

Mijn voorkeur: **Optie A** — robuuster en niet-onderhouds-gevoelig. Maar als A complex blijkt: **Optie B** met 600px is acceptabel.

### Tweak 2 — Focus-mode: tabel + video volledig verbergen

In `Graphs.tsx` / `App.tsx`:

#### Gedrag

- **`graphsFocusMode: false`** (default): huidige Analyseren-layout (video + tabel + grafieken in 3-pane verdeling).
- **`graphsFocusMode: true`**: tabel + video volledig verborgen via `display: none` of `hidden`-class. Grafieken-container neemt 100% van de Analyseren-layout-breedte.

Niet meer percentages 16/84 of 30/70 — gewoon binair: zichtbaar of niet.

#### Knop-label

In de Graphs-container-header:

- Label **"Verberg"** in plaats van "Vergroten"
- Icoon: bijvoorbeeld `EyeOff` (Lucide) bij `graphsFocusMode === false`, `Eye` of `Maximize2` bij `graphsFocusMode === true`
- Tooltip:
  - Wanneer uit: "Verberg tabel en video om grafieken volledig in beeld te krijgen"
  - Wanneer aan: "Toon tabel en video weer"

#### Reset-gedrag

- Reset bij Meten ↔ Analyseren-wissel (zoals 09)
- Reset bij nieuwe video, Begin opnieuw, Alle metingen wissen
- Knop alleen zichtbaar in Analyseren-modus (zoals 09)

#### Pane-state behoud

Tabel + video state (scroll-positie, video-currentframe) wordt behouden bij verbergen via `display: none`. Bij weer tonen: alles terug zoals 't was.

### Tweak 3 — Dialog-zichtbaarheid op smal scherm

In `ConfirmDialog.tsx` of de algemene `ModalPanel.tsx`:

#### Fix

- `max-width: min(90vw, 480px)` — dialog past op smal scherm
- `max-height: 90vh` — past verticaal
- `overflow-y: auto` op de body — scrollbaar bij veel inhoud
- z-index controle: dialog moet **boven** alle andere overlays (overflow-popovers, tooltips, etc.). Standaard `z-50` of hoger met expliciete waarde.
- Centered op de viewport, niet op een container die mogelijk buiten beeld valt

#### Verificatie

- Bij viewport-breedte 360px (mobiel) is de dialog zichtbaar, kruisje bereikbaar
- Bij 1366px (Chromebook) is alles normaal
- Backdrop (donkergrijze overlay) bedekt het volledige scherm

#### Geen aparte mobile-handling

We bouwen geen mobile-versie van de tool. Dit is alleen dialog-fix zodat 'm op smal scherm niet stuk gaat.

---

## Hygiëne-check

Tijdens uitvoer:

- Bekijk of er andere modalen / dialogs zijn met hetzelfde z-index of overflow-probleem (Fit-popover, axis-edit-modal als die nog bestaat, etc.)
- Documenteer in rapport welke modalen gevonden + gefixt

---

## Niet doen

- ❌ Geen mobile-specifieke UI bouwen (touch-handlers, layout-rewrites)
- ❌ Geen wijziging aan tracking, kalibratie, grafiek-rendering buiten de pane-toolbar
- ❌ Geen aanpassing van de breakpoints uit 09 voor pane-grid (`naast`/`onder`-bepaling) — die werken al goed volgens Jop

---

## Acceptatie-criteria

### Responsive-drempel

- [ ] Op groot scherm met smalle panes (~520-580px): overflow-menu verschijnt zodra knoppen niet inline passen
- [ ] Bij ≥600px (Optie B) of ≥`naturalInlineWidth` (Optie A): alle knoppen inline
- [ ] Bij <drempel: alleen type-dropdown, Auto zoom, `⋯`, × inline; rest in menu
- [ ] Bij toevoegen van een nieuwe pane via `+` (waardoor bestaande panes smaller worden): drempel triggert correct

### Verberg-mode

- [ ] Knop heet "Verberg" in plaats van "Vergroten"
- [ ] Klik op "Verberg" verbergt tabel + video volledig; grafieken nemen 100% breedte
- [ ] Klik nogmaals (label inmiddels veranderd naar "Toon" of icoon-wissel): tabel + video terug
- [ ] State `graphsFocusMode` reset bij modus-wissel / nieuwe video / Begin opnieuw / Alle metingen wissen
- [ ] Tabel-scroll en video-currentframe blijven bewaard tijdens verbergen

### Dialog-fix

- [ ] Bij viewport-breedte 360px is de "Andere video laden?"-dialog volledig zichtbaar
- [ ] Kruisje en knoppen bereikbaar
- [ ] Backdrop bedekt volledige scherm op alle viewport-breedtes
- [ ] z-index correct: dialog boven andere overlays
- [ ] Geen regressie op standaard viewport-breedte

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts

- **10-video-bugs-en-assen-herontwerp**: video-laden bugs (venster-verkleining, autoplay-frames) + assen-stap herontwerp (sleep-tooltip, +x richting links/rechts, +y richting omhoog/omlaag)
- **11-presets**: per fysisch scenario (vrije val, slinger)
- **12-meerdere-meetreeksen**: multi-series datamodel
