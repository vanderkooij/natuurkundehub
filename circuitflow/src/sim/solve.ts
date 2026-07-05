/**
 * De solver. Modified Nodal Analysis (MNA) bovenop een union-find-samenvoeging.
 *
 * Werkwijze:
 *  1. Voeg via draden/gesloten schakelaars verbonden vertices samen tot
 *     elektrische (super)knopen.
 *  2. Detecteer kortgesloten bronnen (beide polen in dezelfde knoop).
 *  3. Splits de "echte" elementen (bron/weerstand/lamp) in samenhangende eilanden.
 *  4. Per eiland: groepeer parallelle bronnen (zelfde knooppaar). Een groep met
 *     gelijke EMK wordt als één bron gestempeld (de stroom verdeelt zich gelijk
 *     over de leden); een groep met tegenstrijdige EMK is een conflict en wordt
 *     gemarkeerd. Stel de MNA op en los op.
 *  5. Reken stromen en vermogens terug uit de knoopspanningen.
 *
 * Bron/weerstand/lamp zijn lineair (één doorrekening). De **LED is niet-lineair**:
 * daaromheen loopt een diode-toestand-iteratie (geleidend ⇄ sperrend) tot de
 * aan/uit-toestanden stabiel zijn — de connectiviteit (en dus de eiland-indeling)
 * verandert daarbij niet, dus die wordt één keer voorbereid.
 */
import { UnionFind } from "./unionfind";
import { solveLinear } from "./linalg";
import type { Netlist, SimElement, SolveResult } from "./types";

const EPS = 1e-9;

function isDriver(e: SimElement): boolean {
  return (
    e.type === "source" ||
    e.type === "resistor" ||
    e.type === "lamp" ||
    e.type === "ammeter" ||
    e.type === "led"
  );
}

/** Spanningsbron-achtig in de MNA: echte bron + ideale ampèremeter (0 V-sense). */
function isVoltageSource(e: SimElement): boolean {
  return e.type === "source" || e.type === "ammeter";
}

export function solve(netlist: Netlist): SolveResult {
  const { elements } = netlist;
  const uf = new UnionFind();
  for (const e of elements) {
    uf.add(e.a);
    uf.add(e.b);
  }

  // Stap 1: weerstandsloze verbindingen samenvoegen.
  for (const e of elements) {
    if (e.type === "wire" || (e.type === "switch" && e.closed)) uf.union(e.a, e.b);
  }
  const node = (k: string) => uf.find(k);

  const allNodes = new Set<string>();
  for (const e of elements) {
    allNodes.add(node(e.a));
    allNodes.add(node(e.b));
  }

  const nodeV = new Map<string, number>();
  const elementCurrents = new Map<string, number>();
  const elementPowers = new Map<string, number>();
  const shortedSources: string[] = [];
  const conflicts: string[] = [];
  for (const e of elements) {
    elementCurrents.set(e.id, 0);
    elementPowers.set(e.id, 0);
  }
  for (const n of allNodes) nodeV.set(n, 0);

  // Stap 2: kortgesloten bronnen (beide polen in dezelfde knoop).
  for (const e of elements) {
    if (e.type === "source" && node(e.a) === node(e.b)) {
      shortedSources.push(e.id);
      elementCurrents.set(e.id, Infinity);
    }
  }

  // Stempelbare elementen + super-knoop-graaf.
  const adj = new Map<string, Set<string>>();
  for (const n of allNodes) adj.set(n, new Set());
  const stampable: SimElement[] = [];
  for (const e of elements) {
    if (!isDriver(e)) continue;
    const na = node(e.a);
    const nb = node(e.b);
    if (na === nb) continue;
    stampable.push(e);
    adj.get(na)!.add(nb);
    adj.get(nb)!.add(na);
  }

  // Stap 3: samenhangende eilanden.
  const compOf = new Map<string, number>();
  let nComp = 0;
  for (const start of allNodes) {
    if (compOf.has(start)) continue;
    const id = nComp++;
    const stack = [start];
    compOf.set(start, id);
    while (stack.length) {
      const u = stack.pop()!;
      for (const v of adj.get(u)!) {
        if (!compOf.has(v)) {
          compOf.set(v, id);
          stack.push(v);
        }
      }
    }
  }

  // LED-model: exponentiële (Shockley-)diode  I = I_NOM·(e^{(V−Vf)/VT} − e^{−Vf/VT}),
  // met Vf de spanning bij de nominale stroom I_NOM. Opgelost met een gedempte
  // Newton-iteratie → een gladde, klassieke I-U-karakteristiek i.p.v. een scherpe knik.
  const VT = 0.06; // "knie-breedte" (ideaalfactor × thermische spanning)
  const I_NOM = 0.02; // referentiestroom (20 mA) bij V = Vf
  const G_MIN = 1e-9; // vloerconductantie (houdt de matrix regulier)
  const EXP_MAX = 15; // begrens de exponent (voorkomt overflow bij grote V)
  const dExp = (v: number, vf: number) => Math.exp(Math.min(EXP_MAX, (v - vf) / VT));
  const diodeI = (v: number, vf: number) => I_NOM * (dExp(v, vf) - Math.exp(-vf / VT));
  const diodeG = (v: number, vf: number) => Math.max((I_NOM / VT) * dExp(v, vf), G_MIN);

  // Niet-ohmse lamp: gloeidraad wordt heter → R stijgt met |U|, van 25% van de
  // ingestelde R (koud) naar de volle R bij U_REF. Geeft de klassieke kromme
  // lampkarakteristiek. I(U) is glad en monotoon → zelfde Newton-aanpak.
  const LAMP_COLD = 0.25;
  const LAMP_UREF = 6;
  const lampI = (v: number, rSet: number) => {
    const frac = Math.min(1, Math.abs(v) / LAMP_UREF);
    return v / (rSet * (LAMP_COLD + (1 - LAMP_COLD) * frac));
  };
  const lampG = (v: number, rSet: number) => {
    const h = 1e-3;
    return Math.max((lampI(v + h, rSet) - lampI(v - h, rSet)) / (2 * h), G_MIN);
  };

  const leds = stampable.filter((e) => e.type === "led");
  const hotLamps = stampable.filter((e) => e.type === "lamp" && e.nonOhmic);
  const nonlinCount = leds.length + hotLamps.length;
  const vGuess = new Map<string, number>();
  for (const l of leds) vGuess.set(l.id, l.vf ?? 2); // start bij de knie
  for (const l of hotLamps) vGuess.set(l.id, 0); // start koud

  interface Island {
    compElems: SimElement[];
    reps: { src: SimElement; members: SimElement[] }[];
    ground: string;
    idxV: Map<string, number>;
    freeNodes: string[];
    nV: number;
  }

  // Stap 4a: state-onafhankelijke voorbereiding per eiland (bron-groepering,
  // conflictdetectie, aardekeuze, knoopindex).
  let ok = true;
  const islands: Island[] = [];
  for (let c = 0; c < nComp; c++) {
    const compNodes = [...allNodes].filter((n) => compOf.get(n) === c);
    const compElems = stampable.filter((e) => compOf.get(node(e.a)) === c);

    // Groepeer bronnen per knooppaar.
    const groups = new Map<string, SimElement[]>();
    for (const s of compElems) {
      if (!isVoltageSource(s)) continue;
      const na = node(s.a);
      const nb = node(s.b);
      const key = na < nb ? `${na}|${nb}` : `${nb}|${na}`;
      const g = groups.get(key);
      if (g) g.push(s);
      else groups.set(key, [s]);
    }

    // Per groep: consistent → één representant; inconsistent → conflict.
    const reps: { src: SimElement; members: SimElement[] }[] = [];
    for (const members of groups.values()) {
      const canon = members.map((s) => {
        const na = node(s.a);
        const nb = node(s.b);
        const emf = s.emf ?? 0;
        return na <= nb ? emf : -emf;
      });
      const consistent = canon.every((v) => Math.abs(v - canon[0]) < EPS);
      if (!consistent) {
        for (const s of members) conflicts.push(s.id);
        continue;
      }
      reps.push({ src: members[0], members });
    }

    const sources = reps.map((r) => r.src);
    if (sources.length === 0) continue; // geen geldige aandrijving → alles 0

    const ground = node(sources[0].b);
    const freeNodes = compNodes.filter((n) => n !== ground);
    const idxV = new Map<string, number>();
    freeNodes.forEach((n, i) => idxV.set(n, i));
    islands.push({ compElems, reps, ground, idxV, freeNodes, nV: freeNodes.length });
  }

  // Stap 4b: één lineaire doorrekening met de huidige LED-toestanden. Schrijft
  // nodeV + bronstromen en geeft terug of alle eilanden oplosbaar waren.
  const solveOnce = (): boolean => {
    for (const n of allNodes) nodeV.set(n, 0);
    let good = true;
    for (const isl of islands) {
      const { compElems, reps, ground, idxV, freeNodes, nV } = isl;
      const sources = reps.map((r) => r.src);
      const dim = nV + sources.length;
      const A: number[][] = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
      const rhs = new Array<number>(dim).fill(0);

      for (const e of compElems) {
        if (isVoltageSource(e)) continue;
        const ia = idxV.get(node(e.a));
        const ib = idxV.get(node(e.b));
        if (e.type === "led") {
          if (e.burned) {
            // doorgebrand = open (mini-lek houdt de matrix regulier)
            if (ia !== undefined) A[ia][ia] += G_MIN;
            if (ib !== undefined) A[ib][ib] += G_MIN;
            if (ia !== undefined && ib !== undefined) {
              A[ia][ib] -= G_MIN;
              A[ib][ia] -= G_MIN;
            }
            continue;
          }
          // Gelineariseerde diode rond het huidige werkpunt v0 (companion-model):
          // I ≈ g0·V + (i0 − g0·v0).
          const vf = e.vf ?? 0;
          const v0 = vGuess.get(e.id) ?? vf;
          const g0 = diodeG(v0, vf);
          const cc = diodeI(v0, vf) - g0 * v0;
          if (ia !== undefined) A[ia][ia] += g0;
          if (ib !== undefined) A[ib][ib] += g0;
          if (ia !== undefined && ib !== undefined) {
            A[ia][ib] -= g0;
            A[ib][ia] -= g0;
          }
          if (ia !== undefined) rhs[ia] -= cc;
          if (ib !== undefined) rhs[ib] += cc;
          continue;
        }
        if (e.type === "lamp" && e.nonOhmic) {
          // Gelineariseerde gloeidraad rond het huidige werkpunt (companion-model).
          const rSet = e.resistance ?? Infinity;
          const v0 = vGuess.get(e.id) ?? 0;
          const g0 = lampG(v0, rSet);
          const cc = lampI(v0, rSet) - g0 * v0;
          if (ia !== undefined) A[ia][ia] += g0;
          if (ib !== undefined) A[ib][ib] += g0;
          if (ia !== undefined && ib !== undefined) {
            A[ia][ib] -= g0;
            A[ib][ia] -= g0;
          }
          if (ia !== undefined) rhs[ia] -= cc;
          if (ib !== undefined) rhs[ib] += cc;
          continue;
        }
        const R = e.resistance ?? Infinity;
        const g = 1 / R;
        if (!Number.isFinite(g) || g <= 0) continue;
        if (ia !== undefined) A[ia][ia] += g;
        if (ib !== undefined) A[ib][ib] += g;
        if (ia !== undefined && ib !== undefined) {
          A[ia][ib] -= g;
          A[ib][ia] -= g;
        }
      }
      sources.forEach((e, k) => {
        const ia = idxV.get(node(e.a));
        const ib = idxV.get(node(e.b));
        const row = nV + k;
        if (ia !== undefined) {
          A[ia][row] += 1;
          A[row][ia] += 1;
        }
        if (ib !== undefined) {
          A[ib][row] -= 1;
          A[row][ib] -= 1;
        }
        rhs[row] = e.emf ?? 0;
      });

      const x = solveLinear(A, rhs);
      if (x === null) {
        good = false;
        continue;
      }
      nodeV.set(ground, 0);
      freeNodes.forEach((n) => nodeV.set(n, x[idxV.get(n)!]));

      // Bronstroom verdelen over de leden van elke groep.
      reps.forEach((r, k) => {
        const total = -x[nV + k]; // uit de +pool van de representant
        const repPlus = node(r.src.a);
        for (const m of r.members) {
          const sameOrient = node(m.a) === repPlus;
          const cur = (total / r.members.length) * (sameOrient ? 1 : -1);
          elementCurrents.set(m.id, cur);
          const v = (nodeV.get(node(m.a)) ?? 0) - (nodeV.get(node(m.b)) ?? 0);
          elementPowers.set(m.id, v * cur);
        }
      });
    }
    return good;
  };

  // Newton-iteratie voor de niet-lineaire elementen (LEDs + gloeidraadlampen):
  // los op, werk de werkpunten gedempt bij, herhaal tot stabiel.
  const MAX_IT = nonlinCount ? 60 : 1;
  const DAMP = 4; // LEDs: max verandering van de exponent (V−Vf)/VT per stap
  const LAMP_DAMP = 2; // lampen: max |ΔV| (volt) per stap
  for (let it = 0; it < MAX_IT; it++) {
    ok = solveOnce() && ok;
    if (!nonlinCount) break;
    let converged = true;
    for (const l of leds) {
      if (l.burned) continue;
      const vf = l.vf ?? 0;
      const vNew = (nodeV.get(node(l.a)) ?? 0) - (nodeV.get(node(l.b)) ?? 0);
      const vOld = vGuess.get(l.id) ?? vf;
      const argOld = (vOld - vf) / VT;
      const step = Math.max(-DAMP, Math.min(DAMP, (vNew - vf) / VT - argOld));
      const vLim = vf + (argOld + step) * VT;
      if (Math.abs(vLim - vOld) > 1e-5) converged = false;
      vGuess.set(l.id, vLim);
    }
    for (const l of hotLamps) {
      const vNew = (nodeV.get(node(l.a)) ?? 0) - (nodeV.get(node(l.b)) ?? 0);
      const vOld = vGuess.get(l.id) ?? 0;
      const vLim = vOld + Math.max(-LAMP_DAMP, Math.min(LAMP_DAMP, vNew - vOld));
      if (Math.abs(vLim - vOld) > 1e-5) converged = false;
      vGuess.set(l.id, vLim);
    }
    if (converged) break;
  }

  // Stap 5: stroom/vermogen van weerstanden, lampen en LEDs.
  for (const e of stampable) {
    if (isVoltageSource(e)) continue;
    const va = nodeV.get(node(e.a)) ?? 0;
    const vb = nodeV.get(node(e.b)) ?? 0;
    if (e.type === "led") {
      const i = e.burned ? 0 : Math.max(0, diodeI(va - vb, e.vf ?? 0));
      elementCurrents.set(e.id, i);
      elementPowers.set(e.id, i * (va - vb));
      continue;
    }
    if (e.type === "lamp" && e.nonOhmic) {
      const i = lampI(va - vb, e.resistance ?? Infinity);
      elementCurrents.set(e.id, i);
      elementPowers.set(e.id, i * (va - vb));
      continue;
    }
    const R = e.resistance ?? Infinity;
    const g = 1 / R;
    if (!Number.isFinite(g) || g <= 0) continue;
    const i = (va - vb) * g;
    elementCurrents.set(e.id, i);
    elementPowers.set(e.id, i * i * R);
  }

  const nodePotentials = new Map<string, number>();
  for (const e of elements) {
    nodePotentials.set(e.a, nodeV.get(node(e.a)) ?? 0);
    nodePotentials.set(e.b, nodeV.get(node(e.b)) ?? 0);
  }

  // Knoopsleutels op de kortsluit-lus (alleen de draden die de kortsluitstroom
  // dragen, niet de zijtakken naar bv. een lamp). Aanpak: bouw de weerstandsloze
  // graaf (draden + dichte schakelaars) binnen de kortgesloten knoop en snoei
  // dood-eind-takken weg (graad ≤1), met de bronpolen als ankers. Wat overblijft
  // ligt op een cyclus tussen de polen = de echte kortsluit-route.
  const shortedRoots = new Set<string>();
  const anchors = new Set<string>();
  for (const id of shortedSources) {
    const e = elements.find((x) => x.id === id);
    if (e) {
      shortedRoots.add(node(e.a));
      anchors.add(e.a);
      anchors.add(e.b);
    }
  }
  const shortedNodes: string[] = [];
  if (shortedRoots.size) {
    const inShort = (k: string) => shortedRoots.has(node(k));
    const wadj = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
      if (!wadj.has(a)) wadj.set(a, new Set());
      if (!wadj.has(b)) wadj.set(b, new Set());
      wadj.get(a)!.add(b);
      wadj.get(b)!.add(a);
    };
    for (const e of elements) {
      if (e.type === "wire" || (e.type === "switch" && e.closed)) {
        if (inShort(e.a) && inShort(e.b)) link(e.a, e.b);
      }
    }
    const alive = new Set(wadj.keys());
    let changed = true;
    while (changed) {
      changed = false;
      for (const k of [...alive]) {
        if (anchors.has(k)) continue;
        let deg = 0;
        for (const nb of wadj.get(k)!) if (alive.has(nb)) deg++;
        if (deg <= 1) {
          alive.delete(k);
          changed = true;
        }
      }
    }
    shortedNodes.push(...alive);
  }

  return { ok, nodePotentials, elementCurrents, elementPowers, shortedSources, shortedNodes, conflicts };
}
