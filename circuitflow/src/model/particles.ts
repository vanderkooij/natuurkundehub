/**
 * Deeltjes per stroomkring.
 *
 * De stroom in de schakeling wordt opgesplitst in **kringen**: gesloten routes
 * van de ene pool via de schakeling terug naar de andere, elk met een eigen
 * stroomsterkte. Samen geven ze precies de stroom per draad (Kirchhoff). Elke
 * kring krijgt een vaste "trein" deeltjes met gelijke onderlinge afstand
 * (∝ 1/I van die kring) die als geheel rondrijdt. Omdat de trein star is en elke
 * kring dicht is, kan er nooit iets uit de pas raken, hoe lang het ook loopt.
 *
 * Bij een splitsing zie je zo dat een deel van de deeltjes de ene kant op gaat
 * en een deel de andere: dat zijn de treinen van verschillende kringen. Op een
 * gedeeld stuk draad tellen de treinen op tot de juiste dichtheid.
 *
 * Alles hier is puur (geen tijd, geen DOM), zodat het los te testen is. De
 * animatie schuift alleen één gedeelde afstand op; een nieuw nulpunt komt er
 * pas bij een aanpassing van de schakeling.
 */
import type { FlowPath } from "./flows";

export interface OEdge {
  key: string;
  fromNode: string;
  toNode: string;
  sx: number;
  sy: number;
  ux: number;
  uy: number;
  len: number;
  /** |I| van deze tak (A). */
  weight: number;
  hideRadius: number;
  midx: number;
  midy: number;
}

export interface Kring {
  edges: OEdge[];
  /** Cumulatieve lengte aan het begin van elke tak. */
  starts: number[];
  length: number;
  /** Stroom (A) die deze kring draagt. */
  weight: number;
  /** Aantal deeltjes in de trein en hun onderlinge afstand (wereld-px). */
  count: number;
  spacing: number;
  /** Fase (wereld-px) zodat treinen van kringen die samen beginnen elkaar afwisselen. */
  phase: number;
}

export interface Opbouw {
  edges: Map<string, OEdge>;
  kringen: Kring[];
  /** Verandert bij elke aanpassing (ook bij alleen verslepen): dan een nieuw nulpunt. */
  signature: string;
}

const MIN_I = 1e-4;

/** Takken in de reisrichting leggen (elektronen: van − naar +, anders andersom). */
export function orientEdges(
  flows: FlowPath[],
  electrons: boolean,
): Map<string, OEdge> {
  const edges = new Map<string, OEdge>();
  for (const f of flows) {
    const I = f.current;
    if (!Number.isFinite(I) || Math.abs(I) < MIN_I) continue;
    const aToB = electrons ? I < 0 : I > 0;
    const sx = aToB ? f.ax : f.bx;
    const sy = aToB ? f.ay : f.by;
    const ex = aToB ? f.bx : f.ax;
    const ey = aToB ? f.by : f.ay;
    const len = Math.hypot(ex - sx, ey - sy);
    if (len < 1) continue;
    edges.set(f.key, {
      key: f.key,
      fromNode: aToB ? f.aNode : f.bNode,
      toNode: aToB ? f.bNode : f.aNode,
      sx,
      sy,
      ux: (ex - sx) / len,
      uy: (ey - sy) / len,
      len,
      weight: Math.abs(I),
      hideRadius: f.hideRadius,
      midx: (sx + ex) / 2,
      midy: (sy + ey) / 2,
    });
  }
  return edges;
}

/**
 * Kringdecompositie: pak steeds de tak met de meeste resterende stroom, volg
 * vanaf daar telkens de uitgaande tak met de meeste resterende stroom tot je
 * op een knoop terugkomt waar je al was. Dat stuk is een kring; trek de
 * kleinste stroom erin van alle takken af en herhaal. Takken van bronnen gaan
 * voor, zodat een kring bij voorkeur bij de bron begint.
 */
export function decompose(
  edges: Map<string, OEdge>,
  sourceKeys: Set<string>,
): { edges: OEdge[]; weight: number }[] {
  const rest = new Map<string, number>();
  for (const e of edges.values()) rest.set(e.key, e.weight);
  const uit = new Map<string, OEdge[]>();
  for (const e of edges.values()) {
    const arr = uit.get(e.fromNode);
    if (arr) arr.push(e);
    else uit.set(e.fromNode, [e]);
  }
  // Vaste volgorde, zodat dezelfde schakeling altijd dezelfde kringen geeft.
  for (const arr of uit.values()) arr.sort((a, b) => (a.key < b.key ? -1 : 1));

  const maxI = Math.max(0, ...[...edges.values()].map((e) => e.weight));
  const eps = Math.max(MIN_I, maxI * 1e-3);
  const kringen: { edges: OEdge[]; weight: number }[] = [];

  for (let ronde = 0; ronde < 200; ronde++) {
    // Starttak: liefst een bron met resterende stroom, anders de grootste.
    let start: OEdge | null = null;
    for (const e of edges.values()) {
      const r = rest.get(e.key)!;
      if (r <= eps) continue;
      const beter =
        !start ||
        (sourceKeys.has(e.key) && !sourceKeys.has(start.key)) ||
        (sourceKeys.has(e.key) === sourceKeys.has(start.key) &&
          r > rest.get(start.key)!);
      if (beter) start = e;
    }
    if (!start) break;

    const pad: OEdge[] = [start];
    const plek = new Map<string, number>([[start.fromNode, 0]]);
    let knoop = start.toNode;
    let kring: OEdge[] | null = null;
    for (let stap = 0; stap < edges.size + 2; stap++) {
      if (plek.has(knoop)) {
        kring = pad.slice(plek.get(knoop)!);
        break;
      }
      plek.set(knoop, pad.length);
      let beste: OEdge | null = null;
      for (const e of uit.get(knoop) ?? []) {
        if (
          rest.get(e.key)! > eps &&
          (!beste || rest.get(e.key)! > rest.get(beste.key)!)
        )
          beste = e;
      }
      if (!beste) break; // doodlopend (afrondingsruis): starttak opgeven
      pad.push(beste);
      knoop = beste.toNode;
    }
    if (!kring) {
      rest.set(start.key, 0);
      continue;
    }
    const w = Math.min(...kring.map((e) => rest.get(e.key)!));
    for (const e of kring) rest.set(e.key, rest.get(e.key)! - w);
    kringen.push({ edges: kring, weight: w });
  }
  return kringen;
}

/** Laat een kring beginnen direct ná de bron (daar komen de deeltjes naar buiten). */
function roteerNaBron(kring: OEdge[], sourceKeys: Set<string>): OEdge[] {
  const i = kring.findIndex((e) => sourceKeys.has(e.key));
  if (i < 0) return kring;
  const s = (i + 1) % kring.length;
  return kring.slice(s).concat(kring.slice(0, s));
}

/**
 * Dichtheid. Binnen één schakeling is de dichtheid precies evenredig met de
 * stroom (dat moet, anders klopt de verdeling bij een splitsing niet). Wat nog
 * vrij is, is hoe dicht de drukste draad is. Puur evenredig met I werkt niet
 * over het hele bereik (15 mA bij een LED tegen 2 A bij lampjes): dan zie je
 * óf bijna niets, óf een brij. Daarom krijgt de drukste draad een afstand die
 * wel afneemt met de stroom, maar samengedrukt (macht 0,35) en begrensd. Meer
 * stroom blijft zo zichtbaar dichter, en ook een kleine stroom heeft genoeg
 * deeltjes om te zien dat hij loopt.
 */
export interface Instellingen {
  /** Bij deze stroom (A) heeft de drukste draad afstand `refAfstand` (wereld-px). */
  refStroom: number;
  refAfstand: number;
  exponent: number;
  /** Grenzen voor de afstand op de drukste draad. */
  minRef: number;
  maxRef: number;
  /** Grenzen voor de afstand binnen één kring (dunne takken). */
  minSpacing: number;
  maxSpacing: number;
  maxPerKring: number;
}

export const STANDAARD: Instellingen = {
  refStroom: 0.3,
  refAfstand: 36,
  exponent: 0.35,
  minRef: 14,
  maxRef: 60,
  minSpacing: 10,
  maxSpacing: 1200,
  maxPerKring: 400,
};

/** Afstand tussen de deeltjes op de drukste draad, bij grootste takstroom `imax`. */
export function afstandDrukste(
  imax: number,
  inst: Instellingen = STANDAARD,
): number {
  if (!(imax > 0)) return inst.maxRef;
  const a = inst.refAfstand * Math.pow(inst.refStroom / imax, inst.exponent);
  return Math.min(inst.maxRef, Math.max(inst.minRef, a));
}

export function bouwKringen(
  flows: FlowPath[],
  electrons: boolean,
  sourceKeys: Set<string>,
  inst: Instellingen = STANDAARD,
): Opbouw {
  const edges = orientEdges(flows, electrons);
  const ruw = decompose(edges, sourceKeys);
  const totaal = ruw.reduce((s, k) => s + k.weight, 0) || 1;
  const imax = Math.max(0, ...[...edges.values()].map((e) => e.weight));
  const ref = afstandDrukste(imax, inst);
  let cumul = 0;
  const kringen: Kring[] = ruw.map((k) => {
    const lijst = roteerNaBron(k.edges, sourceKeys);
    const starts: number[] = [];
    let L = 0;
    for (const e of lijst) {
      starts.push(L);
      L += e.len;
    }
    // Evenredig met de stroom: een kring met de helft van de stroom krijgt
    // twee keer zo veel ruimte tussen zijn deeltjes.
    const gewenst = Math.min(
      inst.maxSpacing,
      Math.max(inst.minSpacing, (ref * imax) / k.weight),
    );
    // Een heel aantal deeltjes, zodat de trein rond precies sluit.
    const count = Math.max(
      1,
      Math.min(inst.maxPerKring, Math.round(L / gewenst)),
    );
    const spacing = L / count;
    // Fase: kringen die bij dezelfde bron beginnen schuiven naar rato van hun
    // aandeel op, zodat hun deeltjes elkaar afwisselen in plaats van samenvallen.
    const phase = (cumul / totaal) * spacing;
    cumul += k.weight;
    return {
      edges: lijst,
      starts,
      length: L,
      weight: k.weight,
      count,
      spacing,
      phase,
    };
  });

  // Signatuur: tak, richting, stroom én geometrie. Verslepen telt dus ook als
  // aanpassing en geeft een nieuw nulpunt.
  const delen: string[] = [];
  for (const e of edges.values()) {
    delen.push(
      `${e.key}|${e.fromNode}>${e.toNode}|${Math.round(e.weight * 1000)}|${Math.round(e.sx)},${Math.round(e.sy)},${Math.round(e.len)}`,
    );
  }
  delen.sort();
  return { edges, kringen, signature: delen.join(";") };
}

export interface Deeltje {
  x: number;
  y: number;
  edge: OEdge;
}

/** Waar alle deeltjes staan als de treinen `offset` wereld-px zijn opgeschoven. */
export function deeltjesOp(opbouw: Opbouw, offset: number): Deeltje[] {
  const uit: Deeltje[] = [];
  for (const k of opbouw.kringen) {
    if (k.length <= 0) continue;
    let j = 0;
    for (let i = 0; i < k.count; i++) {
      const s =
        (((offset + k.phase + i * k.spacing) % k.length) + k.length) % k.length;
      // De deeltjes staan op volgorde langs de kring, maar door de modulo kan de
      // eerste halverwege zitten: zoek de tak vanaf het begin als het nodig is.
      if (j >= k.edges.length || s < k.starts[j]) j = 0;
      while (j + 1 < k.edges.length && s >= k.starts[j + 1]) j++;
      const e = k.edges[j];
      const d = s - k.starts[j];
      uit.push({ x: e.sx + e.ux * d, y: e.sy + e.uy * d, edge: e });
    }
  }
  return uit;
}
