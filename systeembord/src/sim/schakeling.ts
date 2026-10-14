import { MODULES } from "./modules";
import type {
  BusAdres,
  Draad,
  ModuleInstantie,
  ModuleSoort,
  Schakeling,
} from "./types";

export const legeSchakeling = (): Schakeling => ({ modules: [], draden: [] });

export function maakModule(
  soort: ModuleSoort,
  id: string,
  x = 0,
  y = 0,
  params: ModuleInstantie["params"] = {},
): ModuleInstantie {
  return { id, soort, x, y, params: { ...MODULES[soort].params(), ...params } };
}

export type BusRichting = "ingang" | "uitgang";

export function richtingVan(
  s: Schakeling,
  adres: BusAdres,
): BusRichting | null {
  const m = s.modules.find((x) => x.id === adres.module);
  if (!m) return null;
  const def = MODULES[m.soort];
  if (def.ingangen.includes(adres.bus)) return "ingang";
  if (def.uitgangen.includes(adres.bus)) return "uitgang";
  return null;
}

export type DraadControle =
  | { ok: true; van: BusAdres; naar: BusAdres }
  | { ok: false; reden: string };

/**
 * Mag er een draad tussen deze twee bussen? De volgorde maakt niet uit: de
 * draad loopt altijd van de uitgang naar de ingang.
 */
export function controleerDraad(
  s: Schakeling,
  a: BusAdres,
  b: BusAdres,
): DraadControle {
  const ra = richtingVan(s, a);
  const rb = richtingVan(s, b);
  if (!ra || !rb) return { ok: false, reden: "Deze bus bestaat niet." };
  if (a.module === b.module && a.bus === b.bus)
    return { ok: false, reden: "Een draad moet naar een andere bus." };
  if (ra === "uitgang" && rb === "uitgang")
    return {
      ok: false,
      reden: "Twee uitgangen mag je niet met elkaar verbinden.",
    };
  if (ra === "ingang" && rb === "ingang")
    return {
      ok: false,
      reden:
        "Twee ingangen verbinden heeft geen zin: een van beide moet een uitgang zijn.",
    };
  const [van, naar] = ra === "uitgang" ? [a, b] : [b, a];
  if (
    s.draden.some(
      (d) => d.naar.module === naar.module && d.naar.bus === naar.bus,
    )
  )
    return { ok: false, reden: "Op deze ingang zit al een draad." };
  return { ok: true, van, naar };
}

export function voegDraadToe(
  s: Schakeling,
  a: BusAdres,
  b: BusAdres,
  id: string,
): { schakeling: Schakeling; fout?: string } {
  const c = controleerDraad(s, a, b);
  if (!c.ok) return { schakeling: s, fout: c.reden };
  const draad: Draad = { id, van: c.van, naar: c.naar };
  return { schakeling: { ...s, draden: [...s.draden, draad] } };
}

export function verwijderModule(s: Schakeling, id: string): Schakeling {
  return {
    ...s,
    modules: s.modules.filter((m) => m.id !== id),
    draden: s.draden.filter((d) => d.van.module !== id && d.naar.module !== id),
  };
}

/** Haalt een bord weg, met alle modules erop en de draden eraan. */
export function verwijderBord(s: Schakeling, id: string): Schakeling {
  const weg = new Set(s.modules.filter((m) => m.bord === id).map((m) => m.id));
  return {
    borden: (s.borden ?? []).filter((b) => b.id !== id),
    modules: s.modules.filter((m) => !weg.has(m.id)),
    draden: s.draden.filter(
      (d) => !weg.has(d.van.module) && !weg.has(d.naar.module),
    ),
  };
}
