import { Check, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCalibration } from "@/features/calibration/CalibrationState";

/**
 * Klein non-modaal label onderaan de video tijdens edit-modes.
 *
 * In `scale-edit` met gecommitteerde schaal toont de overlay tevens drie
 * actie-knoppen: Lengte aanpassen / Verwijderen / Klaar. Tijdens placing
 * (geen committed scale) wisselt de tekst tussen "klik 1e punt" en "klik 2e".
 */
export function InstructionOverlay() {
  const { mode, scale, scaleDraft, openScaleLengthEditor, clearScale, cancelMode } =
    useCalibration();

  // Scale-edit + existing scale → interactive toolbar (drag handles, edit length, delete, done).
  if (mode === "scale-edit" && scale) {
    return (
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-md border bg-(--bg-card)/95 px-2 py-1.5 shadow-lg backdrop-blur-sm">
        <span className="px-1 font-display text-[12px] text-(--text-secondary)">
          Sleep de eindpunten om de schaal bij te stellen
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-(--text-secondary)"
          onClick={openScaleLengthEditor}
        >
          <Pencil className="size-3.5" /> Lengte
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-(--color-destructive) hover:text-(--color-destructive)"
          onClick={clearScale}
        >
          <Trash2 className="size-3.5" /> Verwijderen
        </Button>
        <Button variant="default" size="sm" className="h-7 gap-1.5 px-2" onClick={cancelMode}>
          <Check className="size-3.5" /> Klaar
        </Button>
      </div>
    );
  }

  // 11: assen-stap — permanente, niet-klikbare uitleg-balk. Legt uit dat de
  // oorsprong gesleept wordt naar het begin van de beweging en dat de +x-pijl
  // de oriëntatie draait. Verdwijnt zodra de modus verlaten wordt.
  if (mode === "axis-edit-by-angle") {
    return (
      <div className="pointer-events-none absolute bottom-3 left-1/2 max-w-[92%] -translate-x-1/2 rounded-md border border-(--border-solid) bg-(--bg-card)/85 px-3 py-2 text-center font-display text-[12px] text-(--text-muted) shadow-lg backdrop-blur-sm">
        Sleep de oorsprong (<span className="font-mono text-(--accent)">●</span>) naar het begin van
        je beweging. Draai de +x-pijl om de oriëntatie te wijzigen.
      </div>
    );
  }

  // Otherwise: contextual prompt only.
  let text: string | null = null;
  if (mode === "scale-edit") {
    text =
      scaleDraft.p1 === null ? "Klik het eerste punt op een bekend object" : "Klik het tweede punt";
  } else if (mode === "origin-edit") {
    text = "Klik om de oorsprong te plaatsen";
  }

  if (!text) return null;

  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-black/65 px-3 py-1.5 text-center font-display text-[12px] text-white shadow-lg">
      {text}
      <span className="ml-2 font-mono text-[10px] text-white/70">Esc om te annuleren</span>
    </div>
  );
}
