import { FolderOpen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { docToShareUrl, downloadJson, jsonToDoc } from "@/lib/io";
import { PRESETS } from "@/model/presets";
import type { CircuitDoc } from "@/model/types";

interface Props {
  doc: CircuitDoc;
  onLoad: (doc: CircuitDoc) => void;
  onExportPng: () => void;
  /** Korte melding aan de gebruiker (toast in de editor). */
  onNotify: (msg: string) => void;
}

const item =
  "block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-(--text-secondary) hover:bg-(--bg-card-hover)";

/** Kopieer tekst naar het klembord: synchroon (betrouwbaar in een klik), async als fallback. */
function copyText(text: string, onNotify: (msg: string) => void, okMsg: string): void {
  let ok = false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ok = document.execCommand("copy");
    ta.remove();
  } catch {
    ok = false;
  }
  if (ok) {
    onNotify(okMsg);
  } else {
    navigator.clipboard
      .writeText(text)
      .then(() => onNotify(okMsg))
      .catch(() => onNotify("Kopiëren lukte niet; kopieer de adresbalk-URL handmatig."));
  }
}

/** Dialoog voor de deellink: optionele opdrachttekst + meetopdracht-modus. */
function ShareDialog({
  doc,
  onNotify,
  onClose,
}: {
  doc: CircuitDoc;
  onNotify: (msg: string) => void;
  onClose: () => void;
}) {
  const [task, setTask] = useState("");
  const [measure, setMeasure] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onPointerDown={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-(--border-solid) bg-card p-5 shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--text-primary)">Deellink maken</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="grid h-8 w-8 place-items-center rounded-lg border border-(--border-solid) text-(--text-secondary) hover:bg-(--bg-card-hover)"
          >
            <X size={16} />
          </button>
        </div>

        <label className="mb-1 block text-xs text-(--text-muted)">Opdracht voor de leerling (optioneel)</label>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={3}
          placeholder="Bijv.: Meet de spanning over R2 en controleer met U = I · R."
          className="w-full resize-none rounded-md border border-(--border-solid) bg-(--bg-primary) px-2.5 py-2 text-sm text-(--text-primary) placeholder:text-(--text-muted)"
        />

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-(--text-secondary)">
          <input
            type="checkbox"
            checked={measure}
            onChange={(e) => setMeasure(e.target.checked)}
            className="accent-(--accent)"
          />
          Open in meetopdracht-modus (waarden verborgen — leerling meet zelf)
        </label>

        <button
          type="button"
          onClick={() => {
            copyText(
              docToShareUrl(doc, task, measure),
              onNotify,
              "Deellink gekopieerd — plak 'm in de chat of ELO.",
            );
            onClose();
          }}
          className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Kopieer deellink
        </button>
      </div>
    </div>
  );
}

export function FileMenu({ doc, onLoad, onExportPng, onNotify }: Props) {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    f.text().then((text) => {
      const d = jsonToDoc(text);
      if (d) onLoad(d);
      else onNotify("Dit lijkt geen geldige CircuitFlow-schakeling.");
    });
  };

  return (
    <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Voorbeelden &amp; bestand"
        aria-label="Voorbeelden en bestand"
        className="grid h-9 w-9 place-items-center rounded-lg border border-(--border-solid) text-(--text-secondary) hover:bg-(--bg-card-hover)"
      >
        <FolderOpen size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-60 rounded-lg border border-(--border-solid) bg-card p-1 shadow-xl">
          <div className="px-2.5 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
            Voorbeelden
          </div>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={item}
              onClick={() => {
                onLoad(p.build());
                setOpen(false);
              }}
            >
              {p.label}
            </button>
          ))}
          <div className="my-1 border-t border-(--border-solid)" />
          <button type="button" className={item} onClick={() => { fileRef.current?.click(); setOpen(false); }}>
            Openen…
          </button>
          <button type="button" className={item} onClick={() => { downloadJson(doc); setOpen(false); }}>
            Opslaan (JSON)
          </button>
          <button type="button" className={item} onClick={() => { onExportPng(); setOpen(false); }}>
            Exporteer afbeelding (PNG)
          </button>
          <button type="button" className={item} onClick={() => { setShareOpen(true); setOpen(false); }}>
            Deellink maken…
          </button>
        </div>
      )}
      {shareOpen && <ShareDialog doc={doc} onNotify={onNotify} onClose={() => setShareOpen(false)} />}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
