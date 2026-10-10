# Ideeën voor nieuwe apps

## Afgerond
- [x] Overhoor-app
- [x] CircuitSketch (sketch-circuit-draw)
- [x] Modelleren
- [x] Formules omschrijven — leerling krijgt een formule en moet deze omschrijven naar een opgegeven grootheid
- [x] Significantie — oefenen met significante cijfers (tellen, afronden, juiste aantal sig.cijfers bij berekeningen)
- [x] Videometen — video-analyse / bewegings-tracker: filmpje frame voor frame analyseren, automatisch v-t en a-t grafiek
- [x] Voorvoegsels en machten van 10. Uitleg in negen stappen met een interactieve ladder, plus oefenen in drie vormen en vijf levels, met foutdiagnose en ladder-hint. Plan in `plannen/voorvoegsels.md`. Dimensieanalyse blijft buiten scope.
- [x] Bewegingsgrafieken (gebouwd 2026-10-10). Herkennen van stilstand, constante snelheid, versnellen en vertragen in x,t-, v,t- en a,t-diagrammen zonder getallen, met een karretje dat de beweging naspeelt, foutdiagnose en levels. Onderbouwspoor (afstand en snelheid, 4 levels) en bovenbouwspoor (x, v, a, achteruit, 6 levels). Plan in `plannen/bewegingsgrafieken.md`. Level met getallen (onderbouw 5, bovenbouw 7) en een eindmix (onderbouw 6, bovenbouw 8) toegevoegd 2026-10-10. Nog te doen: koppelen (bovenbouw).

## Te ontwikkelen

### Mechanica & dynamica
- [ ] Krachtendiagram-bouwer — leerling sleept pijlen op een voorwerp (free-body diagram), tool checkt richtingen en evenwicht
- [ ] Vectoren ontbinden — vector tekenen, componenten aflezen of zelf ontbinden in x/y; ook optellen van vectoren

### Bewegingsleer
- [ ] Bewegingsgrafieken: koppelen (bovenbouw). Bij een diagram het bijbehorende andere diagram kiezen. Later eventueel een lichte versie voor de onderbouw (extra level vwo). Zie `plannen/bewegingsgrafieken.md`.

### Meten & rekenen
- [ ] Foutenleer / meetonzekerheden — absolute en relatieve fout, doorrekenen, foutenbalken bij grafieken

### Modern & kern
- [ ] Radioactief verval-simulator — halveringstijd visualiseren, vervalketens stap voor stap
- [ ] EM-spectrum verkenner — schaalverdeling radio→gamma, golflengte/frequentie/energie interactief koppelen

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

- [x] **Formules omschrijven: splitsing onderbouw / bovenbouw** (gebouwd 2026-09-30, nog door Jop te testen). Keuzemenu vraagt eerst onderbouw of bovenbouw. Onderbouw heeft een eigen uitleg (vlek, rekenfamilie 2 = 6/3, weegschaal, stapper met vlek, woordformule, letters v/s/t met Latijnse herkomst) en een oefenmodus met vier levels in de volgorde hieronder, zonder toetsenbord. De stapper kreeg een onderbouwstand: alleen keer en delen met woorden op de knoppen, × als maalteken, een vlek of woord als onbekende en een knop *reken uit*. Oorspronkelijke notitie: Eerste keuze in de tool wordt onderbouw of bovenbouw; alles wat er nu is valt onder bovenbouw. Onderbouw: hooguit 4 grootheden, geen haakjes, wortels of machten, vooral drie grootheden met × of :. Niet alleen de standaardvormen (s = v·t, ρ = m/V) maar net iets breder, zodat ze begrip oefenen en geen trucje. De stapper is hier het hoofdinstrument. Probleem in klas 2: ze snappen niet dat je *afstand* door *s* mag vervangen ("s is toch snelheid?", "ik kan geen Engels"). Idee voor een opbouw vóór de symbolen:
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

- [ ] **Videometen: duidelijke melding als een video niet laadt** (idee 2026-10-10). Nu faalt het laden stil: in `VideoDropZone.tsx` en `ToolMenu.tsx` stopt `if (!file.type.startsWith("video/")) return;` zonder melding, en bij `probe.onerror` in `VideoState.tsx` wordt een "video" van 1 frame geladen. Aanleiding: in klas 2 laadde een filmpje niet op Chromebooks (bij Jop wel). Oorzaak bleek een kapot mp4-bestand na versturen via Signal: de stsc-tabel van het geluidsspoor verwees naar chunk 5 terwijl er maar 4 waren. Windows negeert dat, Chrome op ChromeOS niet. Hernoemen naar .mov hielp toevallig. Voorstel:
  1. Bij `onerror` een melding met de MediaError-code en een uitleg in leerlingtaal, bijvoorbeeld: "Deze video kan je browser niet lezen. Stuur filmpjes niet via WhatsApp of Signal, maar zet ze direct van je telefoon op je Chromebook (kabel, Drive)."
  2. Lege `file.type` (komt voor bij Chromebooks, bestanden uit Drive of de Android-map) niet weigeren maar terugvallen op de extensie (.mp4, .mov, .webm, .m4v).
  3. Eventueel: geluidsspoor negeren of een hint geven bij HEVC (H.265) die zonder hardware-decoder niet speelt ("zet je camera op Meest compatibel").
- [ ] **Videometen: slowmotion-hulp** (idee 2026-10-10). Telefoons nemen slowmotion op met 120/240 fps maar slaan het op als afspeelvideo van 30 fps; de fps-detectie meet dan 30 en alle tijden zijn een factor 4 of 8 te lang (v te klein, a een factor 16 of 64). De handmatige fps-override bestaat al, maar leerlingen weten niet dat ze die nodig hebben. Voorstel: vraag bij laden "Is dit een slowmotionvideo?" met keuze 120/240 fps, en een tip om alleen het echt vertraagde stuk te trimmen (iPhone heeft aan begin en eind een stuk op normale snelheid). Controle-idee voor in de help: laat een bal vallen in beeld en check of g ongeveer 9,8 m/s² is.

### Overig
- [ ] Onderzoeksvaardigheden app — ondersteuning bij practicumverslagen, variabelen, conclusies etc.
- [ ] Molecuulstructuren tekenen — tool om molecuulstructuren te tekenen
