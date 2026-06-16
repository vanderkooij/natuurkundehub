# Claude Code prompt 03b — Videometen: Tracking-tweaks

## Context

Korte patch-prompt na 03 (tracking) op basis van eerste-gebruik feedback. Drie verfijningen aan de tracking-laag:

1. Klik op bestaand punt blokkeert het zetten van een nieuw punt op dezelfde plek (komt voor bij stilstaande/langzaam bewegende voorwerpen)
2. Trail-dots zijn te groot
3. Trail-kleur moet schakelbaar zijn voor verschillende video-achtergronden

Geen nieuwe features buiten dit, geen wijzigingen aan kalibratie of tabel/grafieken.

Voor context:
- `videometen/prompts/03-tracking.md` — basis-implementatie
- `videometen/PLAN.md` — algemene spec

---

## Te realiseren

### Tweak 1 — Tracking-modus: geen drag-handles, alleen klik = nieuw punt

**Probleem:** als een voorwerp niet of nauwelijks beweegt, klikt de gebruiker frame na frame op (ongeveer) dezelfde plek. Maar zodra een nieuwe klik op een bestaande dot landt, wordt 'ie geïnterpreteerd als drag-start in plaats van een nieuwe meting. Dat blokkeert de meest natuurlijke workflow voor langzame/statische objecten.

**Oplossing:** rolverdeling tussen de twee modi scherper trekken.

#### In tracking-modus

- Klik op de video = **altijd** een nieuw punt op het huidige frame + auto-advance. Punt.
- Geen hover-cursor verandering op bestaande dots
- Geen drag-handles op trail-punten
- De trail blijft zichtbaar als visuele referentie, maar reageert niet op pointer-events
- Bestaand punt voor huidig frame wordt nog steeds overschreven (zoals in 03 §4) — gedrag verandert niet, alleen het ontstaat nu uit "klik = nieuw punt" en niet uit "klik op bestaand punt"

Concreet: `pointer-events: none` op de trail-overlay zolang `mode === 'tracking'`. De tracking-klik-handler zit op de video-container en triggert ongeacht waar in het frame je klikt.

#### In analyse-modus

Hier blijft de bestaande functionaliteit uit 03 §5 staan, met één toevoeging:

- Bestaande trail-dots zijn klikbaar én sleepbaar
- Gebruik een **drag-threshold van ~4 px**: pointer-up binnen 4 px afstand van pointer-down = klik (= spring naar dat frame). Verder dan 4 px = drag (= `move-point` actie)
- Hover-cursor op een trail-dot: `pointer` in analyse-modus (impliceert klikbaar)
- Tijdens een actieve drag (>4 px verplaatsing): cursor switcht naar `move` voor visuele feedback

Dit lost het oude ambiguïteits-probleem op zonder iets weg te nemen uit de analyse-workflow.

### Tweak 2 — Dotgrootte verkleinen + tunbaar maken

In de bestaande `TrailOverlay`:

- Reguliere dot-radius: **3 px** (was 5)
- Actieve frame dot-radius: **5 px** (was 7)
- Stippellijn-dikte: ongeveer halveren (bv. van 2 → 1 px) voor proporties

Maak beide waarden tunbaar via CSS-variabelen in `index.css`:

```css
:root {
  --track-dot-radius: 3px;
  --track-dot-active-radius: 5px;
  --track-trail-stroke-width: 1px;
}
```

Gebruik ze via `var(--track-dot-radius)` in de SVG (`r` attribuut kan met CSS gestyled worden via `r: var(...)` of via inline-style binding — kies wat in de bestaande implementatie schoner past). Latere finetune is dan een one-liner in CSS.

### Tweak 3 — Trail-kleur cycle-knop (4 kleuren)

Doel: dezelfde trail leesbaar op donkere én lichte videoachtergronden, snel te wisselen tijdens gebruik.

#### Kleur-palette

Vier presets:

| Naam | Dot-fill | Actieve-ring | Stippellijn |
|---|---|---|---|
| `teal` (default) | `#0d9488` | `#ffffff` | `#0d9488` (opacity 0.6) |
| `amber` | `#f59e0b` | `#ffffff` | `#f59e0b` (opacity 0.6) |
| `magenta` | `#d946ef` | `#ffffff` | `#d946ef` (opacity 0.6) |
| `white` | `#ffffff` | `#0f1117` | `#ffffff` (opacity 0.7) |

De actieve-ring is bewust contrast-kleur (donker bij `white`, anders wit) zodat de actieve dot altijd herkenbaar blijft.

Gebruik CSS-variabelen aangestuurd via een `data-trail-color="teal|amber|magenta|white"` op `<html>` of de tracking-overlay-container, zodat één plek de kleuren bepaalt:

```css
[data-trail-color="teal"]   { --trail-dot: #0d9488; --trail-ring: #fff; }
[data-trail-color="amber"]  { --trail-dot: #f59e0b; --trail-ring: #fff; }
[data-trail-color="magenta"]{ --trail-dot: #d946ef; --trail-ring: #fff; }
[data-trail-color="white"]  { --trail-dot: #fff;    --trail-ring: #0f1117; }
```

#### Cycle-knop

Eén knop die de huidige kleur toont (als kleine gevulde cirkel) en bij klik cyclet:

`teal → amber → magenta → white → teal → ...`

Locaties van de knop:

- **In tracking-modus:** in de tracking-bar, rechts naast de trail-aan/uit-toggle
- **In analyse-modus:** in de video-pane-header, rechts van de fps-chip (compact: alleen het bolletje + iconisch caret of geen tekst — tooltip "Trail-kleur")

Eén shared state, twee plekken om 'm aan te raken. Sync gegarandeerd door dezelfde context-state.

#### Persistentie

- LocalStorage-key: **`nh-videometen-trail-color`** (NH-prefix consistent met `nh-theme`)
- Bij app-load: lees de waarde, val terug op `teal` als ongeldig/leeg
- Schrijf bij elke wijziging

#### State-locatie

Hoort thuis bij de tracking-feature (of een lichte `TrailDisplayState` als je 'm los wil houden van `TrackingState` — keuze ligt bij wat consistent voelt met de bestaande architectuur). Niet in `TrackingAction` opnemen: kleurkeuze is een display-preference, geen meting, dus **niet** in de undo-stack.

---

## Hergebruik-markering

Geen nieuwe reusables in deze patch. CSS-variabelen blijven tool-lokaal in `index.css`.

---

## Niet doen

- ❌ Geen wijziging aan auto-advance, overschrijven, undo/redo logica
- ❌ Geen wijziging aan de bestaande trail-aan/uit-toggle (blijft gewoon werken)
- ❌ Geen color-picker dialog — bewust een cycle-knop voor snelheid
- ❌ Geen kleur-keuze in de undo-stack
- ❌ Geen wijzigingen aan tabel/grafieken (komt in 04)

---

## Acceptatie-criteria

- [ ] In tracking-modus reageren bestaande trail-dots niet op pointer (geen cursor-verandering, geen drag)
- [ ] In tracking-modus is elke klik op de video een nieuw punt op het huidige frame + auto-advance (ook als er al een dot op die plek stond van een eerder frame)
- [ ] In analyse-modus kun je een trail-dot aanklikken om naar dat frame te springen
- [ ] In analyse-modus kun je een trail-dot verslepen; drag-threshold ~4 px voorkomt dat een gewone klik per ongeluk als drag wordt geïnterpreteerd
- [ ] Trail-dots zijn duidelijk kleiner dan voorheen (3 px regulier, 5 px actief)
- [ ] CSS-variabelen `--track-dot-radius`, `--track-dot-active-radius` en `--track-trail-stroke-width` staan in `index.css` en bepalen de gerenderde maten
- [ ] Cycle-knop voor trail-kleur zit zowel in de tracking-bar als in de video-pane-header (analyse-modus)
- [ ] Klikken cyclet door teal → amber → magenta → white → teal
- [ ] Bij `white` heeft de actieve dot een donkere ring (zichtbaar op licht-achtergrond video's)
- [ ] Kleur-keuze persisteert in localStorage onder `nh-videometen-trail-color` en blijft na refresh
- [ ] Beide knoppen tonen synchroon de huidige kleur
- [ ] Geen console-errors of warnings
- [ ] Bestaande tracking-flow (klik, auto-advance, undo/redo, trail-toggle, overschrijven) blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompt

Na deze tweaks: **04-tabel-grafieken** — pixel → wereld-coördinaten transformatie, tabel met edit, splittable grafieken-panes (x-t, y-t, vx-t, etc.), actieve-rij koppeling tussen tabel en trail.
