import { describe, expect, it } from "vitest";

import {
  GELUID_PIEK,
  HOOG,
  LAAG,
  maakModule,
  Simulator,
  voegDraadToe,
  type ModuleSoort,
  type Params,
  type Schakeling,
} from "@/sim";

/**
 * De voorbeelden uit de oude systeembord-exe van Tommy Sools (sysbord151.zip),
 * nagebouwd op wat ze doen. De .brd-bestanden zelf gebruiken een eigen
 * nummering van modules; het gaat hier om het gedrag.
 */

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

function zet(
  sim: Simulator,
  s: Schakeling,
  id: string,
  naam: string,
  waarde: number | boolean,
) {
  const m = s.modules.find((x) => x.id === id)!;
  m.params = { ...m.params, [naam]: waarde };
  sim.zetSchakeling({ ...s, modules: [...s.modules] });
}

function druk(sim: Simulator, s: Schakeling, id: string) {
  zet(sim, s, id, "ingedrukt", true);
  sim.stap(0.05);
  zet(sim, s, id, "ingedrukt", false);
}

/** Hoe vaak een ingang in `duur` seconden van laag naar hoog gaat, gemeten per 10 ms. */
function flanken(sim: Simulator, id: string, bus: string, duur: number) {
  let n = 0;
  let vorige = sim.spanning(id, bus) === HOOG;
  for (let t = 0; t < duur; t += 0.01) {
    sim.stap(0.01);
    const nu = sim.spanning(id, bus) === HOOG;
    if (nu && !vorige) n++;
    vorige = nu;
  }
  return n;
}

describe("voorbeelden uit de oude exe", () => {
  it("thermostaat: kachel aan zolang het te koud is", () => {
    // Temperatuursensor: hogere spanning bij hogere temperatuur. Te koud is
    // onder Uref, dus de comparator is laag en de invertor zet het relais aan.
    const s = bouw(
      [
        ["temp", "sensor", { spanning: 2 }],
        ["c", "comparator", { uref: 3.1 }],
        ["n", "invertor"],
        ["r", "relais", { apparaat: 1 }],
      ],
      [
        ["temp.uit1", "c.in"],
        ["c.uit", "n.in"],
        ["n.uit", "r.in"],
      ],
    );
    const sim = new Simulator(s);
    expect(sim.spanning("r", "in")).toBe(HOOG);
    zet(sim, s, "temp", "spanning", 3.5);
    expect(sim.spanning("r", "in")).toBe(LAAG);
  });

  it("verklikkerlichtje voor een donkere kamer: led aan als het donker is", () => {
    const s = bouw(
      [
        ["licht", "sensor", { spanning: 4 }],
        ["c", "comparator", { uref: 2 }],
        ["n", "invertor"],
        ["led", "led"],
      ],
      [
        ["licht.uit1", "c.in"],
        ["c.uit", "n.in"],
        ["n.uit", "led.in"],
      ],
    );
    const sim = new Simulator(s);
    expect(sim.spanning("led", "in")).toBe(LAAG);
    zet(sim, s, "licht", "spanning", 0.5);
    expect(sim.spanning("led", "in")).toBe(HOOG);
  });

  it("piep na 8 seconden na drukken op de knop", () => {
    // Knop zet de geheugencel; die zet het tellen aan; de pulsgenerator op
    // 1 Hz telt de seconden; uitgang 8 laat de zoemer piepen.
    const s = bouw(
      [
        ["knop", "drukschakelaar"],
        ["m", "geheugencel"],
        ["p", "pulsgenerator", { frequentie: 1 }],
        ["t", "pulsenteller"],
        ["z", "zoemer"],
      ],
      [
        ["knop.uit", "m.set"],
        ["m.uit", "t.aan"],
        ["p.uit", "t.tel"],
        ["t.8", "z.in"],
      ],
    );
    const sim = new Simulator(s);
    sim.stap(20);
    expect(sim.spanning("z", "in")).toBe(LAAG);
    druk(sim, s, "knop");
    sim.stap(7);
    expect(sim.spanning("z", "in")).toBe(LAAG);
    sim.stap(1.5);
    expect(sim.spanning("z", "in")).toBe(HOOG);
  });

  it("tel vanaf een knal tot het donker wordt", () => {
    // Knal zet de geheugencel en zet de teller op 0, donker reset de
    // geheugencel; zolang die hoog is telt de teller de seconden.
    const s = bouw(
      [
        ["g", "geluidsensor"],
        ["cg", "comparator", { uref: 2 }],
        ["licht", "sensor", { spanning: 4 }],
        ["cl", "comparator", { uref: 2 }],
        ["donker", "invertor"],
        ["m", "geheugencel"],
        ["p", "pulsgenerator", { frequentie: 1 }],
        ["t", "pulsenteller"],
      ],
      [
        ["g.uit", "cg.in"],
        ["cg.uit", "m.set"],
        ["cg.uit", "t.reset"],
        ["licht.uit1", "cl.in"],
        ["cl.uit", "donker.in"],
        ["donker.uit", "m.reset"],
        ["m.uit", "t.aan"],
        ["p.uit", "t.tel"],
      ],
    );
    const sim = new Simulator(s);
    sim.stap(5);
    expect(Number(sim.toestand("t")!.stand)).toBe(0);
    sim.tikOpGeluidsensor("g", GELUID_PIEK);
    sim.stap(4);
    zet(sim, s, "licht", "spanning", 0.5);
    sim.stap(5);
    expect(Number(sim.toestand("t")!.stand)).toBe(4);
    // Een tweede meting begint weer bij 0, niet bij 4.
    zet(sim, s, "licht", "spanning", 4);
    sim.tikOpGeluidsensor("g", GELUID_PIEK);
    sim.stap(3);
    zet(sim, s, "licht", "spanning", 0.5);
    sim.stap(2);
    expect(Number(sim.toestand("t")!.stand)).toBe(3);
  });

  it("piepgenerator: pulsgenerator op de zoemer piept met de ingestelde frequentie", () => {
    const s = bouw(
      [
        ["p", "pulsgenerator", { frequentie: 3 }],
        ["z", "zoemer"],
      ],
      [["p.uit", "z.in"]],
    );
    const sim = new Simulator(s);
    expect(flanken(sim, "z", "in", 2)).toBe(6);
  });

  it("afwisselend pieppatroon: om de seconde een reeks piepjes", () => {
    // Een snelle pulsgenerator geeft de piepjes, een trage teller zet ze om de
    // seconde aan en uit (uitgang 1), samen via een EN-poort op de zoemer.
    const s = bouw(
      [
        ["traag", "pulsgenerator", { frequentie: 1 }],
        ["snel", "pulsgenerator", { frequentie: 5 }],
        ["t", "pulsenteller"],
        ["en", "en"],
        ["z", "zoemer"],
      ],
      [
        ["traag.uit", "t.tel"],
        ["t.1", "en.in1"],
        ["snel.uit", "en.in2"],
        ["en.uit", "z.in"],
      ],
    );
    const sim = new Simulator(s);
    // Per seconde: stand oneven geeft 5 piepjes, stand even geen.
    const perSeconde: number[] = [];
    sim.stap(0.5); // tot de eerste telpuls
    for (let i = 0; i < 4; i++) perSeconde.push(flanken(sim, "z", "in", 1));
    // Precies op de grens kan één piepje van de volgende seconde meetellen.
    expect(perSeconde.map((n) => n >= 3)).toEqual([true, false, true, false]);
    expect(perSeconde[1]).toBeLessThanOrEqual(1);
    expect(Math.max(...perSeconde)).toBeGreaterThanOrEqual(4);
  });

  it("teller: pulsgenerator op de teller, het display loopt mee", () => {
    const s = bouw(
      [
        ["p", "pulsgenerator", { frequentie: 2 }],
        ["t", "pulsenteller", { max: 9 }],
      ],
      [["p.uit", "t.tel"]],
    );
    const sim = new Simulator(s);
    sim.stap(4.2);
    expect(Number(sim.toestand("t")!.stand)).toBe(8);
    sim.stap(1);
    expect(Number(sim.toestand("t")!.stand)).toBe(0);
  });
});
