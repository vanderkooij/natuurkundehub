# Plan: Voorvoegsels en machten van 10

Tool voor het beheersen van SI-voorvoegsels, machten van 10 en wetenschappelijke notatie. Opzet zoals `formules-omschrijven`: keuzepagina met hero, een uitlegmodus en een oefenmodus. Single-file HTML per pagina, stijl en header volgens `workflow.md`. Vult het idee "Eenheden & SI-prefixen" uit `ideeen.md` in (dimensieanalyse blijft buiten scope).

## Mapstructuur

```
voorvoegsels/
├── index.html          # Keuzepagina (hero): Uitleg / Oefenen
├── uitleg/index.html   # Stapsgewijze uitleg, toolnaam "Machten van 10 en voorvoegsels"
└── oefenen/index.html  # Oefenen, toolnaam "Oefenen"
```

Toevoegen aan `build.sh`, tegel op homepage, tabel in `workflow.md`.

## Ontwerpeisen

- **Hufterproof.** Een leerling die de instructie gemist heeft moet zonder uitleg kunnen starten. Concreet: elke keuzekaart toont een voorbeeldvraag in plaats van een beschrijving ("5 km = … m"), elke level-toggle toont een voorbeeld op dat level, het invoerveld heeft een placeholder in het verwachte formaat, en de eenheid van het antwoord staat vast in de vraag zodat de leerling alleen een getal typt. Geen uitlegtekst die eerst gelezen moet worden.
- **Feedback boven meer types.** Foutdiagnose is onderdeel van de tool, niet een extra (zie hieronder).
- **Notatie:** overal `·10ⁿ` (zoals significantie), niet `×`. Decimale komma. Invoer accepteert dezelfde varianten als significantie (3,0e3, 3,0*10^3, 3,0·10³, punt als decimaalteken); micro mag als `u` getypt worden.
- **Significantie niet streng:** numeriek gelijk is goed (5000, 5·10³ en 5,0·10³ zijn allemaal correct). Alleen bij type A (wetenschappelijke notatie) geldt 1 ≤ a < 10.
- Score, streak en "x / y deze sessie" zoals significantie. Oplopende reeks (na 3 goed een level omhoog) zoals formules-omschrijven.

## Uitleg

Basis: het bestand `plannen/voorvoegsels-uitleg-basis.html` (stappen met chips, voortgangsbalk, vorige/volgende, pijltjestoetsen). Inhoud overnemen, stijl vervangen door hub-stijl (Space Grotesk, cyaan/amber, licht en donker thema, sticky header). Geen klas in de header.

Aanpassingen op de inhoud:
- `×` wordt `·`.
- Voorvoegseltabel toont ook hecto (h) en deca (da) als volledigheid, met de opmerking dat ze buiten hPa vrijwel niet voorkomen.
- De ladders (T G M k basis en basis m µ n p) worden **interactief**: klik twee treden aan, de tool toont de factor en de richting (×10⁶, komma 6 plekken naar rechts). Dit component wordt hergebruikt als hint in de oefenmodus.
- Reveal-oefeningen in de uitleg blijven (toon antwoord), maar verwijzen aan het eind door naar de oefenmodus.

## Oefenen

Twee onafhankelijke keuzes: **oefentype** (wat voor vraag) en **level** (hoe moeilijk). Daarnaast per type een richting-subknop.

### Oefentypen

| Soort | Vraagvorm | Voorbeeld | Richting-subknoppen |
|---|---|---|---|
| Omrekenen | van de ene eenheid naar de andere; de basiseenheid is ook een trede | 5 km = … m; 0,25 GHz = … kHz | beide / naar kleiner / naar groter |
| Wetenschappelijke notatie | getal ↔ wetenschappelijke notatie, zonder eenheid | 4500 → 4,5·10³ | beide / naar notatie / naar getal |
| Welke is het grootst? | multiple choice | 2500 mm, 2,5 m, 0,0025 km, "ze zijn allemaal gelijk" | geen |
| De voorvoegseltabel | naam, symbool en factor; één cel gegeven, de rest invullen | micro → µ → 10⁻⁶ | geen |

Standaard staat de richting op "beide" (willekeurig per vraag). De soorten zijn los aan te vinken, meerdere tegelijk mag.

**Samengevoegd op 2026-09-05.** In een eerdere versie stonden hier vijf typen A tot en met E, met "voorvoegsel ↔ tienmacht" (B) los van "voorvoegsel ↔ voorvoegsel" (C). Die twee rekenden hetzelfde uit, want de basiseenheid is gewoon een trede op de ladder, en het verschil was op het keuzescherm niet uit te leggen. Ze zijn samengevoegd tot **Omrekenen**. De notatiekant van het oude type B, dat 2·10⁻³ A hetzelfde is als 2 mA, is geen apart type meer maar een presentatievorm: vanaf level 2 staat het gegeven getal soms als tienmacht in de vraag. Zo blijft het verschil tussen de soorten in één oogopslag zichtbaar: met of zonder eenheid, vergelijken, of de tabel kennen.

### Levels

Het level bepaalt de set voorvoegsels, eenheden, getallen en sprongafstand. Combinaties eenheid-voorvoegsel komen uit een whitelist van wat echt voorkomt (ms wel, ks niet; kΩ wel, mΩ niet; hPa als enige hecto).

| Level | Voorvoegsels | Eenheden | Getallen | Sprong |
|---|---|---|---|---|
| 1 | k, m | m, s, g | 1 of heel getal | één stap van 1000 |
| 2 | + c, d (alleen bij m) | + Hz, W, N, J | decimaal | één stap; cm/mm naast km/m |
| 3 | + M, G, µ, n | + A, V, Pa (hPa), Ω | decimaal | twee stappen (km → mm, GHz → kHz) |
| 4 | + T, p | alle | decimaal | drie of meer stappen, beide richtingen |
| 5 | alle | alle | ook antwoord in wetenschappelijke notatie gevraagd | alles gemengd |

Bij wetenschappelijke notatie bepaalt het level de grootte van de exponent en of het getal decimalen heeft. Bij "Welke is het grootst?" en de voorvoegseltabel bepaalt het level welke voorvoegsels meedoen.

Levels zijn los aan te vinken (meerdere tegelijk) of via de oplopende reeks.

### Foutdiagnose

Bij een fout antwoord vergelijkt de tool het antwoord met bekende foutpatronen en geeft gerichte feedback in plaats van alleen "fout":

- **Verkeerde richting:** antwoord = juiste antwoord met tegengestelde exponent (10⁶ i.p.v. 10⁻⁶). "Je hebt de komma de verkeerde kant op geschoven."
- **Stap gemist of te veel:** antwoord wijkt een factor 1000 (of 10 bij c/d) af. "Je zit één stap van 1000 naast het antwoord."
- **1000 waar het 10 was** (en andersom), specifiek bij cm/dm/mm. "Tussen cm en mm zit een factor 10, niet 1000."
- **Notatiefout bij wetenschappelijke notatie:** getal klopt numeriek maar a ligt niet tussen 1 en 10. "Het getal klopt, maar in wetenschappelijke notatie moet het voorste getal tussen 1 en 10 liggen."
- **Anders:** algemene melding, nog een poging.

Na een tweede fout op dezelfde vraag verschijnt de ladder (het component uit de uitleg) met de gevraagde stappen gemarkeerd. "Toon antwoord" blijft beschikbaar. Score en streak tellen alleen de eerste poging, zoals significantie.

## Buiten scope, later

- Omrekenen ín een berekening (v = s/t met km en ms), de brug naar de vuistregel "eerst naar basiseenheid".
- De invoerparser wordt nu voor de tweede keer gebruikt (significantie en deze tool). Volgens `workflow.md` is dat het moment om hem naar een gedeeld bestand te trekken. Pas na oplevering overwegen, niet als eerste stap.
- Dimensieanalyse.

## Opdrachten voor Claude Code

Elke opdracht is zelfstandig uitvoerbaar en testbaar. Volgorde aanhouden.

**Lokaal testen tussendoor.** Jop test na elke opdracht zelf in de browser voordat de volgende opdracht start. Daarom sluit elke opdracht af met: (1) `./build.sh` draaien, (2) `netlify dev` starten of controleren dat die al draait, (3) de URL noemen waarop de gewijzigde pagina te bekijken is, en (4) in twee of drie regels aangeven wat er getest moet worden. Niet doorgaan naar de volgende opdracht zonder dat Jop akkoord heeft gegeven.

**Opdracht 1: skelet en keuzepagina.** *(af)* Map `voorvoegsels/` met keuzepagina (hero, twee kaarten: Uitleg en Oefenen, elk met een voorbeeldvraag als tekst), lege uitleg- en oefenpagina met correcte header, toolnaam en thema. Regel in `build.sh`, tegel op de homepage, tabel in `workflow.md` bijwerken. Stijl kopiëren van `formules-omschrijven/index.html`.

**Opdracht 2: uitleg.** *(af)* Inhoud van het basisbestand overzetten naar hub-stijl met de stapsgewijze navigatie, inclusief de inhoudelijke aanpassingen hierboven. De ladder als interactief component bouwen, zo geschreven dat hij in opdracht 5 gekopieerd kan worden naar de oefenpagina.

**Opdracht 3: oefenen, omrekenen en wetenschappelijke notatie, met levels.** *(af)* Keuze van soort met voorbeeldvraag, richting per soort, level-toggles met voorbeeld en oplopende reeks. Generators per soort en level met de whitelist eenheid-voorvoegsel. Invoerparser overnemen van `significantie/index.html`. Antwoordcontrole numeriek, bij wetenschappelijke notatie extra de 1 ≤ a < 10 eis. Score en streak. Feedback in deze opdracht nog alleen goed/fout plus "toon antwoord".

**Opdracht 4: "Welke is het grootst?" en de voorvoegseltabel.** Multiple choice en de tabeloefening, aangesloten op dezelfde levels, score en streak.

**Opdracht 5: foutdiagnose en ladder-hint.** *(af)* De foutpatronen uit de sectie Foutdiagnose implementeren als aparte functie die het gegeven en het juiste antwoord vergelijkt en een boodschap teruggeeft. Ladder-component uit de uitleg overnemen en tonen na een tweede fout, met de stappen van de vraag gemarkeerd.

**Opdracht 6: hufterproof-check.** *(af)* Tool doorlopen alsof je de instructie gemist hebt: is op elke pagina zonder lezen duidelijk wat je moet doen en in welk formaat? Placeholders, voorbeelden en foutmeldingen aanscherpen waar dat niet zo is. Mobiel controleren.
