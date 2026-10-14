import type { OmgevingInstelling } from "./omgeving";

/**
 * Het schema als data: modules met bussen, en draden van een uitgang naar een
 * ingang. Alles is serialiseerbaar, zodat bewaren en delen later eenvoudig is.
 */

export type ModuleSoort =
  | "drukschakelaar"
  | "variabeleSpanning"
  | "sensor"
  | "geluidsensor"
  | "pulsgenerator"
  | "adOmzetter"
  | "comparator"
  | "en"
  | "of"
  | "invertor"
  | "transistor"
  | "nand"
  | "nor"
  | "xor"
  | "xnor"
  | "geheugencel"
  | "pulsenteller"
  | "led"
  | "zoemer"
  | "relais";

export type Kolom = "invoer" | "verwerking" | "uitvoer";

/** Instelbare waarden van een module: draaiknoppen, schakelaars. */
export type Params = Record<string, number | boolean>;

/** Interne toestand van een module (geheugen, tellerstand, fase). */
export type Toestand = Record<string, number | boolean>;

export interface ModuleInstantie {
  id: string;
  soort: ModuleSoort;
  /** Plaats op het werkvlak, in werkvlakeenheden. */
  x: number;
  y: number;
  params: Params;
  /** Het bord waar de module vast op zit; los op het werkvlak als dit ontbreekt. */
  bord?: string;
}

/** De twee soorten borden in het lokaal. */
export type BordSoort = "comparators" | "transistor";

/** Een bord: het paneel waarop een vaste set modules zit. */
export interface Bord {
  id: string;
  soort: BordSoort;
  x: number;
  y: number;
}

export interface BusAdres {
  module: string;
  bus: string;
}

/** Een draad loopt altijd van een uitgang (`van`) naar een ingang (`naar`). */
export interface Draad {
  id: string;
  van: BusAdres;
  naar: BusAdres;
  /**
   * Zelf gebogen: waar het buigpunt van de boog ligt, gemeten vanaf het
   * midden tussen de twee bussen. Zo blijft de bocht mee bewegen als je een
   * module verschuift. Zonder bocht kiest de tool zelf een boog.
   */
  bocht?: { x: number; y: number };
}

export interface Schakeling {
  modules: ModuleInstantie[];
  draden: Draad[];
  borden?: Bord[];
  /** Licht en temperatuur rond de sensoren; standaardwaarden als dit ontbreekt. */
  omgeving?: OmgevingInstelling;
}
