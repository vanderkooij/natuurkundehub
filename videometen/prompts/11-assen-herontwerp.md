# Claude Code prompt 11 — Videometen: Assen-stap herontwerp + tooltip-fix

## Context

Vier dingen in één prompt:

1. **Tooltip-styling bug** (pre-cleanup): in de Kolommen-popover van prompt 10 is de tooltip witte tekst op lichte achtergrond — onleesbaar in dark mode. Vermoedelijk een algemeen shadcn Tooltip styling-issue dat alle tooltips raakt. Eerst fixen.
2. **Sleep-oorsprong hint** in axis-edit-modus: pedagogische uitleg waar de leerling de oorsprong heen moet slepen ("begin van je beweging").
3. **`+x` richting-toggle** — swap-knop die de positieve x-richting flipt (rechts ↔ links). Default rechts.
4. **`+y` richting-toggle** — swap-knop voor de positieve y-richting (omhoog ↔ omlaag). Default omhoog.

Akkoord van Jop:

- Plaatsing toggles: in de video-pane bij de assen, alleen zichtbaar wanneer assen-stap actief
- Defaults: `+x` rechts, `+y` omhoog
- Effect op bestaande metingen: x/y in tabel + grafieken herberekenen via `pixelToWorld` zonder pixel-data aan te raken

Voor context:

- `videometen/src/_reusable/Tooltip.tsx` of `videometen/src/components/ui/tooltip.tsx` — shadcn tooltip styling
- `videometen/src/features/calibration/CalibrationState.tsx` — axes-state
- `videometen/src/features/calibration/overlays/AxesOverlay.tsx` — visuele assen-weergave
- `videometen/src/features/calibration/coords.ts` — `pixelToWorld` transformatie
- `videometen/src/features/video/VideoPane.tsx` — video-pane overlay-laag
- `videometen/src/features/project/projectSchema.ts` — schema v7 → v8

---

## Te realiseren

### Tweak 1 — Tooltip styling-fix (pre-cleanup)

Identificeer waar de tooltip-styling vandaan komt:

- Als 't shadcn `Tooltip` is: pas styling aan zodat 't in beide thema's leesbaar is. Vermoedelijk een `bg-popover text-popover-foreground` of vergelijkbaar dat in dark mode de verkeerde kant op gaat.
- Als 't een custom tooltip is: contrast aanpassen.

Verificatie: tooltips op de Kolommen-checkboxes, op andere knoppen (fps-chip-instructie, raaklijn-info etc.) — allemaal goed leesbaar in light **én** dark mode.

### Tweak 2 — Sleep-oorsprong hint in axis-edit-modus

In de video-pane, wanneer `mode === 'axis-edit-by-angle'` of `origin-edit`:

- Dunne **hint-balk** onderaan het video-canvas (of bovenaan, kies wat visueel rustig is)
- Tekst: **"Sleep de oorsprong (●) naar het begin van je beweging. Draai de +x-pijl om de oriëntatie te wijzigen."**
- Permanent zichtbaar tijdens de modus (geen hover-trigger)
- Stijl: semi-transparant achtergrond (`bg-card/80` of accent met opacity), `text-muted`, padding ~10px
- Sluit zichzelf zodra de leerling axis-edit-modus verlaat (Escape / Klaar / klik elders)

Geen klik-actie nodig — het is informatie.

### Tweak 3 — `+x` richting-toggle (swap-knop)

#### State

In `CalibrationState`, uitbreiding van `axes`:

```ts
type Axes = {
  origin: Pixel;
  angle: number;
  xPositiveDirection: "right" | "left"; // NIEUW, default 'right'
  yPositiveDirection: "up" | "down"; // NIEUW, default 'up'
};
```

Reset bij: nieuwe video / Begin opnieuw / Andere video laden (richtingen terug naar defaults). Project-load forceert opgeslagen waardes.

#### UI: swap-knop in video-pane

Wanneer assen-stap actief (= `axesTouched === false` OF `mode === 'axis-edit-by-angle'`): twee knoppen verschijnen in de video-pane overlay, dichtbij de assen-overlay (bv. rechtsboven of net buiten de chart-area):

**Knop A (+x richting)**:

- Toont **"+x →"** wanneer `xPositiveDirection === 'right'`
- Toont **"+x ←"** wanneer `xPositiveDirection === 'left'`
- Klik flipt de waarde
- Hover-tooltip: "Klik om de positieve x-richting te wisselen"

**Knop B (+y richting)**:

- Toont **"+y ↑"** wanneer `yPositiveDirection === 'up'`
- Toont **"+y ↓"** wanneer `yPositiveDirection === 'down'`
- Klik flipt de waarde
- Hover-tooltip: "Klik om de positieve y-richting te wisselen"

Stijl: compact, accent-kleur consistent met andere assen-controls.

### Tweak 4 — `pixelToWorld` aanpassing voor richting-signs

In `coords.ts`:

```ts
function pixelToWorld(p: Pixel, cal: CalibrationState): WorldPoint {
  // ... bestaande logica (translate, flip-y, rotate, scale)

  // NIEUW: pas richting-signs toe
  const signX = cal.axes.xPositiveDirection === "right" ? +1 : -1;
  const signY = cal.axes.yPositiveDirection === "up" ? +1 : -1;
  return { x: worldX * signX, y: worldY * signY };
}
```

Effect: tabel + grafieken herberekenen automatisch via de bestaande `useMemo`-paden op `(points, cal, fps, trim)`. Geen aparte herberekening-trigger nodig.

### Tweak 5 — `AxesOverlay` visuele weergave

In `AxesOverlay.tsx`:

- `+x`-pijl wijst nu in de **getoonde** richting (`xPositiveDirection`)
- `+y`-pijl idem (`yPositiveDirection`)
- Bij flip: pijl draait visueel mee
- Labels `+x` en `+y` verplaatsen mee naar de pijl-tip

Visualisatie blijft consistent met de bestaande grid + rotation-handle gedrag.

### Tweak 6 — Schema v7 → v8

```ts
PROJECT_SCHEMA_VERSION = 8;

function migrateV7toV8(v7: ProjectV7JSON): ProjectV8JSON {
  return {
    ...v7,
    schemaVersion: 8,
    calibration: {
      ...v7.calibration,
      axes: {
        ...v7.calibration.axes,
        xPositiveDirection: v7.calibration.axes.xPositiveDirection ?? "right",
        yPositiveDirection: v7.calibration.axes.yPositiveDirection ?? "up",
      },
    },
  };
}
```

Dispatcher-keten v1 → ... → v8. Save schrijft v8.

---

## Hygiëne-check

Tijdens uitvoer:

- Bekijk of er op andere plekken een `pixelToWorld`-achtige transformatie zit die ook update moet
- Check of de tooltip-fix andere tooltips raakt (HelpPanel, fps-chip, etc.)
- Documenteer in rapport

---

## Niet doen (parkeren naar 12+)

- ❌ Video-laden bugs (venster-verkleining, autoplay-frames) — komt in **12**
- ❌ Presets per fysisch scenario — komt in **13**
- ❌ Meerdere meetreeksen — komt in **14**
- ❌ Wijziging aan tracking-flow zelf

---

## Acceptatie-criteria

### Tooltip-fix

- [ ] Tooltips op Kolommen-popover checkboxes: leesbaar in light én dark mode
- [ ] Andere tooltips door de tool (fps-chip, raaklijn-info, etc.): geen regressie
- [ ] Contrast voldoet aan basale leesbaarheid

### Sleep-oorsprong-hint

- [ ] Tijdens axis-edit-modus: hint-balk zichtbaar met expliciete tekst
- [ ] Verdwijnt bij verlaten van modus
- [ ] Geen klik-actie nodig
- [ ] Tekst correct in NL

### Richting-toggles

- [ ] Twee knoppen zichtbaar in video-pane wanneer assen-stap actief
- [ ] `+x →` ↔ `+x ←` swap werkt
- [ ] `+y ↑` ↔ `+y ↓` swap werkt
- [ ] Hover-tooltips per knop
- [ ] Defaults: `+x` rechts, `+y` omhoog
- [ ] Reset bij nieuwe video / Begin opnieuw / Andere video laden

### Effect op metingen

- [ ] Bij flip met bestaande metingen: tabel x/y waardes flippen sign
- [ ] Grafieken updaten automatisch
- [ ] Pixel-data ongewijzigd (alleen weergave verandert)
- [ ] `pixelToWorld` past `signX`/`signY` correct toe

### AxesOverlay

- [ ] `+x` pijl wijst in `xPositiveDirection`
- [ ] `+y` pijl wijst in `yPositiveDirection`
- [ ] Labels `+x` / `+y` op pijl-tippen, meebewegend

### Schema

- [ ] `PROJECT_SCHEMA_VERSION = 8`
- [ ] `migrateV7toV8` voegt defaults `xPositiveDirection: 'right'`, `yPositiveDirection: 'up'` toe
- [ ] Dispatcher v1 → ... → v8 compleet
- [ ] Save schrijft v8
- [ ] Oude projecten openen met correcte defaults

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts

- **12-video-bugs**: venster-verkleining bij upload + autoplay-frames na load
- **13-presets**: per fysisch scenario (vrije val, slinger) met conditionele physica-uitleg
- **14-meerdere-meetreeksen**: multi-series datamodel
