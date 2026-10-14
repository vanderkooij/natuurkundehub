import {
  MODULES,
  standaardOmgeving,
  type Bord,
  type Draad,
  type ModuleInstantie,
  type ModuleSoort,
  type Schakeling,
} from "@/sim";

/**
 * Eigen bestandsformaat: de schakeling als JSON, met een kop zodat we later
 * kunnen zien welke versie het is.
 */
export interface Bestand {
  app: "systeembord";
  versie: 1;
  schakeling: Schakeling;
}

export const BESTAND_EXTENSIE = ".systeembord.json";

/**
 * Korte, nette id's (b0, m0, d0 …). Een link wordt daar een stuk korter van,
 * en de id's van borden (met tijdstempel) zeggen buiten de tool toch niets.
 */
export function compact(s: Schakeling): Schakeling {
  const bordId = new Map((s.borden ?? []).map((b, i) => [b.id, `b${i}`]));
  const moduleId = new Map(s.modules.map((m, i) => [m.id, `m${i}`]));
  return {
    borden: (s.borden ?? []).map((b) => ({ ...b, id: bordId.get(b.id)! })),
    modules: s.modules.map((m) => ({
      ...m,
      id: moduleId.get(m.id)!,
      ...(m.bord ? { bord: bordId.get(m.bord) } : {}),
    })),
    draden: s.draden
      .filter((d) => moduleId.has(d.van.module) && moduleId.has(d.naar.module))
      .map((d, i) => ({
        id: `d${i}`,
        van: { module: moduleId.get(d.van.module)!, bus: d.van.bus },
        naar: { module: moduleId.get(d.naar.module)!, bus: d.naar.bus },
        ...(d.bocht
          ? { bocht: { x: Math.round(d.bocht.x), y: Math.round(d.bocht.y) } }
          : {}),
      })),
    omgeving: s.omgeving ?? standaardOmgeving(),
  };
}

export const naarTekst = (s: Schakeling): string =>
  JSON.stringify({
    app: "systeembord",
    versie: 1,
    schakeling: compact(s),
  } satisfies Bestand);

export type Ingelezen =
  | { ok: true; schakeling: Schakeling }
  | { ok: false; fout: string };

const isGetal = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/**
 * Leest een bestand in en controleert het grondig: een kapot of vreemd bestand
 * mag de tool niet laten vastlopen.
 */
export function vanTekst(tekst: string): Ingelezen {
  let data: unknown;
  try {
    data = JSON.parse(tekst);
  } catch {
    return { ok: false, fout: "Dit bestand kan de tool niet lezen." };
  }
  const b = data as Partial<Bestand> | null;
  if (!b || b.app !== "systeembord" || !b.schakeling)
    return { ok: false, fout: "Dit is geen bestand van het systeembord." };
  if (b.versie !== 1)
    return {
      ok: false,
      fout: "Dit bestand is gemaakt met een nieuwere versie van de tool.",
    };
  const s = b.schakeling;

  const borden: Bord[] = [];
  for (const x of Array.isArray(s.borden) ? s.borden : []) {
    if (typeof x?.id !== "string" || !isGetal(x.x) || !isGetal(x.y)) continue;
    if (x.soort !== "comparators" && x.soort !== "transistor") continue;
    borden.push({ id: x.id, soort: x.soort, x: x.x, y: x.y });
  }
  const modules: ModuleInstantie[] = [];
  for (const m of Array.isArray(s.modules) ? s.modules : []) {
    if (typeof m?.id !== "string" || !(m.soort in MODULES)) continue;
    if (!isGetal(m.x) || !isGetal(m.y)) continue;
    const params: ModuleInstantie["params"] = {
      ...MODULES[m.soort as ModuleSoort].params(),
    };
    for (const [k, v] of Object.entries(m.params ?? {}))
      if (k in params && (isGetal(v) || typeof v === "boolean")) params[k] = v;
    modules.push({
      id: m.id,
      soort: m.soort,
      x: m.x,
      y: m.y,
      params,
      ...(typeof m.bord === "string" && borden.some((x) => x.id === m.bord)
        ? { bord: m.bord }
        : {}),
    });
  }
  const perId = new Map(modules.map((m) => [m.id, m]));
  const bezet = new Set<string>();
  const draden: Draad[] = [];
  for (const d of Array.isArray(s.draden) ? s.draden : []) {
    const van = perId.get(d?.van?.module);
    const naar = perId.get(d?.naar?.module);
    if (!van || !naar) continue;
    if (!MODULES[van.soort].uitgangen.includes(d.van.bus)) continue;
    if (!MODULES[naar.soort].ingangen.includes(d.naar.bus)) continue;
    const sleutel = `${naar.id}.${d.naar.bus}`;
    if (bezet.has(sleutel)) continue; // één draad per ingang
    bezet.add(sleutel);
    draden.push({
      id: String(d.id ?? `d${draden.length}`),
      van: { ...d.van },
      naar: { ...d.naar },
      ...(d.bocht && isGetal(d.bocht.x) && isGetal(d.bocht.y)
        ? { bocht: { x: d.bocht.x, y: d.bocht.y } }
        : {}),
    });
  }
  const o = s.omgeving;
  const omgeving = {
    ...standaardOmgeving(),
    ...(o && isGetal(o.licht) ? { licht: o.licht } : {}),
    ...(o && isGetal(o.buiten) ? { buiten: o.buiten } : {}),
    ...(o && typeof o.kachel === "boolean" ? { kachel: o.kachel } : {}),
  };
  return { ok: true, schakeling: { borden, modules, draden, omgeving } };
}
