import { toDecimalPoint } from "./decimal";

/**
 * Evalueert een expressie tot een getal, met variabele-substitutie uit `vars`.
 *
 * Ondersteunt naast de standaardvorm ook gangbare/Nederlandse notaties (beide
 * blijven werken): komma-decimaal, `*10^`, `pi`/`π`/`PI`, `wortel`/`√`, maaltekens
 * `×`/`·`, superscript `²`/`³`, en `log` (=log10) naast `ln`.
 *
 * Implementatie: eigen tokenizer + recursive-descent parser (géén eval). Elke
 * expressie wordt eenmalig gecompileerd tot een closure en gecachet, zodat een
 * simulatie van duizenden iteraties dezelfde regel niet steeds opnieuw parseert.
 * `^` is echte machtsverheffing (rechts-associatief, `10^-3` en `(a+b)^2` werken).
 */

type EvalFn = (vars: Record<string, number>) => number;

const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  wortel: Math.sqrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  exp: Math.exp,
  log: Math.log10, // log = log10
  ln: Math.log,
};

const CONSTANTS: Record<string, number> = { pi: Math.PI };

interface Token {
  type: "num" | "ident" | "op";
  value: string;
  num?: number;
}

const NUM_RE = /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/y;
const IDENT_RE = /[\p{L}_][\p{L}\p{N}_]*/uy;
const TWO_CHAR_OPS = new Set(["<=", ">=", "==", "!=", "&&", "||"]);
const ONE_CHAR_OPS = new Set([..."+-*/^()<>!,"]);

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    if ((c >= "0" && c <= "9") || c === ".") {
      NUM_RE.lastIndex = i;
      const m = NUM_RE.exec(src);
      if (m) {
        tokens.push({ type: "num", value: m[0], num: parseFloat(m[0]) });
        i = NUM_RE.lastIndex;
        continue;
      }
    }
    IDENT_RE.lastIndex = i;
    const im = IDENT_RE.exec(src);
    if (im) {
      tokens.push({ type: "ident", value: im[0] });
      i = IDENT_RE.lastIndex;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (TWO_CHAR_OPS.has(two)) {
      tokens.push({ type: "op", value: two });
      i += 2;
      continue;
    }
    if (ONE_CHAR_OPS.has(c)) {
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }
    throw new Error("onverwacht teken '" + c + "'");
  }
  return tokens;
}

/**
 * Recursive-descent parser. Prioriteit laag → hoog:
 * of (||) → en (&&) → vergelijking → +- → *\/ → unair -+! → ^ (rechts-assoc.).
 * Unaire min bindt zwakker dan ^: `-2^2` = -(2^2) = -4, maar in de exponent mag
 * hij wél: `2^-2` = 0,25.
 */
class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  parse(): EvalFn {
    const fn = this.orExpr();
    const t = this.tokens[this.pos];
    if (t) throw new Error("onverwacht '" + t.value + "'");
    return fn;
  }

  private takeOp(...ops: string[]): string | null {
    const t = this.tokens[this.pos];
    if (t && t.type === "op" && ops.includes(t.value)) {
      this.pos++;
      return t.value;
    }
    return null;
  }

  private orExpr(): EvalFn {
    let l = this.andExpr();
    while (this.takeOp("||")) {
      const a = l;
      const b = this.andExpr();
      l = (v) => (a(v) !== 0 || b(v) !== 0 ? 1 : 0);
    }
    return l;
  }

  private andExpr(): EvalFn {
    let l = this.cmpExpr();
    while (this.takeOp("&&")) {
      const a = l;
      const b = this.cmpExpr();
      l = (v) => (a(v) !== 0 && b(v) !== 0 ? 1 : 0);
    }
    return l;
  }

  private cmpExpr(): EvalFn {
    const a = this.addExpr();
    const op = this.takeOp("<", "<=", ">", ">=", "==", "!=");
    if (!op) return a;
    const b = this.addExpr();
    switch (op) {
      case "<":
        return (v) => (a(v) < b(v) ? 1 : 0);
      case "<=":
        return (v) => (a(v) <= b(v) ? 1 : 0);
      case ">":
        return (v) => (a(v) > b(v) ? 1 : 0);
      case ">=":
        return (v) => (a(v) >= b(v) ? 1 : 0);
      case "==":
        return (v) => (a(v) === b(v) ? 1 : 0);
      default:
        return (v) => (a(v) !== b(v) ? 1 : 0);
    }
  }

  private addExpr(): EvalFn {
    let l = this.mulExpr();
    for (;;) {
      const op = this.takeOp("+", "-");
      if (!op) return l;
      const a = l;
      const b = this.mulExpr();
      l = op === "+" ? (v) => a(v) + b(v) : (v) => a(v) - b(v);
    }
  }

  private mulExpr(): EvalFn {
    let l = this.unaryExpr();
    for (;;) {
      const op = this.takeOp("*", "/");
      if (!op) return l;
      const a = l;
      const b = this.unaryExpr();
      l = op === "*" ? (v) => a(v) * b(v) : (v) => a(v) / b(v);
    }
  }

  private unaryExpr(): EvalFn {
    const op = this.takeOp("-", "+", "!");
    if (op) {
      const r = this.unaryExpr();
      if (op === "-") return (v) => -r(v);
      if (op === "!") return (v) => (r(v) === 0 ? 1 : 0);
      return r;
    }
    return this.powExpr();
  }

  private powExpr(): EvalFn {
    const base = this.primary();
    if (this.takeOp("^")) {
      const exp = this.unaryExpr(); // rechts-associatief, unaire min toegestaan
      return (v) => Math.pow(base(v), exp(v));
    }
    return base;
  }

  private primary(): EvalFn {
    const t = this.tokens[this.pos];
    if (!t) throw new Error("expressie eindigt onverwacht");
    if (t.type === "num") {
      this.pos++;
      const n = t.num!;
      return () => n;
    }
    if (t.type === "ident") {
      this.pos++;
      const name = t.value;
      if (this.takeOp("(")) {
        const fn = FUNCTIONS[name.toLowerCase()];
        if (!fn) throw new Error(name + " is not defined");
        const arg = this.orExpr();
        if (!this.takeOp(")")) throw new Error("haakje ) ontbreekt");
        return (v) => fn(arg(v));
      }
      return (v) => {
        if (Object.hasOwn(v, name)) return v[name];
        const c = CONSTANTS[name.toLowerCase()];
        if (c !== undefined) return c;
        throw new Error(name + " is not defined");
      };
    }
    if (t.value === "(") {
      this.pos++;
      const inner = this.orExpr();
      if (!this.takeOp(")")) throw new Error("haakje ) ontbreekt");
      return inner;
    }
    throw new Error("onverwacht '" + t.value + "'");
  }
}

function compile(expr: string): EvalFn {
  let e = expr.trim();
  e = toDecimalPoint(e);
  // alternatieve & Nederlandse notaties → standaardvorm
  e = e.replace(/[×∙·]/g, "*"); // maaltekens × ∙ · → *
  e = e.replace(/²/g, "^2").replace(/³/g, "^3"); // superscript kwadraat/derdemacht
  e = e.replace(/π/g, "pi"); // pi-symbool → pi
  e = e.replace(/√\s*\(/g, "sqrt("); // wortelteken mét haakjes
  e = e.replace(/√\s*([\p{L}\p{N}_.]+)/gu, "sqrt($1)"); // wortelteken zónder haakjes
  return new Parser(tokenize(e)).parse();
}

// Compilatie-cache: modelregels worden per iteratie opnieuw geëvalueerd, maar
// hoeven maar één keer geparset te worden.
const cache = new Map<string, EvalFn>();

export function parseExpr(expr: string, vars: Record<string, number>): number {
  let fn = cache.get(expr);
  if (!fn) {
    fn = compile(expr);
    if (cache.size >= 500) cache.clear();
    cache.set(expr, fn);
  }
  return fn(vars);
}
