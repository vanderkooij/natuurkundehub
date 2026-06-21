import { toDecimalPoint } from "./decimal";

/**
 * Evalueert een expressie tot een getal, met variabele-substitutie uit `vars`.
 *
 * Ondersteunt naast de standaardvorm ook gangbare/Nederlandse notaties (beide
 * blijven werken): komma-decimaal, `*10^`, `pi`/`π`/`PI`, `wortel`/`√`, maaltekens
 * `×`/`·`, superscript `²`/`³`, en `log` (=log10) naast `ln`.
 *
 * Gebruikt `eval` op de genormaliseerde, gesubstitueerde string — acceptabel voor
 * deze lokale edu-tool (geen netwerk/gebruikersinvoer van derden). Geport uit de
 * vanilla Modelleer-tool; gedrag bevroren via tests.
 */
export function parseExpr(expr: string, vars: Record<string, number>): number {
  let e = expr.trim();
  e = toDecimalPoint(e);
  // alternatieve & Nederlandse notaties → standaardvorm
  e = e.replace(/[×∙·]/g, "*"); // maaltekens × ∙ · → *
  e = e.replace(/²/g, "^2").replace(/³/g, "^3"); // superscript kwadraat/derdemacht
  e = e.replace(/π/g, "pi"); // pi-symbool → pi
  e = e.replace(/\bwortel\b/gi, "sqrt"); // Nederlands → sqrt
  e = e.replace(/√\s*\(/g, "sqrt("); // wortelteken mét haakjes
  e = e.replace(/√\s*([\w.]+)/g, "sqrt($1)"); // wortelteken zónder haakjes
  e = e.replace(/\*\s*10\s*\^\s*(-?[\d.]+)/g, (_m, p: string) => "*1e" + p);
  e = e.replace(/(\w[\w.]*|\))\s*\^\s*(\w[\w.]*|\()/g, "Math.pow($1,$2)");
  e = e
    .replace(/\bsqrt\b/g, "Math.sqrt")
    .replace(/\babs\b/g, "Math.abs")
    .replace(/\bsin\b/g, "Math.sin")
    .replace(/\bcos\b/g, "Math.cos")
    .replace(/\btan\b/g, "Math.tan")
    .replace(/\bexp\b/g, "Math.exp")
    .replace(/\blog\b/g, "Math.log10") // log = log10; vóór ln want 'Math.log' bevat 'log'
    .replace(/\bln\b/g, "Math.log")
    .replace(/\bpi\b/gi, "Math.PI"); // één pass, case-insensitive (zie regressietest)
  const keys = Object.keys(vars).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const re = new RegExp(
      "(?<!Math\\.)(?<![\\w.])" +
        k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "(?![\\w.])",
      "g",
    );
    e = e.replace(re, "(" + vars[k] + ")");
  }
  // eslint-disable-next-line no-eval
  return eval(e) as number;
}
