import { useRef } from "react";

import type { ModelDoc } from "../modelIO";

interface Props {
  savedModels: ModelDoc[];
  canDownloadCsv: boolean;
  onSave: () => void;
  onShare: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onDownloadCsv: () => void;
  onLoadSaved: (i: number) => void;
  onDeleteSaved: (i: number) => void;
}

export function ModelToolbar({
  savedModels,
  canDownloadCsv,
  onSave,
  onShare,
  onExport,
  onImport,
  onDownloadCsv,
  onLoadSaved,
  onDeleteSaved,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="card">
      <div className="section-title">Model opslaan & delen</div>
      <div className="io-buttons">
        <button className="btn-soft" onClick={onSave}>
          💾 Sla op
        </button>
        <button className="btn-soft" onClick={onShare}>
          🔗 Deel (kopieer link)
        </button>
        <button className="btn-soft" onClick={onExport}>
          ⬇ Exporteer JSON
        </button>
        <button className="btn-soft" onClick={() => fileRef.current?.click()}>
          ⬆ Importeer JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
        <button className="btn-soft" onClick={onDownloadCsv} disabled={!canDownloadCsv} title="Download de data van de actieve run (Excel-NL)">
          ⬇ Download CSV
        </button>
      </div>

      {savedModels.length > 0 && (
        <div className="saved-models">
          {savedModels.map((m, i) => (
            <div className="saved-model-row" key={i}>
              <button className="saved-model-load" onClick={() => onLoadSaved(i)}>
                {m.name || "Naamloos model"}
              </button>
              <button className="run-remove" onClick={() => onDeleteSaved(i)} title="Verwijder opgeslagen model">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
