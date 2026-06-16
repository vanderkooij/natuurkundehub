# Claude Code prompt 11b — Videometen: Axis-edit hint/toggles + tooltip-consistentie

## Context

Drie fixes na 11:

1. **Sleep-oorsprong-hint blijft zichtbaar in Analyseren-modus** — hint hoort alleen tijdens axis-edit-modus, maar verschijnt nog in Analyseren. Mode-conditie of overlay-locatie in de tree breekt.
2. **Assen verslepen in elke stap, maar buttons + hint alleen in Assen-stap (stap 5)** — inconsistent. Gewenst: sleep op origin/rotation-handle → auto-enter axis-edit-modus → buttons + hint verschijnen. Wissel naar andere workflow-stap → auto-exit.
3. **Tooltip-kleur in dark mode niet overal consistent** — sommige tooltips hebben de gefixte (donkere) achtergrond, andere niet. Vermoedelijk een mix van shadcn `TooltipContent` en custom/native tooltips.

Voor context:
- `videometen/src/features/calibration/InstructionOverlay.tsx` — hint-balk (uit 11)
- `videometen/src/features/calibration/AxisDirectionControls.tsx` — swap-knoppen (uit 11)
- `videometen/src/features/calibration/CalibrationState.tsx` — mode-state + axis-edit transities
- `videometen/src/features/calibration/overlays/AxesOverlay.tsx` — sleep-handlers voor origin/rotation
- `videometen/src/features/layout/WorkflowBar.tsx` — stap-navigatie
- `videometen/src/_reusable/tooltip.tsx` — shadcn TooltipContent (gefixed in 11)

---

## Te realiseren

### Tweak 1 — Hint + toggles alleen zichtbaar in axis-edit-modus

#### Diagnose

Bekijk de zichtbaarheids-conditie van `InstructionOverlay` + `AxisDirectionControls`. Vermoedens:

1. Conditie checkt `axesTouched === false` i.p.v. `mode === 'axis-edit-by-angle'` (en in Analyseren-modus is `axesTouched` mogelijk nog false)
2. Of: rendert in een container die in alle modi gemount blijft, en de conditie kijkt niet expliciet naar `mode`
3. Mogelijk wordt `mode` niet correct gereset bij modus-wissel naar Analyseren

Lees `InstructionOverlay.tsx` en `AxisDirectionControls.tsx` + de plek waar ze worden gemount.

#### Fix

Beide components moeten **alleen** renderen wanneer `calibrationMode === 'axis-edit-by-angle' || calibrationMode === 'origin-edit'`.

```tsx
{(calibrationMode === 'axis-edit-by-angle' || calibrationMode === 'origin-edit') && (
  <InstructionOverlay ... />
)}
```

Of meer concist: een helper `isAxisEditing(mode)` die beide cases dekt.

Verifieer dat dit ook werkt voor Analyseren-modus (waar de calibration-mode default `'idle'` is — geen render).

### Tweak 2 — Auto-enter axis-edit bij sleep, auto-exit bij workflow-stap-wissel

#### Auto-enter

In `AxesOverlay.tsx`, bij de drag-handlers voor `origin-handle` en `rotation-handle`:

```ts
const handlePointerDown = (e: PointerEvent) => {
  if (calibrationMode !== 'axis-edit-by-angle' && calibrationMode !== 'origin-edit') {
    enterAxisEditMode()  // dispatch SET_MODE actie
  }
  // ... bestaande drag-logica
}
```

Effect: zodra leerling de origin of rotation-handle aanraakt → mode wordt `axis-edit-by-angle` → `InstructionOverlay` + `AxisDirectionControls` verschijnen automatisch.

Werkt in alle voorbereidings-stappen (Video, fps, Trim, Schaal, Assen) en in Analyseren (waar de leerling assen ook kan willen aanpassen achteraf).

#### Auto-exit bij workflow-stap-wissel

In `WorkflowBar.tsx`, of waar de stap-klik wordt afgehandeld:

```ts
const handleStepClick = (stepIndex: number) => {
  // Exit axis-edit als de gebruiker naar een andere stap navigeert
  if (calibrationMode === 'axis-edit-by-angle' || calibrationMode === 'origin-edit') {
    exitAxisEditMode()  // dispatch SET_MODE -> 'idle'
  }
  // ... bestaande stap-navigatie-logica
}
```

Bij klik op stap 4 (Schaal) zou de scale-edit modus dan worden geactiveerd via de bestaande logica.

Klik op stap 5 (Assen) zou nog steeds axis-edit-modus aanzetten (huidig gedrag).

#### Edge-cases

- Bij modus-wissel Meten ↔ Analyseren: ook exit van axis-edit (anders blijven controls hangen)
- Bij Escape-toets: bestaand exit-gedrag blijft (al via `useEscapeMode`)
- Bij verlaten van de pane (klik buiten video): geen exit nodig — leerling kan elders klikken zonder dat de assen-context kwijt is

### Tweak 3 — Tooltip-consistentie in dark mode

#### Diagnose

`grep -r "TooltipContent\|<Tooltip\b"` in de codebase om alle tooltip-usages te vinden. Mogelijk:

1. Sommige tooltips gebruiken HTML `title=""` (browser-native tooltip die OS-styling volgt — niet themable)
2. Sommige tooltips zijn custom inline (afwijkende styling)
3. Sommige tooltips gebruiken shadcn TooltipContent maar met overrides die de fix ongedaan maken

#### Fix

Identificeer welke tooltips de "verkeerde" kleur tonen en breng ze in lijn met de shadcn TooltipContent (uit 11):
- Native `title=""` → vervangen door shadcn `<Tooltip>` waar nuttig
- Custom inline → vervangen door shadcn variant
- Overrides die de fix breken → weghalen

Verifieer in beide thema's: alle tooltips door de tool hebben dezelfde leesbare achtergrond + tekst-kleur.

Bonus-check: HelpPanel zit in `ModalPanel` (niet `Tooltip`) — niet meenemen.

---

## Hygiëne-check

Tijdens uitvoer:
- Documenteer welke calibration-modes bestaan (`idle`, `axis-edit-by-angle`, `origin-edit`, `scale-edit`?) en hoe ze in elkaar overgaan
- Bekijk of de `exitAxisEditMode`-route ook bij andere triggers nodig is (project-load, etc.)
- Lijst gevonden tooltips + welke type ze hadden

---

## Niet doen

- ❌ Geen wijziging aan assen-richting-toggles (uit 11) buiten zichtbaarheids-conditie
- ❌ Geen wijziging aan tracking, grafiek-rendering
- ❌ Geen schema-bump

---

## Acceptatie-criteria

### Hint + toggles zichtbaarheid

- [ ] In Analyseren-modus: geen sleep-oorsprong-hint zichtbaar
- [ ] In Meten-modus zonder axis-edit: geen hint, geen swap-knoppen
- [ ] In axis-edit-modus (na klik stap 5 of na origin-sleep): hint + swap-knoppen wel zichtbaar
- [ ] Bij exit (Escape / Klaar / klik andere stap): hint + swap-knoppen verdwijnen

### Auto-enter axis-edit

- [ ] Pointer-down op origin-handle in willekeurige stap (Video/fps/Trim/Schaal/Assen): mode wordt `axis-edit-by-angle`
- [ ] Pointer-down op rotation-handle idem
- [ ] Drag werkt direct, geen extra klik nodig om eerst stap 5 te selecteren
- [ ] InstructionOverlay + AxisDirectionControls verschijnen tijdens de sleep

### Auto-exit bij stap-wissel

- [ ] Klik op stap 1 (Video) / 2 (fps) / 3 (Trim) terwijl in axis-edit: mode wordt `idle`, controls verdwijnen
- [ ] Klik op stap 4 (Schaal): mode switcht naar scale-edit (bestaand gedrag)
- [ ] Klik op stap 5 (Assen): mode blijft / wordt axis-edit
- [ ] Modus-wissel Meten ↔ Analyseren tijdens axis-edit: exit naar idle

### Tooltip-consistentie

- [ ] Alle tooltips in de tool gebruiken dezelfde styling (donkere achtergrond in dark, lichte in light)
- [ ] Geen `title=""` native tooltips waar shadcn `<Tooltip>` past
- [ ] Verificatie in beide thema's

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts

- **12-video-bugs**: venster-verkleining bij upload + autoplay-frames na load
- **13-presets**: per fysisch scenario (vrije val, slinger)
- **14-meerdere-meetreeksen**: multi-series datamodel
