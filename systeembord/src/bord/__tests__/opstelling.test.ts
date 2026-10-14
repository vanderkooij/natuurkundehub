import { describe, expect, it } from "vitest";

import { VOORBEELDEN } from "@/bestand/voorbeelden";
import {
  apparatenVast,
  invloeden,
  kachelFactor,
  lampFactor,
  opstelling,
  sensorPunt,
  ventilatorFactor,
} from "@/bord/opstelling";
import { Simulator, type Schakeling } from "@/sim";

const S = { x: 0, y: 0 };

describe("hoe sterk een apparaat op de sensor werkt", () => {
  it("de lamp schijnt naar beneden, als een straatlantaarn", () => {
    // Standaardplek: linksboven de sensor.
    expect(lampFactor({ x: -40, y: -80 }, S)).toBeCloseTo(1);
    // Recht boven de sensor: vol licht.
    expect(lampFactor({ x: 0, y: -60 }, S)).toBeGreaterThan(1);
    // De sensor bovenop de lamp: geen licht.
    expect(lampFactor({ x: 0, y: 30 }, S)).toBe(0);
    // Ver weg: weinig licht.
    expect(lampFactor({ x: 0, y: -500 }, S)).toBeLessThan(0.1);
    // Naast de lamp, buiten de kegel: niets.
    expect(lampFactor({ x: -200, y: -20 }, S)).toBe(0);
  });

  it("de kachel verwarmt wat dichtbij is", () => {
    expect(kachelFactor({ x: -90, y: 0 }, S)).toBeCloseTo(1);
    expect(kachelFactor({ x: -400, y: 0 }, S)).toBeLessThan(0.15);
  });

  it("de ventilator blaast naar rechts", () => {
    expect(ventilatorFactor({ x: -90, y: 0 }, S)).toBeCloseTo(1);
    expect(ventilatorFactor({ x: 90, y: 0 }, S)).toBe(0);
  });
});

/** De straatlantaarn uit de docentvoorbeelden, eventueel met de sensor ergens anders. */
function lantaarn(sensorErgens?: (s: Schakeling) => Schakeling) {
  let s = VOORBEELDEN.find((v) => v.naam.startsWith("Straatlantaarn"))!.maak();
  if (sensorErgens) s = sensorErgens(s);
  const sim = new Simulator(s);
  sim.zetOpstelling(invloeden(opstelling(s)));
  const relais = s.modules.find((m) => m.soort === "relais")!.id;
  let wissels = 0;
  let vorige = sim.relaisGesloten(relais);
  for (let i = 0; i < 1000; i++) {
    sim.stap(0.01);
    const nu = sim.relaisGesloten(relais);
    if (nu !== vorige) wissels++;
    vorige = nu;
  }
  return { wissels, aan: sim.relaisGesloten(relais) };
}

describe("de straatlantaarn uit opdracht 8b", () => {
  it("met de sensor onder de lamp gaat hij knipperen", () => {
    expect(lantaarn().wissels).toBeGreaterThanOrEqual(6);
  });

  it("met de sensor bovenop de lamp blijft hij gewoon branden", () => {
    const r = lantaarn((s) => {
      const { kringen } = opstelling(s);
      const lamp = kringen[0].punt;
      // Zoals bij slepen: de lamp blijft hangen, de sensor gaat erbovenop.
      const vast = apparatenVast(s);
      return {
        ...s,
        modules: s.modules.map((m) => {
          if (vast[m.id])
            return { ...m, params: { ...m.params, ...vast[m.id] } };
          if (m.soort !== "sensor" || m.params.sensor !== 1) return m;
          // Leg de LDR net boven de kap van de lamp.
          const p = sensorPunt(m);
          return {
            ...m,
            params: {
              ...m.params,
              sx: Number(m.params.sx) + lamp.x - p.x,
              sy: Number(m.params.sy) + lamp.y - 40 - p.y,
            },
          };
        }),
      };
    });
    expect(r.aan).toBe(true);
    expect(r.wissels).toBeLessThanOrEqual(1);
  });
});
