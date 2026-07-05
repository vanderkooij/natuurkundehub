/**
 * Het bewerkbare editor-model (React-state). Losgekoppeld van de solver: een
 * adapter (netlist.ts) vertaalt dit naar de generieke netlist.
 *
 * Geünificeerd knoop-model (PhET-stijl): **elke aansluiting is een eersteklas
 * vertex** met een opgeslagen positie. Component-terminals, draaduiteinden én
 * knikpunten zijn allemaal vertices die via hetzelfde snap-/samensmelt-mechanisme
 * aan elkaar gekoppeld kunnen worden. Twee branches (component of draad) die een
 * vertex delen, zitten op dezelfde elektrische knoop — dat geldt dus ook voor
 * twee componenten die direct aan elkaar gesnapt zijn (zonder draad ertussen).
 */

export type ComponentType =
  | "source"
  | "resistor"
  | "lamp"
  | "led"
  | "fuse"
  | "ldr"
  | "ntc"
  | "switch"
  | "voltmeter"
  | "ammeter"
  | "analogAmmeter"
  | "analogVoltmeter";

export interface Vertex {
  id: string;
  x: number;
  y: number;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  /** Vertex-id van terminal 0. Voor `source`: de +pool. */
  v0: string;
  /** Vertex-id van terminal 1. Voor `source`: de −pool. */
  v1: string;
  /** Gespiegeld (nodig voor LED-polariteit, Fase 5). */
  mirrored: boolean;
  values: {
    emf?: number;
    resistance?: number;
    closed?: boolean;
    /** LED-kleur (bepaalt de Vf); zie ledSpec. */
    color?: string;
    /** LED doorgebrand (permanent open tot vervangen). */
    burned?: boolean;
    /** Zekering: nominale stroom (A) waarboven hij doorbrandt. */
    imax?: number;
    /** Zekering doorgebrand (permanent open tot vervangen). */
    blown?: boolean;
    /** Sensor (LDR/NTC): omgevingswaarde 0–100 (% licht resp. °C); bepaalt R. */
    env?: number;
    /** Lamp: niet-ohms (gloeidraad, R stijgt met de spanning) i.p.v. vaste R. */
    nonOhmic?: boolean;
  };
  /** Alleen analoge VOS-meter: middelpunt + 4 poort-vertices [common, rood0..2]. */
  cx?: number;
  cy?: number;
  ports?: string[];
}

/**
 * Een draad als **polylijn**: een pad door ≥2 vertices. Alle vertices van een
 * draad zitten op dezelfde elektrische knoop (weerstandsloos). Tussenliggende
 * vertices zijn knikpunten waarvandaan je ook kunt vertakken.
 */
export interface Wire {
  id: string;
  nodes: string[];
}

/** Vrij tekstlabel op het canvas (notities, "meet hier", namen als R1). */
export interface TextLabel {
  id: string;
  x: number;
  y: number;
  text: string;
  /** Met kader (kaartje) — voor opdrachten; zonder = los bijschrift. */
  boxed?: boolean;
}

export interface CircuitDoc {
  vertices: Record<string, Vertex>;
  components: CircuitComponent[];
  wires: Wire[];
  /** Optioneel (oudere opgeslagen bestanden hebben dit veld niet). */
  labels?: TextLabel[];
}

export const EMPTY_DOC: CircuitDoc = { vertices: {}, components: [], wires: [], labels: [] };
