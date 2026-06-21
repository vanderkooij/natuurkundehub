import { useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  errorLines: number[];
}

export function ModelEditor({ value, onChange, errorLines }: Props) {
  const lnRef = useRef<HTMLDivElement>(null);
  const lineCount = Math.max(1, value.split("\n").length);
  const errSet = new Set(errorLines);

  function onScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    if (lnRef.current) lnRef.current.scrollTop = e.currentTarget.scrollTop;
  }

  return (
    <div className="card">
      <div className="section-title">Modelregels</div>
      <div className="editor-wrap">
        <div className="line-numbers" ref={lnRef}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className={errSet.has(i + 1) ? "ln-err" : undefined}>
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          className="model-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={onScroll}
          spellCheck={false}
          placeholder={"// Eén modelregel per regel, bv. vrije val:\nv = v + a*dt\nh = h - v*dt\nals h <= 0 dan STOP\nt = t + dt"}
        />
      </div>
      <div className="hint">
        Syntax: <code>v = v + a*dt</code> · <code>als h &lt;= 0 dan STOP</code> ·{" "}
        <code>// commentaar</code>. Functies o.a. <code>sqrt</code>/<code>wortel</code>,{" "}
        <code>sin</code>, <code>cos</code>, <code>pi</code>/<code>π</code>, <code>log</code>.
      </div>
    </div>
  );
}
