import { parseExpr } from "./expr";
import { parseLine } from "./parse";

export interface SvRow {
  name: string;
  value: string;
  unit: string;
}

export interface SimResult {
  /** Snapshot van alle variabelen per iteratie (begin-van-iteratie toestand). */
  data: Record<string, number>[];
  /** Variabelenamen incl. tussenvariabelen, in ontdek-volgorde. */
  varNames: string[];
  /** True als de simulatie via een STOP-conditie eindigde. */
  stopped: boolean;
  /** Niet-null bij een blokkerende fout (startwaarde, ontbrekende dt, runtime). */
  error: string | null;
  /** Namen van startwaarden waarvan de formule niet (eenduidig) te berekenen was. */
  svErrors: string[];
}

/** Dry-run van iteratie 0 om ongedefinieerde variabelen vroeg te vangen. */
export function checkFirstIteration(
  lines: string[],
  startVars: Record<string, number>,
): string | null {
  const workVars: Record<string, number> = Object.assign({}, startVars);
  for (let li = 0; li < lines.length; li++) {
    const res = parseLine(lines[li], workVars, li + 1);
    if (res.error) return res.error;
    if (res.assign) Object.assign(workVars, res.assign);
    if (res.stop) break;
  }
  return null;
}

/**
 * Evalueert de startwaarden in volgorde. Een waarde mag een formule zijn die
 * eenmalig wordt berekend en alleen variabelen gebruikt die er bóven staan.
 */
export function evalStartwaarden(sv: SvRow[]): {
  vars: Record<string, number>;
  svErrors: string[];
} {
  const vars: Record<string, number> = {};
  const svErrors: string[] = [];
  for (const row of sv) {
    const name = row.name.trim();
    if (!name) continue;
    const raw = String(row.value).trim();
    let val = 0;
    if (raw !== "") {
      let r: number | undefined;
      try {
        r = parseExpr(raw, vars);
      } catch {
        r = undefined;
      }
      if (typeof r === "number" && isFinite(r)) val = r;
      else svErrors.push(name);
    }
    vars[name] = val;
  }
  return { vars, svErrors };
}

/**
 * Voert het model uit: leest startwaarden, valideert, en itereert. Puur — geen
 * DOM, geen status-UI, geen eenheden-waarschuwingen (die horen in de UI-laag).
 */
export function simulate(sv: SvRow[], modelLines: string[], maxIter: number): SimResult {
  const empty: SimResult = { data: [], varNames: [], stopped: false, error: null, svErrors: [] };

  const { vars, svErrors } = evalStartwaarden(sv);
  if (svErrors.length) {
    return {
      ...empty,
      svErrors,
      error:
        "Startwaarde voor " +
        svErrors.join(", ") +
        " kon niet berekend worden. Gebruik in een startformule alleen variabelen die er bóven staan.",
    };
  }

  const dtInModel = modelLines.some((l) => /^dt\s*=/.test(l.trim()));
  if (!("dt" in vars) && !dtInModel) {
    return { ...empty, error: "Voeg dt toe als startwaarde of definieer het als eerste modelregel." };
  }
  if (!("t" in vars)) vars.t = 0;

  const firstErr = checkFirstIteration(modelLines, vars);
  if (firstErr) return { ...empty, error: firstErr };

  const clampedMax = Math.min(10000, Math.max(1, Math.floor(maxIter) || 1000));

  // ontdek variabelenamen (ook tussenvariabelen) uit de modelregels
  const allVarNames = Object.keys(vars);
  modelLines.forEach((l) => {
    const m = l.trim().match(/^(\w+)\s*=/);
    if (m && !allVarNames.includes(m[1])) allVarNames.push(m[1]);
    const cm = l.trim().match(/^als\s+.+?\s+dan\s+(\w+)\s*=/i);
    if (cm && !allVarNames.includes(cm[1])) allVarNames.push(cm[1]);
  });

  const data: Record<string, number>[] = [];
  let stopped = false;
  let errorMsg: string | null = null;

  for (let iter = 0; iter < clampedMax; iter++) {
    data.push(Object.assign({}, vars));
    // workVars: per regel bijgewerkt zodat tussenvariabelen direct beschikbaar zijn
    const workVars: Record<string, number> = Object.assign({}, vars);
    for (let li = 0; li < modelLines.length; li++) {
      const res = parseLine(modelLines[li], workVars, li + 1);
      if (res.stop) {
        stopped = true;
        break;
      }
      if (res.error) {
        errorMsg = "Fout in iteratie " + (iter + 1) + ", " + res.error;
        stopped = true;
        break;
      }
      if (res.assign) Object.assign(workVars, res.assign);
    }
    Object.assign(vars, workVars);
    if (stopped) break;
  }

  const varNames = allVarNames.filter((v) => v in vars);
  return { data, varNames, stopped, error: errorMsg, svErrors: [] };
}
