import { describe, expect, it } from "vitest";

import {
  controleerDraad,
  GELUID_PIEK,
  HOOG,
  LAAG,
  legeSchakeling,
  maakModule,
  Simulator,
  voegDraadToe,
  type ModuleSoort,
  type Params,
  type Schakeling,
} from "@/sim";

/** Kleine bouwhulp: modules en draden als "id.bus". */
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

/** Zet een instelling en laat de simulator opnieuw rekenen. */
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

/** Druk een knop kort in (20 ms) en laat hem los. */
function druk(sim: Simulator, s: Schakeling, id: string) {
  zet(sim, s, id, "ingedrukt", true);
  sim.stap(0.02);
  zet(sim, s, id, "ingedrukt", false);
  sim.stap(0.02);
}

const stand = (sim: Simulator, id: string) => Number(sim.toestand(id)!.stand);

describe("draden", () => {
  const s = bouw(
    [
      ["a", "drukschakelaar"],
      ["b", "drukschakelaar"],
      ["en", "en"],
    ],
    [["a.uit", "en.in1"]],
  );

  it("loopt altijd van uitgang naar ingang, ook andersom getrokken", () => {
    const c = controleerDraad(
      s,
      { module: "en", bus: "in2" },
      { module: "b", bus: "uit" },
    );
    expect(c).toEqual({
      ok: true,
      van: { module: "b", bus: "uit" },
      naar: { module: "en", bus: "in2" },
    });
  });

  it("weigert uitgang aan uitgang, ingang aan ingang en een tweede draad op een ingang", () => {
    expect(
      controleerDraad(
        s,
        { module: "a", bus: "uit" },
        { module: "b", bus: "uit" },
      ).ok,
    ).toBe(false);
    expect(
      controleerDraad(
        s,
        { module: "en", bus: "in1" },
        { module: "en", bus: "in2" },
      ).ok,
    ).toBe(false);
    expect(
      controleerDraad(
        s,
        { module: "b", bus: "uit" },
        { module: "en", bus: "in1" },
      ).ok,
    ).toBe(false);
  });

  it("één uitgang mag naar meerdere ingangen", () => {
    expect(
      controleerDraad(
        s,
        { module: "a", bus: "uit" },
        { module: "en", bus: "in2" },
      ).ok,
    ).toBe(true);
  });
});

describe("poorten", () => {
  const tabel = (soort: ModuleSoort) => {
    const s = bouw(
      [
        ["a", "drukschakelaar"],
        ["b", "drukschakelaar"],
        ["p", soort],
      ],
      [
        ["a.uit", "p.in1"],
        ["b.uit", "p.in2"],
      ],
    );
    const sim = new Simulator(s);
    const rijen: number[] = [];
    for (const [a, b] of [
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ]) {
      zet(sim, s, "a", "ingedrukt", a);
      zet(sim, s, "b", "ingedrukt", b);
      rijen.push(sim.spanning("p", "uit") === HOOG ? 1 : 0);
    }
    return rijen;
  };

  it("EN-poort", () => expect(tabel("en")).toEqual([0, 0, 0, 1]));
  it("OF-poort", () => expect(tabel("of")).toEqual([0, 1, 1, 1]));

  it.each(["invertor", "transistor"] as const)("%s keert om", (soort) => {
    const s = bouw(
      [
        ["a", "drukschakelaar"],
        ["n", soort],
      ],
      [["a.uit", "n.in"]],
    );
    const sim = new Simulator(s);
    expect(sim.spanning("n", "uit")).toBe(HOOG);
    zet(sim, s, "a", "ingedrukt", true);
    expect(sim.spanning("n", "uit")).toBe(LAAG);
  });

  it("een open ingang is laag", () => {
    const sim = new Simulator(bouw([["n", "invertor"]], []));
    expect(sim.spanning("n", "in")).toBe(LAAG);
    expect(sim.spanning("n", "uit")).toBe(HOOG);
  });

  it("een analoog signaal telt als hoog vanaf 2,5 V", () => {
    const s = bouw(
      [
        ["v", "variabeleSpanning"],
        ["n", "invertor"],
      ],
      [["v.uit", "n.in"]],
    );
    const sim = new Simulator(s);
    zet(sim, s, "v", "spanning", 2.4);
    expect(sim.spanning("n", "uit")).toBe(HOOG);
    zet(sim, s, "v", "spanning", 2.5);
    expect(sim.spanning("n", "uit")).toBe(LAAG);
  });
});

describe("comparator", () => {
  it("is hoog als de ingang boven Uref zit (opdracht 11)", () => {
    const s = bouw(
      [
        ["v", "variabeleSpanning"],
        ["c", "comparator", { uref: 3 }],
        ["led", "led"],
      ],
      [
        ["v.uit", "c.in"],
        ["c.uit", "led.in"],
      ],
    );
    const sim = new Simulator(s);
    const aan: number[] = [];
    for (let u = 0; u <= 5; u += 0.5) {
      zet(sim, s, "v", "spanning", u);
      if (sim.spanning("led", "in") === HOOG) aan.push(u);
    }
    expect(aan[0]).toBe(3.5);
    zet(sim, s, "c", "uref", 1);
    zet(sim, s, "v", "spanning", 1.5);
    expect(sim.spanning("led", "in")).toBe(HOOG);
  });
});

describe("geheugencel", () => {
  it("onthoudt set tot reset (opdracht 21)", () => {
    const s = bouw(
      [
        ["s", "drukschakelaar"],
        ["r", "drukschakelaar"],
        ["m", "geheugencel"],
      ],
      [
        ["s.uit", "m.set"],
        ["r.uit", "m.reset"],
      ],
    );
    const sim = new Simulator(s);
    expect(sim.spanning("m", "uit")).toBe(LAAG);
    druk(sim, s, "s");
    expect(sim.spanning("m", "uit")).toBe(HOOG);
    druk(sim, s, "r");
    expect(sim.spanning("m", "uit")).toBe(LAAG);
  });
});

describe("pulsgenerator", () => {
  it("geeft bij 1 Hz in 5 s vijf pulsen aan de teller (opdracht 22d)", () => {
    const s = bouw(
      [
        ["p", "pulsgenerator", { frequentie: 1 }],
        ["t", "pulsenteller"],
      ],
      [["p.uit", "t.tel"]],
    );
    const sim = new Simulator(s);
    sim.stap(5);
    expect(stand(sim, "t")).toBe(5);
  });

  it("2 Hz: na 3 s staat de teller op 6 (opdracht 27a)", () => {
    const s = bouw(
      [
        ["p", "pulsgenerator", { frequentie: 2 }],
        ["t", "pulsenteller"],
      ],
      [["p.uit", "t.tel"]],
    );
    const sim = new Simulator(s);
    sim.stap(3);
    expect(stand(sim, "t")).toBe(6);
  });

  it("blijft binnen 1 tot 10 Hz", () => {
    const s = bouw(
      [
        ["p", "pulsgenerator", { frequentie: 50 }],
        ["t", "pulsenteller"],
      ],
      [["p.uit", "t.tel"]],
    );
    const sim = new Simulator(s);
    sim.stap(1);
    expect(stand(sim, "t")).toBe(10);
  });
});

describe("pulsenteller", () => {
  const telOpstelling = (params: Params = {}) => {
    const s = bouw(
      [
        ["k", "drukschakelaar"],
        ["aan", "drukschakelaar"],
        ["r", "drukschakelaar"],
        ["t", "pulsenteller", params],
      ],
      [
        ["k.uit", "t.tel"],
        ["r.uit", "t.reset"],
      ],
    );
    return { s, sim: new Simulator(s) };
  };

  it("telt opgaande flanken en geeft de stand op 8, 4, 2, 1", () => {
    const { s, sim } = telOpstelling();
    for (let i = 0; i < 6; i++) druk(sim, s, "k");
    expect(stand(sim, "t")).toBe(6);
    expect(
      ["8", "4", "2", "1"].map((b) => sim.spanning("t", b) === HOOG),
    ).toEqual([false, true, true, false]);
  });

  it("telt niet door zolang de knop ingedrukt blijft", () => {
    const { s, sim } = telOpstelling();
    zet(sim, s, "k", "ingedrukt", true);
    sim.stap(1);
    expect(stand(sim, "t")).toBe(1);
  });

  it("telt tot en met 15 en begint dan weer bij 0", () => {
    const { s, sim } = telOpstelling();
    for (let i = 0; i < 15; i++) druk(sim, s, "k");
    expect(stand(sim, "t")).toBe(15);
    druk(sim, s, "k");
    expect(stand(sim, "t")).toBe(0);
  });

  it("met max 9 (bord met transistor) na 9 weer 0", () => {
    const { s, sim } = telOpstelling({ max: 9 });
    for (let i = 0; i < 10; i++) druk(sim, s, "k");
    expect(stand(sim, "t")).toBe(0);
  });

  it("reset hoog zet op 0 en houdt hem daar", () => {
    const { s, sim } = telOpstelling();
    druk(sim, s, "k");
    druk(sim, s, "k");
    zet(sim, s, "r", "ingedrukt", true);
    expect(stand(sim, "t")).toBe(0);
    druk(sim, s, "k");
    expect(stand(sim, "t")).toBe(0);
  });

  it("de resetknop op het bord werkt ook", () => {
    const { s, sim } = telOpstelling();
    druk(sim, s, "k");
    zet(sim, s, "t", "resetKnop", true);
    zet(sim, s, "t", "resetKnop", false);
    expect(stand(sim, "t")).toBe(0);
  });

  it("telt zonder draad op tellen aan/uit, en niet als die laag is", () => {
    const { s, sim } = telOpstelling();
    expect(sim.spanning("t", "aan")).toBe(HOOG);
    druk(sim, s, "k");
    expect(stand(sim, "t")).toBe(1);

    const r = voegDraadToe(
      s,
      { module: "aan", bus: "uit" },
      { module: "t", bus: "aan" },
      "extra",
    );
    sim.zetSchakeling(r.schakeling);
    druk(sim, r.schakeling, "k");
    expect(stand(sim, "t")).toBe(1);
    zet(sim, r.schakeling, "aan", "ingedrukt", true);
    druk(sim, r.schakeling, "k");
    expect(stand(sim, "t")).toBe(2);
  });

  it("uitgang 8 aan de eigen reset: telt 0 tot en met 7 (opdracht 22c)", () => {
    const s = bouw(
      [
        ["k", "drukschakelaar"],
        ["t", "pulsenteller"],
      ],
      [
        ["k.uit", "t.tel"],
        ["t.8", "t.reset"],
      ],
    );
    const sim = new Simulator(s);
    const standen: number[] = [];
    for (let i = 0; i < 10; i++) {
      druk(sim, s, "k");
      standen.push(stand(sim, "t"));
    }
    expect(standen).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 1, 2]);
    expect(sim.instabiel).toBe(false);
  });
});

describe("rekenkern", () => {
  it("een signaal dat zich splitst en weer samenkomt geeft geen valse puls", () => {
    // A EN (NIET A) is altijd laag; een teller erachter mag nooit tellen.
    const s = bouw(
      [
        ["a", "drukschakelaar"],
        ["n", "invertor"],
        ["en", "en"],
        ["t", "pulsenteller"],
      ],
      [
        ["a.uit", "en.in1"],
        ["a.uit", "n.in"],
        ["n.uit", "en.in2"],
        ["en.uit", "t.tel"],
      ],
    );
    const sim = new Simulator(s);
    for (let i = 0; i < 5; i++) druk(sim, s, "a");
    expect(stand(sim, "t")).toBe(0);
  });

  it("loopt niet vast op een invertor met zijn uitgang op zijn eigen ingang", () => {
    const sim = new Simulator(bouw([["n", "invertor"]], [["n.uit", "n.in"]]));
    sim.stap(0.01);
    expect(sim.instabiel).toBe(true);
  });

  it("een geheugencel van twee OF-poorten met invertors houdt zijn toestand", () => {
    // Zelfgebouwd geheugen: uitgang van de OF-poort via een invertor terug.
    // q = set OF (q EN NIET reset)
    const s = bouw(
      [
        ["s", "drukschakelaar"],
        ["r", "drukschakelaar"],
        ["nr", "invertor"],
        ["en", "en"],
        ["of", "of"],
      ],
      [
        ["s.uit", "of.in1"],
        ["en.uit", "of.in2"],
        ["of.uit", "en.in1"],
        ["r.uit", "nr.in"],
        ["nr.uit", "en.in2"],
      ],
    );
    const sim = new Simulator(s);
    expect(sim.spanning("of", "uit")).toBe(LAAG);
    druk(sim, s, "s");
    expect(sim.spanning("of", "uit")).toBe(HOOG);
    sim.stap(1);
    expect(sim.spanning("of", "uit")).toBe(HOOG);
    druk(sim, s, "r");
    expect(sim.spanning("of", "uit")).toBe(LAAG);
    expect(sim.instabiel).toBe(false);
  });

  it("houdt de toestand vast als er een draad bij komt", () => {
    const s = bouw(
      [
        ["k", "drukschakelaar"],
        ["t", "pulsenteller"],
        ["led", "led"],
      ],
      [["k.uit", "t.tel"]],
    );
    const sim = new Simulator(s);
    druk(sim, s, "k");
    druk(sim, s, "k");
    const r = voegDraadToe(
      s,
      { module: "t", bus: "2" },
      { module: "led", bus: "in" },
      "x",
    );
    sim.zetSchakeling(r.schakeling);
    expect(stand(sim, "t")).toBe(2);
    expect(sim.spanning("led", "in")).toBe(HOOG);
  });
});

describe("schakelingen uit het werkboek", () => {
  it("knipperlicht: na de uit-knop blijft de led soms branden (opdracht 23b)", () => {
    // Bovenste knop zet de geheugencel, onderste reset hem. De geheugencel zet
    // het tellen aan, de pulsgenerator geeft de pulsen, de led hangt aan uitgang 1.
    const s = bouw(
      [
        ["aanKnop", "drukschakelaar"],
        ["uitKnop", "drukschakelaar"],
        ["m", "geheugencel"],
        ["p", "pulsgenerator", { frequentie: 1 }],
        ["t", "pulsenteller"],
        ["led", "led"],
      ],
      [
        ["aanKnop.uit", "m.set"],
        ["uitKnop.uit", "m.reset"],
        ["m.uit", "t.aan"],
        ["p.uit", "t.tel"],
        ["t.1", "led.in"],
      ],
    );
    const sim = new Simulator(s);
    druk(sim, s, "aanKnop");
    sim.stap(2.6); // drie opgaande flanken: stand 3, uitgang 1 hoog
    druk(sim, s, "uitKnop");
    sim.stap(3);
    expect(sim.spanning("led", "in")).toBe(HOOG);
  });

  it("alarm: een klap zet de geheugencel, de uit-knop zet hem terug (opdracht 25)", () => {
    const s = bouw(
      [
        ["g", "geluidsensor"],
        ["c", "comparator", { uref: 2 }],
        ["m", "geheugencel"],
        ["uit", "drukschakelaar"],
        ["lamp", "led"],
      ],
      [
        ["g.uit", "c.in"],
        ["c.uit", "m.set"],
        ["uit.uit", "m.reset"],
        ["m.uit", "lamp.in"],
      ],
    );
    const sim = new Simulator(s);
    sim.tikOpGeluidsensor("g", GELUID_PIEK);
    expect(sim.spanning("lamp", "in")).toBe(HOOG);
    sim.stap(2);
    expect(sim.spanning("g", "uit")).toBeLessThan(0.1);
    expect(sim.spanning("lamp", "in")).toBe(HOOG);
    druk(sim, s, "uit");
    expect(sim.spanning("lamp", "in")).toBe(LAAG);
  });

  it("gangverlichting: led pas na 6 s donker (opdracht 30)", () => {
    // Donker = lichtsensor onder Uref, dus comparator laag; invertor maakt
    // "donker" hoog. Zolang het donker is telt de teller; licht reset hem.
    // Bij stand 6 (uitgangen 4 en 2) zet een EN-poort de geheugencel.
    const s = bouw(
      [
        ["licht", "variabeleSpanning", { spanning: 4 }],
        ["c", "comparator", { uref: 2 }],
        ["donker", "invertor"],
        ["p", "pulsgenerator", { frequentie: 1 }],
        ["t", "pulsenteller"],
        ["zes", "en"],
        ["m", "geheugencel"],
        ["uitKnop", "drukschakelaar"],
        ["led", "led"],
      ],
      [
        ["licht.uit", "c.in"],
        ["c.uit", "donker.in"],
        ["c.uit", "t.reset"],
        ["p.uit", "t.tel"],
        ["t.4", "zes.in1"],
        ["t.2", "zes.in2"],
        ["zes.uit", "m.set"],
        ["uitKnop.uit", "m.reset"],
        ["m.uit", "led.in"],
      ],
    );
    const sim = new Simulator(s);
    sim.stap(10);
    expect(sim.spanning("led", "in")).toBe(LAAG);
    zet(sim, s, "licht", "spanning", 1);
    sim.stap(5.4);
    expect(sim.spanning("led", "in")).toBe(LAAG);
    sim.stap(0.3);
    expect(sim.spanning("led", "in")).toBe(HOOG);
    zet(sim, s, "licht", "spanning", 4);
    druk(sim, s, "uitKnop");
    expect(sim.spanning("led", "in")).toBe(LAAG);
  });
});

describe("AD-omzetter", () => {
  it("zet 0 tot 5 V om in 0 tot 15", () => {
    const s = bouw(
      [
        ["v", "variabeleSpanning"],
        ["ad", "adOmzetter"],
      ],
      [["v.uit", "ad.in"]],
    );
    const sim = new Simulator(s);
    const getal = () =>
      ["8", "4", "2", "1"].reduce(
        (n, b) => n * 2 + (sim.spanning("ad", b) === HOOG ? 1 : 0),
        0,
      );
    expect(getal()).toBe(0);
    zet(sim, s, "v", "spanning", 2.5);
    expect(getal()).toBe(8);
    zet(sim, s, "v", "spanning", 5);
    expect(getal()).toBe(15);
  });
});

it("een lege schakeling werkt", () => {
  const sim = new Simulator(legeSchakeling());
  sim.stap(1);
  expect(sim.instabiel).toBe(false);
});
