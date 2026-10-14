import type { Schakeling } from "@/sim";

import { naarTekst, vanTekst, type Ingelezen } from "./formaat";

/**
 * De schakeling zit in de link zelf (na #s=), ingepakt met deflate en als
 * base64url. Er komt dus niets op een server: wie de link opent, krijgt
 * precies deze schakeling.
 */
export const LINK_SLEUTEL = "s";

async function pak(tekst: string, richting: "in" | "uit"): Promise<Uint8Array> {
  const stroom =
    richting === "in"
      ? new CompressionStream("deflate-raw")
      : new DecompressionStream("deflate-raw");
  const bytes =
    richting === "in"
      ? new TextEncoder().encode(tekst)
      : base64NaarBytes(tekst);
  const uit = new Blob([bytes as Uint8Array<ArrayBuffer>])
    .stream()
    .pipeThrough(stroom);
  return new Uint8Array(await new Response(uit).arrayBuffer());
}

function bytesNaarBase64(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64NaarBytes(t: string): Uint8Array {
  const s = atob(t.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export async function naarLinkdeel(s: Schakeling): Promise<string> {
  return bytesNaarBase64(await pak(naarTekst(s), "in"));
}

export async function vanLinkdeel(deel: string): Promise<Ingelezen> {
  try {
    const bytes = await pak(deel, "uit");
    return vanTekst(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, fout: "Deze link is niet compleet of klopt niet." };
  }
}

/** De volledige link naar deze pagina met de schakeling erin. */
export async function maakLink(
  s: Schakeling,
  basis = location.href,
): Promise<string> {
  const url = new URL(basis);
  url.hash = `${LINK_SLEUTEL}=${await naarLinkdeel(s)}`;
  // Een docentensleutel hoort niet in een link voor leerlingen.
  url.searchParams.delete("docent");
  return url.toString();
}

/** Het schakelingdeel uit een hash als "#s=…", of null. */
export function linkdeelUitHash(hash: string): string | null {
  const m = /^#?s=([A-Za-z0-9_-]+)$/.exec(hash);
  return m ? m[1] : null;
}
