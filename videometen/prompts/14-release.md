# Claude Code prompt 14 — Videometen: Release in NatuurkundeHub

## Context

Videometen is functioneel compleet, help-paneel is up-to-date (13). Tijd om 'm in de hoofd-NatuurkundeHub op te nemen zodat leerlingen 'm kunnen gebruiken.

Vier stappen:

1. **`.gitignore`**: regel `videometen/` (+ comment) verwijderen zodat 't gecommit kan worden
2. **`build.sh`**: stappen toevoegen om `videometen/` te builden en in `dist/` te kopiëren
3. **Root `index.html`**: tool-card voor Videometen toevoegen aan de tools-grid
4. **Versie-bump**: `videometen/package.json` van `0.0.1` naar `1.0.0`

Plus een korte QA-checklist voor finale verificatie vóór commit.

Voor context (huidige bestanden bekeken):

- `.gitignore`: `videometen/` staat onder "Tools waar nog aan gewerkt wordt"
- `build.sh`: heeft pattern voor CircuitSketch (Vite-app via npm build + kopie naar dist)
- `index.html`: tools-grid heeft 5 tools (Overhoor / CircuitSketch / Modelleren / Formules omschrijven / Significantie) en een "Binnenkort meer..."-placeholder

---

## Te realiseren

### Stap 1 — `.gitignore` aanpassen

Verwijder de laatste twee regels:

```
# Tools waar nog aan gewerkt wordt (nog niet pushen)
videometen/
```

Het bestand eindigt dan na de `**/.gitignore_xcopy`-regel + lege regel.

### Stap 2 — `build.sh` uitbreiden

Toevoegen na de CircuitSketch-build sectie (rond regel 8, vóór de `# Maak de output map aan`):

```bash
# Build de Videometen Vite app
cd videometen
npm install
npm run build
cd ..
```

En aan het einde, na de CircuitSketch-kopie:

```bash
# Kopieer de gebouwde Videometen app
cp -r videometen/dist dist/videometen
```

Pas op het script werkt zoals CircuitSketch — Vite build met `base`-config zodat assets correct van `/videometen/` gehost worden. Check de huidige `videometen/vite.config.ts` op de `base`-instelling; vermoedelijk al `/videometen/` (anders aanpassen).

### Stap 3 — Root `index.html` tool-card toevoegen

In de `tools-grid`-sectie, voeg een nieuwe `<a class="tool-card">` toe **na Significantie** (regel ~410) en **vóór de "Binnenkort meer..."-placeholder** (regel ~412):

```html
<a href="/videometen" class="tool-card">
  <div class="tool-icon tool-icon--purple">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#8b5cf6"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <polygon points="10 10 16 13 10 16 10 10" fill="#8b5cf6" stroke="none" />
      <line x1="2" y1="9" x2="22" y2="9" />
    </svg>
  </div>
  <span class="tool-arrow">→</span>
  <h3>Videometen</h3>
  <p>
    Analyseer bewegingen in video's. Track, kalibreer, plot grafieken en fit modellen — drempelloos
    in je browser.
  </p>
  <span class="tool-tag">meten</span>
</a>
```

**Icoon-keuze**: een film-strip-rechthoek met een play-driehoek erin (`#8b5cf6` paars, consistent met Modelleren — beide zijn analyse-tools). Tool-tag "meten" past bij de aard.

Als de paarse kleur visueel teveel concurreert met Modelleren: alternatief is amber (`#D4923A`) of een nieuwe kleur. Kies wat past in het algehele palet — laat Claude Code beoordelen.

### Stap 4 — Versie-bump

In `videometen/package.json`: verander `"version": "0.0.1"` naar `"version": "1.0.0"`.

Indien er andere plekken zijn waar de versie wordt getoond (bijvoorbeeld in `HelpPanel`'s footer via `toolVersion`-prop, vanuit `package.json` ingelezen): geen aparte wijziging nodig — de footer trekt 'm vanzelf uit het package.

Check `vite.config.ts` of een env-variabele de versie inleest. Zo ja, ververst alles vanzelf bij build.

---

## QA-checklist vóór commit

Vóór `git add . && git commit && git push`: doorloop deze checklist één keer goed met een echte video:

### Functioneel

- [ ] **Video uploaden** — drop en klik werken, video verschijnt
- [ ] **Fps-detectie** — chip toont juiste waarde; manuele wijziging werkt
- [ ] **Trim** — handles slepen, knoppen Trim begin/Trim eind
- [ ] **Schaal** — streep slepen, lengte invoeren, chip wordt actief
- [ ] **Assen** — oorsprong slepen, +x roteren, swap-knoppen `+x →/←` en `+y ↑/↓`
- [ ] **Start tracking** — disabled tot schaal + assen done; daarna naar tracking-modus
- [ ] **Tracken** — auto-advance, Ctrl+Z undo, kleur-cycle
- [ ] **Auto-switch naar Analyseren** bij tweede meetpunt
- [ ] **Tabel** — rijen, hover-sync, Kolommen-menu met 6 extra opties
- [ ] **Grafieken** — type-dropdown, fit (lineair/kwadratisch/sinus), raaklijn, meten-lijnen, zoom (scroll + as-sleep), pane +/×
- [ ] **Verberg-knop** — tabel/video gaan weg, grafieken full
- [ ] **Pane-grootte slider** — werkt zonder layout-break
- [ ] **Project opslaan** — native save-dialog (Chrome)
- [ ] **Project openen** — vraagt videofile, alles laadt terug
- [ ] **CSV-export** — opent in Excel met juiste kolommen
- [ ] **PNG-export per grafiek** — downloadt
- [ ] **Help-paneel** — opent, alle 15 secties leesbaar, TL;DR bovenaan dichtgeklapt
- [ ] **Theme-toggle** — switch werkt, tooltips leesbaar in beide thema's

### Build & deploy

- [ ] `videometen/` niet meer in `.gitignore`
- [ ] `bash build.sh` slaagt zonder errors
- [ ] `dist/videometen/index.html` bestaat
- [ ] `dist/index.html` heeft videometen-card
- [ ] `videometen/package.json` versie = `1.0.0`
- [ ] Geen console-errors in productie-build

### Voor pushen

- [ ] Git status laat zien wat er gecommit gaat worden (geen rare files)
- [ ] Geen `.claude/`-dingen of `node_modules/` in de commit
- [ ] Commit-message helder: bv. `feat: voeg Videometen toe aan NH (v1.0.0)`

---

## Hygiëne-check

Tijdens uitvoer:

- Check of `videometen/vite.config.ts` correct base-path heeft (`/videometen/`)
- Bekijk of er nog development-only code is (debug-flags, commented-out console.logs uit eerdere prompts)
- Documenteer in rapport

---

## Niet doen

- ❌ Geen functionele wijzigingen aan de tool zelf
- ❌ Geen schema-bump (v8 blijft)
- ❌ Geen wijzigingen aan andere NH-tools

---

## Acceptatie-criteria

- [ ] `.gitignore` regel weg
- [ ] `build.sh` uitgebreid met videometen-build en -kopie
- [ ] Root `index.html` heeft videometen tool-card op de juiste plek
- [ ] `videometen/package.json` versie = `1.0.0`
- [ ] `bash build.sh` slaagt (test van root)
- [ ] `dist/videometen/` bestaat na build met geldige HTML/JS
- [ ] QA-checklist uit prompt is doorgelopen (gerapporteerd welke items handmatig gecheckt zijn)

---

## Na deze prompt

**Manual commit + push door Jop** vanaf zijn machine:

```bash
cd C:\Users\jopva\Documents\GitHub\natuurkundehub
git add .
git status   # controleer wat gecommit wordt
git commit -m "feat: voeg Videometen toe aan NH (v1.0.0)"
git push
```

Netlify deployt automatisch na push.

Daarna is de tool live op de productie-URL onder `/videometen/`. Eerste leerling die 'm gebruikt: laat horen wat wel/niet werkt — gerichte feedback-ronde via een nieuwe prompt.
