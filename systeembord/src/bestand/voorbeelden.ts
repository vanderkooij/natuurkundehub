import { maakBord } from "@/bord/borden";
import {
  maakModule,
  RELAIS_APPARATEN,
  SENSOREN,
  standaardOmgeving,
  temperatuurNaarSpanning,
  voegDraadToe,
  type ModuleSoort,
  type Params,
  type Schakeling,
} from "@/sim";

/**
 * Voorbeeldschakelingen voor de docent, op het bord met twee comparators.
 * Niet in het gewone menu, omdat een deel het antwoord is op een opdracht uit
 * het werkboek. Te openen met de docentenlink: /systeembord/?docent.
 * Geheim is dat niet (wie de broncode leest vindt het), alleen uit het zicht.
 */
export const DOCENT_PARAMETER = "docent";

/** Eén vorm in de flowchart: een stap (rechthoek) of een keuze (ruit, met ja en nee). */
export type FlowStap =
  | { stap: string }
  | { vraag: string; ja?: string; nee?: string };

export interface Voorbeeld {
  naam: string;
  uitleg: string;
  /** Wat de schakeling moet doen, zoals stap 1 van het stappenplan in het werkboek. */
  eisen: string;
  flowchart: FlowStap[];
  maak: () => Schakeling;
}

/** Hulp om een voorbeeld op het bord te bouwen: modules op naam, draden als "soort n.bus". */
function opBord(bouw: (b: Bouwer) => void): Schakeling {
  const { bord, modules } = maakBord("comparators", "b0");
  let s: Schakeling = {
    borden: [bord],
    modules,
    draden: [],
    omgeving: standaardOmgeving(),
  };
  const id = (soort: ModuleSoort, n = 1) => {
    const m = s.modules.filter((x) => x.soort === soort)[n - 1];
    if (!m) throw new Error(`Geen ${soort} ${n} op het bord`);
    return m.id;
  };
  const b: Bouwer = {
    id,
    draad: (van, naar) => {
      const r = voegDraadToe(s, van, naar, `d${s.draden.length}`);
      if (r.fout) throw new Error(r.fout);
      s = r.schakeling;
    },
    zet: (moduleId, params) => {
      s = {
        ...s,
        modules: s.modules.map((m) =>
          m.id === moduleId ? { ...m, params: { ...m.params, ...params } } : m,
        ),
      };
    },
    los: (soort, x, y, params = {}) => {
      const m = maakModule(soort, `los${s.modules.length}`, x, y, params);
      s = { ...s, modules: [...s.modules, m] };
      return m.id;
    },
    omgeving: (o) => {
      s = { ...s, omgeving: { ...standaardOmgeving(), ...s.omgeving, ...o } };
    },
  };
  bouw(b);
  return s;
}

interface Bouwer {
  id: (soort: ModuleSoort, n?: number) => string;
  draad: (
    van: { module: string; bus: string },
    naar: { module: string; bus: string },
  ) => void;
  zet: (moduleId: string, params: Params) => void;
  los: (soort: ModuleSoort, x: number, y: number, params?: Params) => string;
  omgeving: (o: Partial<NonNullable<Schakeling["omgeving"]>>) => void;
}

const bus = (module: string, b: string) => ({ module, bus: b });

export const VOORBEELDEN: Voorbeeld[] = [
  {
    naam: "Geheugencel",
    eisen:
      "De led gaat aan als je knop 1 indrukt en blijft aan als je hem loslaat. De led gaat uit als je knop 2 indrukt.",
    flowchart: [
      { vraag: "knop 1 ingedrukt?", ja: "onthoud: led aan" },
      { vraag: "knop 2 ingedrukt?", ja: "vergeet: led uit" },
    ],
    uitleg:
      "Knop 1 op set, knop 2 op reset, de led laat zien wat de geheugencel onthoudt.",
    maak: () =>
      opBord(({ id, draad }) => {
        draad(
          bus(id("drukschakelaar", 1), "uit"),
          bus(id("geheugencel"), "set"),
        );
        draad(
          bus(id("drukschakelaar", 2), "uit"),
          bus(id("geheugencel"), "reset"),
        );
        draad(bus(id("geheugencel"), "uit"), bus(id("led", 1), "in"));
      }),
  },
  {
    naam: "Teller op de pulsgenerator",
    eisen:
      "Elke seconde telt de teller één verder. De leds laten de stand zien.",
    flowchart: [
      { stap: "wacht op een puls (elke seconde)" },
      { stap: "tel één verder" },
      { stap: "laat de stand zien op de leds" },
    ],
    uitleg:
      "De pulsgenerator op 1 Hz telt de seconden; de vier leds tonen de uitgangen 8, 4, 2 en 1.",
    maak: () =>
      opBord(({ id, draad }) => {
        draad(bus(id("pulsgenerator"), "uit"), bus(id("pulsenteller"), "tel"));
        ["8", "4", "2", "1"].forEach((b, i) =>
          draad(bus(id("pulsenteller"), b), bus(id("led", i + 1), "in")),
        );
      }),
  },
  {
    naam: "Comparator met led",
    eisen:
      "De led brandt als de spanning hoger is dan 2,5 V. Anders is de led uit.",
    flowchart: [
      { stap: "lees de spanning" },
      { vraag: "hoger dan 2,5 V?", ja: "led aan", nee: "led uit" },
    ],
    uitleg:
      "Draai aan de variabele spanning: boven Uref (2,5 V) gaat de led aan.",
    maak: () =>
      opBord(({ id, draad, zet }) => {
        zet(id("variabeleSpanning"), { spanning: 2 });
        draad(
          bus(id("variabeleSpanning"), "uit"),
          bus(id("comparator", 1), "in"),
        );
        draad(bus(id("comparator", 1), "uit"), bus(id("led", 1), "in"));
      }),
  },
  {
    naam: "XOR van EN, OF en een invertor",
    eisen:
      "De led brandt als knop 1 of knop 2 is ingedrukt, maar niet als ze allebei zijn ingedrukt.",
    flowchart: [
      { stap: "lees knop 1 en knop 2" },
      { vraag: "precies één knop ingedrukt?", ja: "led aan", nee: "led uit" },
    ],
    uitleg:
      "(A OF B) EN NIET (A EN B): de led brandt als precies één knop is ingedrukt.",
    maak: () =>
      opBord(({ id, draad }) => {
        const [a, b] = [id("drukschakelaar", 1), id("drukschakelaar", 2)];
        draad(bus(a, "uit"), bus(id("of"), "in1"));
        draad(bus(b, "uit"), bus(id("of"), "in2"));
        draad(bus(a, "uit"), bus(id("en", 1), "in1"));
        draad(bus(b, "uit"), bus(id("en", 1), "in2"));
        draad(bus(id("en", 1), "uit"), bus(id("invertor", 1), "in"));
        draad(bus(id("of"), "uit"), bus(id("en", 2), "in1"));
        draad(bus(id("invertor", 1), "uit"), bus(id("en", 2), "in2"));
        draad(bus(id("en", 2), "uit"), bus(id("led", 1), "in"));
      }),
  },
  {
    naam: "Thermostaat (regelsysteem)",
    eisen:
      "De kachel gaat aan als het kouder is dan 30 °C. De kachel gaat uit als het 30 °C of warmer is.",
    flowchart: [
      { stap: "meet de temperatuur" },
      { vraag: "kouder dan 30 °C?", ja: "kachel aan", nee: "kachel uit" },
    ],
    uitleg:
      "Temperatuursensor, comparator op 30 °C, invertor en een kachel aan het relais: de temperatuur blijft rond 30 °C.",
    maak: () =>
      opBord(({ id, draad, zet }) => {
        zet(id("sensor", 1), { sensor: SENSOREN.indexOf("temperatuur") });
        zet(id("comparator", 1), {
          uref: Math.round(temperatuurNaarSpanning(30) * 10) / 10,
        });
        zet(id("relais"), { apparaat: RELAIS_APPARATEN.indexOf("kachel") });
        draad(bus(id("sensor", 1), "uit1"), bus(id("comparator", 1), "in"));
        draad(bus(id("comparator", 1), "uit"), bus(id("invertor", 1), "in"));
        draad(bus(id("invertor", 1), "uit"), bus(id("relais"), "in"));
      }),
  },
  {
    naam: "Straatlantaarn met de sensor onder de lamp",
    eisen:
      "De lamp gaat aan als het donker is en uit als het licht is. Hier schijnt de lamp op zijn eigen sensor.",
    flowchart: [
      { stap: "meet het licht" },
      { vraag: "donker?", ja: "lamp aan", nee: "lamp uit" },
    ],
    uitleg:
      "Donker: de lamp gaat aan, maar zijn licht valt op de sensor. De lamp gaat knipperen.",
    maak: () =>
      opBord(({ id, draad, zet, omgeving }) => {
        omgeving({ licht: 20 });
        zet(id("sensor", 1), { sensor: SENSOREN.indexOf("licht") });
        zet(id("comparator", 1), { uref: 2 });
        zet(id("relais"), { apparaat: RELAIS_APPARATEN.indexOf("lamp") });
        draad(bus(id("sensor", 1), "uit1"), bus(id("comparator", 1), "in"));
        draad(bus(id("comparator", 1), "uit"), bus(id("invertor", 1), "in"));
        draad(bus(id("invertor", 1), "uit"), bus(id("relais"), "in"));
      }),
  },
  {
    naam: "Knipperlicht",
    eisen:
      "Na een druk op knop 1 knippert de led: 1 s aan, 1 s uit. Na een druk op knop 2 stopt het knipperen.",
    flowchart: [
      { vraag: "knop 1 ingedrukt?", ja: "onthoud: tellen aan" },
      { vraag: "knop 2 ingedrukt?", ja: "onthoud: tellen uit" },
      { stap: "led volgt uitgang 1 van de teller" },
    ],
    uitleg:
      "Knop 1 zet de geheugencel, die zet het tellen aan; de led hangt aan uitgang 1. Knop 2 zet uit, soms blijft de led branden.",
    maak: () =>
      opBord(({ id, draad }) => {
        draad(
          bus(id("drukschakelaar", 1), "uit"),
          bus(id("geheugencel"), "set"),
        );
        draad(
          bus(id("drukschakelaar", 2), "uit"),
          bus(id("geheugencel"), "reset"),
        );
        draad(bus(id("geheugencel"), "uit"), bus(id("pulsenteller"), "aan"));
        draad(bus(id("pulsgenerator"), "uit"), bus(id("pulsenteller"), "tel"));
        draad(bus(id("pulsenteller"), "1"), bus(id("led", 1), "in"));
      }),
  },
  {
    naam: "Gangverlichting",
    eisen:
      "De lampen gaan aan als het minstens 6 seconden te donker is. Met de drukschakelaar gaan ze weer uit.",
    flowchart: [
      { stap: "meet het licht" },
      { vraag: "donker?", ja: "tel de seconden", nee: "teller op 0" },
      { vraag: "6 seconden geteld?", ja: "onthoud: lamp aan" },
      { vraag: "knop ingedrukt?", ja: "vergeet: lamp uit" },
    ],
    uitleg:
      "Variabele spanning als lichtsensor. Na 6 s donker gaat de led aan; knop 1 zet hem uit.",
    maak: () =>
      opBord(({ id, draad, zet }) => {
        zet(id("variabeleSpanning"), { spanning: 4 });
        zet(id("comparator", 1), { uref: 2 });
        draad(
          bus(id("variabeleSpanning"), "uit"),
          bus(id("comparator", 1), "in"),
        );
        draad(
          bus(id("comparator", 1), "uit"),
          bus(id("pulsenteller"), "reset"),
        );
        draad(bus(id("pulsgenerator"), "uit"), bus(id("pulsenteller"), "tel"));
        draad(bus(id("pulsenteller"), "4"), bus(id("en", 1), "in1"));
        draad(bus(id("pulsenteller"), "2"), bus(id("en", 1), "in2"));
        draad(bus(id("en", 1), "uit"), bus(id("geheugencel"), "set"));
        draad(
          bus(id("drukschakelaar", 1), "uit"),
          bus(id("geheugencel"), "reset"),
        );
        draad(bus(id("geheugencel"), "uit"), bus(id("led", 1), "in"));
      }),
  },
  {
    naam: "Piep na 8 seconden na een druk op de knop",
    eisen:
      "Na een druk op knop 1 piept de zoemer na 8 seconden. Knop 2 zet alles terug.",
    flowchart: [
      { vraag: "knop 1 ingedrukt?", ja: "onthoud: tellen aan" },
      { vraag: "8 seconden geteld?", ja: "zoemer aan" },
      { vraag: "knop 2 ingedrukt?", ja: "teller op 0, tellen uit" },
    ],
    uitleg:
      "Uit de oude systeembord-exe. Knop 1 start, na 8 tellen piept de zoemer; knop 2 zet alles terug.",
    maak: () =>
      opBord(({ id, draad }) => {
        draad(
          bus(id("drukschakelaar", 1), "uit"),
          bus(id("geheugencel"), "set"),
        );
        draad(
          bus(id("drukschakelaar", 2), "uit"),
          bus(id("geheugencel"), "reset"),
        );
        draad(
          bus(id("drukschakelaar", 2), "uit"),
          bus(id("pulsenteller"), "reset"),
        );
        draad(bus(id("geheugencel"), "uit"), bus(id("pulsenteller"), "aan"));
        draad(bus(id("pulsgenerator"), "uit"), bus(id("pulsenteller"), "tel"));
        draad(bus(id("pulsenteller"), "8"), bus(id("zoemer"), "in"));
      }),
  },
  {
    naam: "Tel vanaf een knal tot het donker wordt",
    eisen:
      "Een knal zet de teller op 0 en start het tellen. Wordt het donker, dan stopt het tellen. De teller laat de seconden ertussen zien.",
    flowchart: [
      { vraag: "knal?", ja: "teller op 0, tellen aan" },
      { vraag: "donker?", ja: "tellen uit" },
      { stap: "tel de seconden zolang het tellen aan staat" },
    ],
    uitleg:
      "Uit de oude systeembord-exe. Tik op de geluidsensor, zet daarna het daglicht laag: de teller toont de seconden ertussen.",
    maak: () =>
      opBord(({ id, draad, zet }) => {
        zet(id("sensor", 1), { sensor: SENSOREN.indexOf("licht") });
        zet(id("comparator", 1), { uref: 2 });
        zet(id("comparator", 2), { uref: 2 });
        draad(bus(id("geluidsensor"), "uit"), bus(id("comparator", 1), "in"));
        draad(bus(id("comparator", 1), "uit"), bus(id("geheugencel"), "set"));
        // De knal zet de teller ook op 0, anders telt hij door vanaf de vorige meting.
        draad(
          bus(id("comparator", 1), "uit"),
          bus(id("pulsenteller"), "reset"),
        );
        draad(bus(id("sensor", 1), "uit1"), bus(id("comparator", 2), "in"));
        draad(bus(id("comparator", 2), "uit"), bus(id("invertor", 1), "in"));
        draad(bus(id("invertor", 1), "uit"), bus(id("geheugencel"), "reset"));
        draad(bus(id("geheugencel"), "uit"), bus(id("pulsenteller"), "aan"));
        draad(bus(id("pulsgenerator"), "uit"), bus(id("pulsenteller"), "tel"));
      }),
  },
  {
    naam: "Afwisselend pieppatroon",
    eisen:
      "De zoemer piept een seconde lang snel achter elkaar en is dan een seconde stil. Dat herhaalt zich steeds.",
    flowchart: [
      { stap: "tel de seconden" },
      {
        vraag: "uitgang 1 van de teller hoog?",
        ja: "zoemer piept 5 keer per seconde",
        nee: "zoemer stil",
      },
    ],
    uitleg:
      "Uit de oude systeembord-exe. Een tweede pulsgenerator (los, 5 Hz) geeft de piepjes; de teller zet ze om de seconde aan en uit.",
    maak: () =>
      opBord(({ id, draad, los }) => {
        const snel = los("pulsgenerator", -280, 760, { frequentie: 5 });
        draad(bus(id("pulsgenerator"), "uit"), bus(id("pulsenteller"), "tel"));
        draad(bus(id("pulsenteller"), "1"), bus(id("en", 1), "in1"));
        draad(bus(snel, "uit"), bus(id("en", 1), "in2"));
        draad(bus(id("en", 1), "uit"), bus(id("zoemer"), "in"));
      }),
  },
];
