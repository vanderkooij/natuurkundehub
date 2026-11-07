# Ideeën voor nieuwe apps

## Afgerond
- [x] Overhoor-app
- [x] CircuitSketch (sketch-circuit-draw)
- [x] Modelleren
- [x] Formules omschrijven — leerling krijgt een formule en moet deze omschrijven naar een opgegeven grootheid
- [x] Significantie — oefenen met significante cijfers (tellen, afronden, juiste aantal sig.cijfers bij berekeningen)
- [x] Videometen — video-analyse / bewegings-tracker: filmpje frame voor frame analyseren, automatisch v-t en a-t grafiek
- [x] Voorvoegsels en machten van 10. Uitleg in negen stappen met een interactieve ladder, plus oefenen in drie vormen en vijf levels, met foutdiagnose en ladder-hint. Plan in `plannen/voorvoegsels.md`. Dimensieanalyse blijft buiten scope.
- [x] Bewegingsgrafieken (gebouwd 2026-10-10). Herkennen van stilstand, constante snelheid, versnellen en vertragen in x,t-, v,t- en a,t-diagrammen zonder getallen, met een karretje dat de beweging naspeelt, foutdiagnose en levels. Onderbouwspoor (afstand en snelheid, 4 levels) en bovenbouwspoor (x, v, a, achteruit, 6 levels). Plan in `plannen/bewegingsgrafieken.md`. Level met getallen (onderbouw 5, bovenbouw 7) en een eindmix (onderbouw 6, bovenbouw 8) toegevoegd 2026-10-10. Koppelen voor de bovenbouw toegevoegd 2026-10-12 (vier levels, tot x,t ↔ a,t).
- [x] EM-spectrum (gebouwd 2026-10-15, live na de deploy in Netlify). Spectrumverkenner voor de docent op het digibord: één balk van 100 km tot 0,1 pm met doorlopend zoomen (logaritmisch naar lineair), marker met golflengte, frequentie en energie per foton, *Hoe klein is zichtbaar?* met voorwerpen op schaal, toepassingen met infokaart per apparaat, infopaneel per gebied, lagen om op te bouwen (ook ioniserend, atmosfeer, zonlicht), invoerveld, licht en donker. Plan in `plannen/em-spectrum.md`. Stap 8 (testen op het digibord) staat nog open; daarna eventueel twee markers vergelijken.

## Te ontwikkelen

### Mechanica & dynamica
- [ ] Krachtendiagram-bouwer — leerling sleept pijlen op een voorwerp (free-body diagram), tool checkt richtingen en evenwicht
- [ ] Vectoren ontbinden — vector tekenen, componenten aflezen of zelf ontbinden in x/y; ook optellen van vectoren

### Bewegingsleer
- [ ] Bewegingsgrafieken: koppelen voor de onderbouw (afstand bij snelheid), eventueel als extra level voor vwo. De bovenbouwversie staat er sinds 2026-10-12.
- [ ] Bewegingsgrafieken: koppelen door zelf te tekenen in plaats van te kiezen.

### Meten & rekenen
- [ ] Foutenleer / meetonzekerheden — absolute en relatieve fout, doorrekenen, foutenbalken bij grafieken

### Modern & kern
- [ ] Radioactief verval-simulator — halveringstijd visualiseren, vervalketens stap voor stap

### Automatisering
- [x] **Systeembord** (idee 2026-10-13, live sinds 2026-10-14; plan en geschiedenis per stap in `plannen/systeembord.md`, map `systeembord/`). Simulator van het systeembord van CMA met een eigentijds uiterlijk dat herkenbaar het echte bord blijft. Nog open: de test op Chromebook en digibord.

  **Herkomst en licentie.** Zelf gebouwd in React, TypeScript en SVG (workspace, zoals CircuitFlow). Inspiratie: het online systeembord van Jeroen van Tilburg (github.com/jeroenvantilburg/systeembord, MIT) en de oude exe van Tommy Sools (`sysbord151.zip` in OneDrive, freeware). Er is geen code van Jeroen overgenomen (nagelopen 2026-11-07): alleen gedrag nagebouwd en zijn XML-formaat gelezen. De code is van Jop, er komt geen licentie bij, en Jeroen wordt alleen op de pagina *Over deze tool* (`/systeembord/over/`) genoemd. Jeroen is op 2026-10-13 gemaild.

  **Wat erin zit:**
  - Bord met twee comparators (standaard, met AD-omzetter, teller tot 15) of met transistor (teller tot 9); losse modules erbij, waaronder NAND, NOR, XOR en XNOR als extra.
  - Signaal zichtbaar: hoog kleurt oranje en loopt als een front door de draad; analoge spanning als getal bij de draad.
  - Draden slepen of met twee tikken; een draad buig je door hem aan zijn midden te slepen, en zonder eigen bocht ontwijkt hij de bussen.
  - Relais met een echte tweede stroomkring: 12 V voeding op de onderste zwarte bussen, apparaat (lamp, kachel, ventilator) op de bovenste.
  - Losse sensor (LDR of NTC) en apparaat zijn te verslepen. De lamp schijnt als een straatlantaarn naar beneden, de kachel verwarmt wat dichtbij is, de ventilator blaast naar rechts. Licht en temperatuur worden per sensor berekend.
  - Aardebus per bord (onder het relais, met het NatuurkundeHub-logo). Een draad tussen twee borden werkt pas als hun aardes verbonden zijn; losse modules werken altijd.
  - Waarheidstabel, standaard *Zelf invullen*, met herkenning van EN, OF, NAND, NOR, XOR en XNOR.
  - Ctrl+Z en Ctrl+Y, opslaan als bestand (eigen naam en map, Ctrl+S), openen, ook XML van Jeroen in het oude en het nieuwe formaat, en delen via een link.
  - Docentvoorbeelden via `/systeembord/?docent`, met een kaartje met eisen en een flowchart in de stijl van het werkboek.
  - Aanraakvlakken van minstens 40 schermpixels, invulvakjes met pijltjes.
  - Bewust niet: de microfoon als geluidsensor (te onrustig, toestemming op Chromebooks, privacy). Tikken op de geluidsensor blijft.

  **Nog uitzoeken op het echte bord:**
  - [ ] Pulsenteller: telt het nieuwe bord tot 15 (en wat toont het display bij 10 tot 15)? Telt het oude bord tot 9?
  - [ ] Geheugencel: wat doet de uitgang als set en reset tegelijk hoog zijn? (In de tool wint set.)
  - [ ] Sensoren: ijktabellen (spanning bij licht en temperatuur; stijgend of dalend?) en de rol van de rode en zwarte bus van het sensorvak.
  - [ ] Geluidsensor: tussen welke spanningen beweegt hij bij een tik? (Tool: tot 4 V.)
  - [ ] Pulsgenerator: echt 1 tot 10 Hz?
  - [ ] Comparator: heeft hij hysterese?
  - [ ] Transistor op het oude bord: schakelt hij om bij ongeveer 2,5 V of al bij 0,7 V?
  - [ ] Twee borden zonder aardedraad: werkt er dan echt niets?

  **Later:** een signaaldiagram onderin (signalen over de tijd, met pauze en stap voor stap) en opdrachten met automatische controle in levels (*bouw een inbraakalarm*).

### Optica & golven (lagere prioriteit)
- [ ] Stralengang tekenen — lenzen, spiegels: bron plaatsen, stralen tekenen, beeld bepalen
- [ ] Trillingen & golven — amplitude, frequentie, faseverschuiving slidergewijs aanpassen

### Bestaande tools verbeteren

- [x] **Stapmodus in de oefenmodus van formules omschrijven** (letterformules). De stapper uit de uitleg zit nu ook in de oefening: vrij op te roepen met de knop *Stap voor stap* en automatisch na de eerste fout. Elke route die klopt telt, en het bereikte antwoord wordt in het antwoordveld overgenomen.
- [x] **Feedback in de oefenmodus van formules omschrijven.** Bij een fout wordt zo concreet mogelijk gezegd wát er misgaat (doelgrootheid staat nog rechts, onbekende letter, ontbrekende letter), en na de derde fout staat de juiste omschrijving meteen in beeld in plaats van achter een knop.
- [x] **Stapmodus bij de examenformules.** Ook daar zit de stapper nu, met dezelfde feedback, voorgevulde invoer en reeks-toast. `formuleUitLatex` leest nu impliciete vermenigvuldiging (`mv²`), samengestelde namen (`v_{gem}`, `\Delta x`) en Griekse letters. 46 van de 50 formules passen erin; bij de vier die niet passen (macht met een letter, sinus, formule met twee =-tekens) blijft de knop uit.
- [x] **Uitleg toevoegen bij significantie en formules omschrijven.** Beide uitlegpagina's staan er, in de stijl van Voorvoegsels: stappen met chips, voortgangsbalk, en per stap een interactief onderdeel (de teller bij significantie, de stapper bij formules omschrijven).
- [x] **Toasts en statusbalk bij significantie.** Significantie heeft nu dezelfde statusbalk als Voorvoegsels (welke oefening je doet, stippen naar de volgende reeks van vijf, vlammetje met je reeks en de score) plus een toast midden in het venster bij elke vijf goed op rij. Levels heeft deze tool bewust nog niet; zie hieronder.
- [ ] **Levels bij significantie?** De andere tools hebben oplopende niveaus, significantie niet. Zou betekenen: per oefenvorm (tellen, afronden, berekenen) moeilijkheidstrappen bedenken. Eerst met Jop bespreken of dat hier gewenst is.
- [ ] **Sinus, inverse sinus en logaritme in de stapper en de uitleg.** Daarmee komen ook Snellius (`sin i / sin r = n`) en de halveringstijd met macht n binnen bereik, de twee die nu geen stapmodus krijgen. Let op: dit is bovenbouwstof. Voor de uitleg moet eerst bedacht worden hoe dat deel apart komt te staan, zodat onderbouwleerlingen het overslaan en niet per ongeluk gaan lezen.
- [x] **Kale tienmacht in de parser van significantie.** `10^3` en `10³` werden afgekeurd als onleesbare invoer; ze worden nu gelezen als `1·10³`, dus met één significant cijfer. Wie `1,0·10³` bedoelt moet dat dus nog steeds zo opschrijven, en dat is ook de bedoeling.

- [x] **Formules omschrijven: splitsing onderbouw / bovenbouw** (gebouwd 2026-09-30, getest door Jop). Keuzemenu vraagt eerst onderbouw of bovenbouw. Onderbouw heeft een eigen uitleg (vlek, rekenfamilie 2 = 6/3, weegschaal, stapper met vlek, woordformule, letters v/s/t met Latijnse herkomst) en een oefenmodus met vier levels in de volgorde hieronder, zonder toetsenbord. De stapper kreeg een onderbouwstand: alleen keer en delen met woorden op de knoppen, × als maalteken, een vlek of woord als onbekende en een knop *reken uit*. Oorspronkelijke notitie: Eerste keuze in de tool wordt onderbouw of bovenbouw; alles wat er nu is valt onder bovenbouw. Onderbouw: hooguit 4 grootheden, geen haakjes, wortels of machten, vooral drie grootheden met × of :. Niet alleen de standaardvormen (s = v·t, ρ = m/V) maar net iets breder, zodat ze begrip oefenen en geen trucje. De stapper is hier het hoofdinstrument. Probleem in klas 2: ze snappen niet dat je *afstand* door *s* mag vervangen ("s is toch snelheid?", "ik kan geen Engels"). Idee voor een opbouw vóór de symbolen:
  1. Getallenpuzzels met een wolkje als onbekende (2 = 8 : ☁), zoals bij wiskunde, geen letter.
  2. Woordformules met getallen (afstand = snelheid × tijd, twee ingevuld, de derde is het wolkje).
  3. Tussenvorm: woord en symbool samen (afstand *s* = snelheid *v* × tijd *t*).
  4. Alleen symbolen, met de stapper.
  Doel: een letter is een getal waarvan we de waarde nog niet weten. Nog beslissen: bestaande tool uitbreiden of onderbouw totaal anders opzetten (veel hergebruik in beide gevallen).
- [x] **Formules omschrijven onderbouw: plus en min** (gebouwd 2026-09-30). Apart spoor naast keer en delen, met dezelfde vier treden. Uitleg op `onderbouw/uitleg/?spoor=plusmin`, oefenen via de keuze bovenaan (of `?soort=plusmin`). Contexten: hoe laat moet je weg (tijden als klok, 15:00 − 28 = 14:32), wisselgeld, plaats op een lijn, verschil tussen begin- en eindsnelheid. Letters: s = s₁ + s₂, t_aankomst = t_vertrek + t_reis, en losse letters.
- [x] **CircuitFlow: deeltjes per stroomkring** (2026-09-30). De stroom wordt opgesplitst in kringen van pool naar pool; elke kring heeft een vaste trein deeltjes die als geheel rondrijdt, dus niets raakt uit de pas. Bij een splitsing gaat de ene trein links, de andere rechts. Bij elke aanpassing (ook verslepen) een nieuw nulpunt. Code: `circuitflow/src/model/particles.ts`.
- [x] **CircuitFlow: draden aanklikken en verwijderen** (2026-09-30). Klikgebied minstens ~28 schermpixels (ook uitgezoomd), buigen pas na 10 px slepen, en een knop *Verwijderen* onder een geselecteerde draad (voor digibord zonder toetsenbord).
- [x] **CircuitFlow: voorbeeldschakelingen op het raster** (2026-09-30), plus twee combischakelingen: 20 Ω ∥ 30 Ω in serie met 10 Ω, en 10 Ω + 20 Ω parallel aan 20 Ω (6 V).
- [x] **CircuitFlow: voltmeter met meetpennen** (2026-09-30). Los instrument in de meterstrook: kastje met rode en zwarte pen die je op elke draad of aansluiting zet, zonder iets los te koppelen. Bewust geen stroompennen: een stroommeter moet in de kring.

- [x] **Videometen: duidelijke melding als een video niet laadt** (idee en gebouwd 2026-10-10). Gebouwd: punt 1 en 2 hieronder. De melding staat in het startscherm (oorzaak, bestandsnaam, tips, foutcode), ook als de video later bij het afspelen faalt; foto's, projectbestanden en andere bestanden krijgen een eigen uitleg. Bestanden zonder MIME-type gaan op de extensie. Code in `videometen/src/features/video/videoFile.ts`. HEVC herkennen (punt 3) zit er niet in; de iPhone-tip staat wel in elke melding. Nu faalt het laden stil: in `VideoDropZone.tsx` en `ToolMenu.tsx` stopt `if (!file.type.startsWith("video/")) return;` zonder melding, en bij `probe.onerror` in `VideoState.tsx` wordt een "video" van 1 frame geladen. Aanleiding: in klas 2 laadde een filmpje niet op Chromebooks (bij Jop wel). Oorzaak bleek een kapot mp4-bestand na versturen via Signal: de stsc-tabel van het geluidsspoor verwees naar chunk 5 terwijl er maar 4 waren. Windows negeert dat, Chrome op ChromeOS niet. Hernoemen naar .mov hielp toevallig. Voorstel:
  1. Bij `onerror` een melding met de MediaError-code en een uitleg in leerlingtaal, bijvoorbeeld: "Deze video kan je browser niet lezen. Stuur filmpjes niet via WhatsApp of Signal, maar zet ze direct van je telefoon op je Chromebook (kabel, Drive)."
  2. Lege `file.type` (komt voor bij Chromebooks, bestanden uit Drive of de Android-map) niet weigeren maar terugvallen op de extensie (.mp4, .mov, .webm, .m4v).
  3. Eventueel: geluidsspoor negeren of een hint geven bij HEVC (H.265) die zonder hardware-decoder niet speelt ("zet je camera op Meest compatibel").
- [x] **Videometen: slowmotion-hulp** (idee en gebouwd 2026-10-10). Gebouwd als vraagbalk na het laden (Nee / 120 / 240 fps) en een keuze in de fps-chip. Dit staat los van de afspeel-fps: de tool stapt nog steeds per echt frame, maar rekent met 1/opname-fps per frame. Het projectbestand bewaart de opname-fps (schemaversie 9). Trimtip en de controle met g staan in de help. Telefoons nemen slowmotion op met 120/240 fps maar slaan het op als afspeelvideo van 30 fps; de fps-detectie meet dan 30 en alle tijden zijn een factor 4 of 8 te lang (v te klein, a een factor 16 of 64). De handmatige fps-override bestaat al, maar leerlingen weten niet dat ze die nodig hebben. Voorstel: vraag bij laden "Is dit een slowmotionvideo?" met keuze 120/240 fps, en een tip om alleen het echt vertraagde stuk te trimmen (iPhone heeft aan begin en eind een stuk op normale snelheid). Controle-idee voor in de help: laat een bal vallen in beeld en check of g ongeveer 9,8 m/s² is.

- [ ] **Aanraakvlakken van 40 px in CircuitFlow, CircuitSketch en Videometen** (afspraak in `WORKFLOW.md` onder Aanraken, 2026-11-07). Nu: CircuitFlow aansluitpunten 28 px en alleen bij zoom 1 (draden wel 28 px op elke zoom), CircuitSketch vastklikken binnen ~24 px zonder rekening met zoom, Videometen grepen zonder vaste minimummaat. Systeembord voldoet al.

### Overig
- [ ] Onderzoeksvaardigheden app — ondersteuning bij practicumverslagen, variabelen, conclusies etc.
- [ ] Molecuulstructuren tekenen — tool om molecuulstructuren te tekenen
