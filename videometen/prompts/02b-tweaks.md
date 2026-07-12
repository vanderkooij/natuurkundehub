# Claude Code prompt 02b — Videometen: Kalibratie-tweaks

## Context

Korte patch-prompt tussen 02 (kalibratie) en 03 (tracking). Drie verfijningen op de bestaande kalibratie-UI op basis van gebruikersfeedback:

1. Trim-knoppen hebben onduidelijke labels
2. Scale-streep moet versleepbaar zijn én buiten edit-modus uit beeld verdwijnen
3. Assen-lijnen moeten full-screen lopen, met een raster tijdens uitlijnen

Geen nieuwe features, geen nieuwe state, geen nieuwe reusables. Alleen gerichte aanpassingen aan bestaande componenten uit prompts 01 en 02.

Voor context:

- `videometen/PLAN.md` — algemene specificatie
- `videometen/prompts/01-fundament.md` — trim-knoppen zitten hier
- `videometen/prompts/02-kalibratie.md` — scale-streep en assen zitten hier
- `videometen/mockup-analyse.html` — visuele referentie

---

## Te realiseren

### Tweak 1 — Trim-knop labels hernoemen

In `features/trim/` (of waar de trim-knoppen ook leven):

- **"Trim hier in"** → **"Trim begin"**
- **"Trim hier uit"** → **"Trim eind"**

Tooltip-tekst eventueel aanpassen naar:

- "Stel huidige frame in als begin van de trim-range"
- "Stel huidige frame in als einde van de trim-range"

Geen verdere gedragswijziging — alleen labels.

---

### Tweak 2 — Scale-streep: zichtbaarheid + sleepbare eindpunten

Doel: scale-streep gedraagt zich consistent met de assen — alleen zichtbaar in edit-modus, daarbuiten alleen via de chip in de header. Eindpunten zijn versleepbaar voor fine-tuning.

#### Zichtbaarheid

| Modus                                                  | Scale-streep zichtbaar? | Handles zichtbaar? |
| ------------------------------------------------------ | ----------------------- | ------------------ |
| `idle` (kalibratie klaar, niet aan het bewerken)       | ❌ nee                  | ❌ nee             |
| `scale-edit` (chip aangeklikt of eerste keer plaatsen) | ✅ ja                   | ✅ ja              |
| `axis-edit`                                            | ❌ nee                  | ❌ nee             |
| Tracking-modus                                         | ❌ nee                  | ❌ nee             |

De chip in de video-pane-header blijft altijd zichtbaar (toont `0,15 m` of `— niet ingesteld`). Klikken op de chip schakelt `scale-edit` aan/uit.

#### Sleepbare eindpunten

In `scale-edit`-modus krijgen beide eindpunten een handle (kleine cirkel, dezelfde stijl als de origin-handle in axes):

- Hover toont `cursor: move`
- Pointer-down + sleep verplaatst dat eindpunt frame-by-frame
- Tijdens slepen: live update van pixel-positie. **De world-length blijft staan** — alleen de scale-factor wordt herberekend op basis van de nieuwe pixel-afstand
- Pointer-up: state committen
- `Shift` tijdens slepen: zelfde betekenis als bij assen (snap uitschakelen, mocht je snap toegevoegd hebben — anders no-op)

Direct typen in de length-input van de chip blijft werken zoals voorheen: pixel-afstand blijft, world-length verandert, scale-factor herberekent.

#### Edge-cases

- Sleep een handle bovenop het andere → minimum pixel-afstand van 1 px afdwingen, anders wordt de scale ongeldig
- Tijdens drag mag de streep buiten het videoframe komen (gebruiker mag eindpunten net buiten de zichtbare grens plaatsen voor referentie-objecten die deels uit beeld zijn) — pas wel clamping toe op SVG-coords, niet op interactie

#### Exit-paden voor scale-edit

- Opnieuw op de chip klikken
- Op de "Klaar"-knop in de instruction-overlay
- `Escape` (zelfde patroon als bij axes)
- Klikken op een andere workflow-stap

---

### Tweak 3 — Assen: full-screen lijnen + raster

Doel: de assen voelen visueel onderdeel van de scène, en tijdens uitlijnen helpt een raster om te zien of je hoek klopt met de echte horizon / vloer / object.

#### Full-screen as-lijnen

Vervang de huidige korte +x / +y pijlen door lijnen die zich uitstrekken vanaf de oorsprong tot aan de rand van de video (SVG viewBox):

- Bereken het snijpunt van elke as met de viewBox-rand op basis van `origin` en `angle`
- Teken één doorlopende lijn per as door de oorsprong (dus negatieve én positieve richting), zodat de gebruiker de volledige asoriëntatie ziet
- Plaats een arrowhead op de **+x**-tip en **+y**-tip (richting waar de as het kader uitloopt aan de positieve kant)
- Plaats een klein label (`+x`, `+y`) net binnen de rand bij elke arrowhead
- Houd de bestaande kleur (teal-accent) en lijndikte; eventueel iets dunner om bij full-screen niet te dominant te worden

Sub-detail: de oorsprong-handle en de rotatie-handle (aan de +x-tip) blijven hun bestaande gedrag houden. De rotatie-handle volgt nu dus mee tot de rand i.p.v. een vaste pixel-offset.

#### Raster tijdens `axis-edit`

Alleen zichtbaar wanneer de gebruiker actief in `axis-edit`-modus zit. Bij verlaten van die modus verdwijnt het raster meteen.

Eigenschappen:

- Gridlijnen evenwijdig aan de huidige `+x` en `+y` richting (dus draaien mee met `angle`)
- Bedekt de volledige video-viewBox
- **Spacing**:
  - Als `scale` gekalibreerd is: 1 vakje = 1 eenheid in de gekozen unit (`m`, `cm`, `mm`)
  - Als `scale === null`: fallback naar **50 px** vakjes
- Subtiele kleur — gebruik bv. een gedimde variant van `--accent` (low opacity ~0.15 voor reguliere lijnen, ~0.3 voor de twee lijnen die door de oorsprong gaan)
- Lijnen lopen door de oorsprong als referentie-lijnen
- Wordt real-time geüpdatet bij draaien (puur SVG, geen herrender van de video)

#### Implementatie-hint

Gebruik een SVG `<pattern>` of een loop die net genoeg lijnen tekent om de viewBox te bedekken in beide richtingen. Voor de rotatie: roteer de hele grid-group om `origin` met de huidige `angle`. Zorg dat de gridlijnen genoeg overlap hebben voorbij de viewBox-randen zodat er na rotatie geen lege hoeken ontstaan (factor √2 op de extent volstaat).

---

## Niet doen

- ❌ Geen nieuwe reusables introduceren
- ❌ Geen wijzigingen aan de chip-styling zelf (alleen aan het gedrag-koppeling)
- ❌ Geen permanent raster (alleen tijdens `axis-edit`)
- ❌ Geen extra toggle/button voor het raster
- ❌ Geen wijzigingen aan tracking, tabel, of grafieken (komt later)
- ❌ Geen wijziging aan keyboard-shortcuts

---

## Acceptatie-criteria

- [ ] De trim-knoppen heten **"Trim begin"** en **"Trim eind"**
- [ ] Tooltips op die knoppen zijn navenant aangepast
- [ ] Na het zetten van de scale verdwijnt de streep uit beeld; alleen de chip in de header blijft
- [ ] Klikken op de scale-chip opent `scale-edit`-modus en de streep + handles verschijnen weer
- [ ] In `scale-edit` kun je beide eindpunten van de scale-streep met de muis verslepen
- [ ] Tijdens slepen blijft de world-length staan en wordt de scale-factor herberekend
- [ ] Length direct typen in de chip-input verandert de world-length (pixel-afstand blijft)
- [ ] In `axis-edit`-modus is de scale-streep niet zichtbaar
- [ ] In tracking-modus is de scale-streep niet zichtbaar
- [ ] De assen-lijnen lopen door tot de rand van de video (full-screen), met arrowhead + label op de +x en +y tip
- [ ] De rotatie-handle zit aan de +x-tip op de rand
- [ ] In `axis-edit`-modus verschijnt een raster dat meedraait met de hoek
- [ ] Met scale: rastervakjes hebben spacing van 1 eenheid
- [ ] Zonder scale: rastervakjes hebben spacing van 50 px
- [ ] Het raster verdwijnt zodra je `axis-edit` verlaat (Escape, Klaar, andere workflow-stap)
- [ ] Geen console-errors of warnings
- [ ] `npm run build` succesvol

---

## Volgende prompt

Na deze tweaks: **03-tracking** — tracking-modus, klik-flow met auto-advance, trail-overlay, frame-step-instelling, undo/redo.
