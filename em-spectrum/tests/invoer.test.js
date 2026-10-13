// Tests voor het invoerveld van de EM-spectrumtool.
// Draaien met: npm run test:em
const test = require('node:test');
const assert = require('node:assert');
const { leesInvoer, leesGetalDeel } = require('../invoer.js');

const dichtbij = (a, b) => Math.abs(a / b - 1) < 1e-9;

test('vaste testreeks uit workflow.md', () => {
  for (const t of ['5000', '5e3', '5*10^3', '5·10³', '10³']) {
    assert.ok(dichtbij(leesGetalDeel(t.replace('³', '^3')), t === '10³' ? 1000 : 5000), t);
  }
  assert.ok(dichtbij(leesInvoer('4,5·10⁻³ m').lambda, 4.5e-3));
  assert.ok(dichtbij(leesInvoer('5·10³ m').lambda, 5000));
  assert.ok(dichtbij(leesInvoer('10³ m').lambda, 1000));
  assert.ok(dichtbij(leesInvoer('5 000 m').lambda, 5000));
});

test('golflengtes', () => {
  assert.ok(dichtbij(leesInvoer('589 nm').lambda, 589e-9));
  assert.ok(dichtbij(leesInvoer('589nm').lambda, 589e-9));
  assert.ok(dichtbij(leesInvoer('12,2 cm').lambda, 0.122));
  assert.ok(dichtbij(leesInvoer('10 µm').lambda, 1e-5));
  assert.ok(dichtbij(leesInvoer('10 um').lambda, 1e-5));
  assert.ok(dichtbij(leesInvoer('5,89·10^-7 m').lambda, 5.89e-7));
  assert.ok(dichtbij(leesInvoer('5,89·10−7 m').lambda, 5.89e-7));   // echt minteken
});

test('frequenties en energie', () => {
  assert.ok(dichtbij(leesInvoer('2,45 GHz').lambda, 2.99792458e8 / 2.45e9));
  assert.ok(dichtbij(leesInvoer('100 MHz').lambda, 2.99792458));
  assert.ok(dichtbij(leesInvoer('100 mhz').lambda, 2.99792458));
  assert.ok(dichtbij(leesInvoer('511 keV').lambda, 6.62607015e-34 * 2.99792458e8 / (511e3 * 1.602176634e-19)));
  assert.equal(leesInvoer('2,10 eV').soort, 'e');
});

test('foute invoer geeft een zin in gewone taal', () => {
  for (const t of ['', '589', 'abc nm', '589 lichtjaar', '-5 nm', '0 Hz']) {
    const r = leesInvoer(t);
    assert.ok(r.fout && !r.lambda, t);
  }
});
