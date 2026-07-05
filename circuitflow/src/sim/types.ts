/**
 * Solver-invoer & -uitvoer. Dit is een generieke "netlist": de simulatiekern
 * weet niets van het editor-model, alleen van knoopsleutels (strings) en
 * tweepolige elementen. Een adapter (model/netlist.ts) vertaalt het editor-
 * model hiernaartoe, zodat de kern puur en los testbaar blijft.
 */

export type SimElementType =
  | "source"
  | "resistor"
  | "lamp"
  | "wire"
  | "switch"
  | "ammeter"
  | "led";

export interface SimElement {
  id: string;
  type: SimElementType;
  /** Terminal-knoopsleutel A. Voor `source`: de +pool (emf = V_a − V_b). Voor `led`: de anode. */
  a: string;
  /** Terminal-knoopsleutel B. Voor `source`: de −pool. Voor `led`: de kathode. */
  b: string;
  /** EMK in volt — alleen voor `source`. */
  emf?: number;
  /** Weerstand in ohm — voor `resistor` en `lamp`. */
  resistance?: number;
  /** Gesloten? — alleen voor `switch`. Open = geen verbinding. */
  closed?: boolean;
  /** Drempelspanning in volt — alleen voor `led`. */
  vf?: number;
  /** Doorgebrand? — alleen voor `led`. Doorgebrand = permanent open. */
  burned?: boolean;
  /** Niet-ohms (gloeidraad: R stijgt met |U|) — alleen voor `lamp`. */
  nonOhmic?: boolean;
}

export interface Netlist {
  elements: SimElement[];
}

export interface SolveResult {
  /** False als een aangedreven component-eiland singulier/onoplosbaar bleek. */
  ok: boolean;
  /** Potentiaal (V) per originele knoopsleutel. */
  nodePotentials: Map<string, number>;
  /**
   * Stroom (A) per element-id. Teken: voor `resistor`/`lamp` positief van a→b;
   * voor `source` positief = uit de +pool (afgegeven stroom). Kortgesloten
   * bronnen krijgen `Infinity`.
   */
  elementCurrents: Map<string, number>;
  /** Gedissipeerd (R/lamp) of afgegeven (bron) vermogen (W) per element-id. */
  elementPowers: Map<string, number>;
  /** Element-id's van bronnen waarvan beide polen in dezelfde knoop liggen. */
  shortedSources: string[];
  /** Knoopsleutels die in de kortgesloten (super)knoop liggen — voor visuele markering. */
  shortedNodes: string[];
  /** Bronnen die parallel staan met een tegenstrijdige EMK (onoplosbaar conflict). */
  conflicts: string[];
}
