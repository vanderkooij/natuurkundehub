import {
  maakModule,
  type Bord,
  type BordSoort,
  type ModuleInstantie,
  type ModuleSoort,
  type Params,
  type Schakeling,
} from "@/sim";

import type { Rechthoek } from "@/werkvlak/kijkvenster";

import { TUSSENRUIMTE, vormVan } from "./geometrie";

/**
 * De indeling van de twee borden in het lokaal, naar de tekening "Twee soorten
 * borden" in het werkboek. Het bord met twee comparators is het nieuwere en
 * opent standaard; daarop zit ook de AD-omzetter, zoals op het echte bord.
 */

export const BORD_NAAM: Record<BordSoort, string> = {
  comparators: "Bord met twee comparators",
  transistor: "Bord met transistor",
};

/** Kopruimte boven de vakken (INVOER, VERWERKING, UITVOER). */
const KOP = 56;
const RAND = 20;
const R = TUSSENRUIMTE;

/** Linkerkant van de drie kolommen, binnen het bord. */
export const KOLOM_X = {
  invoer: RAND,
  verwerking: RAND + vormVan("drukschakelaar").breedte + 2 * R + 8,
  get verwerking2() {
    return this.verwerking + vormVan("en").breedte + R;
  },
  get uitvoer() {
    return this.verwerking2 + vormVan("en").breedte + 2 * R + 8;
  },
};

const INVOER: Record<BordSoort, ModuleSoort[]> = {
  comparators: [
    "sensor",
    "sensor",
    "geluidsensor",
    "drukschakelaar",
    "drukschakelaar",
    "variabeleSpanning",
    "pulsgenerator",
    "adOmzetter",
  ],
  transistor: [
    "sensor",
    "sensor",
    "geluidsensor",
    "drukschakelaar",
    "drukschakelaar",
    "variabeleSpanning",
    "pulsgenerator",
  ],
};

/** Rijen van twee vakken; de pulsenteller komt er breed onder. */
const VERWERKING: Record<BordSoort, [ModuleSoort, ModuleSoort][]> = {
  comparators: [
    ["comparator", "comparator"],
    ["en", "en"],
    ["geheugencel", "of"],
    ["invertor", "invertor"],
  ],
  transistor: [
    ["transistor", "comparator"],
    ["en", "of"],
    ["geheugencel", "invertor"],
  ],
};

const UITVOER: ModuleSoort[] = ["led", "led", "led", "led", "zoemer", "relais"];

/** Tellerbereik: het nieuwe bord telt tot en met 15, het oude tot en met 9. */
const TELLER_MAX: Record<BordSoort, number> = {
  comparators: 15,
  transistor: 9,
};

function kolom(soorten: ModuleSoort[], x: number) {
  let y = KOP;
  return soorten.map((soort) => {
    const plek = { soort, x, y };
    y += vormVan(soort).hoogte + R;
    return plek;
  });
}

/** Alle vakken van een bord, relatief aan de linkerbovenhoek van het bord. */
export function indeling(soort: BordSoort) {
  const vakken: { soort: ModuleSoort; x: number; y: number }[] = [
    ...kolom(INVOER[soort], KOLOM_X.invoer),
    ...kolom(UITVOER, KOLOM_X.uitvoer),
  ];
  let y = KOP;
  for (const [links, rechts] of VERWERKING[soort]) {
    vakken.push({ soort: links, x: KOLOM_X.verwerking, y });
    vakken.push({ soort: rechts, x: KOLOM_X.verwerking2, y });
    y += vormVan(links).hoogte + R;
  }
  vakken.push({ soort: "pulsenteller", x: KOLOM_X.verwerking, y });
  return vakken;
}

/** Afmetingen van het hele bord. */
export function bordMaat(soort: BordSoort): {
  breedte: number;
  hoogte: number;
} {
  let onder = 0;
  for (const v of indeling(soort))
    onder = Math.max(onder, v.y + vormVan(v.soort).hoogte);
  return {
    breedte: KOLOM_X.uitvoer + vormVan("led").breedte + RAND,
    hoogte: onder + RAND,
  };
}

export const bordRechthoek = (b: Bord): Rechthoek => ({
  x: b.x,
  y: b.y,
  ...bordMaat(b.soort),
});

/** Maakt een bord met al zijn modules op plek (x, y). */
export function maakBord(
  soort: BordSoort,
  id: string,
  x = 0,
  y = 0,
): { bord: Bord; modules: ModuleInstantie[] } {
  const tel = new Map<ModuleSoort, number>();
  const modules = indeling(soort).map((v) => {
    const n = (tel.get(v.soort) ?? 0) + 1;
    tel.set(v.soort, n);
    const params: Params =
      v.soort === "pulsenteller" ? { max: TELLER_MAX[soort] } : {};
    const m = maakModule(
      v.soort,
      `${id}-${v.soort}${n}`,
      x + v.x,
      y + v.y,
      params,
    );
    return { ...m, bord: id };
  });
  return { bord: { id, soort, x, y }, modules };
}

/** Kolomkoppen met hun midden, relatief aan het bord. */
export function kolomKoppen() {
  return [
    {
      tekst: "INVOER",
      x: KOLOM_X.invoer + vormVan("drukschakelaar").breedte / 2,
    },
    {
      tekst: "VERWERKING",
      x: (KOLOM_X.verwerking + KOLOM_X.verwerking2 + vormVan("en").breedte) / 2,
    },
    { tekst: "UITVOER", x: KOLOM_X.uitvoer + vormVan("led").breedte / 2 },
  ];
}

/** Rechthoek om alle borden en modules, voor "alles in beeld". */
export function omhulling(s: Schakeling): Rechthoek {
  const vakken: Rechthoek[] = [
    ...(s.borden ?? []).map(bordRechthoek),
    ...s.modules.map((m) => ({ x: m.x, y: m.y, ...vormVan(m.soort) })),
    // Links van een licht- of temperatuursensor kunnen apparaten getekend staan.
    ...s.modules
      .filter((m) => m.soort === "sensor" && Number(m.params.sensor ?? 0) !== 0)
      .map((m) => ({ x: m.x - 300, y: m.y - 20, breedte: 300, hoogte: 150 })),
  ];
  if (vakken.length === 0) return { x: 0, y: 0, breedte: 800, hoogte: 500 };
  const x0 = Math.min(...vakken.map((r) => r.x));
  const y0 = Math.min(...vakken.map((r) => r.y));
  const x1 = Math.max(...vakken.map((r) => r.x + r.breedte));
  const y1 = Math.max(...vakken.map((r) => r.y + r.hoogte));
  // Ruimte voor de tweede stroomkring: snoeren boven en rechts om het bord,
  // voeding en apparaat rechts naast het bord.
  const snoer =
    s.modules.some(
      (m) => m.soort === "sensor" && Number(m.params.sensor ?? 0) !== 0,
    ) ||
    s.modules.some(
      (m) =>
        m.soort === "relais" && s.draden.some((d) => d.naar.module === m.id),
    )
      ? 60
      : 0;
  return {
    x: x0,
    y: y0 - snoer,
    breedte: x1 - x0 + snoer * 2,
    hoogte: y1 - y0 + snoer,
  };
}

/**
 * Een vrije plek voor een nieuwe module, zo dicht mogelijk bij `midden`:
 * niet over een bord of een andere module heen (met wat ruimte ertussen).
 */
export function vrijePlek(
  s: Schakeling,
  maat: { breedte: number; hoogte: number },
  midden: { x: number; y: number },
  ruimte = 16,
): { x: number; y: number } {
  const bezet: Rechthoek[] = [
    ...(s.borden ?? []).map(bordRechthoek),
    ...s.modules.map((m) => ({ x: m.x, y: m.y, ...vormVan(m.soort) })),
  ];
  const vrij = (x: number, y: number) =>
    bezet.every(
      (r) =>
        x + maat.breedte + ruimte <= r.x ||
        r.x + r.breedte + ruimte <= x ||
        y + maat.hoogte + ruimte <= r.y ||
        r.y + r.hoogte + ruimte <= y,
    );
  const stap = 20;
  const x0 = Math.round((midden.x - maat.breedte / 2) / stap) * stap;
  const y0 = Math.round((midden.y - maat.hoogte / 2) / stap) * stap;
  // Steeds grotere ringen om het midden; binnen een ring de dichtstbijzijnde eerst.
  for (let ring = 0; ring <= 80; ring++) {
    const kandidaten: { x: number; y: number; d: number }[] = [];
    for (let i = -ring; i <= ring; i++)
      for (const [dx, dy] of [
        [i, -ring],
        [i, ring],
        [-ring, i],
        [ring, i],
      ]) {
        kandidaten.push({
          x: x0 + dx * stap,
          y: y0 + dy * stap,
          d: dx * dx + dy * dy,
        });
      }
    kandidaten.sort((a, b) => a.d - b.d);
    const goed = kandidaten.find((k) => vrij(k.x, k.y));
    if (goed) return { x: goed.x, y: goed.y };
  }
  return { x: x0, y: y0 };
}
