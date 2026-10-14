import { describe, expect, it } from "vitest";

import {
  controleer,
  herken,
  maakModule,
  maakWaarheidstabel,
  voegDraadToe,
  type ModuleSoort,
  type Schakeling,
} from "@/sim";

function bouw(
  modules: [string, ModuleSoort][],
  draden: [string, string][],
): Schakeling {
  let s: Schakeling = {
    modules: modules.map(([id, soort]) => maakModule(soort, id)),
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
    if (r.fout) throw new Error(r.fout);
    s = r.schakeling;
  });
  return s;
}

const kolom = (t: ReturnType<typeof maakWaarheidstabel>, k = 0) =>
  t.rijen.map((r) => (r.uit[k] ? 1 : 0));

describe("waarheidstabel", () => {
  const enPoort = bouw(
    [
      ["a", "drukschakelaar"],
      ["b", "drukschakelaar"],
      ["los", "drukschakelaar"],
      ["en", "en"],
      ["led", "led"],
      ["ongebruikt", "led"],
    ],
    [
      ["a.uit", "en.in1"],
      ["b.uit", "en.in2"],
      ["en.uit", "led.in"],
    ],
  );

  it("EN-poort: vier rijen, alleen 11 geeft 1 (opdracht 13)", () => {
    const t = maakWaarheidstabel(enPoort);
    expect(t.ingangen.map((k) => k.naam)).toEqual(["A", "B"]);
    expect(t.uitgangen.map((k) => k.naam)).toEqual(["led"]);
    expect(t.rijen.map((r) => r.in.map((x) => (x ? 1 : 0)).join(""))).toEqual([
      "00",
      "01",
      "10",
      "11",
    ]);
    expect(kolom(t)).toEqual([0, 0, 0, 1]);
    expect(t.metGeheugen).toBe(false);
  });

  it("knop B door een invertor naar de EN-poort: A en niet B (opdracht 19)", () => {
    const s = bouw(
      [
        ["a", "drukschakelaar"],
        ["b", "drukschakelaar"],
        ["n", "invertor"],
        ["en", "en"],
        ["led", "led"],
      ],
      [
        ["a.uit", "en.in1"],
        ["b.uit", "n.in"],
        ["n.uit", "en.in2"],
        ["en.uit", "led.in"],
      ],
    );
    expect(kolom(maakWaarheidstabel(s))).toEqual([0, 0, 1, 0]);
  });

  it("de stand van de knoppen op het bord maakt niet uit", () => {
    const s = structuredClone(enPoort);
    s.modules[0].params = {
      ...s.modules[0].params,
      ingedrukt: true,
      vast: true,
    };
    expect(kolom(maakWaarheidstabel(s))).toEqual([0, 0, 0, 1]);
  });

  it("meldt een geheugencel: dan zegt de tabel niet alles", () => {
    const s = bouw(
      [
        ["a", "drukschakelaar"],
        ["b", "drukschakelaar"],
        ["m", "geheugencel"],
        ["led", "led"],
      ],
      [
        ["a.uit", "m.set"],
        ["b.uit", "m.reset"],
        ["m.uit", "led.in"],
      ],
    );
    expect(maakWaarheidstabel(s).metGeheugen).toBe(true);
  });

  it("controleert een zelf ingevulde tabel", () => {
    const t = maakWaarheidstabel(enPoort);
    const c = controleer(t, [[false], [true], [null], [true]]);
    expect(c.cellen.map((r) => r[0])).toEqual(["goed", "fout", "leeg", "goed"]);
    expect([c.goed, c.totaal]).toEqual([2, 4]);
  });
});

describe("samengestelde poorten van EN, OF en invertors", () => {
  const twee = (extra: [string, ModuleSoort][], draden: [string, string][]) =>
    maakWaarheidstabel(
      bouw(
        [
          ["a", "drukschakelaar"],
          ["b", "drukschakelaar"],
          ...extra,
          ["led", "led"],
        ],
        draden,
      ),
    );

  it("NAND: EN-poort met een invertor erachter", () => {
    const t = twee(
      [
        ["en", "en"],
        ["n", "invertor"],
      ],
      [
        ["a.uit", "en.in1"],
        ["b.uit", "en.in2"],
        ["en.uit", "n.in"],
        ["n.uit", "led.in"],
      ],
    );
    expect(kolom(t)).toEqual([1, 1, 1, 0]);
  });

  it("XOR: (A OF B) EN NIET (A EN B), past op het bord met twee comparators", () => {
    const t = twee(
      [
        ["of", "of"],
        ["en1", "en"],
        ["n", "invertor"],
        ["en2", "en"],
      ],
      [
        ["a.uit", "of.in1"],
        ["b.uit", "of.in2"],
        ["a.uit", "en1.in1"],
        ["b.uit", "en1.in2"],
        ["en1.uit", "n.in"],
        ["of.uit", "en2.in1"],
        ["n.uit", "en2.in2"],
        ["en2.uit", "led.in"],
      ],
    );
    expect(kolom(t)).toEqual([0, 1, 1, 0]);
  });
});

describe("herkenning", () => {
  /** Maakt een tabel met twee knoppen en één uitvoerkolom. */
  const tabel = (uit: number[], n = 2) => ({
    ingangen: Array.from({ length: n }, (_, i) => ({
      id: `k${i}`,
      naam: String.fromCharCode(65 + i),
    })),
    uitgangen: [{ id: "led", naam: "led" }],
    rijen: uit.map((u, k) => ({
      in: Array.from({ length: n }, (_, i) => ((k >> (n - 1 - i)) & 1) === 1),
      uit: [u === 1],
    })),
    metGeheugen: false,
    instabiel: false,
    teVeelKnoppen: false,
  });
  const naam = (uit: number[], n = 2) => herken(tabel(uit, n), 0)?.naam ?? null;

  it.each([
    [[0, 0, 0, 1], "EN"],
    [[0, 1, 1, 1], "OF"],
    [[1, 1, 1, 0], "NAND (NIET-EN)"],
    [[1, 0, 0, 0], "NOR (NIET-OF)"],
    [[0, 1, 1, 0], "XOR (exclusieve OF)"],
    [[1, 0, 0, 1], "XNOR (gelijk)"],
    [[0, 0, 1, 0], "A EN NIET B"],
    [[0, 0, 1, 1], "gelijk aan A"],
    [[1, 0, 1, 0], "NIET B (invertor)"],
    [[0, 0, 0, 0], "altijd 0"],
  ])("%j is %s", (uit, verwacht) => expect(naam(uit)).toBe(verwacht));

  it("drie knoppen: EN en XOR (oneven)", () => {
    expect(naam([0, 0, 0, 0, 0, 0, 0, 1], 3)).toBe("EN");
    expect(naam([0, 1, 1, 0, 1, 0, 0, 1], 3)).toBe("XOR (oneven)");
    expect(naam([0, 0, 0, 1, 0, 1, 1, 1], 3)).toBeNull(); // meerderheid: geen bekende naam
  });

  it("één knop met invertor", () => {
    expect(naam([1, 0], 1)).toBe("NIET A (invertor)");
  });
});

describe("extra poorten (niet op het echte bord)", () => {
  it.each([
    ["nand", [1, 1, 1, 0], "NAND (NIET-EN)"],
    ["nor", [1, 0, 0, 0], "NOR (NIET-OF)"],
    ["xor", [0, 1, 1, 0], "XOR (exclusieve OF)"],
    ["xnor", [1, 0, 0, 1], "XNOR (gelijk)"],
  ] as const)("%s", (soort, verwacht, naam) => {
    const t = maakWaarheidstabel(
      bouw(
        [
          ["a", "drukschakelaar"],
          ["b", "drukschakelaar"],
          ["p", soort],
          ["led", "led"],
        ],
        [
          ["a.uit", "p.in1"],
          ["b.uit", "p.in2"],
          ["p.uit", "led.in"],
        ],
      ),
    );
    expect(kolom(t)).toEqual(verwacht);
    expect(herken(t, 0)?.naam).toBe(naam);
  });
});
