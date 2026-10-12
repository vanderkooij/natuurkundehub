// Tests voor koppelen (bovenbouw) van Bewegingsgrafieken.
// Draaien met: npm run test:bewegingen
const test = require('node:test');
const assert = require('node:assert');
const B = require('../js/beweging.js');
const K = require('../js/koppel.js');

function zaad(n) {
  let s = n >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

function vragen(level, n, start = 1) {
  const rng = zaad(start * 53 + level);
  const uit = [];
  let vorige = null;
  for (let k = 0; k < n; k++) {
    const v = K.maakKoppelVraag(level, { rng, vorige });
    assert.ok(v, 'geen koppelvraag in level ' + level);
    uit.push(v); vorige = v;
  }
  return uit;
}

test('elk level levert vragen met vier opties en precies één goede', () => {
  for (const level of Object.keys(K.KOPPEL_LEVELS).map(Number)) {
    for (const v of vragen(level, 120)) {
      assert.strictEqual(v.opties.length, 4);
      assert.strictEqual(v.opties.filter(o => o.soort === 'goed').length, 1);
      assert.strictEqual(v.opties[v.juist].soort, 'goed');
      assert.ok(K.KOPPEL_LEVELS[level].paren.some(p => p[0] === v.van && p[1] === v.naar));
    }
  }
});

test('de opties zien er allemaal anders uit', () => {
  for (const level of [1, 2, 3, 4]) {
    for (const v of vragen(level, 80)) {
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++)
        assert.ok(!K.lijkenOpElkaar(v.opties[i].stukken, v.opties[j].stukken), 'level ' + level);
    }
  }
});

test('de vorm-fout zit er bijna altijd bij', () => {
  const vs = vragen(2, 200);
  const n = vs.filter(v => v.opties.some(o => o.soort === 'vorm')).length;
  assert.ok(n / vs.length > 0.9, n + ' van ' + vs.length);
});

test('vanaf een a,t-diagram begint het karretje stil', () => {
  for (const v of vragen(4, 200).filter(v => v.van === 'a')) {
    assert.ok(v.beginStil);
    assert.strictEqual(v.beweging.segmenten[0].v0, 0);
  }
});

test('levels zonder achteruit: de goede beweging gaat alleen vooruit', () => {
  for (const level of [1, 2]) {
    for (const v of vragen(level, 150)) for (const s of v.beweging.segmenten) assert.ok(s.v0 >= 0 && s.v1 >= 0);
  }
});

test('geen sprongen in de snelheid', () => {
  for (const v of vragen(3, 150)) {
    const segs = v.beweging.segmenten;
    for (let i = 1; i < segs.length; i++) assert.strictEqual(segs[i].v0, segs[i - 1].v1);
  }
});

test('feedback en categorieën voor elke foute optie', () => {
  for (const v of vragen(4, 120)) {
    assert.ok(K.koppelUitleg(v).length > 20);
    v.opties.forEach((o, i) => {
      const d = K.koppelDiagnose(v, i), c = K.koppelFoutCategorie(v, i);
      if (i === v.juist) { assert.strictEqual(d, null); assert.strictEqual(c, null); }
      else { assert.ok(d.tekst.length > 10); assert.ok(c.sleutel.startsWith('koppel-')); }
    });
  }
});

test('uitVersnellingen weigert een tekenwissel binnen een stuk', () => {
  assert.strictEqual(K.uitVersnellingen(2, [4], [-1], { vooruit: false }), null);
  assert.ok(K.uitVersnellingen(2, [2], [-1], { vooruit: true }));
});
