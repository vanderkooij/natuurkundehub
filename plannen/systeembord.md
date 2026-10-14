# Plan: interactieve tool Systeembord

13 oktober 2026 · Jop. Vult het idee "Systeembord" uit `IDEEEN.md` (kopje Automatisering) in. Map: `systeembord/`.

## Doel

Een simulator van het systeembord waarmee leerlingen schakelingen eerst op het scherm bouwen en testen, en daarna in het echt op het bord in het lokaal. Daarom moet hij herkenbaar het echte bord blijven: dezelfde drie kolommen (invoer, verwerking, uitvoer), dezelfde modules, symbolen en bussen. Alleen het uiterlijk wordt van nu: strak getekend, rustig, licht en donker thema.

Drie dingen maken het verschil met wat er al bestaat:

1. **Je ziet het signaal.** Draden en bussen laten zien of ze hoog of laag zijn, en analoge spanningen staan erbij.
2. **Onbeperkt uitbreidbaar.** Zoveel poorten, geheugencellen en tellers als je wilt, op een werkvlak dat meegroeit.
3. **Een omgeving om de sensoren heen.** Een lamp bij de lichtsensor, een kachel bij de temperatuursensor, in plaats van alleen een schuifje.

## Doelgroep en gebruik

Leerlingen die het systeembord in de les gebruiken (onderbouw techniek en bovenbouw havo/vwo, automatisering), op Chromebooks. Daarnaast de docent op het digibord bij uitleg.

- Past op een Chromebook-scherm van ongeveer 1366×650 zonder scrollen.
- Bediening met muis en vinger: grote bussen en draden.
- Geen uitlegmodus en geen opdrachten in de eerste versie: het is een vrije bouwomgeving.

## Herkomst en licentie

- **Referentie:** het online systeembord van Jeroen van Tilburg, [github.com/jeroenvantilburg/systeembord](https://github.com/jeroenvantilburg/systeembord), MIT-licentie. Jeroen is op 2026-10-13 gemaild.
- **We bouwen opnieuw**, we forken niet. Zijn code (jQuery en Fabric.js, ongeveer 2500 regels, simulatie en tekenen door elkaar) dient als naslag voor het gedrag per module. Nemen we toch een stuk code letterlijk over, dan gaat zijn copyright- en licentietekst mee in `systeembord/LICENSE-jeroenvantilburg.txt`.
- **Vermelding:** in het blok *Over deze tool*: "Gebaseerd op het online systeembord van Jeroen van Tilburg", met link.
- **Oude exe** van Tommy Sools (`sysbord151.zip` in OneDrive, freeware, geen broncode): alleen als inspiratie. De `.brd`-voorbeelden (thermostaat, teller, piep na 8 seconden, verklikkerlichtje, tel vanaf knal tot verduistering) gebruiken we als testgevallen: we bouwen ze na en controleren het gedrag.

## Het bord en de modules

### De borden in het lokaal

Bron: de tekening *Twee soorten borden* in het werkboek *Automatisering, deel 1 systeembord* (havo 4, OneDrive sectie natuurkunde). Er staan twee soorten borden, even groot maar anders ingedeeld. De simulator heeft ze allebei. **Standaard opent het bord met twee comparators** (Jop, 2026-10-13), zodat je niet elke keer hoeft te kiezen; het bord met transistor zit onder een menuknop.

| Kolom | Bord met transistor (ouder) | Bord met twee comparators (nieuwer) |
|---|---|---|
| Invoer | 2× sensor, geluidsensor, 2× drukschakelaar, variabele spanning, pulsgenerator | idem, plus AD-omzetter (wel op het echte bord, niet in de tekening van het werkboek) |
| Verwerking | transistor, comparator, EN-poort, OF-poort, geheugencel, invertor, pulsenteller | 2× comparator, 2× EN-poort, geheugencel, OF-poort, 2× invertor, pulsenteller |
| Uitvoer | 4× led, zoemer, relais (max 30 V) | idem |

Verder op of bij elk bord: zwarte bussen (aarde), een voltmeter om spanningen te meten, en twee borden kun je koppelen (aardes verbinden). De transistor werkt als een extra invertor.

### Kleuren en details (foto van een CMA-bord, 2026-10-13)

Jop stuurde een productfoto van het CMA-systeembord met twee comparators (van internet, dus niet in de repo zetten). Daarop:

- **Paneel** lichtgrijs met zwarte lijnen tussen de vakken en zwarte tekst; kopjes INVOER, VERWERKING, UITVOER; rechtsonder SYSTEEMBORD met het CMA-logo (logo niet overnemen).
- **Geel:** uitgangen van de invoer (sensor heeft er twee, verder één per module).
- **Blauw:** alle bussen in de verwerking, ingangen en uitgangen.
- **Wit:** ingangen van de uitvoer (led, zoemer, relais) en de ingang van de AD-omzetter.
- **Zwart:** aarde (rechtsonder op het bord, en bij de variabele spanning); de grote zwarte bussen bij het relais zijn de schakelcontacten.
- **Sensorvak:** rode en zwarte bus (voeding van de sensor) plus een schakelaartje, en twee gele uitgangen.
- **Draaiknoppen:** grijs met schaal; comparator 0 tot 5 V, variabele spanning 0 tot 5 V, pulsgenerator 1 tot 10 Hz.
- **Pulsenteller:** rood segmentdisplay van één cijfer, plus een eigen resetknopje op het bord.
- **Leds:** rood, rechts in het uitvoervak; de zoemer heeft een klein symbool.
- **AD-omzetter:** zit op dit bord onderaan de invoer (in 8, 4, 2, 1). Jop gebruikt hem niet in het werkboek (geen binair tellen; voor de microcontroller is "0 tot 5 V wordt 0 tot 1023" genoeg). Toch staat hij in de simulator op het standaardbord (Jop, 2026-10-13): dan klopt het bord met het echte, en andere docenten gebruiken hem misschien wel. Ook los te vinden in het modulemenu.

### Signalen

- Digitaal: laag = 0 V, hoog = 5 V. Een ingang telt als hoog vanaf 2,5 V.
- Analoog: 0 tot 5 V, met één decimaal getoond.
- Een ingang zonder draad is laag, behalve *tellen aan/uit* van de pulsenteller: die telt als er niets op zit.
- Eén uitgang mag naar meerdere ingangen; een ingang krijgt hooguit één draad. Uitgang aan uitgang kan niet.

### Modules

| Kolom | Module | Gedrag |
|---|---|---|
| Invoer | Drukschakelaar | Hoog zolang ingedrukt |
| Invoer | Variabele spanning | Draaiknop 0 tot 5 V; in het werkboek de vervanger van een sensor |
| Invoer | Sensor (2×) | Bus voor een losse sensor (licht, temperatuur); in de simulator kies je welke sensor erin zit, met een omgeving erbij (zie hieronder) |
| Invoer | Geluidsensor | Reageert op geluid en tikken op het bord; analoge spanning die piekt en wegzakt |
| Invoer | Pulsgenerator | Blokgolf, draaiknop 1 tot 10 Hz |
| Verwerking | Comparator | Hoog als de ingang boven de referentiespanning U<sub>ref</sub> zit (draaiknop 0 tot 5 V) |
| Verwerking | EN-poort, OF-poort, invertor | Zoals bekend |
| Verwerking | Transistor | Gedraagt zich als invertor (ouder bord) |
| Verwerking | Geheugencel | Set maakt hoog, reset maakt laag |
| Verwerking | Pulsenteller | Telt opgaande flanken op *tel pulsen*; *tellen aan/uit* laag blokkeert; *reset* hoog zet op 0 en houdt hem daar; uitgangen 1, 2, 4, 8 en een display. Eigen resetknopje. Bord met twee comparators: 0 tot en met 15 (16 standen, Jop denkt dat de nieuwe borden zo tellen), daarna weer 0. Bord met transistor: 0 tot en met 9. Display: Jop denkt dat het bij 10 tot 15 een 1 voor het cijfer zet (dus 10, 11, … 15); nog nagaan |
| Uitvoer | Led (4×) | Brandt bij hoog |
| Uitvoer | Zoemer | Piept bij hoog (geluid via de browser, met een dempknop) |
| Uitvoer | Relais | Schakelt een apparaat: lamp, kachel of ventilator |
| Meten | Voltmeter | Plus op een bus, min op aarde; toont de spanning |

De simulatie moet ook de eigenaardigheden van het echte bord nadoen, want het werkboek bouwt er opdrachten op. Voorbeeld: bij het knipperlicht (opdracht 23b) blijft de led soms branden na de uit-knop. Dat moet in de simulator net zo gebeuren.

Niet op de borden in het lokaal, wel bij Jeroen: DA-omzetter, NAND, NOR, XOR, XNOR. *(NAND, NOR, XOR en XNOR toegevoegd 2026-10-13 op verzoek van Jop, met IEC-symbolen (&, ≥1, =1, rondje voor omgekeerd), in het modulemenu onder "Extra, niet op het echte bord"; niet op de standaardborden. Jeroens bestanden met deze poorten worden nu volledig ingelezen. De DA-omzetter blijft weg.)*

### Indeling

- **Twee standaardborden:** het bord met twee comparators (opent standaard) en het bord met transistor, met precies de indeling uit het werkboek. Wisselen via een menuknop; de keuze wordt onthouden.
- **Leeg werkvlak:** je sleept alleen de modules die je nodig hebt uit een modulemenu.
- **Uitbreiden:** in alle standen kun je extra modules toevoegen, ook een tweede bord ernaast (opdrachten *twee borden*). Het werkvlak groeit mee, met zoomen en verschuiven (wiel, knijpen, + en −, slepen op een lege plek).

### Aansluiting op het werkboek

Het werkboek verwijst nu naar het online systeembord van Jeroen (markering *online*: thuis oefenen, en schakelingen die niet op één bord passen, zoals opdracht 26d en 36). Als deze tool af is, kan die verwijzing naar natuurkundehub. Dan is het fijn als de tekeningen in het werkboek en het scherm er hetzelfde uitzien.

## Weergave

- **Lijkt op het echte bord:** grijze modulekaarten, de symbolen (&, ≥1, 1, M) in een vierkantje, de bussen in de kleuren van het echte bord, labels zoals erop staan.
- **Natuurkundehub-stijl:** eigen SVG-tekeningen in stijl B (witte lijn met kleurvlak, geen emoji), licht en donker thema, de gewone header met `.tool-name`.
- **Signaal zichtbaar:** een hoge draad en bus krijgen een heldere kleur, een lage blijft neutraal. Verandert een signaal, dan loopt er een kort pulsje over de draad in de richting van de stroom. Analoge draden krijgen een klein label met de spanning.
- **Draden:** licht gebogen, zodat ze niet over elkaar verdwijnen. Een draad aantikken selecteert hem, met een knop *Verwijderen* ernaast (digibord zonder toetsenbord), zoals bij CircuitFlow.

## Omgeving bij de sensoren

In een strook naast of onder het bord, voor de sensor die in een sensorbus zit:

- **Lichtsensor:** een lamp die je dichter bij de sensor schuift, of een knop dag en nacht.
- **Temperatuursensor:** een kachel die je aanzet, met een thermometer die langzaam oploopt. Wordt de kachel via het relais door de schakeling zelf gestuurd, dan heb je een echte thermostaat (week 4 van de lessenreeks: aquarium op temperatuur).
- **Geluidsensor:** een knop *klap* of *tik op het bord*, en eventueel de echte microfoon (alleen na toestemming).

Sensoren houden daarnaast een gewoon schuifje voor wie snel een waarde wil zetten. Week 3 van de lessenreeks gaat over sensoren ijken; daarom zit er een vast verband tussen grootheid en spanning in elke sensor (bij sommige daalt de spanning als de grootheid stijgt), dat je met de voltmeter kunt opmeten.

## Waarheidstabel

Kies een of meer uitgangen en de bijbehorende invoer. De tool loopt alle combinaties van de digitale invoer langs en vult de tabel. Of de leerling vult de tabel zelf in en laat hem daarna controleren. Werkt alleen voor schakelingen zonder geheugen of teller; anders zegt de tool dat.

## Bewaren en delen

- Opslaan als bestand en weer openen.
- Delen als link: de schakeling zit in de URL, zodat de docent een beginsituatie kan klaarzetten.
- Het XML-formaat van Jeroen inlezen, zodat zijn voorbeelden bruikbaar blijven.
- Eventueel ook de `.brd`-bestanden van de oude exe inlezen (eenvoudig tekstformaat met per regel positie en moduletype).

## Techniek

- Eigen workspace met Vite, React, TypeScript en SVG, zoals CircuitFlow, met `@nh/shared` (header, thema). Houd de versies van Vite en React gelijk aan de andere workspace-apps.
- **Simulatiekern los van het tekenen,** in pure TypeScript met tests (Vitest). Het schema is data: modules met bussen, en draden van uitgang naar ingang. Dat maakt bewaren, delen en uitbreiden eenvoudig.
- **Rekenen in tikken.** Elke tik (bijvoorbeeld 1 ms simulatietijd) rekent elke module één keer door op basis van de vorige toestand. Dan werken ook terugkoppelingen (een uitgang terug naar een ingang, een geheugencel van twee poorten) en flanken bij de teller, zonder oneindige lussen. Jeroen rekent terug vanaf de uitgang en kan daardoor vastlopen op terugkoppeling.
- Getallen in Nederlandse notatie (komma als decimaalteken).

## Bouwvolgorde

Elke stap levert iets werkends op.

1. [x] **Skelet.** Workspace `systeembord/`, header, thema, een leeg werkvlak met zoomen en verschuiven. Nog niet in `build.sh` en niet op de homepage. *(gebouwd 2026-10-13: React + TypeScript + Vite zoals CircuitFlow, dev-server `systeembord` op poort 5178 in `.claude/launch.json`; werkvlak in `src/werkvlak/` met raster, slepen op een lege plek, wiel, knijpen, knoppen + − en *alles in beeld*, sneltoetsen + − 0; rekenwerk van het kijkvenster in `kijkvenster.ts` met tests; voorlopig een stippelkader waar het bord komt)*
2. [x] **Simulatiekern.** Signaalmodel, moduledefinities en rekenen in tikken, met tests voor elke poort, de geheugencel, de teller en een terugkoppeling. *(gebouwd 2026-10-13 in `src/sim/`: `modules.ts` met alle modules van beide borden plus AD-omzetter, `schakeling.ts` met de draadregels (uitgang naar ingang, één draad per ingang, Nederlandse foutmelding), `simulator.ts` rekent in tikken van 1 ms en binnen een tik in volgorde van de signaalstroom tot alles stil staat; een teller of geheugencel verandert meteen, zodat een flank maar één keer telt. Tests (`npm --prefix systeembord run test:run`) met de schakelingen uit het werkboek: comparator (11), geheugencel (21), teller met uitgang 8 aan reset (22c), knipperlicht dat blijft branden (23b), alarm (25), 2 Hz en stand 6 (27a), gangverlichting (30). Open: wint set of reset bij de geheugencel als beide hoog zijn? Nu set, zoals bij Jeroen)*
3. [x] **Eerste schakeling.** Drukschakelaar, EN-poort, OF-poort, invertor en LED op het werkvlak; draden trekken, selecteren en verwijderen; hoog en laag zichtbaar aan draad en bus. *(gebouwd 2026-10-13 in `src/bord/`: modulevakken naar de tekening in het werkboek (`geometrie.ts`, `ModuleSvg.tsx`), bussen in de kleuren van het echte bord met een oranje gloed als ze hoog zijn (`BusSvg.tsx`), draden die licht doorhangen en oranje kleuren als ze hoog zijn. Draad maken door te slepen van bus naar bus, of door twee bussen na elkaar aan te tikken (digibord); de bus binnen ~24 px telt, dus net ernaast tikken mag. Foute verbinding geeft een melding bovenin. Draad of module aantikken selecteert hem, met een knop *Draad weg* of *Module weg* die op elk zoomniveau even groot blijft, en Delete/Backspace; Escape heft op. Modules verslepen aan hun vak (raster van 10). Drukschakelaar indrukken met muis of vinger. Tijdelijke beginopstelling met twee knoppen, drie poorten en drie leds tot stap 4)*
4. [x] **De standaardborden.** Het bord met transistor en het bord met twee comparators zoals in het werkboek, de keuze tussen die borden en een leeg werkvlak, en het modulemenu om onbeperkt modules toe te voegen. *(gebouwd 2026-10-13: `src/bord/borden.ts` met de indeling van beide borden (comparatorbord met AD-omzetter en teller tot 15, transistorbord met teller tot 9), alle modules getekend in `ModuleSvg.tsx` (draaiknoppen nog alleen als weergave, bedienen in stap 5). Een bord is een paneel met INVOER, VERWERKING, UITVOER; modules erop zitten vast, slepen aan het paneel of een vak verschuift het hele bord, tikken selecteert het (knop *Bord weg*). Werkbalk linksboven: *Bord* (opnieuw beginnen met een van beide borden of een leeg werkvlak, met bevestiging als er draden zijn; of een bord erbij, rechts naast het vorige) en *Module* (alle modules per kolom, komt midden in beeld en is meteen geselecteerd). De laatst gekozen start wordt onthouden (`sb-start`). Extra op verzoek van Jop: de drukschakelaar heeft een knopje *vast*, waarmee hij als schakelaar werkt (elke druk wisselt); zit niet op het echte bord)*
5. [x] **Alle modules.** Variabele spanning, comparator, transistor, geheugencel, pulsgenerator, pulsenteller met display, zoemer, relais met lamp, kachel of ventilator, en de voltmeter. Testen met de schakelingen uit het werkboek (knipperlicht, alarm, gordelalarm, gangverlichting). Analoge spanning als label bij de draad. Testen met de `.brd`-voorbeelden. *(gebouwd 2026-10-13: draaiknoppen bedienbaar door rond de knop te slepen of met het muiswiel (`knopWaarde` met tests), sensor voorlopig met een eigen knopje, spanning als label bij draden van een analoge bron, zoemer met geluid (Web Audio, knop geluid aan/uit, onthouden in `sb-geluid`), relais met lamp, kachel of ventilator (tik om te wisselen), voltmeter in de werkbalk met kastje en rode pen die op een bus springt. Drukschakelaar: slotje in plaats van het woord vast. Zoemergeluid gecontroleerd in de browser (de geluidsuitvoer start bij de eerste klik, in de capture-fase, omdat knoppen op het bord hun klik stoppen). De voorbeelden uit de oude exe zijn nagebouwd op hun gedrag in `src/sim/__tests__/voorbeelden.test.ts` (thermostaat, verklikkerlichtje, piep na 8 s, tel van knal tot verduistering, piepgenerator, afwisselend pieppatroon, teller); het .brd-formaat zelf is niet ingelezen, dat gebruikt een eigen nummering van modules)*
6. [x] **Omgeving bij de sensoren.** Sensoren in de sensorbussen met lamp, kachel met thermometer en klapknop. *(gebouwd 2026-10-13: `src/sim/omgeving.ts` met daglicht, temperatuur en kachel. Een lamp, kachel of ventilator aan het relais werkt terug op de omgeving: een thermostaat regelt echt (regelsysteem met terugkoppeling, week 4) en een straatlantaarn met de sensor onder de lamp knippert ongeveer twee keer per seconde (opdracht 8b), dankzij een traag opgloeiende lamp (0,4 s) en een trage LDR (1 s). Lichtsensor: U = 5·L/(L + 250 lux), steeds minder per lux; temperatuursensor: U = 0,5 + 0,04·T. In elk sensorvak een keuzeknopje: draaiknop, lichtsensor of temperatuursensor; het vak toont dan lux of °C en de spanning. Paneel *Omgeving* linksonder (inklapbaar) met daglicht, temperatuur, kachel aan/uit en buitentemperatuur; verschijnt zodra er een licht- of temperatuursensor in een bus zit. Daarbij twee fouten opgelost: de brede klikzone van een draad blokkeerde knoppen eronder (nu een aparte bedieningslaag boven de draden), en het muiswiel draaide een knop maar één stap per beweging. Geluidsensor: tikken op het vak; de echte microfoon zit er (nog) niet in)*
7. [x] **Signaal laten lopen.** Het pulsje over de draad bij een verandering. *(gebouwd 2026-10-13: wisselt een draad van laag naar hoog of andersom, dan blijft de oude kleur liggen en schuift de nieuwe kleur in 260 ms van de uitgang naar de ingang, met een lichtpuntje voorop (`src/bord/overgangen.ts`, CSS-animatie `sb-front`). Een draad die je net trekt loopt niet. Met de systeeminstelling *minder beweging* blijft het effect uit. Bij een snelle pulsgenerator begint het front bij elke wissel opnieuw)*
8. [x] **Waarheidstabel.** Automatisch en zelf invullen met controle. *(gebouwd 2026-10-13: knop *Tabel* in de werkbalk, paneel rechtsboven. Invoer zijn de drukschakelaars met een draad eraan (A tot D, maximaal 16 rijen, volgorde 00, 01, 10, 11 zoals in het werkboek), uitvoer de leds, zoemer en relais met een draad ernaartoe; op het bord krijgen ze een kaartje met dezelfde naam. *Laat zien* vult de tabel, *Zelf invullen* laat de leerling 0 of 1 tikken en *Controleer* kleurt goed en fout. Tik op een rij: de knoppen op het bord gaan (vastgezet) in die stand en de rij licht op. Elke rij wordt met een schone schakeling uitgerekend (`src/sim/waarheidstabel.ts`, met tests voor opdracht 13 en 19). Met een geheugencel, teller, pulsgenerator of geluidsensor in de schakeling staat er een waarschuwing dat de tabel niet alles zegt)*
9. [x] **Bewaren en delen.** Bestand, link, XML van Jeroen inlezen. Plus **voorbeeldschakelingen via een docentenlink** (Jop, 2026-10-13): niet zichtbaar in de tool, want een deel lijkt op opdrachten uit het werkboek (piep na 8 s ≈ opdracht 32, thermostaat ≈ koelkastalarm) en zou antwoorden weggeven. Alleen te openen met een link die Jop heeft, bijvoorbeeld `?voorbeeld=…` met een moeilijk te raden sleutel. Let op: op een statische site zitten de voorbeelden wel in de code die elke bezoeker downloadt; goed genoeg voor de klas, niet waterdicht. Kandidaten: de zeven nagebouwde voorbeelden uit de oude exe (`src/sim/__tests__/voorbeelden.test.ts`) plus uitlegvoorbeelden (geheugencel, teller op de pulsgenerator, comparator met led). *(gebouwd 2026-10-13: menu *Bestand* met opslaan als bestand (`schakeling.systeembord.json`, eigen formaat met versie, grondig gecontroleerd bij inlezen), bestand openen (ook Jeroens XML: zijn bord wordt ons bord met twee comparators, modules in volgorde op het bord, de rest los; NAND, NOR, XOR, DA-omzetter en dergelijke worden overgeslagen met een melding; lamp of kachel aan zijn relais wordt ons relaisapparaat) en *Link kopiëren* (schakeling ingepakt met deflate in `#s=…`, een heel bord met draden is ongeveer 800 tekens; na openen verdwijnt de link uit de adresbalk). De laatste schakeling wordt automatisch in de browser bewaard (`sb-schakeling`), zodat herladen verdergaat. Docentenlink: `?docent` (eerst met een code, op 2026-10-13 vereenvoudigd: geheim was het toch niet) toont in het menu *Bestand* elf voorbeelden (geheugencel, teller, comparator met led, XOR, thermostaat, straatlantaarn 8b, knipperlicht 23, gangverlichting 30 en drie uit de oude exe); de sleutel gaat niet mee in een gedeelde link. Code in `src/bestand/`, met tests. Ook in stap 8 erbij: de tabel herkent EN, OF, NAND, NOR, XOR, XNOR, NIET en A EN NIET B, met uitleg; bij zelf invullen pas als alles goed is)*
10. [x] **Live zetten (voorbereid).** *(2026-10-13: infopagina `/systeembord/over/` met de vermelding van Jeroen van Tilburg, link ernaartoe in de uitleg (?), vindbaarheidskoppen en og-tags, previewplaatje `assets/og/systeembord.jpg` en `.webp` (thermostaatvoorbeeld, gemaakt met Chrome zonder venster vanaf de gebouwde site), nieuwe categorie *Automatisering* op de homepage met de tegel, regels in `build.sh` en `netlify.toml`, `workflow.md` bijgewerkt. `build.sh` draait foutloos; sitemap 27 pagina's. Leesbaarheid op 1366 × 650 verbeterd: werkbalk in de header, minder vrije rand bij "passend", grotere tekst op de modules (namen 18, buslabels 15, kolomkoppen 22). Nog te doen door Jop: committen en pushen, en testen op een echte Chromebook en het digibord)*

### Vindbaarheid van sensoren en apparaten *(feedback van Jop, gebouwd 2026-10-13)*

Jop kon niet ontdekken hoe je met een lamp, LDR of kachel werkt. Verbeterd:

- **Keuzemenu met woorden** bij het sensorknopje ("Draaiknop (in plaats van een sensor)", "Lichtsensor (LDR)", "Temperatuursensor") en bij het apparaat van het relais ("Lamp", "Kachel", "Ventilator", met wat ze doen). Het vak heet daarna *lichtsensor* of *temperatuursensor*; onder het apparaat in het relais staat de naam.
- **Apparaten naast de sensor**: hangt er een lamp aan een relais, dan staat die links naast de lichtsensor en schijnt erop als hij aan is; een kachel of ventilator staat naast de temperatuursensor. Zo zie je de terugkoppeling.
- **Knop *Omgeving*** in de werkbalk; het paneel gaat ook vanzelf open bij de eerste echte sensor. Geen eigen kachelknop meer (Jop: de kachel hoort via het relais te gaan); wel per apparaat of het aan het relais hangt en aan staat. *Buiten* heet nu *Omgevingstemperatuur*, met de uitleg dat de temperatuur daar zonder kachel naartoe zakt.
- **Knop ? met uitleg** in de header, met de bediening per onderdeel en de link naar feedback.
- **Flikkeren opgelost**: een thermostaat met de kachel aan het relais klapperde ongeveer 46 keer per seconde. Nu warmt het element in een paar seconden op (4 s) en reageert de temperatuursensor met 3 s vertraging; de kachel schakelt nu een paar keer per minuut, de temperatuur schommelt een graad of twee rond de ingestelde waarde (test in `omgeving.test.ts`).
- In het menu Bestand staat Jeroen niet meer; alleen in *Over deze tool*.
- **Tweede ronde (2026-10-13):** een **snoer** loopt van de zwarte contacten van het relais om het bord heen (rechts omhoog, over de bovenkant) naar het apparaat naast de sensor, met het bijschrift "snoer van het relais naar de lamp". Het paneel *Omgeving* toont **alleen wat je gebruikt**: daglicht bij een lichtsensor of lamp, temperatuur bij een temperatuursensor, kachel of ventilator; zonder iets alleen een aanwijzing. In de uitleg (?) een stappenplan **"Zo sluit je het aan"** (lamp die aangaat als het donker is, met de link naar opdracht 8b).
- **Geklapper van de straatlantaarn opgelost:** ook met de trage LDR bleef het systeem op de omslaggrens hangen (lamp op een kwart, relais 10 tot 30 keer per seconde). Een echt relais heeft schakeltijd; nu klappen de contacten pas om als de ingang 0,15 s in de nieuwe stand blijft (`RELAIS_SCHAKELTIJD`). Gemeten: de lamp knippert ongeveer eens per 1,5 s, de thermostaat schakelt ongeveer 2,5 keer per minuut. De tekening van het relais, het apparaat en het paneel volgen de contacten, niet de ingang.

### Derde ronde (2026-10-13)

- **Echte stroomkring bij het apparaat:** een voeding van 12 V (plus en min) naast het apparaat, twee snoeren om het bord heen naar de zwarte contacten rechts in het relaisvak (bovenste naar de plus, onderste naar het apparaat) en een draadje van het apparaat terug naar de min. Het schakelaartje in het relaisvak zit nu tussen die twee contacten. Relais dicht: de snoeren kleuren oranje en er staat "relais dicht: stroom door de lamp".
- **Invulvakjes** bij elke draaiknop (Uref, variabele spanning, pulsgenerator, draaiknop in de sensorbus): tik op de waarde en typ een getal. Leest komma of punt, met of zonder eenheid, ook het minteken van een Chromebook (`src/bord/getal.ts`, met tests); buiten het bereik een melding ("Kies tussen 0 en 5 V.").
- **Docentenlink vereenvoudigd** tot `/systeembord/?docent`.
- **Relais zoals op het bord** (naar het symbool op het CMA-bord en de foto van Jop): spoel met schuine streep en aardetekentje, een **maakcontact tussen de linker twee zwarte bussen** (open als het relais uit is, dicht als het anker wordt aangetrokken) en een **vaste doorverbinding tussen de rechter twee**. Geen wisselcontact. Opschrift "max 30 V / 2,5 A". De stroomkring van het apparaat zit op de linker twee bussen. Documentatie van CMA is online niet te vinden; dit volgt uit het symbool op het bord.

### Vierde ronde (2026-10-14)

- **Ongedaan maken en opnieuw doen:** Ctrl+Z, Ctrl+Y of Ctrl+Shift+Z, en twee knoppen in de werkbalk (digibord). Elke wijziging van de schakeling telt; een draaiknop rondslepen of een module verschuiven is samen één stap, een drukknop indrukken is geen stap. Tot 100 stappen terug (`src/state/geschiedenis.ts`, met tests).
- **Aanraakvlakken:** elke bus, knop, draaiknop, invulvakje en keuzeknopje is op het scherm minstens 40 px, op elk zoomniveau (`MIN_RAAK`). Bij een Chromebookschaal van 0,55 was het slotje 22 px, het resetknopje 18 px en een invulvakje 34 × 16 px.
- **De losse sensor getekend:** een LDR of NTC links naast het sensorvak, met een rood en een zwart snoertje naar de rode en zwarte bus. Lamp, kachel en voeding staan daar weer links van; de lamp schijnt op de LDR.
- **Animatie op de homepagetegel:** bij aanwijzen loopt het signaal van de invertor naar het relais, klapt het relais om en gaat de kachel aan (laag over de schermafbeelding, coördinaten in pixels van `assets/og/systeembord.jpg`; bij een nieuwe schermafbeelding moeten ze mee). Previewplaatje opnieuw gemaakt met de getekende sensor.

## Later

- **Signaaldiagram:** een strook onderin die signalen van gekozen punten over de tijd tekent, met pauze, stap voor stap en vertraagd afspelen.
- **Opdrachten met controle,** in levels: van één poort tot teller en geheugencel (*bouw een inbraakalarm*). De tool test de schakeling met een reeks invoer en zegt wat er misgaat.
- NAND, NOR, XOR en XNOR als extra modules.

## Open vragen

- [x] Welke borden staan er in het lokaal? Twee soorten, zie *De borden in het lokaal* (uit het werkboek, 2026-10-13).
- [x] Kleuren van de bussen, draaiknoppen en labels: zie *Kleuren en details* (foto, 2026-10-13).
- [x] Pulsgenerator: 1 tot 10 Hz (Jop, en zo staat het op de foto).
- [ ] **Uitzoeken in het lokaal:** tellen de nieuwe borden tot en met 15, en zet het display dan een 1 voor het cijfer? Ook: telt het bord met transistor tot 9?
- [ ] Welke sensoren gaan er in de sensorbussen, en welke spanning geven ze bij welke waarde (de ijktabellen uit week 3)? Nu aangenomen: lichtsensor 5·L/(L+250), temperatuursensor 0,5 + 0,04·T, allebei stijgend.
- [x] Jeroen vermelden? Ja (Jop, 2026-10-13): juridisch niet nodig omdat er geen code van hem is overgenomen, maar beloofd in de mail en netjes. In stap 10 in het blok *Over deze tool*.
- [ ] Moet de geluidsensor de echte microfoon kunnen gebruiken, of is tikken op het vak genoeg? (nu alleen tikken)
- [ ] Wat zit er aan de relaisuitgang: alleen een symbolisch apparaat, of ook een tweede stroomkring (max 30 V)?

## Vijfde ronde (2026-10-14, middag)

- Werkbalk rechts uitgelijnd naast uitleg en thema; uitklapmenu's openen naar links.
- Invulvakjes hebben pijltjes omhoog/omlaag (en de pijltjestoetsen), één knopstap per tik.
- Docentvoorbeelden zonder opdrachtnummers. "Tel vanaf een knal" kreeg een draad van de comparator naar de reset van de pulsenteller, zodat elke meting bij 0 begint (test uitgebreid).
- Stroomkring van het relais zoals op het echte bord: de voeding staat rechts naast het bord op de onderste twee zwarte bussen, het apparaat hangt aan de bovenste twee. Geen losse terugdraad meer, geen kruisende snoeren.
- Homepage: "Wat je bij elk onderwerp nodig hebt"; previewplaatje opnieuw gemaakt, tegelanimatie 12,7 px opgeschoven.

## Zesde ronde (2026-10-14, keuzes van Jop: A1, B1+B2, D1)

- A1: bij een docentvoorbeeld verschijnt linksboven een kaartje met de eisen en een flowchart in de stijl van het werkboek (rondje start, rechthoek stap, ruit keuze met ja en nee, lus terug). Data per voorbeeld in `voorbeelden.ts` (`eisen`, `flowchart`), tekening in `EisenKaart.tsx`.
- B1: een draad sleep je aan zijn midden opzij; de bocht wordt bewaard (`Draad.bocht`, ook in bestand en link) en telt als één stap voor Ctrl+Z.
- B2: zonder eigen bocht kiest `kiesBocht` de boog die de minste bussen raakt.
- D1: op de relaiskaart staat een keuzeknopje in plaats van het apparaatje. De tweede stroomkring verschijnt bij elk relais met een draad; zonder passende sensor staat het apparaat rechts bij de voeding.
- Kruising van de twee apparaatsnoeren opgelost (linker bus binnen en hoog, rechter bus eromheen).
- Homepage-animatie: de draad volgt de nieuwe boog en de relaissnoeren kleuren oranje als het relais omklapt.

## Zevende ronde (2026-10-14): verplaatsbaar (keuze 1 van Jop)

- Losse sensor (params `sx`, `sy`) en apparaat (relais-params `verplaatst`, `ax`, `ay`) zijn te verslepen. Sleep je de sensor, dan blijven de apparaten ernaast staan (`apparatenVast`), zodat je de LDR bovenop de lamp kunt leggen.
- Omgevingsmodel per plek: elke sensor heeft eigen licht en temperatuur; elk apparaat gloeit zelf op (`gloed` in de relaistoestand). `bord/opstelling.ts` rekent uit hoe sterk elk apparaat op elke sensor werkt: lamp als straatlantaarn met een lichtkegel naar beneden (vol tot 40°, niets voorbij 65°, niets boven de lamp), kachel naar afstand, ventilator blaast naar rechts. Op de standaardplek is de factor 1, dus de voorbeelden werken als voorheen.
- Waarheidstabel opent standaard op Zelf invullen; Laat zien pas na een klik.
- Weggeklikt eisenkaartje: knopje "Eisen en flowchart" linksboven haalt het terug.
- Licentie: advies is geen licentie toevoegen (Jop beslist). De code is van Jop; Jeroen staat bij Over deze tool.

## Achtste ronde (2026-10-14): aarde

- Elk bord heeft rechtsonder, onder het relais, een vak met het NatuurkundeHub-logo, SYSTEEMBORD en de zwarte aardebus (module `aarde`, alleen op het bord). Jop wilde geen CMA-logo.
- Een aardebus verbind je alleen met een andere aardebus. Een draad van het ene bord naar het andere geeft pas iets door als hun aardes (eventueel via een derde bord) verbonden zijn; anders is hij gestippeld en verschijnt een melding. Losse modules werken altijd, zonder aarde.
- Het zwarte snoer van de voltmeter zit in de aardebus van het bord waarop je meet.
- Bestanden en links van voor de aardebus krijgen hem bij het openen alsnog (`metAarde`).
