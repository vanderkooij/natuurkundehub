import { describe, expect, it } from "vitest";

import { sketchToDoc } from "../fromSketch";
import { findLedColor, findQuantity, formatQuantity, niceStep, replaceQuantity } from "../values";

describe("waarden uit vrije tekst", () => {
  it.each([
    ["100 Ω", "Ω", 100],
    ["R1 = 4,7 kΩ", "Ω", 4700],
    ["R1=4.7kΩ", "Ω", 4700],
    ["220 ohm", "Ω", 220],
    ["100", "Ω", 100],
    ["2k", "Ω", 2000],
    ["U = 6 V", "V", 6],
    ["12 volt", "V", 12],
    ["500 mA", "A", 0.5],
    ["I = 1,5 A", "A", 1.5],
  ] as const)("%s → %s", (text, unit, value) => {
    expect(findQuantity(text, unit)?.value).toBeCloseTo(value);
  });

  it("geen getal met die eenheid: niets", () => {
    expect(findQuantity("R2 = ?", "Ω")).toBeNull();
    expect(findQuantity("R1", "Ω")).toBeNull();
    expect(findQuantity("6 V", "Ω")).toBeNull();
    expect(findQuantity(undefined, "V")).toBeNull();
  });

  it("het verborgen antwoord tussen [ ] gaat voor", () => {
    expect(findQuantity("R2 = ? [30 Ω]", "Ω")?.value).toBe(30);
    expect(findQuantity("R = 10 Ω [20 Ω]", "Ω")?.value).toBe(20);
  });

  it("LED-kleur", () => {
    expect(findLedColor("groene LED")).toBeNull(); // "groene" is geen los woord "groen"
    expect(findLedColor("LED groen")?.key).toBe("groen");
    expect(findLedColor("Blue")?.key).toBe("blauw");
  });

  it("schrijft netjes en vervangt alleen het getal", () => {
    expect(formatQuantity(4700, "Ω")).toBe("4,7 kΩ");
    expect(formatQuantity(6, "V")).toBe("6 V");
    expect(formatQuantity(0.5, "A")).toBe("500 mA");
    expect(replaceQuantity("R1 = 100 Ω", "Ω", 220)).toBe("R1 = 220 Ω");
    expect(replaceQuantity("R1 = 100 Ω", "Ω", 100)).toBe("R1 = 100 Ω");
    expect(replaceQuantity("R2 = ? [30 Ω]", "Ω", 47)).toBe("R2 = ? [47 Ω]");
    expect(replaceQuantity("R2 = ?", "Ω", 47)).toBe("R2 = ?");
    expect(replaceQuantity(undefined, "V", 9)).toBe("9 V");
  });

  it("stapgrootte groeit mee met de waarde", () => {
    expect(niceStep(47)).toBe(1);
    expect(niceStep(470)).toBe(10);
    expect(niceStep(4700)).toBe(100);
  });
});

describe("waarden uit CircuitSketch overnemen", () => {
  const comp = (id: string, type: string, x: number, value?: string) => ({ id, type, x, y: 100, rotation: 0, value });

  it("gebruikt de getypte waarden en kapt af op het bereik", () => {
    const r = sketchToDoc({
      components: [
        comp("b", "voltage", 100, "U = 9 V"),
        comp("r1", "resistor", 300, "R1 = 4,7 kΩ"),
        comp("r2", "resistor", 500, "47 kΩ"),
        comp("r3", "resistor", 700, "R3 = ?"),
        comp("l", "led", 900, "blauw"),
      ],
      wires: [],
    });
    const v = r.doc.components.map((c) => c.values);
    expect(v[0].emf).toBe(9);
    expect(v[1].resistance).toBe(4700);
    expect(v[2].resistance).toBe(10000);
    expect(v[3].resistance).toBe(10); // standaardwaarde
    expect(v[4].color).toBe("blauw");
    expect(r.clamped).toEqual(["47 kΩ wordt 10 kΩ"]);
    expect(r.defaulted).toEqual([{ label: "weerstand", count: 1 }]);
    expect(r.doc.components[1].sketchText).toBe("R1 = 4,7 kΩ");
  });
});
