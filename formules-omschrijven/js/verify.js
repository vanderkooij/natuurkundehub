/**
 * verify.js — Verificatielogica voor Formules Omschrijven
 * Vereist: math.js geladen voor dit bestand
 */

// Samengestelde namen die als één eenheid behandeld moeten worden
// key = platgeslagen naam in answers/canonical, value = LaTeX met subscript
const COMPOUND_NAMES = {
  'lambdamax': 'lambda_{max}',
  'vmax':      'v_{max}',
  'vgem':      'v_{gem}',
  'agem':      'a_{gem}',
  'Fmpz':      'F_{mpz}',
  'Fres':      'F_{res}',
  'Fg':        'F_g',
  'Fz':        'F_z',
  'Fv':        'F_v',
  'Ek':        'E_k',
  'Ep':        'E_p',
  'Ez':        'E_z',
  'Ev':        'E_v',
  'Rtot':      'R_{tot}',
  'Puit':      'P_{uit}',
  'Pin':       'P_{in}',
  'kW':        'k_W',
  'N0':        'N_0',
  'n12':       'n_{12}',
  'R1':        'R_1',
  'R2':        'R_2',
  'F1':        'F_1',
  'F2':        'F_2',
  'r1':        'r_1',
  'r2':        'r_2',
  'c1':        'c_1',
  'c2':        'c_2',
  'n1':        'n_1',
  'n2':        'n_2',
  'dx':        'Delta_x',
  'dt':        'Delta_t',
  'dv':        'Delta_v',
  'dV':        'Delta_V',
  'dT':        'Delta_T',
};
const GREEK_NAMES = ['lambda','Delta','alpha','beta','gamma','delta',
                     'omega','sigma','theta','phi','eta','rho','pi'];

// Alle notatievarianten van een samengestelde naam → één atomaire vorm met
// underscore, zodat de tokenizer hem als één token leest. Wordt toegepast op
// zowel leerling-invoer als het referentie-antwoord (na underscore-collaps),
// zodat 'E_k', 'Ek', 'Δt', 'dt' etc. allemaal op hetzelfde token uitkomen.
const COMPOUND_ATOMS = {
  'lambdamax': 'lambda_max',
  'vmax':   'v_max',
  'vgem':   'v_gem',
  'agem':   'a_gem',
  'Fmpz':   'F_mpz',
  'Fres':   'F_res',
  'Fg':     'F_g',
  'Fz':     'F_z',
  'Fv':     'F_v',
  'Ek':     'E_k',
  'Ep':     'E_p',
  'Ez':     'E_z',
  'Ev':     'E_v',
  'Rtot':   'R_tot',
  'Puit':   'P_uit',
  'Pin':    'P_in',
  'kW':     'k_W',
  'Deltax': 'Delta_x',
  'Deltat': 'Delta_t',
  'Deltav': 'Delta_v',
  'DeltaV': 'Delta_V',
  'DeltaT': 'Delta_T',
  'dx':     'Delta_x',
  'dt':     'Delta_t',
  'dv':     'Delta_v',
  'dV':     'Delta_V',
  'dT':     'Delta_T',
};
const COMPOUND_ATOM_KEYS = Object.keys(COMPOUND_ATOMS).sort((a, b) => b.length - a.length);

// Superscripttekens die een Chromebook (of een dood dakje op andere indelingen)
// van '^' plus een cijfer maakt.
const SUPERSCRIPT_CHARS = {
  '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9',
  '⁺':'+','⁻':'-',
};

// Gedeelde voorbewerking: spaties weg, Grieks/LaTeX naar namen, haakjes-accolades strippen
function preprocess(expr) {
  if (!expr || typeof expr !== 'string') return '';
  let s = expr.trim().replace(/\s+/g, '');
  // Chromebooks maken van een dakje gevolgd door een cijfer één superscriptteken:
  // wie v^2 typt houdt v² over. Terugvertalen, anders wordt een goed antwoord afgekeurd.
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, run =>
    '^(' + run.split('').map(c => SUPERSCRIPT_CHARS[c]).join('') + ')');
  const greekMap ={'α':'alpha','β':'beta','γ':'gamma','δ':'delta','η':'eta','λ':'lambda','ρ':'rho','ω':'omega','φ':'phi','Δ':'Delta','π':'pi','σ':'sigma'};
  for (const [sym, name] of Object.entries(greekMap)) s = s.split(sym).join(name);
  const latexMap = {'\\alpha':'alpha','\\beta':'beta','\\gamma':'gamma','\\delta':'delta','\\eta':'eta','\\lambda':'lambda','\\rho':'rho','\\omega':'omega','\\phi':'phi','\\Delta':'Delta','\\pi':'pi','\\cdot':'*','\\times':'*'};
  for (const [cmd, repl] of Object.entries(latexMap)) s = s.split(cmd).join(repl);
  s = s.replace(/\\/g, '').replace(/\{([^}]*)\}/g, '$1');
  return s;
}

// Unificeer samengestelde namen naar atomaire underscore-vorm.
// 1. underscores collapsen ('v_gem' → 'vgem') zodat alle varianten plat zijn
// 2. bekende platte namen → underscore-vorm (langste eerst, met woordgrens)
// 3. generiek: letter direct gevolgd door cijfers = subscript ('R1' → 'R_1')
function unifyCompounds(s) {
  s = s.replace(/_/g, '');
  for (const flat of COMPOUND_ATOM_KEYS) {
    s = s.replace(new RegExp(`(?<![a-zA-Z])${flat}(?![a-zA-Z0-9])`, 'g'), COMPOUND_ATOMS[flat]);
  }
  s = s.replace(/([a-zA-Z])(\d+)/g, '$1_$2');
  return s;
}

function normalize(expr, useCompounds) {
  let s = preprocess(expr);
  if (s.includes('=')) s = s.split('=').slice(1).join('=');
  if (useCompounds) s = unifyCompounds(s);
  return s;
}

// Atomaire naam van een grootheid-key (bijv. 'dx' → 'Deltax', 'Ek' → 'Ek')
function atomOf(key, useCompounds) {
  let s = preprocess(key);
  if (useCompounds) s = unifyCompounds(s);
  const tokens = tokenize(s);
  if (tokens.length === 1 && tokens[0].type === 'NAME') return tokens[0].value;
  return null;
}

// Linkerlid van de invoer als enkelvoudige naam, of null als er geen '=' is
// of het linkerlid geen losse grootheid is (dan niet beoordelen).
function lhsName(userInput, useCompounds) {
  if (!userInput || typeof userInput !== 'string' || !userInput.includes('=')) return null;
  let s = preprocess(userInput).split('=')[0];
  if (useCompounds) s = unifyCompounds(s);
  const tokens = tokenize(s);
  if (tokens.length === 1 && tokens[0].type === 'NAME') return tokens[0].value;
  return null;
}

// True als de leerling aantoonbaar een ANDERE bekende grootheid heeft
// vrijgemaakt dan gevraagd. Onbekende of ontbrekende linkerleden keuren we
// niet af (geen valse afwijzingen door notatieverschillen).
function lhsIsWrongVariable(userInput, targetKey, otherKeys, useCompounds) {
  const lhs = lhsName(userInput, useCompounds);
  if (!lhs) return false;
  const target = atomOf(targetKey, useCompounds);
  if (target && lhs === target) return false;
  const others = (otherKeys || []).map(k => atomOf(k, useCompounds)).filter(Boolean);
  return others.includes(lhs);
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  const FUNCS = ['sqrt','sin','cos','tan','log','ln','abs'];
  while (i < expr.length) {
    const ch = expr[i];
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let name = '';
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) name += expr[i++];
      let sub = '';
      if (i < expr.length && expr[i] === '_') {
        i++;
        while (i < expr.length && /[a-zA-Z0-9]/.test(expr[i])) sub += expr[i++];
      }
      if (FUNCS.includes(name) && i < expr.length && expr[i] === '(') {
        tokens.push({ type: 'FUNC', value: name });
      } else if (GREEK_NAMES.includes(name)) {
        tokens.push({ type: 'NAME', value: sub ? name + sub : name });
      } else {
        let matched = false;
        for (const g of [...GREEK_NAMES].sort((a,b) => b.length - a.length)) {
          if (name.startsWith(g)) {
            tokens.push({ type: 'NAME', value: g });
            const rest = name.slice(g.length);
            for (const letter of rest) {
              tokens.push({ type: 'NAME', value: letter });
            }
            matched = true;
            break;
          }
        }
        if (!matched) {
          if (sub) {
            tokens.push({ type: 'NAME', value: name + sub });
          } else {
            for (const letter of name) {
              tokens.push({ type: 'NAME', value: letter });
            }
          }
        }
      }
      continue;
    }
    if ('+-*/^'.includes(ch)) { tokens.push({ type: 'OP', value: ch }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')' }); i++; continue; }
    i++;
  }
  return tokens;
}

function insertImplicitMul(tokens) {
  const result = [];
  for (let i = 0; i < tokens.length; i++) {
    result.push(tokens[i]);
    if (i + 1 < tokens.length) {
      const cur = tokens[i], nxt = tokens[i + 1];
      if (
        (cur.type === 'NUMBER'  && (nxt.type === 'NAME' || nxt.type === 'LPAREN' || nxt.type === 'FUNC')) ||
        (cur.type === 'NAME'    && (nxt.type === 'NAME' || nxt.type === 'NUMBER' || nxt.type === 'LPAREN' || nxt.type === 'FUNC')) ||
        (cur.type === 'RPAREN'  && (nxt.type === 'NAME' || nxt.type === 'NUMBER' || nxt.type === 'LPAREN' || nxt.type === 'FUNC'))
      ) result.push({ type: 'OP', value: '*' });
    }
  }
  return result;
}

function tokensToString(tokens) { return tokens.map(t => t.value).join(''); }
function collectVarNames(tokens) { return [...new Set(tokens.filter(t => t.type === 'NAME').map(t => t.value))]; }

// Willekeurige positieve waarden per variabele. Drie onafhankelijke
// steekproeven onderscheiden ook uitdrukkingen die homogeen zijn in alle
// variabelen (waar de oude vaste-multiplier-aanpak niets aan toevoegde).
function buildScope(varNames) {
  const scope = {};
  for (const name of varNames) scope[name] = 1.1 + Math.random() * 8.8;
  return scope;
}

// Zet een tokenarray om naar een volledig gehaakte evaluatiestring.
// Conventie: (impliciete) vermenigvuldiging bindt sterker dan delen, zodat
// 'v/2f' als v/(2·f) telt. Gooit een Error bij onverwachte invoer, zodat de
// aanroeper "kan invoer niet verwerken" kan tonen i.p.v. stil fout te gaan.
function parseToEvalString(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v) => peek() && peek().type === 'OP' && peek().value === v;

  function expr() {
    let left = term();
    while (isOp('+') || isOp('-')) {
      const op = tokens[pos++].value;
      left = `(${left}${op}${term()})`;
    }
    return left;
  }
  function term() { // deling bindt zwakker dan vermenigvuldiging
    let left = chain();
    while (isOp('/')) {
      pos++;
      left = `(${left}/${chain()})`;
    }
    return left;
  }
  function chain() {
    let left = power();
    while (isOp('*')) {
      pos++;
      left = `(${left}*${power()})`;
    }
    return left;
  }
  function power() {
    const base = unary();
    if (isOp('^')) {
      pos++;
      return `(${base}^${unary()})`;
    }
    return base;
  }
  function unary() {
    if (isOp('-') || isOp('+')) {
      const op = tokens[pos++].value;
      return op === '-' ? `(-${unary()})` : unary();
    }
    return atom();
  }
  function atom() {
    const t = tokens[pos++];
    if (!t) throw new Error('Onverwacht einde van invoer');
    if (t.type === 'NUMBER' || t.type === 'NAME') return t.value;
    if (t.type === 'FUNC' || t.type === 'LPAREN') {
      // math.js kent geen 'ln'; behandel het als synoniem van log (natuurlijk)
      const fname = t.type === 'FUNC' ? (t.value === 'ln' ? 'log' : t.value) : '';
      if (t.type === 'FUNC') {
        const open = tokens[pos++];
        if (!open || open.type !== 'LPAREN') throw new Error(`Haakje verwacht na ${fname}`);
      }
      const inner = expr();
      const close = tokens[pos++];
      if (!close || close.type !== 'RPAREN') throw new Error('Sluithaakje ontbreekt');
      return `${fname}(${inner})`;
    }
    throw new Error(`Onverwacht teken: ${t.value}`);
  }

  const out = expr();
  if (pos < tokens.length) throw new Error(`Onverwacht teken: ${tokens[pos].value}`);
  return out;
}

// Groepeer noemer: a/b*c → a/(b*c) en teller: a*b/c → (a*b)/c
// (alleen nog gebruikt in het weergavepad; evaluatie loopt via parseToEvalString)
function groupDenominator(s) {
  s = s.replace(
    /([a-zA-Z0-9_^()]+(?:\*[a-zA-Z0-9_^()]+)+)\/([a-zA-Z0-9_^()]+)(?!\*)/g,
    (match, num, den) => `(${num})/${den}`
  );
  s = s.replace(
    /([a-zA-Z0-9_^()]+)\/([a-zA-Z0-9_^()]+(?:\*[a-zA-Z0-9_^()]+)+)/g,
    (match, num, den) => `${num}/(${den})`
  );
  return s;
}

function _dbg(...args) {
  if (typeof window !== 'undefined' && window.NH_DEBUG) console.log(...args);
}

function checkAnswer(userInput, correctExpr, useCompounds) {
  const userNorm = normalize(userInput, useCompounds);
  const corrNorm = normalize(correctExpr, useCompounds);
  if (!userNorm || !corrNorm) { _dbg('[verify] Lege invoer'); return false; }
  const userTokens = insertImplicitMul(tokenize(userNorm));
  const corrTokens = insertImplicitMul(tokenize(corrNorm));
  const userStr = parseToEvalString(userTokens);
  const corrStr = parseToEvalString(corrTokens);
  // Variabelen uit de tokenarrays halen: in de string-vorm is de
  // underscore-markering weg en zou hertokeniseren compounds weer splitsen
  const allVars = [...new Set([...collectVarNames(userTokens), ...collectVarNames(corrTokens)])];
  _dbg('[verify] Gebruiker:', userStr, '| Correct:', corrStr, '| Vars:', allVars);
  let passes = 0, trials = 0;
  while (passes < 3 && trials < 12) {
    trials++;
    const scope = buildScope(allVars);
    let userVal, corrVal;
    try { userVal = math.evaluate(userStr, { ...scope }); } catch(e) { _dbg('[verify] Eval fout gebruiker:', e.message); return false; }
    try { corrVal = math.evaluate(corrStr, { ...scope }); } catch(e) { _dbg('[verify] Eval fout correct:', e.message); return false; }
    if (userVal == null || corrVal == null) return false;
    // Ongeldig punt (bijv. negatief onder een wortel): nieuwe steekproef
    if (!isFinite(userVal) || !isFinite(corrVal)) continue;
    _dbg('[verify] trial:', trials, '| user:', userVal, '| corr:', corrVal);
    if (Math.abs(userVal - corrVal) / (Math.abs(corrVal) || 1) > 1e-6) return false;
    passes++;
  }
  if (passes < 3) return false;
  _dbg('[verify] GOED');
  return true;
}

// ── toDisplayLatex ───────────────────────────────────────────────────────────

// Vervang elke sqrt(...)-aanroep (met balans van geneste haakjes) door fn(inner)
function replaceSqrtCalls(s, fn) {
  let out = '', i = 0;
  while (i < s.length) {
    const idx = s.indexOf('sqrt(', i);
    if (idx === -1) { out += s.slice(i); break; }
    out += s.slice(i, idx);
    let depth = 1, j = idx + 5;
    while (j < s.length && depth > 0) {
      if (s[j] === '(') depth++;
      else if (s[j] === ')') depth--;
      j++;
    }
    out += fn(s.slice(idx + 5, depth === 0 ? j - 1 : j));
    i = j;
  }
  return out;
}

function convertDivToFrac(s) {
  // '.' voor getallen als 0.5, '@' voor functie-placeholders uit toDisplayLatex
  let prev = '', n = 0;
  while (s !== prev && n++ < 10) {
    prev = s;
    s = s.replace(/\(([^()]+)\)\/\(([^()]+)\)/g, '\\dfrac{$1}{$2}');
    s = s.replace(/([a-zA-Z0-9_{}\\^.@]+)\/\(([^()]+)\)/g, '\\dfrac{$1}{$2}');
    s = s.replace(/\(([^()]+)\)\/([a-zA-Z0-9_{}\\^.@]+)/g, '\\dfrac{$1}{$2}');
    s = s.replace(/([a-zA-Z0-9_{}\\^.@]+)\/([a-zA-Z0-9_{}\\^.@]+)/g, '\\dfrac{$1}{$2}');
  }
  return s;
}

function toDisplayLatex(expr, target) {
  if (!expr) return '';

  // Stap 0: vervang samengestelde namen door versie met underscore VOOR tokenizing
  // zodat Ek, vmax etc. als één token worden behandeld (name+sub patroon)
  let expr2 = expr;
  for (const [flat, sub] of Object.entries(COMPOUND_NAMES).sort((a,b) => b[0].length - a[0].length)) {
    // Vervang alleen als het een losstaand woord is (niet deel van langere naam)
    expr2 = expr2.replace(new RegExp(`(?<![a-zA-Z])${flat}(?![a-zA-Z0-9])`, 'g'), sub.replace('_', '_'));
  }

  // Stap 1: normaliseer en tokenize
  let s = tokensToString(insertImplicitMul(tokenize(normalize(expr2))));

  // Stap 2: groepeer noemer/teller — bescherm sqrt(...) met een placeholder
  // zodat de groepering niet over functiehaakjes heen grijpt
  const sqStore = [];
  s = replaceSqrtCalls(s, inner => { sqStore.push(inner); return `@SQ${sqStore.length - 1}@`; });
  s = groupDenominator(s);

  // Stap 2b: verwijder overbodige haakjes
  s = s.replace(/\(\(([^()]+)\)\)/g, '($1)');
  s = s.replace(/\/\(([a-zA-Z0-9_^]+)\)/g, '/$1');

  // Placeholders terugzetten
  s = s.replace(/@SQ(\d+)@/g, (m, i) => `sqrt(${sqStore[i]})`);

  // Stap 3: subscriptnamen terug naar LaTeX (langste eerst)
  const subMap = {
    'lambdamax': '\\lambda_{max}',
    'vmax':  'v_{max}', 'vgem':  'v_{gem}', 'agem':  'a_{gem}',
    'Fmpz':  'F_{mpz}', 'Fres':  'F_{res}', 'Fg': 'F_g', 'Fz': 'F_z', 'Fv': 'F_v',
    'Ek': 'E_k', 'Ep': 'E_p', 'Ez': 'E_z', 'Ev': 'E_v',
    'Rtot':  'R_{tot}', 'Puit':  'P_{uit}', 'Pin': 'P_{in}',
    'kW': 'k_W', 'N0': 'N_0', 'n12': 'n_{12}',
    'R1': 'R_1', 'R2': 'R_2', 'F1': 'F_1', 'F2': 'F_2',
    'r1': 'r_1', 'r2': 'r_2', 'c1': 'c_1', 'c2': 'c_2',
    'n1': 'n_1', 'n2': 'n_2',
    // accoladevorm i.p.v. spatie, zodat de breukconversie 'Δx' als één geheel ziet
    'Deltax': '\\Delta{x}', 'Deltat': '\\Delta{t}', 'Deltav': '\\Delta{v}',
    'DeltaV': '\\Delta{V}', 'DeltaT': '\\Delta{T}',
    'dx': '\\Delta{x}', 'dt': '\\Delta{t}', 'dv': '\\Delta{v}',
    'dV': '\\Delta{V}', 'dT': '\\Delta{T}',
  };
  for (const [flat, latex] of Object.entries(subMap).sort((a,b) => b[0].length - a[0].length))
    s = s.split(flat).join(latex);

  // Stap 4: Griekse namen → LaTeX (langste eerst)
  // Lookbehind voorkomt dat 'Delta' binnen een al geplaatst '\Delta t' (uit
  // stap 3) of binnen een andere naam nogmaals wordt vervangen
  const greekLatex = {
    'lambda':'\\lambda','rho':'\\rho','eta':'\\eta','omega':'\\omega',
    'alpha':'\\alpha','beta':'\\beta','gamma':'\\gamma','delta':'\\delta',
    'phi':'\\phi','Delta':'\\Delta','pi':'\\pi',
  };
  for (const [name, latex] of Object.entries(greekLatex).sort((a,b) => b[0].length - a[0].length))
    s = s.replace(new RegExp(`(?<![\\\\a-zA-Z])${name}`, 'g'), latex);

  // Stap 5: machten
  s = s.replace(/\^([a-zA-Z0-9]{2,})/g, '^{$1}');

  // Stap 6: sqrt — verwerk de breuk binnen de wortel eerst
  // (balanced scan, dus geneste haakjes binnen sqrt zijn geen probleem)
  s = replaceSqrtCalls(s, (inner) => {
    let inn = groupDenominator(inner);
    inn = inn.replace(/\(\(([^()]+)\)\)/g, '($1)');
    inn = inn.replace(/\(([^()]+)\)\/\(([^()]+)\)/g, '\\dfrac{$1}{$2}');
    inn = inn.replace(/([a-zA-Z0-9_{}\\^]+)\/\(([^()]+)\)/g, '\\dfrac{$1}{$2}');
    inn = inn.replace(/\(([^()]+)\)\/([a-zA-Z0-9_{}\\^]+)/g, '\\dfrac{$1}{$2}');
    inn = inn.replace(/([a-zA-Z0-9_{}\\^]+)\/([a-zA-Z0-9_{}\\^]+)/g, '\\dfrac{$1}{$2}');
    inn = inn.replace(/\*/g, ' \\cdot ');
    return `\\sqrt{${inn}}`;
  });

  // Stap 7: breuken buiten sqrt — bescherm functie-aanroepen (sin, cos, ...)
  // met een placeholder zodat '(i)/sin' niet als breuk wordt gelezen
  const fnStore = [];
  s = s.replace(/\b(sin|cos|tan|log|ln|abs)\(([^()]*)\)/g, (m, f, arg) => {
    fnStore.push(`\\${f}(${arg})`);
    return `@FN${fnStore.length - 1}@`;
  });
  s = convertDivToFrac(s);
  s = s.replace(/@FN(\d+)@/g, (m, i) => fnStore[i]);

  // Stap 8: vermenigvuldiging
  s = s.replace(/\*/g, ' \\cdot ');

  // Stap 9: doelgrootheid weergeven
  // target is de key (bijv. 'lambdamax'), haal de LaTeX-display op
  let displayTarget = target;
  if (subMap[target]) displayTarget = subMap[target];
  else if (greekLatex[target]) displayTarget = greekLatex[target];

  return `${displayTarget} = ${s}`;
}

// Node-export voor unit tests (genegeerd in de browser)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    preprocess, unifyCompounds, normalize, atomOf, lhsName, lhsIsWrongVariable,
    tokenize, insertImplicitMul, tokensToString, collectVarNames,
    groupDenominator, parseToEvalString, checkAnswer, toDisplayLatex,
    COMPOUND_NAMES, COMPOUND_ATOMS,
  };
}
