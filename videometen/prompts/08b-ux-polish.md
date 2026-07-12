# Claude Code prompt 08b — Videometen: UX-polish (header, panes, toast, naam)

## Context

Vier kleine UX-fixes na 08, op basis van feedback uit gebruik:

1. **Header-buttons groep-card** uit 08 oogt niet mooi — border weg, en "Menu" als tekst-label naast de drie-puntjes voor helderheid
2. **Pane-versleepbaarheid** is niet zichtbaar — gripper-dots toevoegen op de verdelers (visuele signaal "ik ben sleepbaar")
3. **Na meten** is het onduidelijk dat je naar Analyseren moet — eenmalige toast bij eerste keer dat er voldoende metingen zijn én je in Verken-modus staat
4. **"Assen kantelen"** als naam in de assen-stap is onhelder — hernoemen naar "Assenstelsel instellen"

Echte assen-stap herontwerp (sleep-oorsprong-hint, richting-beweging-toggle, hoek-input weg) komt in **10** — uitgebreid met richting-keuze in zowel horizontale **als** verticale richting.

Voor context:

- `videometen/prompts/08-werkbalk-en-startlayout.md` — vorige polish-ronde
- `videometen/src/_reusable/AppHeader.tsx` — header-buttons groep-card
- `videometen/src/features/app/ThreePaneLayout.tsx` / `App.tsx` Analyseren-layout — `react-resizable-panels` met `PanelResizeHandle`
- `videometen/src/features/tracking/TrackingState.tsx` — points-tracking voor toast-trigger
- `videometen/src/features/calibration/AxisAngleDialog.tsx` (of waar de "Assen kantelen"-modal woont)

---

## Te realiseren

### Tweak 1 — Header-buttons: border weg + "Menu" label

In `AppHeader.tsx`:

#### Verwijderen

- De gezamenlijke `bg-card` + `border` om de drie buttons (uit 08 toegevoegd) **weg**
- Knoppen blijven 40px (uit 08), maar nu individueel zonder visuele groep-card

#### Toevoegen

- Bij de drie-puntjes-button: **tekst-label "Menu"** naast het icoon
- Layout: `<icoon> Menu` met klein gap (~6px) tussen icoon en tekst
- Help-button: alleen `?`-icoon (geen label)
- Theme-toggle: alleen icoon (geen label)

#### Visueel

- De drie blijven naast elkaar met enige `gap-2` ertussen
- Geen gezamenlijke achtergrond meer — netjes individueel
- Hover-state per knop blijft

### Tweak 2 — Gripper-dots op pane-verdelers

In `react-resizable-panels`'s `PanelResizeHandle`-componenten (vermoedelijk in de Verken-layout en Analyseren-layout):

#### Gripper-dot indicator

Op het midden van elke verdeler: een visuele indicator van **stippeltjes** of een **gripper-pattern** dat aangeeft "ik ben sleepbaar":

- Voor **verticale verdelers** (tussen kolommen): drie of vier verticaal gestapelde dots (`⋮⋮` patroon)
- Voor **horizontale verdelers** (tussen rijen): drie of vier horizontaal naast elkaar (`⋯` patroon)
- Of: een groep van 6 dots in een 2×3-patroon (klassieke "grip" handle)

Stijl:

- Dot-kleur: gedimd grijs (`var(--text-muted)` of vergelijkbaar)
- Bij hover op de verdeler: dots worden iets donkerder + de verdeler-strepen lichten op met accent-kleur
- Dot-grootte: ~3px met 2px gap

#### Cursor

Bij hover op verdeler: `cursor: col-resize` (verticale verdeler) / `cursor: row-resize` (horizontale verdeler). Mag al door react-resizable-panels gezet zijn — verifieer.

#### Plaatsing in DOM

Custom `PanelResizeHandle`-wrapper of inline CSS via `::before`/`::after`-pseudo-elementen. Kies wat netst is. Generiek genoeg om in alle layouts (Verken horizontaal-vertical mix, Analyseren met geneste groups) te werken.

### Tweak 3 — Toast: "Klaar met meten? Klik op Analyseren"

Eenmalige toast bij overgang van `points.length === 1` naar `points.length === 2` **én** `mode === 'verken'`:

- **Tekst**: "Klaar met meten? Klik op **Analyseren** om je grafiek te zien."
- **Duur**: ~6 seconden, dismissable met klik
- **Eenmalig per sessie**: track via een state-veld of ref `analyseHintShown: boolean` (in `AppMode` of een lichte UI-state-provider). Niet tonen als al een keer getoond
- **Reset bij**: nieuwe video laden, "Begin opnieuw met deze video", "Alle metingen wissen" (zodat 't bij een tweede sessie weer kan verschijnen)
- **Niet tonen** als: gebruiker al in Analyseren-modus staat, of als 't al eens getoond is in deze sessie

#### Trigger-locatie

In `App.tsx` of een toast-coordinator-effect:

```ts
useEffect(() => {
  if (points.length >= 2 && mode === "verken" && !analyseHintShown) {
    showToast("Klaar met meten? Klik op **Analyseren** om je grafiek te zien.");
    setAnalyseHintShown(true);
  }
}, [points.length, mode, analyseHintShown]);
```

### Tweak 4 — "Assen kantelen" → "Assenstelsel instellen"

In de modal/dialog (vermoedelijk `AxisAngleDialog.tsx` of vergelijkbaar):

- **Dialog-titel**: "Assen kantelen" → **"Assenstelsel instellen"**
- **Werkflow-stap label**: als die ergens "kantelen" zei, ook hernoemen
- Body-tekst en labels verder ongewijzigd voor nu (uitgebreide herontwerp komt in 10)

---

## Hygiëne-check

Tijdens uitvoer rondkijken of er nog plekken zijn waar "kantelen" stond (search op de string), of stale CSS van de verwijderde 08-card. Documenteer in rapport.

---

## Niet doen (parkeren naar 10)

- ❌ Hoek-input weghalen of verbergen — komt in **10**
- ❌ Richting-beweging horizontaal/verticaal toggle (`+x` rechts/links, `+y` omhoog/omlaag) — komt in **10**
- ❌ Tooltip "Sleep de oorsprong naar het begin van je object" — komt in **10**
- ❌ Andere wijzigingen aan tracking, kalibratie, grafiek-rendering

---

## Acceptatie-criteria

### Header-buttons

- [ ] Gezamenlijke card-border om menu/help/theme weg
- [ ] "Menu" tekst-label naast de drie-puntjes
- [ ] Hover-state per knop blijft
- [ ] Knoppen blijven ~40px

### Pane-gripper-dots

- [ ] Op elke verdeler in Verken-layout en Analyseren-layout: gripper-dot-indicator midden
- [ ] Verticale verdelers: vertikaal dot-patroon
- [ ] Horizontale verdelers: horizontaal dot-patroon
- [ ] Hover-state lift de dots + verdeler-strepen subtiel op met accent-kleur
- [ ] Cursor: `col-resize` / `row-resize` per type

### Toast

- [ ] Bij overgang naar `points.length === 2` in Verken-modus: toast verschijnt
- [ ] Tekst correct met "Analyseren" als geaccentueerd woord
- [ ] Eenmalig per sessie (state `analyseHintShown`)
- [ ] Reset bij nieuwe video / "Begin opnieuw" / "Alle metingen wissen"
- [ ] Niet getoond bij start in Analyseren-modus

### Hernoeming

- [ ] Dialog-titel "Assenstelsel instellen" (was "Assen kantelen")
- [ ] Eventuele andere "kantelen"-tekst hernoemd

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Voor 10 — assen-stap herontwerp uitgebreid

Notitie voor later: in **10** wordt het assen-herontwerp uitgebreid met **verticale richting kiezen** naast horizontaal:

- `+x richting`: rechts (default) of links — relevant bij horizontale/semi-horizontale bewegingen
- `+y richting`: **omhoog (default) of omlaag** — relevant bij verticale/semi-verticale bewegingen (bv. omgekeerde notatie bij scenes waar je liever omlaag positief wil)
- Plus: hoek-input verbergen of weg, sleep-oorsprong-tooltip

---

## Volgende prompts

- **09-grafiek-pane-responsive**: knoppen meeschalen of tweede regel, 2 panes onder elkaar met scroll voor smalle schermen
- **10-video-bugs-en-assen**: video-laden bugs (venster-verkleining, autoplay-frames) + assen-stap herontwerp (sleep-tooltip, +x links/rechts, +y omhoog/omlaag, hoek-input weg)
- **11-presets**: per fysisch scenario (vrije val, slinger)
- **12-meerdere-meetreeksen**: multi-series datamodel
