/* ══════════════════════════════════════════════════════════════════════
   KOPPELEN: bij een diagram het bijbehorende andere diagram kiezen

   Bovenbouw. Links staat een diagram van een beweging, rechts vier kleine
   diagrammen van een ander type. Eén hoort bij dezelfde beweging; de andere
   drie komen uit bekende denkfouten:
     vorm      de vorm van het gegeven diagram overgenomen (plaatje lezen)
     stuk      één stuk anders (versnellen, vertragen of constant verwisseld)
     volgorde  twee stukken in de verkeerde volgorde
     teken     alles gespiegeld (andere richting)
     begin     verkeerde beginsnelheid (bij a,t: het karretje begint stil)

   Een optie is een lijst stukken { t0, t1, f(t) }, zodat ook een vorm die
   geen echte beweging is (een kromme in een v,t-diagram) getekend kan worden.

   Gebruikt uit beweging.js: bouwBeweging, genereerBeweging, soortVan,
   richtingVan, waardeIn, kies, TAAL, SOORT_NAAM.
   ══════════════════════════════════════════════════════════════════════ */

if (typeof module !== 'undefined' && module.exports && typeof bouwBeweging === 'undefined') {
  Object.assign(globalThis, require('./beweging.js'));
}

const KOPPEL_LEVELS = {
  1: { paren: [['x', 'v'], ['v', 'x']], achteruit: false,
       desc: 'x,t en v,t bij elkaar zoeken, alles vooruit', voorbeeld: 'x,t ↔ v,t',
       nieuw: 'Koppelen: zoek het diagram dat bij dezelfde beweging hoort. Ga stuk voor stuk na wat het karretje doet.' },
  2: { paren: [['x', 'v'], ['v', 'x'], ['v', 'a'], ['a', 'v']], achteruit: false,
       desc: 'Erbij: v,t en a,t', voorbeeld: 'v,t ↔ a,t',
       nieuw: 'Nieuw: het a,t-diagram. De versnelling is de steilheid van het v,t-diagram.' },
  3: { paren: [['x', 'v'], ['v', 'x'], ['v', 'a'], ['a', 'v']], achteruit: true,
       desc: 'Ook achteruit rijden', voorbeeld: 'v < 0',
       nieuw: 'Nieuw: het karretje kan ook achteruit rijden. Let op het teken.' },
  4: { paren: [['x', 'v'], ['v', 'x'], ['v', 'a'], ['a', 'v'], ['x', 'a'], ['a', 'x']], achteruit: true,
       desc: 'Doordenker: ook van x,t naar a,t en terug', voorbeeld: 'x,t ↔ a,t',
       nieuw: 'Doordenker: ook van x,t naar a,t en terug. Bedenk eerst hoe het v,t-diagram eruitziet.' }
};

/* ── OPTIES ALS STUKKEN ── */

function stukkenVan(beweging, diagram) {
  return beweging.segmenten.map(s => ({
    t0: s.t0, t1: s.t0 + s.duur,
    f: t => waardeIn(diagram, beweging, Math.min(Math.max(t, s.t0), s.t0 + s.duur - 1e-9), 'bovenbouw')
  }));
}

// Een rij monsters, geschaald op de grootste waarde: zo ziet het kleine
// diagram eruit (elk krijgt zijn eigen schaal).
function vormMonsters(stukken) {
  const w = [];
  for (const s of stukken) for (let k = 0; k <= 12; k++) w.push(s.f(s.t0 + (s.t1 - s.t0) * k / 12));
  const m = Math.max(...w.map(Math.abs), 1e-9);
  return w.map(x => x / m);
}

function lijkenOpElkaar(a, b) {
  const ma = vormMonsters(a), mb = vormMonsters(b);
  return ma.every((x, i) => Math.abs(x - mb[i]) < 0.12);
}

/* ── VARIANTEN VAN DE BEWEGING ── */

// Bouwt een beweging uit beginsnelheid, duren en versnellingen. Geeft null als
// de snelheid binnen een stuk van teken wisselt of als er (bij alleen
// vooruit) een negatieve snelheid ontstaat.
function uitVersnellingen(v0, duren, versnellingen, { vooruit }) {
  let v = v0;
  const segs = [];
  for (let i = 0; i < duren.length; i++) {
    const v1 = Math.round((v + versnellingen[i] * duren[i]) * 1e9) / 1e9;
    if (v * v1 < -1e-9) return null;
    if (vooruit && (v < -1e-9 || v1 < -1e-9)) return null;
    if (Math.abs(v1) > 12) return null;
    segs.push([duren[i], v, v1]);
    v = v1;
  }
  return bouwBeweging(segs, 0);
}

function varianten(beweging, { vooruit, rng }) {
  const segs = beweging.segmenten;
  const duren = segs.map(s => s.duur), A = segs.map(s => s.a), v0 = segs[0].v0;
  const uit = [];
  // Eén stuk anders: versnellen wordt vertragen (of andersom), of een stuk
  // met versnelling wordt een stuk met constante snelheid, of omgekeerd.
  // Hooguit twee van zulke varianten, in verschillende stukken.
  const vStart = segs.map(s => s.v0);
  let stukken = 0;
  for (const k of segs.map((_, i) => i).sort(() => rng() - 0.5)) {
    if (stukken === 2) break;
    const pogingen = A[k] !== 0 ? [-A[k], 0]
      : vStart[k] !== 0 ? [-0.7 * vStart[k] / duren[k], 0.6 * vStart[k] / duren[k]] : [];
    for (const a of pogingen) {
      const B = A.slice(); B[k] = a;
      const b = uitVersnellingen(v0, duren, B, { vooruit });
      if (b) { uit.push({ soort: 'stuk', beweging: b, stuk: k }); stukken++; break; }
    }
  }
  // Twee stukken met een verschillende versnelling van plaats gewisseld.
  for (let k = 0; k < segs.length - 1; k++) {
    if (A[k] === A[k + 1]) continue;
    const B = A.slice(); [B[k], B[k + 1]] = [B[k + 1], B[k]];
    const D = duren.slice(); [D[k], D[k + 1]] = [D[k + 1], D[k]];
    const b = uitVersnellingen(v0, D, B, { vooruit });
    if (b) { uit.push({ soort: 'volgorde', beweging: b, stuk: k }); break; }
  }
  // Alles gespiegeld: de andere kant op.
  uit.push({ soort: 'teken', beweging: bouwBeweging(segs.map(s => [s.duur, -s.v0, -s.v1]), 0) });
  return uit;
}

/* ── VRAAG ── */

function maakKoppelVraag(level, { rng = Math.random, vorige = null } = {}) {
  const L = KOPPEL_LEVELS[level];
  for (let poging = 0; poging < 300; poging++) {
    let paren = L.paren;
    if (vorige && poging < 30) paren = paren.filter(p => p.join() !== [vorige.van, vorige.naar].join());
    const [van, naar] = kies(paren, rng);
    const beweging = genereerBeweging({ sprongen: false, achteruit: L.achteruit, rng });
    if (!beweging) continue;
    const segs = beweging.segmenten;
    // Vanaf een a,t-diagram ligt de beweging alleen vast als je de
    // beginsnelheid weet: dan begint het karretje stil.
    const beginStil = van === 'a';
    if (beginStil && segs[0].v0 !== 0) continue;
    // Genoeg te koppelen: minstens twee soorten, en een stuk met versnelling.
    if (new Set(segs.map(soortVan)).size < 2 || segs.every(s => s.a === 0)) continue;
    // Bij achteruit-levels regelmatig een beweging die echt achteruit gaat.
    if (L.achteruit && rng() < 0.6 && !segs.some(s => richtingVan(s) < 0)) continue;

    const goed = stukkenVan(beweging, naar);
    const kandidaten = [];
    // De vorm overgenomen: het gegeven diagram, maar dan als ander diagram gelezen.
    kandidaten.push({ soort: 'vorm', stukken: stukkenVan(beweging, van) });
    for (const v of varianten(beweging, { vooruit: !L.achteruit, rng })) {
      kandidaten.push({ soort: v.soort, stuk: v.stuk, stukken: stukkenVan(v.beweging, naar) });
    }
    if (beginStil && naar !== 'a') {
      const c = Math.max(2, Math.round(Math.max(...segs.map(s => Math.abs(s.v1))) / 2));
      const r = segs.find(s => richtingVan(s) !== 0) ? richtingVan(segs.find(s => richtingVan(s) !== 0)) : 1;
      const b = bouwBeweging(segs.map(s => [s.duur, s.v0 + r * c, s.v1 + r * c]), 0);
      if (!b.segmenten.some(s => s.v0 * s.v1 < 0)) kandidaten.push({ soort: 'begin', stukken: stukkenVan(b, naar) });
    }

    // Kies drie foute opties die er anders uitzien dan het goede antwoord en
    // dan elkaar. De vorm-fout gaat voor: dat is de belangrijkste denkfout.
    // Zonder achteruitrijden is een gespiegeld diagram (negatief) te makkelijk
    // weg te strepen; dan komt dat alleen als er niets anders is.
    const gekozen = [];
    const rest = kandidaten.slice(1).sort(() => rng() - 0.5);
    if (!L.achteruit) rest.sort((a, b) => (a.soort === 'teken') - (b.soort === 'teken'));
    const volgorde = [kandidaten[0]].concat(rest);
    for (const k of volgorde) {
      if (gekozen.length === 3) break;
      if (lijkenOpElkaar(k.stukken, goed)) continue;
      if (gekozen.some(g => lijkenOpElkaar(g.stukken, k.stukken))) continue;
      gekozen.push(k);
    }
    if (gekozen.length < 3) continue;

    const opties = [{ soort: 'goed', stukken: goed }].concat(gekozen).sort(() => rng() - 0.5);
    return {
      vorm: 'koppel', spoor: 'bovenbouw', level, van, naar, beweging, beginStil,
      opties, juist: opties.findIndex(o => o.soort === 'goed'),
      index: null, diagram: van, goed: [], soort: van + naar
    };
  }
  return null;
}

/* ── FEEDBACK ── */

const KOPPEL_RELATIE = {
  xv: 'Lees het x,t-diagram stuk voor stuk: de steilheid is de snelheid. Een rechte lijn geeft een horizontale lijn in het v,t-diagram, een lijn die steeds steiler wordt een stijgende.',
  vx: 'Lees het v,t-diagram stuk voor stuk: de snelheid is de steilheid van het x,t-diagram. Horizontaal (niet op nul) geeft een rechte schuine lijn, een stijgende lijn een x,t-lijn die steeds steiler wordt.',
  va: 'De versnelling is de steilheid van het v,t-diagram. Een horizontale v,t-lijn geeft a = 0, een stijgende lijn een positieve a, een dalende lijn een negatieve a.',
  av: 'De versnelling vertelt hoe steil het v,t-diagram is: bij a = 0 is de lijn horizontaal, bij een positieve a stijgt hij. Het karretje begint stil, dus de v,t-lijn begint bij nul.',
  xa: 'Bedenk eerst het v,t-diagram (de steilheid van het x,t-diagram) en daarvan weer de steilheid: dat is a. Een rechte x,t-lijn geeft a = 0.',
  ax: 'Bedenk eerst het v,t-diagram: a is daar de steilheid van, en het karretje begint stil. De snelheid is dan weer de steilheid van het x,t-diagram.'
};

function bewegingInWoorden(beweging) {
  const woorden = beweging.segmenten.map(s => {
    const soort = soortVan(s), r = richtingVan(s) < 0 ? ' (achteruit)' : '';
    return { stil: 'stilstaan', constant: 'constante snelheid', versnellen: 'versnellen', vertragen: 'vertragen' }[soort] + r;
  });
  return 'De beweging: ' + woorden.join(', dan ') + '.';
}

function koppelUitleg(vraag) {
  return bewegingInWoorden(vraag.beweging) + ' ' + KOPPEL_RELATIE[vraag.van + vraag.naar];
}

// Zonder getallen op de as: noem het stuk bij zijn plek in de rij.
const RANGTEL = ['eerste', 'tweede', 'derde', 'vierde'];

function koppelDiagnose(vraag, keuze) {
  const o = vraag.opties[keuze];
  if (o.soort === 'goed') return null;
  const naam = TAAL.bovenbouw.naam;
  switch (o.soort) {
    case 'vorm': return { code: 'vorm', tekst: 'Deze heeft dezelfde vorm als het ' + naam[vraag.van] + '. Maar bij dezelfde beweging zien de diagrammen er anders uit.' };
    case 'stuk': return { code: 'stuk', tekst: 'Bijna: in één stuk klopt deze niet. Kijk vooral naar het ' + RANGTEL[o.stuk] + ' stuk: wat doet het karretje daar?' };
    case 'volgorde': return { code: 'volgorde', tekst: 'Bijna: twee stukken staan in de verkeerde volgorde. Kijk van links naar rechts wat het karretje achtereenvolgens doet.' };
    case 'teken': return { code: 'teken', tekst: 'Hier is alles gespiegeld: boven en onder de t-as zijn verwisseld. Rijdt het karretje vooruit of achteruit, en gaat het sneller of langzamer?' };
    case 'begin': return { code: 'begin', tekst: vraag.naar === 'v' ? 'Het karretje begint stil, dus het v,t-diagram moet bij nul beginnen.' : 'Het karretje begint stil, dus het x,t-diagram moet horizontaal beginnen.' };
  }
  return { code: 'anders', tekst: '' };
}

const KOPPEL_FOUT_TEKST = {
  vorm: 'De vorm van het ene diagram overgenomen in het andere',
  stuk: 'Eén stuk verkeerd gekoppeld',
  volgorde: 'Stukken in de verkeerde volgorde gekoppeld',
  teken: 'Het teken (de richting) verwisseld',
  begin: 'Niet gelet op de beginsnelheid'
};

function koppelFoutCategorie(vraag, keuze) {
  const d = koppelDiagnose(vraag, keuze);
  if (!d) return null;
  const stap = d.code === 'vorm' ? 'zelfdevorm' : d.code === 'teken' ? 'achteruit' : 'koppelen';
  return { sleutel: 'koppel-' + d.code, tekst: KOPPEL_FOUT_TEKST[d.code] || 'Verkeerd gekoppeld', stap };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KOPPEL_LEVELS, maakKoppelVraag, koppelDiagnose, koppelUitleg, koppelFoutCategorie,
                     lijkenOpElkaar, stukkenVan, uitVersnellingen };
}
