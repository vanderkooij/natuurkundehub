import { isHoog } from "./signaal";
import { Simulator } from "./simulator";
import type { ModuleSoort, Schakeling } from "./types";

/** Modules die iets onthouden of met de tijd veranderen: dan zegt één tabel niet alles. */
const MET_GEHEUGEN: ModuleSoort[] = [
  "geheugencel",
  "pulsenteller",
  "pulsgenerator",
  "geluidsensor",
];
const UITVOER: ModuleSoort[] = ["led", "zoemer", "relais"];

export interface TabelKolom {
  id: string;
  /** Kop van de kolom: A, B … voor knoppen, "led 1", "zoemer" … voor uitvoer. */
  naam: string;
}

export interface Waarheidstabel {
  ingangen: TabelKolom[];
  uitgangen: TabelKolom[];
  /** Per rij: de stand van de knoppen en wat de uitvoer dan doet (true = 1). */
  rijen: { in: boolean[]; uit: boolean[] }[];
  /** Er zit een geheugencel, teller of pulsgenerator in: de tabel is dan niet het hele verhaal. */
  metGeheugen: boolean;
  /** Een terugkoppeling die niet tot rust kwam (bijvoorbeeld een invertor op zichzelf). */
  instabiel: boolean;
  /** Meer knoppen aangesloten dan in de tabel passen. */
  teVeelKnoppen: boolean;
}

export const MAX_KNOPPEN = 4;

/** Welke knoppen en uitvoer in de tabel komen: alleen die waar een draad aan zit. */
export function tabelKolommen(s: Schakeling): {
  ingangen: TabelKolom[];
  uitgangen: TabelKolom[];
} {
  const metDraadUit = new Set(s.draden.map((d) => d.van.module));
  const metDraadIn = new Set(s.draden.map((d) => d.naar.module));
  const knoppen = s.modules.filter(
    (m) => m.soort === "drukschakelaar" && metDraadUit.has(m.id),
  );
  const uitvoer = s.modules.filter(
    (m) => UITVOER.includes(m.soort) && metDraadIn.has(m.id),
  );
  const tel = new Map<ModuleSoort, number>();
  const aantal = new Map<ModuleSoort, number>();
  for (const m of uitvoer) aantal.set(m.soort, (aantal.get(m.soort) ?? 0) + 1);
  return {
    ingangen: knoppen.map((m, i) => ({
      id: m.id,
      naam: String.fromCharCode(65 + i),
    })),
    uitgangen: uitvoer.map((m) => {
      const n = (tel.get(m.soort) ?? 0) + 1;
      tel.set(m.soort, n);
      return {
        id: m.id,
        naam: aantal.get(m.soort)! > 1 ? `${m.soort} ${n}` : m.soort,
      };
    }),
  };
}

/**
 * Loopt alle standen van de knoppen langs (00, 01, 10, 11 …, de eerste knop
 * links, zoals in het werkboek) en kijkt wat de uitvoer doet. Elke rij begint
 * met een schone schakeling, zodat een vorige rij niets doorgeeft.
 */
export function maakWaarheidstabel(s: Schakeling): Waarheidstabel {
  const alle = tabelKolommen(s);
  const ingangen = alle.ingangen.slice(0, MAX_KNOPPEN);
  const { uitgangen } = alle;
  const aangesloten = new Set(
    s.draden.flatMap((d) => [d.van.module, d.naar.module]),
  );
  const metGeheugen = s.modules.some(
    (m) => MET_GEHEUGEN.includes(m.soort) && aangesloten.has(m.id),
  );
  const rijen: Waarheidstabel["rijen"] = [];
  let instabiel = false;
  const n = ingangen.length;
  for (let k = 0; k < 2 ** n; k++) {
    const stand = ingangen.map((_, i) => ((k >> (n - 1 - i)) & 1) === 1);
    const kopie: Schakeling = {
      ...s,
      modules: s.modules.map((m) => {
        const i = ingangen.findIndex((x) => x.id === m.id);
        return i >= 0
          ? { ...m, params: { ...m.params, ingedrukt: stand[i] } }
          : m;
      }),
    };
    const sim = new Simulator(kopie);
    instabiel ||= sim.instabiel;
    rijen.push({
      in: stand,
      uit: uitgangen.map((u) => isHoog(sim.spanning(u.id, "in"))),
    });
  }
  return {
    ingangen,
    uitgangen,
    rijen,
    metGeheugen,
    instabiel,
    teVeelKnoppen: alle.ingangen.length > MAX_KNOPPEN,
  };
}

/** Controle van een zelf ingevulde tabel: per cel goed, fout of nog leeg. */
export function controleer(
  tabel: Waarheidstabel,
  ingevuld: (boolean | null)[][],
): { cellen: ("goed" | "fout" | "leeg")[][]; goed: number; totaal: number } {
  let goed = 0;
  const cellen = tabel.rijen.map((rij, r) =>
    rij.uit.map((juist, k) => {
      const v = ingevuld[r]?.[k] ?? null;
      if (v === null) return "leeg" as const;
      if (v === juist) {
        goed++;
        return "goed" as const;
      }
      return "fout" as const;
    }),
  );
  return { cellen, goed, totaal: tabel.rijen.length * tabel.uitgangen.length };
}

export interface Herkenning {
  naam: string;
  uitleg: string;
}

/**
 * Herkent bekende functies in één uitvoerkolom: EN, OF, NAND, NOR, XOR, XNOR,
 * en ook "gelijk aan A", "NIET A" en "A EN NIET B" (opdracht 19). Geeft null
 * als het geen bekend patroon is.
 */
export function herken(
  tabel: Waarheidstabel,
  kolom: number,
): Herkenning | null {
  const namen = tabel.ingangen.map((k) => k.naam);
  const n = namen.length;
  if (n === 0) return null;
  const uit = tabel.rijen.map((r) => r.uit[kolom]);
  const isGelijk = (f: (inp: boolean[]) => boolean) =>
    tabel.rijen.every((r, i) => f(r.in) === uit[i]);
  const lijst =
    namen.length === 2 ? `${namen[0]} en ${namen[1]}` : namen.join(", ");

  if (uit.every((v) => !v))
    return {
      naam: "altijd 0",
      uitleg: "De uitvoer blijft altijd laag, wat je ook indrukt.",
    };
  if (uit.every((v) => v))
    return {
      naam: "altijd 1",
      uitleg: "De uitvoer is altijd hoog, wat je ook indrukt.",
    };

  // Hangt maar van één knop af?
  for (let i = 0; i < n; i++) {
    if (isGelijk((inp) => inp[i]))
      return n === 1
        ? {
            naam: "doorgeven",
            uitleg: `De uitvoer doet precies wat knop ${namen[i]} doet.`,
          }
        : {
            naam: `gelijk aan ${namen[i]}`,
            uitleg: `Alleen knop ${namen[i]} doet ertoe; de andere knoppen maken niets uit.`,
          };
    if (isGelijk((inp) => !inp[i]))
      return {
        naam: `NIET ${namen[i]} (invertor)`,
        uitleg: `De uitvoer is het omgekeerde van knop ${namen[i]}${n > 1 ? "; de andere knoppen maken niets uit" : ""}.`,
      };
  }
  if (n < 2) return null;

  const aantal = (inp: boolean[]) => inp.filter(Boolean).length;
  if (isGelijk((inp) => inp.every(Boolean)))
    return {
      naam: "EN",
      uitleg: `Alleen hoog als ${n === 2 ? "beide knoppen" : "alle knoppen"} (${lijst}) ingedrukt zijn.`,
    };
  if (isGelijk((inp) => inp.some(Boolean)))
    return {
      naam: "OF",
      uitleg: `Hoog zodra minstens één van de knoppen (${lijst}) ingedrukt is.`,
    };
  if (isGelijk((inp) => !inp.every(Boolean)))
    return {
      naam: "NAND (NIET-EN)",
      uitleg: `Het omgekeerde van EN: alleen laag als ${n === 2 ? "beide knoppen" : "alle knoppen"} ingedrukt zijn.`,
    };
  if (isGelijk((inp) => !inp.some(Boolean)))
    return {
      naam: "NOR (NIET-OF)",
      uitleg:
        "Het omgekeerde van OF: alleen hoog als geen enkele knop ingedrukt is.",
    };
  if (isGelijk((inp) => aantal(inp) % 2 === 1))
    return n === 2
      ? {
          naam: "XOR (exclusieve OF)",
          uitleg:
            "Hoog als precies één van de twee knoppen ingedrukt is, niet allebei.",
        }
      : {
          naam: "XOR (oneven)",
          uitleg: "Hoog als een oneven aantal knoppen ingedrukt is.",
        };
  if (isGelijk((inp) => aantal(inp) % 2 === 0))
    return n === 2
      ? {
          naam: "XNOR (gelijk)",
          uitleg:
            "Hoog als beide knoppen hetzelfde staan: allebei in of allebei uit.",
        }
      : {
          naam: "XNOR (even)",
          uitleg: "Hoog als een even aantal knoppen ingedrukt is.",
        };

  // Twee knoppen: de ene wel, de andere niet (zoals opdracht 19).
  if (n === 2) {
    const [a, b] = namen;
    if (isGelijk(([x, y]) => x && !y))
      return {
        naam: `${a} EN NIET ${b}`,
        uitleg: `Hoog als ${a} ingedrukt is en ${b} niet.`,
      };
    if (isGelijk(([x, y]) => !x && y))
      return {
        naam: `NIET ${a} EN ${b}`,
        uitleg: `Hoog als ${b} ingedrukt is en ${a} niet.`,
      };
    if (isGelijk(([x, y]) => x || !y))
      return {
        naam: `${a} OF NIET ${b}`,
        uitleg: `Hoog als ${a} ingedrukt is, of als ${b} niet ingedrukt is.`,
      };
    if (isGelijk(([x, y]) => !x || y))
      return {
        naam: `NIET ${a} OF ${b}`,
        uitleg: `Hoog als ${b} ingedrukt is, of als ${a} niet ingedrukt is.`,
      };
  }
  return null;
}
