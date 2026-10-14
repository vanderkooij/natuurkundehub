import { describe, expect, it } from "vitest";

import {
  HOOG,
  KACHEL_MAX,
  lichtNaarSpanning,
  maakModule,
  SENSOREN,
  Simulator,
  standaardOmgeving,
  temperatuurNaarSpanning,
  voegDraadToe,
  type ModuleSoort,
  type Params,
  type Schakeling,
} from "@/sim";

function bouw(
  modules: [string, ModuleSoort, Params?][],
  draden: [string, string][],
): Schakeling {
  let s: Schakeling = {
    modules: modules.map(([id, soort, p]) =>
      maakModule(soort, id, 0, 0, p ?? {}),
    ),
    draden: [],
  };
  draden.forEach(([a, b], i) => {
    const [am, ab] = a.split(".");
    const [bm, bb] = b.split(".");
    const r = voegDraadToe(
      s,
      { module: am, bus: ab },
      { module: bm, bus: bb },
      `d${i}`,
    );
    if (r.fout) throw new Error(`${a} -> ${b}: ${r.fout}`);
    s = r.schakeling;
  });
  return s;
}

const LICHT = SENSOREN.indexOf("licht");
const TEMP = SENSOREN.indexOf("temperatuur");
const KACHEL = 1;
const LAMP = 0;

describe("sensoren", () => {
  it("lichtsensor: lichter geeft een hogere spanning, steeds minder per lux", () => {
    expect(lichtNaarSpanning(0)).toBe(0);
    expect(lichtNaarSpanning(250)).toBeCloseTo(2.5);
    expect(lichtNaarSpanning(1000)).toBeGreaterThan(lichtNaarSpanning(500));
    expect(lichtNaarSpanning(1000) - lichtNaarSpanning(500)).toBeLessThan(
      lichtNaarSpanning(500) - lichtNaarSpanning(0),
    );
  });

  it("temperatuursensor: warmer geeft een hogere spanning", () => {
    expect(temperatuurNaarSpanning(20)).toBeCloseTo(1.3);
    expect(temperatuurNaarSpanning(50)).toBeCloseTo(2.5);
  });

  it("de sensor in de bus volgt de omgeving", () => {
    const s = bouw([["l", "sensor", { sensor: LICHT }]], []);
    s.omgeving = { ...standaardOmgeving(), licht: 250 };
    const sim = new Simulator(s);
    expect(sim.spanning("l", "uit1")).toBeCloseTo(2.5);
    sim.zetSchakeling({ ...s, omgeving: { ...s.omgeving, licht: 0 } });
    // Een LDR reageert traag: niet meteen, wel na een paar seconden.
    expect(sim.spanning("l", "uit2")).toBeGreaterThan(2);
    sim.stap(8);
    expect(sim.spanning("l", "uit2")).toBeLessThan(0.05);
  });
});

describe("temperatuur", () => {
  it("de kachel warmt op tot een evenwicht en koelt daarna af", () => {
    const s = bouw([["t", "sensor", { sensor: TEMP }]], []);
    s.omgeving = { ...standaardOmgeving(), kachel: true };
    const sim = new Simulator(s);
    expect(sim.omgeving().temperatuur).toBe(20);
    sim.stap(200);
    expect(sim.omgeving().temperatuur).toBeCloseTo(20 + KACHEL_MAX, 0);
    sim.zetSchakeling({ ...s, omgeving: { ...s.omgeving!, kachel: false } });
    sim.stap(200);
    expect(sim.omgeving().temperatuur).toBeCloseTo(20, 0);
  });

  it("thermostaat (regelsysteem): de kachel aan het relais houdt het rond de ingestelde waarde", () => {
    // Te koud: sensor onder Uref, comparator laag, invertor zet het relais met de kachel aan.
    const uref = temperatuurNaarSpanning(30);
    const s = bouw(
      [
        ["t", "sensor", { sensor: TEMP }],
        ["c", "comparator", { uref }],
        ["n", "invertor"],
        ["r", "relais", { apparaat: KACHEL }],
      ],
      [
        ["t.uit1", "c.in"],
        ["c.uit", "n.in"],
        ["n.uit", "r.in"],
      ],
    );
    const sim = new Simulator(s);
    sim.stap(60);
    const metingen: number[] = [];
    let wissels = 0;
    let vorige = sim.relaisGesloten("r");
    for (let i = 0; i < 6000; i++) {
      sim.stap(0.01);
      const nu = sim.relaisGesloten("r");
      if (nu !== vorige) wissels++;
      vorige = nu;
      if (i % 50 === 0) metingen.push(sim.omgeving().temperatuur);
    }
    // Schommelt rond de 30 °C, zoals een echte thermostaat.
    expect(Math.min(...metingen)).toBeGreaterThan(27.5);
    expect(Math.max(...metingen)).toBeLessThan(33);
    // De kachel gaat af en toe aan en uit, niet tientallen keren per seconde
    // (anders flikkert het scherm). Hier: een paar keer per minuut.
    expect(wissels).toBeGreaterThanOrEqual(2);
    expect(wissels).toBeLessThan(40);
  });

  it("de ventilator laat sneller afkoelen", () => {
    const afkoelen = (ventilator: boolean) => {
      const s = bouw(
        [
          ["k", "drukschakelaar", { ingedrukt: ventilator }],
          ["r", "relais", { apparaat: 2 }],
        ],
        [["k.uit", "r.in"]],
      );
      s.omgeving = { ...standaardOmgeving(), kachel: true };
      const sim = new Simulator(s);
      sim.stap(100);
      sim.zetSchakeling({ ...s, omgeving: { ...s.omgeving!, kachel: false } });
      sim.stap(10);
      return sim.omgeving().temperatuur;
    };
    expect(afkoelen(true)).toBeLessThan(afkoelen(false) - 5);
  });
});

describe("licht", () => {
  it("straatlantaarn met de sensor onder de lamp gaat knipperen (werkboek, opdracht 8b)", () => {
    // Donker: lamp aan. Maar het licht van de lamp valt op de sensor, dan
    // lijkt het licht en gaat de lamp uit, en zo verder.
    const s = bouw(
      [
        ["l", "sensor", { sensor: LICHT }],
        ["c", "comparator", { uref: 2 }],
        ["n", "invertor"],
        ["r", "relais", { apparaat: LAMP }],
      ],
      [
        ["l.uit1", "c.in"],
        ["c.uit", "n.in"],
        ["n.uit", "r.in"],
      ],
    );
    s.omgeving = { ...standaardOmgeving(), licht: 20 };
    const sim = new Simulator(s);
    let wissels = 0;
    let vorige = sim.relaisGesloten("r");
    for (let i = 0; i < 1000; i++) {
      sim.stap(0.01);
      const nu = sim.relaisGesloten("r");
      if (nu !== vorige) wissels++;
      vorige = nu;
    }
    // Knippert zichtbaar, ongeveer eens per één à twee seconden: niet stil, en
    // geen geklapper (dat deed hij zonder schakeltijd van het relais).
    expect(wissels).toBeGreaterThanOrEqual(6);
    expect(wissels).toBeLessThan(30);
  });

  it("met de sensor uit het licht van de lamp blijft hij gewoon branden", () => {
    const s = bouw(
      [
        ["l", "sensor", { spanning: 0.5 }],
        ["c", "comparator", { uref: 2 }],
        ["n", "invertor"],
        ["r", "relais", { apparaat: LAMP }],
      ],
      [
        ["l.uit1", "c.in"],
        ["c.uit", "n.in"],
        ["n.uit", "r.in"],
      ],
    );
    const sim = new Simulator(s);
    sim.stap(3);
    expect(sim.spanning("r", "in")).toBe(HOOG);
  });
});
