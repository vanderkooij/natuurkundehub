import { describe, expect, it } from "vitest";

import {
  legeGeschiedenis,
  MAX_STAPPEN,
  ongedaan,
  onthoud,
  opnieuw,
  SAMENVOEG_MS,
} from "@/state/geschiedenis";
import type { Schakeling } from "@/sim";

const stand = (n: number): Schakeling => ({
  modules: [],
  draden: [],
  borden: [],
  omgeving: { licht: n, buiten: 20, kachel: false },
});
const licht = (s: Schakeling | undefined) => s?.omgeving?.licht;

describe("ongedaan maken", () => {
  it("terug en weer vooruit", () => {
    let g = legeGeschiedenis();
    g = onthoud(g, stand(1), null, 0);
    g = onthoud(g, stand(2), null, 10);
    // nu staat er stand 3
    const terug = ongedaan(g, stand(3))!;
    expect(licht(terug.schakeling)).toBe(2);
    const nogTerug = ongedaan(terug.g, terug.schakeling)!;
    expect(licht(nogTerug.schakeling)).toBe(1);
    expect(ongedaan(nogTerug.g, nogTerug.schakeling)).toBeNull();
    const vooruit = opnieuw(nogTerug.g, nogTerug.schakeling)!;
    expect(licht(vooruit.schakeling)).toBe(2);
  });

  it("een nieuwe wijziging wist wat je weer vooruit kon doen", () => {
    let g = onthoud(legeGeschiedenis(), stand(1), null, 0);
    const terug = ongedaan(g, stand(2))!;
    g = onthoud(terug.g, terug.schakeling, null, 100);
    expect(opnieuw(g, stand(5))).toBeNull();
  });

  it("een knop rondslepen telt als één stap", () => {
    let g = legeGeschiedenis();
    for (let i = 0; i < 20; i++)
      g = onthoud(g, stand(i), "param:k:spanning", i * 50);
    expect(g.verleden).toHaveLength(1);
    expect(licht(g.verleden[0])).toBe(0);
    // Na een pauze, of met een andere knop, is het een nieuwe stap.
    g = onthoud(g, stand(99), "param:k:spanning", 20 * 50 + SAMENVOEG_MS + 1);
    g = onthoud(g, stand(100), "param:k2:spanning", 20 * 50 + SAMENVOEG_MS + 2);
    expect(g.verleden).toHaveLength(3);
  });

  it("onthoudt niet eindeloos veel stappen", () => {
    let g = legeGeschiedenis();
    for (let i = 0; i < MAX_STAPPEN + 20; i++)
      g = onthoud(g, stand(i), null, i);
    expect(g.verleden).toHaveLength(MAX_STAPPEN);
    expect(licht(g.verleden[0])).toBe(20);
  });
});
