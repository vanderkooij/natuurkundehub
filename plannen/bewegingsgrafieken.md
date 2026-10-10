# Plan: Bewegingsgrafieken

Naam en map vastgesteld op 2026-10-10: **Bewegingsgrafieken**, `bewegingsgrafieken/`.

**Status 2026-10-10:** herkennen gebouwd voor beide sporen (keuzepagina, uitleg, oefenen, 17 tests). Afwijking van het plan: de oplopende reeks gaat na **4** goed op rij een level omhoog in plaats van 3, omdat je bij vier meerkeuzeknoppen drie op rij nog redelijk kunt gokken. Nog niet gebouwd: koppelen en de getallenmodus.

**Feedbackronde 2026-10-10:** oefenscherm in twee kolommen zodat alles op een Chromebook (ca. 1366 × 650) in beeld past; geen "Over deze tool" op subpagina's; duidelijkere nul en ruimte boven de t-as bij negatieve waarden; melding bij de eerste vraag van een nieuw level; tussenstand met fouten per soort na 15 opgaven en bij Terug; "Toon ook" laat alle andere diagrammen zien; karretje met voorkant, maar neutraal (zonder voorkant, baan symmetrisch) vóór het antwoord in bovenbouw level 4 en 6; in level 6 bij a = 0 een neutrale hint; per uitlegstap een vraag "Probeer het zelf".

**Feedbackronde 2 (2026-10-10):** geen sprongen in de snelheid in levels met het a,t-diagram en in de bovenbouwdemo's (anders is a daar oneindig); "Probeer het zelf" is nu een gegenereerde vraag met "Nog een vraag", met antwoorden uit de tot dan toe behandelde bewegingen (geen vraag bij stilstand en bij het a,t-diagram); demo's starten op de beginplek; zinnen over eenparig versneld/vertraagd en "Als a en v hetzelfde teken hebben".

Oefentool voor het herkennen van bewegingen in x-t, v-t en a-t diagrammen. Geïnspireerd door de oefening op wetenschapsschool.nl (één lijnstuk rood, vier knoppen, score), uitgebreid met een bewegend karretje, foutdiagnose, levels en een apart onder- en bovenbouwspoor. Vult het idee "Grafieken-oefentool" uit `ideeen.md` in.

Uitgewerkt in overleg op 2026-10-10. Eerste inzet: leerjaar 2 en leerjaar 4.

## Kernkeuzes

- **Vormherkenning, geen getallen.** De assen hebben een naam en eenheid, maar geen schaalverdeling. Een modus met getallen (aflezen, rekenen) kan later apart.
- **Vier antwoorden:** stilstand, constante snelheid, versnellen, vertragen. Richting (vooruit of achteruit) is geen apart antwoord, maar komt in de feedback terug.
- **Twee sporen, één motor.** Onderbouw en bovenbouw delen het bewegingsmodel, de grafiekweergave en het karretje, maar hebben eigen taal, eigen levels en een eigen uitleg. Het spoor staat in de URL (`?niveau=onderbouw` of `?niveau=bovenbouw`), zodat elke klas een eigen link krijgt.
- **Uitleg en oefenen als twee menu's,** zoals bij voorvoegsels. De uitleg is om op terug te vallen; de feedback in het oefenen linkt naar het passende stuk uitleg.
- **Vroeg mengen.** Het doel is x-t en v-t uit elkaar houden. Level 1 is kort en heeft alleen v-t; vanaf level 2 komen de diagramsoorten door elkaar, met bewuste contrastvragen (dezelfde vorm in het andere diagram).

### Waarom v-t eerst

Bij v-t is de hoogte de snelheid, alsof je een snelheidsmeter volgt. Wie de grafiek als plaatje leest, zit daar toevallig goed. Dat geeft snel succes en de vier begrippen worden geleerd zonder dat de grafiek in de weg zit. Bij x-t zit de snelheid in de steilheid, een stap abstracter. Het risico is dat die plaatjesgewoonte eerst beloond wordt en daarna bij x-t de klassieke fout geeft ("de lijn stijgt, dus hij versnelt"). Daarom blijft v-t niet lang alleen staan.

## Kleuren en markering

Geen rood segment zoals bij de inspiratiebron, maar de huisstijl:

- de grafieklijn in de gewone tekstkleur (past zich aan licht en donker thema aan);
- het gevraagde stuk in **amber** (`--accent-amber`), dikker getekend, met een lichte amber band achter dat tijdsinterval (`--amber-dim`), zodat het ook zonder kleurenzien opvalt;
- **cyaan** (`--accent`) voor het karretje, de tijdcursor en de bediening.

Rood blijft zo vrij voor fout-feedback; een rode markering zou anders lijken op "hier zit een fout".

## Taal per spoor

| | Onderbouw (leerjaar 2) | Bovenbouw (leerjaar 4) |
|---|---|---|
| Plaatsas | **afstand (m)** | **x (m)** |
| Snelheidsas | **snelheid (m/s)** | **v (m/s)** |
| Versnellingsas | niet | **a (m/s²)** |
| Uitleg en feedback | woorden, geen symbolen | symbolen mogen |
| Teruglopen | dalende lijn in het afstanddiagram; snelheid blijft positief | negatieve v, x kan onder nul |

Onderbouw: "afstand" betekent hier de afstand tot de start. Dat staat niet op de as (te lang), maar wordt zichtbaar gemaakt door de startvlag en de maatlijn bij het karretje, en één keer genoemd in de uitleg. Het karretje komt in de onderbouw nooit achter de start, dus afstand tot start en plaats vallen samen. Het snelheidsdiagram is in de onderbouw eigenlijk een snelheidsmeterdiagram: altijd positief, ook bij teruglopen. Dat past bij hoe gemiddelde snelheid in klas 2 behandeld wordt (terug op je oude plek is niet 0 km/h).

Bovenbouw: geen brugzin naar de onderbouwtaal. Plaats of positie en Δx worden in de bovenbouw gewoon als nieuw begrip geïntroduceerd.

## Het karretje

Na elk antwoord (goed of fout) speelt de beweging af:

- een baan boven de grafiek met een karretje dat de hele beweging rijdt;
- een tijdcursor die synchroon over de grafiek loopt; het gemarkeerde stuk licht op terwijl het karretje dat stuk rijdt;
- onderbouw: startvlag met een maatlijn tussen vlag en karretje, die meegroeit en krimpt met de hoogte van het afstanddiagram;
- bovenbouw: een liniaal langs de baan met 0 en een negatieve kant;
- knop "nog eens afspelen" en een langzaam-stand.

Vóór het antwoord speelt het karretje niet af, anders verklapt het het antwoord. In de uitleg wel, daar is het juist de kern.

## Bewegingsmodel (de motor)

Elke vraag komt uit één beweging: een reeks segmenten, elk met een soort (stilstand, constant, versnellen, vertragen) en een richting. Uit dat ene model volgen x(t), v(t) en a(t), en ook het karretje. Daardoor kloppen de drie diagrammen en de animatie altijd met elkaar, en is de koppelmodus later geen aparte bouw.

Aandachtspunten voor de generator:

- x is altijd continu. v is bij voorkeur continu; knikken in x-t (sprong in v) mogen in herkenvragen, zoals bij wetenschapsschool, maar niet in koppelvragen.
- Krommingen in x-t moeten duidelijk zichtbaar zijn: een versnellend stuk moet onmiskenbaar steiler worden. Liever overdreven dan subtiel.
- Onderbouw: x nooit onder nul, v nooit negatief.
- Het gemarkeerde segment wordt gekozen zodat de vier antwoorden ongeveer even vaak voorkomen en de contrastvragen echt contrast geven.
- Unittests voor de generator: continuïteit, tekens per spoor, consistentie tussen x, v en a.

## Oefenen: herkennen

Een hele beweging (meerdere segmenten) met één gemarkeerd segment. De leerling kiest een van de vier antwoorden. Score, streak en "x / y deze sessie" zoals significantie; score telt alleen de eerste poging. Levels los aan te vinken of via de oplopende reeks (na 3 goed een level omhoog), zoals formules-omschrijven en voorvoegsels.

### Levels onderbouw

| Level | Inhoud |
|---|---|
| 1 | alleen snelheidsdiagram |
| 2 | + afstanddiagram met rechte stukken (stilstand, constant, ook teruglopen), gemengd met snelheid |
| 3 | + krommen in het afstanddiagram (versnellen, vertragen) |
| 4 | alles gemengd, met veel contrastvragen |

### Levels bovenbouw

| Level | Inhoud |
|---|---|
| 1 | alleen v-t, alles vooruit |
| 2 | + x-t, recht en krom, gemengd met v-t |
| 3 | gemengd met contrastvragen |
| 4 | terugrijden: negatieve v, dalende x |
| 5 | a-t, alles vooruit (dit staat er expliciet bij) |
| 6 | a-t met achteruitrijden (doordenker) |

### a-t: twee bijzonderheden

1. **Bij a = 0 zijn stilstand en constante snelheid niet te onderscheiden.** Beide antwoorden worden goed gerekend en de feedback benoemt het: "aan de versnelling alleen zie je niet of hij stilstaat".
2. **Negatieve a is alleen vertragen als het voorwerp vooruit rijdt.** Rijdt het achteruit, dan versnelt het. Daarom komt a-t met achteruitrijden pas in level 6, als doordenker.

### Foutdiagnose

De tool kijkt of het foute antwoord goed was geweest in een ander diagram:

- **x-t gelezen als v-t** (bijvoorbeeld "versnellen" bij een rechte stijgende x-t lijn, of "constante snelheid" bij een horizontale x-t lijn): "Kijk naar de as: dit is een afstanddiagram. Een rechte lijn betekent dat er elke seconde evenveel afstand bij komt."
- **v-t gelezen als x-t** (bijvoorbeeld "stilstand" bij een horizontale v-t lijn boven nul): "Dit is een snelheidsdiagram. Horizontaal betekent dat de snelheid gelijk blijft, niet dat hij stilstaat."
- **a-t gelezen als v-t** (bovenbouw).
- **Richting verwisseld** (bovenbouw, level 4 en 6): dalende x-t of negatieve v als "vertragen" gelezen.
- **Anders:** korte algemene uitleg van wat het diagram laat zien.

Bij elke fout: het karretje speelt af, een knop "laat dezelfde lijn zien als [ander diagram]" toont het contrast, en een link naar het passende uitlegstuk.

## Oefenen: koppelen (bovenbouw)

Vaste tweede modus voor de bovenbouw, omdat dit een belangrijke vaardigheid is. Bij een gegeven diagram (met of zonder gemarkeerd segment) kies je het bijbehorende andere diagram uit drie of vier opties (x-t bij v-t, v-t bij a-t, enzovoort). De foute opties komen uit dezelfde motor, met typische fouten: het diagram als plaatje overgenomen, teken omgedraaid, stuk verwisseld. Tekenen in plaats van kiezen is een latere uitbreiding.

Volgorde van bouwen: eerst herkennen (beide sporen), dan koppelen.

## Uitleg

Per spoor een stappenuitleg met chips en vorige/volgende, zoals voorvoegsels. Eén stap per bewegingssoort: het karretje doet het voor, daaronder de diagrammen naast elkaar (onderbouw: afstand en snelheid; bovenbouw: x, v en a). Daarna een stap "zelfde vorm, ander diagram" als contrast. Bovenbouw heeft extra stappen voor richting en voor a-t (met de a = 0 dubbelzinnigheid). Elke stap is direct te openen, zodat de feedback ernaar kan linken.

## Mapstructuur

```
bewegingsgrafieken/
├── index.html            # Keuzepagina (hero): eerst onderbouw of bovenbouw, dan uitleg of oefenen
├── uitleg/index.html     # ?niveau=onderbouw|bovenbouw
├── oefenen/index.html    # Herkennen; ?niveau=…&level=…
├── koppelen/index.html   # Bovenbouw
└── js/
    ├── beweging.js       # Bewegingsmodel en vraaggenerator
    ├── grafiek.js        # SVG-weergave van x-t, v-t, a-t met gemarkeerd segment en tijdcursor
    └── karretje.js       # Baan, karretje, startvlag/maatlijn of liniaal, afspelen
```

Statische HTML-pagina's met gedeelde JS, zoals formules-omschrijven. De animatie is eenvoudig SVG met requestAnimationFrame; een Vite-project lijkt niet nodig. Toevoegen aan `build.sh`, tegel op de homepage, tabel in `workflow.md`, vindbaarheidskoppen en "Over deze tool"-blok.

## Nog te beslissen

- Koppelen voor de onderbouw (afstand bij snelheid), eventueel als extra level voor vwo. Uitgesteld tot de bovenbouwversie staat; via de gedeelde motor is het daarna relatief eenvoudig toe te voegen.

**Besloten 2026-10-10:** elke vraag toont een hele beweging (meerdere segmenten) met één gemarkeerd stuk erin, niet een los segment. Dat geeft context en een interessantere animatie. Het aantal segmenten kan per level oplopen.

## Buiten scope, later

- **Getallenmodus** (gebouwd 2026-10-10 als onderbouw level 5 en bovenbouw level 7, zie hieronder). Diagram met schaalverdeling en een concrete vraag erbij, uit dezelfde motor. Voorbeelden: "hoe ver is hij na 6 s?", "hoe lang staat hij stil?", "wat is de snelheid tussen t = 2 s en t = 6 s?", "hoe groot is de versnelling?", "hoeveel meter legt hij af in het gemarkeerde stuk?" (oppervlakte onder v-t, bovenbouw). Invoer normaliseren voor Chromebooks zoals in `workflow.md`.
- Koppelen door zelf te tekenen.

## Level met getallen (gebouwd 2026-10-10)

Onderbouw level 5 en bovenbouw level 7. De assen krijgen een schaalverdeling (één rasterlijn per seconde, een mooie stap op de verticale as) en de leerling typt een getal. Bewegingen hebben hele seconden en hele snelheden; versnellingen zijn veelvouden van 0,5. Waarden die je moet aflezen liggen altijd op een rasterlijn.

| Vraag | Onderbouw | Bovenbouw |
|---|---|---|
| Hoe ver van de start / welke plaats x na t s (x,t) | ja | ja |
| Hoe lang staat het karretje stil (x,t of v,t) | ja | ja |
| Snelheid in het gemarkeerde stuk (x,t): afstand : tijd, of v = Δx / Δt met teken | ja | ja |
| Snelheid aflezen na t s (v,t) | ja | ja, met teken |
| Versnelling a = Δv / Δt (v,t) | nee | ja |
| Afgelegde afstand als oppervlakte (v,t) | nee | ja |

Foutdiagnose: teken vergeten, niet gedeeld door de tijd, plaats in plaats van verschil, rechthoek in plaats van driehoek of trapezium. In de onderbouwteksten geen symbolen ("na 6 s", "van 4 s tot 8 s"). Uitlegstap "Rekenen met een diagram" in beide sporen.

**Aanvulling 2026-10-10:** rekenvragen krijgen een tweede kans (alleen de eerste poging telt), met een hint of foutdiagnose zonder het antwoord. ~~In de onderbouw is een snelheid altijd positief; een min bij teruglopen wordt goed gerekend.~~ Teruggedraaid: zie hieronder. De afstand mag ook met de gemiddelde snelheid (staat in de uitwerking en de uitleg). Laatste level is een eindmix: onderbouw level 6 (mix van 4 en 5), bovenbouw level 8 (mix van 4, 6 en 7).

**Besluit 2026-10-10: in de onderbouw rijdt het karretje alleen vooruit.** Een positieve snelheid bij terugrijden zou in de bovenbouw weer afgeleerd moeten worden. Bijkomend voordeel: "afstand" op de as is dan zowel afgelegde afstand als afstand tot de start. De uitlegstap Teruglopen is weg; teruglopen, richting en negatieve snelheid komen pas in de bovenbouw. Dit vervangt de eerdere afspraak dat het snelheidsdiagram in de onderbouw bij teruglopen positief blijft.

Verder: nieuw vraagtype in bovenbouw level 7, de afgelegde afstand over twee of drie stukken (oppervlaktes optellen, zonder richtingswissel). Eindmix bovenbouw (level 8) = levels 3, 4, 6 en 7.
