import { useEffect, useRef } from "react";

/** Toon van de zoemer: een piëzozoemer piept hoog en schel; zacht gezet. */
const FREQUENTIE = 1800;
const VOLUME = 0.04;

/**
 * Laat een toon klinken zolang er een zoemer aan staat. Een browser speelt pas
 * geluid na een eerste klik of tik, daarom wordt het geluid dan pas opgestart.
 */
export function useZoemer(aan: boolean, geluid: boolean) {
  const audio = useRef<{ ctx: AudioContext; gain: GainNode } | null>(null);
  const gewenst = useRef(0);
  gewenst.current = aan && geluid ? VOLUME : 0;

  useEffect(() => {
    const start = () => {
      if (audio.current) {
        void audio.current.ctx.resume();
        return;
      }
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = FREQUENTIE;
        const gain = ctx.createGain();
        gain.gain.value = gewenst.current;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        audio.current = { ctx, gain };
      } catch {
        /* geen geluid mogelijk: de zoemer is dan alleen te zien */
      }
    };
    // In de capture-fase: knoppen op het bord stoppen hun klik (stopPropagation),
    // en juist die eerste klik moet het geluid opstarten.
    window.addEventListener("pointerdown", start, true);
    window.addEventListener("keydown", start, true);
    return () => {
      window.removeEventListener("pointerdown", start, true);
      window.removeEventListener("keydown", start, true);
      void audio.current?.ctx.close();
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    // Heel kort in- en uitfaden, anders klikt het.
    a.gain.gain.setTargetAtTime(
      aan && geluid ? VOLUME : 0,
      a.ctx.currentTime,
      0.005,
    );
  }, [aan, geluid]);
}
