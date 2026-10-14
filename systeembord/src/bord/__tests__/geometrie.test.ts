import { describe, expect, it } from "vitest";

import {
  busPositie,
  dichtsteBus,
  draadMidden,
  kiesBocht,
  standaardBocht,
  KNOP_BEREIK,
  knopVan,
  knopWaarde,
  rondAf,
  vormVan,
} from "@/bord/geometrie";
import { bordRechthoek, maakBord, omhulling, vrijePlek } from "@/bord/borden";
import { leesGetal } from "@/bord/getal";
import { veranderd } from "@/bord/overgangen";
import { MODULES, maakModule, type ModuleSoort, type Schakeling } from "@/sim";

describe("draden", () => {
  const a = { x: 0, y: 0 },
    b = { x: 200, y: 0 };
  it("zonder bussen in de weg hangt de draad gewoon door", () => {
    expect(kiesBocht(a, b, [])).toEqual(standaardBocht(a, b));
  });
  it("een bus onder de doorhangende draad wordt ontweken", () => {
    const onder = draadMidden(a, b);
    const c = kiesBocht(a, b, [onder]);
    expect(c).not.toEqual(standaardBocht(a, b));
    const m = draadMidden(a, b, c);
    expect(Math.hypot(m.x - onder.x, m.y - onder.y)).toBeGreaterThan(17);
  });
  it("de eigen twee bussen tellen niet mee", () => {
    expect(kiesBocht(a, b, [a, b])).toEqual(standaardBocht(a, b));
  });
});

describe("geometrie", () => {
  const knop = maakModule("drukschakelaar", "k", 100, 50);
  const en = maakModule("en", "en", 400, 0);

  it("elke getekende module heeft precies de bussen van de simulator", () => {
    for (const soort of Object.keys(MODULES) as ModuleSoort[]) {
      const def = MODULES[soort];
      expect(
        vormVan(soort)
          .bussen.map((b) => b.bus)
          .sort(),
      ).toEqual([...def.ingangen, ...def.uitgangen].sort());
    }
  });

  it("bussen hebben de kleur van het echte bord", () => {
    expect(vormVan("drukschakelaar").bussen[0].kleur).toBe("geel");
    expect(vormVan("en").bussen.every((b) => b.kleur === "blauw")).toBe(true);
    expect(vormVan("led").bussen[0].kleur).toBe("wit");
  });

  it("vindt de dichtstbijzijnde bus binnen bereik", () => {
    const p = busPositie(en, "in2")!;
    expect(dichtsteBus([knop, en], { x: p.x + 5, y: p.y - 5 }, 24)).toEqual({
      module: "en",
      bus: "in2",
    });
    expect(dichtsteBus([knop, en], { x: p.x + 100, y: p.y }, 24)).toBeNull();
  });

  it("het midden van een draad hangt onder de rechte lijn", () => {
    const m = draadMidden({ x: 0, y: 0 }, { x: 200, y: 0 });
    expect(m.x).toBe(100);
    expect(m.y).toBeGreaterThan(0);
  });

  it("omhulling omvat alle modules", () => {
    expect(omhulling({ modules: [knop, en], draden: [] })).toEqual({
      x: 100,
      y: 0,
      breedte: 500,
      hoogte: 150,
    });
  });
});

describe("borden", () => {
  it("bord met twee comparators heeft de modules uit het werkboek, plus de AD-omzetter", () => {
    const { modules } = maakBord("comparators", "b");
    const aantal = (soort: ModuleSoort) =>
      modules.filter((m) => m.soort === soort).length;
    expect(aantal("comparator")).toBe(2);
    expect(aantal("en")).toBe(2);
    expect(aantal("invertor")).toBe(2);
    expect(aantal("of")).toBe(1);
    expect(aantal("transistor")).toBe(0);
    expect(aantal("adOmzetter")).toBe(1);
    expect(aantal("led")).toBe(4);
    expect(modules.every((m) => m.bord === "b")).toBe(true);
    expect(modules.find((m) => m.soort === "pulsenteller")!.params.max).toBe(
      15,
    );
  });

  it("bord met transistor: van elk één, plus een transistor; teller tot 9", () => {
    const { modules } = maakBord("transistor", "b");
    const aantal = (soort: ModuleSoort) =>
      modules.filter((m) => m.soort === soort).length;
    expect(aantal("transistor")).toBe(1);
    expect(aantal("comparator")).toBe(1);
    expect(aantal("en")).toBe(1);
    expect(aantal("adOmzetter")).toBe(0);
    expect(modules.find((m) => m.soort === "pulsenteller")!.params.max).toBe(9);
  });

  it.each(["comparators", "transistor"] as const)(
    "%s: geen vakken over elkaar, alles binnen het bord",
    (soort) => {
      const { bord, modules } = maakBord(soort, "b", 100, 200);
      const r = bordRechthoek(bord);
      const vak = (m: (typeof modules)[number]) => ({
        x: m.x,
        y: m.y,
        ...vormVan(m.soort),
      });
      for (const m of modules) {
        const a = vak(m);
        expect(a.x).toBeGreaterThanOrEqual(r.x);
        expect(a.y).toBeGreaterThanOrEqual(r.y);
        expect(a.x + a.breedte).toBeLessThanOrEqual(r.x + r.breedte);
        expect(a.y + a.hoogte).toBeLessThanOrEqual(r.y + r.hoogte);
        for (const n of modules) {
          if (n === m) continue;
          const b = vak(n);
          const overlap =
            a.x < b.x + b.breedte &&
            b.x < a.x + a.breedte &&
            a.y < b.y + b.hoogte &&
            b.y < a.y + a.hoogte;
          expect(overlap).toBe(false);
        }
      }
    },
  );
});

describe("draaiknop", () => {
  const k = knopVan("variabeleSpanning")!;
  it("recht omhoog is het midden, helemaal links en rechts de uitersten", () => {
    expect(knopWaarde(k, 0, -10)).toBe(2.5);
    const links = (-KNOP_BEREIK * Math.PI) / 180;
    expect(knopWaarde(k, Math.sin(links), -Math.cos(links))).toBe(0);
    expect(knopWaarde(k, -Math.sin(links), -Math.cos(links))).toBe(5);
  });

  it("onderin blijft hij aan de kant waar je vandaan komt", () => {
    expect(knopWaarde(k, -0.01, 10)).toBe(0);
    expect(knopWaarde(k, 0.01, 10)).toBe(5);
  });

  it("rondt af op stappen van 0,1 binnen het bereik", () => {
    expect(rondAf(k, 2.345)).toBe(2.3);
    expect(rondAf(k, 7)).toBe(5);
    expect(rondAf(knopVan("pulsgenerator")!, 0)).toBe(1);
  });
});

describe("signaal over de draad", () => {
  it("alleen draden die van stand wisselen lopen; nieuwe draden niet", () => {
    const vorige = new Map([
      ["a", false],
      ["b", true],
      ["c", true],
    ]);
    expect(
      veranderd(vorige, [
        { id: "a", hoog: true },
        { id: "b", hoog: true },
        { id: "c", hoog: false },
        { id: "nieuw", hoog: true },
      ]),
    ).toEqual([
      { id: "a", oudHoog: false },
      { id: "c", oudHoog: true },
    ]);
  });
});

describe("vrije plek voor een nieuwe module", () => {
  it("leeg werkvlak: precies in het midden", () => {
    expect(
      vrijePlek(
        { modules: [], draden: [] },
        { breedte: 200, hoogte: 100 },
        { x: 500, y: 300 },
      ),
    ).toEqual({
      x: 400,
      y: 260,
    });
  });

  it("valt nooit over een bord of andere module", () => {
    const { bord, modules } = maakBord("comparators", "b", 0, 0);
    let s: Schakeling = { borden: [bord], modules, draden: [] };
    for (let i = 0; i < 6; i++) {
      const plek = vrijePlek(s, vormVan("xor"), { x: 400, y: 400 });
      const nieuw = maakModule("xor", `x${i}`, plek.x, plek.y);
      const r = { x: nieuw.x, y: nieuw.y, ...vormVan("xor") };
      for (const a of [
        bordRechthoek(bord),
        ...s.modules
          .filter((m) => !m.bord)
          .map((m) => ({ x: m.x, y: m.y, ...vormVan(m.soort) })),
      ]) {
        const overlap =
          r.x < a.x + a.breedte &&
          a.x < r.x + r.breedte &&
          r.y < a.y + a.hoogte &&
          a.y < r.y + r.hoogte;
        expect(overlap).toBe(false);
      }
      s = { ...s, modules: [...s.modules, nieuw] };
    }
  });
});

describe("getal invullen", () => {
  it.each([
    ["2,5", 2.5],
    ["2.5", 2.5],
    [" 3 ", 3],
    ["2,5 V", 2.5],
    ["10Hz", 10],
    ["−1", -1],
    [",5", 0.5],
  ])("%s wordt %s", (tekst, verwacht) =>
    expect(leesGetal(tekst)).toBe(verwacht),
  );

  it.each(["", "abc", "2,5,1", "1e3", "--1"])("%j is geen getal", (tekst) =>
    expect(leesGetal(tekst)).toBeNull(),
  );
});
