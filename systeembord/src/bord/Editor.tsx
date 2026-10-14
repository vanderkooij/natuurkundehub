import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListChecks } from "lucide-react";
import { createPortal } from "react-dom";

import {
  dradenZonderAarde,
  isHoog,
  maakWaarheidstabel,
  RELAIS_APPARATEN,
  SENSOREN,
  standaardOmgeving,
  type BordSoort,
  type BusAdres,
  type ModuleSoort,
  type Schakeling,
} from "@/sim";
import { BESTAND_EXTENSIE, naarTekst, vanTekst } from "@/bestand/formaat";
import { vanJeroen } from "@/bestand/jeroen";
import { linkdeelUitHash, maakLink, vanLinkdeel } from "@/bestand/link";
import {
  DOCENT_PARAMETER,
  VOORBEELDEN,
  type Voorbeeld,
} from "@/bestand/voorbeelden";
import { useZoemer } from "@/geluid/useZoemer";
import { nieuwId, useSchakeling } from "@/state/useSchakeling";
import { Werkvlak } from "@/werkvlak/Werkvlak";

import { BordLaag, type Selectie } from "./BordLaag";
import { EisenKaart } from "./EisenKaart";
import { maakBord, omhulling, vrijePlek } from "./borden";
import { vormVan } from "./geometrie";
import { METER, type VoltmeterStand } from "./geometrie";
import { OmgevingPaneel } from "./OmgevingPaneel";
import { omhullingMetOpstelling } from "./opstelling";
import { TabelPaneel } from "./TabelPaneel";
import { Werkbalk, type Start } from "./Werkbalk";

const START_SLEUTEL = "sb-start";
const GELUID_SLEUTEL = "sb-geluid";
const BEWAAR_SLEUTEL = "sb-schakeling";

/** Welk bord er bij het openen ligt: wat je de vorige keer koos, anders het bord met twee comparators. */
function leesStart(): Start {
  try {
    const s = localStorage.getItem(START_SLEUTEL);
    if (s === "transistor" || s === "leeg" || s === "comparators") return s;
  } catch {
    /* localStorage kan geblokkeerd zijn */
  }
  return "comparators";
}

function bewaarStart(s: Start) {
  try {
    localStorage.setItem(START_SLEUTEL, s);
  } catch {
    /* geen probleem: dan opent volgende keer het standaardbord */
  }
}

/** De laatste schakeling van deze browser, zodat je na herladen verder kunt. */
function leesBewaard(): Schakeling | null {
  try {
    const t = localStorage.getItem(BEWAAR_SLEUTEL);
    if (!t) return null;
    const r = vanTekst(t);
    return r.ok ? r.schakeling : null;
  } catch {
    return null;
  }
}

function beginMet(start: Start): Schakeling {
  if (start === "leeg") return { modules: [], draden: [], borden: [] };
  const { bord, modules } = maakBord(start, nieuwId("bord"));
  return { modules, draden: [], borden: [bord] };
}

export function Editor() {
  const s = useSchakeling(() => leesBewaard() ?? beginMet(leesStart()));
  const [selectie, setSelectie] = useState<Selectie>(null);
  /** Het geladen docentvoorbeeld, voor het kaartje met eisen en flowchart. */
  const [eisenVan, setEisenVan] = useState<Voorbeeld | null>(null);
  /** Weggeklikt kaartje: alleen nog een knopje om het terug te halen. */
  const [eisenOpen, setEisenOpen] = useState(true);
  const [gekozen, setGekozen] = useState<BusAdres | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [passendSleutel, setPassendSleutel] = useState(0);
  const meldingTimer = useRef(0);
  const midden = useRef(() => ({ x: 0, y: 0 }));

  const toonMelding = useCallback((tekst: string) => {
    setMelding(tekst);
    window.clearTimeout(meldingTimer.current);
    meldingTimer.current = window.setTimeout(() => setMelding(null), 3500);
  }, []);

  const [voltmeter, setVoltmeter] = useState<VoltmeterStand | null>(null);
  const wisselVoltmeter = () => {
    if (voltmeter) return setVoltmeter(null);
    const m = midden.current();
    setVoltmeter({
      x: m.x - METER.breedte / 2,
      y: m.y - METER.hoogte,
      pen: { x: m.x + 40, y: m.y + 120 },
    });
  };

  // Zoemer: klinkt zolang een zoemer hoog krijgt. Geluid uitzetten wordt onthouden.
  const [geluid, setGeluid] = useState(() => {
    try {
      return localStorage.getItem(GELUID_SLEUTEL) !== "uit";
    } catch {
      return true;
    }
  });
  const wisselGeluid = () =>
    setGeluid((g) => {
      try {
        localStorage.setItem(GELUID_SLEUTEL, g ? "uit" : "aan");
      } catch {
        /* dan alleen voor nu */
      }
      return !g;
    });
  const zoemt = s.schakeling.modules.some(
    (m) => m.soort === "zoemer" && isHoog(s.sim.spanning(m.id, "in")),
  );
  useZoemer(zoemt, geluid);

  const sensorGebruikt = (soort: (typeof SENSOREN)[number]) =>
    s.schakeling.modules.some(
      (m) =>
        m.soort === "sensor" &&
        SENSOREN[Number(m.params.sensor ?? 0)] === soort,
    );
  const echteSensoren = {
    licht: sensorGebruikt("licht"),
    temperatuur: sensorGebruikt("temperatuur"),
  };

  /** Hangt dit apparaat aan een relais, en staat dat relais aan? */
  const apparaatStand = (soort: (typeof RELAIS_APPARATEN)[number]) => {
    const relais = s.schakeling.modules.filter(
      (m) =>
        m.soort === "relais" &&
        RELAIS_APPARATEN[Number(m.params.apparaat ?? 0)] === soort &&
        s.schakeling.draden.some((d) => d.naar.module === m.id),
    );
    if (relais.length === 0) return null;
    return relais.some((m) => s.sim.relaisGesloten(m.id)) ? "aan" : "uit";
  };

  // Het paneel Omgeving gaat vanzelf open zodra er een echte sensor in een bus komt.
  const [omgevingOpen, setOmgevingOpen] = useState(
    () => echteSensoren.licht || echteSensoren.temperatuur,
  );
  const hadSensor = useRef(echteSensoren.licht || echteSensoren.temperatuur);
  const heeftSensor = echteSensoren.licht || echteSensoren.temperatuur;
  useEffect(() => {
    if (heeftSensor && !hadSensor.current) setOmgevingOpen(true);
    hadSensor.current = heeftSensor;
  }, [heeftSensor]);

  // Waarheidstabel: alleen uitrekenen zolang het paneel open is.
  const [tabelOpen, setTabelOpen] = useState(false);
  const tabel = useMemo(
    () => (tabelOpen ? maakWaarheidstabel(s.schakeling) : null),
    [tabelOpen, s.schakeling],
  );
  const etiketten = useMemo(() => {
    if (!tabel) return {};
    const e: Record<string, string> = {};
    for (const k of [...tabel.ingangen, ...tabel.uitgangen]) e[k.id] = k.naam;
    return e;
  }, [tabel]);
  const huidigeRij = tabel
    ? tabel.rijen.findIndex((rij) =>
        rij.in.every(
          (v, i) =>
            (s.schakeling.modules.find((m) => m.id === tabel.ingangen[i].id)
              ?.params.ingedrukt ===
              true) ===
            v,
        ),
      )
    : -1;
  const kiesRij = (r: number) => {
    if (!tabel) return;
    // Vastzetten, anders springt een knop meteen weer terug.
    tabel.ingangen.forEach((k, i) => {
      s.zetParam(k.id, "vast", true);
      s.zetParam(k.id, "ingedrukt", tabel.rijen[r].in[i]);
    });
  };

  // Een draad tussen twee borden waarvan de aardes niet verbonden zijn.
  const zonderAarde = useMemo(
    () => dradenZonderAarde(s.schakeling).size > 0,
    [s.schakeling],
  );
  const inhoud = useMemo(
    () => omhullingMetOpstelling(s.schakeling),
    [s.schakeling],
  );

  const {
    vervang,
    voegBordToe,
    voegModuleToe,
    verwijderDraad,
    verwijder,
    verwijderBord: haalBordWeg,
    maakOngedaan,
    doeOpnieuw,
  } = s;

  /** Een bord met draden eraan weghalen kan niet ongedaan worden: eerst vragen. */
  const schakelingRef = useRef(s.schakeling);
  schakelingRef.current = s.schakeling;
  const verwijderBord = useCallback(
    (id: string) => {
      const sch = schakelingRef.current;
      const opBord = new Set(
        sch.modules.filter((m) => m.bord === id).map((m) => m.id),
      );
      const metDraden = sch.draden.some(
        (d) => opBord.has(d.van.module) || opBord.has(d.naar.module),
      );
      if (
        metDraden &&
        !window.confirm("Dit bord en alle draden eraan gaan weg. Doorgaan?")
      )
        return;
      haalBordWeg(id);
    },
    [haalBordWeg],
  );

  // Automatisch bewaren in deze browser, kort na elke wijziging.
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(BEWAAR_SLEUTEL, naarTekst(s.schakeling));
      } catch {
        /* vol of geblokkeerd: dan alleen niet bewaard */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [s.schakeling]);

  /** Vervangt de hele schakeling (bestand, link, voorbeeld) en zet hem in beeld. */
  const laad = (nieuweSchakeling: Schakeling, tekst: string) => {
    vervang(nieuweSchakeling);
    setEisenVan(null);
    setSelectie(null);
    setGekozen(null);
    setVoltmeter(null);
    setPassendSleutel((k) => k + 1);
    toonMelding(tekst);
  };
  const magVervangen = () =>
    s.schakeling.draden.length === 0 ||
    window.confirm("Je huidige schakeling gaat weg. Doorgaan?");

  // Geopend met een link (#s=…): die schakeling laden, en de link uit de adresbalk
  // halen zodat herladen daarna gewoon verdergaat met wat je zelf bouwt.
  const linkGeladen = useRef(false);
  useEffect(() => {
    if (linkGeladen.current) return;
    linkGeladen.current = true;
    const deel = linkdeelUitHash(location.hash);
    if (!deel) return;
    void vanLinkdeel(deel).then((r) => {
      history.replaceState(null, "", location.pathname + location.search);
      if (r.ok) laad(r.schakeling, "Schakeling uit de link geopend.");
      else toonMelding(r.fout);
    });
    // Alleen bij het openen van de pagina.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const docent = useMemo(
    () => new URLSearchParams(location.search).has(DOCENT_PARAMETER),
    [],
  );

  const opslaan = () => {
    const blob = new Blob([naarTekst(s.schakeling)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `schakeling${BESTAND_EXTENSIE}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const bestandKiezer = useRef<HTMLInputElement>(null);
  const bestandGekozen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0];
    e.target.value = "";
    if (!bestand || !magVervangen()) return;
    const tekst = await bestand.text();
    if (tekst.trimStart().startsWith("<")) {
      const r = vanJeroen(tekst);
      if (!r.ok) return toonMelding(r.fout);
      laad(
        r.schakeling,
        r.overgeslagen.length
          ? `Geopend. Niet overgenomen (zit niet op dit bord): ${r.overgeslagen.join(", ")}.`
          : "Bestand van het online systeembord geopend.",
      );
    } else {
      const r = vanTekst(tekst);
      if (!r.ok) return toonMelding(r.fout);
      laad(r.schakeling, `${bestand.name} geopend.`);
    }
  };

  const deelLink = async () => {
    const link = await maakLink(s.schakeling);
    try {
      await navigator.clipboard.writeText(link);
      toonMelding("Link gekopieerd. Plak hem waar je wilt delen.");
    } catch {
      window.prompt("Kopieer deze link:", link);
    }
  };

  const nieuw = (start: Start) => {
    if (
      s.schakeling.draden.length > 0 &&
      !window.confirm("Je huidige schakeling gaat weg. Opnieuw beginnen?")
    )
      return;
    bewaarStart(start);
    vervang(beginMet(start));
    setEisenVan(null);
    setSelectie(null);
    setGekozen(null);
    setPassendSleutel((k) => k + 1);
  };

  const bordErbij = (soort: BordSoort) => {
    // Rechts naast alles wat er al ligt.
    const r = omhulling(s.schakeling);
    const leeg =
      s.schakeling.modules.length === 0 &&
      (s.schakeling.borden ?? []).length === 0;
    voegBordToe(soort, leeg ? 0 : r.x + r.breedte + 60, leeg ? 0 : r.y);
    setPassendSleutel((k) => k + 1);
  };

  const moduleErbij = (soort: ModuleSoort) => {
    // Midden in beeld, of zo dichtbij mogelijk op een vrije plek.
    const plek = vrijePlek(s.schakeling, vormVan(soort), midden.current());
    const id = voegModuleToe(soort, plek.x, plek.y);
    setSelectie({ soort: "module", id });
  };

  // Delete of Backspace verwijdert de selectie, Escape heft hem op.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      // Ongedaan maken: Ctrl+Z; opnieuw: Ctrl+Y of Ctrl+Shift+Z (Cmd op een Mac).
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "z" && !e.shiftKey) {
          e.preventDefault();
          if (maakOngedaan()) setSelectie(null);
          return;
        }
        if (k === "y" || (k === "z" && e.shiftKey)) {
          e.preventDefault();
          if (doeOpnieuw()) setSelectie(null);
          return;
        }
      }
      if (e.key === "Escape") {
        setSelectie(null);
        setGekozen(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectie) {
        e.preventDefault();
        if (selectie.soort === "draad") verwijderDraad(selectie.id);
        else if (selectie.soort === "bord") verwijderBord(selectie.id);
        else verwijder(selectie.id);
        setSelectie(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectie,
    verwijderDraad,
    verwijder,
    verwijderBord,
    maakOngedaan,
    doeOpnieuw,
  ]);

  // De werkbalk staat in de header (zie Header), zodat het bord de hele hoogte krijgt.
  const [werkbalkPlek, setWerkbalkPlek] = useState<HTMLElement | null>(null);
  useEffect(() => setWerkbalkPlek(document.getElementById("sb-werkbalk")), []);

  return (
    <>
      {werkbalkPlek &&
        createPortal(
          <Werkbalk
            tabel={tabelOpen}
            wisselTabel={() => setTabelOpen((o) => !o)}
            omgeving={omgevingOpen}
            wisselOmgeving={() => setOmgevingOpen((o) => !o)}
            ongedaan={
              s.kanOngedaan ? () => (maakOngedaan(), setSelectie(null)) : null
            }
            opnieuw={
              s.kanOpnieuw ? () => (doeOpnieuw(), setSelectie(null)) : null
            }
            opslaan={opslaan}
            openen={() => bestandKiezer.current?.click()}
            deelLink={() => void deelLink()}
            voorbeelden={docent ? VOORBEELDEN : null}
            laadVoorbeeld={(v) => {
              if (!magVervangen()) return;
              laad(v.maak(), `Voorbeeld: ${v.naam}.`);
              setEisenVan(v);
              setEisenOpen(true);
            }}
            nieuw={nieuw}
            bordErbij={bordErbij}
            moduleErbij={moduleErbij}
            voltmeter={voltmeter !== null}
            wisselVoltmeter={wisselVoltmeter}
            geluid={geluid}
            wisselGeluid={wisselGeluid}
          />,
          werkbalkPlek,
        )}
      <Werkvlak
        inhoud={inhoud}
        passendSleutel={passendSleutel}
        middenRef={midden}
        onTafel={() => {
          setSelectie(null);
          setGekozen(null);
        }}
        bovenop={
          <>
            {eisenVan &&
              (eisenOpen ? (
                <EisenKaart
                  voorbeeld={eisenVan}
                  sluit={() => setEisenOpen(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEisenOpen(true)}
                  className="absolute top-3 left-3 flex h-9 items-center gap-1.5 rounded-lg border border-(--border-solid) bg-card px-3 text-sm font-medium text-(--text-primary) shadow-md hover:bg-(--bg-card-hover)"
                >
                  <ListChecks size={16} />
                  Eisen en flowchart
                </button>
              ))}
            {omgevingOpen && (
              <OmgevingPaneel
                instelling={s.schakeling.omgeving ?? standaardOmgeving()}
                gemeten={s.sim.omgeving()}
                apparaten={{
                  lamp: apparaatStand("lamp"),
                  kachel: apparaatStand("kachel"),
                  ventilator: apparaatStand("ventilator"),
                }}
                lichtsensor={echteSensoren.licht}
                temperatuursensor={echteSensoren.temperatuur}
                zet={s.zetOmgeving}
                sluit={() => setOmgevingOpen(false)}
              />
            )}
            {tabel && (
              <TabelPaneel
                tabel={tabel}
                huidigeRij={huidigeRij}
                kiesRij={kiesRij}
                sluit={() => setTabelOpen(false)}
              />
            )}
            <input
              ref={bestandKiezer}
              type="file"
              accept=".json,.xml,application/json,text/xml"
              className="hidden"
              onChange={(e) => void bestandGekozen(e)}
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-20">
              {melding ? (
                <div
                  role="status"
                  className="rounded-xl border border-(--border-solid) bg-card px-4 py-2 text-sm text-(--text-primary) shadow-md"
                >
                  {melding}
                </div>
              ) : gekozen ? (
                <div className="rounded-xl border border-(--border-solid) bg-card px-4 py-2 text-sm text-(--text-secondary) shadow-md">
                  Tik op een tweede bus om de draad te maken.
                </div>
              ) : zonderAarde ? (
                <div
                  role="status"
                  className="rounded-xl border border-amber-400 bg-card px-4 py-2 text-sm text-(--text-primary) shadow-md"
                >
                  Een draad gaat naar een ander bord, maar de aardes zijn niet
                  verbonden. Verbind de zwarte aardebussen (onder het relais)
                  met elkaar.
                </div>
              ) : null}
            </div>
          </>
        }
      >
        <BordLaag
          schakeling={s.schakeling}
          sim={s.sim}
          selectie={selectie}
          setSelectie={setSelectie}
          gekozen={gekozen}
          setGekozen={setGekozen}
          verbind={s.verbind}
          verplaats={s.verplaats}
          verplaatsBord={s.verplaatsBord}
          zetParam={s.zetParam}
          zetParams={s.zetParams}
          verwijderDraad={verwijderDraad}
          buigDraad={s.buigDraad}
          verwijder={verwijder}
          verwijderBord={verwijderBord}
          melding={toonMelding}
          voltmeter={voltmeter}
          setVoltmeter={setVoltmeter}
          etiketten={etiketten}
        />
      </Werkvlak>
    </>
  );
}
