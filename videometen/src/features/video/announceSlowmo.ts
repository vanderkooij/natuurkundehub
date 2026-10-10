import { toast } from "@/_reusable/Toaster";

/** Toast na het kiezen van slowmotion (vraagbalk en fps-chip). */
export function announceSlowmo(captureFps: number) {
  toast(
    `Slowmotion ${captureFps} fps: elk frame is 1/${captureFps} s. Trim alleen het vertraagde stuk, want telefoons filmen begin en eind vaak op normale snelheid.`,
    8000,
  );
}
