import { X } from "lucide-react";

interface Props {
  onClose: () => void;
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 shrink-0 rounded-md border border-(--border-solid) bg-(--bg-primary) px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-(--text-secondary)">
        {k}
      </span>
      <span className="text-sm text-(--text-secondary)">{children}</span>
    </li>
  );
}

/** Uitleg bij de bediening, en de link naar feedback. */
export function HelpModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onPointerDown={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl border border-(--border-solid) bg-card p-6 shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--text-primary)">
            Zo werkt het systeembord
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="grid h-8 w-8 place-items-center rounded-lg border border-(--border-solid) text-(--text-secondary) hover:bg-(--bg-card-hover)"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-4 text-sm text-(--text-secondary)">
          Bouw schakelingen zoals op het systeembord in het lokaal. Een draad of
          bus die <strong className="text-(--sb-hoog)">oranje</strong> kleurt is
          hoog (5 V), grijs is laag (0 V).{" "}
          <a
            href="/systeembord/over/"
            className="font-medium text-(--accent) hover:underline"
          >
            Over deze tool →
          </a>
        </p>

        <ul className="flex flex-col gap-2.5">
          <Row k="draad">
            Sleep van de ene bus naar de andere. Op het digibord kan het ook met
            twee tikken: eerst de ene bus, dan de andere. Een draad loopt altijd
            van een uitgang naar een ingang. Ligt een draad in de weg, sleep hem
            dan aan zijn midden opzij.
          </Row>
          <Row k="weg">
            Tik een draad of losse module aan en kies <em>Draad weg</em> of{" "}
            <em>Module weg</em> (of de Delete-toets).
          </Row>
          <Row k="knop">
            Druk op een drukschakelaar zolang je hem vasthoudt. Met het slotje
            ernaast blijft hij staan: dan werkt hij als schakelaar.
          </Row>
          <Row k="draaiknop">
            Sleep rond een draaiknop, gebruik het muiswiel erboven, of tik op
            het vakje met de waarde en typ een getal (bijvoorbeeld 2,5).
          </Row>
          <Row k="sensor">
            Tik in een vak <em>sensor</em> op het keuzeknopje en kies wat erin
            zit: een draaiknop (zoals in de eerste weken), een lichtsensor of
            een temperatuursensor.
          </Row>
          <Row k="relais">
            Tik op het keuzeknopje in het vak van het relais en kies een lamp,
            kachel of ventilator. Zodra er een draad naar het relais loopt,
            verschijnt een tweede stroomkring met een voeding van 12 V. De
            voeding zit aan de onderste twee zwarte bussen van het relais, het
            apparaat aan de bovenste twee. Is het relais dicht, dan loopt er
            stroom en kleuren de snoeren oranje.
          </Row>
          <Row k="verslepen">
            De losse sensor (LDR of NTC) en het apparaat kun je verslepen. De
            lamp schijnt als een straatlantaarn naar beneden, de kachel verwarmt
            wat dichtbij is en de ventilator blaast naar rechts.
          </Row>
          <Row k="Omgeving">
            Stel het daglicht en de omgevingstemperatuur in. De kachel zet je
            niet hier aan, maar met je schakeling via het relais.
          </Row>
          <Row k="geluid">
            Tik op de geluidsensor om een tik op het bord na te doen.
          </Row>
          <Row k="Voltmeter">
            Sleep de rode pen naar een bus om de spanning te meten. De min zit
            aan de aarde.
          </Row>
          <Row k="Tabel">
            De waarheidstabel van je schakeling, met de drukschakelaars als
            invoer. Kies <em>Zelf invullen</em> om te oefenen; tik op een rij om
            de knoppen zo te zetten.
          </Row>
          <Row k="Module">
            Zet extra modules op het werkvlak, zoveel als je wilt. Onder{" "}
            <em>Extra</em> staan poorten die niet op het echte bord zitten
            (NAND, NOR, XOR, XNOR).
          </Row>
          <Row k="Bord">
            Begin opnieuw met een ander bord, of zet een tweede bord ernaast.
          </Row>
          <Row k="Bestand">
            Opslaan, openen, of een link kopiëren waarmee een ander precies jouw
            schakeling krijgt. Je werk wordt in deze browser ook vanzelf
            bewaard.
          </Row>
          <Row k="zoom">
            Scrollwiel of twee vingers; slepen op een lege plek schuift. Toets 0
            zet alles in beeld.
          </Row>
        </ul>

        <h3 className="mt-5 mb-2 font-display font-semibold text-(--text-primary)">
          Zo sluit je het aan: een lamp die aangaat als het donker is
        </h3>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-(--text-secondary)">
          <li>
            Tik in een vak <em>sensor</em> op het keuzeknopje en kies{" "}
            <em>Lichtsensor (LDR)</em>.
          </li>
          <li>
            Trek draden: gele bus van de lichtsensor → comparator → invertor →
            witte bus van het relais. Donker geeft een lage spanning, de
            comparator wordt laag, de invertor maakt er hoog van en het relais
            klapt om.
          </li>
          <li>
            Tik in het vak van het relais op het keuzeknopje en kies{" "}
            <em>Lamp</em>. Een draad naar de lamp hoeft niet: de lamp zit met
            twee snoeren aan de bovenste zwarte bussen van het relais, de
            voeding van 12 V aan de onderste twee. De lamp hangt linksboven de
            LDR en schijnt erop.
          </li>
          <li>
            Zet in <em>Omgeving</em> het daglicht laag. De lamp gaat aan, maar
            zijn licht valt op de sensor… Wat gebeurt er dan?
          </li>
        </ol>
        <p className="mt-2 text-sm text-(--text-secondary)">
          Een thermostaat werkt net zo: temperatuursensor → comparator →
          invertor → relais met een kachel.
        </p>

        <div className="mt-5 border-t border-(--border-solid) pt-4 text-sm text-(--text-secondary)">
          <a
            href="/systeembord/over/"
            className="font-medium text-(--accent) hover:underline"
          >
            Over deze tool: achtergrond, voor docenten en met dank aan →
          </a>
          <br />
          Feedback of een fout gevonden?{" "}
          <a
            href="/contact/"
            className="font-medium text-(--accent) hover:underline"
          >
            Laat het weten →
          </a>
        </div>
      </div>
    </div>
  );
}
