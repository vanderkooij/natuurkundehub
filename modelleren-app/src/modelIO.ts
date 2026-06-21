import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

import type { SvRow } from "./engine";
import { buildCsvNL, downloadBlob, formatCsvCell } from "./_reusable/csvNL";

/** Een opgeslagen/gedeeld model. Schema is gelijk aan de vanilla tool (interop). */
export interface ModelDoc {
  name?: string;
  sv: SvRow[];
  model: string;
  iter: number;
}

const STORAGE_KEY = "nh_modellen"; // zelfde key als de vanilla tool

function isValidDoc(d: unknown): d is ModelDoc {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as ModelDoc).sv) &&
    typeof (d as ModelDoc).model === "string"
  );
}

// ─── localStorage ──────────────────────────────────────────────────────────
export function loadSavedModels(): ModelDoc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(isValidDoc) : [];
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
    const data = JSON.parse(json);
    if (!isValidDoc(data)) return null;
    return { sv: data.sv, model: data.model, iter: data.iter || 1000 };
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
    const data = JSON.parse(text);
    if (!isValidDoc(data)) return null;
    return { name: data.name, sv: data.sv, model: data.model, iter: data.iter || 1000 };
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
