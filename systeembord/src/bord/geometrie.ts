import type { ModuleInstantie, ModuleSoort } from "@/sim";

/**
 * Vorm van elke module op het werkvlak, naar de tekening van het bord in het
 * werkboek: invoer en uitvoer als smalle vakken met de bus aan één kant,
 * verwerking als hoger vak met een symbool in het midden.
 */

export interface Punt {
  x: number;
  y: number;
}

/** Kleur van de bus, zoals op het echte bord. */
export type BusKleur = "geel" | "blauw" | "wit" | "zwart";

export interface BusVorm extends Punt {
  bus: string;
  kleur: BusKleur;
  /** Klein label naast de bus (set, reset, 8, 4, 2, 1). */
  label?: string;
  /** Label rechtsboven de bus, als er een lijn rechts van de bus loopt. */
  labelBoven?: boolean;
}

export interface ModuleVorm {
  breedte: number;
  hoogte: number;
  bussen: BusVorm[];
  /** Plaats van de naam van de module. */
  label: { x: number; y: number; uitlijning?: "midden" | "rechts" };
}

/** Straal van een bus in werkvlakeenheden. */
export const BUS_STRAAL = 12;

/** Ruimte tussen twee vakken op het bord. */
export const TUSSENRUIMTE = 8;

const INVOER = { breedte: 220, hoogte: 100, label: { x: 14, y: 86 } };
const VERWERKING = {
  breedte: 200,
  hoogte: 150,
  label: { x: 100, y: 138, uitlijning: "midden" as const },
};
const UITVOER = { breedte: 200, hoogte: 100, label: { x: 60, y: 46 } };

const bus =
  (kleur: BusKleur) =>
  (naam: string, x: number, y: number, label?: string): BusVorm => ({
    bus: naam,
    x,
    y,
    kleur,
    label,
  });
const geel = bus("geel");
const blauw = bus("blauw");
const wit = bus("wit");

const tweeIngangen: ModuleVorm = {
  ...VERWERKING,
  bussen: [blauw("in1", 34, 44), blauw("in2", 34, 96), blauw("uit", 166, 70)],
};
const eenIngang: ModuleVorm = {
  ...VERWERKING,
  bussen: [blauw("in", 34, 70), blauw("uit", 166, 70)],
};
const eenUitgang: ModuleVorm = { ...INVOER, bussen: [geel("uit", 186, 40)] };
const metKnop: ModuleVorm = { ...eenUitgang, label: { x: 14, y: 90 } };
const uitvoer: ModuleVorm = { ...UITVOER, bussen: [wit("in", 34, 40)] };

const VORMEN: Record<ModuleSoort, ModuleVorm> = {
  drukschakelaar: eenUitgang,
  variabeleSpanning: metKnop,
  sensor: {
    ...INVOER,
    bussen: [geel("uit1", 186, 26), geel("uit2", 186, 62)],
  },
  geluidsensor: eenUitgang,
  pulsgenerator: metKnop,
  adOmzetter: {
    ...INVOER,
    bussen: [
      wit("in", 30, 46),
      geel("8", 88, 46, "8"),
      geel("4", 120, 46, "4"),
      geel("2", 152, 46, "2"),
      geel("1", 184, 46, "1"),
    ],
  },
  comparator: eenIngang,
  en: tweeIngangen,
  of: tweeIngangen,
  nand: tweeIngangen,
  nor: tweeIngangen,
  xor: tweeIngangen,
  xnor: tweeIngangen,
  invertor: eenIngang,
  transistor: eenIngang,
  geheugencel: {
    ...VERWERKING,
    bussen: [
      blauw("set", 34, 44, "set"),
      blauw("reset", 34, 96, "reset"),
      blauw("uit", 166, 70),
    ],
  },
  pulsenteller: {
    breedte: 2 * VERWERKING.breedte + TUSSENRUIMTE,
    hoogte: 160,
    label: { x: 396, y: 150, uitlijning: "rechts" },
    bussen: [
      { ...blauw("tel", 30, 34, "tel pulsen"), labelBoven: true },
      { ...blauw("aan", 30, 82, "tellen aan/uit"), labelBoven: true },
      { ...blauw("reset", 30, 130, "reset"), labelBoven: true },
      blauw("8", 262, 34, "8"),
      blauw("4", 298, 34, "4"),
      blauw("2", 334, 34, "2"),
      blauw("1", 370, 34, "1"),
    ],
  },
  led: uitvoer,
  zoemer: uitvoer,
  relais: {
    ...UITVOER,
    hoogte: 200,
    label: { x: 14, y: 186 },
    bussen: [wit("in", 34, 92)],
  },
  // Rechtsonder op het bord, onder het relais: de aarde (0 V).
  aarde: {
    ...UITVOER,
    label: { x: 166, y: 86, uitlijning: "midden" },
    bussen: [bus("zwart")("aarde", 166, 44)],
  },
};

export const vormVan = (soort: ModuleSoort): ModuleVorm => VORMEN[soort];

/** Plaats van een bus op het werkvlak. */
export function busPositie(m: ModuleInstantie, bus: string): Punt | null {
  const b = vormVan(m.soort).bussen.find((x) => x.bus === bus);
  return b ? { x: m.x + b.x, y: m.y + b.y } : null;
}

/** De bus die het dichtst bij p ligt, binnen maxAfstand (werkvlakeenheden). */
export function dichtsteBus(
  modules: ModuleInstantie[],
  p: Punt,
  maxAfstand: number,
): { module: string; bus: string } | null {
  let beste: { module: string; bus: string } | null = null;
  let d2 = maxAfstand * maxAfstand;
  for (const m of modules) {
    for (const b of vormVan(m.soort).bussen) {
      const dx = m.x + b.x - p.x,
        dy = m.y + b.y - p.y;
      if (dx * dx + dy * dy <= d2) {
        d2 = dx * dx + dy * dy;
        beste = { module: m.id, bus: b.bus };
      }
    }
  }
  return beste;
}

/**
 * Een draad hangt een beetje door, zoals een echt snoer: een kwadratische
 * boog met het laagste punt onder het midden. Hoe langer, hoe meer hij hangt.
 * Dit is het buigpunt van die standaardboog.
 */
export function standaardBocht(a: Punt, b: Punt): Punt {
  const lengte = Math.hypot(b.x - a.x, b.y - a.y);
  const hang = Math.min(80, 12 + lengte * 0.12);
  return { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + hang };
}

/** De boog van a naar b met buigpunt c (standaard: doorhangend). */
export function draadPad(a: Punt, b: Punt, c = standaardBocht(a, b)): string {
  return `M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`;
}

/** Punt halverwege de boog, voor de verwijderknop en het spanningslabel. */
export function draadMidden(a: Punt, b: Punt, c = standaardBocht(a, b)): Punt {
  return {
    x: 0.25 * a.x + 0.5 * c.x + 0.25 * b.x,
    y: 0.25 * a.y + 0.5 * c.y + 0.25 * b.y,
  };
}

/** Het buigpunt waarbij het midden van de boog op p ligt (een draad aan zijn midden slepen). */
export const buigpuntDoor = (a: Punt, b: Punt, p: Punt): Punt => ({
  x: 2 * p.x - (a.x + b.x) / 2,
  y: 2 * p.y - (a.y + b.y) / 2,
});

/** Hoeveel bussen (behalve de eigen twee) de boog raakt of bijna raakt. */
function bussenGeraakt(a: Punt, b: Punt, c: Punt, bussen: Punt[]): number {
  const marge = BUS_STRAAL + 5;
  const x0 = Math.min(a.x, b.x, c.x) - marge,
    x1 = Math.max(a.x, b.x, c.x) + marge;
  const y0 = Math.min(a.y, b.y, c.y) - marge,
    y1 = Math.max(a.y, b.y, c.y) + marge;
  const dichtbij = bussen.filter(
    (q) =>
      q.x > x0 &&
      q.x < x1 &&
      q.y > y0 &&
      q.y < y1 &&
      Math.hypot(q.x - a.x, q.y - a.y) > 1 &&
      Math.hypot(q.x - b.x, q.y - b.y) > 1,
  );
  if (dichtbij.length === 0) return 0;
  const STAPPEN = 32;
  let raak = 0;
  for (const q of dichtbij) {
    for (let i = 1; i < STAPPEN; i++) {
      const t = i / STAPPEN,
        s = 1 - t;
      const x = s * s * a.x + 2 * s * t * c.x + t * t * b.x;
      const y = s * s * a.y + 2 * s * t * c.y + t * t * b.y;
      if (Math.hypot(x - q.x, y - q.y) < marge) {
        raak++;
        break;
      }
    }
  }
  return raak;
}

/**
 * Kiest een boog die zo min mogelijk over andere bussen loopt: eerst de
 * gewone doorhangende boog, anders een die meer of minder hangt, of opzij
 * uitwijkt. Bij gelijke stand wint de boog die het minst afwijkt.
 */
export function kiesBocht(a: Punt, b: Punt, bussen: Punt[]): Punt {
  const c0 = standaardBocht(a, b);
  const midden = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const hang = c0.y - midden.y;
  const kandidaten: Punt[] = [c0];
  for (const f of [0.35, 1.7, 2.4, -0.6])
    kandidaten.push({ x: c0.x, y: midden.y + hang * f });
  for (const dx of [-50, 50, -100, 100])
    for (const f of [1, 1.7])
      kandidaten.push({ x: c0.x + dx, y: midden.y + hang * f });
  let beste = c0,
    score = Infinity;
  for (const [i, c] of kandidaten.entries()) {
    const s = bussenGeraakt(a, b, c, bussen) * 100 + i;
    if (s < score) {
      score = s;
      beste = c;
    }
    if (score === 0) break;
  }
  return beste;
}

/** Een draaiknop op een module: welke instelling hij regelt en waar hij zit. */
export interface KnopVorm {
  param: string;
  min: number;
  max: number;
  stap: number;
  eenheid: string;
  cx: number;
  cy: number;
  r: number;
  /** Invulvakje om de waarde te typen, rond de getoonde waarde. */
  vak: { x: number; y: number; b: number; h: number };
}

const KNOPPEN: Partial<Record<ModuleSoort, KnopVorm>> = {
  variabeleSpanning: {
    param: "spanning",
    min: 0,
    max: 5,
    stap: 0.1,
    eenheid: "V",
    cx: 66,
    cy: 40,
    r: 18,
    vak: { x: 98, y: 30, b: 54, h: 22 },
  },
  pulsgenerator: {
    param: "frequentie",
    min: 1,
    max: 10,
    stap: 0.1,
    eenheid: "Hz",
    cx: 66,
    cy: 40,
    r: 18,
    vak: { x: 98, y: 30, b: 54, h: 22 },
  },
  comparator: {
    param: "uref",
    min: 0,
    max: 5,
    stap: 0.1,
    eenheid: "V",
    cx: 150,
    cy: 106,
    r: 11,
    vak: { x: 92, y: 99, b: 46, h: 18 },
  },
  // Tot je in stap 6 een echte sensor kiest: een knopje voor de spanning.
  sensor: {
    param: "spanning",
    min: 0,
    max: 5,
    stap: 0.1,
    eenheid: "V",
    cx: 118,
    cy: 40,
    r: 12,
    vak: { x: 94, y: 60, b: 48, h: 18 },
  },
};

export const knopVan = (soort: ModuleSoort): KnopVorm | undefined =>
  KNOPPEN[soort];

/** Een draaiknop loopt van −135° (minimum) tot +135° (maximum), 0° is recht omhoog. */
export const KNOP_BEREIK = 135;

/**
 * Waarde bij een aanwijzer op (dx, dy) vanaf het midden van de knop: de knop
 * wijst naar de aanwijzer. Onderin, buiten het bereik, blijft hij aan de
 * dichtstbijzijnde kant staan. Afgerond op de stap van de knop.
 */
export function knopWaarde(k: KnopVorm, dx: number, dy: number): number {
  const hoek = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 = omhoog, + = rechtsom
  const f =
    (Math.max(-KNOP_BEREIK, Math.min(KNOP_BEREIK, hoek)) + KNOP_BEREIK) /
    (2 * KNOP_BEREIK);
  return rondAf(k, k.min + f * (k.max - k.min));
}

export function rondAf(k: KnopVorm, waarde: number): number {
  const w = Math.round(waarde / k.stap) * k.stap;
  return Math.min(k.max, Math.max(k.min, Number(w.toFixed(6))));
}

/** Plaats van het kastje en van de punt van de rode meetpen, op het werkvlak. */
export interface VoltmeterStand {
  x: number;
  y: number;
  pen: Punt;
}

/** Het kastje is getekend op 170 × 100 en wordt 1,4 keer zo groot getoond. */
export const METER_SCHAAL = 1.4;
export const METER = {
  breedte: 170 * METER_SCHAAL,
  hoogte: 100 * METER_SCHAAL,
};
