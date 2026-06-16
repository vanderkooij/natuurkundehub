import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { ModalPanel } from "@/_reusable/ModalPanel";
import { cn } from "@/lib/utils";

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  toolVersion: string;
}

interface SectionDef {
  id: string;
  title: string;
  content: ReactNode;
}

/**
 * Help-paneel met de secties voor Videometen (uitgebreid in prompt 13). Eén
 * sectie tegelijk open (accordion); default open is "Aan de slag". TL;DR staat
 * ervóór maar dichtgeklapt. Tekst-blokken zijn bewust kort + concreet —
 * leerlingen lezen geen handleidingen, ze scannen.
 */
export function HelpPanel({ isOpen, onClose, toolVersion }: HelpPanelProps) {
  const [openId, setOpenId] = useState<string | null>("start");

  const sections: SectionDef[] = [
    {
      id: "tldr",
      title: "TL;DR — De workflow in één blik",
      content: (
        <Prose>
          <p>
            <strong>1. Video laden</strong> — sleep een MP4/MOV/WebM het grijze
            vak in.
          </p>
          <p>
            <strong>2. Voorbereiden</strong> — controleer <Kbd>fps</Kbd>, kies
            je <em>trim</em>-bereik, kalibreer de <strong>schaal</strong> (stap
            4) en <strong>assen</strong> (stap 5).
          </p>
          <p>
            <strong>3. Tracken</strong> — klik op <Kbd>▶ Start tracking</Kbd>,
            klik frame voor frame op je object. De tool springt automatisch
            vooruit.
          </p>
          <p>
            <strong>4. Analyseren</strong> — na de tweede meting schakelt de
            tool naar Analyseren-modus. Tabel, grafieken, fit, raaklijn, meten —
            alles om je beweging in kaart te brengen.
          </p>
          <p>
            <strong>5. Opslaan / exporteren</strong> — via het <strong>Menu</strong>{" "}
            rechtsboven (de <Kbd>⋮</Kbd>-knop). Project als JSON of tabel als
            CSV. Grafiek als PNG.
          </p>
        </Prose>
      ),
    },
    {
      id: "start",
      title: "Aan de slag",
      content: (
        <Prose>
          <p>
            Sleep een videobestand naar het grijze vak, of klik op{" "}
            <strong>Kies video</strong>. Werkt met MP4, MOV en WebM. De video
            blijft 100% lokaal in je browser — er wordt niets ge-upload.
          </p>
          <p>
            Zodra de video is geladen verschijnt rechtsboven in de video-pane
            een <Kbd>fps</Kbd>-chip met de gedetecteerde framerate. Klopt die
            niet? Klik erop en kies een preset (24/25/30/60) of typ je eigen
            waarde.
          </p>
          <p>
            Te lange video? Sleep de twee blokjes aan de uiteinden van de
            tijdbalk om het meetbereik (de <em>trim</em>) te beperken. Of zet
            de afspeel-positie op een frame en gebruik{" "}
            <strong>Trim begin</strong> / <strong>Trim eind</strong>.
          </p>
        </Prose>
      ),
    },
    {
      id: "camera",
      title: "Camera-vereisten — wat maakt een goede video?",
      content: (
        <Prose>
          <p>
            De kwaliteit van je metingen begint bij de video. Een paar
            praktische tips:
          </p>
          <ul>
            <li>
              <strong>Stilstaande camera</strong> — pan of zoom tijdens opname
              zorgt voor verschuivende referentiepunten. Zet de camera op een
              statief of op een vlakke ondergrond.
            </li>
            <li>
              <strong>Filmt loodrecht op de beweging</strong> — als je object
              van links naar rechts beweegt, film je niet van schuin boven.
              Anders krijg je perspectief-vervorming.
            </li>
            <li>
              <strong>Voldoende belichting</strong> — een donker beeld maakt
              klikken op het object moeilijk. Goed licht, lage ISO, scherp
              beeld.
            </li>
            <li>
              <strong>Referentie-object in beeld</strong> — een meetlat, een
              deur, een A4-blad, of iets met een bekende afmeting. Zonder
              referentie kunnen pixels niet omgezet worden naar meters.
            </li>
            <li>
              <strong>Contrast tussen object en achtergrond</strong> — een rode
              bal voor een witte muur is makkelijk te tracken; een groene bal in
              het gras niet.
            </li>
            <li>
              <strong>Hoge framerate bij snelle bewegingen</strong> — 30 fps is
              genoeg voor een schommel, maar voor een springende bal of een
              vallend object wil je liever 60 fps of meer voor scherpere frames.
            </li>
          </ul>
        </Prose>
      ),
    },
    {
      id: "kalibreren",
      title: "Kalibreren — schaal en assen",
      content: (
        <Prose>
          <p>
            <strong>Schaal</strong> vertelt de tool hoeveel meter (of cm/mm) er
            in één videopixel zit. Klik op stap <Kbd>4 Schaal</Kbd>, teken een
            streep over een bekend object (meetlat, deur, lichaamslengte) en
            vul de lengte in.
          </p>
          <p>
            <strong>Tip:</strong> film altijd een referentie-object in beeld
            (meetlat, A4-blad). Zonder schaal kunnen meters niet uit pixels
            afgeleid worden.
          </p>
          <p>
            <strong>Assen</strong> bepalen waar nul is en hoe je x- en y-as
            gericht zijn. Standaard staat de oorsprong links-onder en wijst{" "}
            <em>+x</em> naar rechts en <em>+y</em> omhoog. Bij stap{" "}
            <Kbd>5 Assen</Kbd> kun je:
          </p>
          <ul>
            <li>
              <strong>De oorsprong slepen</strong> — verplaats de origin-dot
              naar het beginpunt van je beweging.
            </li>
            <li>
              <strong>De assen draaien</strong> — sleep aan de +x-pijl-tip. Snap
              naar 15°; houd <Kbd>Shift</Kbd> ingedrukt om de snap uit te
              schakelen.
            </li>
            <li>
              <strong>Richting wisselen</strong> — twee swap-knoppen verschijnen
              rechtsboven in beeld: <Kbd>+x →</Kbd>/<Kbd>+x ←</Kbd> en{" "}
              <Kbd>+y ↑</Kbd>/<Kbd>+y ↓</Kbd>. Handig wanneer je positief de
              andere kant op wil meten (bv. bij een vallend object: +y omlaag).
            </li>
          </ul>
          <p>
            <strong>Slim:</strong> de assen-controls verschijnen automatisch
            zodra je de oorsprong of de rotatie-handle aanraakt — ook als je in
            een andere stap zit. Klik op een andere stap om ze weer te
            verbergen.
          </p>
        </Prose>
      ),
    },
    {
      id: "meten",
      title: "Meten — tracking-workflow",
      content: (
        <Prose>
          <p>
            Klik op <strong>▶ Start tracking</strong> in de werkbalk. De video
            schakelt naar <em>volle-breedte tracking-modus</em> en springt naar{" "}
            <Kbd>trim begin</Kbd>. Klik op het object in beeld; de tool plaatst
            een meetpunt en springt automatisch <em>frame-step</em> frames
            vooruit.
          </p>
          <p>
            <strong>Tips voor goed tracken:</strong>
          </p>
          <ul>
            <li>
              <strong>Klik consistent</strong> — kies een vast punt op het
              object (bv. linkerbovenhoek van een ballon, of het zwaartepunt van
              een blokje) en klik elke meting op datzelfde punt. Anders meet je
              vooral de fluctuaties van je klikken.
            </li>
            <li>
              <strong>Verkeerd geklikt?</strong> Druk <Kbd>Ctrl + Z</Kbd> (undo)
              om de laatste meting terug te halen. Je kunt meerdere keren
              ongedaan maken.
            </li>
            <li>
              <strong>Achteraf corrigeren</strong> — in Analyseren-modus kun je
              een meetpunt slepen om &apos;m op de juiste plek te zetten, zonder
              opnieuw te tracken.
            </li>
            <li>
              <strong>Trail-kleur wisselen</strong> — als de standaardkleur
              (teal) slecht zichtbaar is op je achtergrond, klik op de kleurchip
              naast de fps-chip om door teal/amber/magenta/wit te cyclen.
            </li>
          </ul>
          <p>
            <strong>Frame-step</strong> (rechtsboven in de tracking-bar)
            bepaalt hoeveel frames tussen elke meting zitten. Default <Kbd>5</Kbd>{" "}
            — voldoende dichtheid voor een 30 fps-video van een paar seconden.
            Kies kleiner voor snelle bewegingen, groter voor lange video&apos;s.
          </p>
          <p>
            Druk op <Kbd>Esc</Kbd> of klik <strong>Klaar</strong> om de
            tracking-sessie te beëindigen.
          </p>
          <p>
            <strong>Belangrijk verschil:</strong> een <em>frame</em> is één
            beeldje van de video; een <em>meetpunt</em> is een frame waarop je
            geklikt hebt. Niet elke frame is een meetpunt.
          </p>
        </Prose>
      ),
    },
    {
      id: "analyseren",
      title: "Analyseren — tabel, grafieken, raaklijn",
      content: (
        <Prose>
          <p>
            In de <strong>tabel</strong> staat elke meting met haar tijd en
            (na kalibratie) wereldcoördinaten. Klik op een rij om naar dat
            frame te springen. De rij van het huidige frame is gemarkeerd.
          </p>
          <p>
            <strong>Extra kolommen</strong> — klik op <Kbd>Kolommen</Kbd>{" "}
            rechtsboven in de tabel. Je kunt zes afgeleide grootheden aan/uit
            vinken: <Kbd>vx</Kbd>, <Kbd>vy</Kbd>, <Kbd>|v|</Kbd>, <Kbd>ax</Kbd>,{" "}
            <Kbd>ay</Kbd>, <Kbd>|a|</Kbd>. Versnellingen kunnen ruisig zijn omdat
            ze de tweede afgeleide van ruwe meetpunten zijn — kijk in de grafiek
            voor een fit-versie.
          </p>
          <p>
            Voor elke grafiek-pane kies je een type uit het dropdown-menu
            (x tegen t, y tegen t, vx tegen t, etc.). De{" "}
            <strong>Raaklijn</strong>-knop tekent de afgeleide op het actieve
            punt, met de helling <Kbd>dy/dx</Kbd> erbij. <strong>Meten</strong>{" "}
            geeft twee verticale lijnen om verschillen <Kbd>Δx</Kbd> en{" "}
            <Kbd>Δy</Kbd> af te lezen. <strong>Fit</strong> tekent een wiskundig
            model door je data (lineair, kwadratisch, sinus) — zie de
            fit-secties verderop voor uitleg.
          </p>
          <p>
            <strong>Zoomen in grafieken:</strong>
          </p>
          <ul>
            <li>
              <strong>Scroll-wiel</strong> — zoomt rond je cursor.{" "}
              <Kbd>Auto zoom</Kbd> reset naar passend bij je data.
            </li>
            <li>
              <strong>Sleep middenin een as</strong> — verschuift die as. Sleep
              aan een as-uiteinde om te in/uit-zoomen.
            </li>
            <li>
              <strong>Sleep middenin de grafiek</strong> — verschuift het hele
              beeld (pan).
            </li>
          </ul>
          <p>
            <strong>Pane-management:</strong>
          </p>
          <ul>
            <li>
              <strong>+ knop</strong> — voegt een grafiek toe (max 4).
            </li>
            <li>
              <strong>× knop</strong> — sluit een grafiek.
            </li>
            <li>
              <strong>Sleep tussen panes</strong> — herverdeelt de ruimte.
            </li>
            <li>
              <strong>Verberg-knop</strong> — verbergt video + tabel, grafieken
              vullen het volledige scherm. Handig op kleine schermen.
            </li>
            <li>
              <strong>Pane-grootte slider</strong> — maak panes groter dan het
              scherm en scroll erdoor. Goed bij 4 grafieken.
            </li>
          </ul>
          <p>
            Twee werkmodi via de knop bovenaan: <strong>Meten</strong> (alleen
            de video op volle breedte — om te kalibreren en te tracken) of{" "}
            <strong>Analyseren</strong> (video klein, met tabel + grafieken).
            Zodra je je tweede meetpunt zet schakelt de tool automatisch naar
            Analyseren.
          </p>
          <p>
            Met <Kbd>←</Kbd> en <Kbd>→</Kbd> stap je tussen meetpunten — over
            de hele meetreeks als de muis boven de video staat, en door de
            datapunten van een specifieke grafiek als de muis daar boven hangt.
            Met <Kbd>Shift</Kbd> spring je 10 meetpunten per keer.
          </p>
        </Prose>
      ),
    },
    {
      id: "shortcuts",
      title: "Toetsenbord-shortcuts",
      content: (
        <Prose>
          <p>
            <strong>Tracking-modus:</strong>
          </p>
          <ul>
            <li>
              <Kbd>Esc</Kbd> — beëindig tracking-sessie
            </li>
            <li>
              <Kbd>Ctrl + Z</Kbd> — laatste meetpunt ongedaan maken
            </li>
            <li>
              <Kbd>Ctrl + Shift + Z</Kbd> — opnieuw doen
            </li>
          </ul>
          <p>
            <strong>Analyseren / algemeen:</strong>
          </p>
          <ul>
            <li>
              <Kbd>←</Kbd>/<Kbd>→</Kbd> — vorige/volgende meetpunt (over de
              meetreeks of in actieve grafiek)
            </li>
            <li>
              <Kbd>Shift + ←</Kbd>/<Kbd>→</Kbd> — 10 meetpunten per keer
            </li>
            <li>
              <Kbd>Space</Kbd> — video play/pause
            </li>
            <li>
              <Kbd>Esc</Kbd> — sluit popovers / verlaat assen-edit / sluit help
            </li>
          </ul>
          <p>
            <strong>Kalibreren:</strong>
          </p>
          <ul>
            <li>
              <Kbd>Shift</Kbd> (tijdens slepen aan +x-as) — schakel snap op 15°
              uit
            </li>
          </ul>
        </Prose>
      ),
    },
    {
      id: "r-squared",
      title: "Wat zegt R²?",
      content: (
        <Prose>
          <p>
            Wanneer je een fit toepast op je metingen, berekent de tool ook
            een <strong>R²-waarde</strong> (uitgesproken: &ldquo;R-kwadraat&rdquo;).
            Dat is een maat voor hoe goed het wiskundige model door je data
            loopt.
          </p>
          <ul>
            <li>
              <Kbd>R² = 1,000</Kbd> — de fit-curve gaat exact door elk meetpunt.
              Perfect model.
            </li>
            <li>
              <Kbd>R² ≈ 0,95–0,99</Kbd> — uitstekende fit. De ~5% afwijking is
              meet-ruis.
            </li>
            <li>
              <Kbd>R² ≈ 0,80–0,95</Kbd> — redelijke fit. Kijk of een ander type
              beter past.
            </li>
            <li>
              <Kbd>R² &lt; 0,80</Kbd> — het model past slecht. Misschien gebruik
              je het verkeerde fit-type, of zit er een knik in je data (bijv.
              een stuiterende bal die je in één keer probeert te fitten — fit
              dan per stuit-segment via de <em>fit-range</em>).
            </li>
          </ul>
          <p>
            Voor schoolexperimenten is <Kbd>R² &gt; 0,95</Kbd> een sterk
            signaal dat je experiment goed is gelukt en het model klopt.
          </p>
        </Prose>
      ),
    },
    {
      id: "ruis-derivative",
      title: "Waarom is mijn afgeleide ruisig bij R² = 1?",
      content: (
        <Prose>
          <p>
            Veelgestelde vraag — en de uitleg is pedagogisch belangrijk. De
            korte versie: <strong>R²</strong> gaat over je{" "}
            <em>positie-fit</em>, niet over de afgeleide die je in de{" "}
            <Kbd>vy tegen t</Kbd>- of <Kbd>ay tegen t</Kbd>-grafiek ziet.
          </p>
          <p>
            <strong>R²</strong> beschrijft de positie-fit. Als je een fit
            maakt op <Kbd>y(t)</Kbd>, zegt R² hoe goed de fit-curve door je
            positie-meetpunten loopt. Een R² van 1,000 betekent: élke
            positie-meting valt op de parabool (of sinus, of exp).
          </p>
          <p>
            <strong>De scatter</strong> in <Kbd>vy-t</Kbd> of <Kbd>ay-t</Kbd>{" "}
            komt uit ruwe meetpunten. De tool berekent de afgeleide via{" "}
            <em>central difference</em>: het verschil tussen twee opeenvolgende
            metingen. Zelfs als je positie-fit perfect is, zit er natuurlijke
            variatie in je meetpunten — door pixel-onnauwkeurigheid bij het
            klikken, of door subtiele timing-verschillen tussen frames. Dat
            verschil wordt door het differentiëren <strong>versterkt</strong>.
          </p>
          <p>
            <strong>De gladde fit-curve</strong> in <Kbd>vy-t</Kbd> is iets
            anders. Die is geen numerieke benadering, maar de{" "}
            <em>analytische afgeleide</em> van je positie-fit. Wiskundig
            exact, geen ruis mogelijk.
          </p>
          <p>
            Het verschil tussen scatter en fit-curve is de{" "}
            <strong>pedagogische boodschap</strong>. Het laat letterlijk zien
            waarom we wiskundige modellen gebruiken: ruwe data heeft ruis, het
            onderliggende fysische gedrag is glad. De fit destilleert de fysica
            uit de meting.
          </p>
          <p>
            Bij een experiment met veel meet-ruis (lage R²) zie je: de scatter
            rommelt sterk rond de fit-curve. Bij een netjes experiment{" "}
            (R² → 1) liggen ze dichter bij elkaar — maar de scatter blijft
            altijd iets ruisiger door de versterkende werking van
            differentiëren.
          </p>
        </Prose>
      ),
    },
    {
      id: "modellen-afwijkingen",
      title: "Wanneer de fit de meting niet helemaal volgt",
      content: (
        <Prose>
          <p>
            Bij ideale, voorspelbare bewegingen sluiten fit-curve en scatter
            heel dicht op elkaar aan. Maar bij echte experimenten zie je vaak
            afwijkingen — en die kunnen leerzaam zijn.
          </p>
          <p>
            De fit toont een <strong>ideaal-model</strong>: een sinus met
            constante amplitude, een parabool met constante versnelling, etc.
            In de werkelijkheid kunnen die grootheden veranderen door{" "}
            <strong>demping</strong> (energie weglekken — luchtweerstand,
            wrijving) of <strong>energie-input</strong> (actief schommelen,
            externe kracht). Afwijkingen tussen scatter en fit-curve geven
            informatie over die niet-gemodelleerde fenomenen.
          </p>
        </Prose>
      ),
    },
    {
      id: "trim-vs-fit-range",
      title: "Wat is het verschil tussen trim-range en fit-range?",
      content: (
        <Prose>
          <p>
            Twee verschillende selecties die makkelijk te verwarren zijn:
          </p>
          <p>
            <strong>Trim-range</strong> is welk deel van de video je{" "}
            <em>in zijn geheel</em> meeneemt voor analyse. Stel je in via stap{" "}
            <Kbd>3</Kbd> in de werkbalk. Buiten de trim worden punten gedimd
            weergegeven en tellen niet mee in tabel en grafieken.
          </p>
          <p>
            <strong>Fit-range</strong> is welk deel van je meetpunten je
            gebruikt om een <strong>fit-curve</strong> door te trekken. Stel je
            in via de Fit-knop bovenaan de grafieken. Standaard gebruikt 'ie
            je hele trim, maar je kunt 'm strikter zetten — bijvoorbeeld bij
            een stuiterende bal: trim alle metingen, maar fit alleen op de
            eerste vrije-val fase.
          </p>
          <p>
            <strong>Drie zones op de fit-curve</strong>: de wiskundige
            vergelijking loopt door over de hele zichtbare tijd-as, maar wordt
            visueel onderscheiden:
          </p>
          <ul>
            <li>
              <strong>Binnen je fit-range</strong> (volle lijn): hier is de
              fit op gebaseerd.
            </li>
            <li>
              <strong>Buiten fit-range, binnen je meetbereik</strong>{" "}
              (lichter): hier heb je wel metingen, maar je hebt 'm bewust niet
              meegenomen in de fit. Bijvoorbeeld bij een stuiterende bal: het
              opwaartse stuk na de stuiter is meting, maar valt buiten je
              vrije-val-fit.
            </li>
            <li>
              <strong>Voorbij je meetbereik</strong> (stippellijn): pure
              extrapolatie. Dit is wat het wiskundig model voorspelt voor
              tijden waarop je niets gemeten hebt. Handig om &ldquo;wat zou er
              zijn gebeurd als…?&rdquo; te visualiseren, maar niet onderbouwd
              door data.
            </li>
          </ul>
          <p>
            Praktisch: voor een vallende bal trim je van vóór de bal valt tot
            na de eerste bounce. Je fit-range zet je strikter, alleen op het
            vallende stuk. De fit-curve loopt door als lichter segment over je
            opwaartse meetpunten heen, en als stippellijn voorbij je laatste
            meetpunt — handig om te zien waar de bal volgens je model zou zijn
            geweest zonder stuiter.
          </p>
        </Prose>
      ),
    },
    {
      id: "fit-fysica",
      title: "Wat doe je met de formule?",
      content: (
        <Prose>
          <p>
            De fit geeft je een wiskundige formule. De coëfficiënten daarin
            zijn vaak fysisch betekenisvol:
          </p>
          <ul>
            <li>
              <strong>Vrije val</strong> <Kbd>y(t) = −4,9·t² + …</Kbd> → de
              −4,9 = −½g, dus je hebt de zwaartekracht gemeten:{" "}
              <Kbd>g = 9,8 m/s²</Kbd>.
            </li>
            <li>
              <strong>Constante snelheid</strong> <Kbd>x(t) = v·t + x₀</Kbd> →{" "}
              <em>v</em> is de snelheid in m/s.
            </li>
            <li>
              <strong>Slinger</strong> <Kbd>y(t) = A·sin(ω·t + φ)</Kbd> →
              periode <Kbd>T = 2π/ω</Kbd>.
            </li>
          </ul>
          <p>
            Onder een afgeleide-pane (zoals <Kbd>vy tegen t</Kbd> of{" "}
            <Kbd>ay tegen t</Kbd>) toont de tool automatisch de wiskundige
            afgeleide van je positie-fit — handig om snelheid of versnelling
            direct uit de formule af te lezen.
          </p>
        </Prose>
      ),
    },
    {
      id: "sync",
      title: "Sync-problemen?",
      content: (
        <Prose>
          <p>
            De <strong>fps</strong> (frames per seconde) is het ankerpunt
            tussen tijd en video. Als de fps niet klopt, lopen je metingen uit
            de pas met de video — dan staat het object niet bij je rode dot.
          </p>
          <p>
            <strong>Check:</strong> de fps-chip rechtsboven in de video-pane.
            Zolang je nog geen meetpunt hebt gezet, kun je 'm aanklikken om
            een preset (<Kbd>24/25/30/60</Kbd>) te kiezen of zelf een waarde
            in te typen.
          </p>
          <p>
            Zodra je het <strong>eerste meetpunt</strong> zet wordt de fps
            <strong> vergrendeld</strong> (slotje op de chip). Dat voorkomt
            dat een detectie- of typefout je hele meetreeks corrupteert.
            Wil je de fps alsnog wijzigen? Gebruik dan een van deze
            reset-acties via het <strong>Menu</strong> rechtsboven (de{" "}
            <Kbd>⋮</Kbd>-knop):
          </p>
          <ul>
            <li>
              <strong>Alle metingen wissen</strong> — houdt video, kalibratie
              en grafiek-layout vast, alleen de meetpunten verdwijnen.
            </li>
            <li>
              <strong>Begin opnieuw met deze video</strong> — wist ook
              kalibratie en trim.
            </li>
            <li>
              <strong>Andere video laden</strong> — start helemaal vers.
            </li>
          </ul>
        </Prose>
      ),
    },
    {
      id: "frames-vs-meetpunten",
      title: "Frames vs meetpunten",
      content: (
        <Prose>
          <p>
            Een video van 10 seconden bij 30 fps heeft <strong>300 frames</strong>.
            Met frame-step <Kbd>5</Kbd> zet je tijdens tracking dus{" "}
            <strong>60 meetpunten</strong> — niet 300. De andere 240 frames
            zitten er nog wel tussenin, maar zonder meting.
          </p>
          <p>
            In de analyse-modus kun je met <Kbd>←</Kbd>/<Kbd>→</Kbd> alleen
            tussen meetpunten springen, niet tussen losse frames. Bij{" "}
            <em>tracking</em> kun je dat wel — daar wil je juist precieze
            frame-controle om nieuwe metingen te plaatsen.
          </p>
          <p>
            Klik op een dot in de grafiek of op een rij in de tabel: de video
            springt naar dat meetpunt. Versleep de tijdbalk: de video volgt
            mee, en op <em>los laten</em> snapt 'ie naar het dichtstbij
            meetpunt.
          </p>
        </Prose>
      ),
    },
    {
      id: "export",
      title: "Opslaan, exporteren, opnieuw beginnen",
      content: (
        <Prose>
          <p>
            Rechtsboven in de header zit het <strong>Menu</strong> (de knop met
            het <Kbd>⋮</Kbd>-icoon). Daar vind je alle top-acties:
          </p>
          <ul>
            <li>
              <strong>Project opslaan</strong> — een dialog vraagt om locatie en
              bestandsnaam (in browsers die dat ondersteunen; anders een gewone
              download). Bewaart je hele sessie (kalibratie, trim, meetpunten,
              grafiek-layout) als JSON-bestand. De video zelf zit er niet in
              (te zwaar).
            </li>
            <li>
              <strong>Project openen</strong> — leest een opgeslagen JSON-project
              in; de tool vraagt daarna om de bijbehorende videofile opnieuw te
              kiezen.
            </li>
            <li>
              <strong>Tabel als CSV</strong> — Excel-vriendelijke export van
              de meetreeks (puntkomma-scheiding, komma-decimaal).
            </li>
            <li>
              <strong>Alle metingen wissen</strong> — verwijdert alleen de
              meetpunten, Ctrl+Z herstelt 'm.
            </li>
            <li>
              <strong>Begin opnieuw met deze video</strong> — wist kalibratie,
              trim, metingen en grafiek-layout. Video blijft.
            </li>
            <li>
              <strong>Andere video laden</strong> — wist alles + opent een
              file-picker voor een nieuw videobestand.
            </li>
          </ul>
          <p>
            Boven elke grafiek-pane zit een <strong>⬇ PNG</strong>-knop voor
            een plaatje van die specifieke grafiek (handig voor in een
            verslag).
          </p>
        </Prose>
      ),
    },
  ];

  return (
    <ModalPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Help — Videometen"
      footer={
        <span>
          Versie {toolVersion} ·{" "}
          <a
            href="https://natuurkundehub.nl"
            className="hover:text-(--accent)"
            target="_blank"
            rel="noreferrer"
          >
            natuurkundehub.nl
          </a>
        </span>
      }
    >
      <div className="flex flex-col">
        {sections.map((s) => {
          const open = openId === s.id;
          return (
            <div key={s.id} className="border-b" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : s.id)}
                aria-expanded={open}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-5 py-3 text-left",
                  "text-[14px] font-medium text-(--text-primary) transition-colors",
                  "hover:bg-(--bg-card-hover)",
                  open && "bg-(--bg-card-hover)",
                )}
              >
                <span>{s.title}</span>
                <ChevronDown
                  className={cn(
                    "size-4 text-(--text-muted) transition-transform",
                    open && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {open ? (
                <div className="px-5 pb-4 pt-1 text-[13px] leading-relaxed text-(--text-secondary)">
                  {s.content}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </ModalPanel>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-2 [&_li]:ml-5 [&_li]:list-disc [&_p]:max-w-[72ch] [&_strong]:text-(--text-primary) [&_ul]:space-y-1">
      {children}
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      className="inline-block rounded border bg-(--bg-secondary) px-1.5 py-0.5 font-mono text-[11px] text-(--text-primary)"
      style={{ borderColor: "var(--border-solid)" }}
    >
      {children}
    </kbd>
  );
}
