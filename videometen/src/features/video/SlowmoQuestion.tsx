import { Button } from "@/components/ui/button";
import { announceSlowmo } from "@/features/video/announceSlowmo";
import { SLOWMO_PRESETS } from "@/features/video/videoFile";
import { useVideo } from "@/features/video/VideoState";

/**
 * Vraag na het laden van een video: is dit slowmotion? Telefoons slaan een
 * slowmotion-opname (120/240 fps) op als gewone video van 30 fps; de fps-
 * detectie meet dan 30 en alle tijden zijn een factor 4 of 8 te lang. Een
 * leerling weet niet dat de fps-chip dat kan oplossen, dus we vragen het één
 * keer per video, zolang er nog geen meetpunten zijn.
 */
export function SlowmoQuestion() {
  const { video, fpsAtFirstMeasurement, setCaptureFps, dismissSlowmo } = useVideo();
  if (!video || video.slowmoAnswered || fpsAtFirstMeasurement !== null) return null;

  return (
    <div
      className="flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b bg-(--accent-amber)/10 px-4 py-2"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-(--text-primary)">
          Is deze video in slowmotion gefilmd?
        </p>
        <p className="text-[11.5px] leading-snug text-(--text-muted)">
          Telefoons slaan slowmotion op als gewone video. Zonder deze keuze kloppen de tijden niet.
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={dismissSlowmo}>
          Nee
        </Button>
        {SLOWMO_PRESETS.map((p) => (
          <Button
            key={p}
            variant="outline"
            size="sm"
            className="h-7 text-[12px]"
            onClick={() => {
              setCaptureFps(p, "user");
              announceSlowmo(p);
            }}
          >
            Ja, {p} fps
          </Button>
        ))}
      </div>
    </div>
  );
}
