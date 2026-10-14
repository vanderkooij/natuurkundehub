import { useCallback, useEffect, useRef, useState } from "react";

import {
  Simulator,
  maakModule,
  standaardOmgeving,
  verwijderBord,
  verwijderModule,
  voegDraadToe,
  type BordSoort,
  type BusAdres,
  type ModuleSoort,
  type OmgevingInstelling,
  type Params,
  type Schakeling,
} from "@/sim";
import { maakBord } from "@/bord/borden";
import { invloeden, opstelling } from "@/bord/opstelling";

import { legeGeschiedenis, ongedaan, onthoud, opnieuw } from "./geschiedenis";

let teller = 0;
export const nieuwId = (voorvoegsel: string) =>
  `${voorvoegsel}${Date.now().toString(36)}${teller++}`;

/**
 * Instellingen die bediening zijn, geen wijziging van de schakeling: een knop
 * indrukken hoort niet bij ongedaan maken.
 */
const BEDIENING = new Set(["ingedrukt", "resetKnop"]);

/**
 * Houdt de schakeling bij en laat de simulator meelopen met de echte tijd.
 * Er wordt alleen opnieuw getekend als er een spanning verandert. Elke
 * wijziging gaat via `wijzig`, zodat ongedaan maken alles terug kan zetten.
 */
export function useSchakeling(begin: () => Schakeling) {
  const [schakeling, setSchakeling] = useState<Schakeling>(begin);
  // Altijd de nieuwste stand, ook als er in één klik meerdere wijzigingen zijn.
  const huidig = useRef(schakeling);
  const geschiedenis = useRef(legeGeschiedenis());
  const simRef = useRef<Simulator | null>(null);
  const bijgewerkt = useRef<Schakeling | null>(null);
  if (!simRef.current) simRef.current = new Simulator(schakeling);
  const sim = simRef.current;
  // Meteen bij het tekenen bijwerken, niet pas in een effect: anders toont dit
  // ene beeld nog de oude spanningen (een nieuwe draad naar een led bijvoorbeeld).
  if (bijgewerkt.current !== schakeling) {
    bijgewerkt.current = schakeling;
    sim.zetSchakeling(schakeling);
    // Hoe sterk lamp, kachel en ventilator op elke sensor werken, naar waar ze staan.
    sim.zetOpstelling(invloeden(opstelling(schakeling)));
  }
  const [, setVersie] = useState(0);
  const handtekening = useRef("");

  const vernieuw = useCallback(() => {
    // Alle spanningen afgerond op 0,01 V: verandert er iets, dan opnieuw tekenen.
    const s = sim.handtekening();
    if (s !== handtekening.current) {
      handtekening.current = s;
      setVersie((v) => v + 1);
    }
  }, [sim]);

  useEffect(() => {
    let vorige = performance.now();
    let id = 0;
    const lus = (nu: number) => {
      // Na een verborgen tabblad niet ineens seconden inhalen.
      const dt = Math.min(0.1, (nu - vorige) / 1000);
      vorige = nu;
      sim.stap(dt);
      vernieuw();
      id = requestAnimationFrame(lus);
    };
    id = requestAnimationFrame(lus);
    return () => cancelAnimationFrame(id);
  }, [sim, vernieuw]);

  /**
   * Past de schakeling aan. `sleutel` voegt snel opeenvolgende wijzigingen aan
   * hetzelfde (een knop rondslepen, een module verschuiven) samen tot één stap;
   * `false` betekent: niet onthouden (bediening).
   */
  const wijzig = useCallback(
    (
      f: (s: Schakeling) => Schakeling,
      sleutel: string | null | false = null,
    ) => {
      const vorige = huidig.current;
      const nieuw = f(vorige);
      if (nieuw === vorige) return;
      if (sleutel !== false)
        geschiedenis.current = onthoud(
          geschiedenis.current,
          vorige,
          sleutel,
          performance.now(),
        );
      huidig.current = nieuw;
      setSchakeling(nieuw);
    },
    [],
  );

  const zetParam = useCallback(
    (moduleId: string, naam: string, waarde: Params[string]) => {
      wijzig(
        (s) => ({
          ...s,
          modules: s.modules.map((m) =>
            m.id === moduleId
              ? { ...m, params: { ...m.params, [naam]: waarde } }
              : m,
          ),
        }),
        BEDIENING.has(naam) ? false : `param:${moduleId}:${naam}`,
      );
    },
    [wijzig],
  );

  /** Instellingen van een of meer modules tegelijk, als één stap. */
  const zetParams = useCallback(
    (perModule: Record<string, Params>, sleutel: string) => {
      wijzig(
        (s) => ({
          ...s,
          modules: s.modules.map((m) =>
            perModule[m.id]
              ? { ...m, params: { ...m.params, ...perModule[m.id] } }
              : m,
          ),
        }),
        sleutel,
      );
    },
    [wijzig],
  );

  const verplaats = useCallback(
    (moduleId: string, x: number, y: number) => {
      wijzig(
        (s) => ({
          ...s,
          modules: s.modules.map((m) =>
            m.id === moduleId ? { ...m, x, y } : m,
          ),
        }),
        `verplaats:${moduleId}`,
      );
    },
    [wijzig],
  );

  /** Verbind twee bussen; geeft een foutmelding terug als dat niet mag. */
  const verbind = useCallback(
    (a: BusAdres, b: BusAdres): string | undefined => {
      const r = voegDraadToe(huidig.current, a, b, nieuwId("d"));
      if (r.fout) return r.fout;
      wijzig(() => r.schakeling);
      return undefined;
    },
    [wijzig],
  );

  const verwijderDraad = useCallback(
    (id: string) =>
      wijzig((s) => ({ ...s, draden: s.draden.filter((d) => d.id !== id) })),
    [wijzig],
  );

  /** Buig een draad (sleep aan zijn midden); zonder bocht kiest de tool zelf weer. */
  const buigDraad = useCallback(
    (id: string, bocht: { x: number; y: number } | null) =>
      wijzig(
        (s) => ({
          ...s,
          draden: s.draden.map((d) => {
            if (d.id !== id) return d;
            const kaal = { id: d.id, van: d.van, naar: d.naar };
            return bocht ? { ...kaal, bocht } : kaal;
          }),
        }),
        `buig:${id}`,
      ),
    [wijzig],
  );

  const verwijder = useCallback(
    (moduleId: string) => wijzig((s) => verwijderModule(s, moduleId)),
    [wijzig],
  );

  const vervang = useCallback((s: Schakeling) => wijzig(() => s), [wijzig]);

  const zetOmgeving = useCallback(
    (nieuw: Partial<OmgevingInstelling>) => {
      wijzig(
        (s) => ({
          ...s,
          omgeving: { ...(s.omgeving ?? standaardOmgeving()), ...nieuw },
        }),
        `omgeving:${Object.keys(nieuw).join(",")}`,
      );
    },
    [wijzig],
  );

  const voegModuleToe = useCallback(
    (soort: ModuleSoort, x: number, y: number) => {
      const m = maakModule(soort, nieuwId(soort), x, y);
      wijzig((s) => ({ ...s, modules: [...s.modules, m] }));
      return m.id;
    },
    [wijzig],
  );

  const voegBordToe = useCallback(
    (soort: BordSoort, x: number, y: number) => {
      const { bord, modules } = maakBord(soort, nieuwId("bord"), x, y);
      wijzig((s) => ({
        ...s,
        borden: [...(s.borden ?? []), bord],
        modules: [...s.modules, ...modules],
      }));
    },
    [wijzig],
  );

  /** Verschuift een bord met alle modules erop. */
  const verplaatsBord = useCallback(
    (id: string, x: number, y: number) => {
      wijzig((s) => {
        const b = (s.borden ?? []).find((x) => x.id === id);
        if (!b) return s;
        const dx = x - b.x,
          dy = y - b.y;
        if (dx === 0 && dy === 0) return s;
        return {
          ...s,
          borden: (s.borden ?? []).map((x) =>
            x.id === id ? { ...x, x: b.x + dx, y: b.y + dy } : x,
          ),
          modules: s.modules.map((m) =>
            m.bord === id ? { ...m, x: m.x + dx, y: m.y + dy } : m,
          ),
        };
      }, `bord:${id}`);
    },
    [wijzig],
  );

  const verwijderBordCb = useCallback(
    (id: string) => wijzig((s) => verwijderBord(s, id)),
    [wijzig],
  );

  const terugzetten = useCallback((r: ReturnType<typeof ongedaan>) => {
    if (!r) return false;
    geschiedenis.current = r.g;
    huidig.current = r.schakeling;
    setSchakeling(r.schakeling);
    return true;
  }, []);
  const maakOngedaan = useCallback(
    () => terugzetten(ongedaan(geschiedenis.current, huidig.current)),
    [terugzetten],
  );
  const doeOpnieuw = useCallback(
    () => terugzetten(opnieuw(geschiedenis.current, huidig.current)),
    [terugzetten],
  );

  return {
    schakeling,
    sim,
    vervang,
    zetOmgeving,
    voegModuleToe,
    voegBordToe,
    verplaatsBord,
    verwijderBord: verwijderBordCb,
    zetParam,
    zetParams,
    verplaats,
    verbind,
    verwijderDraad,
    buigDraad,
    verwijder,
    maakOngedaan,
    doeOpnieuw,
    kanOngedaan: geschiedenis.current.verleden.length > 0,
    kanOpnieuw: geschiedenis.current.toekomst.length > 0,
  };
}
