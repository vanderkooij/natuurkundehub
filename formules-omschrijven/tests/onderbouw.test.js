// Tests voor de onderbouw: de opgavegenerators en de stapper met alleen keer,
// delen, omdraaien en uitrekenen. Draaien met: npm run test:formules
const test = require('node:test');
const assert = require('node:assert');

const stapper = require('../js/stapper.js');
// onderbouw.js gebruikt in de browser de globale functies uit stapper.js.
global.parse = stapper.parse;
global.rekenWaarde = stapper.rekenWaarde;
global.toonVergelijking = stapper.toonVergelijking;
global.toonUitdrukking = stapper.toonUitdrukking;
global.getalTekst = stapper.getalTekst;
for(const k of ['doeStap','operanden','naarTekst','bevat','kanRekenen','toonNaam','knoop','kopie']) global[k] = stapper[k];
const ob = require('../js/onderbouw.js');

const { parse, doeStap, operanden, naarTekst, bevat, kanRekenen, rekenWaarde } = stapper;

// Zoekt in de breedte of de stapper met de onderbouwknoppen bij `doel` komt.
// Geeft het antwoord (de andere kant) terug, of null.
function losOp(formule, doel, uitrekenen, maxDiepte){
  const [l, r] = formule.split('=');
  let rij = [{ links: parse(l), rechts: parse(r) }];
  const gezien = new Set();
  const klaar = (a, b) => a.t === 'var' && a.naam === doel && !bevat(b, doel) && (!uitrekenen || b.t === 'num');
  for(let diepte = 0; diepte <= maxDiepte; diepte++){
    const volgende = [];
    for(const s of rij){
      if(klaar(s.links, s.rechts)) return s.rechts;
      if(klaar(s.rechts, s.links)) return s.links;
      const sleutel = naarTekst(s.links) + '=' + naarTekst(s.rechts);
      if(gezien.has(sleutel)) continue;
      gezien.add(sleutel);
      for(const o of operanden(s.links, s.rechts)){
        volgende.push(doeStap(s.links, s.rechts, 'maal', o));
        volgende.push(doeStap(s.links, s.rechts, 'deel', o));
      }
      volgende.push(doeStap(s.links, s.rechts, 'wissel'));
      if(uitrekenen && (kanRekenen(s.links) || kanRekenen(s.rechts)))
        volgende.push(doeStap(s.links, s.rechts, 'reken'));
    }
    rij = volgende;
  }
  return null;
}

test('niveau 1: elke vleksom is in de stapper op te lossen en komt op het goede getal', () => {
  for(let i = 0; i < 150; i++){
    const o = ob.maakOpgave(1);
    const antwoord = losOp(o.formule, 'vlek', true, 4);
    assert.ok(antwoord, 'niet op te lossen: ' + o.formule);
    assert.strictEqual(antwoord.waarde, o.goed, o.formule);
  }
});

test('niveau 1: het goede getal klopt als je het invult', () => {
  for(let i = 0; i < 100; i++){
    const o = ob.maakOpgave(1);
    const [l, r] = ob.kantWaarden(o.formule, { vlek: o.goed });
    assert.ok(Math.abs(l - r) < 1e-9, o.formule);
  }
});

test('niveau 2: woordsom is op te lossen en de ingevulde formule klopt', () => {
  for(let i = 0; i < 150; i++){
    const o = ob.maakOpgave(2);
    const antwoord = losOp(o.formule, o.doel, true, 4);
    assert.ok(antwoord, 'niet op te lossen: ' + o.formule);
    assert.strictEqual(antwoord.waarde, o.goed, o.formule);
    assert.ok(!/[0-9]\.[0-9]/.test(o.formule), 'geen kommagetallen in de opgave');
  }
});

test('niveau 1 en 2: vier verschillende antwoordknoppen, waarvan één goed', () => {
  for(let i = 0; i < 200; i++){
    const o = ob.maakOpgave(1 + (i % 2));
    assert.strictEqual(o.opties.length, 4);
    assert.strictEqual(new Set(o.opties).size, 4);
    assert.strictEqual(o.opties.filter(x => x === o.goed).length, 1);
    assert.ok(o.opties.every(x => Number.isInteger(x) && x > 0));
  }
});

test('niveau 3, 4 en 5: stapper komt uit op de goede omschrijving', () => {
  for(let i = 0; i < 300; i++){
    const o = ob.maakOpgave(3 + (i % 3));
    const antwoord = losOp(o.formule, o.doel, false, 4);
    assert.ok(antwoord, 'niet op te lossen: ' + o.formule + ' naar ' + o.doel);
    assert.ok(ob.zelfdeMonoom(ob.monoomVan(naarTekst(antwoord)), o.goed), o.formule + ' naar ' + o.doel);
  }
});

test('niveau 5: precies één goede keuze, en die klopt numeriek', () => {
  for(let i = 0; i < 200; i++){
    const o = ob.maakOpgave(5);
    const goede = o.opties.filter(x => x.goed);
    assert.strictEqual(goede.length, 1);
    assert.strictEqual(new Set(o.opties.map(x => x.tekst)).size, o.opties.length);
    // Kies getallen, reken de gezochte letter uit met het antwoord en kijk of
    // de oorspronkelijke formule dan klopt.
    const waarden = {};
    for(const n of ob.namenInVolgorde(o.formule)) waarden[n] = 2 + Math.random() * 5;
    waarden[o.doel] = rekenWaarde(parse(goede[0].tekst), waarden);
    const [l, r] = ob.kantWaarden(o.formule, waarden);
    assert.ok(Math.abs(l - r) < 1e-9, o.formule);
    for(const fout of o.opties.filter(x => !x.goed)){
      const w = Object.assign({}, waarden, { [o.doel]: rekenWaarde(parse(fout.tekst), waarden) });
      const [fl, fr] = ob.kantWaarden(o.formule, w);
      assert.ok(Math.abs(fl - fr) > 1e-6, 'foute keuze klopt toch: ' + fout.tekst);
    }
  }
});

test('onderbouw: nooit meer dan vier grootheden, geen haakjes-som, wortel of macht', () => {
  for(let i = 0; i < 300; i++){
    const o = ob.maakOpgave(1 + (i % 5));
    assert.ok(ob.namenInVolgorde(o.formule).length <= 4, o.formule);
    assert.ok(!/sqrt|\^|\+|-/.test(o.formule), o.formule);
  }
});

test('invulcontrole: goed getal klopt, fout getal wordt voorgerekend', () => {
  const goed = ob.invulControle('2 = 6/vlek', 'vlek', 3);
  assert.strictEqual(goed.klopt, true);
  const fout = ob.invulControle('2 = 6/vlek', 'vlek', 12);
  assert.strictEqual(fout.klopt, false);
  assert.match(fout.html, /is 0,5, en dat is geen 2\./);
  const links = ob.invulControle('vlek*3 = 12', 'vlek', 12);
  assert.match(links.html, /is 36, en dat is geen 12\./);
  const alleen = ob.invulControle('perkind = 40/8', 'perkind', 48);
  assert.match(alleen.html, /is 5, en dat is geen 48\./);
  const woord = ob.invulControle('3 = afstand/4', 'afstand', 7);
  assert.match(woord.html, /is ongeveer 1,75|is 1,75/);
});

test('getalproef: elke foute keuze op niveau 5 wordt met getallen weerlegd', () => {
  for(let i = 0; i < 100; i++){
    const o = ob.maakOpgave(5);
    for(const fout of o.opties.filter(x => !x.goed)){
      const html = ob.getalProef(o.formule, o.doel, fout.tekst);
      assert.ok(html && /en dat is geen/.test(html), o.formule + ' / ' + fout.tekst);
    }
    assert.strictEqual(ob.getalProef(o.formule, o.doel, o.opties.find(x => x.goed).tekst), null);
  }
});

test('uitrekenen: alleen bij nette uitkomst', () => {
  assert.ok(kanRekenen(parse('6/2')));
  assert.ok(kanRekenen(parse('5/2')));
  assert.ok(!kanRekenen(parse('2/6')));
  assert.ok(!kanRekenen(parse('6/vlek')));
  assert.ok(!kanRekenen(parse('3')));
});

test('uitrekenen als stap: 6/2 wordt 3, de vlek blijft staan', () => {
  const s = doeStap(parse('vlek'), parse('6/2'), 'reken');
  assert.strictEqual(naarTekst(s.links), 'vlek');
  assert.strictEqual(naarTekst(s.rechts), '3');
});

test('vier stappen genoeg voor 2 = 6/vlek (keer vlek, delen door 2, uitrekenen)', () => {
  const a = losOp('2 = 6/vlek', 'vlek', true, 3);
  assert.strictEqual(a.waarde, 3);
});

test('niveau 3: bekende formules met woorden; niveau 4: ook losse letters, altijd drie grootheden', () => {
  let los = 0;
  for(let i = 0; i < 200; i++){
    const o3 = ob.maakOpgave(3);
    assert.ok(o3.woorden, 'bekende formule: ' + o3.formule);
    const o4 = ob.maakOpgave(4);
    assert.strictEqual(ob.namenInVolgorde(o4.formule).length, 3, o4.formule);
    if(!o4.woorden) los++;
  }
  assert.ok(los > 40 && los < 160, 'ongeveer de helft losse letters: ' + los);
});

test('geen herhaling: een recente opgave komt niet meteen terug', () => {
  for(let n = 1; n <= 5; n++){
    const recent = [];
    for(let i = 0; i < 40; i++){
      const o = ob.maakOpgave(n, recent.slice(-4));
      assert.ok(recent.slice(-4).indexOf(o.sleutel) < 0, 'herhaling op niveau ' + n + ': ' + o.sleutel);
      recent.push(o.sleutel);
    }
  }
});

test('kortste route: bekende gevallen', () => {
  assert.strictEqual(ob.kortsteRoute('2 = 6/vlek', 'vlek', true).stappen, 3);
  assert.strictEqual(ob.kortsteRoute('12 = 3*vlek', 'vlek', true).stappen, 2);
  assert.strictEqual(ob.kortsteRoute('v = s/t', 's', false).stappen, 1);
  assert.strictEqual(ob.kortsteRoute('v = s/t', 't', false).stappen, 2);
});

/* ── Plus en min ─────────────────────────────────────────────────── */

test('plus en min: elke opgave is met erbij/eraf op te lossen en komt goed uit', () => {
  for(let n = 1; n <= 4; n++){
    for(let i = 0; i < 80; i++){
      const o = ob.maakOpgave(n, null, 'plusmin');
      assert.ok(!/[*/]/.test(o.formule), 'geen keer of delen: ' + o.formule);
      const r = ob.kortsteRoute(o.formule, o.doel, n <= 2, 5, ob.PLUSMIN_STAPPEN);
      assert.ok(r, 'niet op te lossen: ' + o.formule + ' naar ' + o.doel);
      if(n <= 2) assert.strictEqual(r.antwoord.waarde, o.goed, o.formule);
      else assert.strictEqual(o.goedTekst, o.doel + ' = ' + naarTekst(r.antwoord));
    }
  }
});

test('plus en min: geen negatieve getallen in de opgave', () => {
  for(let i = 0; i < 200; i++){
    const o = ob.maakOpgave(1 + (i % 2), null, 'plusmin');
    assert.ok(o.goed > 0, o.formule);
    for(const g of (o.formule.match(/[0-9]+/g) || [])) assert.ok(Number(g) > 0, o.formule);
  }
});

test('klok: minuten sinds middernacht als kloktijd, kleine getallen blijven minuten', () => {
  assert.strictEqual(ob.klok(900), '15:00');
  assert.strictEqual(ob.klok(872), '14:32');
  assert.strictEqual(ob.klok(28), '28');
});

test('tijdsom: om 15:00 aankomen, 28 minuten reizen, dan weg om 14:32', () => {
  const r = ob.kortsteRoute('900 = vertrek+28', 'vertrek', true, 4, ob.PLUSMIN_STAPPEN);
  assert.strictEqual(ob.klok(r.antwoord.waarde), '14:32');
  assert.strictEqual(r.stappen, 2);
});

/* ── Klas 3 ──────────────────────────────────────────────────────── */

// Vult het antwoord in de formule in en kijkt of die dan klopt.
function kloptAntwoord(o){
  const namen = ob.namenInVolgorde(o.formule);
  for(let i = 0; i < 4; i++){
    const w = {};
    for(const n of namen) w[n] = 1.5 + Math.random() * 8;
    w[o.doel] = rekenWaarde(o.antwoord, w);
    const [l, r] = ob.kantWaarden(o.formule, w);
    if(Math.abs(l - r) > 1e-9 * Math.max(1, Math.abs(l))) return false;
  }
  return true;
}

test('klas 3: elk antwoord klopt als je het invult in de formule', () => {
  for(let n = 1; n <= 5; n++)
    for(let i = 0; i < 150; i++){
      const o = ob.maakKlas3Opgave(n);
      assert.ok(kloptAntwoord(o), o.formule + ' naar ' + o.doel + ': ' + o.goedTekst);
    }
});

test('klas 3: wat er per level in zit', () => {
  for(let i = 0; i < 200; i++){
    const o1 = ob.maakKlas3Opgave(1), o2 = ob.maakKlas3Opgave(2), o3 = ob.maakKlas3Opgave(3), o4 = ob.maakKlas3Opgave(4), o5 = ob.maakKlas3Opgave(5);
    assert.ok(!/[+-]/.test(o1.formule) && ob.namenInVolgorde(o1.formule).length === 3, o1.formule);
    assert.ok(!/[*/]/.test(o2.formule) && ob.namenInVolgorde(o2.formule).length === 3, o2.formule);
    assert.ok(!/[+-]/.test(o3.formule) && ob.namenInVolgorde(o3.formule).length === 4, o3.formule);
    // Level 4: een som boven de deelstreep, gedeeld door een getal.
    assert.match(o4.formule, /^\w+ = \(\w+[+-]\w+\)\/\d+$/, o4.formule);
    assert.ok(/[+-]/.test(o5.formule) && /[*/]/.test(o5.formule), 'gemengd: ' + o5.formule);
    for(const o of [o4, o5])
      assert.ok(!ob.staatOnder(parse(o.formule.split('=')[1]), o.doel), 'niet onder de deelstreep: ' + o.formule + ' naar ' + o.doel);
  }
});

test('klas 3: kortste route in de stapper', () => {
  const k = (f, d) => { const p = ob.pelAf(f, d); return ob.klas3Kortste({ formule: f, doel: d, stappen: p.stappen }); };
  assert.strictEqual(k('x = a*b', 'a'), 1);
  assert.strictEqual(k('x = a/b', 'b'), 2);
  assert.strictEqual(k('x = a-b', 'b'), 2);
  assert.strictEqual(k('x = (a+b)/2', 'a'), 2);
  assert.strictEqual(k('x = (a-b)/2', 'b'), 3);
  assert.strictEqual(k('x = a*b/c', 'c'), 2);
});

test('klas 3: de stapper met alle vier de bewerkingen komt op hetzelfde antwoord', () => {
  // Elke vorm met elke letter als doel. De stapper telt omdraaien als stap.
  const vormen = [].concat(ob.KLAS3_VORMEN[4], ob.KLAS3_VORMEN[5], ['x = a*b/c', 'x = a/(b*c)', 'x = a*(b-c)', 'x = a/b+c']);
  for(const v of vormen){
    const f = v.replace(/k/g, '3');
    for(const doel of ob.namenInVolgorde(f).filter(n => n !== 'x')){
      const o = { formule: f, doel: doel, antwoord: ob.pelAf(f, doel).antwoord };
      if(ob.staatOnder(parse(f.split('=')[1]), doel)) continue;
      const r = ob.kortsteRoute(f, doel, false, 3, ob.KLAS3_STAPPEN);
      assert.ok(r, 'stapper komt er niet: ' + f + ' naar ' + doel);
      assert.strictEqual(ob.nakijkKlas3(naarTekst(r.antwoord), o).status, 'goed', f + ' naar ' + doel + ': ' + naarTekst(r.antwoord));
    }
  }
});

test('klas 3: pelAf geeft nette antwoorden', () => {
  const t = (f, d) => naarTekst(ob.pelAf(f, d).antwoord);
  assert.strictEqual(t('x = 2*a+b', 'a'), '(x-b)/2');
  assert.strictEqual(t('x = (a+b)/2', 'a'), '2*x-b');
  assert.strictEqual(t('x = a/3-b', 'a'), '3*(x+b)');
  assert.strictEqual(t('x = a-b*c', 'b'), '(a-x)/c');
  assert.strictEqual(t('x = a/b+c', 'b'), 'a/(x-c)');
  assert.strictEqual(t('x = a*(b-c)', 'c'), 'b-x/a');
  assert.strictEqual(t('v = s/t', 't'), 's/v');
  assert.strictEqual(ob.pelAf('x = 2*a+b', 'a').stappen.length, 2);
});

test('klas 3: invoer omzetten (×, ÷, komma, tegen elkaar aan)', () => {
  const n = ob.normaliseerInvoer;
  assert.strictEqual(n('a = (x − b) ÷ 2'), 'a=(x-b)/2');
  assert.strictEqual(n('a=2x·b'), 'a=2*x*b');
  assert.strictEqual(n('a = 0,5(x-b)'), 'a=(05/10)*(x-b)');
  assert.strictEqual(n('a=(x-b)c'), 'a=(x-b)*c');
  assert.strictEqual(n('a=(x-b)2'), 'a=(x-b)*2');
  assert.strictEqual(n('a=x:b'), 'a=x/b');
  assert.strictEqual(n('a=[x+b]/2'), 'a=(x+b)/2');
});

test('klas 3: nakijken accepteert elke goede vorm en vangt de bekende fouten', () => {
  const o = { formule: 'x = 2*a+b', doel: 'a', antwoord: ob.pelAf('x = 2*a+b', 'a').antwoord, stappen: ob.pelAf('x = 2*a+b', 'a').stappen };
  const k = t => ob.nakijkKlas3(t, o);
  for(const goed of ['a = (x-b)/2', '(x-b)/2', 'a = x/2 - b/2', 'a = 0,5*(x-b)', 'a = (x − b) : 2', 'a=(x-b)/2'])
    assert.strictEqual(k(goed).status, 'goed', goed);
  assert.strictEqual(k('a = x-b/2').status, 'fout');
  assert.strictEqual(k('a = x/2-b').status, 'fout');
  assert.strictEqual(k('a = x/2-b').volgorde, true, 'verkeerde volgorde herkend');
  assert.strictEqual(k('a = x-b/2').volgorde, false);
  assert.strictEqual(k('b = x-2*a').status, 'links');
  assert.strictEqual(k('a = (x-b)/2+a-a').status, 'doelRechts');
  assert.strictEqual(k('a = (x-q)/2').status, 'onbekend');
  assert.strictEqual(k('a = ').status, 'leeg');
  assert.strictEqual(k('a = (x-b/2').status, 'onleesbaar');
});

test('klas 3: een fout antwoord wordt met nette getallen weerlegd', () => {
  for(let n = 1; n <= 5; n++)
    for(let i = 0; i < 200; i++){
      const o = ob.maakKlas3Opgave(n);
      const fout = naarTekst(o.antwoord) + '+1';
      const html = ob.getalProefKlas3(o, fout);
      assert.ok(html && /en dat is geen/.test(html), o.formule + ' / ' + fout);
      assert.strictEqual(ob.getalProefKlas3(o, naarTekst(o.antwoord)), null);
    }
});

test('klas 3: geen herhaling van een recente opgave', () => {
  for(let n = 1; n <= 5; n++){
    const recent = [];
    for(let i = 0; i < 40; i++){
      const o = ob.maakKlas3Opgave(n, recent.slice(-4));
      assert.ok(recent.slice(-4).indexOf(o.sleutel) < 0, 'herhaling op level ' + n + ': ' + o.sleutel);
      recent.push(o.sleutel);
    }
  }
});

test('stapper: blokken als operand, elk tweetal zodat het goede blok niet opvalt', () => {
  const ops = (f, d) => { const [l, r] = f.split('='); return operanden(parse(l), parse(r), d).map(o => naarTekst(o)); };
  assert.ok(ops('q = r/(m*f)', 'r').includes('m*f'));
  const drie = ops('n = g*f*b', 'f').filter(t => /\*/.test(t));
  assert.deepStrictEqual(drie.sort(), ['f*b', 'g*b', 'g*f'], 'alle tweetallen, niet alleen het goede');
  const k = (f, d) => { const p = ob.pelAf(f, d); return ob.klas3Kortste({ formule: f, doel: d, stappen: p.stappen }); };
  assert.strictEqual(k('q = r/(m*f)', 'r'), 1);
  assert.strictEqual(k('n = g*f*b', 'f'), 1);
  const s = doeStap(parse('q'), parse('r/(m*f)'), 'maal', parse('m*f'));
  assert.strictEqual(naarTekst(s.rechts), 'r');
});

test('klas 3: g2 is geen 2 keer g; daar komt een hint voor', () => {
  const o = { formule: 'g = (m+q)/2', doel: 'q', antwoord: ob.pelAf('g = (m+q)/2', 'q').antwoord, stappen: ob.pelAf('g = (m+q)/2', 'q').stappen };
  const r = ob.nakijkKlas3('q = g2-m', o);
  assert.strictEqual(r.status, 'getalAchter');
  assert.match(ob.getalAchterTekst(r), /2g/);
  assert.strictEqual(ob.nakijkKlas3('q = 2g-m', o).status, 'goed');
});
