import { lichtNaarSpanning, temperatuurNaarSpanning } from "./omgeving";
import { begrens, digitaal, HOOG, isHoog, LAAG } from "./signaal";
import type { Kolom, ModuleSoort, Params, Toestand } from "./types";

/** Wat een module ziet als hij rekent. */
export interface RekenContext {
  /** Spanning op een ingang; een open ingang geeft de waarde uit `open` of 0 V. */
  in: (bus: string) => number;
  params: Params;
  /** Mag gewijzigd worden: geheugen, tellerstand. */
  toestand: Toestand;
  /** Licht (lux) en temperatuur (°C) bij de sensoren. */
  omgeving: { licht: number; temperatuur: number };
}

export interface ModuleDef {
  soort: ModuleSoort;
  /** Naam zoals op het bord. */
  naam: string;
  kolom: Kolom;
  /** Zit niet op het echte bord; alleen los toe te voegen. */
  extra?: boolean;
  /** Hoort bij het bord zelf; niet los toe te voegen (de aardebus). */
  alleenOpBord?: boolean;
  /** Aardebussen: geen in- of uitgang, je verbindt ze alleen met elkaar. */
  aarde?: readonly string[];
  ingangen: readonly string[];
  uitgangen: readonly string[];
  /** Geeft een spanning tussen 0 en 5 V (niet alleen hoog of laag): die staat als getal bij de draad. */
  analoog?: boolean;
  /** Spanning van een ingang zonder draad, als die niet 0 V is. */
  open?: Readonly<Record<string, number>>;
  params: () => Params;
  toestand?: () => Toestand;
  /**
   * Eén keer per tik, vóór het rekenen: alles wat met de tijd verloopt
   * (fase van de pulsgenerator, wegzakken van de geluidsensor).
   */
  tik?: (toestand: Toestand, params: Params, dt: number) => void;
  /**
   * Rekent de uitgangen uit. Wordt per tik zo vaak aangeroepen tot alles stil
   * staat, dus moet bij gelijke ingangen hetzelfde opleveren. Een module met
   * geheugen past zijn toestand meteen aan (een flank is daarna "verbruikt").
   */
  bereken: (ctx: RekenContext) => Record<string, number>;
}

const num = (p: Params, naam: string): number => Number(p[naam] ?? 0);

const poort = (
  soort: ModuleSoort,
  naam: string,
  f: (a: boolean, b: boolean) => boolean,
): ModuleDef => ({
  soort,
  naam,
  kolom: "verwerking",
  ingangen: ["in1", "in2"],
  uitgangen: ["uit"],
  params: () => ({}),
  bereken: (c) => ({
    uit: digitaal(f(isHoog(c.in("in1")), isHoog(c.in("in2")))),
  }),
});

const omkeerder = (soort: ModuleSoort, naam: string): ModuleDef => ({
  soort,
  naam,
  kolom: "verwerking",
  ingangen: ["in"],
  uitgangen: ["uit"],
  params: () => ({}),
  bereken: (c) => ({ uit: digitaal(!isHoog(c.in("in"))) }),
});

const uitvoer = (soort: ModuleSoort, naam: string): ModuleDef => ({
  soort,
  naam,
  kolom: "uitvoer",
  ingangen: ["in"],
  uitgangen: [],
  params: () => ({}),
  bereken: () => ({}),
});

/**
 * Een relais heeft tijd nodig om om te klappen: de spoel moet het anker
 * aantrekken of loslaten. De contacten volgen pas als de ingang zo lang in de
 * nieuwe stand blijft. Zonder deze tijd blijft bijvoorbeeld een straatlantaarn
 * met de sensor onder de lamp (opdracht 8b) razendsnel klapperen in plaats van
 * zichtbaar te knipperen. In s.
 */
export const RELAIS_SCHAKELTIJD = 0.15;

/** Wat er in de bus van een sensor zit; de instelling is de index. */
export const SENSOREN = ["draaiknop", "licht", "temperatuur"] as const;

/** Wat er aan de schakelcontacten van het relais hangt; de instelling is de index. */
export const RELAIS_APPARATEN = ["lamp", "kachel", "ventilator"] as const;

/** Tijdconstante waarmee de geluidsensor na een tik wegzakt, in s. */
export const GELUID_TAU = 0.15;
/** Spanning van de geluidsensor direct na een tik op het bord, in V. */
export const GELUID_PIEK = 4;

const defs: ModuleDef[] = [
  {
    soort: "drukschakelaar",
    naam: "drukschakelaar",
    kolom: "invoer",
    ingangen: [],
    uitgangen: ["uit"],
    // "vast": de knop blijft staan tot je nog eens drukt, als een schakelaar.
    // Zit niet op het echte bord, maar maakt testen een stuk makkelijker.
    params: () => ({ ingedrukt: false, vast: false }),
    bereken: (c) => ({ uit: digitaal(c.params.ingedrukt === true) }),
  },
  {
    soort: "variabeleSpanning",
    analoog: true,
    naam: "variabele spanning",
    kolom: "invoer",
    ingangen: [],
    uitgangen: ["uit"],
    params: () => ({ spanning: 0 }),
    bereken: (c) => ({ uit: begrens(num(c.params, "spanning")) }),
  },
  {
    // Bus voor een losse sensor; welke sensor erin zit en hoe die op zijn
    // omgeving reageert komt in stap 6. Tot dan geeft hij een ingestelde spanning.
    soort: "sensor",
    analoog: true,
    naam: "sensor",
    kolom: "invoer",
    ingangen: [],
    uitgangen: ["uit1", "uit2"],
    // Welke sensor er in de bus zit: een draaiknop (vervanger van een sensor,
    // zoals in week 1 en 2 van het werkboek), een lichtsensor of een temperatuursensor.
    // sx, sy: waar de losse sensor (LDR, NTC) ligt, ten opzichte van het vak.
    params: () => ({
      spanning: 0,
      sensor: SENSOREN.indexOf("draaiknop"),
      sx: -50,
      sy: 39,
    }),
    bereken: (c) => {
      const soort = SENSOREN[num(c.params, "sensor")] ?? "draaiknop";
      const u =
        soort === "licht"
          ? lichtNaarSpanning(c.omgeving.licht)
          : soort === "temperatuur"
            ? temperatuurNaarSpanning(c.omgeving.temperatuur)
            : begrens(num(c.params, "spanning"));
      return { uit1: u, uit2: u };
    },
  },
  {
    soort: "geluidsensor",
    analoog: true,
    naam: "geluidsensor",
    kolom: "invoer",
    ingangen: [],
    uitgangen: ["uit"],
    params: () => ({}),
    toestand: () => ({ niveau: 0 }),
    tik: (t, _p, dt) => {
      t.niveau = Number(t.niveau) * Math.exp(-dt / GELUID_TAU);
      if (Number(t.niveau) < 1e-3) t.niveau = 0;
    },
    bereken: (c) => ({ uit: begrens(Number(c.toestand.niveau)) }),
  },
  {
    soort: "pulsgenerator",
    naam: "pulsgenerator",
    kolom: "invoer",
    ingangen: [],
    uitgangen: ["uit"],
    params: () => ({ frequentie: 1 }),
    toestand: () => ({ fase: 0 }),
    tik: (t, p, dt) => {
      const f = Math.min(10, Math.max(1, num(p, "frequentie")));
      t.fase = (Number(t.fase) + f * dt) % 1;
    },
    // Eerste halve periode laag, dan hoog: de eerste opgaande flank komt na 1/(2f).
    bereken: (c) => ({ uit: digitaal(Number(c.toestand.fase) >= 0.5) }),
  },
  {
    soort: "adOmzetter",
    naam: "AD-omzetter",
    kolom: "invoer",
    ingangen: ["in"],
    uitgangen: ["8", "4", "2", "1"],
    params: () => ({}),
    bereken: (c) => {
      const n = Math.min(15, Math.floor((begrens(c.in("in")) / HOOG) * 16));
      return bits(n);
    },
  },
  {
    soort: "comparator",
    naam: "comparator",
    kolom: "verwerking",
    ingangen: ["in"],
    uitgangen: ["uit"],
    params: () => ({ uref: 2.5 }),
    bereken: (c) => ({ uit: digitaal(c.in("in") > num(c.params, "uref")) }),
  },
  poort("en", "EN-poort", (a, b) => a && b),
  poort("of", "OF-poort", (a, b) => a || b),
  // Niet op het echte bord: handig voor grotere schakelingen, en om te
  // vergelijken met een zelfgebouwde versie uit EN, OF en invertors.
  { ...poort("nand", "NAND-poort", (a, b) => !(a && b)), extra: true },
  { ...poort("nor", "NOR-poort", (a, b) => !(a || b)), extra: true },
  { ...poort("xor", "XOR-poort", (a, b) => a !== b), extra: true },
  { ...poort("xnor", "XNOR-poort", (a, b) => a === b), extra: true },
  omkeerder("invertor", "invertor"),
  // Op het oudere bord; werkt volgens het werkboek als een extra invertor.
  omkeerder("transistor", "transistor"),
  {
    soort: "geheugencel",
    naam: "geheugencel",
    kolom: "verwerking",
    ingangen: ["set", "reset"],
    uitgangen: ["uit"],
    params: () => ({}),
    toestand: () => ({ q: false }),
    bereken: (c) => {
      // Set wint als beide hoog zijn (zoals bij Jeroen van Tilburg; nog na te gaan op het echte bord).
      if (isHoog(c.in("set"))) c.toestand.q = true;
      else if (isHoog(c.in("reset"))) c.toestand.q = false;
      return { uit: digitaal(c.toestand.q === true) };
    },
  },
  {
    soort: "pulsenteller",
    naam: "pulsenteller",
    kolom: "verwerking",
    ingangen: ["tel", "aan", "reset"],
    uitgangen: ["8", "4", "2", "1"],
    // Zonder draad op "tellen aan/uit" telt hij gewoon (werkboek).
    open: { aan: HOOG },
    params: () => ({ max: 15, resetKnop: false }),
    toestand: () => ({ stand: 0, vorigeTel: false }),
    bereken: (c) => {
      const t = c.toestand;
      const tel = isHoog(c.in("tel"));
      if (isHoog(c.in("reset")) || c.params.resetKnop === true) {
        t.stand = 0;
      } else if (tel && t.vorigeTel !== true && isHoog(c.in("aan"))) {
        t.stand =
          Number(t.stand) >= num(c.params, "max") ? 0 : Number(t.stand) + 1;
      }
      t.vorigeTel = tel;
      return bits(Number(t.stand));
    },
  },
  uitvoer("led", "led"),
  uitvoer("zoemer", "zoemer"),
  {
    // Het relais schakelt een apparaat in een tweede stroomkring (max 30 V).
    ...uitvoer("relais", "relais"),
    // verplaatst, ax, ay: het apparaat is zelf neergezet, op (ax, ay) vanaf het vak.
    params: () => ({
      apparaat: RELAIS_APPARATEN.indexOf("lamp"),
      verplaatst: false,
      ax: 0,
      ay: 0,
    }),
    // Of de contacten dicht zijn; zie RELAIS_SCHAKELTIJD.
    toestand: () => ({ gesloten: false, wacht: 0 }),
  },
  {
    // De zwarte bus rechtsonder op het bord, onder het relais: 0 V. Bij twee
    // borden verbind je hun aardes, anders geeft een draad van het ene bord
    // naar het andere geen signaal door.
    soort: "aarde",
    naam: "aarde",
    kolom: "uitvoer",
    alleenOpBord: true,
    ingangen: [],
    uitgangen: [],
    aarde: ["aarde"],
    params: () => ({}),
    bereken: () => ({}),
  },
];

function bits(n: number): Record<string, number> {
  return {
    "8": digitaal((n & 8) !== 0),
    "4": digitaal((n & 4) !== 0),
    "2": digitaal((n & 2) !== 0),
    "1": digitaal((n & 1) !== 0),
  };
}

export const MODULES: Readonly<Record<ModuleSoort, ModuleDef>> =
  Object.fromEntries(defs.map((d) => [d.soort, d])) as Record<
    ModuleSoort,
    ModuleDef
  >;

export const openSpanning = (def: ModuleDef, bus: string): number =>
  def.open?.[bus] ?? LAAG;
