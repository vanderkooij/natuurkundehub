/* ══════════════════════════════════════════════════════════════════════
   GETALLEN: rekenvragen bij een diagram met schaalverdeling

   Het level met getallen (onderbouw 5, bovenbouw 7) gebruikt bewegingen met
   hele seconden en hele snelheden, zodat alles netjes af te lezen is. De
   leerling typt een getal; de tool controleert het met een kleine marge en
   laat daarna de uitwerking zien.

   Gebruikt uit beweging.js: bouwBeweging, soortVan, richtingVan, toestand,
   asStap, getalTekst, kies, TAAL, SOORT_NAAM.
   ══════════════════════════════════════════════════════════════════════ */

if (typeof module !== 'undefined' && module.exports && typeof bouwBeweging === 'undefined') {
  Object.assign(globalThis, require('./beweging.js'));
}

const GETAL_TYPEN = {
  onderbouw: ['afstand', 'stilduur', 'snelheidX', 'snelheidV'],
  bovenbouw: ['afstand', 'stilduur', 'snelheidX', 'snelheidV', 'versnelling', 'oppervlakte', 'oppervlakteMeer']
};

/* ── BEWEGINGEN MET HELE GETALLEN ── */

// Verdeelt 12 s over n segmenten van 2 tot en met 5 hele seconden.
function heleDuren(n, rng) {
  for (let p = 0; p < 200; p++) {
    const d = Array.from({ length: n - 1 }, () => 2 + Math.floor(rng() * 4));
    const rest = 12 - d.reduce((a, b) => a + b, 0);
    if (rest >= 2 && rest <= 5) return d.concat(rest);
  }
  return n === 3 ? [4, 4, 4] : [3, 3, 3, 3];
}

// Alleen stilstand en constante snelheid, met knikken: alle plaatsen op de
// segmentgrenzen zijn dan hele getallen.
function rechteBeweging({ achteruit, onderbouw, rng }) {
  const n = rng() < 0.5 ? 3 : 4;
  const duren = heleDuren(n, rng);
  let vorige = rng() < 0.5 ? 'stil' : 'constant', segs = [];
  for (let k = 0; k < n; k++) {
    const soort = k === 0 ? vorige : (vorige === 'stil' ? 'constant' : kies(['stil', 'constant'], rng));
    let v = 0;
    if (soort === 'constant') {
      const r = (achteruit && k > 0 && rng() < 0.45) ? -1 : 1;
      v = r * kies([1, 2, 3, 4, 5], rng);
      // Twee constante stukken achter elkaar moeten echt verschillen.
      if (segs.length && segs[segs.length - 1][1] === v) v = Math.sign(v) * (Math.abs(v) === 5 ? 4 : Math.abs(v) + 1);
    }
    segs.push([duren[k], v, v]);
    vorige = soort;
  }
  const b = bouwBeweging(segs, 0);
  if (onderbouw && b.segmenten.some(s => s.x1 < 0)) return null;
  if (b.segmenten.every(s => s.v0 === 0)) return null;
  return b;
}

// Snelheid zonder sprongen, met een versnelling waarvan het dubbele een heel
// getal is: dan zijn snelheden op de grenzen hele getallen en zijn a en de
// afgelegde afstand netjes uit te rekenen.
function vloeiendeBeweging({ achteruit, onderbouw, rng }) {
  const n = rng() < 0.5 ? 3 : 4;
  const duren = heleDuren(n, rng);
  let v = kies([0, 0, 2, 4], rng), vorige = null;
  const segs = [];
  for (let k = 0; k < n; k++) {
    const d = duren[k], m = Math.abs(v);
    const opties = [];
    if (m === 0 && vorige !== 'stil') opties.push(['stil', 0]);
    if (m !== 0 && vorige !== 'constant') opties.push(['constant', v]);
    for (const a of [0.5, 1, 1.5, 2, 3]) {
      const dv = a * d;
      if (!Number.isInteger(dv)) continue;
      const r = m === 0 ? ((achteruit && rng() < 0.5) ? -1 : 1) : Math.sign(v);
      const sneller = v + r * dv;
      if (Math.abs(sneller) <= 8 && vorige !== 'versnellen') opties.push(['versnellen', sneller]);
      const langzamer = v - Math.sign(v) * dv;
      if (m !== 0 && Math.sign(langzamer) !== -Math.sign(v) && vorige !== 'vertragen') opties.push(['vertragen', langzamer]);
    }
    if (!opties.length) return null;
    const [soort, v1] = kies(opties, rng);
    segs.push([d, v, v1]);
    v = v1; vorige = soort;
  }
  const b = bouwBeweging(segs, 0);
  if (onderbouw && b.segmenten.some(s => s.x1 < -1e-9)) return null;
  if (b.segmenten.every(s => soortVan(s) === 'stil')) return null;
  return b;
}

/* ── VRAGEN ── */

function bijna(a, b) { return Math.abs(a - b) < 1e-6; }
const opRaster = (w, stap) => bijna(w / stap, Math.round(w / stap));

// Bereik van een diagram, zoals de grafiek het tekent (voor de stap op de as).
function bereik(beweging, diagram, spoor) {
  let lo = 0, hi = 0;
  for (let k = 0; k <= 240; k++) {
    const y = waardeIn(diagram, beweging, beweging.T * k / 240, spoor);
    lo = Math.min(lo, y); hi = Math.max(hi, y);
  }
  return asStap(lo, hi);
}

// Grenstijden met de waarde daar (x of v), alleen hele seconden.
function grenzen(beweging, diagram, spoor) {
  const uit = [{ t: 0, w: diagram === 'x' ? beweging.x0 : beweging.segmenten[0].v0 }];
  for (const s of beweging.segmenten) {
    const t = s.t0 + s.duur;
    let w = diagram === 'x' ? s.x1 : s.v1;
    if (diagram === 'v' && spoor === 'onderbouw') w = Math.abs(w);
    uit.push({ t, w });
  }
  return uit;
}

function maakGetalVraag(spoor, level, { rng = Math.random, vorige = null } = {}) {
  const ob = spoor === 'onderbouw';
  const typen = GETAL_TYPEN[spoor].filter(t => !vorige || t !== vorige.type);
  const achteruit = !!LEVELS[spoor][level].achteruit;
  for (let poging = 0; poging < 300; poging++) {
    const type = kies(typen, rng);
    const q = probeerType(type, { spoor, ob, achteruit, rng });
    if (q) return Object.assign(q, { vorm: 'getal', spoor, level, type, goed: [], soort: type });
  }
  return null;
}

function probeerType(type, { spoor, ob, achteruit, rng }) {
  const g = getalTekst;
  const gh = w => w < 0 ? '(' + g(w) + ')' : g(w);      // negatief getal na een min: met haakjes

  if (type === 'afstand') {
    const b = rechteBeweging({ achteruit, onderbouw: ob, rng });
    if (!b) return null;
    const stap = bereik(b, 'x', spoor);
    const kandidaten = grenzen(b, 'x', spoor).filter(p => p.t > 0 && opRaster(p.w, stap));
    if (!kandidaten.length) return null;
    const p = kies(kandidaten, rng);
    return {
      diagram: 'x', beweging: b, index: null, antwoord: p.w, eenheid: 'm', tol: 0.01,
      tekst: ob ? 'Hoe ver is het karretje van de start na ' + p.t + ' s?' : 'Wat is de plaats x op t = ' + p.t + ' s?',
      uitwerking: ob ? 'Zoek ' + p.t + ' s op de tijdas en lees de afstand af: ' + g(p.w) + ' m.'
                     : 'Zoek t = ' + p.t + ' s op de t-as en lees af: x = ' + g(p.w) + ' m.'
    };
  }

  if (type === 'stilduur') {
    const metX = rng() < 0.5;
    const b = metX ? rechteBeweging({ achteruit, onderbouw: ob, rng }) : vloeiendeBeweging({ achteruit, onderbouw: ob, rng });
    if (!b) return null;
    const stil = b.segmenten.filter(s => soortVan(s) === 'stil');
    if (stil.length !== 1) return null;
    const s = stil[0], diagram = metX ? 'x' : 'v';
    const waar = diagram === 'x' ? 'de lijn horizontaal' : (ob ? 'de snelheid nul' : 'v = 0');
    return {
      diagram, beweging: b, index: null, antwoord: s.duur, eenheid: 's', tol: 0.01,
      tekst: 'Hoe lang staat het karretje stil?',
      uitwerking: 'Van ' + (ob ? '' : 't = ') + s.t0 + ' s tot ' + (ob ? '' : 't = ') + (s.t0 + s.duur) + ' s is ' + waar + '. Het karretje staat dus ' + s.duur + ' s stil.'
    };
  }

  if (type === 'snelheidX') {
    const b = rechteBeweging({ achteruit, onderbouw: ob, rng });
    if (!b) return null;
    const stap = bereik(b, 'x', spoor);
    const kandidaten = b.segmenten.map((s, i) => ({ s, i }))
      .filter(({ s }) => s.v0 !== 0 && opRaster(s.x0, stap) && opRaster(s.x1, stap));
    if (!kandidaten.length) return null;
    const { s, i } = kies(kandidaten, rng);
    const t1 = s.t0 + s.duur, dx = s.x1 - s.x0;
    if (ob) {
      const terug = dx < 0;
      return {
        diagram: 'x', beweging: b, index: i, antwoord: Math.abs(s.v0), eenheid: 'm/s', tol: 0.01,
        tekst: 'Hoe groot is de snelheid in het gemarkeerde stuk?',
        uitwerking: 'Van ' + s.t0 + ' s tot ' + t1 + ' s (' + s.duur + ' s) gaat de afstand van ' + g(s.x0) + ' m naar ' + g(s.x1) + ' m' +
          (terug ? ': hij loopt ' + g(-dx) + ' m terug' : ': dat is ' + g(dx) + ' m') +
          '. Snelheid = afstand : tijd = ' + g(Math.abs(dx)) + ' m : ' + s.duur + ' s = ' + g(Math.abs(s.v0)) + ' m/s.',
        verkeerd: { deelPlaats: s.x1 / t1, deelPlaatsDuur: s.x1 / s.duur, alleenAfstand: Math.abs(dx) }
      };
    }
    return {
      diagram: 'x', beweging: b, index: i, antwoord: s.v0, eenheid: 'm/s', tol: 0.01,
      tekst: 'Wat is de snelheid v in het gemarkeerde stuk?',
      uitwerking: 'v = Δx / Δt = (' + g(s.x1) + ' − ' + gh(s.x0) + ') / (' + t1 + ' − ' + s.t0 + ') = ' + g(dx) + ' / ' + s.duur + ' = ' + g(s.v0) + ' m/s.' +
        (s.v0 < 0 ? ' De lijn daalt, dus v is negatief: het karretje rijdt achteruit.' : ''),
      verkeerd: { deelPlaats: s.x1 / t1, deelPlaatsDuur: s.x1 / s.duur, alleenAfstand: dx }
    };
  }

  if (type === 'snelheidV') {
    const b = vloeiendeBeweging({ achteruit, onderbouw: ob, rng });
    if (!b) return null;
    const stap = bereik(b, 'v', spoor);
    const kandidaten = [];
    for (let t = 1; t <= 11; t++) {
      let w = toestand(b, t).v;
      if (ob) w = Math.abs(w);
      if (opRaster(w, stap) && Number.isInteger(w)) kandidaten.push({ t, w });
    }
    if (!kandidaten.length) return null;
    const p = kies(kandidaten, rng);
    return {
      diagram: 'v', beweging: b, index: null, antwoord: p.w, eenheid: 'm/s', tol: 0.01,
      tekst: ob ? 'Hoe groot is de snelheid na ' + p.t + ' s?' : 'Wat is de snelheid v op t = ' + p.t + ' s?',
      uitwerking: ob ? 'Zoek ' + p.t + ' s op de tijdas en lees de snelheid af: ' + g(p.w) + ' m/s.'
                     : 'Zoek t = ' + p.t + ' s op de t-as en lees af: v = ' + g(p.w) + ' m/s.'
    };
  }

  if (type === 'versnelling') {
    const b = vloeiendeBeweging({ achteruit, onderbouw: false, rng });
    if (!b) return null;
    const stap = bereik(b, 'v', spoor);
    const kandidaten = b.segmenten.map((s, i) => ({ s, i }))
      .filter(({ s }) => s.a !== 0 && opRaster(s.v0, stap) && opRaster(s.v1, stap));
    if (!kandidaten.length) return null;
    const { s, i } = kies(kandidaten, rng);
    const t1 = s.t0 + s.duur, dv = s.v1 - s.v0;
    return {
      diagram: 'v', beweging: b, index: i, antwoord: s.a, eenheid: 'm/s²', tol: 0.051,
      tekst: 'Wat is de versnelling a in het gemarkeerde stuk?',
      uitwerking: 'a = Δv / Δt = (' + g(s.v1) + ' − ' + gh(s.v0) + ') / (' + t1 + ' − ' + s.t0 + ') = ' + g(dv) + ' / ' + s.duur + ' = ' + g(s.a) + ' m/s².',
      verkeerd: { alleenDv: dv, deelSnelheid: s.v1 / t1 }
    };
  }

  if (type === 'oppervlakteMeer') {
    // Twee of drie stukken achter elkaar, zonder van richting te wisselen.
    const b = vloeiendeBeweging({ achteruit, onderbouw: false, rng });
    if (!b) return null;
    const stap = bereik(b, 'v', spoor), segs = b.segmenten;
    const kandidaten = [];
    for (let i = 0; i < segs.length; i++) {
      for (let j = i + 1; j <= Math.min(i + 2, segs.length - 1); j++) {
        const deel = segs.slice(i, j + 1);
        const tekens = new Set(deel.flatMap(s => [Math.sign(s.v0), Math.sign(s.v1)]).filter(x => x !== 0));
        const rijdt = deel.filter(s => soortVan(s) !== 'stil').length;
        if (tekens.size <= 1 && rijdt >= 2 && deel.every(s => opRaster(s.v0, stap) && opRaster(s.v1, stap)))
          kandidaten.push([i, j]);
      }
    }
    if (!kandidaten.length) return null;
    const [i, j] = kies(kandidaten, rng);
    const deel = segs.slice(i, j + 1);
    const stukken = deel.map(stukOppervlakte);
    const afstand = stukken.reduce((a, s) => a + s.opp, 0);
    const t0 = deel[0].t0, t1 = deel[deel.length - 1].t0 + deel[deel.length - 1].duur;
    return {
      diagram: 'v', beweging: b, index: deel.map((_, k) => i + k), antwoord: afstand, eenheid: 'm', tol: 0.051,
      tekst: 'Hoeveel meter legt het karretje af van t = ' + t0 + ' s tot t = ' + t1 + ' s?',
      uitwerking: 'Deel het op in stukken en tel de oppervlaktes op. ' +
        stukken.map(s => 'Van ' + s.van + ' tot ' + s.tot + ' s: ' + s.tekst).join(' ') +
        ' Samen ' + stukken.map(s => g(s.opp)).join(' + ') + ' = ' + g(afstand) + ' m.' +
        (deel.some(s => s.v0 < 0 || s.v1 < 0) ? ' De lijn ligt onder de t-as: het karretje rijdt achteruit, maar de afgelegde afstand is positief.' : ''),
      verkeerd: { stukken: stukken.map(s => s.opp) }
    };
  }

  if (type === 'oppervlakte') {
    const b = vloeiendeBeweging({ achteruit, onderbouw: false, rng });
    if (!b) return null;
    const stap = bereik(b, 'v', spoor);
    const kandidaten = b.segmenten.map((s, i) => ({ s, i }))
      .filter(({ s }) => soortVan(s) !== 'stil' && opRaster(s.v0, stap) && opRaster(s.v1, stap));
    if (!kandidaten.length) return null;
    const { s, i } = kies(kandidaten, rng);
    const afstand = Math.abs(s.x1 - s.x0), t1 = s.t0 + s.duur;
    const v0 = Math.abs(s.v0), v1 = Math.abs(s.v1);
    let vorm;
    if (v0 === v1) vorm = 'een rechthoek: ' + g(v0) + ' × ' + s.duur + ' = ' + g(afstand) + ' m.';
    else if (v0 === 0 || v1 === 0) vorm = 'een driehoek: ½ × ' + s.duur + ' × ' + g(Math.max(v0, v1)) + ' = ' + g(afstand) + ' m.';
    else vorm = 'een trapezium: (' + g(v0) + ' + ' + g(v1) + ') / 2 × ' + s.duur + ' = ' + g(afstand) + ' m.';
    // Bij een rechte lijn kan het ook met de gemiddelde snelheid; dat is even goed.
    if (v0 !== v1) vorm += ' Of met de gemiddelde snelheid: die is (' + g(v0) + ' + ' + g(v1) + ') / 2 = ' + g((v0 + v1) / 2) +
      ' m/s, en ' + g((v0 + v1) / 2) + ' m/s × ' + s.duur + ' s = ' + g(afstand) + ' m.';
    return {
      diagram: 'v', beweging: b, index: i, antwoord: afstand, eenheid: 'm', tol: 0.051,
      tekst: 'Hoeveel meter legt het karretje af in het gemarkeerde stuk?',
      uitwerking: 'De afstand is de oppervlakte tussen de lijn en de t-as, van t = ' + s.t0 + ' s tot t = ' + t1 + ' s. Dat is ' + vorm +
        (s.v0 < 0 || s.v1 < 0 ? ' De lijn ligt onder de t-as: het karretje rijdt achteruit, maar de afgelegde afstand is positief.' : ''),
      verkeerd: { rechthoek: Math.max(v0, v1) * s.duur, rechthoekKlein: Math.min(v0, v1) * s.duur }
    };
  }
  return null;
}

// Oppervlakte onder één stuk van het v,t-diagram, met een korte uitleg.
function stukOppervlakte(s) {
  const g = getalTekst, v0 = Math.abs(s.v0), v1 = Math.abs(s.v1), d = s.duur;
  const opp = Math.abs(s.x1 - s.x0);
  let tekst;
  if (v0 === 0 && v1 === 0) tekst = 'stilstand, 0 m.';
  else if (v0 === v1) tekst = 'rechthoek ' + g(v0) + ' × ' + d + ' = ' + g(opp) + ' m.';
  else if (v0 === 0 || v1 === 0) tekst = 'driehoek ½ × ' + d + ' × ' + g(Math.max(v0, v1)) + ' = ' + g(opp) + ' m.';
  else tekst = 'trapezium (' + g(v0) + ' + ' + g(v1) + ') / 2 × ' + d + ' = ' + g(opp) + ' m.';
  return { opp, tekst, van: s.t0, tot: s.t0 + d };
}

/* ── CONTROLE ── */

// Leest een getal zoals een leerling het typt: komma of punt, echt minteken,
// spaties, en eventueel de eenheid erachter.
function leesGetal(invoer) {
  const s = String(invoer).trim()
    .replace(/[−–—]/g, '-').replace(/\s+/g, '').replace(',', '.');
  const m = s.match(/^[+-]?(\d+\.?\d*|\.\d+)/);
  return m ? Number(m[0]) : NaN;
}

function isGoed(vraag, waarde) {
  return Math.abs(waarde - vraag.antwoord) <= vraag.tol;
}

// Een duwtje voor de tweede poging, zonder het antwoord te verklappen.
function getalHint(vraag) {
  const ob = vraag.spoor === 'onderbouw';
  switch (vraag.type) {
    case 'afstand':
    case 'snelheidV': return 'Zoek het tijdstip op de ' + (ob ? 'tijdas' : 't-as') + ', ga recht omhoog naar de lijn en dan opzij naar de verticale as.';
    case 'stilduur': return 'Kijk van welk tijdstip tot welk tijdstip ' + (vraag.diagram === 'x' ? 'de lijn horizontaal is.' : 'de lijn op nul ligt.');
    case 'snelheidX': return ob ? 'Hoeveel afstand komt erbij in het gemarkeerde stuk, en hoeveel tijd duurt dat stuk? Snelheid = afstand : tijd.'
                                : 'v = Δx / Δt. Lees x en t af aan het begin en het eind van het gemarkeerde stuk.';
    case 'versnelling': return 'a = Δv / Δt. Lees v en t af aan het begin en het eind van het gemarkeerde stuk.';
    case 'oppervlakte': return 'Reken de oppervlakte uit tussen de lijn en de t-as in het gemarkeerde stuk.';
    case 'oppervlakteMeer': return 'Deel het gemarkeerde stuk op in delen (rechthoek, driehoek, trapezium), reken elke oppervlakte uit en tel ze op.';
  }
  return '';
}

// Bekende fouten bij een rekenvraag.
function getalDiagnose(vraag, waarde) {
  if (isGoed(vraag, waarde)) return null;
  const v = vraag.verkeerd || {};
  const dicht = w => w !== undefined && Math.abs(waarde - w) <= Math.max(0.051, vraag.tol);
  if (vraag.spoor === 'bovenbouw' && vraag.antwoord !== 0 && Math.abs(Math.abs(waarde) - Math.abs(vraag.antwoord)) <= vraag.tol)
    return { code: 'teken', tekst: vraag.type === 'versnelling'
      ? 'Het getal klopt, maar let op het teken. Neemt de snelheid af (in de richting waarin hij rijdt), of rijdt hij achteruit, kijk dan goed of a positief of negatief is.'
      : 'Het getal klopt, maar let op het teken. Rijdt het karretje achteruit, dan is v negatief.' };
  if (vraag.type === 'snelheidX') {
    if (dicht(v.alleenAfstand)) return { code: 'nietGedeeld', tekst: 'Dat is de afstand die hij aflegt. Deel die nog door de tijd.' };
    if (dicht(v.deelPlaats) || dicht(v.deelPlaatsDuur))
      return { code: 'geenVerschil', tekst: vraag.spoor === 'onderbouw'
        ? 'Je nam de afstand op één moment. Je hebt nodig hoeveel afstand erbij komt in het gemarkeerde stuk: eind min begin.'
        : 'Je deelde de plaats zelf door de tijd. Je hebt het verschil nodig: Δx / Δt.' };
  }
  if (vraag.type === 'versnelling') {
    if (dicht(v.alleenDv)) return { code: 'nietGedeeld', tekst: 'Dat is hoeveel de snelheid verandert. Deel dat nog door de tijd Δt.' };
    if (dicht(v.deelSnelheid)) return { code: 'geenVerschil', tekst: 'Je deelde de snelheid zelf door de tijd. Je hebt het verschil nodig: Δv / Δt.' };
  }
  if (vraag.type === 'oppervlakteMeer' && v.stukken.some(dicht))
    return { code: 'eenStuk', tekst: 'Dat is de oppervlakte van één stuk. Tel de oppervlaktes van alle gemarkeerde stukken bij elkaar op.' };
  if (vraag.type === 'oppervlakte' && (dicht(v.rechthoek) || dicht(v.rechthoekKlein)))
    return { code: 'rechthoek', tekst: 'De snelheid verandert in dit stuk, dus het is geen rechthoek. Neem de oppervlakte van de driehoek of het trapezium onder de lijn.' };
  return { code: 'anders', tekst: '' };
}

const GETAL_FOUT_TEKST = {
  afstand: 'Aflezen in een afstand-tijddiagram',
  stilduur: 'Aflezen hoe lang het karretje stilstaat',
  snelheidX: 'De snelheid uitrekenen uit een afstand-tijddiagram',
  snelheidV: 'Aflezen in een snelheid-tijddiagram',
  versnelling: 'De versnelling uitrekenen uit een v,t-diagram',
  oppervlakte: 'De afstand uitrekenen als oppervlakte onder een v,t-diagram',
  oppervlakteMeer: 'De afstand over meer stukken uitrekenen uit een v,t-diagram'
};

function getalFoutCategorie(vraag, waarde) {
  const d = getalDiagnose(vraag, waarde);
  if (!d) return null;
  if (d.code === 'teken') return { sleutel: 'getal-teken', tekst: 'Het teken (plus of min) vergeten', stap: 'getallen' };
  let tekst = GETAL_FOUT_TEKST[vraag.type];
  if (vraag.spoor === 'bovenbouw') tekst = tekst.replace('afstand-tijddiagram', 'x,t-diagram').replace('snelheid-tijddiagram', 'v,t-diagram');
  return { sleutel: 'getal-' + vraag.type, tekst, stap: 'getallen' };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GETAL_TYPEN, maakGetalVraag, leesGetal, isGoed, getalDiagnose, getalFoutCategorie, getalHint,
                     rechteBeweging, vloeiendeBeweging, heleDuren };
}
