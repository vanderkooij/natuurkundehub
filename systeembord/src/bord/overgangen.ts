import { useEffect, useRef, useState } from "react";

/** Hoe lang het lopen van een signaal over een draad duurt, in ms. */
export const OVERGANG_DUUR = 260;

export interface Overgang {
  /** Loopt op bij elke nieuwe overgang, zodat de animatie opnieuw begint. */
  nummer: number;
  /** De kleur die de draad had: die blijft staan tot het front erover is. */
  oudHoog: boolean;
  /** Tijdstip (performance.now) van de verandering. */
  start: number;
}

/**
 * Welke draden van stand veranderd zijn sinds de vorige keer. Nieuwe draden
 * tellen niet mee: een draad die je net trekt hoeft niet te "lopen".
 */
export function veranderd(
  vorige: ReadonlyMap<string, boolean>,
  nu: { id: string; hoog: boolean }[],
): { id: string; oudHoog: boolean }[] {
  const uit: { id: string; oudHoog: boolean }[] = [];
  for (const d of nu) {
    const oud = vorige.get(d.id);
    if (oud !== undefined && oud !== d.hoog)
      uit.push({ id: d.id, oudHoog: oud });
  }
  return uit;
}

const minderBeweging = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Houdt bij welke draden net van laag naar hoog (of andersom) zijn gegaan,
 * zodat de tekening het signaal over de draad kan laten lopen.
 */
export function useOvergangen(draden: { id: string; hoog: boolean }[]) {
  const vorige = useRef(new Map<string, boolean>());
  const teller = useRef(0);
  const [overgangen, setOvergangen] = useState<Record<string, Overgang>>({});
  const sleutel = draden.map((d) => `${d.id}:${d.hoog ? 1 : 0}`).join(",");

  useEffect(() => {
    const nu = draden;
    const wissels = veranderd(vorige.current, nu);
    vorige.current = new Map(nu.map((d) => [d.id, d.hoog]));
    if (wissels.length === 0 || minderBeweging()) return;
    const start = performance.now();
    setOvergangen((o) => {
      const n = { ...o };
      for (const w of wissels)
        n[w.id] = { nummer: ++teller.current, oudHoog: w.oudHoog, start };
      return n;
    });
    // Opruimen als het front aan de overkant is.
    const t = window.setTimeout(() => {
      setOvergangen((o) => {
        const grens = performance.now() - OVERGANG_DUUR;
        const n: Record<string, Overgang> = {};
        for (const [id, v] of Object.entries(o)) if (v.start > grens) n[id] = v;
        return n;
      });
    }, OVERGANG_DUUR + 30);
    return () => window.clearTimeout(t);
    // `sleutel` vat de stand van alle draden samen; `draden` zelf is elke keer nieuw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleutel]);

  return overgangen;
}
