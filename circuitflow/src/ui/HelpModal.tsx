import { X } from "lucide-react";

interface Props {
  onClose: () => void;
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 shrink-0 rounded-md border border-(--border-solid) bg-(--bg-primary) px-1.5 py-0.5 font-mono text-[11px] text-(--text-secondary)">
        {k}
      </span>
      <span className="text-sm text-(--text-secondary)">{children}</span>
    </li>
  );
}

/** Uitleg-overlay met korte bediening + de feedback-link (zit hier zodat hij niet
 *  permanent in beeld staat zoals een vaste footer zou doen). */
export function HelpModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onPointerDown={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl border border-(--border-solid) bg-card p-6 shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--text-primary)">
            Uitleg &amp; bediening
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="grid h-8 w-8 place-items-center rounded-lg border border-(--border-solid) text-(--text-secondary) hover:bg-(--bg-card-hover)"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-4 text-sm text-(--text-secondary)">
          Bouw een gelijkstroom-schakeling en zie de stroom lopen. De ladingsdragers bewegen met een{" "}
          <strong className="text-(--text-primary)">vaste snelheid</strong>; hoe groter de stroom, hoe{" "}
          <strong className="text-(--text-primary)">dichter</strong> ze op elkaar zitten.
        </p>

        <ul className="flex flex-col gap-2.5">
          <Row k="sleep">Sleep een onderdeel uit de balk bovenaan (of een meter uit de rechterstrook) op het canvas.</Row>
          <Row k="verbind">Sleep vanaf een aansluitpunt naar een ander om ze met een draad te verbinden; klik onderweg voor een knikpunt.</Row>
          <Row k="klik">Klik een onderdeel om z'n waarde, kleur of bereik in te stellen (of met de pijltjestoetsen ← →; Shift = grote stap). Bij de LDR/NTC stel je zo het licht of de temperatuur in.</Row>
          <Row k="kader">Sleep over leeg canvas voor een selectiekader: meerdere onderdelen tegelijk selecteren, dan dupliceren of verwijderen. Pannen = Alt+slepen (of middelste muisknop).</Row>
          <Row k="touch">Op een touchscreen/digibord: sleep een onderdeel om het te verplaatsen, sleep vanaf een aansluitpunt naar een ander voor een draad, sleep leeg canvas om te pannen, en knijp met twee vingers om te zoomen.</Row>
          <Row k="✂">Selecteer een knoop met een draad en klik het schaartje om die aansluiting los te maken.</Row>
          <Row k="meters">Voltmeter meet parallel (over een onderdeel), ampèremeter in serie. De analoge VOS-meters hebben een zwarte poort (0) en drie rode bereik-poorten.</Row>
          <Row k="grafiek">Klik een weerstand, lamp, LED of sensor en kies "Toon I‑U‑grafiek" (bij een LED: alle kleuren naast elkaar; een gloeidraadlamp geeft een kromme).</Row>
          <Row k="schema">De toggle Pictoriaal/Schema wisselt tussen plaatjes en schoolboek-symbolen. Exporteer via het map-icoon als afbeelding voor een werkblad.</Row>
          <Row k="oog">De oog-knop verbergt de stroomwaarden (meetopdracht): leerlingen meten zelf. De tabel-knop toont U, I en P per component + de vervangingsweerstand.</Row>
          <Row k="T">De T-knop (of toets T) zet een tekstlabel op het canvas; dubbelklik om te bewerken, slepen om te verplaatsen.</Row>
          <Row k="map">Via het map-icoon: voorbeeldschakelingen, opslaan/openen (JSON), afbeelding exporteren en een deellink maken — desgewenst met een opdracht en meetmodus voor de leerling. Je werk wordt automatisch lokaal bewaard.</Row>
          <Row k="let op">Een LED zonder voorschakelweerstand of een zekering boven z'n nominale stroom brandt door — vervang via het paneel.</Row>
          <Row k="Ctrl+Z">Ongedaan maken · Ctrl+Y opnieuw · Ctrl+D dupliceren · Esc deselecteert · zoomen met scrollwiel of de knoppen rechtsonder.</Row>
        </ul>

        <div className="mt-5 border-t border-(--border-solid) pt-4 text-sm text-(--text-secondary)">
          Feedback of een bug gevonden?{" "}
          <a href="/contact/" className="font-medium text-(--accent) hover:underline">
            Laat het weten →
          </a>
        </div>
      </div>
    </div>
  );
}
