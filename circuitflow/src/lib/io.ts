/**
 * Opslaan/laden (JSON) en exporteren (PNG) van een schakeling.
 */
import type { CircuitDoc } from "@/model/types";

export function docToJson(doc: CircuitDoc): string {
  return JSON.stringify({ app: "circuitflow", version: 1, doc }, null, 2);
}

/** Leest een schakeling uit JSON-tekst; geeft null bij ongeldige inhoud. */
export function jsonToDoc(text: string): CircuitDoc | null {
  try {
    const parsed = JSON.parse(text);
    const doc = parsed?.doc ?? parsed;
    if (
      doc &&
      typeof doc === "object" &&
      doc.vertices &&
      Array.isArray(doc.components) &&
      Array.isArray(doc.wires)
    ) {
      return doc as CircuitDoc;
    }
  } catch {
    /* ongeldige JSON */
  }
  return null;
}

// ── Deelbare link: schakeling gecodeerd in de URL-hash ───────────────────────

/** Unicode-veilige base64url. */
function b64encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64decode(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export interface SharePayload {
  doc: CircuitDoc;
  /** Opdrachttekst voor de leerling (getoond als kaart bij het openen). */
  task?: string;
  /** Open in meetopdracht-modus (waarden verborgen). */
  measure?: boolean;
}

/** Volledige deel-URL voor de huidige schakeling, evt. met opdracht + meetmodus. */
export function docToShareUrl(doc: CircuitDoc, task?: string, measure?: boolean): string {
  const body: Record<string, unknown> = { doc };
  if (task?.trim()) body.task = task.trim();
  if (measure) body.measure = true;
  return `${location.origin}${location.pathname}#c=${b64encode(JSON.stringify(body))}`;
}

/** Deellink-inhoud uit de URL-hash (`#c=…`), of null als die er niet/ongeldig is. */
export function sharePayloadFromHash(): SharePayload | null {
  const m = /[#&]c=([A-Za-z0-9_-]+)/.exec(location.hash);
  if (!m) return null;
  try {
    const text = b64decode(m[1]);
    const doc = jsonToDoc(text);
    if (!doc) return null;
    const parsed = JSON.parse(text) as { task?: unknown; measure?: unknown };
    return {
      doc,
      task: typeof parsed.task === "string" ? parsed.task : undefined,
      measure: parsed.measure === true,
    };
  } catch {
    return null;
  }
}

function download(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(doc: CircuitDoc, filename = "schakeling.json"): void {
  download(filename, new Blob([docToJson(doc)], { type: "application/json" }));
}

const STYLE_PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "color",
];

/** Kopieert de berekende stijlen van het origineel naar de kloon (zodat de losse
 *  SVG er zonder externe CSS goed uitziet). Loopt beide bomen in lockstep af. */
function inlineStyles(src: Element, dst: Element): void {
  const cs = getComputedStyle(src);
  let style = "";
  for (const p of STYLE_PROPS) {
    const v = cs.getPropertyValue(p);
    if (v) style += `${p}:${v};`;
  }
  dst.setAttribute("style", style);
  const s = src.children;
  const d = dst.children;
  for (let i = 0; i < s.length; i++) inlineStyles(s[i], d[i]);
}

/** Exporteert de schakeling (het `.cf-root`-figuur) als PNG op witte achtergrond. */
export async function exportPng(svg: SVGSVGElement, filename = "schakeling.png", scale = 2): Promise<void> {
  const root = svg.querySelector<SVGGElement>(".cf-root");
  if (!root) return;
  const bb = root.getBBox();
  if (!bb.width || !bb.height) return; // leeg canvas
  const pad = 28;
  const x = bb.x - pad;
  const y = bb.y - pad;
  const w = bb.width + 2 * pad;
  const h = bb.height + 2 * pad;

  // Altijd de licht-thema-kleuren inlijnen: de export staat op wit, en de
  // dark-mode-kleuren (lichte tekst/draden) zijn daarop onleesbaar.
  const html = document.documentElement;
  const prevTheme = html.getAttribute("data-theme");
  html.setAttribute("data-theme", "light");
  const clone = root.cloneNode(true) as SVGGElement;
  try {
    inlineStyles(root, clone);
  } finally {
    if (prevTheme) html.setAttribute("data-theme", prevTheme);
    else html.removeAttribute("data-theme");
  }

  const W = Math.round(w * scale);
  const H = Math.round(h * scale);
  const xml =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${x} ${y} ${w} ${h}">` +
    new XMLSerializer().serializeToString(clone) +
    `</svg>`;

  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);
  URL.revokeObjectURL(url);
  canvas.toBlob((b) => b && download(filename, b), "image/png");
}
