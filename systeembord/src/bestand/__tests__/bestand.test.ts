import { describe, expect, it } from "vitest";

import { maakBord } from "@/bord/borden";
import { compact, naarTekst, vanTekst } from "@/bestand/formaat";
import { vanJeroen } from "@/bestand/jeroen";
import { linkdeelUitHash, naarLinkdeel, vanLinkdeel } from "@/bestand/link";
import { VOORBEELDEN } from "@/bestand/voorbeelden";
import {
  herken,
  HOOG,
  maakWaarheidstabel,
  Simulator,
  voegDraadToe,
  type Schakeling,
} from "@/sim";

/** Bord met twee comparators, met een draad van de eerste knop naar de eerste led. */
function voorbeeld(): Schakeling {
  const { bord, modules } = maakBord("comparators", "bord-xyz-123");
  const knop = modules.find((m) => m.soort === "drukschakelaar")!;
  const led = modules.find((m) => m.soort === "led")!;
  knop.params = { ...knop.params, ingedrukt: true, vast: true };
  const s: Schakeling = { borden: [bord], modules, draden: [] };
  return voegDraadToe(
    s,
    { module: knop.id, bus: "uit" },
    { module: led.id, bus: "in" },
    "d-lang-id",
  ).schakeling;
}

/** Werkt de schakeling nog: brandt de led? */
const ledBrandt = (s: Schakeling) => {
  const led = s.modules.find((m) => m.soort === "led")!;
  return new Simulator(s).spanning(led.id, "in") === HOOG;
};

describe("eigen bestand", () => {
  it("opslaan en weer openen geeft dezelfde werkende schakeling", () => {
    const s = voorbeeld();
    const r = vanTekst(naarTekst(s));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.schakeling.modules).toHaveLength(s.modules.length);
    expect(r.schakeling.borden).toHaveLength(1);
    expect(r.schakeling.draden).toHaveLength(1);
    expect(ledBrandt(r.schakeling)).toBe(true);
  });

  it("een zelf gebogen draad houdt zijn bocht", () => {
    const s = voorbeeld();
    const gebogen = {
      ...s,
      draden: s.draden.map((d) => ({ ...d, bocht: { x: -40.4, y: 25 } })),
    };
    const r = vanTekst(naarTekst(gebogen));
    expect(r.ok && r.schakeling.draden[0].bocht).toEqual({ x: -40, y: 25 });
    // Zonder bocht blijft het veld weg.
    const r2 = vanTekst(naarTekst(s));
    expect(r2.ok && "bocht" in r2.schakeling.draden[0]).toBe(false);
  });

  it("korte id's", () => {
    const c = compact(voorbeeld());
    expect(c.borden![0].id).toBe("b0");
    expect(
      c.modules.every(
        (m) => /^m\d+$/.test(m.id) && (m.bord === undefined || m.bord === "b0"),
      ),
    ).toBe(true);
    expect(c.draden[0].id).toBe("d0");
  });

  it("weigert een kapot of vreemd bestand netjes", () => {
    expect(vanTekst("geen json").ok).toBe(false);
    expect(vanTekst(JSON.stringify({ app: "iets anders" })).ok).toBe(false);
    expect(
      vanTekst(
        JSON.stringify({ app: "systeembord", versie: 2, schakeling: {} }),
      ).ok,
    ).toBe(false);
  });

  it("slaat onzin in een bestand over zonder vast te lopen", () => {
    const r = vanTekst(
      JSON.stringify({
        app: "systeembord",
        versie: 1,
        schakeling: {
          modules: [
            {
              id: "a",
              soort: "drukschakelaar",
              x: 0,
              y: 0,
              params: { ingedrukt: true, gek: "x" },
            },
            { id: "b", soort: "bestaatniet", x: 0, y: 0 },
            { id: "c", soort: "led", x: 0, y: 0 },
          ],
          draden: [
            {
              id: "1",
              van: { module: "a", bus: "uit" },
              naar: { module: "c", bus: "in" },
            },
            {
              id: "2",
              van: { module: "a", bus: "uit" },
              naar: { module: "c", bus: "in" },
            },
            {
              id: "3",
              van: { module: "b", bus: "uit" },
              naar: { module: "c", bus: "in" },
            },
          ],
        },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.schakeling.modules.map((m) => m.id)).toEqual(["a", "c"]);
    expect(r.schakeling.modules[0].params).toEqual({
      ingedrukt: true,
      vast: false,
    });
    expect(r.schakeling.draden).toHaveLength(1);
  });
});

describe("delen als link", () => {
  it("heen en terug via de link", async () => {
    const deel = await naarLinkdeel(voorbeeld());
    expect(deel).toMatch(/^[A-Za-z0-9_-]+$/);
    // Een heel bord met een draad past ruim in een link.
    expect(deel.length).toBeLessThan(2500);
    const r = await vanLinkdeel(deel);
    expect(r.ok && ledBrandt(r.schakeling)).toBe(true);
  });

  it("een kapotte link geeft een nette melding", async () => {
    const r = await vanLinkdeel("ditisgeenlink");
    expect(r.ok).toBe(false);
  });

  it("haalt het schakelingdeel uit de hash", () => {
    expect(linkdeelUitHash("#s=abc_-1")).toBe("abc_-1");
    expect(linkdeelUitHash("#iets")).toBeNull();
  });
});

describe("bestanden van Jeroen van Tilburg", () => {
  // Uit zijn map xml/voorbeelden: SR AND-OR latch, zonder bord.
  const latch = `<systeembord>
  <element name="ANDPort" x="449" y="129">
    <link id="0" toElement="1" toNode="2"/>
    <link id="1" toElement="5" toNode="1"/>
  </element>
  <element name="ORPort" x="274" y="60">
    <link id="0" toElement="2" toNode="0"/>
    <link id="1" toElement="0" toNode="2"/>
  </element>
  <element name="Switch" x="104" y="60"/>
  <element name="Switch" x="104" y="179"/>
  <element name="LED" x="625" y="160">
    <link id="0" toElement="0" toNode="2"/>
  </element>
  <element name="NOTPort" x="274" y="179">
    <link id="0" toElement="3" toNode="0"/>
  </element>
  <element name="TextElement" x="336" y="15" text="SR AND-OR latch"/>
</systeembord>`;

  it("leest losse modules en draden, en de schakeling werkt", () => {
    const r = vanJeroen(latch);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.schakeling.borden).toEqual([]);
    expect(r.schakeling.modules.map((m) => m.soort).sort()).toEqual(
      [
        "drukschakelaar",
        "drukschakelaar",
        "en",
        "invertor",
        "led",
        "of",
      ].sort(),
    );
    expect(r.schakeling.draden).toHaveLength(6);
    expect(r.overgeslagen).toEqual([]);

    // Set (eerste knop) even indrukken: de led blijft branden.
    const s = r.schakeling;
    const set = s.modules.find((m) => m.id === "j2")!;
    set.params = { ...set.params, ingedrukt: true };
    const sim = new Simulator(s);
    set.params = { ...set.params, ingedrukt: false };
    sim.zetSchakeling({ ...s, modules: [...s.modules] });
    expect(sim.spanning("j4", "in")).toBe(HOOG);
  });

  it("zijn bord wordt ons bord; modules die we niet hebben worden gemeld", () => {
    const xml = `<systeembord>
  <element name="Board" x="60" y="0"/>
  <element name="Switch" x="70" y="175"/>
  <element name="LED" x="540" y="25">
    <link id="0" toElement="1" toNode="0"/>
  </element>
  <element name="XORPort" x="900" y="100"/>
  <element name="Relais" x="540" y="375"/>
  <element name="Heater" x="742" y="360">
    <link id="0" toElement="4" toNode="1"/>
  </element>
  <element name="DAC" x="900" y="300"/>
</systeembord>`;
    const r = vanJeroen(xml);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.schakeling.borden).toHaveLength(1);
    expect(r.overgeslagen).toEqual(["DAC"]);
    expect(r.schakeling.modules.some((m) => m.soort === "xor" && !m.bord)).toBe(
      true,
    );
    const [d] = r.schakeling.draden;
    const van = r.schakeling.modules.find((m) => m.id === d.van.module)!;
    const naar = r.schakeling.modules.find((m) => m.id === d.naar.module)!;
    expect([van.soort, van.bord, naar.soort, naar.bord]).toEqual([
      "drukschakelaar",
      "b0",
      "led",
      "b0",
    ]);
    // De kachel aan het relais wordt het apparaat van ons relais.
    expect(
      r.schakeling.modules.find((m) => m.soort === "relais")!.params.apparaat,
    ).toBe(1);
  });

  it("weigert iets dat geen systeembord-bestand is", () => {
    expect(vanJeroen("<html></html>").ok).toBe(false);
  });
});

describe("voorbeelden voor de docent", () => {
  it.each(VOORBEELDEN.map((v) => [v.naam, v] as const))(
    "%s is te bouwen en werkt",
    (_naam, v) => {
      const s = v.maak();
      expect(s.draden.length).toBeGreaterThan(0);
      const sim = new Simulator(s);
      sim.stap(1);
      expect(sim.instabiel).toBe(false);
      // En het overleeft opslaan en weer openen.
      expect(vanTekst(naarTekst(s)).ok).toBe(true);
      // Met eisen en een flowchart voor het kaartje.
      expect(v.eisen.length).toBeGreaterThan(20);
      expect(v.flowchart.length).toBeGreaterThan(0);
    },
  );

  it("XOR-voorbeeld geeft 0 1 1 0", () => {
    const s = VOORBEELDEN.find((v) => v.naam.startsWith("XOR"))!.maak();
    const t = maakWaarheidstabel(s);
    expect(t.rijen.map((r) => (r.uit[0] ? 1 : 0))).toEqual([0, 1, 1, 0]);
    expect(herken(t, 0)?.naam).toBe("XOR (exclusieve OF)");
  });
});
