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

export type BusRichting = "ingang" | "uitgang" | "aarde";

export function richtingVan(
  s: Schakeling,
  adres: BusAdres,
): BusRichting | null {
  const m = s.modules.find((x) => x.id === adres.module);
  if (!m) return null;
  const def = MODULES[m.soort];
  if (def.ingangen.includes(adres.bus)) return "ingang";
  if (def.uitgangen.includes(adres.bus)) return "uitgang";
  if (def.aarde?.includes(adres.bus)) return "aarde";
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
  // De aarde (0 V) verbind je alleen met de aarde van een ander bord.
  if (ra === "aarde" || rb === "aarde") {
    if (ra !== rb)
      return {
        ok: false,
        reden:
          "De aarde (zwarte bus) verbind je alleen met de aarde van een ander bord.",
      };
    if (
      s.draden.some(
        (d) =>
          (d.van.module === a.module && d.naar.module === b.module) ||
          (d.van.module === b.module && d.naar.module === a.module),
      )
    )
      return { ok: false, reden: "Deze aardes zijn al verbonden." };
    return { ok: true, van: a, naar: b };
  }
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

/** Is dit een draad tussen twee aardebussen? */
export function isAardeDraad(s: Schakeling, d: Draad): boolean {
  return richtingVan(s, d.van) === "aarde";
}

/**
 * Welke borden dezelfde aarde hebben: per bord-id een groepsnummer. Borden
 * waarvan de aardes (via een of meer draden) verbonden zijn, zitten in
 * dezelfde groep.
 */
export function aardeGroepen(s: Schakeling): Map<string, number> {
  const ouder = new Map<string, string>();
  const wortel = (x: string): string => {
    let r = x;
    while (ouder.get(r) !== r) r = ouder.get(r)!;
    return r;
  };
  for (const b of s.borden ?? []) ouder.set(b.id, b.id);
  const bordVan = new Map(s.modules.map((m) => [m.id, m.bord]));
  for (const d of s.draden) {
    if (!isAardeDraad(s, d)) continue;
    const a = bordVan.get(d.van.module),
      b = bordVan.get(d.naar.module);
    if (a && b && ouder.has(a) && ouder.has(b)) ouder.set(wortel(a), wortel(b));
  }
  const nummer = new Map<string, number>();
  const uit = new Map<string, number>();
  for (const id of ouder.keys()) {
    const w = wortel(id);
    if (!nummer.has(w)) nummer.set(w, nummer.size);
    uit.set(id, nummer.get(w)!);
  }
  return uit;
}

/**
 * Draden die van het ene bord naar het andere lopen terwijl de aardes van
 * die borden niet verbonden zijn: die geven geen signaal door. Losse modules
 * (niet op een bord) werken altijd, zonder aarde.
 */
export function dradenZonderAarde(s: Schakeling): Set<string> {
  const groep = aardeGroepen(s);
  const bordVan = new Map(s.modules.map((m) => [m.id, m.bord]));
  const uit = new Set<string>();
  for (const d of s.draden) {
    const a = bordVan.get(d.van.module),
      b = bordVan.get(d.naar.module);
    if (!a || !b || a === b || isAardeDraad(s, d)) continue;
    if (groep.get(a) !== groep.get(b)) uit.add(d.id);
  }
  return uit;
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
