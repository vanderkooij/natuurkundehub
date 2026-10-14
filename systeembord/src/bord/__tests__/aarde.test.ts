import { describe, expect, it } from "vitest";

import { maakBord, metAarde } from "@/bord/borden";
import { naarTekst, vanTekst } from "@/bestand/formaat";
import {
  dradenZonderAarde,
  HOOG,
  LAAG,
  maakModule,
  Simulator,
  voegDraadToe,
  type BusAdres,
  type Schakeling,
} from "@/sim";

/** Twee borden naast elkaar: knop op bord 1, led op bord 2. */
function tweeBorden(): Schakeling {
  const a = maakBord("comparators", "a", 0, 0);
  const b = maakBord("comparators", "b", 1200, 0);
  return {
    borden: [a.bord, b.bord],
    modules: [...a.modules, ...b.modules],
    draden: [],
  };
}
const id = (s: Schakeling, bord: string, soort: string) =>
  s.modules.find((m) => m.bord === bord && m.soort === soort)!.id;
function draad(s: Schakeling, a: BusAdres, b: BusAdres, n: string) {
  const r = voegDraadToe(s, a, b, n);
  if (r.fout) throw new Error(r.fout);
  return r.schakeling;
}

describe("aarde", () => {
  it("elk bord heeft een aardebus onder het relais", () => {
    const { modules } = maakBord("comparators", "x");
    const relais = modules.find((m) => m.soort === "relais")!;
    const aarde = modules.find((m) => m.soort === "aarde")!;
    expect(aarde.x).toBe(relais.x);
    expect(aarde.y).toBeGreaterThan(relais.y);
  });

  it("de aarde verbind je alleen met een andere aarde", () => {
    const s = tweeBorden();
    const r = voegDraadToe(
      s,
      { module: id(s, "a", "aarde"), bus: "aarde" },
      { module: id(s, "b", "led"), bus: "in" },
      "d",
    );
    expect(r.fout).toMatch(/aarde/);
  });

  it("een draad naar een ander bord werkt pas met de aardes verbonden", () => {
    let s = tweeBorden();
    const knop = id(s, "a", "drukschakelaar");
    const led = id(s, "b", "led");
    s = {
      ...s,
      modules: s.modules.map((m) =>
        m.id === knop ? { ...m, params: { ...m.params, ingedrukt: true } } : m,
      ),
    };
    s = draad(
      s,
      { module: knop, bus: "uit" },
      { module: led, bus: "in" },
      "d0",
    );
    expect(dradenZonderAarde(s).has("d0")).toBe(true);
    expect(new Simulator(s).spanning(led, "in")).toBe(LAAG);

    s = draad(
      s,
      { module: id(s, "a", "aarde"), bus: "aarde" },
      { module: id(s, "b", "aarde"), bus: "aarde" },
      "d1",
    );
    expect(dradenZonderAarde(s).size).toBe(0);
    expect(new Simulator(s).spanning(led, "in")).toBe(HOOG);
    // En een aardedraad overleeft opslaan en weer openen.
    const r = vanTekst(naarTekst(s));
    expect(r.ok && r.schakeling.draden).toHaveLength(2);
  });

  it("losse modules werken zonder aarde", () => {
    let s = tweeBorden();
    const led = id(s, "b", "led");
    const los = maakModule("drukschakelaar", "los", -300, 0, {
      ingedrukt: true,
    });
    s = { ...s, modules: [...s.modules, los] };
    s = draad(
      s,
      { module: "los", bus: "uit" },
      { module: led, bus: "in" },
      "d",
    );
    expect(dradenZonderAarde(s).size).toBe(0);
    expect(new Simulator(s).spanning(led, "in")).toBe(HOOG);
  });

  it("een bord van voor de aardebus krijgt hem er alsnog bij", () => {
    const s = tweeBorden();
    const oud = { ...s, modules: s.modules.filter((m) => m.soort !== "aarde") };
    const nieuw = metAarde(oud);
    expect(nieuw.modules.filter((m) => m.soort === "aarde")).toHaveLength(2);
  });
});
