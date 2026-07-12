import type { SvRow } from "./engine";

export interface LearnExercise {
  title: string;
  context: string;
  uitleg: string;
  opdracht: string;
  hints: { label: string; text: string }[];
  startSv: SvRow[];
  startModel: string;
  startIter: number;
  solSv: SvRow[];
  solModel: string;
  solIter: number;
}

// Geport (programmatisch geextraheerd) uit de vanilla modelleren/index.html.
export const LEARN_EXERCISES: LearnExercise[] = [
  {
    "title": "Je eerste model",
    "context": "Welkom bij het numeriek modelleren. In deze eerste oefening bouw je je eerste model: een object dat met constante snelheid beweegt.",
    "uitleg": "<strong>Wat is modelleren?</strong><br>Bij modelleren deel je een berekening op in kleine stapjes. Bij elke stap worden grootheden zoals positie en snelheid bijgewerkt. Door dit heel vaak te herhalen kun je complexe bewegingen en processen nabootsen die je niet met één formule kunt uitrekenen. Dit noemen we itereren.<br><br><strong>Waarom modelleren?</strong><br>Veel situaties in de natuur zijn te ingewikkeld voor een exacte formule, zoals luchtweerstand, botsingen of planetenbanen. Met een model kun je die situaties toch doorrekenen en grafisch maken. En je kunt makkelijk dingen aanpassen en kijken wat er verandert.<br><br><strong>Hoe werkt het?</strong><br>Elke modelregel beschrijft hoe één grootheid verandert per tijdstap dt:<br><code>x = x + v*dt</code><br>Dit heet de Euler-methode. Je kiest startwaarden en laat de computer de rest berekenen, stap voor stap.<br><br>Een modelregel heeft altijd de vorm: <code>variabele = nieuwe waarde</code>. Het =-teken betekent hier niet \"is gelijk aan\" maar \"wordt de nieuwe waarde van\".",
    "opdracht": "Voer de twee modelregels in: één voor x en één voor t. Klik daarna op de knop <strong>▶ Simuleer</strong>. Zet t op de x-as en x op de y-as. Wat voor grafiek krijg je?<div class=\"learn-tip\">→ De modelregels typ je in het tekstvlak \"Modelregels\".</div><div class=\"learn-tip\">→ Na het simuleren verschijnt de grafiek eronder. Boven de grafiek staan twee dropdowns voor de x-as en y-as.</div>",
    "hints": [
      {
        "label": "Hint: welke regels?",
        "text": "Je hebt twee regels nodig. De nieuwe positie hangt af van de oude positie, de snelheid en dt."
      },
      {
        "label": "Hint: de formules",
        "text": "<code>x = x + v*dt</code> berekent de nieuwe positie. Voeg daarna <code>t = t + dt</code> toe zodat de tijd bijgehouden wordt."
      }
    ],
    "startSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "1",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "20",
        "unit": "m/s"
      }
    ],
    "startModel": "",
    "startIter": 100,
    "solSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "1",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "20",
        "unit": "m/s"
      }
    ],
    "solModel": "x = x + v*dt\nt = t + dt",
    "solIter": 100
  },
  {
    "title": "Van tabel naar grafiek",
    "context": "Na het simuleren berekent de computer honderden waarden. Je kunt ze lezen als tabel of bekijken als grafiek.",
    "uitleg": "Na het simuleren berekent de computer honderden waarden. Al die getallen staan in de tabel. Een tabel geeft exacte waarden maar je ziet geen patroon. Een grafiek laat het patroon zien maar je verliest precisie. Beide hebben hun waarde: gebruik de tabel voor exacte aflezing en de grafiek voor begrip.",
    "opdracht": "Simuleer en open de tabel. Lees x en v af op t = 1 s, t = 2 s en t = 3 s. Sluit de tabel en maak een grafiek van x tegen t en een tweede grafiek van v tegen t. Zoom in op de eerste 2 seconden. Gebruik de pijltjestoetsen om precies bij t = 1,5 s uit te komen. Controleer de grafiekwaarde met de tabel.<div class=\"learn-tip\">→ Open de tabel via de knop \"Toon tabel\" onder de grafieken.</div><div class=\"learn-tip\">→ Kies bij \"Indeling\" de knop \"▮▮ 2 naast\" voor een tweede grafiek. Zet daar v op de y-as.</div><div class=\"learn-tip\">→ Zoom in door met het muiswiel over de grafiek te scrollen. Klik op een punt om het te selecteren, gebruik daarna ← → om door datapunten te navigeren.</div>",
    "hints": [
      {
        "label": "Hint: tabel lezen",
        "text": "Elke rij in de tabel is één iteratie. Bij dt = 0,1 s is t = 1 s na 10 rijen."
      },
      {
        "label": "Hint: verwachte waarden",
        "text": "v = a·t = 9,8 m/s² × t. Op t = 1 s: v ≈ 9,8 m/s, x ≈ 4,9 m. Op t = 2 s: v ≈ 19,6 m/s, x ≈ 19,6 m."
      }
    ],
    "startSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.1",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "0",
        "unit": "m/s"
      },
      {
        "name": "a",
        "value": "9.8",
        "unit": "m/s²"
      }
    ],
    "startModel": "v = v + a*dt\nx = x + v*dt\nt = t + dt",
    "startIter": 100,
    "solSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.1",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "0",
        "unit": "m/s"
      },
      {
        "name": "a",
        "value": "9.8",
        "unit": "m/s²"
      }
    ],
    "solModel": "v = v + a*dt\nx = x + v*dt\nt = t + dt",
    "solIter": 100
  },
  {
    "title": "Versnelling",
    "context": "Tot nu toe was de snelheid constant. Maar wat als er een kracht werkt? Dan verandert de snelheid elke tijdstap.",
    "uitleg": "Tot nu toe was de snelheid constant. Maar wat als er een kracht werkt op een object? Volgens Newton geldt F = m·a, dus a = F/m. Bij vrije val is de enige kracht de zwaartekracht: F = m·g. Dus a = g = 9,8 m/s².<br><br>De snelheid verandert elke tijdstap: <code>v = v + a*dt</code>. En de positie verandert op basis van de nieuwe snelheid: <code>x = x + v*dt</code>.<br><br>Let op de volgorde: bereken eerst de nieuwe snelheid, dan pas de nieuwe positie. Anders gebruik je een verouderde snelheidswaarde.",
    "opdracht": "Voer de drie modelregels in: één voor v, één voor x en één voor t. Plot x tegen t. Wat voor vorm heeft de grafiek? Is dat wat je verwacht bij versnelde beweging?",
    "hints": [
      {
        "label": "Hint: welke regels?",
        "text": "Je hebt drie regels nodig: één voor v (met de versnelling), één voor x (met de snelheid), één voor t."
      },
      {
        "label": "Hint: volgorde",
        "text": "Bereken eerst v met de versnelling, dan pas x met de nieuwe v. De volgorde is belangrijk."
      },
      {
        "label": "Hint: richting",
        "text": "De versnelling bij vrije val is 9,8 m/s² naar beneden. Als omlaag positief is, is a positief."
      }
    ],
    "startSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.1",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "0",
        "unit": "m/s"
      },
      {
        "name": "a",
        "value": "9.8",
        "unit": "m/s²"
      }
    ],
    "startModel": "",
    "startIter": 100,
    "solSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.1",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "0",
        "unit": "m/s"
      },
      {
        "name": "a",
        "value": "9.8",
        "unit": "m/s²"
      }
    ],
    "solModel": "v = v + a*dt\nx = x + v*dt\nt = t + dt",
    "solIter": 100
  },
  {
    "title": "Omhoog gooien",
    "context": "Nu gooien we een bal omhoog. We kiezen een richtingsafspraak en passen de startwaarden zelf in.",
    "uitleg": "In oefening 3 viel de bal naar beneden. Nu gooien we de bal omhoog. We moeten afspreken welke richting positief is.<br><br>Afspraak: omhoog is positief. Dan is de beginsnelheid v = +20 m/s en de versnelling a = -9,8 m/s² want de zwaartekracht werkt naar beneden.<br><br>De modelregels zijn hetzelfde als bij oefening 3 maar nu met een negatieve versnelling. Voeg ook de startwaarden zelf toe: wat is de beginpositie? Wat is de beginsnelheid? Vergeet de eenheden niet.",
    "opdracht": "Voeg de ontbrekende startwaarden toe (x, v en a met de juiste waarden). Vul de modelregels in. Let op het teken van a. Plot x tegen t én v tegen t. Op welk tijdstip is de bal op zijn hoogste punt? Hoe hoog komt de bal? Wanneer raakt hij de grond?<div class=\"learn-tip\">→ Op het hoogste punt is v = 0. Gebruik de pijltjestoetsen op de v-t grafiek om het exacte tijdstip te vinden.</div>",
    "hints": [
      {
        "label": "Hint: modelregels",
        "text": "De modelregels zijn identiek aan oefening 3. Alleen de startwaarden zijn anders."
      },
      {
        "label": "Hint: hoogste punt",
        "text": "Op het hoogste punt is v = 0. Gebruik de pijltjestoetsen op de v-t grafiek om het exacte tijdstip te vinden."
      },
      {
        "label": "Hint: stopconditie",
        "text": "Voeg toe: <code>als x &lt; 0 dan STOP</code> zodat de simulatie stopt als de bal de grond raakt."
      }
    ],
    "startSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.1",
        "unit": "s"
      }
    ],
    "startModel": "t = t + dt",
    "startIter": 200,
    "solSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.1",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "20",
        "unit": "m/s"
      },
      {
        "name": "a",
        "value": "-9.8",
        "unit": "m/s²"
      }
    ],
    "solModel": "v = v + a*dt\nx = x + v*dt\nt = t + dt",
    "solIter": 200
  },
  {
    "title": "Hoe nauwkeurig is je model?",
    "context": "De numerieke methode maakt een fout bij elke iteratie. Hoe kleiner dt, hoe nauwkeuriger, maar hoe meer stappen je nodig hebt.",
    "uitleg": "De numerieke methode maakt een fout bij elke iteratie. Hoe kleiner dt, hoe kleiner de fout per stap maar hoe meer stappen je nodig hebt.<br><br>Belangrijk: als je dt kleiner maakt moet je ook het aantal iteraties verhogen om dezelfde totale tijd te simuleren. Bij dt = 1 s en 100 iteraties simuleer je 100 seconden. Bij dt = 0,1 s heb je 1000 iteraties nodig voor dezelfde 100 seconden.<br><br>Bij constante snelheid maakt dt geen verschil want de verandering per stap is altijd exact. Bij versnelling stapelen kleine fouten op en zie je bij grote dt duidelijk dat het model afwijkt.",
    "opdracht": "Voeg de ontbrekende startwaarden toe (x = 0 m, v = 0 m/s, a = 9,8 m/s²). Simuleer met dt = 1 s (stel iteraties in voor 10 s) . Verander dt naar 0,1 s en pas het aantal iteraties aan, en simuleer opnieuw. Doe dit nogmaals met dt = 0,01 s. Vergelijk x na t = 10 s met de exacte formule x = ½·a·t² = 490 m.<div class=\"learn-tip\">→ Elke simulatie wordt automatisch een genummerde run in de lijst onder de grafiek, zodat je de runs naast elkaar kunt vergelijken.</div>",
    "hints": [
      {
        "label": "Hint: iteraties aanpassen",
        "text": "Als je dt 10 keer kleiner maakt moet je het aantal iteraties 10 keer groter maken. Voor 10 s bij dt = 0,1 s heb je 100 iteraties nodig."
      },
      {
        "label": "Hint: exacte uitkomst",
        "text": "De exacte uitkomst na 10 s is x = ½ × 9,8 × 100 = 490 m. Hoe groot is de afwijking bij dt = 1 s?"
      }
    ],
    "startSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "1",
        "unit": "s"
      }
    ],
    "startModel": "v = v + a*dt\nx = x + v*dt\nt = t + dt",
    "startIter": 10,
    "solSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.01",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "0",
        "unit": "m/s"
      },
      {
        "name": "a",
        "value": "9.8",
        "unit": "m/s²"
      }
    ],
    "solModel": "v = v + a*dt\nx = x + v*dt\nt = t + dt",
    "solIter": 1000
  },
  {
    "title": "Een kracht die verandert",
    "context": "Luchtweerstand is niet constant: F_w = k·v². Hoe sneller je valt, hoe groter de rem. Er is een eindsnelheid waarbij de krachten in evenwicht zijn.",
    "uitleg": "Tot nu toe was de versnelling constant. Bij een vallend object door lucht is er luchtweerstand. Deze kracht is niet constant maar hangt af van de snelheid:<br><code>Fw = k*v*v</code><br><br>Hoe sneller je beweegt, hoe groter de tegenwerkende kracht. De resulterende kracht is:<br><code>Fres = m*g - Fw</code><br><br>De versnelling is dan: <code>a = Fres/m</code><br><br>Naarmate de snelheid toeneemt neemt Fw toe en neemt Fres af. Er is een punt waarop Fz = Fw en de resulterende kracht nul is. Op dat moment is a = 0 en bereik je de eindsnelheid.<br><br>Let op: Fw, Fres en a zijn tussenvariabelen. Je berekent ze in de modelregels maar ze staan niet in de startwaarden.",
    "opdracht": "Voeg alle startwaarden toe (m = 1 kg, k = 0,1 kg/m, g = 9,8 m/s², v = 0 m/s, x = 0 m, dt = 0,1 s). Voeg daarna de ontbrekende modelregels toe voor Fw, Fres en a, vóór de bestaande regels voor v, x en t. Wat is de eindsnelheid? Controleer met de formule m·g = k·v², los op naar v.",
    "hints": [
      {
        "label": "Hint: drie regels toevoegen",
        "text": "Je hebt drie extra regels nodig vóór de bestaande: Fw, Fres en a."
      },
      {
        "label": "Hint: Fres richting",
        "text": "Fw werkt tegen de beweging in (naar boven), dus Fres = m*g - Fw."
      },
      {
        "label": "Hint: eindsnelheid",
        "text": "De eindsnelheid bereik je als a = 0. Dan geldt m·g = k·v², dus v = √(m·g/k) = √(1×9,8/0,1) ≈ 9,9 m/s."
      }
    ],
    "startSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      }
    ],
    "startModel": "v = v + a*dt\nx = x + v*dt\nt = t + dt",
    "startIter": 500,
    "solSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.1",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "0",
        "unit": "m/s"
      },
      {
        "name": "m",
        "value": "1",
        "unit": "kg"
      },
      {
        "name": "k",
        "value": "0.1",
        "unit": "kg/m"
      },
      {
        "name": "g",
        "value": "9.8",
        "unit": "m/s²"
      }
    ],
    "solModel": "Fw = k*v*v\nFres = m*g - Fw\na = Fres/m\nv = v + a*dt\nx = x + v*dt\nt = t + dt",
    "solIter": 500
  },
  {
    "title": "De raaklijn",
    "context": "De helling van de raaklijn aan een grafiek geeft de momentane veranderingssnelheid: de afgeleide.",
    "uitleg": "De helling van de raaklijn aan een grafiek geeft de momentane veranderingssnelheid van de y-variabele ten opzichte van de x-variabele. Dit is de afgeleide.<br><br>Voorbeelden:<br>Helling van x-t grafiek = snelheid (dx/dt = v)<br>Helling van v-t grafiek = versnelling (dv/dt = a)<br><br>De raaklijn verbindt dus je grafiek direct met de bijbehorende modelregel.",
    "opdracht": "Maak twee grafieken: x tegen t en v tegen t. Activeer de raaklijn op de x-t grafiek op t = 5 s. Lees de helling af. Vergelijk met de waarde van v in de v-t grafiek op hetzelfde tijdstip. Doe dit ook bij t = 20 s en t = 50 s. Wat valt op bij de eindsnelheid?<div class=\"learn-tip\">→ Activeer de raaklijn via de knop \"Raaklijn\" boven de grafiek. Selecteer eerst een punt door erop te klikken.</div>",
    "hints": [
      {
        "label": "Hint: helling bij t=0",
        "text": "Bij t = 0 is v = 0, dus Fw = 0. De versnelling is dan a = g = 9,8 m/s². De raaklijn op de v-t grafiek heeft helling 9,8."
      },
      {
        "label": "Hint: helling bij eindsnelheid",
        "text": "Bij de eindsnelheid is de resulterende kracht nul: a = 0. De raaklijn op de v-t grafiek is horizontaal (helling ≈ 0)."
      }
    ],
    "startSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.1",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "0",
        "unit": "m/s"
      },
      {
        "name": "m",
        "value": "1",
        "unit": "kg"
      },
      {
        "name": "k",
        "value": "0.1",
        "unit": "kg/m"
      },
      {
        "name": "g",
        "value": "9.8",
        "unit": "m/s²"
      }
    ],
    "startModel": "Fw = k*v*v\nFres = m*g - Fw\na = Fres/m\nv = v + a*dt\nx = x + v*dt\nt = t + dt",
    "startIter": 1000,
    "solSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.1",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "0",
        "unit": "m/s"
      },
      {
        "name": "m",
        "value": "1",
        "unit": "kg"
      },
      {
        "name": "k",
        "value": "0.1",
        "unit": "kg/m"
      },
      {
        "name": "g",
        "value": "9.8",
        "unit": "m/s²"
      }
    ],
    "solModel": "Fw = k*v*v\nFres = m*g - Fw\na = Fres/m\nv = v + a*dt\nx = x + v*dt\nt = t + dt",
    "solIter": 1000
  },
  {
    "title": "Als ... dan",
    "context": "Met een conditie kun je het gedrag van het model aanpassen als aan een voorwaarde is voldaan.",
    "uitleg": "Soms moet het model een beslissing nemen. Als een bal de grond raakt keert zijn snelheid om. Met als...dan kun je dit aanpakken:<br><code>als x &lt;= 0 dan v = -b*v</code><br><br>Hierbij is b de bouncefactor: een getal tussen 0 en 1 dat aangeeft hoeveel energie behouden blijft. Bij b = 1 verliest de bal geen energie. Bij b = 0 blijft de bal direct liggen.<br><br>Voeg b toe als startwaarde zodat je hem makkelijk kunt aanpassen zonder de modelregels te wijzigen.",
    "opdracht": "<div class=\"learn-tip\">→ Een als...dan regel schrijf je zo: <code>als voorwaarde dan variabele = waarde</code>.</div>Voeg alle startwaarden toe inclusief b = 0,8. Vul de modelregels in. Vergeet de als...dan regel niet. Zet die na de snelheidsberekening maar vóór de positieberekening. Experimenteer met b in de startwaarden. Wat gebeurt er bij b = 1? En bij b = 0,5?",
    "hints": [
      {
        "label": "Hint: welke regels?",
        "text": "Je hebt vier regels nodig: v (zwaartekracht), de als...dan (stuit), x (positie) en t."
      },
      {
        "label": "Hint: volgorde",
        "text": "Bereken eerst de nieuwe v, controleer dan of de bal de grond raakt, bereken dan pas de nieuwe x. Zo: v = v + a*dt, als x &lt;= 0 dan v = -b*v, x = x + v*dt."
      },
      {
        "label": "Hint: bal zakt door grond",
        "text": "Voeg een tweede regel toe om de bal boven de grond te houden: <code>als x &lt;= 0 dan x = 0</code>."
      }
    ],
    "startSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.01",
        "unit": "s"
      }
    ],
    "startModel": "t = t + dt",
    "startIter": 2000,
    "solSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.01",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "10",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "0",
        "unit": "m/s"
      },
      {
        "name": "a",
        "value": "-9.8",
        "unit": "m/s²"
      },
      {
        "name": "b",
        "value": "0.8",
        "unit": ""
      }
    ],
    "solModel": "v = v + a*dt\nals x <= 0 dan v = -b*v\nx = x + v*dt\nals x <= 0 dan x = 0\nt = t + dt",
    "solIter": 2000
  },
  {
    "title": "De veer",
    "context": "Een massa aan een veer trilt heen en weer. De kracht is proportioneel aan de uitwijking maar werkt altijd terug naar het midden.",
    "uitleg": "Een massa aan een veer is een van de meest fundamentele systemen in de natuurkunde. De veerkracht trekt het object altijd terug naar de evenwichtspositie:<br><code>F = -k*x</code><br><br>Het minteken is cruciaal: als x positief is (uitgetrokken) werkt de kracht negatief (terug naar midden). Als x negatief is (ingedrukt) werkt de kracht positief.<br><br>De versnelling volgt uit Newton: <code>a = F/m = -k*x/m</code><br><br>Dit leidt tot een periodieke beweging: de harmonische oscillator. De periode hangt alleen af van m en k, niet van de beginuitwijking.",
    "opdracht": "Voeg de startwaarden toe (m = 1 kg, k = 10 N/m, x = 1 m, v = 0 m/s). Voeg de ontbrekende modelregels toe voor Fres en a vóór de bestaande regels. Let op het minteken bij de veerkracht. Plot x tegen t. Hoe lang duurt één periode? Vergelijk met T = 2π√(m/k). Wat gebeurt er als je de beginuitwijking verdubbelt?",
    "hints": [
      {
        "label": "Hint: veerkracht",
        "text": "De veerkracht heeft een minteken want hij werkt terug naar de evenwichtspositie: Fres = -k*x."
      },
      {
        "label": "Hint: periode",
        "text": "T = 2π·√(m/k) = 2π·√(1/10) ≈ 2,0 s. Zoom in op de grafiek en klik op twee opeenvolgende pieken om de periode af te lezen."
      },
      {
        "label": "Hint: amplitude",
        "text": "De amplitude verandert als je de beginuitwijking aanpast maar de periode blijft hetzelfde."
      }
    ],
    "startSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.01",
        "unit": "s"
      }
    ],
    "startModel": "v = v + a*dt\nx = x + v*dt\nt = t + dt",
    "startIter": 2000,
    "solSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.01",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "1",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "0",
        "unit": "m/s"
      },
      {
        "name": "m",
        "value": "1",
        "unit": "kg"
      },
      {
        "name": "k",
        "value": "10",
        "unit": "N/m"
      }
    ],
    "solModel": "Fres = -k*x\na = Fres/m\nv = v + a*dt\nx = x + v*dt\nt = t + dt",
    "solIter": 2000
  },
  {
    "title": "Demping",
    "context": "In de praktijk verliest een veer energie door wrijving. De dempingskracht is: F_d = -b·v. Het systeem trilt dan steeds minder ver uit.",
    "uitleg": "Hetzelfde veersysteem maar nu met wrijving. De dempingskracht werkt altijd tegen de bewegingsrichting in:<br><code>Fd = -b*v</code><br><br>De resulterende kracht is de som van veerkracht en demping:<br><code>Fres = -k*x - b*v</code><br><br>Bij kleine b trilt het systeem langzaam uit. Bij grote b keert het object terug zonder te trillen: overdemping. De kritische demping ligt bij b = 2·√(m·k). Boven die waarde is er overdemping.",
    "opdracht": "Voeg alle startwaarden toe inclusief b = 0,5. Voeg de modelregels toe voor Fres en a. Elke simulatie wordt automatisch een run: simuleer eerst met demping en daarna zonder (b = 0) en vergelijk de runs onder de grafiek. Verhoog b totdat de oscillatie verdwijnt. Bij welke waarde van b treedt overdemping op? Klopt dit met de formule?",
    "hints": [
      {
        "label": "Hint: amplitude aflezen",
        "text": "Zoek de eerste piek in x vs t en noteer de waarde. Zoek daarna de piek waarbij x nog maar de helft is."
      },
      {
        "label": "Hint: overdemping ontdekken",
        "text": "Verhoog b geleidelijk (probeer b = 2, 4, 6...). Op een bepaald moment verdwijnt de oscillatie en kruist x de nul niet meer. Die grenswaarde heet de kritische demping; voor een massa-veersysteem is dat b_krit = 2·√(k·m)."
      },
      {
        "label": "Hint: kritische dempingswaarde",
        "text": "Met k = 10 en m = 1 is b_krit = 2·√10 ≈ 6,32. Boven deze waarde is het systeem overgedempt."
      }
    ],
    "startSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      }
    ],
    "startModel": "v = v + a*dt\nx = x + v*dt\nt = t + dt",
    "startIter": 2000,
    "solSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.01",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "1",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "0",
        "unit": "m/s"
      },
      {
        "name": "m",
        "value": "1",
        "unit": "kg"
      },
      {
        "name": "k",
        "value": "10",
        "unit": "N/m"
      },
      {
        "name": "b",
        "value": "0.5",
        "unit": ""
      }
    ],
    "solModel": "Fres = -k*x - b*v\na = Fres/m\nv = v + a*dt\nx = x + v*dt\nt = t + dt",
    "solIter": 2000
  },
  {
    "title": "Stopconditie",
    "context": "Met het sleutelwoord STOP kun je de simulatie automatisch beëindigen als aan een conditie is voldaan.",
    "uitleg": "Met STOP kun je de simulatie vroegtijdig beëindigen. Combineer dit met een als...dan:<br><code>als abs(v) &lt; 0.001 dan STOP</code><br><br>We gebruiken abs(v) in plaats van gewoon v omdat de snelheid bij de stuiterende bal van teken wisselt. Als je <code>v &lt; 0.001</code> zou gebruiken zou de conditie altijd waar zijn wanneer de bal omhoog beweegt. Met abs(v) controleer je de absolute waarde ongeacht de richting.<br><br>Let op: kies een kleine drempelwaarde zoals 0,001. Als de drempel te groot is stopt de simulatie direct bij de eerste stuit voordat je iets ziet.",
    "opdracht": "Bouw het stuiterende balmodel opnieuw op vanuit de basisregels. Voeg daarna een stopconditie toe. Experimenteer met de drempelwaarde. Wanneer stopt het model te vroeg?",
    "hints": [
      {
        "label": "Hint: STOP-conditie",
        "text": "Voeg toe: <code>als abs(v) &lt; 0.001 dan STOP</code> vlak voor de tijdstap. Het aantal iteraties staat in de statusbalk."
      },
      {
        "label": "Hint: waarom abs(v)?",
        "text": "Na een stuit is v negatief (de bal beweegt omhoog). Zonder abs zou <code>v &lt; 0.001</code> altijd waar zijn als v negatief is, en stopt de simulatie te vroeg."
      },
      {
        "label": "Hint: drempelwaarde",
        "text": "Een kleinere drempel (0.0001) laat de simulatie langer doorlopen; groter (0.01) stopt eerder. Maar pas op: bij een te grote drempel stopt de simulatie al bij de eerste stuit."
      }
    ],
    "startSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      }
    ],
    "startModel": "v = v + a*dt\nx = x + v*dt\nt = t + dt",
    "startIter": 5000,
    "solSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.01",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "10",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "0",
        "unit": "m/s"
      },
      {
        "name": "a",
        "value": "-9.8",
        "unit": "m/s²"
      },
      {
        "name": "b",
        "value": "0.8",
        "unit": ""
      }
    ],
    "solModel": "v = v + a*dt\nals x <= 0 dan v = -b*v\nx = x + v*dt\nals x <= 0 dan x = 0\nals abs(v) < 0.001 dan STOP\nt = t + dt",
    "solIter": 5000
  },
  {
    "title": "Bouw je eigen model",
    "context": "Je gaat nu zelf een volledig model bouwen zonder hulp. De bungee jumper valt naar beneden vanaf een brug.",
    "uitleg": "Je gaat nu zelf een volledig model bouwen zonder hulp. De bungee jumper valt naar beneden vanaf hoogte x = 0. Positieve richting is naar beneden.<br><br>Er werken drie krachten:<br>Zwaartekracht: Fz = m·g (naar beneden, positief)<br>Elastische kracht van het touw: Fe = k·(x-L) maar alleen als x &gt; L (naar boven)<br>Luchtweerstand: Fw = b·v² maar de richting hangt af van de beweging. Bij vallen (v &gt; 0) werkt Fw omhoog: Fw = +b·v². Bij stijgen (v &lt; 0) werkt Fw omlaag: Fw = -b·v². Gebruik twee als...dan regels voor Fw.<br><br>Bouw het model op in stappen: begin met alleen de zwaartekracht. Voeg dan de elastische kracht toe. Voeg als laatste de luchtweerstand toe.",
    "opdracht": "Voeg alle startwaarden toe (m = 80 kg, g = 9,8 m/s², k = 20 N/m, L = 10 m, b = 0,5, x = 0 m, v = 0 m/s, dt = 0,01 s). Schrijf alle modelregels zelf. Er zijn geen standaardregels voorgeladen.",
    "hints": [
      {
        "label": "Hint: begin simpel",
        "text": "Begin met alleen Fz = m*g en a = Fz/m. Voeg dan de elastische kracht toe met een als...dan."
      },
      {
        "label": "Hint: luchtweerstand richting",
        "text": "Luchtweerstand werkt altijd tegen de beweging in. Bij v &gt; 0 (vallen) werkt Fw omhoog (negatief in Fres), bij v &lt; 0 (stijgen) werkt Fw omlaag (positief in Fres). Gebruik twee als...dan regels:<br><code>als v &gt; 0 dan Fw = b*v*v</code><br><code>als v &lt;= 0 dan Fw = -b*v*v</code>"
      },
      {
        "label": "Hint: tekens controleren",
        "text": "Fres = Fz - Fe - Fw. Fz is altijd positief (naar beneden). Fe is positief als x &gt; L. Fw wisselt van teken afhankelijk van de bewegingsrichting — dat is precies de bedoeling."
      }
    ],
    "startSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      }
    ],
    "startModel": "",
    "startIter": 2000,
    "solSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.01",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "v",
        "value": "0",
        "unit": "m/s"
      },
      {
        "name": "m",
        "value": "80",
        "unit": "kg"
      },
      {
        "name": "k",
        "value": "20",
        "unit": "N/m"
      },
      {
        "name": "L",
        "value": "10",
        "unit": "m"
      },
      {
        "name": "b",
        "value": "0.5",
        "unit": ""
      },
      {
        "name": "g",
        "value": "9.8",
        "unit": "m/s²"
      }
    ],
    "solModel": "Fz = m*g\nals x > L dan Fe = k*(x-L)\nals x <= L dan Fe = 0\nals v > 0 dan Fw = b*v*v\nals v <= 0 dan Fw = -b*v*v\nFres = Fz - Fe - Fw\na = Fres/m\nv = v + a*dt\nx = x + v*dt\nt = t + dt",
    "solIter": 2000
  },
  {
    "title": "Twee dimensies",
    "context": "Tot nu toe bewoog alles in één richting. In twee dimensies heb je twee posities en twee snelheden.",
    "uitleg": "Tot nu toe bewoog alles in één richting. In twee dimensies heb je twee posities (x en y) en twee snelheden (vx en vy). De zwaartekracht werkt alleen in de y-richting.<br><br>Afspraak: omhoog is positief voor y. De beginsnelheid vy is positief (omhoog) en de zwaartekracht is negatief: <code>vy = vy - g*dt</code>.<br><br>De horizontale snelheid vx verandert niet want er is geen horizontale kracht. Dat betekent dat vx constant blijft en je er geen modelregel voor nodig hebt.",
    "opdracht": "Voeg alle startwaarden toe (vx = 20 m/s, vy = 30 m/s, g = 9,8 m/s², x = 0 m, y = 0 m, dt = 0,01 s). Voeg de ontbrekende modelregel toe voor vy. Voeg ook een stopconditie toe. Plot y tegen x voor de baan. Hoe ver komt de bal? Wat is de maximale hoogte?<div class=\"learn-tip\">→ Kies bij x-as: x en bij y-as: y om de parabolische baan te zien.</div>",
    "hints": [
      {
        "label": "Hint: vy regel",
        "text": "vx verandert niet, dus je hebt geen modelregel voor vx nodig. Wel een regel voor vy: vy = vy - g*dt."
      },
      {
        "label": "Hint: stopconditie",
        "text": "De stopconditie is <code>als y &lt;= 0 dan STOP</code>. Zet die na de positieberekening."
      },
      {
        "label": "Hint: bereik en hoogte",
        "text": "Vluchttijd ≈ 2×30/9,8 ≈ 6,1 s. Bereik ≈ 20×6,1 ≈ 122 m. Maximale hoogte ≈ 30²/(2×9,8) ≈ 45,9 m."
      }
    ],
    "startSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      }
    ],
    "startModel": "x = x + vx*dt\ny = y + vy*dt\nt = t + dt",
    "startIter": 1000,
    "solSv": [
      {
        "name": "t",
        "value": "0",
        "unit": "s"
      },
      {
        "name": "dt",
        "value": "0.01",
        "unit": "s"
      },
      {
        "name": "x",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "y",
        "value": "0",
        "unit": "m"
      },
      {
        "name": "vx",
        "value": "20",
        "unit": "m/s"
      },
      {
        "name": "vy",
        "value": "30",
        "unit": "m/s"
      },
      {
        "name": "g",
        "value": "9.8",
        "unit": "m/s²"
      }
    ],
    "solModel": "vy = vy - g*dt\nx = x + vx*dt\ny = y + vy*dt\nals y <= 0 dan STOP\nt = t + dt",
    "solIter": 1000
  }
];
