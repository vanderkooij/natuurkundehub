import { BESTAND_EXTENSIE } from "./formaat";

/** Het venster "Opslaan als" van Chrome, Edge en ChromeOS (niet in elke browser). */
interface BestandsVenster {
  showSaveFilePicker?: (opties: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{
    name: string;
    createWritable: () => Promise<{
      write: (data: string) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
}

/** Zet de extensie erachter als die ontbreekt. */
export function metExtensie(naam: string): string {
  const kaal = naam.trim().replace(/\.systeembord(\.json)?$|\.json$/i, "");
  return `${kaal || "schakeling"}${BESTAND_EXTENSIE}`;
}

/**
 * Slaat de schakeling op als bestand. Waar het kan met een echt venster
 * "Opslaan als", waarin je naam en map kiest; anders vraagt de tool om een
 * naam en komt het bestand in de map Downloads. Geeft de naam terug, of null
 * als de gebruiker annuleert.
 */
export async function slaOp(
  tekst: string,
  voorstel: string,
): Promise<string | null> {
  const venster = (window as unknown as BestandsVenster).showSaveFilePicker;
  if (venster) {
    try {
      const bestand = await venster({
        suggestedName: metExtensie(voorstel),
        types: [
          {
            description: "Schakeling van het systeembord",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      const schrijver = await bestand.createWritable();
      await schrijver.write(tekst);
      await schrijver.close();
      return bestand.name;
    } catch (e) {
      // Geannuleerd: niets doen. Een andere fout (bijvoorbeeld geblokkeerd in
      // een ingesloten pagina): dan toch downloaden.
      if (e instanceof DOMException && e.name === "AbortError") return null;
    }
  }
  const gekozen = window.prompt("Sla op als…", metExtensie(voorstel));
  if (gekozen === null) return null;
  const naam = metExtensie(gekozen);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([tekst], { type: "application/json" }));
  a.download = naam;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return naam;
}
