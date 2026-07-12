# Claude Code prompt 08c — Videometen: Modi-cleanup (Meten + Analyseren + hoek-dialog weg)

## Context

Pedagogische cleanup van de modus-structuur:

1. **Verken-modus is een tussenstand zonder duidelijke waarde** — kleine grafieken, "klik op Analyseren om je grafiek te zien"-toast werkt niet want grafiek is al zichtbaar.
2. **Modi-structuur duidelijker maken**: pre-meten/tracken = alleen video. Na meten = analyseren met tabel + grafieken.
3. **Hoek-input dialog "Assenstelsel instellen"** vraagt om graden — niet wat de leerling wil (sleep is wat ze doen).

Resultaat na 08c:

- Modi heten **Meten** | **Analyseren** (+ tracken bij Start tracking)
- Meten-modus = alleen video op volle breedte (= "geen metingen layout" uit 08, ook bij metingen)
- Analyseren-modus = huidige (video klein + tabel + grafieken)
- Auto-switch eenmalig naar Analyseren bij tweede meting, zonder melding
- Hoek-input dialog uit assen-stap weg — sleep aan +x-tip blijft de manier

Het uitgebreide assen-herontwerp (richting +x/+y, sleep-tooltip) blijft **10**.

Voor context:

- `videometen/prompts/08-werkbalk-en-startlayout.md` — VideoOnlyLayout, points.length-conditionele rendering
- `videometen/prompts/08b-ux-polish.md` — toast, hernoeming dialog
- `videometen/src/features/app/AppMode.tsx` — `mode: 'verken' | 'analyseren' | 'tracken'`
- `videometen/src/App.tsx` — VerkenLayout / AnalyserenLayout / VideoOnlyLayout
- `videometen/src/features/layout/WorkModeToggle.tsx` — UI van de toggle
- `videometen/src/features/calibration/AxisAngleDialog.tsx` — hoek-input modal
- `videometen/src/features/project/projectSchema.ts` — schema v6 → v7

---

## Te realiseren

### Tweak 1 — Hoek-input dialog weghalen

In `AxisAngleDialog.tsx` (of waar de "Assenstelsel instellen"-modal woont):

- **Verwijder de dialog volledig** — incl. open-trigger in de assen-stap
- Sleep aan de **+x-tip rotation-handle** (bestaand sinds prompt 02) blijft de enige manier om de hoek te wijzigen
- Sleep van de **origin-handle** blijft positie wijzigen
- Snap naar 15° + Shift om snap uit te schakelen: blijft bestaan zoals 't is

Geen restanten van de dialog in de codebase. Hygiëne-check op stale imports en `axesTouched`-triggers — de mode-trigger via `SET_MODE("axis-edit-by-angle")` mag wel blijven, want sleep gaat ook door die modus.

### Tweak 2 — Mode-toggle hernoemen: Meten | Analyseren

#### State

In `AppMode.tsx`:

```ts
// Was:
type WorkMode = "verken" | "analyseren" | "tracken";

// Wordt:
type WorkMode = "meten" | "analyseren" | "tracken";
```

Alle references in code naar `'verken'` worden `'meten'`.

#### UI

In `WorkModeToggle.tsx`:

- Label "Verken" → **"Meten"**
- Volgorde blijft Meten links | Analyseren rechts
- Tracking-modus blijft uit de toggle (wordt automatisch ingegaan via Start tracking)

### Tweak 3 — Meten-modus = video-only layout

In `App.tsx`:

- `Meten`-modus toont **altijd** de `VideoOnlyLayout` uit 08 (video op volle breedte), **ongeacht** `points.length`
- `Analyseren`-modus toont de huidige Analyseren-layout (video klein + tabel + grafieken)
- Bij `points.length === 0` in Analyseren: toon óók alleen video (consistent met "geen metingen = geen panes" uit 08)
- Bij `points.length >= 1` in Analyseren: toon volledige layout

#### Verwijder oude `VerkenLayout`

De 3-pane Verken-layout component is niet meer nodig. Verwijder de hele component + ongebruikte styling.

`GraphsLayoutProvider` blijft gemount boven het hele app om pane-state bewaard te houden over modus-wissels.

### Tweak 4 — Auto-switch eenmalig bij overgang 1 → 2 metingen

Logica:

```ts
// In AppMode of een lichte coordinator-effect:
useEffect(() => {
  if (points.length === 2 && mode === "meten" && !autoSwitchUsed) {
    setMode("analyseren");
    setAutoSwitchUsed(true);
  }
}, [points.length, mode, autoSwitchUsed]);
```

#### State

- `autoSwitchUsed: boolean` in `AppMode` of vergelijkbaar, default `false`
- **Reset** bij: nieuwe video laden, "Begin opnieuw met deze video", "Alle metingen wissen", "Andere video laden"
- Niet getoond als de leerling al actief in Analyseren staat

#### Geen toast of andere melding

De layout-verandering van alleen-video naar Analyseren spreekt voor zich. Geen tekstuele bevestiging nodig.

### Tweak 5 — Toast uit 08b verwijderen

De `analyseHintShown`-toast uit 08b is overbodig geworden door de auto-switch:

- Verwijder de toast-trigger effect
- Verwijder `analyseHintShown` state-veld
- Verwijder toast-component-aanroepen daar
- Eventuele toast-helper kan blijven voor andere notificaties

### Tweak 6 — Schema-migratie v6 → v7

#### Schema-bump

```ts
PROJECT_SCHEMA_VERSION = 7;

function migrateV6toV7(v6: ProjectV6JSON): ProjectV7JSON {
  return {
    ...v6,
    schemaVersion: 7,
    ui: {
      ...v6.ui,
      mode: v6.ui.mode === "verken" ? "meten" : v6.ui.mode,
    },
  };
}
```

Dispatcher-keten v1 → v2 → ... → v7. Save schrijft altijd v7.

Geen andere wijzigingen in de schema-shape.

---

## Hygiëne-check

Tijdens uitvoer:

- Grep op `'verken'` (string), `Verken` (label), `VerkenLayout` — alles moet weg of vervangen
- Stale CSS van VerkenLayout
- Eventuele oude help-tekst die naar "Verken" verwijst (in HelpPanel) — opzoeken en hernoemen
- Dialog-related code in `AxisAngleDialog.tsx` volledig opruimen

Documenteer in rapport: lijst van plekken waar "verken/Verken" vervangen is, en wat is verwijderd uit de assen-dialog.

---

## Niet doen (parkeren naar 10)

- ❌ Richting-toggle +x rechts/links + +y omhoog/omlaag — komt in **10**
- ❌ Sleep-oorsprong-tooltip — komt in **10**
- ❌ Video-laden bugs (venster-verkleining, autoplay-frames) — komt in **10**
- ❌ Wijzigingen aan tracking-modus zelf

---

## Acceptatie-criteria

### Assen-dialog weg

- [ ] Geen "Assenstelsel instellen"-dialog meer
- [ ] Sleep aan +x-tip blijft hoek wijzigen
- [ ] Sleep aan origin blijft positie wijzigen
- [ ] Snap 15° + Shift-uit blijft werken
- [ ] Stap 5 (Assen) wordt nog steeds `done` via `axesTouched` na sleep

### Modi-rename

- [ ] `WorkMode` type: `'meten' | 'analyseren' | 'tracken'`
- [ ] Toggle UI: "Meten | Analyseren"
- [ ] Alle code-references naar `'verken'` zijn nu `'meten'`
- [ ] Geen `VerkenLayout`-component meer in de codebase
- [ ] Help-paneel verwijst naar de juiste mode-namen

### Layouts

- [ ] Meten-modus: video-only layout, ongeacht aantal metingen
- [ ] Analyseren-modus + `points.length === 0`: alleen video (geen panes)
- [ ] Analyseren-modus + `points.length >= 1`: video klein + tabel + grafieken
- [ ] Pane-state in `GraphsLayoutState` overleeft modus-wissels

### Auto-switch

- [ ] Bij overgang `points.length === 1 → 2` in Meten-modus: automatisch switch naar Analyseren
- [ ] Eenmalig per sessie (state `autoSwitchUsed`)
- [ ] Geen toast of melding
- [ ] Reset bij: nieuwe video / Begin opnieuw / Alle metingen wissen / Andere video laden
- [ ] Niet getriggerd als gebruiker al in Analyseren staat

### Toast uit 08b weg

- [ ] `analyseHintShown`-state en effecten verwijderd
- [ ] Geen toast meer bij tweede meting

### Schema

- [ ] `PROJECT_SCHEMA_VERSION = 7`
- [ ] `migrateV6toV7` vervangt `mode: 'verken'` met `mode: 'meten'`
- [ ] Dispatcher-keten v1 → ... → v7
- [ ] Save schrijft v7
- [ ] Oude projecten openen migreert door (incl. 'verken' → 'meten')

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts

- **09-grafiek-pane-responsive**: knoppen meeschalen of tweede regel, 2 panes onder elkaar met scroll voor smalle schermen
- **10-video-bugs-en-assen-herontwerp**: video-laden bugs (venster-verkleining, autoplay-frames) + assen-stap herontwerp (sleep-oorsprong-tooltip, +x richting links/rechts, +y richting omhoog/omlaag)
- **11-presets**: per fysisch scenario (vrije val, slinger)
- **12-meerdere-meetreeksen**: multi-series datamodel
