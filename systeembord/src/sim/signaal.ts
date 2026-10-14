/** Spanningen op het systeembord, in volt. */
export const LAAG = 0;
export const HOOG = 5;

/** Een ingang telt als hoog vanaf deze spanning (ook bij een analoog signaal). */
export const DREMPEL = 2.5;

export const isHoog = (u: number): boolean => u >= DREMPEL;

export const digitaal = (hoog: boolean): number => (hoog ? HOOG : LAAG);

export const begrens = (u: number, min = LAAG, max = HOOG): number =>
  Math.min(max, Math.max(min, u));
