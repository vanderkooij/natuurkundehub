# Claude Code prompt 05f — Videometen: Klik-bug diagnose + andere video laden

## Context

Patch-prompt na 05e. Twee dingen:

1. **Klik-bug op grafiek-punt** is na twee fix-pogingen (05c, 05e) nog steeds aanwezig. Tijd voor systematische diagnose vóór een derde fix-poging.
2. **"Andere video laden" zonder browser-refresh** ontbreekt — gebruiker moet nu F5 om opnieuw te beginnen met een andere video.

Voor context:

- `videometen/prompts/05c-grafiek-feedback.md` (eerste fix-poging — `activeEls` met `intersect: false`)
- `videometen/prompts/05e-reset-en-bugfixes.md` (tweede fix-poging — `pointHitRadius: 12`, manuele fallback in `onClick`)
- `videometen/src/_reusable/InteractiveChart.tsx`
- `videometen/src/features/measurements/GraphPane.tsx`
- `videometen/src/features/video/VideoUpload.tsx` (of vergelijkbaar)
- `videometen/src/_reusable/ToolMenu.tsx` (uit 05e)

---

## Te realiseren

### Tweak 1 — Klik-bug: eerst diagnose, dan fix

**Belangrijke instructie: niet opnieuw gokken.** Twee eerdere pogingen hebben de bug niet weggekregen omdat ze gebaseerd waren op vermoedens, niet op meting. Voer eerst de diagnose uit, lees wat er gebeurt, en pas dán een gerichte fix toe.

#### Diagnose-stappen (uitvoeren in dev-modus)

Plaats tijdelijke `console.log`-statements op deze zes meetpunten in `InteractiveChart.tsx` en `GraphPane.tsx`:

```ts
// 1. In InteractiveChart.tsx, binnen de chart-options onClick handler:
onClick: (event, activeEls, chart) => {
  console.log("[CHART CLICK] activeEls:", activeEls, "native:", event.native);
  // ... bestaande logica
};

// 2. Direct voor de activeEls-filter:
console.log("[CHART CLICK] series-hits na filter:", seriesHits);

// 3. Direct na de manuele fallback (uit 05e):
console.log("[CHART CLICK] fallback-nearest:", fallbackHit);

// 4. Direct voor onPointClick-aanroep:
console.log("[CHART CLICK] calling onPointClick:", seriesIdx, pointIdx, point);

// 5. In GraphPane.tsx, in de onPointClick-handler die InteractiveChart aanroept:
const handlePointClick = (seriesIdx, pointIdx, point) => {
  console.log("[PANE CLICK] received:", { seriesIdx, pointIdx, point, meta: point.meta });
  // ... bestaande logica die setFrame aanroept
};

// 6. In de setFrame-aanroep:
console.log("[PANE CLICK] calling setFrame:", point.meta.frame);
setFrame(point.meta.frame);
```

Bouw, open de app, klik op een grafiek-dot, en bekijk de console-output. Dit vertelt **waar** de event-keten breekt:

| Geen `[CHART CLICK]` log | onClick wordt niet eens aangeroepen — DOM-niveau probleem (pointer-events op wrapper, overlay die events absorbeert) |
| `[CHART CLICK]` log maar `activeEls = []` | Chart.js detecteert geen hit — `pointHitRadius` of `interaction`-config niet effectief |
| `activeEls` gevuld maar `seriesHits = []` | Filter is te strikt — overlay-datasets gefilterd weg, geen series over |
| `seriesHits` gevuld maar manuele fallback faalt | Andere logica-bug verderop |
| `[PANE CLICK]` log maar setFrame niet aangeroepen | Logica in GraphPane verkeert |
| Alles loopt door tot `setFrame` maar geen verandering | VideoState reducer slikt 'm op (snap-bug of action-type-mismatch) |

#### Drie hoofdverdachten

Tijdens diagnose, check parallel:

**1. `data-mouse-zone` wrapper (uit 05b)**
Inspecteer de DOM rond de chart-pane. Heeft de wrapper-div met `data-mouse-zone="graph-pane"` per ongeluk `pointer-events: none`, een onverwachte z-index, of een transparant child-element dat events absorbeert? Check ook of de wrapper-div het volledige chart-canvas overlapt (geen positioning-bug).

**2. AxisOverlays (uit 05b)**
De drie zones per as (lo/mid/hi met pointer-events: auto) zouden alleen binnen de as-band moeten zitten (`bottom: 0; height: ~20px` voor x-as, vergelijkbaar voor y). Verifieer in DevTools dat ze niet over het chart-canvas heen liggen. Maak ze tijdelijk visueel met `background: rgba(255,0,0,0.2)` om hun werkelijke positie te zien.

**3. Manuele fallback uit 05e**
De fallback-loop in `onClick` ("scan alle series-datasets op pixel-afstand"). Mogelijk pakt 'ie het verkeerde punt of werkt 'ie niet zoals bedoeld. Check de log van `[CHART CLICK] fallback-nearest`.

#### Fix-strategie

**Pas één gerichte fix toe op basis van wat de logs aantonen.** Documenteer de root cause in een comment boven de relevante code. Verwijder de tijdelijke console.logs als de fix werkt.

**Verifieer expliciet:**

- Klik op binnen-trim dot in Verken-modus
- Klik op binnen-trim dot in Analyseren-modus
- Klik op gedimde (buiten-trim) dot
- Klik na as-sleep (pan/zoom geweest)
- Klik in een `ax-t`-pane (waar het eerste/laatste meetpunt buiten de subset valt)

#### Bonus: vereenvoudig na de fix

Als de fix uit een specifieke richting komt (bijvoorbeeld "AxisOverlays absorberen klikken"), check of de andere "voor de zekerheid"-defensies uit 05c en 05e nog nodig zijn. De manuele fallback uit 05e is vermoedelijk overbodig zodra de echte oorzaak is weggenomen — verwijderen voor leesbaarheid.

### Tweak 2 — "Andere video laden" in overflow-menu

Toevoeging aan het bestaande `ToolMenu` (uit 05e):

#### Nieuw menu-item

Volgorde in het menu (boven naar beneden):

1. Alle metingen wissen
2. Begin opnieuw met deze video
3. **— scheidings-lijn —**
4. **Andere video laden...** (met `...` om aan te geven dat 'r een file-picker volgt)

#### Gedrag

- Klik opent een confirm-dialog: "Hiermee wis je de huidige video, kalibratie, trim en alle metingen. Wil je doorgaan?"
- Bij annuleren: niets gebeurt
- Bij doorgaan:
  1. Roep alle reset-acties uit "Begin opnieuw" aan (kalibratie + trim + tracking + grafiek-layout)
  2. Roep ook `revokeObjectURL` aan op de huidige video-URL (anders memory-lek)
  3. Open een verborgen file-input (`accept="video/*"`) programmatisch via `inputRef.current.click()`
  4. Bij selectie: nieuwe video laden via dezelfde flow als de initial upload (`URL.createObjectURL`, `setVideo`, fps-detectie, etc.)
  5. Bij annuleren van de file-picker: tool blijft leeg (terug naar drop-zone state)

#### Modus-handling

- Werkt vanuit Verken én Analyseren modi direct
- Vanuit Tracking-modus: eerst impliciet `exitTracking()` aanroepen, dan de flow doorlopen
- Workflow-stappen reflecteren correct hun "todo"-state na de reset

#### Niet undoable

Net als "Begin opnieuw" — te grote actie, dialog dekt het.

---

## Niet doen

- ❌ Geen wijziging aan de bestaande "Alle metingen wissen" of "Begin opnieuw" acties
- ❌ Geen nieuwe `pointRadius`-experimenten zonder dat de diagnose dat onderschrijft
- ❌ Geen feature-additions aan grafieken / tabel / tracking buiten de klik-fix
- ❌ Geen drag-and-drop voor "andere video" — gewoon file-picker via menu
- ❌ Niet de file-input prominent in beeld; alleen via het menu-item

---

## Acceptatie-criteria

### Klik-bug fix

- [ ] Diagnose-stap uitgevoerd: console-logs hebben de breuk in de event-keten aangetoond
- [ ] Root cause gedocumenteerd in een comment in `InteractiveChart.tsx` of de relevante plek
- [ ] Tijdelijke console.logs verwijderd
- [ ] Klik op binnen-trim grafiek-dot in Verken-modus → rode dot springt naar dat punt
- [ ] Klik op binnen-trim grafiek-dot in Analyseren-modus → idem
- [ ] Klik op gedimde (buiten-trim) grafiek-dot werkt ook
- [ ] Klik werkt na pan/zoom van de chart (as-sleep, wheel)
- [ ] Klik in `ax-t` / `ay-t` / `|a|-t` panes werkt (waar het eerste/laatste meetpunt buiten de subset valt)
- [ ] Overbodige fallback-code uit 05e is verwijderd als de echte fix die overbodig maakt

### Andere video laden

- [ ] Overflow-menu (kebab in app-header) heeft drie items, met scheidings-lijn vóór "Andere video laden..."
- [ ] Klik toont confirm-dialog met duidelijke tekst over wat verloren gaat
- [ ] Bij annuleren: niets gebeurt
- [ ] Bij doorgaan: alle resets + file-picker opent
- [ ] Bij file-selectie: nieuwe video wordt geladen met fps-detectie, drop-zone state verdwijnt
- [ ] Bij annuleren van file-picker: app toont weer de drop-zone (geen video geladen)
- [ ] Oude video-URL wordt `revokeObjectURL`-ed (geen memory-lek)
- [ ] Werkt vanuit Verken, Analyseren én Tracking modi
- [ ] Workflow-stappen zijn correct gereset

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit uit prompts 01–05e blijft intact
- [ ] `npm run build` succesvol

---

## Volgende prompts (ter info — niet nu uitvoeren)

- **06-export-help**: save/load project als JSON met versienummer (inclusief grafiek-layout, modus, lijn-toggle-state, pane-sizes), CSV-export van de tabel, PNG-export per grafiek via `chart.toBase64Image()`, help-paneel in CircuitSketch-accordion-stijl (incl. uitleg over frames vs meetpunten, camera-vereisten, de drie werkmodi, reset-acties + andere video laden)
- **07-functie-fit**: per grafiek-pane keuze tussen "ruwe data" en "fit", fit-types lineair / kwadratisch / sinus / exponentieel, afgeleide-van-fit als bron voor v- en a-grafieken (gladder dan numerieke differentiatie + zinvolle raaklijn op fractionele x-waardes), pedagogische vergelijking ruis vs fit
- **08-meerdere-meetreeksen**: datamodel uitbreiden naar `series: TrackingSeries[]`, per serie eigen kleur + naam, tabel-pane krijgt serie-tabs of -selector, grafieken per pane optie "één serie / alle gestackt", trail-overlay toont alle series, tracking-flow met serie-keuze, reset-acties per serie
- **09-ui-polish**: heroverwegen werkbalk-indeling (workflow-stappen + start-tracking + mode-toggle + theme/help/menu), eventueel sidebar voor stappen, betere groepering controls
