import type { Schakeling } from "@/sim";

/**
 * Ongedaan maken en opnieuw doen. Het verleden bewaart hele schakelingen; dat
 * is eenvoudig en klein genoeg (een bord is een paar kilobyte).
 */
export interface Geschiedenis {
  verleden: Schakeling[];
  toekomst: Schakeling[];
  /** Wijzigingen met dezelfde sleutel kort na elkaar tellen als één stap (een knop rondslepen). */
  laatsteSleutel: string | null;
  laatsteTijd: number;
}

export const MAX_STAPPEN = 100;
/** Binnen deze tijd (ms) worden wijzigingen met dezelfde sleutel samengevoegd. */
export const SAMENVOEG_MS = 800;

export const legeGeschiedenis = (): Geschiedenis => ({
  verleden: [],
  toekomst: [],
  laatsteSleutel: null,
  laatsteTijd: 0,
});

/** Onthoud de stand van vóór een wijziging. */
export function onthoud(
  g: Geschiedenis,
  vorige: Schakeling,
  sleutel: string | null,
  nu: number,
): Geschiedenis {
  if (
    sleutel !== null &&
    sleutel === g.laatsteSleutel &&
    nu - g.laatsteTijd < SAMENVOEG_MS
  )
    return { ...g, laatsteTijd: nu };
  return {
    verleden: [...g.verleden, vorige].slice(-MAX_STAPPEN),
    toekomst: [],
    laatsteSleutel: sleutel,
    laatsteTijd: nu,
  };
}

export function ongedaan(
  g: Geschiedenis,
  huidig: Schakeling,
): { g: Geschiedenis; schakeling: Schakeling } | null {
  const vorige = g.verleden.at(-1);
  if (!vorige) return null;
  return {
    g: {
      verleden: g.verleden.slice(0, -1),
      toekomst: [...g.toekomst, huidig],
      laatsteSleutel: null,
      laatsteTijd: 0,
    },
    schakeling: vorige,
  };
}

export function opnieuw(
  g: Geschiedenis,
  huidig: Schakeling,
): { g: Geschiedenis; schakeling: Schakeling } | null {
  const volgende = g.toekomst.at(-1);
  if (!volgende) return null;
  return {
    g: {
      verleden: [...g.verleden, huidig],
      toekomst: g.toekomst.slice(0, -1),
      laatsteSleutel: null,
      laatsteTijd: 0,
    },
    schakeling: volgende,
  };
}
