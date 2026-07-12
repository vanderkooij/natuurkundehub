import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

import type { SvRow } from "./engine";
import { buildCsvNL, downloadBlob, formatCsvCell } from "@nh/shared/csvNL";

/** Een opgeslagen/gedeeld model. Schema is gelijk aan de vanilla tool (interop). */
export interface ModelDoc {
  name?: string;
  sv: SvRow[];
  model: string;
  iter: number;
}

const STORAGE_KEY = "nh_modellen"; // zelfde key als de vanilla tool

/**
 * Valideert én saneert een extern document (import/deel-URL/localStorage).
 * Startwaarde-rijen worden veldsgewijs gecontroleerd en naar strings gedwongen,
 * zodat een misvormd bestand nooit de app kan laten crashen (`row.name.trim()`).
 */
function sanitizeDoc(d: unknown): ModelDoc | null {
  if (!d || typeof d !== "object") return null;
  const doc = d as { name?: unknown; sv?: unknown; model?: unknown; iter?: unknown };
  if (!Array.isArray(doc.sv) || typeof doc.model !== "string") return null;
  const okField = (x: unknown) => typeof x === "string" || typeof x === "number";
  const sv: SvRow[] = [];
  for (const r of doc.sv) {
    if (!r || typeof r !== "object") return null;
    const row = r as { name?: unknown; value?: unknown; unit?: unknown };
    if (!okField(row.name) || !okField(row.value)) return null;
    if (row.unit !== undefined && !okField(row.unit)) return null;
    sv.push({ name: String(row.name), value: String(row.value), unit: String(row.unit ?? "") });
  }
  const iter = Math.floor(Number(doc.iter));
  return {
    name: typeof doc.name === "string" ? doc.name : undefined,
    sv,
    model: doc.model,
    iter: Number.isFinite(iter) && iter >= 1 ? iter : 1000,
  };
}

// ─── localStorage ──────────────────────────────────────────────────────────
export function loadSavedModels(): ModelDoc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map(sanitizeDoc).filter((d): d is ModelDoc => d !== null);
  } catch {
    return [];
  }
}

export function persistSavedModels(models: ModelDoc[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
  } catch {
    /* opslag kan vol/geblokkeerd zijn */
  }
}

// ─── Deel-URL (LZString, backward-compatible met vanilla `?model=`) ─────────
export function buildShareUrl(doc: ModelDoc): string {
  const data = JSON.stringify({ sv: doc.sv, model: doc.model, iter: doc.iter });
  const compressed = compressToEncodedURIComponent(data);
  return location.origin + location.pathname + "?model=" + compressed;
}

export function parseShareParam(): ModelDoc | null {
  try {
    const param = new URLSearchParams(location.search).get("model");
    if (!param) return null;
    const json = decompressFromEncodedURIComponent(param);
    if (!json) return null;
    return sanitizeDoc(JSON.parse(json));
  } catch {
    return null;
  }
}

// ─── JSON export / import ───────────────────────────────────────────────────
export function exportModelJson(doc: ModelDoc): void {
  const name = doc.name || "mijn-model";
  const data = JSON.stringify({ name, sv: doc.sv, model: doc.model, iter: doc.iter }, null, 2);
  downloadBlob(new Blob([data], { type: "application/json;charset=utf-8" }), name + ".json");
}

export function parseImportedJson(text: string): ModelDoc | null {
  try {
    return sanitizeDoc(JSON.parse(text));
  } catch {
    return null;
  }
}

// ─── CSV (Excel-NL) van een run ────────────────────────────────────────────
export function downloadRunCsv(
  data: Record<string, number>[],
  cols: string[],
  unitOf: (name: string) => string,
): void {
  const header = cols.map((c) => {
    const u = unitOf(c);
    return formatCsvCell(u ? `${c} (${u})` : c);
  });
  const rows = data.map((row) => cols.map((c) => formatCsvCell(c in row ? row[c] : null)));
  const csv = buildCsvNL([header, ...rows]);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "simulatie.csv");
}
