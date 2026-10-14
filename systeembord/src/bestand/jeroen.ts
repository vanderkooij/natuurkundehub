import { maakBord } from "@/bord/borden";
import {
  maakModule,
  SENSOREN,
  standaardOmgeving,
  type Draad,
  type ModuleInstantie,
  type ModuleSoort,
  type Params,
  type Schakeling,
} from "@/sim";

/**
 * Leest een bestand van het online systeembord van Jeroen van Tilburg
 * (github.com/jeroenvantilburg/systeembord, MIT-licentie) in. Zijn formaat:
 * een lijst <element name="…" x="…" y="…">, en per element de draden die op
 * zijn ingangen binnenkomen: <link id="eigen aansluiting" toElement="bron"
 * toNode="aansluiting van de bron"/>. De nummering van de aansluitingen volgt
 * zijn code (this.nodes per element).
 */

interface Vertaling {
  soort: ModuleSoort;
  /** Onze bus per aansluitnummer bij Jeroen. */
  bussen: (string | null)[];
  params?: (attr: Record<string, string>) => Params;
}

const getal = (v: string | undefined, standaard: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : standaard;
};

const VERTALING: Record<string, Vertaling> = {
  Switch: { soort: "drukschakelaar", bussen: ["uit"] },
  ToggleSwitch: {
    soort: "drukschakelaar",
    bussen: ["uit"],
    params: () => ({ vast: true }),
  },
  LightSensor: {
    soort: "sensor",
    bussen: ["uit1"],
    params: () => ({ sensor: SENSOREN.indexOf("licht") }),
  },
  TemperatureSensor: {
    soort: "sensor",
    bussen: ["uit1"],
    params: () => ({ sensor: SENSOREN.indexOf("temperatuur") }),
  },
  SoundSensor: { soort: "geluidsensor", bussen: ["uit"] },
  VarVoltage: {
    soort: "variabeleSpanning",
    bussen: ["uit"],
    params: (a) => ({ spanning: getal(a.inputValue, 0) }),
  },
  Pulse: {
    soort: "pulsgenerator",
    bussen: ["uit"],
    params: (a) => ({ frequentie: getal(a.inputValue, 1) }),
  },
  ADC: { soort: "adOmzetter", bussen: ["in", "8", "4", "2", "1"] },
  Comparator: {
    soort: "comparator",
    bussen: ["in", "uit"],
    params: (a) => ({ uref: getal(a.inputValue, 2.5) }),
  },
  ANDPort: { soort: "en", bussen: ["in1", "in2", "uit"] },
  ORPort: { soort: "of", bussen: ["in1", "in2", "uit"] },
  NOTPort: { soort: "invertor", bussen: ["in", "uit"] },
  NANDPort: { soort: "nand", bussen: ["in1", "in2", "uit"] },
  NORPort: { soort: "nor", bussen: ["in1", "in2", "uit"] },
  XORPort: { soort: "xor", bussen: ["in1", "in2", "uit"] },
  XNORPort: { soort: "xnor", bussen: ["in1", "in2", "uit"] },
  Memory: { soort: "geheugencel", bussen: ["set", "reset", "uit"] },
  Counter: {
    soort: "pulsenteller",
    bussen: ["reset", "aan", "tel", "8", "4", "2", "1"],
  },
  LED: { soort: "led", bussen: ["in"] },
  Buzzer: { soort: "zoemer", bussen: ["in"] },
  // De schakelcontacten van het relais (aansluiting 1 en 2) gaan bij ons naar een apparaat.
  Relais: { soort: "relais", bussen: ["in", null, null] },
};

/** Elementen zonder tegenhanger die we stil overslaan (decoratie, eigen meetinstrumenten). */
const STIL = new Set([
  "TextElement",
  "Voltmeter",
  "Lightbulb",
  "Heater",
  "Board",
]);

/** Zijn bord is 640 px breed, het onze 916: alles een factor groter. */
const SCHAAL = 1.45;

interface Element {
  naam: string;
  attr: Record<string, string>;
  links: { id: number; toElement: number; toNode: number }[];
}

function attributen(tekst: string): Record<string, string> {
  const a: Record<string, string> = {};
  for (const m of tekst.matchAll(/(\w+)="([^"]*)"/g)) a[m[1]] = m[2];
  return a;
}

/** Eenvoudige lezer voor dit vaste, platte formaat (werkt ook buiten de browser). */
export function leesElementen(xml: string): Element[] | null {
  if (!/<systeembord[\s>]/.test(xml)) return null;
  const uit: Element[] = [];
  for (const m of xml.matchAll(
    /<element\b([^>]*?)(\/>|>([\s\S]*?)<\/element>)/g,
  )) {
    const attr = attributen(m[1]);
    const links = [...(m[3] ?? "").matchAll(/<link\b([^>]*)\/?>/g)].map((l) => {
      const a = attributen(l[1]);
      return {
        id: Number(a.id),
        toElement: Number(a.toElement),
        toNode: Number(a.toNode),
      };
    });
    uit.push({ naam: attr.name ?? "", attr, links });
  }
  return uit;
}

export type JeroenResultaat =
  | { ok: true; schakeling: Schakeling; overgeslagen: string[] }
  | { ok: false; fout: string };

/**
 * Zet zijn schakeling om. Staat er een bord in zijn bestand, dan wordt dat ons
 * bord met twee comparators, en komen zijn modules op dat bord in volgorde
 * terecht. Wat er niet meer op past, of buiten zijn bord lag, wordt een losse
 * module op dezelfde plek.
 */
export function vanJeroen(xml: string): JeroenResultaat {
  const elementen = leesElementen(xml);
  if (!elementen)
    return {
      ok: false,
      fout: "Dit is geen bestand van het online systeembord.",
    };

  const bordEl = elementen.find((e) => e.naam === "Board");
  const bordRect = bordEl
    ? { x: getal(bordEl.attr.x, 0), y: getal(bordEl.attr.y, 0), b: 640, h: 474 }
    : null;
  const { bord, modules: bordModules } = bordEl
    ? maakBord("comparators", "b0", 0, 0)
    : { bord: null, modules: [] as ModuleInstantie[] };
  const vrij = [...bordModules];

  const modules: ModuleInstantie[] = [...bordModules];
  const perIndex = new Map<number, ModuleInstantie>();
  const overgeslagen = new Map<string, number>();
  const relaisApparaat = new Map<number, number>();

  elementen.forEach((e, i) => {
    const v = VERTALING[e.naam];
    if (!v) {
      if (!STIL.has(e.naam))
        overgeslagen.set(e.naam, (overgeslagen.get(e.naam) ?? 0) + 1);
      return;
    }
    const x = getal(e.attr.x, 0),
      y = getal(e.attr.y, 0);
    const opBord =
      bordRect &&
      x >= bordRect.x &&
      x < bordRect.x + bordRect.b &&
      y >= bordRect.y &&
      y < bordRect.y + bordRect.h;
    const params = v.params?.(e.attr) ?? {};
    // Op het bord: de eerstvolgende vrije module van dezelfde soort.
    const plek = opBord ? vrij.findIndex((m) => m.soort === v.soort) : -1;
    let m: ModuleInstantie;
    if (plek >= 0) {
      m = vrij.splice(plek, 1)[0];
      m.params = { ...m.params, ...params };
    } else {
      m = maakModule(
        v.soort,
        `j${i}`,
        Math.round(x * SCHAAL),
        Math.round(y * SCHAAL),
        params,
      );
      modules.push(m);
    }
    perIndex.set(i, m);
  });

  // Apparaat aan het relais: een lamp of kachel waarvan een ingang aan het relais hangt.
  elementen.forEach((e) => {
    if (e.naam !== "Lightbulb" && e.naam !== "Heater") return;
    for (const l of e.links) {
      if (elementen[l.toElement]?.naam === "Relais")
        relaisApparaat.set(l.toElement, e.naam === "Lightbulb" ? 0 : 1);
    }
  });
  for (const [i, apparaat] of relaisApparaat) {
    const m = perIndex.get(i);
    if (m) m.params = { ...m.params, apparaat };
  }

  const draden: Draad[] = [];
  const bezet = new Set<string>();
  elementen.forEach((e, i) => {
    const naar = perIndex.get(i);
    const vNaar = VERTALING[e.naam];
    if (!naar || !vNaar) return;
    for (const l of e.links) {
      const van = perIndex.get(l.toElement);
      const vVan = VERTALING[elementen[l.toElement]?.naam ?? ""];
      const busNaar = vNaar.bussen[l.id];
      const busVan = vVan?.bussen[l.toNode];
      if (!van || !busNaar || !busVan) continue;
      const sleutel = `${naar.id}.${busNaar}`;
      if (bezet.has(sleutel)) continue;
      bezet.add(sleutel);
      draden.push({
        id: `d${draden.length}`,
        van: { module: van.id, bus: busVan },
        naar: { module: naar.id, bus: busNaar },
      });
    }
  });

  return {
    ok: true,
    schakeling: {
      borden: bord ? [bord] : [],
      modules,
      draden,
      omgeving: standaardOmgeving(),
    },
    overgeslagen: [...overgeslagen].map(([naam, n]) =>
      n > 1 ? `${naam} (${n}×)` : naam,
    ),
  };
}
