# CircuitFlow — bouwplan

Een zelfstandige, didactische **gelijkstroom-schakelsimulator** voor natuurkundehub.nl,
naast de bestaande tekentool CircuitSketch. Sandbox waarin leerlingen (havo/vwo onder- en
bovenbouw) snel een circuit bouwen, de werking zien en eraan meten.

## Het onderscheidende punt (de "north star")

De **schermsnelheid van de ladingsdragers is constant**. De stroomsterkte komt tot uiting in
de **dichtheid** van de bolletjes, niet in hun snelheid. Dit voorkomt het hardnekkige
misconcept dat een grotere stroom betekent dat ladingen sneller bewegen — het belangrijkste
verschil met PhET. Deze regel is hard en stuurt de hele animatie-architectuur (Fase 2).

## Scope

- **Wel:** alleen gelijkstroom. Ideale spanningsbron (geen inwendige weerstand),
  weerstandsloze draden, lineaire weerstand en lamp, vereenvoudigde LED, schakelaar, ideale
  meters.
- **Niet (voorlopig):** wisselstroom, condensatoren, spoelen, MOSFETs/overige halfgeleiders,
  inwendige bronweerstand, draadweerstand, temperatuurafhankelijke gloeidraad, en het
  opslaan/delen/als-preset bewaren van schakelingen.

## Architectuur — drie renderlagen + een rekenkern

1. **React UI-schil** — bovenbalk (componentpalet + globale toggles + undo/redo/reset),
   rechterstrook (instrumenten), contextueel bewerk-paneeltje bij het component.
2. **SVG-laag** (React) — de schakeling zelf: componenten, draden, aansluitpunten, selectie,
   slepen. Verandert alleen bij gebruikersactie. De pictoriale plaatjes (batterij, lamp,
   LED) horen hier.
3. **Canvas-overlay** over de SVG — uitsluitend de animatie van ladingsdragers/pijlen,
   elk frame opnieuw getekend op ~60 fps, leest actuele stromen uit de rekenkern. Geen
   klikdetectie. (Gekozen voor performance op een Chromebook.)
4. **Simulatiekern** (`src/sim/`) — schakelingsmodel + solver, volledig losgekoppeld van het
   tekenen. Pure TS, geen React/DOM. Geeft knooppotentialen, takstromen en vermogens terug.

## Stack & plek in de monorepo

- Workspace-app `circuitflow/` (npm-workspaces), zelfde stack als videometen:
  **Vite 7 + React 19 + TypeScript 5.8 + Tailwind v4** (`@tailwindcss/vite`),
  `vite-tsconfig-paths`, **Vitest 3** voor de solver-tests.
- Versies gelijk houden aan de andere workspace-apps (harde monorepo-constraint:
  één Vite-major, één React-kopie).
- Deelt `@nh/shared` (o.a. `useThemeColors` voor de canvas-laag).
- Route **`/circuitflow/`**; ingehaakt via `build.sh`, `netlify.toml` en de hub `index.html`.
- Naam in de UI / hub: **CircuitFlow**.

## Datamodel

- **Vertex** `{ id, x, y }` — een punt. Snap je 'm dicht bij een andere vertex/terminal, dan
  smelten ze tot één gedeeld punt.
- **Component** `{ id, type, terminals:[vertexId, vertexId], values, rotation, mirrored }` —
  meerdere exemplaren per type, roteerbaar en spiegelbaar.
- **Wire** `{ id, a:vertexId, b:vertexId }` — weerstandsloos, breed genoeg om er bolletjes in
  te tonen.
- **Knoop** — gedeelde vertex waar ≥2 aansluitingen samenkomen. ≥3 = automatisch een
  vertakking, geen apart gereedschap. PhET-knooppuntmodel: verbinden = een draaduiteinde op
  een aansluiting/punt laten vallen; vertakken = meerdere draden op één punt. Vrije hoeken
  toegestaan; licht raster als snaphulp mag.

## Solver (de natuurkunde) — Modified Nodal Analysis

Per doorrekening (live, bij elke modelwijziging — geen run-knop):

1. **Samenvoegen (union-find):** draden en gesloten schakelaars zijn weerstandsloos → alle zo
   verbonden vertices vormen samen één elektrische knoop.
2. **Oplossen:** knooppuntmatrix opstellen en oplossen (Gauss/LU). Regelt serie, parallel en
   alle combinaties automatisch — geen schakelingstypes herkennen.
3. **Lineair** voor weerstand/lamp/bron in één stap; de **LED is niet-lineair** en krijgt een
   iteratieve stap (Fase 5).

**Outputs:** knooppotentialen, takstroom per component/draad, vermogen per component.

**Kortsluiting** — goedkope graafcheck: belanden beide polen van een bron na het samenvoegen
in dezelfde knoop, dan is die bron kortgesloten (visueel terugkoppelen, Fase 3). Hetzelfde
mechanisme dekt het doorbranden van de LED bij overstroom.

**Notatie** — uitlezingen met **decimaalkomma**, zinnig afgerond, eenheden V/A/Ω/W.

**Validatie** — referentieschakelingen met bekende uitkomsten als ingebouwde Vitest-controle
(2× R serie, 2× R parallel, spanningsdeler, …).

## Componenten

Allemaal sleepbaar vanaf de bovenbalk, in meervoud, roteerbaar en spiegelbaar. Weergave =
**pictoriaal** (echte plaatjes, geen kale symbolen):

- **Spanningsbron** — ideaal, instelbare EMK; herkenbare batterij/voeding.
- **Weerstand** — lineair, instelbare R; body met kleurringen (live afgeleid van de waarde;
  zie Fase 6) of opgedrukte waarde als de waarde niet codeerbaar is.
- **Lamp** — lineair (geen temperatuurafhankelijke gloeidraad), instelbare R; helderheid
  ∝ gedissipeerd vermogen P = I²R; gloeilampje met zichtbare gloeidraad en lichtstralen die
  met P meegroeien.
- **LED** — sterk vereenvoudigd niet-lineair: ideale diode met instelbare drempelspanning Vf
  (≈2 V), geleidt alleen in doorlaatrichting, brandt door boven een instelbare doorbrandstroom;
  fysiek 5mm-koepeltje met kristal-kommetje, langere anodepoot en afgevlakt kantje; licht op in
  zijn kleur (rood standaard, kleurkeuze met eigen Vf later). Geen voorschakelweerstand op een
  ideale bron → stroom → ∞ → brandt meteen door (dat is de les).
- **Schakelaar** — open/dicht; dicht = ideale draad (weerstandsloos).

## Stroomvisualisatie (Fase 2 — het kernonderscheid)

- Schermsnelheid van de bolletjes **constant** (harde regel).
- Dichtheid (aantal per lengte draad) ∝ |I|, met onder- en bovengrens (zwakke stroom druppelt
  nog net zichtbaar; sterke stroom oogt vol zonder massief blok te worden).
- Bij een knoop verdeelt de dichtheid zich over de takken naar rato van de takstromen →
  Kirchhoffs stroomwet wordt letterlijk zichtbaar.
- Toggle: **elektronen** (bolletjes met −, min → plus) ↔ **conventionele stroom**
  (vectorpijlen, plus → min). Bij I = 0 beweegt er niets.

## Meters (Fase 4 — ideaal)

Sleepbaar uit de rechterstrook, aangesloten met meetsnoeren.

- **Digitale meter** — twee aansluitingen, cijferweergave, minteken bij omgekeerde
  aansluiting, decimaalkomma.
- **Analoge VOS-meter** — wijzerinstrument met GND-poort + drie meetpoorten; voltmeter-bereiken
  3/15/30 V, ampèremeter-bereiken 5/0,5/0,05 A; gekozen poort bepaalt de schaal; te klein
  bereik → naald slaat door. **Schaalverdeling, waarden, notatie en kleuren worden 1-op-1
  overgenomen van een door de docent aangeleverde screenshot.**
- Ampèremeter in serie (schakeling openbreken via "node loskoppelen"); voltmeter parallel.

## UI & opmaak

- **Bovenbalk:** componentpalet (in de geest van CircuitSketch) + globale toggles
  (elektronen/conventioneel) + undo/redo/reset.
- **Rechterstrook:** instrumenten om op het canvas te slepen. Componentwaarden bewerk je
  **contextueel** via een paneeltje bij het aangeklikte component.
- **Canvas:** rustige, **niet-witte** achtergrond (visueel onderscheiden van CircuitSketch),
  met subtiel snapraster.
- **Stijl:** de NH-app-design-tokens (kleuren, Space Grotesk / JetBrains Mono, knop- en
  layoutconventies), gedeeld dark/light via `data-theme` + `nh-theme`. **Niet** de
  Bosgroen-documentstijl (dat is voor lesmateriaal).

## Quality-of-life (deels Fase 1, rest Fase 6)

Node/draad loskoppelen · component verwijderen · waarde aanpassen door op een component te
klikken · roteren en spiegelen (nodig voor LED-polariteit) · undo/redo · pannen en zoomen ·
reset. (Opslaan, deelbare presets en een docentmodus zijn voor later.)

---

# Fasering

Elke fase levert iets op dat draait en in de klas te proberen is.

## Fase 1 — Fundament  ✅ klaar

Skelet van de app (de drie lagen + kern), componenten plaatsen en verbinden met
vertex-snapping en union-find-samenvoeging, en de MNA-solver voor **bron, weerstand en lamp**.
Aan het eind: numeriek correct voor serie/parallel/combi, lamp met basishelderheid ∝ P, en de
referentieschakelingen als Vitest-controle in de code.

**Bouwvolgorde:**
1. Scaffold workspace + NH-stijl + leeg canvas met thema-toggle — *draait*.
2. `sim/`-kern + MNA + referentie-tests (headless) — het meeste denkwerk; eerst groen.
3. Datamodel + `useCircuit`-reducer (plaatsen/verplaatsen/verbinden/snappen/verwijderen).
4. Pictoriale SVG-render (bron/weerstand/lamp) + selectie.
5. Contextueel bewerk-paneeltje (R/EMK/roteren/verwijderen).
6. UI ↔ kern koppelen: live oplossen + lamphelderheid ∝ P.
7. Inhaken op `build.sh` / `netlify.toml` / hub-kaart.

**Default-waarden:** bron 6 V · weerstand 10 Ω · lamp 6 Ω · (LED Vf 2 V / doorbrandstroom
~30 mA, pas Fase 5).

**Definition of done:** `npm run dev` laat bron + weerstanden + lamp plaatsen, verbinden en
bewerken met correcte lamprespons; `npm run test:run` groen op de referentieschakelingen;
`npm run build` (root `build.sh`) bouwt mee en de hub linkt naar `/circuitflow/`; `tsc` schoon.

**Bewust nog niet:** animatie, schakelaar, kortsluit-visuals, meters, LED, kleurbanden,
undo/redo, spiegelen — wél op voorbereid in het model.

## Fase 2 — Stroomvisualisatie  ✅ klaar

Canvas-overlay met ladingsdragers op **constante schermsnelheid** en **dichtheid ∝ stroom**,
plus de toggle elektronen ↔ conventionele stroom (vectorpijlen). De dichtheidsverdeling bij een
knoop wordt hier zichtbaar (Kirchhoff). Per-draad-stroomattributie via `model/flows.ts`
(graaf-Laplaciaan/KCL per knoop-eiland).

## Fase 3 — Schakelaar & kortsluiting  ✅ klaar

Schakelaar (open/dicht, dicht = weerstandsloos; tik om te schakelen) · kortsluitingsdetectie via
de graafcheck · visuele terugkoppeling: bron gloeit (pulserend), kortgesloten draden worden heet
(smelten), rookwolkjes stijgen op, plus de melding ("Kortsluiting: de bron is kortgesloten").

## Fase 4 — Meters  ✅ klaar

Digitale volt- en ampèremeter (2 aansluitingen, ideale ∞/0 Ω) + analoge VOS-meter (4 poorten:
zwart common + 3 rood = bereiken; wijzer over 3 schalen; doorslaande naald bij te klein bereik).
Uit de rechterstrook, aangesloten met draden; ampèremeter serieel inbreken via de knip. Ideale
ampèremeter = 0 V-sense in de solver; voltmeter = probe (∞ Ω). De analoge A-meter: 5/0,5/0,05 A
(5 vakken); V-meter: 30/15/3 V (3 vakken). AC/DC-toggle weggelaten.

## Fase 5 — LED  ✅ klaar

Niet-lineaire diode via **toestand-iteratie** (geleidend ⇄ sperrend, hersolve tot stabiel;
doorlaat = kleine serieweerstand R_ON met Vf-drempel als equivalente stroombron, sper = mini-lek
G_OFF). Connectiviteit is toestand-onafhankelijk → eiland-indeling wordt één keer voorbereid.
**Kleurkeuze** (rood/geel/groen/blauw/wit) met **eigen Vf** per kleur (1,8–3,2 V) in het
contextpaneel; helderheid ∝ stroom (lineair). **Polariteit:** roteren/spiegelen verplaatsen alleen
vertices en keren een *bedrade* LED dus niet om → aparte **poolomkeer-knop** (⇄, wisselt anode/
kathode = v0↔v1). **Doorbranden:** boven de doorbrandstroom (30 mA) licht de LED kort fel op en
gaat dan uit (permanent open tot "vervangen"); rechtstreeks op een ideale bron zonder
voorschakelweerstand → meteen door (de les). Rookwolkje bewust weggelaten (net als bij kortsluiting,
op verzoek). Tests: 6 LED-cases groen (voorwaarts/achterwaarts/onder drempel/doorbrand/vervangen/
Vf-vergelijk).

## Fase 6 — Afwerking (bezig)

- **Undo/redo ✅ klaar** — history-omhulsel rond de reducer (`historyReducer` in useCircuit:
  past/present/future). Ctrl+Z / Ctrl+Y (+ Ctrl+Shift+Z) én ↶/↷-knoppen in de Toolbar (disabled
  bij lege stapel). Sleep- en slider-acties **coalescen** tot één undo-stap (coalesceKey op
  move*/setValue) met een `commit` op elke pointerup als gebaar-einde. Max 100 stappen.
- **Gloeilamp ✅ vernieuwd** (op verzoek): puntgloed i.p.v. stralen + spiraalvormige gloeidraad.
- **Analoge meters ✅ afgemaakt** (op verzoek): detach werkt op poorten; één-pool → geen meting;
  voltmeter-teken gecorrigeerd + naald slaat verkeerde kant op bij omgekeerd aansluiten; range-
  schakelaar (knoppen) verplaatst de draad; schaartje losmaken op élke poort met een draad.
- **Kleurbanden weerstand ✅** (live afgeleid, ontkoppeld van de exacte R): 2 sig. cijfers + macht-
  band + gouden tolerantieband via de standaard kleurcode; 474 Ω → geel-violet-bruin (=470).
- **Schematische symbolen ✅** (op verzoek): toggle "Pictoriaal / Schema" in de toolbar; schoolboek-
  symbolen voor bron (batterij +/−), weerstand (rechthoek), lamp (cirkel-kruis), LED (diode ▷|
  + lichtpijltjes); meters blijven pictoriaal. Lamp/LED houden hun gloed. Palet loopt mee.
- **Help-menu + feedback ✅**: "?"-knop in de header → modal met bediening + feedback-link (→
  `/contact/`); zo staat de feedback niet permanent in beeld. In CircuitSketch idem: feedback-
  voettekst in het HelpPanel.
- **Zoomknoppen ✅**: − / percentage / + rechtsonder in het canvas; klik op het percentage = terug
  naar 100 %.
- **Inklapbare meter-strook ✅**: klapt in naar een smalle balk (meer canvasruimte).
- **Voorbeeldschakelingen ✅**: presets (serie, parallel, LED+weerstand, spanningsdeler) via het
  bestand-menu; `loadDoc` hernummert alle id's.
- **Opslaan & exporteren ✅**: schakeling opslaan/openen als JSON + exporteren als PNG (witte
  achtergrond, `.cf-root` met ingelijnde stijlen).
- **Meetopdracht-modus ✅**: oog-toggle verbergt de auto-getoonde stromen (leerling meet zelf met
  de meters); waarschuwingen + meter-uitlezingen blijven.
- **Zekering ✅**: component `fuse` (intacte zekering = mini-weerstand 1e-3 Ω die stroom geeft;
  boven de nominale stroom `imax` brandt hij door → permanent open tot "vervangen"). Pictoriaal
  (glaszekering met draadje) + schematisch (IEC-rechthoek met lijn). Beschermt tegen kortsluiting.
- **Batterij-symbool (schema) ✅**: de wire loopt nu door tot beide platen (cf-lead-stukjes).
- Potentiometer: **geschrapt** (een instelbare weerstand doet hetzelfde).
- **I-U-grafiek ✅**: klik een weerstand/lamp/LED → "Toon I-U-grafiek" in het paneel; sweept de bron
  0→ingesteld, plot U (over) tegen I (door) het component. Weerstand → rechte lijn (Ohm), LED →
  **gladde exponentiële diode-knie** (Shockley-model in de solver). Live, met werkpunt-stip.
  Bij een LED: **alle kleuren naast elkaar** (elk hun eigen knie, actieve kleur dik + werkpunt,
  legenda eronder); as-waarden op kwartposities op beide assen.
- **Kritische-review-ronde ✅** (2026-07): toolbar **wikkelt** op smalle schermen (was 275 px buiten
  beeld op 1024); PNG-export forceert **licht thema** (dark-kleuren waren onleesbaar op wit); help
  geactualiseerd (alle nieuwe functies); **autosave** naar localStorage + herstel (deellink `#c=`
  wint); **deellink** (base64url in de hash, "Kopieer deellink" + toast); digitale meters hebben
  **rood/zwart-nubjes** (V: +=v0, A: +=v1); contextpaneel geklemd binnen het canvas; **Esc**
  deselecteert; toast i.p.v. alert; presets +2 (**Lamp+schakelaar**, **Kortsluiting-demo** — dicht
  de schakelaar → zekering offert zich, lamp gered); **meetwaardentabel** (U/I/P per component,
  Table-knop; uit in meetopdracht-modus, net als de grafiek); lampgloed schuift van warmgeel naar
  wit met P; **11 reducer-tests** (undo/coalesce, cutNode, detach-poorten, remap) → 38 totaal.
- **Uitbreidingsronde 2 ✅** (2026-07): **sensoren LDR/NTC** (omgevings-slider licht/temperatuur,
  R log van 20 kΩ → 100 Ω, label toont "50 % → 1,41 kΩ", eigen symbolen pictoriaal + schema);
  **niet-ohmse lamp** (per-lamp toggle "gloeidraad": R stijgt met |U| van 25 %→100 % bij 6 V, via
  het Newton-raamwerk → kromme lampkarakteristiek in de grafiek); **totaal-rij + R_v** in de
  meetwaardentabel; **opdracht-deellink** (dialoog met opdrachttekst + meetmodus-vinkje; leerling
  opent met opdrachtkaart in meetstand); **tekstlabels** op het canvas (T-knop, dubbelklik =
  bewerken, slepen, reist mee in opslaan/deellink/PNG); **warmte-gloed** op weerstanden (∝ P);
  **Ctrl+D dupliceren** (+ knop in het paneel). 39 tests.
- **Uitbreidingsronde 3 ✅** (2026-07): **selectiekader** (slepen op leeg canvas → groepsselectie
  van componenten/draden/labels; actiebalk met Dupliceren/Verwijderen; Ctrl+D/Delete/Esc; pannen
  verhuisd naar **Alt+slepen of middelste muisknop**); presets **Schemerschakelaar (LDR)** en
  **Temperatuursensor (NTC)** (spanningsdeler + voltmeter + opdrachtlabel); help geactualiseerd;
  meter-strook **standaard dicht**; stroom **standaard conventioneel** met **fel oranje pijlen**
  (groter + wit randje); **T-toets** voegt een tekstlabel toe en de editor is nu een duidelijk
  kaartje ("Tekstlabel" + hint). RAM gemeten: ~16 MB JS-heap, ook met grafiek open.
- **Groep-verplaatsen ✅**: slepen aan één lid van de groepsselectie verplaatst de hele groep
  (één undo-stap). **Labels met kader ✅**: checkbox "Met kader (opdracht-kaartje)" in de editor;
  los bijschrift blijft zonder kader; de preset-opdrachten zijn kaartjes.
- Rest: dichtheid-tuning (wacht op klas-ervaring) · evt. schematische meters · mobiel (<768 px)
  bewust buiten scope.

---

## Verkochte beslissingen / aantekeningen

- **PhET-overname:** we kopiëren het interactiemodel (slepen uit palet, knoop-snapping,
  vertex-splitsen, live oplossen, contextueel bewerken, rook bij overbelasting) bijna 1-op-1,
  maar vervangen het stroombeeld (snelheid → **dichtheid**) en strippen de niet-ideale
  onderdelen (draad-/bronweerstand). Niet overnemen: de "grab bag", AC/condensatoren/spoelen,
  grafiek-over-tijd.
- **Kleurbanden weerstand:** de ingestelde R is de waarheid (elk positief getal mag); de banden
  zijn een best-effort visualisatie (4 banden = 2 sig. cijfers, 5 = 3) met als terugval een
  opgedrukte waarde wanneer de waarde niet exact codeerbaar is. Het label toont altijd de exacte R.
- **Symbolen niet gedeeld met CircuitSketch:** CircuitFlow is pictoriaal; CircuitSketch is
  schematisch en bovendien geen workspace. Een latere schematische toggle kan die symbolen alsnog
  hergebruiken.
