# Ideeën voor nieuwe apps

## Afgerond
- [x] Overhoor-app
- [x] CircuitSketch (sketch-circuit-draw)
- [x] Modelleren
- [x] Formules omschrijven — leerling krijgt een formule en moet deze omschrijven naar een opgegeven grootheid
- [x] Significantie — oefenen met significante cijfers (tellen, afronden, juiste aantal sig.cijfers bij berekeningen)
- [x] Videometen — video-analyse / bewegings-tracker: filmpje frame voor frame analyseren, automatisch v-t en a-t grafiek
- [x] Voorvoegsels en machten van 10. Uitleg in negen stappen met een interactieve ladder, plus oefenen in drie vormen en vijf levels, met foutdiagnose en ladder-hint. Plan in `plannen/voorvoegsels.md`. Dimensieanalyse blijft buiten scope.

## Te ontwikkelen

### Mechanica & dynamica
- [ ] Krachtendiagram-bouwer — leerling sleept pijlen op een voorwerp (free-body diagram), tool checkt richtingen en evenwicht
- [ ] Vectoren ontbinden — vector tekenen, componenten aflezen of zelf ontbinden in x/y; ook optellen van vectoren

### Bewegingsleer
- [ ] Grafieken-oefentool (x-t / v-t / a-t) — combinatietool met meerdere oefenmodi:
  - *Type beweging herkennen* — grafiek zonder getallen (x-t of v-t), (deel) gearceerd als aandachtsgebied; kiezen uit stilstand, constante snelheid, versnelling of vertraging (multiple choice + volgende).
  - *Grafieken koppelen* — bij één grafiek de bijbehorende andere twee (x-t/v-t/a-t) kiezen of tekenen.
  - Optie om te oefenen met alleen x-t, alleen v-t, of gemengd.

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

### Overig
- [ ] Onderzoeksvaardigheden app — ondersteuning bij practicumverslagen, variabelen, conclusies etc.
- [ ] Molecuulstructuren tekenen — tool om molecuulstructuren te tekenen
