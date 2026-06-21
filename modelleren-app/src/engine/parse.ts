import { parseExpr } from "./expr";

export interface LineResult {
  skip?: boolean;
  stop?: boolean;
  error?: string;
  assign?: Record<string, number>;
}

/**
 * Splitst het deel ná "=" in een waarde en een (optionele) eenheid.
 * De waarde mag een formule zijn (bv. 1,5*10^-3, 0,25*pi*d², Vtot-(mwater/rho)).
 * Begint het "eenheid"-deel met een operator of bevat het haakjes, dan hoort het
 * bij de formule en is er geen losse eenheid.
 */
export function splitValueUnit(rest: string): { value: string; unit: string } {
  const sp = rest.search(/\s/);
  if (sp < 0) return { value: rest, unit: "" };
  const value = rest.slice(0, sp);
  const unit = rest.slice(sp).trim();
  if (/^[+\-*/^]/.test(unit) || /[()]/.test(unit)) return { value: rest, unit: "" };
  return { value, unit };
}

/** True als alle haakjes in `s` netjes sluiten. */
export function checkParens(s: string): boolean {
  let d = 0;
  for (const c of s) {
    if (c === "(") d++;
    else if (c === ")") d--;
  }
  return d === 0;
}

function undefVarError(err: unknown, lineNum: number): string {
  const msg = (err as Error)?.message ?? "";
  const m = msg.match(/(\w+) is not defined/);
  return "Regel " + lineNum + ": variabele '" + (m ? m[1] : msg) + "' is niet gedefinieerd";
}

/**
 * Verwerkt één modelregel tegen de huidige `vars`. Geeft een resultaat-object met
 * één van: `skip`, `stop`, `error` of `assign`. Geport uit de vanilla tool.
 */
export function parseLine(
  line: string,
  vars: Record<string, number>,
  lineNum: number,
): LineResult {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("'")) return { skip: true };
  if (trimmed.toUpperCase() === "STOP") return { stop: true };

  // als ... dan var = expr  (haakjes optioneel)
  const condMatch = trimmed.match(/^als\s+(.+?)\s+dan\s+(\w+)\s*=\s*(.+)$/i);
  if (condMatch) {
    let cond = condMatch[1].trim();
    if (cond.startsWith("(") && cond.endsWith(")")) cond = cond.slice(1, -1).trim();
    const vname = condMatch[2];
    const valExpr = condMatch[3];
    if (!checkParens(cond)) return { error: "Regel " + lineNum + ": haakjes sluiten niet in conditie" };
    let condVal = false;
    try {
      condVal = !!parseExpr(cond, vars);
    } catch (err) {
      return { error: undefVarError(err, lineNum) };
    }
    if (condVal) {
      if (!checkParens(valExpr)) return { error: "Regel " + lineNum + ": haakjes sluiten niet" };
      try {
        const v = parseExpr(valExpr, vars);
        if (isNaN(v)) return { error: "Regel " + lineNum + ": resultaat is NaN" };
        if (!isFinite(v)) return { error: "Regel " + lineNum + ": deling door nul of oneindig getal" };
        return { assign: { [vname]: v } };
      } catch (err) {
        return { error: undefVarError(err, lineNum) };
      }
    }
    return {};
  }

  // als ... dan STOP
  const condStopMatch = trimmed.match(/^als\s+(.+?)\s+dan\s+STOP\s*$/i);
  if (condStopMatch) {
    let cond = condStopMatch[1].trim();
    if (cond.startsWith("(") && cond.endsWith(")")) cond = cond.slice(1, -1).trim();
    if (!checkParens(cond)) return { error: "Regel " + lineNum + ": haakjes sluiten niet in conditie" };
    let condVal = false;
    try {
      condVal = !!parseExpr(cond, vars);
    } catch (err) {
      return { error: undefVarError(err, lineNum) };
    }
    if (condVal) return { stop: true };
    return {};
  }

  // syntax: als zonder dan
  if (/^als\b/i.test(trimmed)) {
    return { error: "Regel " + lineNum + ": als zonder dan" };
  }

  // gewone toewijzing: var = expr
  const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
  if (assignMatch) {
    const vname = assignMatch[1];
    const valExpr = assignMatch[2];
    if (!checkParens(valExpr)) return { error: "Regel " + lineNum + ": haakjes sluiten niet" };
    try {
      const v = parseExpr(valExpr, vars);
      if (isNaN(v)) return { error: "Regel " + lineNum + ": resultaat is NaN (controleer de formule)" };
      if (!isFinite(v)) return { error: "Regel " + lineNum + ": deling door nul of oneindig getal" };
      return { assign: { [vname]: v } };
    } catch (err) {
      const msg = (err as Error)?.message ?? "";
      const m = msg.match(/(\w+) is not defined/);
      if (m) return { error: "Regel " + lineNum + ": variabele '" + m[1] + "' is niet gedefinieerd" };
      return { error: "Regel " + lineNum + ": syntaxfout in expressie" };
    }
  }

  // geen geldig =
  if (trimmed.length > 0) return { error: "Regel " + lineNum + ": geen toewijzing (ontbreekt = teken)" };
  return {};
}

/**
 * Lichte syntax-pre-validatie: geeft de 1-based regelnummers terug die fout zijn
 * (als-zonder-dan, ongebalanceerde haakjes, of een regel zonder `=`).
 */
export function validateSyntax(lines: string[]): number[] {
  const errors: number[] = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t || t.startsWith("//") || t.startsWith("'") || t.toUpperCase() === "STOP") return;
    if (/^als\b/i.test(t) && !/\bdan\b/i.test(t)) {
      errors.push(i + 1);
      return;
    }
    if (!checkParens(t)) {
      errors.push(i + 1);
      return;
    }
    if (!/^als\b/i.test(t) && !t.includes("=")) {
      errors.push(i + 1);
    }
  });
  return errors;
}
