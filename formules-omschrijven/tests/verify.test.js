// Unit tests voor verify.js — draai met: node --test formules-omschrijven/tests/
// math.js wordt gestubd: ^ → ** en evaluatie via Function met scope-variabelen.
const test = require('node:test');
const assert = require('node:assert');

global.math = {
  evaluate(expr, scope) {
    const js = expr.replace(/\^/g, '**');
    const names = Object.keys(scope);
    const fn = new Function(...names, 'sqrt', 'sin', 'cos', 'tan', 'log', 'ln', 'abs', 'pi',
      `return (${js});`);
    return fn(...names.map(n => scope[n]), Math.sqrt, Math.sin, Math.cos, Math.tan,
      Math.log, Math.log, Math.abs, scope.pi !== undefined ? scope.pi : Math.PI);
  }
};

const { checkAnswer, lhsIsWrongVariable, unifyCompounds, atomOf, toDisplayLatex } = require('../js/verify.js');

// ── Samengestelde namen: subscript-, platte en Δ-notatie zijn gelijkwaardig ──
test('E_k met subscript-knop wordt goedgekeurd', () => {
  assert.equal(checkAnswer('v = sqrt(2*E_k/m)', 'sqrt((2*Ek)/m)', true), true);
});
test('Ek plat getypt wordt goedgekeurd', () => {
  assert.equal(checkAnswer('v = sqrt(2Ek/m)', 'sqrt((2*Ek)/m)', true), true);
});
test('Δ via Grieks-knop wordt goedgekeurd (vgem)', () => {
  assert.equal(checkAnswer('Δx = v_gem*Δt', 'vgem*dt', true), true);
});
test('dx plat getypt wordt goedgekeurd (vgem)', () => {
  assert.equal(checkAnswer('dx = vgem*dt', 'vgem*dt', true), true);
});
test('P_in met subscript en η wordt goedgekeurd', () => {
  assert.equal(checkAnswer('P_in = P_uit/η', 'Puit/eta', true), true);
});
test('cijfer-subscript F_1 wordt goedgekeurd (hefboom)', () => {
  assert.equal(checkAnswer('F_1 = (F_2*r_2)/r_1', '(F2*r2)/r1', true), true);
});
test('N_0 met subscript wordt goedgekeurd (halvering)', () => {
  assert.equal(checkAnswer('N = N_0*0.5^n', 'N0*0.5^n', true), true);
});

// ── Vals-positieven die de oude controle doorliet ──
test('N0*0.9^n wordt afgekeurd (was vals-goed door N·0 = 0)', () => {
  assert.equal(checkAnswer('N = N0*0.9^n', 'N0*0.5^n', true), false);
});
test('F1 = 4F wordt afgekeurd (was vals-goed door F·1-parsing)', () => {
  assert.equal(checkAnswer('F1 = 4F', '(F2*r2)/r1', true), false);
});

// ── Homogene uitdrukkingen: onafhankelijke steekproeven onderscheiden ze ──
test('homogeen fout antwoord wordt afgekeurd', () => {
  // a·b/c en a·c/b zijn beide homogeen graad 1; vaste multipliers zagen geen verschil
  assert.equal(checkAnswer('x = a*c/b', '(a*b)/c', false), false);
});

// ── Equivalente vormen blijven goed ──
test('equivalente herschrijving wordt goedgekeurd', () => {
  assert.equal(checkAnswer('m = C*T^2/(4*pi^2)', '(C*T^2)/(4*pi^2)', true), true);
});
test('wortel-als-macht wordt goedgekeurd', () => {
  assert.equal(checkAnswer('v = (2*Ek/m)^0.5', 'sqrt((2*Ek)/m)', true), true);
});
test('abstract: omgekeerde volgorde goedgekeurd', () => {
  assert.equal(checkAnswer('a = x/b', 'x/b', false), true);
});
test('abstract: fout antwoord afgekeurd', () => {
  assert.equal(checkAnswer('a = b/x', 'x/b', false), false);
});

// ── Linkerlid-controle ──
test('verkeerde bekende grootheid links wordt gesignaleerd', () => {
  assert.equal(lhsIsWrongVariable('b = x/b', 'a', ['b', 'x'], false), true);
});
test('juiste grootheid links is geen fout', () => {
  assert.equal(lhsIsWrongVariable('a = x/b', 'a', ['b', 'x'], false), false);
});
test('alleen rechterlid invullen is geen fout', () => {
  assert.equal(lhsIsWrongVariable('x/b', 'a', ['b', 'x'], false), false);
});
test('subscript-variant van target links is geen fout', () => {
  assert.equal(lhsIsWrongVariable('E_k = m*v^2/2', 'Ek', ['m', 'v'], true), false);
});
test('Δ-variant van target links is geen fout', () => {
  assert.equal(lhsIsWrongVariable('Δx = v_gem*Δt', 'dx', ['vgem', 'dt'], true), false);
});
test('andere solveFor-key links wordt gesignaleerd (hefboom)', () => {
  assert.equal(lhsIsWrongVariable('F_2 = (F_1*r_1)/r_2', 'F1', ['F2', 'r1', 'r2'], true), true);
});

// ── unifyCompounds bouwstenen ──
test('unifyCompounds: alle notatievarianten op hetzelfde atoom', () => {
  assert.equal(unifyCompounds('Ek'), 'E_k');
  assert.equal(unifyCompounds('E_k'), 'E_k');
  assert.equal(unifyCompounds('Deltat'), 'Delta_t');
  assert.equal(unifyCompounds('dt'), 'Delta_t');
  assert.equal(unifyCompounds('N0'), 'N_0');
  assert.equal(unifyCompounds('R1*R2'), 'R_1*R_2');
});
test('unifyCompounds: losse d blijft d (dikte in warmtestroom)', () => {
  assert.equal(unifyCompounds('(P*d)/(A*dT)'), '(P*d)/(A*Delta_T)');
});
test('atomOf: dx en Δx komen op hetzelfde atoom uit', () => {
  assert.equal(atomOf('dx', true), atomOf('Δx', true));
});

// ── Parser ──
test('deling binnen sqrt blijft binnen de wortel', () => {
  // regressie: groupDenominator trok de deling vroeger buiten sqrt(...)
  assert.equal(checkAnswer('v = sqrt(2*Ek/m)', 'sqrt((2*Ek)/m)', true), true);
  assert.equal(checkAnswer('v = sqrt(2*Ek)/m', 'sqrt((2*Ek)/m)', true), false);
});
test('impliciete vermenigvuldiging bindt sterker dan delen (v/2f)', () => {
  assert.equal(checkAnswer('f = v/2A/pi', 'vmax/(2*pi*A)', true), false);
  assert.equal(checkAnswer('f = vmax/(2pi*A)', 'vmax/(2*pi*A)', true), true);
});
test('kapotte invoer gooit een parsefout', () => {
  assert.throws(() => checkAnswer('a = sqrt(x/b', 'sqrt(x/b)', false));
});
test('ln is synoniem voor log', () => {
  assert.equal(checkAnswer('n = ln(N/N0)/ln(0.5)', 'log(N/N0)/log(0.5)', true), true);
});
test('halvering naar n: equivalente log-vorm met grondtal 2 goedgekeurd', () => {
  assert.equal(checkAnswer('n = log(N0/N)/log(2)', 'log(N/N0)/log(0.5)', true), true);
});
test('veerenergie: E_v met subscript wordt goedgekeurd', () => {
  assert.equal(checkAnswer('u = sqrt(2*E_v/C)', 'sqrt((2*Ev)/C)', true), true);
});

// ── Weergave (toDisplayLatex) ──
test('Δ-antwoord toont \\Delta zonder dubbele backslash', () => {
  assert.equal(toDisplayLatex('vgem*dt', 'dx'), '\\Delta{x} = v_{gem} \\cdot \\Delta{t}');
});
test('Δ in een breuk blijft één geheel', () => {
  assert.equal(toDisplayLatex('dx/vgem', 'dt'), '\\Delta{t} = \\dfrac{\\Delta{x}}{v_{gem}}');
});
test('decimale noemer wordt correct als breuk gezet', () => {
  assert.equal(toDisplayLatex('N/0.5^n', 'N0'), 'N_0 = \\dfrac{N}{0.5^n}');
});
test('sin-quotiënt wordt nette breuk', () => {
  assert.equal(toDisplayLatex('sin(i)/sin(r)', 'n'), 'n = \\dfrac{\\sin(i)}{\\sin(r)}');
});
test('breuk binnen sqrt blijft binnen de wortel (geneste haakjes)', () => {
  assert.equal(toDisplayLatex('sqrt((2*Ek)/m)', 'v'), 'v = \\sqrt{\\dfrac{2 \\cdot E_k}{m}}');
});
test('E_z wordt met subscript weergegeven', () => {
  assert.equal(toDisplayLatex('Ez/(g*h)', 'm'), 'm = \\dfrac{E_z}{g \\cdot h}');
});

// ── Sweep over alle formules uit formulas.js ──
const { FORMULAS } = require('../data/formulas.js');

test('elke solveFor-key heeft een answers-entry en een atoom', () => {
  for (const f of FORMULAS) {
    for (const t of f.solveFor) {
      assert.ok(f.answers[t.key], `${f.id}: geen answer voor ${t.key}`);
      assert.ok(atomOf(t.key, true), `${f.id}: geen atoom voor ${t.key}`);
    }
  }
});

test('elk referentie-antwoord keurt zichzelf goed (plat én als student-notatie)', () => {
  for (const f of FORMULAS) {
    for (const [key, canonical] of Object.entries(f.answers)) {
      // plat, exact zoals opgeslagen
      assert.equal(checkAnswer(`${key} = ${canonical}`, canonical, true), true,
        `${f.id} → ${key}: plat antwoord afgekeurd`);
    }
  }
});

test('een verkeerd antwoord (reciproque) wordt overal afgekeurd', () => {
  for (const f of FORMULAS) {
    for (const [key, canonical] of Object.entries(f.answers)) {
      // 1/antwoord is nooit gelijk aan het antwoord (bij random positieve waarden)
      assert.equal(checkAnswer(`${key} = 1/(${canonical})`, canonical, true), false,
        `${f.id} → ${key}: reciproque werd goedgekeurd`);
    }
  }
});
