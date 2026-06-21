import { useState } from "react";
import { EXAMPLES } from "../engine";

interface Props {
  onLoad: (name: string) => void;
}

export function ExamplesSection({ onLoad }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="collapse">
      <button className="collapse-head" onClick={() => setOpen((o) => !o)}>
        <span>Voorbeeldmodellen</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="examples-grid">
          {EXAMPLES.map((ex) => (
            <button key={ex.name} className="example-card" onClick={() => onLoad(ex.name)}>
              <strong>{ex.name}</strong>
              <span>{ex.desc.split("\n\n")[0]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
