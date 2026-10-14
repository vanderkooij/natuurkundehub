import { describe, expect, it } from "vitest";

import {
  MAX_SCHAAL,
  naarWerkvlak,
  passend,
  schuif,
  zoomRond,
} from "@/werkvlak/kijkvenster";

describe("kijkvenster", () => {
  const k = { x: 100, y: 50, schaal: 1 };

  it("zoomen houdt het punt onder de vinger op zijn plek", () => {
    const voor = naarWerkvlak(k, 300, 200);
    const z = zoomRond(k, 2, 300, 200);
    expect(z.schaal).toBe(2);
    expect(naarWerkvlak(z, 300, 200)).toEqual(voor);
  });

  it("zoomen blijft binnen de grenzen", () => {
    expect(zoomRond(k, 100, 0, 0).schaal).toBe(MAX_SCHAAL);
  });

  it("schuiven beweegt het werkvlak mee met de vinger", () => {
    const s = schuif(k, 40, -20);
    expect(naarWerkvlak(s, 40, -20)).toEqual(naarWerkvlak(k, 0, 0));
  });

  it("passend zet een rechthoek gecentreerd in beeld", () => {
    const p = passend(
      { x: 0, y: 0, breedte: 1000, hoogte: 500 },
      1048,
      1000,
      24,
    );
    expect(p.schaal).toBe(1);
    expect(naarWerkvlak(p, 524, 500)).toEqual({ x: 500, y: 250 });
  });
});
