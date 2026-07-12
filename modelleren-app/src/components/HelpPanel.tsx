import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Wat is modelleren?",
    body: (
      <>
        <p>
          Bij modelleren deel je een berekening op in kleine stapjes. Bij elke stap worden grootheden
          zoals positie en snelheid bijgewerkt op basis van de huidige toestand. Door dit heel vaak te
          herhalen kun je bewegingen en processen nabootsen die je niet met één formule kunt
          uitrekenen — dit heet itereren.
        </p>
        <p className="help-sub">Iteraties en tijdstap dt</p>
        <p>
          Elke herhaling is een iteratie. De tijdstap <code>dt</code> bepaalt hoe groot elke stap is.
          Kleinere <code>dt</code> = nauwkeuriger, maar meer iteraties nodig voor dezelfde totale tijd.
        </p>
        <p className="help-sub">Tussenvariabelen</p>
        <p>
          Grootheden die je elke stap berekent uit andere variabelen (bv. kracht of versnelling) en
          niet als startwaarde opgeeft.
        </p>
        <p className="help-sub">Richtingen en tekens</p>
        <p>
          Spreek af welke richting positief is. Krachten/snelheden in de tegengestelde richting krijgen
          een minteken — cruciaal bij stuiteren, veren of meerdere krachten.
        </p>
      </>
    ),
  },
  {
    title: "Startwaarden & modelregels",
    body: (
      <>
        <p>
          Elke startwaarde heeft een naam, beginwaarde en optionele eenheid. Een beginwaarde mag ook
          een <strong>formule</strong> zijn die één keer wordt berekend (bv.{" "}
          <code>Vlucht = Vtot-(mwater/rho)</code>) — gebruik daarin alleen variabelen die er bóven
          staan. Met <code>📋 Kopieer</code>/<code>📥 Plak</code> wissel je alle startwaarden als
          platte tekst uit.
        </p>
        <pre>{`v = v + a*dt              // gewone toewijzing
// commentaar              ' ook commentaar
als x <= 0 dan v = -v      // voorwaarde
als abs(v) < 0.001 dan STOP  // stopconditie`}</pre>
        <p>
          Wetenschappelijke notatie: <code>6.67e-11</code> of <code>6,67·10^-11</code>. Functies o.a.{" "}
          <code>sqrt()</code> (= <code>wortel()</code>), <code>sin</code>, <code>cos</code>,{" "}
          <code>tan</code>, <code>exp</code>, <code>ln</code>, <code>log</code>, en de constante{" "}
          <code>pi</code> (= <code>π</code>). Ook komma-decimalen, <code>×</code>/<code>·</code> en{" "}
          superscript <code>d²</code> worden herkend.
        </p>
      </>
    ),
  },
  {
    title: "Grafieken & runs",
    body: (
      <>
        <p className="help-sub">Grafieken</p>
        <p>
          Kies x- en y-as per grafiek. Zoom met het muiswiel, klik een punt en loop met{" "}
          <code>← →</code> over de meetpunten. <strong>Raaklijn</strong> toont dy/dx op het
          geselecteerde punt (vaste amber kleur). <strong>⤢ Autozoom</strong> zet de assen terug naar
          passend. Kies via <em>Indeling</em> hoeveel grafieken je ziet (1, 2 naast of onder
          elkaar, of 2×2).
        </p>
        <p className="help-sub">Runs vergelijken</p>
        <p>
          Elke simulatie wordt automatisch een genummerde run in de lijst onder de grafiek. Pas
          startwaarden aan en simuleer opnieuw voor een nieuwe run. Klik een run om hem te{" "}
          <strong>activeren</strong> (de actieve run draagt de puntmarkers, raaklijn en pijltjes). Het
          label toont per run de waarde van de variabele(n) die je varieerde. Verwijder runs met × of
          wis ze allemaal.
        </p>
      </>
    ),
  },
  {
    title: "Opslaan, delen & exporteren",
    body: (
      <>
        <p>
          <em>💾 Sla op</em> bewaart het model in je browser. <em>🔗 Deel</em> kopieert een link naar
          het klembord waarmee iemand exact jouw model opent. <em>Exporteer/Importeer JSON</em> voor
          een bestand. <em>⬇ Download CSV</em> exporteert de data van de actieve run (Excel-NL).
        </p>
      </>
    ),
  },
];

export function HelpPanel({ open, onClose }: Props) {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <>
      <div className={"help-overlay" + (open ? " open" : "")} onClick={onClose} />
      <div className={"help-panel" + (open ? " open" : "")}>
        <div className="help-panel-hdr">
          <h2>Help &amp; Uitleg</h2>
          <button className="help-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="help-body">
          {SECTIONS.map((s, i) => (
            <div key={i} className={"help-acc" + (openIdx === i ? " open" : "")}>
              <div className="help-acc-hdr" onClick={() => setOpenIdx(openIdx === i ? -1 : i)}>
                <h3>{s.title}</h3>
                <span className="help-acc-chevron">▼</span>
              </div>
              {openIdx === i && <div className="help-acc-body">{s.body}</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
