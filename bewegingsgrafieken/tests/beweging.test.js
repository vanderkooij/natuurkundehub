// Tests voor het bewegingsmodel en de vraaggenerator van Bewegingsgrafieken.
// Draaien met: npm run test:bewegingen
const test = require('node:test');
const assert = require('node:assert');
const B = require('../js/beweging.js');

// Herhaalbare toevalsgenerator, zodat een falende test opnieuw te draaien is.
function zaad(n) {
  let s = n >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

const ALLE = [];
for (const spoor of ['onderbouw', 'bovenbouw']) {
  // De levels met getallen hebben hun eigen generator (tests/getallen.test.js).
  // De eindmix kiest zelf een van de andere levels.
  for (const level of Object.keys(B.LEVELS[spoor])) {
    const L = B.LEVELS[spoor][level];
    if (!L.getallen && !L.mix) ALLE.push([spoor, Number(level)]);
  }
}

function vragen(spoor, level, n, start = 1) {
  const rng = zaad(start * 97 + level * 13 + (spoor === 'onderbouw' ? 1 : 2));
  const uit = [];
  let vorige = null;
  for (let k = 0; k < n; k++) {
    const v = B.maakVraag(spoor, level, { rng, vorige });
    assert.ok(v, `geen vraag voor ${spoor} level ${level}`);
    uit.push(v); vorige = v;
  }
  return uit;
}

test('de eindmix is het laatste level en verwijst naar bestaande levels', () => {
  for (const spoor of ['onderbouw', 'bovenbouw']) {
    const nummers = Object.keys(B.LEVELS[spoor]).map(Number);
    const laatste = B.LEVELS[spoor][Math.max(...nummers)];
    assert.ok(laatste.mix && laatste.mix.length > 1);
    for (const n of laatste.mix) assert.ok(B.LEVELS[spoor][n] && !B.LEVELS[spoor][n].mix);
  }
});

test('bouwBeweging: plaats volgt uit de snelheden', () => {
  const b = B.bouwBeweging([[4, 3, 3], [4, 0, 0], [2, 0, 4]]);
  assert.strictEqual(b.T, 10);
  assert.strictEqual(b.segmenten[0].x1, 12);
  assert.strictEqual(b.segmenten[1].x1, 12);
  assert.strictEqual(b.segmenten[2].x1, 16);
  assert.strictEqual(B.toestand(b, 2).x, 6);
  assert.strictEqual(B.toestand(b, 9).v, 2);
  assert.deepStrictEqual(b.segmenten.map(B.soortVan), ['constant', 'stil', 'versnellen']);
});

test('soortVan en richtingVan bij achteruit', () => {
  const b = B.bouwBeweging([[3, 0, -6], [3, -6, 0], [3, -3, -3]]);
  assert.deepStrictEqual(b.segmenten.map(B.soortVan), ['versnellen', 'vertragen', 'constant']);
  assert.deepStrictEqual(b.segmenten.map(B.richtingVan), [-1, -1, -1]);
});

test('elk level levert vragen, en het gemarkeerde stuk heeft het goede antwoord', () => {
  for (const [spoor, level] of ALLE) {
    for (const v of vragen(spoor, level, 150)) {
      const s = v.beweging.segmenten[v.index];
      assert.ok(v.goed.includes(B.soortVan(s)));
      assert.ok(v.diagram in B.LEVELS[spoor][level].diagrammen);
    }
  }
});

test('onderbouw: het karretje rijdt alleen vooruit', () => {
  for (const level of [1, 2, 3, 4]) {
    assert.ok(!B.LEVELS.onderbouw[level].achteruit);
    for (const v of vragen('onderbouw', level, 150)) {
      for (const s of v.beweging.segmenten) assert.ok(s.v0 >= 0 && s.v1 >= 0);
    }
  }
});

test('onderbouw: afstand tot de start wordt nooit negatief', () => {
  for (const level of [1, 2, 3, 4]) {
    for (const v of vragen('onderbouw', level, 200)) {
      for (const s of v.beweging.segmenten) assert.ok(s.x1 >= -1e-9 && s.x0 >= -1e-9);
    }
  }
});

test('levels zonder achteruit hebben nooit een negatieve snelheid', () => {
  for (const [spoor, level] of ALLE) {
    if (B.LEVELS[spoor][level].achteruit) continue;
    for (const v of vragen(spoor, level, 150)) {
      for (const s of v.beweging.segmenten) assert.ok(s.v0 >= 0 && s.v1 >= 0, `${spoor} ${level}`);
    }
  }
});

test('buiten het x,t-diagram is de snelheid continu (geen sprongen)', () => {
  for (const [spoor, level] of ALLE) {
    for (const v of vragen(spoor, level, 150)) {
      if (v.diagram === 'x') continue;
      const segs = v.beweging.segmenten;
      for (let i = 1; i < segs.length; i++) assert.strictEqual(segs[i].v0, segs[i - 1].v1);
    }
  }
});

test('levels met het a,t-diagram hebben nergens een sprong in de snelheid', () => {
  for (const level of [5, 6]) {
    for (const v of vragen('bovenbouw', level, 200)) {
      const segs = v.beweging.segmenten;
      for (let i = 1; i < segs.length; i++) assert.strictEqual(segs[i].v0, segs[i - 1].v1);
    }
  }
});

test('vast: diagram, antwoord en richting vastzetten', () => {
  const rng = zaad(5);
  for (let k = 0; k < 50; k++) {
    const v = B.maakVraag('bovenbouw', 4, { rng, vast: { diagram: 'x', achteruit: true, doel: 'constant' } });
    assert.ok(v);
    assert.strictEqual(v.diagram, 'x');
    assert.strictEqual(v.soort, 'constant');
    assert.ok(v.richting < 0);
  }
});

test('binnen een segment wisselt de snelheid niet van teken', () => {
  for (const [spoor, level] of ALLE) {
    for (const v of vragen(spoor, level, 150)) {
      for (const s of v.beweging.segmenten) assert.ok(s.v0 * s.v1 >= 0);
    }
  }
});

test('onderbouw level 2: het afstanddiagram heeft alleen rechte stukken', () => {
  for (const v of vragen('onderbouw', 2, 200)) {
    if (v.diagram !== 'x') continue;
    for (const s of v.beweging.segmenten) assert.strictEqual(s.a, 0);
  }
});

test('de vier antwoorden komen ongeveer even vaak voor', () => {
  const tel = { stil: 0, constant: 0, versnellen: 0, vertragen: 0 };
  for (const v of vragen('bovenbouw', 3, 800)) tel[v.soort]++;
  for (const k of Object.keys(tel)) assert.ok(tel[k] > 120, `${k}: ${tel[k]}`);
});

test('achteruit-levels markeren regelmatig een stuk achteruit', () => {
  const vs = vragen('bovenbouw', 4, 300);
  const terug = vs.filter(v => v.richting < 0).length;
  assert.ok(terug > 100, `maar ${terug} keer achteruit`);
});

test('a,t-diagram: bij a = 0 zijn stilstand en constante snelheid allebei goed', () => {
  const vs = vragen('bovenbouw', 5, 300).filter(v => v.diagram === 'a');
  const nul = vs.filter(v => v.beweging.segmenten[v.index].a === 0);
  assert.ok(nul.length > 10);
  for (const v of nul) assert.deepStrictEqual([...v.goed].sort(), ['constant', 'stil']);
  for (const v of vs.filter(v => v.beweging.segmenten[v.index].a !== 0)) assert.strictEqual(v.goed.length, 1);
});

test('a,t-diagram, level 6: bij a = 0 verklapt de hint de richting niet', () => {
  for (const v of vragen('bovenbouw', 6, 300)) {
    if (v.diagram !== 'a' || v.beweging.segmenten[v.index].a !== 0) continue;
    assert.doesNotMatch(B.vraagHint(v), /gemarkeerde stuk/);
  }
});

test('elk level heeft een tekst voor wat er nieuw is', () => {
  for (const [spoor, level] of ALLE) assert.ok(B.LEVELS[spoor][level].nieuw.length > 20);
});

test('a,t-diagram heeft altijd een hint over de richting', () => {
  for (const level of [5, 6]) {
    for (const v of vragen('bovenbouw', level, 100)) {
      if (v.diagram === 'a') assert.ok(B.vraagHint(v).length > 0);
      else assert.strictEqual(B.vraagHint(v), '');
    }
  }
});

function vraagMet(spoor, diagram, segs, index) {
  const beweging = B.bouwBeweging(segs);
  const s = beweging.segmenten[index];
  const soort = B.soortVan(s);
  return { spoor, level: 4, diagram, beweging, index, soort, richting: B.richtingVan(s),
           goed: (diagram === 'a' && s.a === 0) ? ['stil', 'constant'] : [soort] };
}

test('leesAls: de klassieke verwisselingen', () => {
  // Rechte stijgende x,t-lijn gelezen als v,t: versnellen.
  const recht = vraagMet('bovenbouw', 'x', [[4, 3, 3]], 0);
  assert.strictEqual(B.leesAls(recht, 'v'), 'versnellen');
  // Horizontale x,t-lijn boven nul gelezen als v,t: constante snelheid.
  const stil = vraagMet('bovenbouw', 'x', [[4, 3, 3], [4, 0, 0]], 1);
  assert.strictEqual(B.leesAls(stil, 'v'), 'constant');
  // Horizontale v,t-lijn boven nul gelezen als x,t: stilstand.
  const constant = vraagMet('bovenbouw', 'v', [[4, 3, 3]], 0);
  assert.strictEqual(B.leesAls(constant, 'x'), 'stil');
  // Schuine v,t-lijn gelezen als x,t: constante snelheid.
  const sneller = vraagMet('bovenbouw', 'v', [[4, 0, 6]], 0);
  assert.strictEqual(B.leesAls(sneller, 'x'), 'constant');
});

test('diagnose: verkeerd diagram gelezen', () => {
  const recht = vraagMet('onderbouw', 'x', [[4, 3, 3]], 0);
  const d = B.diagnose(recht, 'versnellen');
  assert.strictEqual(d.code, 'leesAls');
  assert.match(d.tekst, /afstand-tijddiagram/);
  assert.strictEqual(B.uitlegStap(recht, d.code), 'zelfdevorm');
  assert.strictEqual(B.diagnose(recht, 'constant'), null);
});

test('diagnose: richtingsfouten', () => {
  const terugX = vraagMet('bovenbouw', 'x', [[4, -3, -3]], 0);
  assert.strictEqual(B.diagnose(terugX, 'vertragen').code, 'richting');
  const sneller = vraagMet('bovenbouw', 'v', [[4, 0, -6]], 0);
  assert.strictEqual(B.diagnose(sneller, 'vertragen').code, 'richting');
  const remmen = vraagMet('bovenbouw', 'v', [[4, -6, 0]], 0);
  assert.strictEqual(B.diagnose(remmen, 'versnellen').code, 'richting');
  const aTerug = vraagMet('bovenbouw', 'a', [[4, 0, -6]], 0);   // a < 0, achteruit: versnellen
  assert.strictEqual(aTerug.soort, 'versnellen');
  assert.strictEqual(B.diagnose(aTerug, 'vertragen').code, 'richting');
});

test('foutCategorie: dezelfde fout krijgt dezelfde sleutel', () => {
  const a = vraagMet('onderbouw', 'x', [[4, 3, 3]], 0);
  const b = vraagMet('onderbouw', 'x', [[2, 0, 0], [4, 5, 5]], 1);
  assert.strictEqual(B.foutCategorie(a, 'versnellen').sleutel, B.foutCategorie(b, 'versnellen').sleutel);
  assert.strictEqual(B.foutCategorie(a, 'constant'), null);
  for (const [spoor, level] of ALLE) {
    for (const v of vragen(spoor, level, 40)) {
      for (const g of B.SOORTEN) {
        const c = B.foutCategorie(v, g);
        if (v.goed.includes(g)) assert.strictEqual(c, null);
        else assert.ok(c.sleutel && c.tekst && c.stap);
      }
    }
  }
});

test('uitlegTekst geeft voor elke combinatie een tekst', () => {
  for (const [spoor, level] of ALLE) {
    for (const v of vragen(spoor, level, 60)) assert.ok(B.uitlegTekst(v).length > 20);
  }
});

test('strikvraag-levels geven vooral strikvragen', () => {
  const vs = vragen('onderbouw', 4, 300);
  const n = vs.filter(B.isContrast).length;
  assert.ok(n / vs.length > 0.7, `${n} van ${vs.length}`);
});
