import {
  ChevronDown,
  FolderOpen,
  Gauge,
  LayoutGrid,
  Plus,
  Sun,
  Volume2,
  VolumeX,
  Table2,
  Redo2,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { MODULES, type BordSoort, type Kolom, type ModuleSoort } from "@/sim";

import type { Voorbeeld } from "@/bestand/voorbeelden";

import { BORD_NAAM } from "./borden";

export type Start = BordSoort | "leeg";

interface Props {
  nieuw: (start: Start) => void;
  bordErbij: (soort: BordSoort) => void;
  moduleErbij: (soort: ModuleSoort) => void;
  voltmeter: boolean;
  wisselVoltmeter: () => void;
  geluid: boolean;
  wisselGeluid: () => void;
  tabel: boolean;
  wisselTabel: () => void;
  omgeving: boolean;
  wisselOmgeving: () => void;
  /** null als er niets ongedaan te maken (of opnieuw te doen) is. */
  ongedaan: (() => void) | null;
  opnieuw: (() => void) | null;
  opslaan: () => void;
  openen: () => void;
  deelLink: () => void;
  /** Alleen met de docentenlink: de voorbeeldschakelingen. */
  voorbeelden: Voorbeeld[] | null;
  laadVoorbeeld: (v: Voorbeeld) => void;
}

const KOLOMMEN: { kolom: Kolom; titel: string }[] = [
  { kolom: "invoer", titel: "Invoer" },
  { kolom: "verwerking", titel: "Verwerking" },
  { kolom: "uitvoer", titel: "Uitvoer" },
];

const knop =
  "flex h-9 items-center gap-1.5 rounded-lg border border-(--border-solid) bg-card px-2.5 text-sm font-medium text-(--text-primary) hover:bg-(--bg-card-hover)";
const item =
  "block w-full rounded-lg px-3 py-2.5 text-left text-sm text-(--text-primary) hover:bg-(--bg-card-hover)";
const kopje =
  "px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-(--text-muted)";

/** Knoppen rechtsboven: een ander bord kiezen en losse modules toevoegen. */
export function Werkbalk({
  nieuw,
  bordErbij,
  moduleErbij,
  voltmeter,
  wisselVoltmeter,
  geluid,
  wisselGeluid,
  tabel,
  wisselTabel,
  omgeving,
  wisselOmgeving,
  ongedaan,
  opnieuw,
  opslaan,
  openen,
  deelLink,
  voorbeelden,
  laadVoorbeeld,
}: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={`${knop} w-9 justify-center !px-0 disabled:opacity-40`}
        onClick={() => ongedaan?.()}
        disabled={!ongedaan}
        aria-label="Ongedaan maken"
        title="Ongedaan maken (Ctrl+Z)"
      >
        <Undo2 size={18} />
      </button>
      <button
        type="button"
        className={`${knop} w-9 justify-center !px-0 disabled:opacity-40`}
        onClick={() => opnieuw?.()}
        disabled={!opnieuw}
        aria-label="Opnieuw doen"
        title="Opnieuw doen (Ctrl+Y)"
      >
        <Redo2 size={18} />
      </button>
      <Uitklap label="Bord" icoon={<LayoutGrid size={18} />}>
        {(sluit) => (
          <>
            <div className={kopje}>Opnieuw beginnen</div>
            {(["comparators", "transistor"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={item}
                onClick={() => (sluit(), nieuw(s))}
              >
                {BORD_NAAM[s]}
              </button>
            ))}
            <button
              type="button"
              className={item}
              onClick={() => (sluit(), nieuw("leeg"))}
            >
              Leeg werkvlak
            </button>
            <div className={kopje}>Bord erbij, voor grote schakelingen</div>
            {(["comparators", "transistor"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={item}
                onClick={() => (sluit(), bordErbij(s))}
              >
                {BORD_NAAM[s]}
              </button>
            ))}
          </>
        )}
      </Uitklap>
      <Uitklap label="Module" icoon={<Plus size={18} />} breed>
        {(sluit) => (
          <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-3">
            {KOLOMMEN.map(({ kolom, titel }) => (
              <div key={kolom}>
                <div className={kopje}>{titel}</div>
                {Object.values(MODULES)
                  .filter((d) => d.kolom === kolom && !d.extra)
                  .map((d) => (
                    <button
                      key={d.soort}
                      type="button"
                      className={item}
                      onClick={() => (sluit(), moduleErbij(d.soort))}
                    >
                      {d.naam}
                    </button>
                  ))}
              </div>
            ))}
            <div className="sm:col-span-3">
              <div className={kopje}>Extra, niet op het echte bord</div>
              <div className="grid grid-cols-2 sm:grid-cols-4">
                {Object.values(MODULES)
                  .filter((d) => d.extra)
                  .map((d) => (
                    <button
                      key={d.soort}
                      type="button"
                      className={item}
                      onClick={() => (sluit(), moduleErbij(d.soort))}
                    >
                      {d.naam}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Uitklap>
      <Uitklap label="Bestand" icoon={<FolderOpen size={18} />}>
        {(sluit) => (
          <>
            <button
              type="button"
              className={item}
              onClick={() => (sluit(), opslaan())}
            >
              Opslaan als bestand
            </button>
            <button
              type="button"
              className={item}
              onClick={() => (sluit(), openen())}
            >
              Bestand openen
              <span className="block text-xs text-(--text-muted)">
                Ook .xml-bestanden van het online systeembord
              </span>
            </button>
            <button
              type="button"
              className={item}
              onClick={() => (sluit(), deelLink())}
            >
              Link kopiëren
              <span className="block text-xs text-(--text-muted)">
                Wie de link opent, krijgt precies deze schakeling
              </span>
            </button>
            {voorbeelden && (
              <>
                <div className={kopje}>Voorbeelden (alleen docent)</div>
                {voorbeelden.map((v) => (
                  <button
                    key={v.naam}
                    type="button"
                    className={item}
                    title={v.uitleg}
                    onClick={() => (sluit(), laadVoorbeeld(v))}
                  >
                    {v.naam}
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </Uitklap>
      <button
        type="button"
        className={`${knop} ${voltmeter ? "!border-(--accent) !text-(--accent)" : ""}`}
        aria-pressed={voltmeter}
        onClick={wisselVoltmeter}
        title="Voltmeter: meet de spanning op een bus"
      >
        <Gauge size={18} />
        <span className="hidden lg:inline">Voltmeter</span>
      </button>
      <button
        type="button"
        className={`${knop} ${tabel ? "!border-(--accent) !text-(--accent)" : ""}`}
        aria-pressed={tabel}
        onClick={wisselTabel}
        title="Waarheidstabel van de schakeling"
      >
        <Table2 size={18} />
        <span className="hidden lg:inline">Tabel</span>
      </button>
      <button
        type="button"
        className={`${knop} ${omgeving ? "!border-(--accent) !text-(--accent)" : ""}`}
        aria-pressed={omgeving}
        onClick={wisselOmgeving}
        title="Omgeving: daglicht en temperatuur rond de sensoren"
      >
        <Sun size={18} />
        <span className="hidden lg:inline">Omgeving</span>
      </button>
      <button
        type="button"
        className={`${knop} w-9 justify-center !px-0`}
        aria-pressed={geluid}
        onClick={wisselGeluid}
        aria-label={
          geluid ? "Geluid van de zoemer uit" : "Geluid van de zoemer aan"
        }
        title={
          geluid
            ? "Geluid van de zoemer uitzetten"
            : "Geluid van de zoemer aanzetten"
        }
      >
        {geluid ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
    </div>
  );
}

function Uitklap({
  label,
  icoon,
  breed,
  children,
}: {
  label: string;
  icoon: ReactNode;
  breed?: boolean;
  children: (sluit: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const buiten = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", buiten);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", buiten);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={knop}
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((o) => !o)}
      >
        {icoon}
        <span className="hidden lg:inline">{label}</span>
        <ChevronDown size={16} className="text-(--text-muted)" />
      </button>
      {open && (
        <div
          className={`absolute top-11 right-0 z-20 max-h-[70vh] overflow-auto ${breed ? "w-[min(600px,calc(100vw-2rem))]" : "min-w-64"} rounded-xl border border-(--border-solid) bg-card p-1.5 shadow-xl`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
