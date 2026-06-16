# Claude Code prompt 03c — Videometen: Undo-frame-koppeling + camera-hint

## Context

Twee kleine aanpassingen op de bestaande tracking-flow (na 03 + 03b):

1. **Undo/redo** van tracking-acties springt nu niet naar het bijbehorende frame. Voor de meetworkflow is dat onhandig: na een paar `Ctrl+Z`'s wil je natuurlijk vanaf dát frame verder klikken, niet vanaf waar je toevallig stond toen je undo'de.
2. **Drop-zone instructie** krijgt een dunne hint over stilstaande camera (de uitgebreide help-uitleg komt straks in prompt 05).

Geen wijzigingen aan andere systemen.

Voor context:
- `videometen/prompts/03-tracking.md` — undo/redo en tracking-flow
- `videometen/prompts/01-fundament.md` — drop-zone

---

## Te realiseren

### Tweak 1 — Undo/redo zet `currentFrame` op de relevante frame

De `useUndoRedo`-hook (of de tracking-reducer die 'm gebruikt) moet voor tracking-acties het huidige videoframe meebewegen, zodat de gebruiker direct verder kan vanaf de plek waar net iets is teruggedraaid.

#### Gewenst gedrag per actie

| Actie | Bij undo: spring naar… | Bij redo: spring naar… |
|---|---|---|
| `set-point` (nieuw punt geplaatst) | frame van het verwijderde punt | frame van het opnieuw geplaatste punt |
| `set-point` met `previous` (overschreven) | frame waar de oude positie weer hersteld is | frame waar de nieuwe positie weer geplaatst is |
| `remove-point` | frame van het herstelde punt | frame van het opnieuw verwijderde punt |
| `move-point` | frame van het punt (zowel undo als redo) | frame van het punt |
| `set-step` (frame-stap gewijzigd) | **geen frame-verandering** | geen frame-verandering |

Kortom: elke actie die over een specifiek punt gaat, brengt de gebruiker terug naar dat frame. `set-step` is een config-actie en raakt de positie niet aan.

#### Implementatie-richting

Voorkeurs-aanpak (kies wat past bij de gekozen architectuur uit prompt 03):

**Optie A** — `apply` en `invert` callbacks geven optioneel een `focusFrame` terug:
```ts
type ApplyResult = { focusFrame?: number }
type Apply<TAction> = (action: TAction) => ApplyResult | void
```
`useUndoRedo` roept dan na elke undo/redo de meegegeven `onFocus(frame)` callback aan. Hook blijft daarmee generiek.

**Optie B** — tracking-reducer schrijft direct in de `VideoState` (currentFrame) na elke actie. Houdt de hook puur generiek maar koppelt twee features. Acceptabel als de tracking-feature toch al aan VideoState hangt.

Kies A als de hook nog gedeeld kan worden met andere tools (consistent met `@reusable`-markering). Kies B als pragmatisch beter past.

#### Edge-cases

- Undo van een `set-point` op een frame dat buiten de huidige `trimStart..trimEnd` valt: spring er toch naar toe. De trim-range is een display-filter, geen harde grens voor scrubben.
- Stack-overflow voorkomen: geen recursieve dispatch als `setCurrentFrame` zelf weer een actie zou triggeren (dat doet 'ie niet, maar bewust geverifieerd).
- Auto-advance na undo: **niet** triggeren. De `focusFrame` is een directe `currentFrame =`-set, geen klik-event.

#### Toetsenbord blijft hetzelfde

`Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z` werken zoals nu — alleen het gedrag is rijker.

### Tweak 2 — Camera-hint bij drop-zone

Onder de bestaande instructie in de drop-zone (de tekst "Sleep een video hierheen of klik om te kiezen") komt een dunne hint:

> **Tip:** film met een stilstaande camera (geen pan, zoom of trilling) voor de meest precieze metingen.

Styling:

- Kleinere tekst (`text-xs` of `text-sm`), gedimde kleur (var(--text-muted) of opacity ~0.7)
- Niet onder de drop-zone na het uploaden — verschijnt alleen in de lege/upload-state
- Geen icoontje, geen kader — bewust zacht

Geen extra logica, geen toggles, geen "ik begrijp het"-knop. Puur informatief.

---

## Niet doen

- ❌ Geen wijziging aan `TrackingAction`-types
- ❌ Geen wijziging aan de stack-limiet (blijft 200)
- ❌ Geen nieuwe shortcuts
- ❌ Geen frame-jump bij `set-step` (alleen point-acties)
- ❌ Geen volledig help-paneel (dat komt in 05)
- ❌ Geen camera-stabilisatie / video-preprocessing (out of scope)

---

## Acceptatie-criteria

- [ ] Na `Ctrl+Z` op een set-point actie staat de video op het frame waar dat punt zat
- [ ] Bij meerdere opeenvolgende `Ctrl+Z`'s springt de video telkens mee naar het frame van de undo-actie
- [ ] `Ctrl+Y` / `Ctrl+Shift+Z` springt naar het frame waar het punt opnieuw wordt geplaatst
- [ ] Undo/redo van `move-point` zet currentFrame op het frame van dat punt
- [ ] Undo/redo van `remove-point` zet currentFrame op het frame van het (her)verwijderde punt
- [ ] Undo van `set-step` verandert alleen de stap, niet currentFrame
- [ ] Drop-zone toont onder de hoofdinstructie een gedimde "Tip"-regel over stilstaande camera
- [ ] Tip verdwijnt zodra een video geladen is (alleen zichtbaar in upload-state)
- [ ] Bestaande tracking-flow (klik = nieuw punt + auto-advance, overschrijven, trail-toggle, kleur-cycle) blijft intact
- [ ] Geen console-errors of warnings
- [ ] `npm run build` succesvol

---

## Volgende prompt

**04-tabel-grafieken** — pixel → wereld-coördinaten transformatie, tabel met edit, splittable grafieken-panes (x-t, y-t, vx-t, etc.), actieve-rij koppeling tussen tabel en trail.

In **05-export-help** komt naast save/load + export ook een help-paneel met o.a. de camera-vereisten uitgewerkt.
