import { Check, X } from "lucide-react";
import { useState } from "react";

import { controleer, herken, MAX_KNOPPEN, type Waarheidstabel } from "@/sim";

interface Props {
  tabel: Waarheidstabel;
  /** Rij die nu op het bord staat (de stand van de knoppen), of -1. */
  huidigeRij: number;
  /** Zet de knoppen op het bord in de stand van deze rij. */
  kiesRij: (rij: number) => void;
  sluit: () => void;
}

type Modus = "zien" | "invullen";

/**
 * Waarheidstabel bij de schakeling: eerst zelf invullen en laten
 * controleren, of de tool hem laten invullen. 0 is laag (uit), 1 is hoog (aan), zoals in het werkboek.
 */
export function TabelPaneel({ tabel, huidigeRij, kiesRij, sluit }: Props) {
  // Eerst zelf nadenken: de ingevulde tabel pas na een klik op "Laat zien".
  const [modus, setModus] = useState<Modus>("invullen");
  // Ingevulde cellen, per tabelvorm: een andere schakeling begint leeg.
  const vorm = [...tabel.ingangen, ...tabel.uitgangen]
    .map((k) => k.id)
    .join(",");
  const [ingevuld, setIngevuld] = useState<{
    vorm: string;
    cellen: (boolean | null)[][];
  }>({
    vorm,
    cellen: [],
  });
  const [gecontroleerd, setGecontroleerd] = useState(false);
  const cellen = ingevuld.vorm === vorm ? ingevuld.cellen : [];

  const wissel = (r: number, k: number) => {
    const nieuw = tabel.rijen.map((_, i) =>
      tabel.uitgangen.map((_, j) => cellen[i]?.[j] ?? null),
    );
    const v = nieuw[r][k];
    nieuw[r][k] = v === null ? false : v === false ? true : null;
    setIngevuld({ vorm, cellen: nieuw });
    setGecontroleerd(false);
  };

  const uitslag = gecontroleerd ? controleer(tabel, cellen) : null;
  const leeg = tabel.ingangen.length === 0 || tabel.uitgangen.length === 0;

  const tab = (m: Modus, tekst: string) => (
    <button
      type="button"
      onClick={() => {
        setModus(m);
        setGecontroleerd(false);
      }}
      aria-pressed={modus === m}
      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-medium ${
        modus === m
          ? "bg-(--accent) text-white"
          : "text-(--text-secondary) hover:bg-(--bg-card-hover)"
      }`}
    >
      {tekst}
    </button>
  );

  return (
    <div className="absolute top-3 right-3 flex max-h-[calc(100%-9rem)] w-[min(340px,calc(100vw-1.5rem))] flex-col rounded-xl border border-(--border-solid) bg-card text-sm text-(--text-primary) shadow-lg">
      <div className="flex items-center border-b border-(--border-solid) px-3 py-2">
        <span className="font-semibold">Waarheidstabel</span>
        <button
          type="button"
          onClick={sluit}
          aria-label="Waarheidstabel sluiten"
          className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-(--text-secondary) hover:bg-(--bg-card-hover)"
        >
          <X size={16} />
        </button>
      </div>
      <div className="overflow-auto p-3">
        {leeg ? (
          <p className="text-(--text-secondary)">
            Sluit een of meer drukschakelaars aan en verbind de schakeling met
            een led, de zoemer of het relais. Die komen dan als kolommen in de
            tabel.
          </p>
        ) : (
          <>
            <div className="mb-3 flex gap-1 rounded-xl bg-(--bg-secondary) p-1">
              {tab("invullen", "Zelf invullen")}
              {tab("zien", "Laat zien")}
            </div>
            <table className="w-full border-collapse text-center font-mono">
              <thead>
                <tr className="text-xs text-(--text-muted)">
                  {tabel.ingangen.map((k) => (
                    <th key={k.id} className="px-1 pb-1 font-semibold">
                      {k.naam}
                    </th>
                  ))}
                  {tabel.uitgangen.map((k, i) => (
                    <th
                      key={k.id}
                      className={`px-1 pb-1 font-semibold ${i === 0 ? "border-l-2 border-(--border-solid)" : ""}`}
                    >
                      {k.naam}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabel.rijen.map((rij, r) => (
                  <tr
                    key={r}
                    onClick={() => kiesRij(r)}
                    title="Zet de knoppen op het bord in deze stand"
                    className={`cursor-pointer border-t border-(--border-solid) ${
                      r === huidigeRij
                        ? "bg-(--accent-glow)"
                        : "hover:bg-(--bg-card-hover)"
                    }`}
                  >
                    {rij.in.map((v, i) => (
                      <td key={i} className="h-9 px-1">
                        {v ? 1 : 0}
                      </td>
                    ))}
                    {rij.uit.map((v, k) => {
                      const eerste =
                        k === 0 ? "border-l-2 border-(--border-solid)" : "";
                      if (modus === "zien")
                        return (
                          <td
                            key={k}
                            className={`h-9 px-1 font-semibold ${eerste} ${v ? "text-(--accent-amber)" : ""}`}
                          >
                            {v ? 1 : 0}
                          </td>
                        );
                      const waarde = cellen[r]?.[k] ?? null;
                      const oordeel = uitslag?.cellen[r][k];
                      return (
                        <td key={k} className={`h-9 px-1 ${eerste}`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              wissel(r, k);
                            }}
                            aria-label={`Rij ${r + 1}, ${tabel.uitgangen[k].naam}: ${waarde === null ? "leeg" : waarde ? "1" : "0"}`}
                            className={`h-8 w-10 rounded-md border font-semibold ${
                              oordeel === "goed"
                                ? "border-green-600 bg-green-600/15 text-green-700 dark:text-green-400"
                                : oordeel === "fout"
                                  ? "border-red-600 bg-red-600/15 text-red-700 dark:text-red-400"
                                  : "border-(--border-solid) hover:bg-(--bg-card-hover)"
                            }`}
                          >
                            {waarde === null ? "?" : waarde ? 1 : 0}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {modus === "invullen" && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGecontroleerd(true)}
                  className="flex h-10 items-center gap-1.5 rounded-lg bg-(--accent) px-3 font-medium text-white"
                >
                  <Check size={16} />
                  Controleer
                </button>
                {uitslag && (
                  <span className="text-(--text-secondary)">
                    {uitslag.goed} van {uitslag.totaal} goed
                    {uitslag.goed === uitslag.totaal ? ", helemaal goed!" : ""}
                  </span>
                )}
              </div>
            )}
            {/* Herkende functie per uitvoer; bij zelf invullen pas als alles goed is. */}
            {(modus === "zien" ||
              (uitslag !== null && uitslag.goed === uitslag.totaal)) &&
              tabel.uitgangen.map((u, k) => {
                const h = herken(tabel, k);
                if (!h) return null;
                return (
                  <div
                    key={u.id}
                    className="mt-3 rounded-lg border border-(--border-solid) bg-(--bg-secondary) p-2.5"
                  >
                    <div className="font-semibold">
                      {tabel.uitgangen.length > 1 && (
                        <span className="text-(--text-muted)">{u.naam}: </span>
                      )}
                      {h.naam}
                    </div>
                    <div className="text-xs text-(--text-secondary)">
                      {h.uitleg}
                    </div>
                  </div>
                );
              })}
            <p className="mt-3 text-xs text-(--text-muted)">
              0 is laag (uit), 1 is hoog (aan). Tik op een rij om de knoppen op
              het bord zo te zetten.
              {modus === "invullen" &&
                " Tik op een vakje voor 0, nog eens voor 1."}
            </p>
            {tabel.metGeheugen && (
              <p className="mt-2 rounded-lg bg-(--bg-secondary) p-2 text-xs text-(--text-secondary)">
                Let op: er zit een geheugencel, teller of pulsgenerator in de
                schakeling. Wat de uitvoer doet hangt dan ook af van wat er
                eerder gebeurd is; deze tabel laat alleen zien wat er gebeurt
                vanuit de beginstand.
              </p>
            )}
            {tabel.teVeelKnoppen && (
              <p className="mt-2 text-xs text-(--text-muted)">
                Alleen de eerste {MAX_KNOPPEN} knoppen staan in de tabel.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
