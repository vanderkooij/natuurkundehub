import {
  RELAIS_APPARATEN,
  SENSOREN,
  type ModuleInstantie,
  type Opstelling,
  type Params,
  type Schakeling,
} from "@/sim";

import { bordRechthoek, omhulling } from "./borden";
import { vormVan, type Punt } from "./geometrie";
import type { Rechthoek } from "@/werkvlak/kijkvenster";

/**
 * Alles buiten het bord en waar het staat: de losse sensoren (LDR, NTC) en
 * bij elk relais met een draad ernaartoe het apparaat in de tweede
 * stroomkring. Je kunt ze allebei verslepen. Hoe sterk een apparaat op een
 * sensor werkt, hangt af van hoe ze ten opzichte van elkaar staan: de lamp
 * schijnt als een straatlantaarn naar beneden, de kachel verwarmt wat dichtbij
 * is en de ventilator blaast naar rechts.
 */

export type ApparaatSoort = (typeof RELAIS_APPARATEN)[number];

export interface SensorOpstelling {
  m: ModuleInstantie;
  soort: "licht" | "temperatuur";
  /** Midden van de losse sensor. */
  punt: Punt;
}

export interface Kring {
  relais: ModuleInstantie;
  apparaat: ApparaatSoort;
  /** Midden van het apparaat. */
  punt: Punt;
  /** Volgnummer van de kring: een tweede kring ligt om de eerste heen. */
  index: number;
}

const num = (m: ModuleInstantie, naam: string, standaard: number) => {
  const v = m.params[naam];
  return typeof v === "number" ? v : standaard;
};

/** Waar de losse sensor ligt: links naast het vak, tenzij hij versleept is. */
export const sensorPunt = (m: ModuleInstantie): Punt => ({
  x: m.x + num(m, "sx", -50),
  y: m.y + num(m, "sy", 39),
});

/** Rechthoek om alle borden en modules. */
export function randen(s: Schakeling) {
  const vakken = [
    ...(s.borden ?? []).map(bordRechthoek),
    ...s.modules.map((m) => ({ x: m.x, y: m.y, ...vormVan(m.soort) })),
  ];
  return {
    links: Math.min(...vakken.map((v) => v.x)),
    rechts: Math.max(...vakken.map((v) => v.x + v.breedte)),
    boven: Math.min(...vakken.map((v) => v.y)),
  };
}

/** Waar elk ding staat. */
export function opstelling(s: Schakeling): {
  sensoren: SensorOpstelling[];
  kringen: Kring[];
} {
  const sensoren: SensorOpstelling[] = s.modules.flatMap((m) => {
    const soort =
      m.soort === "sensor" ? SENSOREN[Number(m.params.sensor ?? 0)] : null;
    return soort === "licht" || soort === "temperatuur"
      ? [{ m, soort, punt: sensorPunt(m) }]
      : [];
  });
  const relais = s.modules.filter(
    (m) => m.soort === "relais" && s.draden.some((d) => d.naar.module === m.id),
  );
  if (relais.length === 0) return { sensoren, kringen: [] };
  const { rechts } = randen(s);
  const soorten = relais.map(
    (r): ApparaatSoort =>
      RELAIS_APPARATEN[Number(r.params.apparaat ?? 0)] ?? "lamp",
  );
  const kringen = relais.map((r, index): Kring => {
    const apparaat = soorten[index];
    if (r.params.verplaatst === true)
      return {
        relais: r,
        apparaat,
        index,
        punt: { x: r.x + num(r, "ax", 0), y: r.y + num(r, "ay", 0) },
      };
    // Niet versleept: naast de sensor waar het op werkt, anders rechts bij de voeding.
    const nodig = apparaat === "lamp" ? "licht" : "temperatuur";
    const sensor = sensoren.find((x) => x.soort === nodig);
    if (!sensor)
      return {
        relais: r,
        apparaat,
        index,
        punt: { x: rechts + 80 + index * 70, y: r.y + 90 },
      };
    // Buren: niet-versleepte apparaten van dezelfde groep bij deze sensor.
    const groep = relais
      .map((x, i) => ({ x, soort: soorten[i] }))
      .filter(
        (b) =>
          b.x.params.verplaatst !== true &&
          (b.soort === "lamp") === (apparaat === "lamp"),
      );
    const j = groep.findIndex((b) => b.x === r);
    const S = sensor.punt;
    const punt =
      apparaat === "lamp"
        ? { x: S.x + LAMP_STANDAARD.x - j * 60, y: S.y + LAMP_STANDAARD.y }
        : {
            x: S.x + WARM_STANDAARD.x,
            y: S.y + (j - (groep.length - 1) / 2) * 64,
          };
    return { relais: r, apparaat, index, punt };
  });
  return { sensoren, kringen };
}

/**
 * Zet elk apparaat dat nog naast zijn sensor staat vast op zijn plek. Zo
 * blijft de lamp hangen als je de sensor versleept, en kun je de sensor
 * bijvoorbeeld bovenop de lamp leggen.
 */
export function apparatenVast(s: Schakeling): Record<string, Params> {
  const uit: Record<string, Params> = {};
  for (const k of opstelling(s).kringen)
    if (k.relais.params.verplaatst !== true)
      uit[k.relais.id] = {
        verplaatst: true,
        ax: Math.round(k.punt.x - k.relais.x),
        ay: Math.round(k.punt.y - k.relais.y),
      };
  return uit;
}

/** Standaardplek van de lamp: linksboven de sensor, zodat hij erop schijnt. */
const LAMP_STANDAARD = { x: -40, y: -80 };
/** Standaardplek van kachel en ventilator: links van de sensor. */
const WARM_STANDAARD = { x: -90, y: 0 };

/** Het licht komt uit de onderkant van de lamp. */
export const LAMP_BRON = 10;
/** Halve openingshoek van de lichtkegel: tot hier vol licht, daarna minder. */
export const KEGEL_VOL = 40;
export const KEGEL_RAND = 65;
/** De ventilator blaast naar rechts, in een smallere bundel. */
const WIND_VOL = 30;
const WIND_RAND = 60;

/** Hoe het effect afneemt met de afstand. */
const afstand = (r: number, schaal: number) => 1 / (1 + (r / schaal) ** 2);
const graden = (rad: number) => (rad * 180) / Math.PI;
/** 1 binnen `vol` graden, 0 voorbij `rand`, daartussen geleidelijk. */
const bundel = (hoek: number, vol: number, rand: number) =>
  hoek <= vol ? 1 : hoek >= rand ? 0 : (rand - hoek) / (rand - vol);

/** Licht van een lamp op `l` dat op een sensor op `s` valt (1 = standaardplek). */
export function lampFactor(l: Punt, s: Punt): number {
  const dx = s.x - l.x,
    dy = s.y - (l.y + LAMP_BRON);
  // Boven de lamp (of ernaast op gelijke hoogte) komt geen licht.
  if (dy <= 0) return 0;
  const kegel = bundel(
    graden(Math.atan2(Math.abs(dx), dy)),
    KEGEL_VOL,
    KEGEL_RAND,
  );
  const r = Math.hypot(dx, dy);
  const standaard = Math.hypot(LAMP_STANDAARD.x, LAMP_STANDAARD.y + LAMP_BRON);
  return Math.min(1.5, (kegel * afstand(r, 110)) / afstand(standaard, 110));
}

/** Warmte van een kachel op `k` bij een sensor op `s` (1 = standaardplek). */
export function kachelFactor(k: Punt, s: Punt): number {
  const r = Math.hypot(s.x - k.x, s.y - k.y);
  return Math.min(1.5, afstand(r, 100) / afstand(-WARM_STANDAARD.x, 100));
}

/** Wind van een ventilator op `v` bij een sensor op `s` (1 = standaardplek). */
export function ventilatorFactor(v: Punt, s: Punt): number {
  const dx = s.x - v.x,
    dy = s.y - v.y;
  if (dx <= 0) return 0;
  const bundelF = bundel(
    graden(Math.atan2(Math.abs(dy), dx)),
    WIND_VOL,
    WIND_RAND,
  );
  const r = Math.hypot(dx, dy);
  return Math.min(
    1.3,
    (bundelF * afstand(r, 150)) / afstand(-WARM_STANDAARD.x, 150),
  );
}

/** Voor de simulator: hoe sterk elk apparaat op elke sensor werkt. */
export function invloeden(o: ReturnType<typeof opstelling>): Opstelling {
  const uit: Opstelling = {};
  for (const s of o.sensoren) {
    const rij: Record<string, number> = {};
    for (const k of o.kringen)
      rij[k.relais.id] =
        k.apparaat === "lamp"
          ? lampFactor(k.punt, s.punt)
          : k.apparaat === "kachel"
            ? kachelFactor(k.punt, s.punt)
            : ventilatorFactor(k.punt, s.punt);
    uit[s.m.id] = rij;
  }
  return uit;
}

/** "Alles in beeld": de borden en modules, plus waar sensoren en apparaten liggen. */
export function omhullingMetOpstelling(s: Schakeling): Rechthoek {
  const r = omhulling(s);
  const { sensoren, kringen } = opstelling(s);
  const punten = [
    ...sensoren.map((x) => x.punt),
    ...kringen.map((k) => k.punt),
  ];
  if (punten.length === 0) return r;
  const MARGE = 70;
  const x0 = Math.min(r.x, ...punten.map((p) => p.x - MARGE));
  const y0 = Math.min(r.y, ...punten.map((p) => p.y - MARGE));
  const x1 = Math.max(r.x + r.breedte, ...punten.map((p) => p.x + MARGE));
  const y1 = Math.max(r.y + r.hoogte, ...punten.map((p) => p.y + MARGE));
  return { x: x0, y: y0, breedte: x1 - x0, hoogte: y1 - y0 };
}
