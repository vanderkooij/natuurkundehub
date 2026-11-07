import { describe, expect, it } from "vitest";

import { bordMaat, maakBord } from "@/bord/borden";
import { compact, naarTekst, vanTekst } from "@/bestand/formaat";
import { vanJeroen } from "@/bestand/jeroen";
import { linkdeelUitHash, naarLinkdeel, vanLinkdeel } from "@/bestand/link";
import { VOORBEELDEN } from "@/bestand/voorbeelden";
import {
  herken,
  HOOG,
  maakWaarheidstabel,
  SENSOREN,
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

  it("leest ook het nieuwe formaat, met namen in plaats van nummers", () => {
    // Zo slaat zijn site het nu op: element en aansluiting op naam.
    const nieuw = `<systeembord>
  <element name="ANDPort" id="ANDPort1" x="449" y="129">
    <link id="input1" toElement="ORPort1" toNode="output"/>
    <link id="input2" toElement="NOTPort1" toNode="output"/>
  </element>
  <element name="ORPort" id="ORPort1" x="274" y="60">
    <link id="input1" toElement="Switch1" toNode="output"/>
    <link id="input2" toElement="ANDPort1" toNode="output"/>
  </element>
  <element name="Switch" id="Switch1" x="104" y="60"/>
  <element name="Switch" id="Switch2" x="104" y="179"/>
  <element name="LED" id="LED1" x="625" y="160">
    <link id="input" toElement="ANDPort1" toNode="output"/>
  </element>
  <element name="NOTPort" id="NOTPort1" x="274" y="179">
    <link id="input" toElement="Switch2" toNode="output"/>
  </element>
  <element name="Pulse" id="Pulse1" x="104" y="300" inputValue="2"/>
  <element name="Counter" id="Counter1" x="274" y="300">
    <link id="count" toElement="Pulse1" toNode="output"/>
  </element>
  <element name="LED" id="LED2" x="625" y="300">
    <link id="input" toElement="Counter1" toNode="output1"/>
  </element>
</systeembord>`;
    const r = vanJeroen(nieuw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = r.schakeling;
    expect(s.draden).toHaveLength(8);
    const bus = (d: (typeof s.draden)[number]) =>
      `${s.modules.find((m) => m.id === d.van.module)!.soort}.${d.van.bus}>${s.modules.find((m) => m.id === d.naar.module)!.soort}.${d.naar.bus}`;
    expect(s.draden.map(bus)).toEqual(
      expect.arrayContaining([
        "of.uit>en.in1",
        "invertor.uit>en.in2",
        "drukschakelaar.uit>of.in1",
        "en.uit>of.in2",
        "en.uit>led.in",
        "drukschakelaar.uit>invertor.in",
        "pulsgenerator.uit>pulsenteller.tel",
        "pulsenteller.1>led.in",
      ]),
    );
    // De teller telt mee: na een paar pulsen staat er een even of oneven stand.
    const sim = new Simulator(s);
    sim.stap(1.3);
    expect(
      Number(
        sim.toestand(s.modules.find((m) => m.soort === "pulsenteller")!.id)!
          .stand,
      ),
    ).toBeGreaterThan(0);
  });

  it("een bestand zoals zijn site het nu opslaat (knipperlicht, Newton fig. 30)", () => {
    // Letterlijk uit createXmlFile() op jeroenvantilburg.nl/systeembord (november 2026).
    const xml = `<systeembord>
  <element name="Memory" id="Memory0" x="286" y="44">
    <link id="set" toElement="Switch0" toNode="output"/>
    <link id="reset" toElement="Switch1" toNode="output"/>
  </element>
  <element name="Counter" id="Counter0" x="286" y="165">
    <link id="inhibit" toElement="Memory0" toNode="output"/>
    <link id="count" toElement="Pulse0" toNode="output"/>
  </element>
  <element name="Pulse" id="Pulse0" x="64" y="165" inputValue="5"/>
  <element name="Switch" id="Switch0" x="64" y="44"/>
  <element name="Switch" id="Switch1" x="64" y="94"/>
  <element name="LED" id="LED0" x="619" y="165">
    <link id="input" toElement="Counter0" toNode="output1"/>
  </element>
  <element name="TextElement" id="TextElement0" x="462" y="2" text="Knipperlicht"/>
</systeembord>
`;
    const r = vanJeroen(xml);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.schakeling.draden).toHaveLength(5);
    expect(r.overgeslagen).toEqual([]);
    const puls = r.schakeling.modules.find((m) => m.soort === "pulsgenerator")!;
    expect(puls.params.frequentie).toBe(5);
  });

  it("zijn volle bord: wat nergens aan vastzit valt weg, alleen gebruikte sensoren worden echt", () => {
    // Bestand van Jop, opgeslagen op jeroenvantilburg.nl (november 2026).
    const xml = `<systeembord>
  <element name="Board" id="Board0" x="60" y="0"/>
  <element name="LightSensor" id="LightSensor0" x="70" y="25" xLDR="95" yLDR="50"/>
  <element name="TemperatureSensor" id="TemperatureSensor0" x="70" y="75"/>
  <element name="SoundSensor" id="SoundSensor0" x="70" y="125"/>
  <element name="Switch" id="Switch0" x="70" y="175"/>
  <element name="Switch" id="Switch1" x="70" y="225"/>
  <element name="VarVoltage" id="VarVoltage0" x="70" y="275" inputValue="0"/>
  <element name="VarVoltage" id="VarVoltage1" x="70" y="325" inputValue="0"/>
  <element name="Pulse" id="Pulse0" x="70" y="375" inputValue="1"/>
  <element name="ADC" id="ADC0" x="70" y="425"/>
  <element name="Comparator" id="Comparator0" x="230" y="25" inputValue="2.5">
    <link id="input" toElement="LightSensor0" toNode="output"/>
  </element>
  <element name="Comparator" id="Comparator1" x="380" y="25" inputValue="2.5"/>
  <element name="ANDPort" id="ANDPort0" x="230" y="125"/>
  <element name="ANDPort" id="ANDPort1" x="380" y="125">
    <link id="input1" toElement="Switch1" toNode="output"/>
    <link id="input2" toElement="Comparator0" toNode="output"/>
  </element>
  <element name="Memory" id="Memory0" x="230" y="225"/>
  <element name="ORPort" id="ORPort0" x="380" y="225"/>
  <element name="NOTPort" id="NOTPort0" x="230" y="325"/>
  <element name="NOTPort" id="NOTPort1" x="380" y="325"/>
  <element name="Counter" id="Counter0" x="230" y="375"/>
  <element name="LED" id="LED0" x="540" y="25"/>
  <element name="LED" id="LED1" x="540" y="75">
    <link id="input" toElement="Switch0" toNode="output"/>
  </element>
  <element name="LED" id="LED2" x="540" y="125">
    <link id="input" toElement="ANDPort1" toNode="output"/>
  </element>
  <element name="LED" id="LED3" x="540" y="175"/>
  <element name="LED" id="LED4" x="540" y="225"/>
  <element name="LED" id="LED5" x="540" y="275"/>
  <element name="Buzzer" id="Buzzer0" x="540" y="325"/>
  <element name="Relais" id="Relais0" x="540" y="375"/>
  <element name="Lightbulb" id="Lightbulb0" x="745" y="11"/>
  <element name="Heater" id="Heater0" x="742" y="360"/>
  <element name="Voltmeter" id="Voltmeter0" x="5" y="100"/>
</systeembord>`;
    const r = vanJeroen(xml);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = r.schakeling;
    // Geen losse modules over het bord heen: alles staat op ons bord.
    expect(s.modules.every((m) => m.bord === "b0")).toBe(true);
    expect(s.draden).toHaveLength(5);
    // De lichtsensor wordt gebruikt, de temperatuursensor niet.
    const sensoren = s.modules.filter((m) => m.soort === "sensor");
    expect(sensoren.map((m) => m.params.sensor)).toEqual([
      SENSOREN.indexOf("licht"),
      SENSOREN.indexOf("draaiknop"),
    ]);
  });

  it("een gebruikte extra module komt naast het bord, niet erop", () => {
    const xml = `<systeembord>
  <element name="Board" id="Board0" x="60" y="0"/>
  <element name="Switch" id="Switch0" x="70" y="175"/>
  <element name="LED" id="LED0" x="540" y="25"/>
  <element name="LED" id="LED1" x="540" y="75"/>
  <element name="LED" id="LED2" x="540" y="125"/>
  <element name="LED" id="LED3" x="540" y="175"/>
  <element name="LED" id="LED4" x="540" y="225">
    <link id="input" toElement="Switch0" toNode="output"/>
  </element>
</systeembord>`;
    const r = vanJeroen(xml);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const los = r.schakeling.modules.filter((m) => !m.bord);
    expect(los).toHaveLength(1);
    expect(los[0].x).toBeGreaterThan(bordMaat("comparators").breedte);
    expect(r.schakeling.draden).toHaveLength(1);
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
