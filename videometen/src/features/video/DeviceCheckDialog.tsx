import { useEffect, useState } from "react";
import { Check, Copy, HelpCircle, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { reportAsText, runDeviceCheck, type DeviceReport, type Support } from "./deviceSupport";

/**
 * "Werkt dit apparaat met iPhone-video's?" Voor de docent: draai het één keer
 * op een school-Chromebook en je weet welke formaten die aankan. De tekst is
 * te kopiëren, voor als er later iets uitgezocht moet worden.
 */
export function DeviceCheckDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [report, setReport] = useState<DeviceReport | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setCopied(false);
    void runDeviceCheck().then((r) => {
      if (alive) setReport(r);
    });
    return () => {
      alive = false;
    };
  }, [open]);

  const onCopy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(reportAsText(report));
      setCopied(true);
    } catch {
      window.prompt("Kopieer deze tekst:", reportAsText(report));
    }
  };

  const hevcOk = report?.results.every(({ support }) => support === "ja") ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welke video's kan dit apparaat afspelen?</DialogTitle>
          <DialogDescription>
            Een iPhone filmt standaard in HEVC. Niet elke Chromebook kan dat afspelen; Videometen
            zet zo'n video dan eerst om.
          </DialogDescription>
        </DialogHeader>
        {report ? (
          <div className="space-y-3">
            <ul className="space-y-2">
              {report.results.map(({ check, support }) => (
                <li key={check.label} className="flex items-start gap-2.5">
                  <SupportIcon support={support} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-(--text-primary)">{check.label}</p>
                    <p className="text-[12px] text-(--text-muted)">{check.hint}</p>
                  </div>
                </li>
              ))}
              <li className="flex items-start gap-2.5">
                <SupportIcon support={report.canConvert ? "ja" : "nee"} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-(--text-primary)">Video's omzetten</p>
                  <p className="text-[12px] text-(--text-muted)">
                    Voor als een formaat hierboven niet lukt
                  </p>
                </div>
              </li>
            </ul>
            <p className="text-[13px] leading-snug text-(--text-secondary)">
              {hevcOk
                ? "Dit apparaat kan alle gangbare telefoonvideo's afspelen."
                : report.canConvert
                  ? "Niet alles lukt rechtstreeks. Zo'n video kan Videometen omzetten; dat duurt even, maar daarna werkt hij gewoon."
                  : "Niet alles lukt, en omzetten kan in deze browser niet. Gebruik een ander apparaat of film met de iPhone op Meest compatibel."}
            </p>
            <button
              type="button"
              onClick={onCopy}
              className="flex items-center gap-1 text-[11px] text-(--text-muted) hover:text-(--accent)"
            >
              <Copy className="size-3" aria-hidden />
              {copied ? "Gekopieerd" : "Kopieer technische info"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-(--text-muted)">Bezig met controleren…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SupportIcon({ support }: { support: Support }) {
  if (support === "ja") {
    return <Check className="mt-0.5 size-4 flex-shrink-0 text-(--accent)" aria-label="ja" />;
  }
  if (support === "nee") {
    return <X className="mt-0.5 size-4 flex-shrink-0 text-(--accent-amber)" aria-label="nee" />;
  }
  return (
    <HelpCircle className="mt-0.5 size-4 flex-shrink-0 text-(--text-muted)" aria-label="onbekend" />
  );
}
