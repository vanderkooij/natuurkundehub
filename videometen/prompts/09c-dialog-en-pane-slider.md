# Claude Code prompt 09c — Videometen: Dialog-bug fix + pane-grootte slider

## Context

Twee resterende dingen na 09 en 09b:

1. **Dialog-bug op smal scherm werkt nog niet** ondanks 09b's `min(92vw, 480px)` + `z-[100]` fix. In een viewport van 480×915 (mobiele simulatie via dev-tools) is alleen de grijze backdrop zichtbaar, geen dialog-content. De fix uit 09b heeft 't probleem niet opgelost — een diepere oorzaak.

2. **Pane-grootte slider** voor wanneer leerlingen 4 grafieken hebben en die niet allemaal compact in 2x2 willen knijpen. Toggle-stapelen (Verberg + Vergroten zou nog een toggle erbij zijn) maakt UI rommelig — een continue **slider** voelt intuïtiever en geeft persoonlijke controle.

Voor context:

- `videometen/prompts/09-grafiek-responsive.md` + `09b-responsive-fixes.md` — pane-grid, Verberg-mode, dialog-fix
- `videometen/src/_reusable/dialog.tsx` — gewijzigd in 09b, blijkbaar niet voldoende
- `videometen/src/features/measurements/Graphs.tsx` — Graphs-container met Verberg-knop
- `videometen/src/features/measurements/GraphsLayoutState.tsx` — pane-state

---

## Te realiseren

### Tweak 1 — Dialog code-trace + echte fix

**Symptoom**: Op 480×915 viewport: backdrop zichtbaar, dialog-content niet. 09b's fix met `width: min(92vw, 480px)` + `z-[100]` + `max-h-[90vh]` heeft niet geholpen.

#### Diagnose-aanpak (code-trace eerst)

Lees `videometen/src/_reusable/dialog.tsx` opnieuw, plus de Radix UI / shadcn Dialog primitives die eronder zitten. Mogelijke oorzaken:

1. **Transform/translate**: shadcn Dialog gebruikt vaak `top-50% left-50% translate(-50%, -50%)` voor centering. Als die transform niet meeschaalt met de nieuwe `max-width`, kan de dialog buiten viewport gepositioneerd staan.
2. **Animation/state-issue**: Radix gebruikt `data-state="open"` met CSS-animaties. Mogelijk wordt de dialog op smal scherm gerenderd met een initiële state die niet correct overschakelt naar visible.
3. **Overflow ergens hogerop**: een ouder-element met `overflow: hidden` of `position: relative` kan de dialog hebben "klemgezet" in een container die niet de volledige viewport is.
4. **Portal-target**: Radix Dialog rendert standaard in een portal naar `document.body`. Als 't ergens lokaal gerenderd wordt (custom portal), kan dat resize-issues geven.
5. **CSS-conflict**: tailwind class `inset-0` of vergelijkbaar op een element kan op smal scherm ander effect hebben dan gedacht.

#### Te doen

1. Code-trace door `dialog.tsx` + zoek naar wat de portal-target is en hoe `DialogContent` positioneert
2. Bij twijfel: tijdelijke `console.log` in `DialogContent` mount (afmetingen + position) + Jop runt op smal scherm + deelt output. Maar liever code-trace eerst — de oorzaak is vermoedelijk in een handvol regels te vinden
3. Pas gerichte fix toe en documenteer root cause in een comment

#### Verificatie

- 480×915 viewport (dev-tools simulatie): dialog volledig zichtbaar, content leesbaar, kruisje bereikbaar
- 360×640 viewport (kleiner mobiel): idem
- 1366×768 (Chromebook): geen regressie
- Confirm-dialog "Andere video laden?" en alle andere 6 dialogs werken op alle breedtes

### Tweak 2 — Pane-grootte slider

#### Concept

Een **continue slider** in de Graphs-container-header die bepaalt hoe groot de panes minimaal moeten zijn. Default: "auto" (panes vullen container). Bij hoger zetten: panes krijgen een minimum-grootte, container scrollt automatisch als ze niet meer passen.

#### State

In `GraphsLayoutState`:

```ts
paneSize: number; // 0 = auto (default), > 0 = minimum grootte schaalfactor
// Of: een waarde tussen 0 en 1 (% van een max-grootte)
// Of: discreet (0-4 stappen)
```

Mijn voorstel: continue waarde 0 → 1 (waarbij 0 = auto / huidige gedrag, 1 = ~800px minimum per pane). Schaalt lineair.

Reset bij: nieuwe video, Begin opnieuw, Alle metingen wissen, modus-wissel naar Meten.

#### UI

In de Graphs-container-header, naast de Verberg-knop:

- **Slider** met label "Pane-grootte" (of icoon-versie: `Maximize2` met slider eronder/erachter)
- Range visueel: van klein/auto-icoon links naar groot-icoon rechts
- Hover-tooltip: "Sleep om panes groter te maken; container scrollt als ze niet passen"
- Compacte plaatsing: niet meer dan ~120px breed

#### Effect

- `paneSize === 0`: huidige gedrag — panes flex-fit in container
- `paneSize > 0`: elke pane krijgt CSS `min-width: ${baseMin + paneSize * extraSize}px` en `min-height: ${...}px`
- Container krijgt `overflow: auto` om scroll toe te staan
- Bij 4 panes en hoge paneSize: 2x2 grid wordt groter dan viewport, gebruiker scrollt

Werkt onafhankelijk van de auto-layout (naast/onder uit 09) — de richting blijft auto, alleen de afmeting per pane wordt vergroot.

#### Interactie met Verberg-mode

Combinaties zijn allemaal logisch:

- Beide auto: huidige gedrag
- Verberg aan + paneSize auto: tabel/video weg, grafieken in viewport
- Verberg uit + paneSize > 0: tabel/video blijven, grafieken-zone scrollt
- Beide aan: tabel/video weg + grafieken-zone scrollt — maximale grafiek-focus

#### Mobiel/smal scherm

Bij smal scherm + paneSize > 0: panes worden minstens X px, container scrollt. Geen aparte handling nodig — `overflow: auto` werkt op elke viewport.

---

## Hygiëne-check

Tijdens uitvoer:

- Check of er nog andere dialog-gerelateerde wrappers zijn met vergelijkbaar issue
- Bekijk of de slider-styling consistent past bij de bestaande shadcn-componenten (gebruik bestaand `Slider` component)
- Documenteer in rapport

---

## Niet doen

- ❌ Geen aparte mobile-versie van de tool
- ❌ Geen wijziging aan auto-layout uit 09 (richting naast/onder blijft)
- ❌ Geen wijziging aan video-bugs of assen-stap (komt in 10)

---

## Acceptatie-criteria

### Dialog-fix

- [ ] Code-trace heeft root cause aangetoond, gedocumenteerd in comment
- [ ] Confirm "Andere video laden?" volledig zichtbaar op 480×915 viewport
- [ ] Idem op 360×640
- [ ] Geen regressie op 1366×768 en standaard desktop-breedtes
- [ ] Alle 6 confirm-dialogs + ScaleDialog werken op smal scherm
- [ ] Z-index hierarchie intact (dialogs boven popovers/tooltips)

### Pane-grootte slider

- [ ] Slider in Graphs-container-header (naast Verberg)
- [ ] Default: paneSize = 0 (auto, huidig gedrag)
- [ ] Bij verhogen: panes krijgen minimum-grootte, container scrollt als nodig
- [ ] Werkt voor 1, 2, 3, 4 panes en in elke layout-richting (naast/onder)
- [ ] Combinatie met Verberg-mode werkt correct (4 combinaties)
- [ ] Reset bij nieuwe video / Begin opnieuw / Alle metingen wissen / modus-wissel naar Meten
- [ ] Hover-tooltip geeft uitleg

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts

- **10-video-bugs-en-assen-herontwerp**: video-laden bugs (venster-verkleining, autoplay-frames) + assen-stap herontwerp (sleep-tooltip, +x richting links/rechts toggle, +y richting omhoog/omlaag toggle)
- **11-presets**: per fysisch scenario (vrije val, slinger)
- **12-meerdere-meetreeksen**: multi-series datamodel
