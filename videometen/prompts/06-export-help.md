# Claude Code prompt 06 — Videometen: Save/load + export + help-paneel

## Context

Vervolg na de 05-reeks. De tool is functioneel compleet voor analyse — nu komen de "afmaak"-features: project opslaan en laden, data exporteren naar CSV/PNG voor verder gebruik, en een help-paneel dat leerlingen wegwijs maakt. Plus drie defensies tegen de fps-shift-bug die tijdens gebruik opdook (oorzaak niet reproduceerbaar — defensief oplossen).

Voor context:

- `videometen/PLAN.md` — algemene spec
- Bestaande tools `circuitsketch/` en `modelleren/` voor stijl van help-paneel (accordion-stijl)
- `videometen/src/_reusable/ToolMenu.tsx` — bestaande overflow-menu uit 05e/05f
- Alle prior 05-prompts voor de huidige state-vorm
- `videometen/src/features/video/VideoState.tsx` — fps + tracking-data

---

## Doel van deze prompt

1. **Project opslaan en laden** als JSON-bestand, met versienummer voor latere migratie. Bevat alles wat een sessie reproduceerbaar maakt — behalve de video zelf (te zwaar voor JSON). Bij laden wordt de bijbehorende video gevraagd.
2. **Tabel exporteren** als CSV (Excel-NL-vriendelijk).
3. **Grafieken exporteren** als PNG per pane.
4. **Help-paneel** in NH-accordion-stijl met uitleg van workflows, concepten en troubleshooting.
5. **Fps-defensies** tegen de schuiver-bug uit gebruik.

---

## Ontwerpkeuzes

- **Video zelf niet in JSON** — alleen `videoFileName` als referentie. Bij laden vraagt de tool om de bijbehorende video opnieuw te selecteren. (Embedding zou JSON-bestanden 10-100 MB groot maken — niet praktisch.)
- **Schema-versie 1** in elk opgeslagen JSON. Latere wijzigingen aan datamodel krijgen versie 2 etc. met migratie-functies. Voor nu: alleen versie 1 implementeren + één onbekend-versie-error.
- **CSV-formaat Excel-NL**: kolomscheiding `;` (puntkomma), decimaalteken `,` (komma). Eerste rij headers met units. Tabel zoals 'ie in de UI staat (compact of expanded — de huidige weergave).
- **PNG-export per grafiek**, niet één samengestelde export. Leerlingen kunnen losse plaatjes in hun verslag plakken.
- **Help-paneel als overlay-modal** (zelfde patroon als CircuitSketch), niet als sub-pane. Bij open: backdrop blur, klik buiten of `Escape` sluit.
- **Fps-defensies bewust over-the-top** want fps-shift is een sluipend probleem dat leerlingen niet zelf zullen herkennen. Drie lagen: geforceerd na load, visuele warning, en help-sectie.

---

## Te realiseren

### 1. Project-JSON: schema + save

Nieuw bestand `src/features/project/projectSchema.ts`:

```ts
export const PROJECT_SCHEMA_VERSION = 1;

export type ProjectJSON = {
  schemaVersion: 1;
  meta: {
    toolName: "videometen";
    toolVersion: string; // uit package.json
    savedAt: string; // ISO timestamp
    videoFileName: string | null; // referentie, niet de video zelf
  };
  video: {
    fps: number;
    lastFrame: number;
    trim: { start: number; end: number };
  };
  calibration: {
    scale: { p1: Pixel; p2: Pixel; length: number; unit: "m" | "cm" | "mm" } | null;
    axes: { origin: Pixel; angle: number };
  };
  tracking: {
    points: TrackedPoint[]; // alle pixel-data
    frameStep: number;
  };
  ui: {
    mode: "verken" | "analyseren"; // tracken niet — exit naar verken bij save
    trailColor: "teal" | "amber" | "magenta" | "white";
    graphs: {
      panes: Array<{
        type: GraphTypeKey;
        showLine: boolean;
        zoom: { xMin: number; xMax: number; yMin: number; yMax: number } | null;
        tangentActive: boolean;
        measureActive: boolean;
        measureX1: number | null;
        measureX2: number | null;
      }>;
      syncXZoom: boolean;
    };
  };
};
```

Helper-functies:

```ts
export function serializeProject(state: AllAppState): ProjectJSON;
export function deserializeProject(json: unknown): ProjectJSON; // throws op invalid
```

`deserializeProject` valideert:

- `schemaVersion === 1` (anders error met duidelijke melding "Onbekende projectversie X. Update de tool.")
- Bestaan van alle required fields
- Type-checks waar mogelijk

#### Save-flow

In `ToolMenu`:

- Nieuw item: **"Project opslaan..."** (boven de scheidingslijn met "Alle metingen wissen")
- Klik → `serializeProject` + `Blob` met type `application/json` + trigger download
- Filename: `videometen-{videoFileName-zonder-extensie}-{YYYY-MM-DD}.json` (vervang reserved chars met `_`)
- Bij geen video geladen: item is disabled

### 2. Project-JSON: load

In `ToolMenu`:

- Nieuw item: **"Project openen..."** (direct onder "Project opslaan...")
- Klik → file-picker (`accept=".json"`)
- Bij selectie:
  1. Lees JSON, `deserializeProject`
  2. Bij parse-error: alert met de error-melding
  3. Bij succes: toon dialog "Project bevat verwijzing naar video **{videoFileName}**. Selecteer het bijbehorende videobestand:" + file-picker voor de video
  4. Bij video-selectie: laad video (zelfde flow als initial upload), wacht tot fps-detectie + lastFrame bekend zijn
  5. Verifieer dat het geladen video's `lastFrame >= project.video.lastFrame`. Bij mismatch: warning ("Geladen video is korter dan opgeslagen project; sommige metingen vallen mogelijk buiten bereik."). Doorgaan ja/nee.
  6. Force fps naar `project.video.fps` (zelfs als detectie iets anders zegt — zie tweak 5)
  7. Vul alle state in: trim, calibration, tracking, ui (modus, trailColor, graphs)
  8. Sluit dialog
- Bij annuleren in stap 3 of 4: niets veranderen, oude state behouden
- Bij geen video al geladen: gewoon werken vanaf scratch — load doet alles tegelijk

Confirm-dialog bij load wanneer er al een project actief is (video + metingen): "Huidige sessie wordt overschreven. Doorgaan?"

### 3. CSV-export van de tabel

In `ToolMenu`:

- Nieuw item: **"Tabel als CSV"** in een derde sectie (na opslaan/openen, vóór reset-acties)
- Disabled bij `points.length === 0`

#### Formaat

- Excel-NL-vriendelijk: kolomscheidingsteken `;`, decimaalteken `,`
- Header-rij: `frame;t (s);x ({unit});y ({unit});vx ({unit}/s);vy ({unit}/s);|v| ({unit}/s)` — altijd alle 7 kolommen, ongeacht of de UI snelheden toont
- Data-rijen: één per `MeasurementRow`, ook gedimde (buiten-trim) — Excel-gebruiker kan zelf filteren
- Indien snelheids-velden `undefined` (bij `points.length === 1`): leeg veld (twee opeenvolgende `;;`)
- Decimalen: zelfde precisie als in de tabel (2 voor m/cm, 1 voor mm)
- Eerste regel: BOM (`﻿`) zodat Excel UTF-8 correct interpreteert
- Bestand: `Blob` met type `text/csv;charset=utf-8`
- Filename: `videometen-tabel-{videoFileName-zonder-extensie}-{YYYY-MM-DD}.csv`

### 4. PNG-export per grafiek

In **elke `GraphPane` header**: nieuwe knop **"⬇ PNG"** (icoon + tekst, of alleen icoon met tooltip), naast de reset-zoom-knop.

- Klik: `chart.toBase64Image('image/png', 1)` → `<a>` tag programmatisch klikken met download-attribute
- Resolutie: huidige render-resolutie (Chart.js native)
- Achtergrond: ondoorzichtig (zelfde theme-bg als de pane), niet transparant — anders is een witte chart op een wit verslag onleesbaar
- Filename: `videometen-grafiek-{typeKey}-{YYYY-MM-DD-HH-mm}.png` (timestamp inclusief uur/minuut om unieke namen te krijgen)
- Disabled wanneer pane geen geldige data heeft ("Meer metingen nodig"-state)

### 5. Help-paneel

Nieuw component `src/features/help/HelpPanel.tsx` als modal-overlay (consistent met CircuitSketch).

#### Trigger

- De bestaande `?`-knop in de app-header (uit 01) opent dit paneel
- `Escape` sluit
- Klik op backdrop sluit
- `?` opnieuw aanklikken toggelt

#### Layout

- Backdrop: `bg-black/50` met `backdrop-blur-sm`
- Modal: `max-w-3xl`, `max-h-[85vh]`, gecentreerd, scrollbare body
- Header: tool-naam + sluit-knop (×)
- Body: accordion-secties (één tegelijk open, klik op header toggelt)
- Footer: korte regel "Versie X.Y" + link naar repo/feedback (optioneel)

#### Secties

Zeven secties, in deze volgorde:

1. **Aan de slag** — Hoe upload je een video, hoe stel je fps in, hoe trim je. Korte alinea + screenshot of icoon-referentie.

2. **Kalibreren** — Wat is schaal (waarom belangrijk), hoe zet je oorsprong en assenstelsel. Tip over een referentie-object in beeld (meetlat, bekende afmeting).

3. **Meten (tracking)** — Workflow: ▶ Start tracking → klik op object → auto-advance → Escape om te eindigen. Uitleg over frame-step (waarom 5 default, wanneer kleiner/groter). Onderscheid frame ↔ meetpunt: een meetpunt is een frame waarop je hebt geklikt, niet alle frames.

4. **Analyseren** — Tabel, grafieken, raaklijn, meten-lijnen, zoom, modi (Verken vs Analyseren). Hoe je tussen meetpunten navigeert met pijltjes (over grafiek of video).

5. **Sync-problemen?** — _Belangrijk: nieuw t.b.v. fps-bug._ Uitleg: "De fps (frames per seconde) is het ankerpunt tussen tijd en video. Als de fps niet klopt, lopen je metingen uit de pas met de video. Als het object niet bij je meetpunten lijkt te staan: check de fps-chip rechtsboven in de video. Klik erop om te corrigeren. Bij twijfel: probeer 30 of 60 — de meest voorkomende waardes."

6. **Frames vs meetpunten** — Concept-uitleg met voorbeeld: "Een video van 10 seconden bij 30 fps heeft 300 frames. Met frame-step 5 zet je tijdens tracking dus 60 meetpunten — niet 300. De rest van de video zit ertussen maar zonder meting."

7. **Export, opslaan en opnieuw beginnen** — Wat doen de verschillende menu-items in de menu rechtsboven (project opslaan/openen, CSV-export, PNG-export, alle metingen wissen, begin opnieuw, andere video).

#### Styling

- Headers in `font-medium`, secties met luchtige padding
- Body-tekst in standaard-stijl, regels max ~80 chars breed voor leesbaarheid
- Code-fragmenten (zoals toetsen) in `kbd`-elementen
- Geen icoontjes-overdose — alleen waar 't echt duidelijker maakt

### 6. Fps-defensies tegen sluipende sync-shift

Drie defensieve lagen, los van elkaar nuttig:

#### 6a. Fps geforceerd bij project-load

Al gespecificeerd in §2 — bij `deserializeProject` wordt `project.video.fps` direct toegepast en overschrijft elke detectie. Geen "automatische correctie" achteraf.

#### 6b. Visuele waarschuwing bij fps-wijziging na tracking

In de fps-chip:

- Houd in `VideoState` een tracking-state-marker bij: `fpsAtFirstMeasurement: number | null`. Wordt gezet bij het **eerste** opgeslagen meetpunt, en blijft staan tot reset.
- Bij elke wijziging van fps (via chip-input of fps-detectie): vergelijk met `fpsAtFirstMeasurement`. Als wijziging én `fpsAtFirstMeasurement !== null`: zet `fpsWarning: true`.
- Chip-styling bij `fpsWarning: true`: gele border (`border-yellow-400`), achtergrond licht-geel, tooltip:
  > "⚠ fps is gewijzigd nadat je metingen hebt gedaan. Je meetpunten kunnen nu uit de pas lopen met de video. Klopt de fps?"
- Een kleine **"Herstel"**-knop in de tooltip (of als nieuwe chip-substate): zet fps terug naar `fpsAtFirstMeasurement` en clear warning
- Warning blijft tot:
  - fps weer terug op `fpsAtFirstMeasurement`, óf
  - "Alle metingen wissen" / "Begin opnieuw" / "Andere video laden" — dan reset ook `fpsAtFirstMeasurement` naar `null`

#### 6c. Help-sectie "Sync-problemen?"

Al gespecificeerd in §5.4. Bijdragende kennis-defensie.

### 7. ToolMenu volledige indeling

Nieuw definitieve volgorde:

```
Project opslaan...
Project openen...
─── (scheidingslijn)
Tabel als CSV
─── (scheidingslijn)
Alle metingen wissen
Begin opnieuw met deze video
─── (scheidingslijn)
Andere video laden...
```

Disabled-state per item:

- Save / CSV / Wissen / Begin opnieuw / Andere video: bij geen video
- CSV / Wissen: ook bij 0 metingen
- Open: nooit disabled (kan vanuit lege state)

---

## Hergebruik-markering

| Kandidaat                                 | Categorie | Beslissing                                                                                                                |
| ----------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `serializeProject` / `deserializeProject` | data      | **Niet markeren** — schema is tool-specifiek                                                                              |
| `HelpPanel` (modal-overlay-structuur)     | ui        | **Wel markeren** als `ModalPanel` met slot-content. Generiek bruikbaar in andere NH-tools die een help/info-modal willen. |
| CSV-helpers (escape, format)              | data      | **Wel markeren** als `formatCsvNL` of `csvNL.ts` — Excel-NL formatting is generiek                                        |

`HelpPanel` zelf is tool-specifiek (zeven sectie-teksten), maar de **modal-structuur** abstraheren naar `_reusable/ModalPanel.tsx` met props `{ title, isOpen, onClose, children }`. `HelpPanel` wordt dan een dunne wrapper die de inhoud aanlevert.

Voeg toe aan `SHARED.md`.

---

## Niet doen

- ❌ Geen project-JSON migratie-logica voor versie 2+ (alleen versie 1)
- ❌ Geen video-embedding in JSON
- ❌ Geen multi-project tabs of project-history
- ❌ Geen automatische cloud-sync of share-link
- ❌ Geen PDF-export (komt eventueel later)
- ❌ Geen geavanceerde CSV-opties (separator-keuze, kolom-selectie)
- ❌ Geen wijziging aan tracking, kalibratie, grafiek-logica buiten de fps-defensies

---

## Acceptatie-criteria

### Project save/load

- [ ] "Project opslaan..." in ToolMenu downloadt een `.json`-bestand met schemaVersion 1
- [ ] JSON bevat alle velden uit het schema (video-meta, calibration, tracking, ui)
- [ ] Video zelf zit niet in de JSON — alleen `videoFileName`
- [ ] "Project openen..." opent file-picker, na selectie vraagt 'ie om de bijbehorende videofile
- [ ] Bij succesvolle laad: alle state komt terug (kalibratie, trim, metingen, grafiek-panes met types/zoom/raaklijn/meet-state, modus, trail-kleur)
- [ ] Bij onbekende `schemaVersion`: nette error-melding
- [ ] Bij mismatch `lastFrame`: waarschuwing met doorgaan/annuleren
- [ ] Bij actieve sessie + load: confirm-dialog vóór overschrijven
- [ ] `fps` uit JSON wordt geforceerd toegepast bij load (geen detectie)

### CSV-export

- [ ] "Tabel als CSV" downloadt een `.csv` met BOM en NL-formatting (`;` separator, `,` decimaal)
- [ ] Bevat 7 kolommen altijd: frame, t, x, y, vx, vy, |v| (met units in headers)
- [ ] Lege snelheids-velden bij 1-meting projecten
- [ ] Filename met video-naam en datum
- [ ] Excel NL opent 't direct correct (kolommen herkend, decimalen kloppen)

### PNG-export

- [ ] Elke GraphPane-header heeft een "⬇ PNG"-knop
- [ ] Klik downloadt een PNG van de grafiek met ondoorzichtige achtergrond
- [ ] Filename bevat type-key en timestamp
- [ ] Disabled bij "Meer metingen nodig"-state

### Help-paneel

- [ ] `?`-knop in header opent een modal-overlay met backdrop-blur
- [ ] Modal heeft zeven accordion-secties zoals gespecificeerd
- [ ] Eén sectie tegelijk open, klik toggelt
- [ ] Sluit via × / Escape / klik op backdrop
- [ ] Tekst is leesbaar, geen overflow, scrollbare body bij veel content
- [ ] Sectie "Sync-problemen?" legt fps-rol duidelijk uit

### Fps-defensies

- [ ] Bij eerste meetpunt wordt `fpsAtFirstMeasurement` gezet
- [ ] Bij fps-wijziging daarna verschijnt warning-styling op de chip (gele border)
- [ ] Tooltip toont waarschuwingstekst + "Herstel"-actie
- [ ] Herstel zet fps terug naar `fpsAtFirstMeasurement`
- [ ] Bij "Alle metingen wissen" / "Begin opnieuw" / "Andere video laden" reset `fpsAtFirstMeasurement` naar `null`
- [ ] Geladen project forceert fps zonder warning (want dat is bewust ingesteld)

### ToolMenu

- [ ] Volgorde en scheidings-lijnen zoals gespecificeerd
- [ ] Disabled-states correct per item

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **07-functie-fit**: per grafiek-pane keuze tussen "ruwe data" en "fit", fit-types lineair / kwadratisch / sinus / exponentieel, afgeleide-van-fit als bron voor v- en a-grafieken (gladder dan numerieke differentiatie + zinvolle raaklijn op fractionele x-waardes), pedagogische vergelijking ruis vs fit. JSON-schema bumpen naar versie 2 met migratie van 1 → 2 (extra fit-state per pane).
- **08-meerdere-meetreeksen**: multi-series datamodel
- **09-ui-polish**: heroverwegen werkbalk-indeling
