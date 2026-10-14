import { Fan, Flame, Lightbulb, Sun, Thermometer, X } from "lucide-react";

import { LICHT_MAX, type OmgevingInstelling } from "@/sim";

/** Hangt dit apparaat aan een relais, en staat het aan? */
export type ApparaatStand = "aan" | "uit" | null;

interface Props {
  instelling: OmgevingInstelling;
  gemeten: { licht: number; temperatuur: number; lamplicht: number };
  apparaten: {
    lamp: ApparaatStand;
    kachel: ApparaatStand;
    ventilator: ApparaatStand;
  };
  /** Zit er een licht- of temperatuursensor in een sensorbus? */
  lichtsensor: boolean;
  temperatuursensor: boolean;
  zet: (nieuw: Partial<OmgevingInstelling>) => void;
  sluit: () => void;
}

const nl = (v: number, dec = 1) => v.toFixed(dec).replace(".", ",");

function Apparaat({
  icoon,
  naam,
  stand,
}: {
  icoon: React.ReactNode;
  naam: string;
  stand: ApparaatStand;
}) {
  return (
    <div className="mt-2 flex items-center gap-2 text-(--text-secondary)">
      {icoon}
      {naam} aan het relais
      <span
        className={`ml-auto rounded-md px-2 py-0.5 text-xs font-semibold ${
          stand === "aan"
            ? "bg-(--accent-amber) text-white"
            : "bg-(--bg-secondary) text-(--text-muted)"
        }`}
      >
        {stand}
      </span>
    </div>
  );
}

/**
 * De wereld rond de sensoren: hoeveel daglicht er is en hoe warm het is. Een
 * lamp, kachel of ventilator stuur je met het relais, niet hier: dat is juist
 * de bedoeling van de schakeling. Het paneel toont alleen wat je gebruikt.
 */
export function OmgevingPaneel({
  instelling,
  gemeten,
  apparaten,
  lichtsensor,
  temperatuursensor,
  zet,
  sluit,
}: Props) {
  const toonLicht = lichtsensor || apparaten.lamp !== null;
  const toonTemperatuur =
    temperatuursensor ||
    apparaten.kachel !== null ||
    apparaten.ventilator !== null;
  return (
    <div className="absolute bottom-3 left-3 max-h-[calc(100%-5rem)] w-[min(320px,calc(100vw-6rem))] overflow-auto rounded-xl border border-(--border-solid) bg-card p-3 text-sm text-(--text-primary) shadow-lg">
      <div className="mb-2 flex items-center">
        <span className="text-xs font-semibold tracking-wide text-(--text-muted) uppercase">
          Omgeving
        </span>
        <button
          type="button"
          onClick={sluit}
          aria-label="Omgeving sluiten"
          className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-(--text-secondary) hover:bg-(--bg-card-hover)"
        >
          <X size={15} />
        </button>
      </div>

      {!toonLicht && !toonTemperatuur && (
        <p className="rounded-lg bg-(--bg-secondary) p-2 text-xs text-(--text-secondary)">
          Er zit nog geen echte sensor in het bord. Tik in een vak <b>sensor</b>{" "}
          (linksboven op het bord) op het keuzeknopje en kies een lichtsensor of
          temperatuursensor. Hier stel je daarna het daglicht of de
          omgevingstemperatuur in.
        </p>
      )}

      {toonLicht && (
        <section>
          <label className="block">
            <span className="flex items-center gap-2">
              <Sun size={16} className="text-(--accent-amber)" />
              Daglicht
              <span className="ml-auto font-mono">{instelling.licht} lux</span>
            </span>
            <input
              type="range"
              min={0}
              max={LICHT_MAX}
              step={10}
              value={instelling.licht}
              onChange={(e) => zet({ licht: Number(e.target.value) })}
              className="mt-1 h-8 w-full accent-(--accent)"
              aria-label="Daglicht in lux"
            />
          </label>
          {apparaten.lamp !== null && (
            <Apparaat
              icoon={<Lightbulb size={16} />}
              naam="Lamp"
              stand={apparaten.lamp}
            />
          )}
          {gemeten.lamplicht > 5 && lichtsensor && (
            <span className="mt-1 block text-xs text-(--text-muted)">
              De lamp schijnt op de lichtsensor: +{" "}
              {Math.round(gemeten.lamplicht)} lux.
            </span>
          )}
          {!lichtsensor && (
            <span className="mt-1 block text-xs text-(--text-muted)">
              Er is nog geen lichtsensor gekozen: de lamp schijnt nu op niets.
            </span>
          )}
        </section>
      )}

      {toonTemperatuur && (
        <section
          className={
            toonLicht ? "mt-3 border-t border-(--border-solid) pt-3" : ""
          }
        >
          <div className="flex items-center gap-2">
            <Thermometer size={16} className="text-(--accent)" />
            Temperatuur
            <span className="ml-auto font-mono">
              {nl(gemeten.temperatuur)} °C
            </span>
          </div>
          {apparaten.kachel !== null && (
            <Apparaat
              icoon={<Flame size={16} />}
              naam="Kachel"
              stand={apparaten.kachel}
            />
          )}
          {apparaten.ventilator !== null && (
            <Apparaat
              icoon={<Fan size={16} />}
              naam="Ventilator"
              stand={apparaten.ventilator}
            />
          )}
          <label className="mt-3 block">
            <span className="flex items-center gap-2 text-(--text-secondary)">
              Omgevingstemperatuur
              <span className="ml-auto font-mono">{instelling.buiten} °C</span>
            </span>
            <input
              type="range"
              min={-10}
              max={35}
              step={1}
              value={instelling.buiten}
              onChange={(e) => zet({ buiten: Number(e.target.value) })}
              className="mt-1 h-8 w-full accent-(--accent)"
              aria-label="Omgevingstemperatuur in graden Celsius"
            />
            <span className="block text-xs text-(--text-muted)">
              Zonder kachel zakt de temperatuur hier langzaam naartoe.
            </span>
          </label>
          {!temperatuursensor && (
            <span className="mt-1 block text-xs text-(--text-muted)">
              Er is nog geen temperatuursensor gekozen.
            </span>
          )}
        </section>
      )}
    </div>
  );
}
