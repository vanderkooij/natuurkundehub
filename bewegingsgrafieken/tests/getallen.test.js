// Tests voor de rekenvragen (level met getallen) van Bewegingsgrafieken.
// Draaien met: npm run test:bewegingen
const test = require('node:test');
const assert = require('node:assert');
const B = require('../js/beweging.js');
const G = require('../js/getallen.js');

function zaad(n) {
  let s = n >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

function vragen(spoor, n, start = 1) {
  const rng = zaad(start * 31 + (spoor === 'onderbouw' ? 3 : 7));
  const level = spoor === 'onderbouw' ? 5 : 7;
  const uit = [];
  let vorige = null;
  for (let k = 0; k < n; k++) {
    const v = G.maakGetalVraag(spoor, level, { rng, vorige });
    assert.ok(v, 'geen vraag voor ' + spoor);
    uit.push(v); vorige = v;
  }
  return uit;
}

test('de levels met getallen bestaan in beide sporen', () => {
  assert.ok(B.LEVELS.onderbouw[5].getallen);
  assert.ok(B.LEVELS.bovenbouw[7].getallen);
});

test('elke vraag heeft een tekst, een antwoord en een uitwerking', () => {
  for (const spoor of ['onderbouw', 'bovenbouw']) {
    for (const v of vragen(spoor, 300)) {
      assert.ok(v.tekst.length > 10 && v.uitwerking.length > 10);
      assert.ok(Number.isFinite(v.antwoord));
      assert.ok(G.GETAL_TYPEN[spoor].includes(v.type));
      assert.strictEqual(v.beweging.T, 12);
    }
  }
});

test('alle vraagtypes komen voor', () => {
  for (const spoor of ['onderbouw', 'bovenbouw']) {
    const typen = new Set(vragen(spoor, 300).map(v => v.type));
    for (const t of G.GETAL_TYPEN[spoor]) assert.ok(typen.has(t), spoor + ' mist ' + t);
  }
});

test('onderbouw: geen negatieve antwoorden en geen negatieve afstand', () => {
  for (const v of vragen('onderbouw', 300)) {
    assert.ok(v.antwoord >= 0, v.type + ': ' + v.antwoord);
    for (const s of v.beweging.segmenten) assert.ok(s.x1 >= -1e-9);
  }
});

test('hele seconden op de segmentgrenzen, en nette antwoorden', () => {
  for (const spoor of ['onderbouw', 'bovenbouw']) {
    for (const v of vragen(spoor, 300)) {
      for (const s of v.beweging.segmenten) assert.ok(Number.isInteger(s.duur));
      assert.ok(Number.isInteger(Math.round(v.antwoord * 2 * 1e6) / 1e6), v.type + ': ' + v.antwoord);
    }
  }
});

test('het antwoord klopt met het model', () => {
  for (const v of vragen('bovenbouw', 300)) {
    const s = v.index === null ? null : v.beweging.segmenten[v.index];
    if (v.type === 'snelheidX') assert.ok(Math.abs(v.antwoord - (s.x1 - s.x0) / s.duur) < 1e-9);
    if (v.type === 'versnelling') assert.ok(Math.abs(v.antwoord - (s.v1 - s.v0) / s.duur) < 1e-9);
    if (v.type === 'oppervlakte') assert.ok(Math.abs(v.antwoord - Math.abs(s.x1 - s.x0)) < 1e-9);
  }
});

test('leesGetal: komma, minteken, spaties en een eenheid erachter', () => {
  assert.strictEqual(G.leesGetal('3'), 3);
  assert.strictEqual(G.leesGetal('1,5'), 1.5);
  assert.strictEqual(G.leesGetal('−2,5'), -2.5);
  assert.strictEqual(G.leesGetal(' -4 m/s'), -4);
  assert.strictEqual(G.leesGetal('0.5 m/s²'), 0.5);
  assert.ok(Number.isNaN(G.leesGetal('drie')));
  assert.ok(Number.isNaN(G.leesGetal('')));
});

test('onderbouw: het karretje rijdt alleen vooruit', () => {
  for (const v of vragen('onderbouw', 300)) {
    for (const s of v.beweging.segmenten) assert.ok(s.v0 >= 0 && s.v1 >= 0);
  }
});

test('meer stukken: de som van de oppervlaktes, zonder richtingswissel', () => {
  const vs = vragen('bovenbouw', 600).filter(v => v.type === 'oppervlakteMeer');
  assert.ok(vs.length > 20);
  for (const v of vs) {
    const deel = v.index.map(i => v.beweging.segmenten[i]);
    assert.ok(deel.length >= 2 && deel.length <= 3);
    const som = deel.reduce((a, s) => a + Math.abs(s.x1 - s.x0), 0);
    assert.ok(Math.abs(som - v.antwoord) < 1e-9);
    const tekens = new Set(deel.flatMap(s => [Math.sign(s.v0), Math.sign(s.v1)]).filter(x => x));
    assert.ok(tekens.size <= 1);
  }
  const v = vs.find(q => q.verkeerd.stukken.some(o => Math.abs(o - q.antwoord) > 0.1));
  const een = v.verkeerd.stukken.find(o => Math.abs(o - v.antwoord) > 0.1);
  assert.strictEqual(G.getalDiagnose(v, een).code, 'eenStuk');
});

test('elke rekenvraag heeft een hint voor de tweede poging', () => {
  for (const spoor of ['onderbouw', 'bovenbouw']) for (const v of vragen(spoor, 100)) assert.ok(G.getalHint(v).length > 10);
});

test('diagnose: teken, niet gedeeld, rechthoek', () => {
  const vs = vragen('bovenbouw', 400);
  const negatief = vs.find(v => v.type === 'snelheidX' && v.antwoord < 0);
  assert.strictEqual(G.getalDiagnose(negatief, -negatief.antwoord).code, 'teken');
  const sx = vs.find(v => v.type === 'snelheidX' && Math.abs(v.verkeerd.alleenAfstand) !== Math.abs(v.antwoord));
  assert.strictEqual(G.getalDiagnose(sx, sx.verkeerd.alleenAfstand).code, 'nietGedeeld');
  const opp = vs.find(v => v.type === 'oppervlakte' && v.verkeerd.rechthoek !== v.antwoord);
  assert.strictEqual(G.getalDiagnose(opp, opp.verkeerd.rechthoek).code, 'rechthoek');
  assert.strictEqual(G.getalDiagnose(opp, opp.antwoord), null);
  assert.strictEqual(G.getalFoutCategorie(opp, opp.antwoord), null);
  assert.ok(G.getalFoutCategorie(opp, opp.verkeerd.rechthoek).tekst.length > 5);
});
