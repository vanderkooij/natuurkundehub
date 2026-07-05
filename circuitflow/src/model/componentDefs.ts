import { DEFAULT_LED_COLOR } from "./ledSpec";
import type { ComponentType } from "./types";

/** Standaard-afstand (wereld-px) tussen de twee terminals bij het plaatsen. */
export const TERMINAL_SPAN = 120;

/**
 * Halve breedte van de body langs de as: hier hechten de leads aan, en vanaf
 * dit punt loopt een (flexibele) lead naar de bijbehorende terminal-vertex.
 */
export const LEAD_ATTACH: Record<ComponentType, number> = {
  source: 26,
  resistor: 30,
  lamp: 21,
  led: 20,
  fuse: 24,
  ldr: 30,
  ntc: 30,
  switch: 16,
  voltmeter: 34,
  ammeter: 34,
  analogAmmeter: 0, // analoge meters gebruiken poorten i.p.v. leads
  analogVoltmeter: 0,
};

export interface ComponentDef {
  label: string;
  /** Contextueel bewerkbare waarde; ontbreekt bij de schakelaar (die toggelt). */
  valueKey?: "emf" | "resistance" | "imax" | "env";
  unit?: string;
  defaults: {
    emf?: number;
    resistance?: number;
    closed?: boolean;
    color?: string;
    burned?: boolean;
    imax?: number;
    blown?: boolean;
    env?: number;
    nonOhmic?: boolean;
  };
  min?: number;
  max?: number;
  step?: number;
}

export const COMPONENT_DEFS: Record<ComponentType, ComponentDef> = {
  source: {
    label: "Spanningsbron",
    valueKey: "emf",
    unit: "V",
    defaults: { emf: 6 },
    min: 0,
    max: 24,
    step: 0.5,
  },
  resistor: {
    label: "Weerstand",
    valueKey: "resistance",
    unit: "Ω",
    defaults: { resistance: 10 },
    min: 1,
    max: 1000,
    step: 1,
  },
  lamp: {
    label: "Lamp",
    valueKey: "resistance",
    unit: "Ω",
    defaults: { resistance: 6 },
    min: 1,
    max: 200,
    step: 1,
  },
  led: {
    label: "LED",
    // Geen numerieke waarde: de kleur bepaalt de drempelspanning (zie ledSpec).
    defaults: { color: DEFAULT_LED_COLOR },
  },
  fuse: {
    label: "Zekering",
    valueKey: "imax",
    unit: "A",
    defaults: { imax: 1 },
    min: 0.1,
    max: 5,
    step: 0.1,
  },
  ldr: {
    label: "LDR",
    valueKey: "env",
    unit: "%",
    defaults: { env: 50 },
    min: 0,
    max: 100,
    step: 1,
  },
  ntc: {
    label: "NTC",
    valueKey: "env",
    unit: "°C",
    defaults: { env: 20 },
    min: 0,
    max: 100,
    step: 1,
  },
  switch: {
    label: "Schakelaar",
    defaults: { closed: true },
  },
  voltmeter: {
    label: "Voltmeter",
    defaults: {},
  },
  ammeter: {
    label: "Ampèremeter",
    defaults: {},
  },
  analogAmmeter: {
    label: "Analoge A-meter",
    defaults: {},
  },
  analogVoltmeter: {
    label: "Analoge V-meter",
    defaults: {},
  },
};

export const PALETTE: ComponentType[] = [
  "source",
  "resistor",
  "lamp",
  "led",
  "fuse",
  "ldr",
  "ntc",
  "switch",
];

/** Instrumenten in de rechterstrook (sleepbaar op het canvas). */
export const INSTRUMENTS: ComponentType[] = [
  "voltmeter",
  "ammeter",
  "analogAmmeter",
  "analogVoltmeter",
];
