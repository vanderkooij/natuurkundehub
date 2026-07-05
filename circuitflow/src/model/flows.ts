/**
 * Per-tak stroomattributie voor de animatie (Fase 2).
 *
 * De solver geeft componentstromen + knooppotentialen, maar draden zijn
 * weerstandsloos — de stroom *per draadsegment* volgt daar niet rechtstreeks uit
 * (parallelle draden zijn onbepaald). We bepalen 'm met een graaf-Laplaciaan per
 * knoop-eiland: elk component injecteert een bekende stroom in zijn knopen, en we
 * lossen Lφ = injectie op (eenheidsgeleiding per draadsegment). De draadstroom op
 * segment u→v is dan φ(u) − φ(v). Dit voldoet exact aan Kirchhoff en kiest de
 * stroomverdeling met minimale circulatie (fysisch wat bijna-weerstandsloze draden
 * doen) — zodat de vertakking van de dichtheid bij een knoop klopt.
 */
import { solveLinear, type SolveResult } from "@/sim";
import { resolveVertex } from "./geometry";
import { activeRange } from "./meterSpec";
import type { CircuitDoc } from "./types";

export interface FlowPath {
  /** Stabiele sleutel (`<wireId>:<seg>` of component-id) — voor deeltjes-tracking. */
  key: string;
  /** Knoop-id's van de uiteinden (voor de stroomgraaf bij knooppunten). */
  aNode: string;
  bNode: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** Conventionele stroom (A) van a → b (mag negatief zijn). */
  current: number;
  /** Verberg carriers binnen deze straal van het pad-midden (achter de body). */
  hideRadius: number;
}

export function computeFlows(doc: CircuitDoc, result: SolveResult): FlowPath[] {
  const paths: FlowPath[] = [];
  const vertices = Object.keys(doc.vertices);
  if (vertices.length === 0) return paths;

  // Draadsegmenten als grafiekkanten.
  interface WEdge {
    wireId: string;
    seg: number;
    u: string;
    v: string;
  }
  const wedges: WEdge[] = [];
  for (const w of doc.wires) {
    for (let i = 0; i < w.nodes.length - 1; i++) {
      const u = w.nodes[i];
      const v = w.nodes[i + 1];
      if (u !== v && doc.vertices[u] && doc.vertices[v]) wedges.push({ wireId: w.id, seg: i, u, v });
    }
  }
  // Weerstandsloze geleiders tellen mee als draad-tak (stroom + bolletjes gaan
  // erdoorheen): een dichte schakelaar en een ideale ampèremeter (0 Ω).
  for (const c of doc.components) {
    const conducts =
      (c.type === "switch" && (c.values.closed ?? true)) ||
      c.type === "ammeter" ||
      (c.type === "fuse" && !(c.values.blown ?? false));
    if (conducts && c.v0 !== c.v1) {
      // Bolletjes lopen bewust dóór de ampèremeter (toont dat die de stroom meet).
      wedges.push({ wireId: c.id, seg: 0, u: c.v0, v: c.v1 });
    } else if (c.type === "analogAmmeter" && c.ports) {
      const act = activeRange(doc, c);
      if (act && c.ports[0] !== act.portId) {
        wedges.push({ wireId: c.id, seg: 0, u: c.ports[0], v: act.portId });
      }
    }
  }

  // Injectie per knoop = stroom die de componenten in die knoop duwen.
  const inject = new Map<string, number>();
  const add = (k: string, val: number) => inject.set(k, (inject.get(k) ?? 0) + val);
  for (const c of doc.components) {
    const Ie = result.elementCurrents.get(c.id) ?? 0;
    if (!Number.isFinite(Ie)) continue;
    if (c.type === "source") {
      add(c.v0, +Ie); // bron duwt stroom uit de +pool (v0)
      add(c.v1, -Ie);
    } else if (
      c.type === "resistor" ||
      c.type === "lamp" ||
      c.type === "led" ||
      c.type === "ldr" ||
      c.type === "ntc"
    ) {
      add(c.v0, -Ie); // weerstand/lamp/LED/sensor trekt stroom v0→v1 erdoorheen
      add(c.v1, +Ie);
    }
  }

  // Knoop-eilanden (verbonden via draden) met union-find.
  const parent = new Map<string, string>();
  for (const v of vertices) parent.set(v, v);
  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    if (p !== x) {
      p = find(p);
      parent.set(x, p);
    }
    return p;
  };
  for (const e of wedges) {
    const ra = find(e.u);
    const rb = find(e.v);
    if (ra !== rb) parent.set(ra, rb);
  }

  const groupVerts = new Map<string, string[]>();
  for (const v of vertices) {
    const r = find(v);
    const arr = groupVerts.get(r);
    if (arr) arr.push(v);
    else groupVerts.set(r, [v]);
  }
  const groupEdges = new Map<string, WEdge[]>();
  for (const e of wedges) {
    const r = find(e.u);
    const arr = groupEdges.get(r);
    if (arr) arr.push(e);
    else groupEdges.set(r, [e]);
  }

  const phi = new Map<string, number>();

  for (const [root, verts] of groupVerts) {
    const edges = groupEdges.get(root);
    if (!edges || edges.length === 0) continue; // losse knoop: geen draadstroom
    const li = new Map<string, number>();
    verts.forEach((v, i) => li.set(v, i));
    const n = verts.length;
    const m = n - 1; // laatste knoop = referentie (φ = 0)
    if (m === 0) continue;

    const A: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0));
    const b = new Array<number>(m).fill(0);
    for (let i = 0; i < m; i++) b[i] = inject.get(verts[i]) ?? 0;
    for (const e of edges) {
      const a = li.get(e.u)!;
      const c = li.get(e.v)!;
      if (a < m) A[a][a] += 1;
      if (c < m) A[c][c] += 1;
      if (a < m && c < m) {
        A[a][c] -= 1;
        A[c][a] -= 1;
      }
    }
    const x = solveLinear(A, b);
    if (!x) continue;
    for (let i = 0; i < m; i++) phi.set(verts[i], x[i]);
    phi.set(verts[n - 1], 0);
  }

  // Draad-paden: stroom = φ(u) − φ(v).
  for (const e of wedges) {
    const pu = resolveVertex(doc, e.u);
    const pv = resolveVertex(doc, e.v);
    if (!pu || !pv) continue;
    const I = (phi.get(e.u) ?? 0) - (phi.get(e.v) ?? 0);
    paths.push({
      key: `${e.wireId}:${e.seg}`,
      aNode: e.u,
      bNode: e.v,
      ax: pu.x,
      ay: pu.y,
      bx: pv.x,
      by: pv.y,
      current: I,
      hideRadius: 0,
    });
  }

  // Component-paden. Carriers verdwijnen alleen achter de bron-body; in een
  // lamp/weerstand blijven ze zichtbaar. (De schakelaar is al als draad-tak
  // meegenomen hierboven.)
  for (const c of doc.components) {
    // schakelaar/ampèremeter zijn al als draad-tak meegenomen; voltmeters geleiden niet.
    if (
      c.type === "switch" ||
      c.type === "ammeter" ||
      c.type === "fuse" ||
      c.type === "voltmeter" ||
      c.type === "analogAmmeter" ||
      c.type === "analogVoltmeter"
    )
      continue;
    const p0 = resolveVertex(doc, c.v0);
    const p1 = resolveVertex(doc, c.v1);
    if (!p0 || !p1) continue;
    const Ie = result.elementCurrents.get(c.id) ?? 0;
    if (!Number.isFinite(Ie)) continue;
    // Conventionele stroom v0→v1: weerstand/lamp = +Ie; bron = −Ie (binnenin − → +).
    const I = c.type === "source" ? -Ie : Ie;
    paths.push({
      key: c.id,
      aNode: c.v0,
      bNode: c.v1,
      ax: p0.x,
      ay: p0.y,
      bx: p1.x,
      by: p1.y,
      current: I,
      hideRadius: c.type === "source" ? 28 : 0,
    });
  }

  return paths;
}
