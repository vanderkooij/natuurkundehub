# Plan: interactieve tool EM-spectrum

12 oktober 2026 · Jop. Vult het idee "EM-spectrum verkenner" uit `ideeen.md` in. Map: `em-spectrum/`.

## Doel en kernboodschap

Een interactieve spectrumverkenner die laat zien dat alle EM-straling hetzelfde is en alleen in golflengte verschilt. Ons oog is maar één heel kleine "antenne" op dat spectrum.

De tool vervangt het bladeren door de EM-tabel in Binas. Die loopt over meerdere pagina's en laat niet zien hoe klein het zichtbare deel is.

Drie dingen moeten in één oogopslag duidelijk worden:

1. Zichtbaar licht is een piepklein stukje van het spectrum.
2. Elk gebied vraagt een eigen detector of antenne, de straling zelf is hetzelfde.
3. Golflengte, frequentie en energie hangen vast aan elkaar.

## Doelgroep en gebruik

Bovenbouw havo en vwo. De docent bedient de tool zelf op het digibord, bij een klassikale uitleg.

- Geen verhaalmodus: de tool is een naslag- en demonstratie-instrument dat bij elk verhaal past.
- Snel heen en weer springen tussen plekken op het spectrum is belangrijker dan een vaste volgorde.
- Moet ook op afstand leesbaar zijn: grote getallen, duidelijke kleuren, weinig kleine tekst.

## Schermopbouw

Van boven naar beneden, alles op één scherm zonder scrollen.

1. **Spectrumbalk.** Radiogolven links, gamma rechts. Golflengte neemt af naar rechts, frequentie en energie nemen toe. Gebieden als zachte kleurvlakken met naam erboven.
2. **Snelknoppen.** Radio, microgolven, infrarood, zichtbaar, UV, röntgen, gamma, plus "heel spectrum". Een klik zoomt vloeiend naar dat gebied.
3. **Marker.** Een verschuifbare verticale lijn op de balk die de gekozen golflengte aangeeft.
4. **Golfweergave.** De golf bij de gekozen golflengte, met een schaalvergelijking ernaast (bijvoorbeeld "zo lang als een voetbalveld", "zo groot als een bacterie", "kleiner dan een atoom").
5. **Getallenpaneel.** Live waarden van λ, f en E (in J en eV), in Binas-notatie met machten van tien.
6. **Infopaneel.** Wisselt mee met het gebied: detector of antenne, bron, toepassing en eventueel één weetje.

## Zoomen en schaal

Doorlopend inzoomen is de kern van de tool. Je moet van het hele spectrum naar alleen de regenboog kunnen, en weer terug.

- **Bereik:** van 100 km (VLF voor onderzeeërs) tot 10⁻¹³ m (gamma), 18 ordes van grootte. *(2026-10-12 verlengd van 10 km naar 100 km, zodat VLF uit Binas erin past)*
- **Overzicht:** logaritmische as, anders is het zichtbare deel onzichtbaar.
- **Ingezoomd:** zodra het venster minder dan ongeveer één orde van grootte beslaat, gaat de as vloeiend over naar lineair. Dan zie je echt het verschil tussen 700 nm (rood) en 900 nm (infrarood), of 580 nm (geel) en 470 nm (blauw).
- **Schaalaanduiding:** de as toont altijd leesbare streepjes met eenheid (km, m, cm, mm, µm, nm, pm) en geeft aan of hij logaritmisch of lineair is.
- **"Hoe klein is zichtbaar?":** een knop die het hele spectrum lineair toont vanaf het zichtbare gebied. Het zichtbare deel krimpt dan tot een streepje. Dit is het Binas-moment.
- **Golf op schaal:** in overzicht is de getekende golf schematisch (golflengte neemt af naar rechts, zoals in het filmpje). Ingezoomd tekent de tool de golf op de echte schaal van de as.

### Overal inzoomen, met toepassingen op de as

Inzoomen werkt op elke plek van het spectrum, niet alleen bij de regenboog. Bekende toepassingen staan als labels op de as en verschijnen pas als je ver genoeg ingezoomd bent, zodat het overzicht rustig blijft.

- **Radio:** onderzeeërs (VLF, 3 tot 30 kHz), lange golf, AM (rond 1 MHz), FM (88 tot 108 MHz), luchtvaartradio, DAB+ (rond 200 MHz), LOFAR bij Exloo (10 tot 240 MHz), militaire communicatie (225 tot 400 MHz), C2000.
- **Microgolven:** mobiel (4G/5G, 0,7 tot 3,5 GHz), GPS (1575 MHz), radiotelescoop Westerbork (21 cm), Bluetooth en wifi (2,4 GHz), magnetron (2,45 GHz), wifi (5 GHz), radar, satelliet-tv, kosmische achtergrondstraling.
- **Infrarood:** afstandsbediening (rond 940 nm), warmtestraling van het lichaam (rond 10 µm), glasvezel (1550 nm).
- **Zichtbaar:** natriumlamp (589 nm), rode en groene laser.
- **UV, röntgen, gamma:** UV-A en UV-B, tandartsfoto, CT, PET-scan.

Daarnaast de **deelgebieden** als zachte banden onder de gebiedsnamen, ook pas zichtbaar bij genoeg inzoomen:

- **Infrarood:** nabij (0,75 tot 3 µm), midden (3 tot 50 µm) en ver infrarood (50 µm tot 1 mm). Eventueel ook de ISO-namen IR-A, IR-B en IR-C.
- **Ultraviolet:** UV-A (315 tot 400 nm), UV-B (280 tot 315 nm), UV-C (100 tot 280 nm) en vacuüm-UV daaronder. UV-C bereikt de grond niet (koppelt aan de laag doorlaatbaarheid van de atmosfeer).
- **Röntgen:** zachte en harde röntgenstraling (grens rond 0,1 nm).
- **Radio:** de bandnamen LF, MF, HF, VHF, UHF alleen als ze in het verhaal passen; liever de toepassingen zelf.

Let op: Bluetooth, wifi en mobiel vallen met de gangbare grens (1 m, 300 MHz) onder microgolven, niet onder radio. De tool toont dat zo; het is een mooi gespreksmoment omdat leerlingen het "radiogolven" noemen.

### Kritische ronde 2026-10-12 *(gebouwd)*

- Bovenste rij: alleen de gebieden in spectrumvolgorde plus *Hoe klein is zichtbaar?* (Jop: geen twee rijen, de volgorde moet het spectrum volgen). Op schermen tot 1600 px vallen de sneltoetsnummers weg zodat alles past.
- Bedieningsbalk onderin over de volle breedte: links een schakelaar per laag met ◂ ▸ om in vaste volgorde op te bouwen (vervangt het menu Weergave), rechts invoerveld, − +, volledig scherm (f) en ? (overzicht van de bediening).
- Nieuwe lagen uit het plan: grens ioniserende straling (stippellijn bij 10 eV, ongeveer 124 nm), doorlaatbaarheid van de atmosfeer (strook bovenin de balk, indicatief) en zonlicht (Planck-kromme 5800 K, piek rond 500 nm).
- *Hoe klein is zichtbaar?* in eigen tempo: tik op de balk, spatie of → is de volgende stap, ← de vorige; vegen verlaat de reeks.
- Startsituatie via de link: `?l=589nm&gebied=vis&lagen=frequentie,energie` (of `lagen=alles`).
- Tekst groeit met mate mee op grote schermen (balk tot 26 px, infopaneel tot 20 px).
- Na vragen van Jop (2026-10-12): de schematische golf in de balk hoort bij de basis (de laag Golf is nu alleen het golfvenster); de laag Energie geeft ook een energie-as (eV, van peV tot MeV, met kaartje van de marker); de atmosfeerstrook zegt erbij hoe je hem leest (licht = bereikt de grond, donker = tegengehouden); zonlicht is de kromme van 5800 K buiten de atmosfeer, en met Atmosfeer aan staat zonlicht op aarde er als vlak onder (zonkromme maal doorlaatbaarheid).
- Weetjes per gebied geschrapt (2026-10-13): voelden gemaakt en hoorden niet bij de essentie van de tool. Ook geen vraag voor de klas als vervanging. Het infopaneel per gebied toont golflengte, detector of antenne, bron, toepassing en de energie per foton. De kolom Weetje in de tabel hieronder is daarmee vervallen; het verschil tussen röntgen en gamma (bron: elektronen of atoomkern) en de röntgenfoto (botten wit) staan nu bij Bron en Toepassing. De energieregel zegt hoe ver een foton van de grens van ongeveer 10 eV zit ("ruim honderdduizend keer zoveel als nodig", "ruim een miljoen keer te weinig").
- Voor later: twee markers vergelijken (hoeveel keer meer energie per foton).

### Weergave: eenvoudig beginnen en opbouwen *(wens van Jop, gebouwd 2026-10-12; menu later vervangen door de schakelaarbalk, zie hierboven)*

Bij de eerste keer laten zien geen overload. Knop **Weergave** (toets w) met twee voorinstellingen, **Eenvoudig** en **Alles aan**, en schakelaars per laag: frequentie (as en vakje), energie (vakjes J en eV), golf (golf in de balk en golfvenster), toepassingen, deelgebieden, infopaneel. Eenvoudig is de standaard bij de eerste keer: alleen de balk met gebiedsnamen, de golflengte-as, de marker en λ. De keuze wordt onthouden. Nieuwe onderdelen krijgen voortaan ook een eigen schakelaar.

### Optionele lagen (aan en uit te zetten)

- Zonnespectrum: stralingskromme van de zon (piek rond 500 nm) over de as.
- Doorlaatbaarheid van de atmosfeer: welke gebieden de grond bereiken (zichtbaar en radio wel, UV-C en röntgen niet).
- Grens ioniserende straling.

## Inhoud per gebied

Per gebied toont het infopaneel kort wat erbij hoort. Grenzen zijn indicatief; de tool tekent ze als zachte overgangen.

| Gebied | Golflengte (indicatief) | Detector of antenne | Bron en toepassing | Weetje |
|---|---|---|---|---|
| Radio | > 1 m | Antenne in de orde van de golflengte (halve golflengte) | Zenders, AM, FM, DAB+, radiosterrenkunde | Antennelengte schaalt mee met de marker |
| Microgolven | 1 mm tot 1 m | Schotel, kleine antenne | Magnetron (12 cm), wifi, Bluetooth, mobiel, radar | Rooster in de magnetrondeur: gaatjes van enkele mm, golf van 12 cm past er niet door |
| Infrarood | 750 nm tot 1 mm | Thermometer, warmtecamera | Warme voorwerpen, afstandsbediening | Herschel: thermometer naast het rood loopt verder op |
| Zichtbaar | 380 tot 750 nm | Oog: kegeltjes voor rood, groen en blauw | Zon, lampen | Kleur volgt uit de golflengte |
| Ultraviolet | 10 tot 380 nm | Huid, fluorescerend materiaal | Zon, blacklight | Genoeg energie om huidcellen te beschadigen |
| Röntgen | 0,01 tot 10 nm | Fotografische plaat, detector | Röntgenbuis, medische beelden | Gaat door zacht weefsel, niet door bot |
| Gamma | < 0,01 nm | Geigerteller, scintillator | Radioactief verval, kosmos | Ioniserend, koppeling met straling en radioactiviteit |

Bij zichtbaar licht krijgt de balk de echte spectrumkleuren (golflengte omgezet naar RGB).

## Natuurkunde en misvattingen

De getallen volgen uit twee formules, met de waarden van c en h uit Binas:

c = f · λ   en   E = h · f = h · c / λ

Aandachtspunten in teksten en weetjes:

- **Magnetron:** geen "resonantie van water". 2,45 GHz zit niet op een resonantiefrequentie van water. Watermoleculen (dipolen) worden heen en weer gedraaid en geven zo warmte af. De frequentie is gekozen vanwege de indringdiepte en de vrije frequentieband.
- **Grenzen:** geen harde lijnen tussen gebieden; IR en microgolven, UV en röntgen overlappen.
- **Golf op schaal:** in het overzicht duidelijk aangeven dat de getekende golf schematisch is.
- **Ioniserend:** de grens (ongeveer bij UV) markeren, zodat de koppeling met energie per foton zichtbaar wordt.

## Bediening en techniek

### Bediening (digibord eerst)

- Grote knoppen, geschikt voor aanraken.
- Zoomen met scrollwiel, knijpen of + en − knoppen.
- Marker slepen, of met pijltjestoetsen in kleine stappen verschuiven.
- Sneltoetsen 1 tot en met 7 voor de gebieden, 0 voor het hele spectrum.
- Invoerveld om een golflengte of frequentie te typen, zodat je direct naar bijvoorbeeld 2,45 GHz of 589 nm springt.

### Techniek

- Canvas en JavaScript, geen externe afhankelijkheden, werkt offline. Eén HTML-bestand is geen harde eis meer (Jop, 2026-10-12): losse bestanden of een build mogen, bijvoorbeeld voor de eigen tekeningen.
- Donkere achtergrond met raster, zoals in het filmpje; goed zichtbaar op een beamer.
- Publiceren op natuurkundehub.nl.
- Getallen in Nederlandse notatie (komma als decimaalteken).

## Buiten scope

- **Verhaalmodus.** De tool is vrij te verkennen; het verhaal vertelt de docent.
- **Elektronenmicroscoop.** Elektronen zijn geen EM-straling (materiegolf, de Broglie) en dat ondergraaft de kernboodschap. Eventueel later als losse tool.
- **Magnetronrooster als apart onderdeel.** Alleen als weetje in het infopaneel bij microgolven.
- **Intensiteit.** Hoort bij het verhaal over licht meten, maar voegt in deze tool niets toe aan het spectrum.

## Bouwvolgorde

Elke stap levert iets werkends op dat je kunt testen op het digibord.

1. [x] Spectrumbalk met logaritmische as, gebieden en labels, radio links. *(gebouwd 2026-10-12)*
2. [x] Marker met live λ, f en E. *(gebouwd 2026-10-12: slepen of tikken op balk en assen, pijltjes met Shift voor grote stappen, waarden op drie significante cijfers)*
3. [x] Doorlopend zoomen met overgang van logaritmisch naar lineair, plus snelknoppen. *(gebouwd 2026-10-12: boven 1,5 decade logaritmisch, onder 0,7 decade lineair, daartussen vloeiend; wiel, knijpen, + en −, schuiven door op de assen te slepen; snelknoppen vliegen naar het gebied en zetten de marker op een typische waarde als hij buiten beeld valt; sneltoetsen 0 t/m 7 en + − zitten er al in)*
4. [x] Spectrumkleuren in het zichtbare gebied en de knop "hoe klein is zichtbaar?". *(gebouwd 2026-10-12: vliegt eerst naar de regenboog; daarna blijft de rechterrand op 350 nm staan en zoomt de as lineair uit, met elke stap precies tot het volgende voorwerp (bacterie, bloedcel, haar, zandkorrel, mier, euro, telefoon, deur, bus, voetbalveld, Eiffeltoren, Burj Khalifa, vlieghoogte, grens van de ruimte; sinds 2026-10-12, eerst per factor 10, maar dan sprong de tekst tussen voorwerpen); bijschrift met het percentage van de balk dat zichtbaar licht nog is, tot 3,7·10⁻⁹ %; voorwerpen op hun eigen maat (bacterie, haar, zandkorrel, euro, deur, bus, voetbalveld, Eiffeltoren, Burj Khalifa, vlieghoogte) schuiven links het beeld in en glijden naar rechts weg; in de balk "de balk is nu zo lang als …" en "op een balk van 1,5 m is zichtbaar licht … : ongeveer een zandkorrel", aan het eind ongeveer een atoom; zelf zoomen, schuiven of een andere knop zet de as terug; sneltoets 9)*
4b. [x] Toepassingen en deelgebieden op de as (zie *Overal inzoomen*), met een labelregel die per zoomniveau bepaalt wat er past. *(toegevoegd en gebouwd 2026-10-12: 26 toepassingen in de balk, een bereik als lichte kolom en één waarde als stippellijn, verschijnen onder 4,5 decade; tikken op een naam zet de marker erop; deelgebieden (ver/midden/nabij IR, de zes kleuren, UV-A/B/C, extreem UV, zachte en harde röntgen) als strook onderin de balk onder 6 decade; boven de balk alleen de gebiedsnamen)*
5. [x] Golfweergave: schematisch in overzicht, op schaal ingezoomd, met schaalvergelijking. *(gebouwd 2026-10-12: in het overzicht loopt een schematische golf door de balk met een golflengte die naar rechts kleiner wordt, met "golf schematisch, niet op schaal"; het golfvenster onderin toont de golf bij de marker met een liniaal; sinds 2026-10-12 groeit de getekende golflengte mee (gelijkmatig in machten van tien, van minder dan één golf bij 100 km tot een dicht pakket bij gamma), op verzoek van Jop, λ aangegeven tussen twee toppen, en "λ ongeveer een deur" of "kleiner dan een atoom"; de golf loopt langzaam, uit bij minder beweging. Op schaal op de as zelf werkt niet ingezoomd (bij de regenboog beslaat de as 400 nm, één golf is al 589 nm), daarom de liniaal in het venster)*
6. [x] Infopaneel per gebied met detector, bron, toepassing en weetje. *(gebouwd 2026-10-12: kolom rechts naast balk en getallenpaneel, knop Info en toets i; standaard aan op een breed scherm, op smal scherm (≤ 1000 px) uit en dan over de balk; twee regels rekenen mee met de marker: de lengte van een halve-golfantenne (λ/2, bij radio en microgolven) en of één foton ioniserend is (grens ongeveer 10 eV, energie in eV, keV of MeV); teksten in `INFO` bovenin het script)*
6b. [x] **Infokaart per toepassing** *(gebouwd 2026-10-12: alle 32 apparaten, tekst "Waarom deze golflengte?" in `UITLEG` bovenin het script; tikken opent de kaart (en zo nodig het infopaneel), de toepassing licht oranje op in de balk, de marker staat exact op de waarde; elke andere verplaatsing van de marker of de knop ← terug geeft weer het gebied)* *(wens van Jop, 2026-10-12)*. Tikken op een toepassing (FM-radio, magnetron, tandartsfoto …) zet de marker erop én laat het infopaneel wisselen van het gebied naar dat apparaat (met een knop terug naar het gebied). De kaart gaat vooral over het verband tussen de toepassing en de golflengte of energie: waarom juist deze golflengte (antennelengte bij FM, indringdiepte bij de magnetron, gaatjes in de deur van 12 cm-golven, energie per foton bij röntgen en UV-C, ioniserend of niet). Met het eigen plaatje, λ, f en E van die toepassing, en één of twee zinnen uitleg. Inhoud per toepassing in de lijst `TOEPASSINGEN` bovenin het script.
7. [x] Bediening afmaken: sneltoetsen, invoerveld, aanraakbediening. *(gebouwd 2026-10-12: invoerveld in de werkbalk (toets /) leest golflengte, frequentie of energie, met de Chromebook-normalisatie uit workflow.md, in `invoer.js` met tests (`npm run test:em`); de marker gaat precies naar de getypte waarde en het beeld vliegt naar het gebied. Aanraken: de marker zelf slepen, elders op de balk of de assen vegen met doorglijden, tikken zet de marker, twee vingers knijpen. Of knijpen werkt hangt af van het digibord: test bij stap 8)*
8. [ ] Testen op het digibord in het lokaal: leesbaarheid op afstand en bediening met de vinger.

## Plaatjes

Toepassingen en de voorwerpen bij *Hoe klein is zichtbaar?* hebben een plaatje: **eigen tekeningen, geen emoji** (afgesproken met Jop op 2026-10-12). Stijl B, gekozen uit drie: witte ronde lijn (2,4 op 48 px) met een kleurvlak. Bij apparaten is het vlak de kleur van het gebied (bij zichtbaar licht de echte kleur), bij voorwerpen één neutrale grijsblauwe kleur. Alle 45 tekeningen staan in `em-spectrum/plaatjes.js`, één regel per tekening; in de balk staat er een donker vlakje achter, zodat het kleurvlak niet wegvalt tegen de balk.

## Open vragen

- [ ] Detector als tekst, of als klein plaatje (antenne die meegroeit met de golflengte, oog, thermometer)?
- [ ] Schaalvergelijkingen: welke voorwerpen spreken leerlingen het meest aan?

## Uitvoering

- **Hub-conventies.** Wel de gewone header, thema-toggle en `.tool-name` zoals elke tool (`workflow.md`). Sinds 2026-10-12 volgt het podium het thema van de site (op verzoek van Jop): licht podium met donkere tekst, of donker zoals voor de beamer. De balk zelf houdt in beide de kleuren van de gebieden (in licht iets voller), zodat witte tekst erop leesbaar blijft; plaatjes buiten de balk staan op een donker tegeltje. Kleuren in CSS als `--s-…`-variabelen, op het canvas in `KLEUREN.licht` en `KLEUREN.donker`.
- **Nog niet live.** De map staat nog niet in `build.sh` en heeft nog geen tegel op de homepage, zodat een halve tool niet op de site komt. Dat gebeurt na stap 7, samen met de vindbaarheidskoppen en het blok *Over deze tool*.
- **Bediening op de balk.** Eén vinger op de balk verplaatst de marker, één vinger op de assen schuift het spectrum, twee vingers knijpen. Staat de marker buiten beeld, dan wijst een kaartje aan de rand ernaar.
- **Kijkvenster.** Alles tekent vanuit één venster `view = {lo, hi}` in log₁₀(λ / m), zodat zoomen (stap 3) alleen dat venster hoeft te veranderen.
