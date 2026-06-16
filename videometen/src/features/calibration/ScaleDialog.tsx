import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  pixelDistance,
  useCalibration,
  type LengthUnit,
} from "@/features/calibration/CalibrationState";
import { formatDecimal, parseDutchNumber } from "@/lib/numbers";

/**
 * Opens automatically zodra de schaal-draft beide klikken heeft, en blijft
 * open tot de gebruiker bevestigt of annuleert. State leeft hier (lokaal),
 * de gecommitteerde schaal komt pas in CalibrationState bij submit.
 */
export function ScaleDialog() {
  const { mode, scaleDraft, scale, commitScale, clearScaleDraft } = useCalibration();

  const open = mode === "scale-edit" && !!scaleDraft.p1 && !!scaleDraft.p2;

  // Pre-fill with previous values when re-editing, otherwise sensible defaults.
  const [lengthDraft, setLengthDraft] = useState("");
  const [unit, setUnit] = useState<LengthUnit>("m");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (scale) {
      setLengthDraft(formatDecimal(scale.length, 2));
      setUnit(scale.unit);
    } else {
      setLengthDraft("");
      setUnit("m");
    }
    setError(null);
  }, [open, scale]);

  const dist = scaleDraft.p1 && scaleDraft.p2 ? pixelDistance(scaleDraft.p1, scaleDraft.p2) : 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseDutchNumber(lengthDraft);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Vul een positief getal in (bv. 1,20).");
      return;
    }
    if (dist <= 0) {
      setError("De twee punten liggen op dezelfde plek — klik opnieuw.");
      return;
    }
    commitScale(n, unit);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) clearScaleDraft();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schaal instellen</DialogTitle>
          <DialogDescription>
            Vul de werkelijke lengte van de gemarkeerde afstand in. De pixel-afstand wordt hieronder
            getoond.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="rounded-md border border-(--border-solid) bg-(--bg-secondary) px-3 py-2 font-mono text-xs text-(--text-secondary)">
            pixel-afstand · {formatDecimal(dist, 1)} px
          </div>

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="scale-length">Lengte</Label>
              <Input
                id="scale-length"
                type="text"
                inputMode="decimal"
                placeholder="bv. 1,20"
                value={lengthDraft}
                onChange={(e) => setLengthDraft(e.target.value)}
                autoFocus
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scale-unit">Eenheid</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as LengthUnit)}>
                <SelectTrigger id="scale-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="mm">mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? <p className="font-mono text-xs text-(--color-destructive)">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={clearScaleDraft}>
              Annuleren
            </Button>
            <Button type="submit">Bevestigen</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
