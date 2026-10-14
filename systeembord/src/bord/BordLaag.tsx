import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  dradenZonderAarde,
  GELUID_PIEK,
  isAardeDraad,
  isHoog,
  MODULES,
  RELAIS_APPARATEN,
  SENSOREN,
  type Bord,
  type BusAdres,
  type ModuleInstantie,
  type Params,
  type Schakeling,
  type Simulator,
} from "@/sim";
import { useWerkvlak } from "@/werkvlak/context";

import { bordMaat, kolomKoppen } from "./borden";
import { BusSvg } from "./BusSvg";
import {
  buigpuntDoor,
  busPositie,
  dichtsteBus,
  draadMidden,
  draadPad,
  kiesBocht,
  knopWaarde,
  rondAf,
  vormVan,
  type KnopVorm,
  type Punt,
  type VoltmeterStand,
} from "./geometrie";
import { leesGetal } from "./getal";
import { BedieningSvg, ModuleSvg } from "./ModuleSvg";
import { OmgevingSvg } from "./OmgevingSvg";
import { apparatenVast, sensorPunt, type Kring } from "./opstelling";
import { OVERGANG_DUUR, useOvergangen } from "./overgangen";
import { Voltmeter } from "./Voltmeter";

const draadKleur = (hoog: boolean) =>
  hoog ? "var(--sb-hoog)" : "var(--sb-laag)";

export type Selectie =
  | { soort: "draad"; id: string }
  | { soort: "module"; id: string }
  | { soort: "bord"; id: string }
  | null;

interface Props {
  schakeling: Schakeling;
  sim: Simulator;
  selectie: Selectie;
  setSelectie: (s: Selectie) => void;
  /** Bus die op een tweede tik wacht (draad maken door twee keer te tikken). */
  gekozen: BusAdres | null;
  setGekozen: (b: BusAdres | null) => void;
  verbind: (a: BusAdres, b: BusAdres) => string | undefined;
  verplaats: (id: string, x: number, y: number) => void;
  verplaatsBord: (id: string, x: number, y: number) => void;
  zetParam: (id: string, naam: string, waarde: Params[string]) => void;
  /** Instellingen van meer modules tegelijk; `sleutel` voegt een sleepbeweging samen tot één stap. */
  zetParams: (perModule: Record<string, Params>, sleutel: string) => void;
  verwijderDraad: (id: string) => void;
  buigDraad: (id: string, bocht: Punt | null) => void;
  verwijder: (id: string) => void;
  verwijderBord: (id: string) => void;
  melding: (tekst: string) => void;
  voltmeter: VoltmeterStand | null;
  setVoltmeter: (v: VoltmeterStand | null) => void;
  /** Naam per module in de waarheidstabel (A, B, led …), als kaartje op het bord. */
  etiketten: Record<string, string>;
}

/** Vanaf deze afstand in schermpixels is een tik een sleepbeweging. */
const SLEEP_DREMPEL = 6;
/** Modules en borden springen naar dit raster bij het verslepen. */
const PLAATS_RASTER = 10;

const zelfdeBus = (a: BusAdres | null, b: BusAdres | null) =>
  !!a && !!b && a.module === b.module && a.bus === b.bus;

/**
 * Alles wat op het werkvlak ligt: borden, modules, draden en bussen, plus het
 * slepen van draden, modules en borden. Bussen liggen bovenop de draden, zodat
 * je ook vanaf een bus met al een draad eraan een nieuwe draad kunt trekken.
 */
export function BordLaag(p: Props) {
  const { schaal, naarWerkvlak } = useWerkvlak();
  const [sleepDraad, setSleepDraad] = useState<{
    van: BusAdres;
    naar: Punt;
  } | null>(null);
  const [doel, setDoel] = useState<BusAdres | null>(null);
  const actief = useRef(false);
  /** Open keuzemenu: welke sensor in de bus, of welk apparaat aan het relais. */
  const [keuze, setKeuze] = useState<{
    moduleId: string;
    soort: "sensor" | "apparaat";
  } | null>(null);
  /** Open invulvakje: een waarde typen in plaats van draaien. */
  const [invoer, setInvoer] = useState<{
    moduleId: string;
    knop: KnopVorm;
  } | null>(null);
  useEffect(() => {
    if (!invoer) return;
    const sluit = () => setInvoer(null);
    window.addEventListener("pointerdown", sluit);
    return () => window.removeEventListener("pointerdown", sluit);
  }, [invoer]);

  // Een tik ergens anders sluit het menu.
  useEffect(() => {
    if (!keuze) return;
    const sluit = () => setKeuze(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && sluit();
    window.addEventListener("pointerdown", sluit);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", sluit);
      window.removeEventListener("keydown", esc);
    };
  }, [keuze]);

  const borden = p.schakeling.borden ?? [];
  const vindModule = (id: string) =>
    p.schakeling.modules.find((m) => m.id === id);
  const spanning = (id: string, bus: string) => p.sim.spanning(id, bus);
  /** Een bus raak je binnen ~24 schermpixels, ook als je er net naast tikt. */
  const raakAfstand = () => Math.max(24, 24 / schaal);
  const rond = (v: number) => Math.round(v / PLAATS_RASTER) * PLAATS_RASTER;

  /** Volg de aanwijzer tot hij loslaat, ook buiten het element. */
  function volg(
    e: React.PointerEvent,
    beweeg: (punt: Punt, bewogen: boolean) => void,
    los: (punt: Punt, bewogen: boolean) => void,
  ) {
    if (actief.current) return;
    actief.current = true;
    const start = { x: e.clientX, y: e.clientY };
    const id = e.pointerId;
    let bewogen = false;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      if (
        Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > SLEEP_DREMPEL
      )
        bewogen = true;
      beweeg(naarWerkvlak(ev.clientX, ev.clientY), bewogen);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      actief.current = false;
      los(naarWerkvlak(ev.clientX, ev.clientY), bewogen);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  const verbind = (a: BusAdres, b: BusAdres) => {
    const fout = p.verbind(a, b);
    if (fout) p.melding(fout);
  };

  const onBusDown = (adres: BusAdres) => (e: React.PointerEvent) => {
    e.stopPropagation();
    // Tweede tik na een gekozen bus: verbinden.
    if (p.gekozen && !zelfdeBus(p.gekozen, adres)) {
      verbind(p.gekozen, adres);
      p.setGekozen(null);
      return;
    }
    p.setSelectie(null);
    volg(
      e,
      (punt, bewogen) => {
        if (!bewogen) return;
        setSleepDraad({ van: adres, naar: punt });
        const d = dichtsteBus(p.schakeling.modules, punt, raakAfstand());
        setDoel(d && !zelfdeBus(d, adres) ? d : null);
      },
      (punt, bewogen) => {
        setSleepDraad(null);
        setDoel(null);
        if (!bewogen) {
          // Tik zonder slepen: deze bus kiezen (of weer loslaten).
          p.setGekozen(zelfdeBus(p.gekozen, adres) ? null : adres);
          return;
        }
        p.setGekozen(null);
        const d = dichtsteBus(p.schakeling.modules, punt, raakAfstand());
        if (d && !zelfdeBus(d, adres)) verbind(adres, d);
      },
    );
  };

  /** Een bord sleep je aan het paneel of aan een vak erop; tikken selecteert het. */
  const onBordDown = (b: Bord) => (e: React.PointerEvent) => {
    e.stopPropagation();
    p.setGekozen(null);
    const start = naarWerkvlak(e.clientX, e.clientY);
    const begin = { x: b.x, y: b.y };
    volg(
      e,
      (punt, bewogen) => {
        if (bewogen)
          p.verplaatsBord(
            b.id,
            rond(begin.x + punt.x - start.x),
            rond(begin.y + punt.y - start.y),
          );
      },
      (_punt, bewogen) => {
        if (!bewogen) p.setSelectie({ soort: "bord", id: b.id });
      },
    );
  };

  const onVakDown = (m: ModuleInstantie) => (e: React.PointerEvent) => {
    const bord = m.bord && borden.find((b) => b.id === m.bord);
    if (bord) return onBordDown(bord)(e);
    e.stopPropagation();
    p.setGekozen(null);
    const start = naarWerkvlak(e.clientX, e.clientY);
    const begin = { x: m.x, y: m.y };
    volg(
      e,
      (punt, bewogen) => {
        if (bewogen)
          p.verplaats(
            m.id,
            rond(begin.x + punt.x - start.x),
            rond(begin.y + punt.y - start.y),
          );
      },
      (_punt, bewogen) => {
        if (!bewogen) p.setSelectie({ soort: "module", id: m.id });
      },
    );
  };

  const onKnopDown =
    (m: ModuleInstantie) => (param: string) => (e: React.PointerEvent) => {
      e.stopPropagation();
      // Een vastgezette drukschakelaar werkt als schakelaar: elke druk wisselt.
      if (param === "ingedrukt" && m.params.vast === true) {
        p.zetParam(m.id, "ingedrukt", m.params.ingedrukt !== true);
        return;
      }
      p.zetParam(m.id, param, true);
      volg(
        e,
        () => {},
        () => p.zetParam(m.id, param, false),
      );
    };

  /** Draaiknop: de knop wijst naar de aanwijzer zolang je sleept. */
  const onDraaiDown =
    (m: ModuleInstantie) => (k: KnopVorm) => (e: React.PointerEvent) => {
      e.stopPropagation();
      p.setGekozen(null);
      const midden = { x: m.x + k.cx, y: m.y + k.cy };
      const zet = (punt: Punt) =>
        p.zetParam(
          m.id,
          k.param,
          knopWaarde(k, punt.x - midden.x, punt.y - midden.y),
        );
      // Alleen tikken (zonder slepen) zet de knop niet ineens ergens anders neer.
      volg(
        e,
        (punt, bewogen) => bewogen && zet(punt),
        () => {},
      );
    };

  /** Muiswiel boven een knop: één stap per klik, omhoog is meer. */
  const onDraaiWiel =
    (m: ModuleInstantie) => (k: KnopVorm) => (e: React.WheelEvent) => {
      e.stopPropagation();
      const nu = Number(m.params[k.param] ?? k.min);
      // Een muiswiel geeft ~100 per klik; een grote beweging telt als meer stappen.
      const stappen = Math.min(
        10,
        Math.max(1, Math.round(Math.abs(e.deltaY) / 100)),
      );
      const richting = e.deltaY < 0 ? 1 : -1;
      p.zetParam(m.id, k.param, rondAf(k, nu + richting * stappen * k.stap));
    };

  const onVast = (m: ModuleInstantie) => () => {
    const vast = m.params.vast !== true;
    p.zetParam(m.id, "vast", vast);
    // Losmaken laat de knop ook los.
    if (!vast) p.zetParam(m.id, "ingedrukt", false);
  };

  // Voltmeter: kastje en pen apart verslepen; de pen springt op de dichtstbijzijnde bus.
  const vm = p.voltmeter;
  const onKastDown = (e: React.PointerEvent) => {
    if (!vm) return;
    e.stopPropagation();
    const start = naarWerkvlak(e.clientX, e.clientY);
    volg(
      e,
      (punt) =>
        p.setVoltmeter({
          ...vm,
          x: vm.x + punt.x - start.x,
          y: vm.y + punt.y - start.y,
        }),
      () => {},
    );
  };
  const onPenDown = (e: React.PointerEvent) => {
    if (!vm) return;
    e.stopPropagation();
    const start = naarWerkvlak(e.clientX, e.clientY);
    const begin = vm.pen;
    const plek = (punt: Punt) => ({
      x: begin.x + punt.x - start.x,
      y: begin.y + punt.y - start.y,
    });
    volg(
      e,
      (punt) => p.setVoltmeter({ ...vm, pen: plek(punt) }),
      (punt) => {
        const pen = plek(punt);
        const d = dichtsteBus(p.schakeling.modules, pen, raakAfstand());
        const m = d && vindModule(d.module);
        const bp = m && busPositie(m, d.bus);
        p.setVoltmeter({ ...vm, pen: bp ?? pen });
      },
    );
  };
  const gemeten = (() => {
    if (!vm) return null;
    const d = dichtsteBus(p.schakeling.modules, vm.pen, 4);
    return d ? spanning(d.module, d.bus) : null;
  })();
  /**
   * Waar het zwarte snoer van de voltmeter in zit: de aardebus van het bord
   * waarop je meet, anders de dichtstbijzijnde. Zonder bord (alleen losse
   * modules) is er geen snoer nodig.
   */
  const meterAarde = (() => {
    if (!vm) return null;
    const aardes = p.schakeling.modules.filter((m) => m.soort === "aarde");
    if (aardes.length === 0) return null;
    const d = dichtsteBus(p.schakeling.modules, vm.pen, 4);
    const bord = d && vindModule(d.module)?.bord;
    const eigen = bord && aardes.find((m) => m.bord === bord);
    const kast = { x: vm.x, y: vm.y };
    const a =
      eigen ||
      aardes.reduce((beste, m) =>
        Math.hypot(m.x - kast.x, m.y - kast.y) <
        Math.hypot(beste.x - kast.x, beste.y - kast.y)
          ? m
          : beste,
      );
    return busPositie(a, "aarde");
  })();

  /** De losse sensor (LDR, NTC) verslepen; hij blijft aan zijn snoertjes. */
  const onSensorDown = (m: ModuleInstantie) => (e: React.PointerEvent) => {
    e.stopPropagation();
    p.setGekozen(null);
    const start = naarWerkvlak(e.clientX, e.clientY);
    const begin = sensorPunt(m);
    // Apparaten die naast de sensor stonden, blijven staan waar ze staan.
    const vast = apparatenVast(p.schakeling);
    volg(
      e,
      (punt, bewogen) =>
        bewogen &&
        p.zetParams(
          {
            ...vast,
            [m.id]: {
              sx: Math.round(begin.x + punt.x - start.x - m.x),
              sy: Math.round(begin.y + punt.y - start.y - m.y),
            },
          },
          `plek:${m.id}`,
        ),
      () => {},
    );
  };
  /** Een apparaat (lamp, kachel, ventilator) verslepen. */
  const onApparaatDown = (k: Kring) => (e: React.PointerEvent) => {
    e.stopPropagation();
    p.setGekozen(null);
    const start = naarWerkvlak(e.clientX, e.clientY);
    const begin = k.punt;
    const r = k.relais;
    volg(
      e,
      (punt, bewogen) =>
        bewogen &&
        p.zetParams(
          {
            [r.id]: {
              verplaatst: true,
              ax: Math.round(begin.x + punt.x - start.x - r.x),
              ay: Math.round(begin.y + punt.y - start.y - r.y),
            },
          },
          `plek:${r.id}`,
        ),
      () => {},
    );
  };

  /** Gedeelde props voor de tekening van een module en de bedieningslaag erboven. */
  const moduleProps = (m: ModuleInstantie) => ({
    m,
    spanning: (bus: string) => spanning(m.id, bus),
    stand: Number(p.sim.toestand(m.id)?.stand ?? 0),
    relaisGesloten: p.sim.relaisGesloten(m.id),
    // Wat de sensor op zijn eigen plek meet.
    omgeving: p.sim.plek(m.id),
    geselecteerd: geselecteerdeModule?.id === m.id,
    opBord: !!m.bord,
    schaal,
    onVakDown: onVakDown(m),
    onKnopDown: onKnopDown(m),
    onVast: onVast(m),
    onTik: () => p.sim.tikOpGeluidsensor(m.id, GELUID_PIEK),
    onSensorKeuze: () => setKeuze({ moduleId: m.id, soort: "sensor" }),
    onApparaat: () => setKeuze({ moduleId: m.id, soort: "apparaat" }),
    onWaardeTik: (k: KnopVorm) => setInvoer({ moduleId: m.id, knop: k }),
    onDraaiDown: onDraaiDown(m),
    onDraaiWiel: onDraaiWiel(m),
  });

  // Waar elke draad buigt: zelf gebogen, of een boog die om de bussen heen
  // gaat. Alleen opnieuw rekenen als er iets verschuift, niet bij elke spanning.
  const { modules: alleModules, draden: alleDraden } = p.schakeling;
  const bochten = useMemo(() => {
    const bussen = alleModules.flatMap((m) =>
      vormVan(m.soort).bussen.map((b) => ({ x: m.x + b.x, y: m.y + b.y })),
    );
    const plek = (adres: BusAdres) => {
      const m = alleModules.find((x) => x.id === adres.module);
      return m && busPositie(m, adres.bus);
    };
    const uit = new Map<string, Punt>();
    for (const d of alleDraden) {
      const pa = plek(d.van),
        pb = plek(d.naar);
      if (!pa || !pb) continue;
      uit.set(
        d.id,
        d.bocht
          ? {
              x: (pa.x + pb.x) / 2 + d.bocht.x,
              y: (pa.y + pb.y) / 2 + d.bocht.y,
            }
          : kiesBocht(pa, pb, bussen),
      );
    }
    return uit;
  }, [alleModules, alleDraden]);

  const zonderAarde = useMemo(
    () => dradenZonderAarde(p.schakeling),
    [p.schakeling],
  );

  // Draden met hun beide eindpunten en hun buigpunt.
  const draden = p.schakeling.draden.flatMap((d) => {
    const a = vindModule(d.van.module),
      b = vindModule(d.naar.module);
    const pa = a && busPositie(a, d.van.bus);
    const pb = b && busPositie(b, d.naar.bus);
    const u = spanning(d.van.module, d.van.bus);
    if (!pa || !pb) return [];
    const c = bochten.get(d.id) ?? kiesBocht(pa, pb, []);
    // Naar een ander bord zonder verbonden aarde: er komt niets door.
    const zonder = zonderAarde.has(d.id);
    const aarde = isAardeDraad(p.schakeling, d);
    const analoog =
      !!a && MODULES[a.soort].analoog === true && !zonder && !aarde;
    return [
      { d, pa, pb, c, u, analoog, zonder, aarde, hoog: !zonder && isHoog(u) },
    ];
  });

  /** Tik op een draad kiest hem; slepen buigt hem, met het midden onder je vinger. */
  const onDraadDown =
    (d: { id: string }, pa: Punt, pb: Punt) => (e: React.PointerEvent) => {
      e.stopPropagation();
      p.setGekozen(null);
      p.setSelectie({ soort: "draad", id: d.id });
      volg(
        e,
        (punt, bewogen) => {
          if (!bewogen) return;
          const c = buigpuntDoor(pa, pb, punt);
          p.buigDraad(d.id, {
            x: Math.round(c.x - (pa.x + pb.x) / 2),
            y: Math.round(c.y - (pa.y + pb.y) / 2),
          });
        },
        () => {},
      );
    };

  const overgangen = useOvergangen(
    draden.map((x) => ({ id: x.d.id, hoog: x.hoog })),
  );

  const sleepVan = sleepDraad && vindModule(sleepDraad.van.module);
  const sleepStart = sleepVan && busPositie(sleepVan, sleepDraad.van.bus);

  const sel = p.selectie;
  const geselecteerdeDraad =
    sel?.soort === "draad" ? draden.find((x) => x.d.id === sel.id) : undefined;
  const geselecteerdeModule =
    sel?.soort === "module" ? vindModule(sel.id) : undefined;
  const geselecteerdBord =
    sel?.soort === "bord" ? borden.find((b) => b.id === sel.id) : undefined;

  return (
    <g>
      {borden.map((b) => (
        <BordPaneel
          key={b.id}
          b={b}
          geselecteerd={geselecteerdBord?.id === b.id}
          onDown={onBordDown(b)}
        />
      ))}

      {p.schakeling.modules.map((m) => (
        <ModuleSvg key={m.id} {...moduleProps(m)} />
      ))}

      {draden.map(({ d, pa, pb, c, hoog, zonder, aarde }) => {
        const pad = draadPad(pa, pb, c);
        const gekozen = geselecteerdeDraad?.d.id === d.id;
        // Net veranderd: de oude kleur blijft liggen tot het front van de
        // nieuwe kleur van de uitgang naar de ingang is gelopen.
        const o = overgangen[d.id];
        return (
          <g key={d.id}>
            {gekozen && (
              <path
                d={pad}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={12}
                strokeLinecap="round"
                opacity={0.6}
              />
            )}
            <path
              className="sb-draad"
              d={pad}
              stroke={
                aarde ? "var(--sb-lijn)" : draadKleur(o ? o.oudHoog : hoog)
              }
              strokeDasharray={zonder ? "10 8" : undefined}
            />
            {o && (
              <>
                <path
                  key={`f${o.nummer}`}
                  className="sb-draad sb-front"
                  d={pad}
                  pathLength={100}
                  stroke={draadKleur(hoog)}
                  style={{ animationDuration: `${OVERGANG_DUUR}ms` }}
                  pointerEvents="none"
                />
                <circle
                  key={`k${o.nummer}`}
                  r={hoog ? 8 : 6}
                  fill={draadKleur(hoog)}
                  opacity={hoog ? 0.9 : 0.7}
                  pointerEvents="none"
                >
                  <animateMotion
                    ref={(el) =>
                      (el as SVGAnimationElement | null)?.beginElement()
                    }
                    begin="indefinite"
                    dur={`${OVERGANG_DUUR}ms`}
                    path={pad}
                    fill="freeze"
                  />
                </circle>
              </>
            )}
            {/* Breed, onzichtbaar klikvlak: minstens ~28 schermpixels. */}
            <path
              d={pad}
              fill="none"
              stroke="transparent"
              strokeWidth={Math.max(16, 28 / schaal)}
              style={{ cursor: "grab" }}
              onPointerDown={onDraadDown(d, pa, pb)}
            />
          </g>
        );
      })}

      {/* Analoge signalen: de spanning als getal bij de draad. */}
      {draden
        .filter((x) => x.analoog)
        .map(({ d, pa, pb, c, u, hoog }) => {
          const m = draadMidden(pa, pb, c);
          return (
            <g
              key={`u-${d.id}`}
              transform={`translate(${m.x} ${m.y}) scale(${Math.min(1.6, 1 / schaal)})`}
              pointerEvents="none"
            >
              <rect
                x={-24}
                y={-11}
                width={48}
                height={22}
                rx={11}
                fill="var(--bg-card)"
                stroke={hoog ? "var(--sb-hoog)" : "var(--sb-laag)"}
                strokeWidth={2}
              />
              <text
                y={5}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 600,
                  fill: "var(--text-primary)",
                }}
              >
                {u.toFixed(1).replace(".", ",")} V
              </text>
            </g>
          );
        })}

      {/* Tweede stroomkring (voeding, snoeren, apparaat): boven de modules,
          zodat de snoeren zichtbaar in de zwarte bussen van het relais eindigen. */}
      <OmgevingSvg
        schakeling={p.schakeling}
        gloed={(id) => p.sim.relaisGloed(id)}
        relaisGesloten={(id) => p.sim.relaisGesloten(id)}
        schaal={schaal}
        onSensorDown={onSensorDown}
        onApparaatDown={onApparaatDown}
      />

      {/* Bediening boven de draden, zodat een draad over een vak niets blokkeert. */}
      {p.schakeling.modules.map((m) => (
        <BedieningSvg key={`b-${m.id}`} {...moduleProps(m)} />
      ))}

      {/* Kolomnamen van de waarheidstabel bij de knoppen en de uitvoer. */}
      {p.schakeling.modules
        .filter((m) => p.etiketten[m.id])
        .map((m) => {
          const tekst = p.etiketten[m.id];
          const b = 14 + tekst.length * 9;
          return (
            <g
              key={`e-${m.id}`}
              transform={`translate(${m.x + 4} ${m.y + 4})`}
              pointerEvents="none"
            >
              <rect width={b} height={22} rx={6} fill="var(--accent)" />
              <text
                x={b / 2}
                y={16}
                textAnchor="middle"
                style={{
                  fill: "#fff",
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {tekst}
              </text>
            </g>
          );
        })}

      {sleepDraad && sleepStart && (
        <path
          className="sb-draad"
          d={draadPad(sleepStart, sleepDraad.naar)}
          stroke="var(--accent)"
          strokeDasharray="10 8"
          pointerEvents="none"
        />
      )}

      {p.schakeling.modules.map((m) =>
        vormVan(m.soort).bussen.map((b) => {
          const adres = { module: m.id, bus: b.bus };
          return (
            <BusSvg
              key={`${m.id}.${b.bus}`}
              vorm={b}
              x={m.x + b.x}
              y={m.y + b.y}
              hoog={isHoog(spanning(m.id, b.bus))}
              gekozen={zelfdeBus(p.gekozen, adres)}
              doel={zelfdeBus(doel, adres)}
              schaal={schaal}
              onPointerDown={onBusDown(adres)}
            />
          );
        }),
      )}

      {geselecteerdeDraad && (
        <VerwijderKnop
          plek={draadMidden(
            geselecteerdeDraad.pa,
            geselecteerdeDraad.pb,
            geselecteerdeDraad.c,
          )}
          schaal={schaal}
          tekst="Draad weg"
          onKlik={() => {
            p.verwijderDraad(geselecteerdeDraad.d.id);
            p.setSelectie(null);
          }}
        />
      )}
      {geselecteerdeModule && (
        <VerwijderKnop
          plek={{
            x:
              geselecteerdeModule.x +
              vormVan(geselecteerdeModule.soort).breedte / 2,
            y: geselecteerdeModule.y - 4,
          }}
          schaal={schaal}
          tekst="Module weg"
          boven
          onKlik={() => {
            p.verwijder(geselecteerdeModule.id);
            p.setSelectie(null);
          }}
        />
      )}
      {geselecteerdBord && (
        <VerwijderKnop
          plek={{
            x:
              geselecteerdBord.x + bordMaat(geselecteerdBord.soort).breedte / 2,
            y: geselecteerdBord.y - 4,
          }}
          schaal={schaal}
          tekst="Bord weg"
          boven
          onKlik={() => {
            p.verwijderBord(geselecteerdBord.id);
            p.setSelectie(null);
          }}
        />
      )}
      {keuze &&
        (() => {
          const m = vindModule(keuze.moduleId);
          if (!m) return null;
          const opties =
            keuze.soort === "sensor"
              ? SENSOREN.map((x, i) => ({ waarde: i, tekst: SENSOR_KEUZE[x] }))
              : RELAIS_APPARATEN.map((x, i) => ({
                  waarde: i,
                  tekst: APPARAAT_KEUZE[x],
                }));
          const param = keuze.soort === "sensor" ? "sensor" : "apparaat";
          const nu = Number(m.params[param] ?? 0);
          return (
            <KeuzeMenu
              plek={{
                x: m.x + (keuze.soort === "sensor" ? 70 : 56),
                y: m.y + 62,
              }}
              schaal={schaal}
              titel={
                keuze.soort === "sensor"
                  ? "Wat zit er in deze bus?"
                  : "Wat hangt er aan het relais?"
              }
              opties={opties.map((o) => ({ ...o, gekozen: o.waarde === nu }))}
              kies={(w) => {
                p.zetParam(m.id, param, w);
                setKeuze(null);
              }}
            />
          );
        })()}
      {invoer &&
        (() => {
          const m = vindModule(invoer.moduleId);
          if (!m) return null;
          const k = invoer.knop;
          return (
            <InvoerVak
              key={`${m.id}-${k.param}`}
              plek={{
                x: m.x + k.vak.x + k.vak.b / 2,
                y: m.y + k.vak.y + k.vak.h,
              }}
              schaal={schaal}
              knop={k}
              waarde={Number(m.params[k.param] ?? k.min)}
              zet={(w) => {
                p.zetParam(m.id, k.param, w);
                setInvoer(null);
              }}
              annuleer={() => setInvoer(null)}
            />
          );
        })()}
      {vm && (
        <Voltmeter
          stand={vm}
          spanning={gemeten}
          aarde={meterAarde}
          schaal={schaal}
          onKastDown={onKastDown}
          onPenDown={onPenDown}
          onSluit={() => p.setVoltmeter(null)}
        />
      )}
    </g>
  );
}

const SENSOR_KEUZE: Record<(typeof SENSOREN)[number], string> = {
  draaiknop: "Draaiknop (in plaats van een sensor)",
  licht: "Lichtsensor (LDR)",
  temperatuur: "Temperatuursensor",
};
const APPARAAT_KEUZE: Record<(typeof RELAIS_APPARATEN)[number], string> = {
  lamp: "Lamp (schijnt op de lichtsensor)",
  kachel: "Kachel (warmt de temperatuursensor op)",
  ventilator: "Ventilator (koelt af)",
};

/** Vakje om een waarde te typen, op elk zoomniveau even groot. */
function InvoerVak({
  plek,
  schaal,
  knop,
  waarde,
  zet,
  annuleer,
}: {
  plek: Punt;
  schaal: number;
  knop: KnopVorm;
  waarde: number;
  zet: (w: number) => void;
  annuleer: () => void;
}) {
  const getal = (v: number) =>
    v.toFixed(knop.stap < 1 ? 1 : 0).replace(".", ",");
  /** Grenzen zonder overbodige nul: "0 tot 5 V", "1 tot 10 Hz". */
  const grens = (v: number) => String(v).replace(".", ",");
  const [tekst, setTekst] = useState(getal(waarde));
  const [fout, setFout] = useState<string | null>(null);
  const bevestig = () => {
    const w = leesGetal(tekst);
    if (w === null) return setFout("Typ een getal, bijvoorbeeld 2,5.");
    if (w < knop.min || w > knop.max)
      return setFout(
        `Kies tussen ${grens(knop.min)} en ${grens(knop.max)} ${knop.eenheid}.`,
      );
    zet(rondAf(knop, w));
  };
  /** Pijltje omhoog of omlaag: één stap verder, binnen de grenzen. */
  const stap = (richting: 1 | -1) => {
    const nu = leesGetal(tekst) ?? waarde;
    const w = Math.min(
      knop.max,
      Math.max(knop.min, rondAf(knop, nu + richting * knop.stap)),
    );
    setTekst(getal(w));
    setFout(null);
  };
  const pijl =
    "grid h-[19px] w-7 place-items-center rounded-md border border-(--border-solid) text-(--text-secondary) hover:bg-(--bg-card-hover)";
  const b = 230,
    h = fout ? 112 : 84;
  return (
    <g
      transform={`translate(${plek.x} ${plek.y}) scale(${1 / schaal}) translate(${-b / 2} 8)`}
    >
      <foreignObject x={0} y={0} width={b} height={h}>
        <div
          className="rounded-xl border border-(--border-solid) bg-card p-2 text-sm shadow-xl"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              bevestig();
            }}
          >
            <input
              autoFocus
              inputMode="decimal"
              value={tekst}
              onChange={(e) => {
                setTekst(e.target.value);
                setFout(null);
              }}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Escape") annuleer();
                else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  e.preventDefault();
                  stap(e.key === "ArrowUp" ? 1 : -1);
                }
              }}
              aria-label={`Waarde in ${knop.eenheid}`}
              className="h-10 w-16 rounded-lg border border-(--border-solid) bg-(--bg-primary) px-2 text-right font-mono text-base text-(--text-primary) outline-none focus:border-(--accent)"
            />
            <span className="flex flex-col gap-0.5">
              <button
                type="button"
                className={pijl}
                onClick={() => stap(1)}
                aria-label="Hoger"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                className={pijl}
                onClick={() => stap(-1)}
                aria-label="Lager"
              >
                <ChevronDown size={14} />
              </button>
            </span>
            <span className="text-(--text-secondary)">{knop.eenheid}</span>
            <button
              type="submit"
              className="ml-auto h-10 rounded-lg bg-(--accent) px-3 font-medium text-white"
            >
              OK
            </button>
          </form>
          <div className="mt-1 px-0.5 text-xs text-(--text-muted)">
            {grens(knop.min)} tot {grens(knop.max)} {knop.eenheid}
          </div>
          {fout && (
            <div className="mt-1 px-0.5 text-xs text-red-600">{fout}</div>
          )}
        </div>
      </foreignObject>
    </g>
  );
}

/** Klein keuzemenu op het werkvlak, op elk zoomniveau even groot. */
function KeuzeMenu({
  plek,
  schaal,
  titel,
  opties,
  kies,
}: {
  plek: Punt;
  schaal: number;
  titel: string;
  opties: { waarde: number; tekst: string; gekozen: boolean }[];
  kies: (waarde: number) => void;
}) {
  const b = 290,
    h = 40 + opties.length * 44;
  return (
    <g
      transform={`translate(${plek.x} ${plek.y}) scale(${1 / schaal}) translate(${-30} 8)`}
    >
      <foreignObject x={0} y={0} width={b} height={h}>
        <div
          className="rounded-xl border border-(--border-solid) bg-card p-1.5 text-sm shadow-xl"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 pt-1 pb-1.5 text-xs font-semibold text-(--text-muted)">
            {titel}
          </div>
          {opties.map((o) => (
            <button
              key={o.waarde}
              type="button"
              onClick={() => kies(o.waarde)}
              className={`block h-10 w-full rounded-lg px-2.5 text-left ${
                o.gekozen
                  ? "bg-(--accent) text-white"
                  : "text-(--text-primary) hover:bg-(--bg-card-hover)"
              }`}
            >
              {o.tekst}
            </button>
          ))}
        </div>
      </foreignObject>
    </g>
  );
}

/** Het paneel van een bord met de kolomkoppen. */
function BordPaneel({
  b,
  geselecteerd,
  onDown,
}: {
  b: Bord;
  geselecteerd: boolean;
  onDown: (e: React.PointerEvent) => void;
}) {
  const maat = bordMaat(b.soort);
  return (
    <g transform={`translate(${b.x} ${b.y})`}>
      <rect
        width={maat.breedte}
        height={maat.hoogte}
        rx={14}
        fill="var(--sb-paneel)"
        stroke={geselecteerd ? "var(--accent)" : "var(--sb-lijn)"}
        strokeWidth={geselecteerd ? 5 : 3}
        style={{
          cursor: "grab",
          filter: "drop-shadow(0 4px 8px var(--sb-schaduw))",
        }}
        onPointerDown={onDown}
      />
      {kolomKoppen().map((k) => (
        <text
          key={k.tekst}
          className="sb-label"
          x={k.x}
          y={38}
          textAnchor="middle"
          style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}
        >
          {k.tekst}
        </text>
      ))}
    </g>
  );
}

/** Knop op het werkvlak die op elk zoomniveau even groot blijft (digibord zonder toetsenbord). */
function VerwijderKnop({
  plek,
  schaal,
  tekst,
  boven,
  onKlik,
}: {
  plek: Punt;
  schaal: number;
  tekst: string;
  boven?: boolean;
  onKlik: () => void;
}) {
  const b = 132,
    h = 40;
  return (
    <g
      transform={`translate(${plek.x} ${plek.y}) scale(${1 / schaal}) translate(${-b / 2} ${boven ? -h - 6 : 10})`}
      style={{ cursor: "pointer" }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onKlik();
      }}
    >
      <rect
        width={b}
        height={h}
        rx={10}
        fill="var(--bg-card)"
        stroke="var(--border-solid)"
        strokeWidth={1.5}
      />
      <foreignObject x={0} y={0} width={b} height={h} pointerEvents="none">
        <div className="flex h-full items-center justify-center gap-1.5 text-sm font-medium text-(--text-secondary)">
          <Trash2 size={16} />
          {tekst}
        </div>
      </foreignObject>
    </g>
  );
}
