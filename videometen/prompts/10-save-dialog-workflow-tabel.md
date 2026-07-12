# Claude Code prompt 10 — Videometen: Save-dialog + workflow-cleanup + tabel-kolommen menu

## Context

Drie UX-fixes in één prompt:

1. **Save-dialog ontbreekt** — bij Project opslaan downloadt de browser nu automatisch naar de downloads-folder met een gegenereerde filename. Geen mogelijkheid voor de leerling om locatie of bestandsnaam te kiezen.
2. **Stap 6 "Analyse" doet niets** — na voorbereiding (stap 1-5) klik je op "Start tracking" om verder te gaan, niet op stap 6. De stap is overbodig. Plus: visueel kunnen we stap 1-5 als "voorbereiding" groeperen zodat de workflow logischer aanvoelt.
3. **Tabel-kolommen rigide** — er is alleen een "Toon snelheden"-toggle. Geen controle per kolom, en versnellingen helemaal niet beschikbaar in de tabel. Beter: dropdown-menu met checkboxes voor alle 6 afgeleide grootheden (vx, vy, |v|, ax, ay, |a|).

Voor context:

- `videometen/src/features/app/ToolMenu.tsx` — Project opslaan-flow
- `videometen/src/features/layout/WorkflowBar.tsx` — workflow-stappen + voorbereiding-grouping
- `videometen/src/features/measurements/Table.tsx` — tabel met "Toon snelheden"-toggle
- `videometen/src/features/measurements/derive.ts` — afgeleide-helpers (`buildRows` met `vx`/`vy`/`vMag`)
- `videometen/src/features/measurements/graph-types.ts` — versnellings-berekeningen (`withAccelerations`)

---

## Te realiseren

### Tweak 1 — Save-dialog via `showSaveFilePicker`

#### Aanpak

Browser File System Access API:

```ts
async function saveProject(project: ProjectJSON) {
  const defaultName = generateFilename(project); // huidige logica

  // Check ondersteuning
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [
          {
            description: "Videometen project",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(project, null, 2));
      await writable.close();
      return;
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // gebruiker annuleerde
      // Andere errors: fallback naar download
      console.warn("Save-dialog failed, falling back to download:", err);
    }
  }

  // Fallback: huidige download-aanpak
  downloadBlob(
    new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }),
    defaultName,
  );
}
```

#### Ondersteuning

- Chrome / Edge / Opera (Chromium): volledige ondersteuning
- Firefox / Safari: geen ondersteuning, valt automatisch terug op download

#### Edge-cases

- `AbortError` wanneer gebruiker annuleert: geen actie, geen toast
- Andere errors: log + fallback
- `showSaveFilePicker` werkt alleen in secure context (HTTPS / localhost) — bij dev op localhost werkt 't, in productie ook want NH is HTTPS

### Tweak 2 — Stap 6 weg + "Voorbereiding" groepering

#### Stap 6 verwijderen

In `WorkflowBar.tsx`:

- Verwijder stap 6 ("Analyse") volledig uit de stappen-array
- Done-state logica voor stap 6 (`points.length >= 2`) verwijderen
- Geen functionaliteit verloren — Start tracking + auto-switch naar Analyseren dekken de hele tracking → analyse flow

#### "Voorbereiding"-label voor stap 1-5

Voeg links van stap 1 een tekst-label toe:

```
Voorbereiding:  [1 Video] > [2 fps] > [3 Trim] > [4 Schaal] > [5 Assen]    [▶ Start tracking]
```

Label-styling:

- Tekst-kleur: `--text-muted` of gedimmed
- Font-size: kleiner dan stap-labels
- Geen actie (informatief)
- Naast de chevron-scheiding tussen de stappen blijft een chevron (`>`) als visuele pijl

Bij smal scherm: label mag verdwijnen (de stappen zelf zijn essentiëler). Eventueel via Tailwind responsive classes (`hidden md:inline-block`).

### Tweak 3 — Tabel-kolommen dropdown-menu

#### Huidige "Toon snelheden"-toggle verwijderen

In `Table.tsx`: verwijder de bestaande toggle-knop. Vervang door een nieuwe controle.

#### Nieuwe controle: dropdown-menu

In de tabel-header (waar "Toon snelheden" stond):

- **Knop "Kolommen"** met dropdown-pijl, of een filter-icoon (`Columns3` van Lucide of vergelijkbaar)
- Klik opent een popover met **6 checkboxes**:

```
☐ vx (m/s)
☐ vy (m/s)
☐ |v| (m/s)
☐ ax (m/s²)
☐ ay (m/s²)
☐ |a| (m/s²)
```

Frame, t, x, y zijn **altijd** zichtbaar — niet in het menu (essentiële kolommen).

#### State

In `Table.tsx` of een lichte UI-state:

```ts
type ColumnKey = "vx" | "vy" | "vmag" | "ax" | "ay" | "amag";
extraColumns: Set<ColumnKey>; // default: leeg (alleen frame, t, x, y zichtbaar)
```

Reset bij nieuwe video / Begin opnieuw / Alle metingen wissen / Andere video laden.

**Niet persisten in project-JSON** voor 10 — kolom-keuze is een snelle UI-aanpassing, geen meting-eigenschap. Bij round-trip: standaard alleen positie-kolommen. (Eventueel later in een schema-bump toevoegen als blijkt dat gewenst.)

#### Versnellings-berekeningen

Voor de tabel: bereken `ax`/`ay`/`aMag` analoog aan `vx`/`vy`/`vMag` via central difference op de snelheids-velden. Implementatie:

```ts
// In derive.ts of een uitbreiding:
function withAccelerations(rows: MeasurementRow[]): MeasurementRow[] {
  // central difference op vx, vy → ax, ay
  // ax = (vx[i+1] - vx[i-1]) / (t[i+1] - t[i-1])
  // randen: forward/backward zoals voor snelheden
  // aMag = √(ax² + ay²)
}
```

Of: hergebruik de bestaande `withAccelerations` uit `graph-types.ts` — die heeft 't al, alleen voor grafieken. Refactor zodat 't ook voor tabel werkt.

Bij `points.length < 3`: ax/ay/aMag undefined (geen lege cellen, gewoon leeg). Bij `< 2`: ook vx/vy/vMag undefined.

#### Hover-tooltips bij checkboxes

Optioneel — bij hover op een checkbox een korte uitleg:

- "Snelheid in x-richting"
- "Snelheid in y-richting"
- "Absolute snelheid: √(vx² + vy²)"
- "Versnelling in x-richting (numerieke afgeleide, kan ruisig zijn)"
- "Versnelling in y-richting (numerieke afgeleide, kan ruisig zijn)"
- "Absolute versnelling: √(ax² + ay²)"

Vermelding "kan ruisig zijn" bij versnellingen is consistent met de help-tekst over numerieke differentiatie.

---

## Hygiëne-check

Tijdens uitvoer:

- Bekijk of de bestaande `withAccelerations`-helper te hergebruiken is, of dat een duplicaat ontstaat
- Check of er "Toon snelheden"-referenties elders zijn (help-paneel, andere tests)
- Documenteer in rapport

---

## Niet doen

- ❌ Assen-stap herontwerp (sleep-tooltip + richting-toggles) — komt in **11**
- ❌ Video-laden bugs (venster-verkleining, autoplay-frames) — komt in **12**
- ❌ Persisten van `extraColumns` in project-JSON — eventueel later
- ❌ Wijziging aan grafieken, tracking, zoom

---

## Acceptatie-criteria

### Save-dialog

- [ ] Bij Project opslaan in Chrome/Edge: native save-dialog verschijnt
- [ ] Gebruiker kan locatie + bestandsnaam kiezen
- [ ] Standaard-naam ingevuld (huidige sanitized filename)
- [ ] Bij annuleren: geen file aangemaakt, geen foutmelding
- [ ] In Firefox/Safari: fallback naar automatische download (huidige gedrag)
- [ ] Bestand bevat dezelfde JSON-content als voorheen

### Workflow cleanup

- [ ] Stap 6 "Analyse" weg uit workflow-bar
- [ ] Tekst-label "Voorbereiding:" links van stap 1, gedimmed
- [ ] Label verbergt zich op smal scherm (responsive)
- [ ] Start tracking-knop ongewijzigd
- [ ] Auto-switch naar Analyseren bij ≥2 metingen blijft werken

### Tabel-kolommen

- [ ] "Toon snelheden"-toggle weg
- [ ] Nieuwe "Kolommen"-knop in tabel-header opent dropdown
- [ ] Dropdown bevat 6 checkboxes (vx, vy, |v|, ax, ay, |a|)
- [ ] frame, t, x, y altijd zichtbaar, niet in dropdown
- [ ] Aanvinken toont kolom in tabel, uitvinken verbergt
- [ ] Versnellings-waardes correct berekend (central difference op snelheden)
- [ ] `points.length < 3` voor versnellingen, `< 2` voor snelheden: cellen leeg
- [ ] Reset bij nieuwe video / Begin opnieuw / Alle metingen wissen / Andere video laden
- [ ] Hover-tooltips per checkbox (optioneel maar gewenst)

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts

- **11-assen-herontwerp**: sleep-oorsprong-tooltip + `+x` richting-toggle (rechts/links via swap-knop) + `+y` richting-toggle (omhoog/omlaag via swap-knop)
- **12-video-bugs**: venster-verkleining bij upload + autoplay-frames na load
- **13-presets**: per fysisch scenario (vrije val, slinger)
- **14-meerdere-meetreeksen**: multi-series datamodel
