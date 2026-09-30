import { describe, it, expect } from "vitest";

import { solve } from "@/sim";
import { toNetlist } from "../netlist";
import { PRESETS } from "../presets";
import { probeContact, probeVoltage } from "../probe";

const deler = () => PRESETS.find((p) => p.key === "deler")!.build();

describe("voltmeter met meetpennen", () => {
  it("pen op een aansluitpunt pakt die knoop", () => {
    const doc = deler();
    const c = probeContact(doc, { x: 424, y: 268 }, 18); // vlak bij de middenknoop (420, 270)
    expect(c).not.toBeNull();
    expect(c!.x).toBe(420);
    expect(c!.y).toBe(270);
  });

  it("pen midden op een draad pakt de knoop van die draad, precies op de draad", () => {
    const doc = deler();
    const c = probeContact(doc, { x: 300, y: 156 }, 18); // draad van (180,150) naar (420,150)
    expect(c).not.toBeNull();
    expect(c!.y).toBe(150);
    expect(c!.x).toBeCloseTo(300, 6);
  });

  it("pen op het aansluitdraadje of een pool van de batterij pakt die terminal", () => {
    const doc = deler(); // bron van (180,150) = + naar (180,390) = −
    const r = solve(toNetlist(doc));
    const plus = probeContact(doc, { x: 184, y: 190 }, 18);
    const min = probeContact(doc, { x: 176, y: 350 }, 18);
    expect(plus).not.toBeNull();
    expect(min).not.toBeNull();
    expect(probeVoltage(r, plus, min)).toBeCloseTo(12, 6);
  });

  it("midden op een weerstand: geen contact (daar zit geen knoop)", () => {
    const doc = deler(); // R1 van (420,150) naar (420,270): midden (420,210)
    expect(probeContact(doc, { x: 424, y: 210 }, 18)).toBeNull();
  });

  it("pen in het niets: geen contact", () => {
    expect(probeContact(deler(), { x: 900, y: 900 }, 18)).toBeNull();
  });

  it("meet 8 V over de onderste weerstand en 12 V over de bron", () => {
    const doc = deler();
    const r = solve(toNetlist(doc));
    const midden = probeContact(doc, { x: 420, y: 270 }, 18);
    const onder = probeContact(doc, { x: 300, y: 390 }, 18); // op de onderste draad
    const boven = probeContact(doc, { x: 300, y: 150 }, 18);
    expect(probeVoltage(r, midden, onder)).toBeCloseTo(8, 6);
    expect(probeVoltage(r, boven, onder)).toBeCloseTo(12, 6);
    // Pennen omgedraaid: dan is het teken negatief, net als bij een echte meter.
    expect(probeVoltage(r, onder, midden)).toBeCloseTo(-8, 6);
  });

  it("zonder contact geen waarde", () => {
    const doc = deler();
    const r = solve(toNetlist(doc));
    expect(
      probeVoltage(r, probeContact(doc, { x: 420, y: 270 }, 18), null),
    ).toBeNull();
  });
});
