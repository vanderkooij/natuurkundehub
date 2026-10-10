/* ══════════════════════════════════════════════════════════════════════
   BEWEGING: model, vraaggenerator en feedback voor Bewegingsgrafieken

   Eén beweging is een reeks segmenten met elk een beginsnelheid en een
   eindsnelheid (eenparig: de versnelling is per segment constant). Uit dat
   ene model volgen x(t), v(t), a(t) en het karretje, zodat de diagrammen en
   de animatie altijd met elkaar kloppen.

   Werkt in de browser (globale functies) en in node (module.exports) voor
   de tests: npm run test:bewegingen
   ══════════════════════════════════════════════════════════════════════ */

const SOORTEN = ['stil', 'constant', 'versnellen', 'vertragen'];
const SOORT_NAAM = {
  stil: 'Stilstand', constant: 'Constante snelheid',
  versnellen: 'Versnellen', vertragen: 'Vertragen'
};
const DUUR_TOTAAL = 12;          // modelseconden; de as heeft geen getallen

// Woorden per spoor. De onderbouw rekent met afstand (tot de start) en
// gebruikt geen symbolen; de bovenbouw gebruikt x, v en a.
const TAAL = {
  onderbouw: {
    as: { x: 'afstand (m)', v: 'snelheid (m/s)', a: 'versnelling (m/s²)', t: 'tijd (s)' },
    naam: { x: 'afstand-tijddiagram', v: 'snelheid-tijddiagram', a: 'versnelling-tijddiagram' },
    kort: { x: 'afstand', v: 'snelheid', a: 'versnelling' }
  },
  bovenbouw: {
    as: { x: 'x (m)', v: 'v (m/s)', a: 'a (m/s²)', t: 't (s)' },
    naam: { x: 'x,t-diagram', v: 'v,t-diagram', a: 'a,t-diagram' },
    kort: { x: 'x,t', v: 'v,t', a: 'a,t' }
  }
};

// Levels per spoor. In de onderbouw rijdt het karretje alleen vooruit: daar
// bestaat nog geen richting, en een positieve snelheid bij terugrijden zou in
// de bovenbouw weer afgeleerd moeten worden (besloten met Jop, 2026-10-10).
// Levels per spoor. `diagrammen` is een weging; `xRecht` beperkt vragen in
// het afstanddiagram tot rechte stukken; `contrast` is de kans dat een vraag
// gekozen wordt waarbij plaatjeslezen een ander antwoord geeft dan het goede;
// `achteruitFocus` is de kans dat het gemarkeerde stuk achteruit gaat.
const LEVELS = {
  onderbouw: {
    1: { diagrammen: { v: 1 }, achteruit: false,
         desc: 'Alleen het snelheid-tijddiagram', voorbeeld: 'snelheid',
         nieuw: 'Dit is een snelheid-tijddiagram: de hoogte van de lijn is de snelheid.' },
    2: { diagrammen: { x: 0.6, v: 0.4 }, achteruit: false, xRecht: true,
         desc: 'Erbij: afstand-tijddiagram met rechte stukken', voorbeeld: 'afstand + snelheid',
         nieuw: 'Nieuw: het afstand-tijddiagram. Kijk eerst naar de as: gaat het over afstand of over snelheid?' },
    3: { diagrammen: { x: 0.6, v: 0.4 }, achteruit: false,
         desc: 'Erbij: kromme lijnen in het afstand-tijddiagram', voorbeeld: 'kromme lijnen',
         nieuw: 'Nieuw: kromme lijnen in het afstand-tijddiagram. Wordt de lijn steeds steiler of steeds vlakker?' },
    4: { diagrammen: { x: 0.5, v: 0.5 }, achteruit: false, contrast: 0.7,
         desc: 'Alles door elkaar, met strikvragen', voorbeeld: 'alles',
         nieuw: 'Alles door elkaar, met strikvragen. Kijk elke keer eerst naar de as.' },
    5: { diagrammen: { x: 0.5, v: 0.5 }, achteruit: false, getallen: true,
         desc: 'Met getallen: aflezen en de snelheid uitrekenen', voorbeeld: '12 m : 4 s',
         nieuw: 'Nieuw: getallen op de assen. Lees goed af en typ je antwoord als getal.' },
    // Eindmix: de moeilijkste levels door elkaar (diagrammen komen uit die levels).
    6: { mix: [4, 5], diagrammen: { x: 0.5, v: 0.5 }, achteruit: false,
         desc: 'Eindmix: strikvragen en rekenvragen door elkaar', voorbeeld: 'mix',
         nieuw: 'Eindmix: strikvragen en rekenvragen door elkaar. Kijk elke keer eerst wat er gevraagd wordt.' }
  },
  bovenbouw: {
    1: { diagrammen: { v: 1 }, achteruit: false,
         desc: 'Alleen het v,t-diagram, alles vooruit', voorbeeld: 'v,t',
         nieuw: 'Dit is een v,t-diagram: de hoogte van de lijn is de snelheid.' },
    2: { diagrammen: { x: 0.6, v: 0.4 }, achteruit: false,
         desc: 'Erbij: het x,t-diagram, recht en krom', voorbeeld: 'x,t + v,t',
         nieuw: 'Nieuw: het x,t-diagram. Kijk eerst naar de as: x of v?' },
    3: { diagrammen: { x: 0.5, v: 0.5 }, achteruit: false, contrast: 0.7,
         desc: 'Door elkaar, met strikvragen', voorbeeld: 'strikvragen',
         nieuw: 'Strikvragen: dezelfde vorm komt in allebei de diagrammen voor. Kijk elke keer naar de as.' },
    4: { diagrammen: { x: 0.5, v: 0.5 }, achteruit: true, contrast: 0.4, achteruitFocus: 0.6,
         desc: 'Achteruit: negatieve snelheid, dalende x', voorbeeld: 'v < 0',
         nieuw: 'Nieuw: achteruit rijden. Versnellen en vertragen gaan over de grootte van de snelheid, niet over het teken.' },
    5: { diagrammen: { a: 0.7, x: 0.15, v: 0.15 }, achteruit: false,
         desc: 'Het a,t-diagram, alles vooruit', voorbeeld: 'a,t',
         nieuw: 'Nieuw: het a,t-diagram. De hoogte van de lijn is de versnelling. Het karretje rijdt hier alleen vooruit.' },
    6: { diagrammen: { a: 0.7, x: 0.15, v: 0.15 }, achteruit: true, achteruitFocus: 0.6,
         desc: 'Het a,t-diagram, ook achteruit (doordenker)', voorbeeld: 'a,t + achteruit',
         nieuw: 'Nieuw: het a,t-diagram met achteruitrijden. Vergelijk het teken van a met de richting waarin het karretje rijdt.' },
    7: { diagrammen: { x: 0.5, v: 0.5 }, achteruit: true, getallen: true,
         desc: 'Met getallen: aflezen, v, a en de oppervlakte', voorbeeld: 'Δv / Δt',
         nieuw: 'Nieuw: getallen op de assen. Lees goed af, let op het teken, en typ je antwoord als getal.' },
    8: { mix: [3, 4, 6, 7], diagrammen: { x: 0.4, v: 0.4, a: 0.2 }, achteruit: true,
         desc: 'Eindmix: achteruit, a,t en getallen door elkaar', voorbeeld: 'mix',
         nieuw: 'Eindmix: achteruit, het a,t-diagram en rekenvragen door elkaar. Kijk elke keer eerst wat er gevraagd wordt.' }
  }
};

/* ── MODEL ── */

// segs: lijst van [duur, vBegin, vEind]. x0: beginplaats.
function bouwBeweging(segs, x0 = 0) {
  let t = 0, x = x0;
  const segmenten = segs.map(([duur, v0, v1]) => {
    const a = (v1 - v0) / duur;
    const s = { t0: t, duur, v0, v1, a, x0: x };
    x += v0 * duur + 0.5 * a * duur * duur;
    t += duur;
    s.x1 = x;
    return s;
  });
  return { segmenten, T: t, x0 };
}

function soortVan(s) {
  if (s.v0 === 0 && s.v1 === 0) return 'stil';
  if (s.v0 === s.v1) return 'constant';
  return Math.abs(s.v1) > Math.abs(s.v0) ? 'versnellen' : 'vertragen';
}

// +1 vooruit, -1 achteruit, 0 stil. Binnen een segment wisselt het teken niet.
function richtingVan(s) {
  return Math.sign(s.v0 || s.v1);
}

function segmentOp(beweging, t) {
  const segs = beweging.segmenten;
  for (let i = 0; i < segs.length; i++) {
    if (t < segs[i].t0 + segs[i].duur) return i;
  }
  return segs.length - 1;
}

function toestand(beweging, t) {
  t = Math.max(0, Math.min(beweging.T, t));
  const i = segmentOp(beweging, t);
  const s = beweging.segmenten[i];
  const dt = t - s.t0;
  return {
    i, t,
    x: s.x0 + s.v0 * dt + 0.5 * s.a * dt * dt,
    v: s.v0 + s.a * dt,
    a: s.a
  };
}

// De waarde die een diagram op tijdstip t laat zien. In de onderbouw is het
// snelheidsdiagram een snelheidsmeterdiagram: altijd positief.
function waardeIn(diagram, beweging, t, spoor) {
  const st = toestand(beweging, t);
  if (diagram === 'x') return st.x;
  if (diagram === 'v') return spoor === 'onderbouw' ? Math.abs(st.v) : st.v;
  return st.a;
}

// Een mooie stap voor een as met getallen: hooguit ongeveer tien streepjes.
function asStap(lo, hi) {
  for (const s of [1, 2, 5, 10, 20, 50]) if ((hi - lo) / s <= 10) return s;
  return 100;
}

// Een getal zoals in een Nederlandse tekst: komma, echt minteken, hooguit twee decimalen.
function getalTekst(w) {
  const r = Math.round(w * 100) / 100;
  return (r < 0 ? '−' : '') + String(Math.abs(r)).replace('.', ',');
}

/* ── GENERATOR ── */

function kies(lijst, rng) { return lijst[Math.floor(rng() * lijst.length)]; }

function kiesGewogen(weging, rng) {
  const paren = Object.entries(weging);
  let r = rng() * paren.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of paren) { if ((r -= w) < 0) return k; }
  return paren[paren.length - 1][0];
}

// Verdeelt de totale duur willekeurig over n segmenten (elk minstens ~2 s).
function verdeelDuur(n, rng) {
  const ruw = Array.from({ length: n }, () => 2 + rng() * 3);
  const som = ruw.reduce((a, b) => a + b, 0);
  return ruw.map(d => d * DUUR_TOTAAL / som);
}

// Maakt een willekeurige beweging.
//  sprongen:  snelheid mag in één keer veranderen (knik in het x,t-diagram)
//  recht:     alleen stilstand en constante snelheid (met sprongen)
//  achteruit: negatieve snelheid toegestaan
//  onderbouw: de afstand tot de start wordt nooit negatief
function genereerBeweging({ sprongen = false, recht = false, achteruit = false, onderbouw = false, rng = Math.random } = {}) {
  const n = rng() < 0.5 ? 3 : 4;
  const duren = verdeelDuur(n, rng);
  const richting = () => (achteruit && rng() < 0.5) ? -1 : 1;
  let v = 0;
  if (!recht && rng() < 0.4) v = kies([2, 3], rng);   // soms rijdt hij al
  let vorige = null;
  const segs = [];

  for (let k = 0; k < n; k++) {
    const m = Math.abs(v);
    let kandidaten = recht ? ['stil', 'constant'] : SOORTEN.filter(s => {
      if (s === 'stil') return m === 0 || sprongen;
      if (s === 'constant') return m !== 0 || sprongen;
      if (s === 'versnellen') return m <= 3;
      return m >= 3 || sprongen;                          // vertragen
    });
    kandidaten = kandidaten.filter(s => s !== vorige);
    if (!kandidaten.length) return null;
    const soort = kies(kandidaten, rng);
    let v0, v1;
    if (soort === 'stil') {
      v0 = v1 = 0;
    } else if (soort === 'constant') {
      v0 = (m !== 0 && !(sprongen && rng() < 0.5)) ? v : richting() * kies([2, 3, 4, 6], rng);
      v1 = v0;
    } else if (soort === 'versnellen') {
      const r = m === 0 ? richting() : Math.sign(v);
      const doel = kies([4, 5, 6, 7, 8].filter(w => w >= Math.max(m + 3, 2.5 * m)), rng);
      v0 = v; v1 = r * doel;
    } else {
      v0 = m >= 3 ? v : richting() * kies([4, 6, 8], rng);
      v1 = rng() < 0.6 ? 0 : Math.sign(v0) * Math.abs(v0) / 4;
    }
    segs.push([duren[k], v0, v1]);
    v = v1;
    vorige = soort;
  }

  const b = bouwBeweging(segs, 0);
  // Een beweging waarin niets beweegt, levert geen bruikbaar plaatje op.
  if (b.segmenten.every(s => soortVan(s) === 'stil')) return null;
  if (onderbouw && b.segmenten.some(s => s.x1 < -1e-9)) return null;
  return b;
}

/* ── LEZEN ALS EEN ANDER DIAGRAM ── */

// Welke vorm heeft het gemarkeerde stuk in het getoonde diagram?
function vormIn(diagram, s, spoor) {
  const meet = v => (diagram === 'v' && spoor === 'onderbouw') ? Math.abs(v) : v;
  if (diagram === 'x') {
    if (s.v0 === 0 && s.v1 === 0) return { soort: 'vlak', yBegin: s.x0, yEind: s.x1 };
    if (s.a === 0) return { soort: 'recht', yBegin: s.x0, yEind: s.x1 };
    return { soort: 'krom', yBegin: s.x0, yEind: s.x1 };
  }
  if (diagram === 'v') {
    return { soort: s.a === 0 ? 'vlak' : 'recht', yBegin: meet(s.v0), yEind: meet(s.v1) };
  }
  return { soort: 'vlak', yBegin: s.a, yEind: s.a };
}

// Het antwoord dat je geeft als je de lijn leest alsof het `als`-diagram is:
// in een snelheidsdiagram is de hoogte de snelheid, in een afstanddiagram de
// steilheid.
function leesAls(vraag, als) {
  const s = vraag.beweging.segmenten[vraag.index];
  const vorm = vormIn(vraag.diagram, s, vraag.spoor);
  if (als === 'v') {
    if (vorm.soort === 'vlak') return Math.abs(vorm.yBegin) < 1e-9 ? 'stil' : 'constant';
    return Math.abs(vorm.yEind) > Math.abs(vorm.yBegin) ? 'versnellen' : 'vertragen';
  }
  if (als === 'x') {
    if (vorm.soort === 'vlak') return 'stil';
    if (vorm.soort === 'recht') return 'constant';
    return null;                                       // een kromme lezen we hier niet als x,t
  }
  return null;
}

function andereDiagrammen(vraag) {
  if (vraag.diagram === 'x') return ['v'];
  if (vraag.diagram === 'v') return ['x'];
  return ['v', 'x'];
}

// Een strikvraag: wie de lijn als het andere diagram leest, kiest fout.
function isContrast(vraag) {
  return andereDiagrammen(vraag).some(d => {
    const a = leesAls(vraag, d);
    return a && !vraag.goed.includes(a);
  });
}

/* ── VRAAG ── */

// Met `vast` kun je keuzes vastzetten (voor de vragen in de uitleg):
// { diagram, doel, achteruit, contrast }.
function maakVraag(spoor, level, { rng = Math.random, vorige = null, vast = {} } = {}) {
  const L = LEVELS[spoor][level];
  for (let poging = 0; poging < 60; poging++) {
    const diagram = vast.diagram || kiesGewogen(L.diagrammen, rng);
    const recht = diagram === 'x' && !!L.xRecht;
    // Knikken in het x,t-diagram (de snelheid springt in één keer) mogen,
    // behalve in levels met het a,t-diagram: daar zou de versnelling op dat
    // moment oneindig groot zijn, en dat laat het a,t-diagram niet zien.
    const sprongen = diagram === 'x' && !('a' in L.diagrammen);

    // Eerst het antwoord kiezen, dan bewegingen zoeken die het hebben: zo
    // komen de vier antwoorden ongeveer even vaak voor.
    let doel = vast.doel;
    if (!doel && diagram === 'a') doel = kies(['nul', 'versnellen', 'vertragen'], rng);
    else if (!doel) doel = kies(recht ? ['stil', 'constant'] : SOORTEN, rng);
    // Niet twee keer achter elkaar hetzelfde diagram met hetzelfde antwoord.
    if (vorige && vorige.diagram === diagram && poging < 20 &&
        (doel === 'nul' ? vorige.goed.length > 1 : vorige.soort === doel)) continue;
    const wilAchteruit = vast.achteruit ?? (L.achteruit && doel !== 'stil' && rng() < (L.achteruitFocus ?? 0.35));
    const wilContrast = vast.contrast ?? (!!L.contrast && rng() < L.contrast);

    for (let k = 0; k < 30; k++) {
      const beweging = genereerBeweging({ sprongen, recht, achteruit: L.achteruit, onderbouw: spoor === 'onderbouw', rng });
      if (!beweging) continue;
      const past = beweging.segmenten
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => {
          const sr = soortVan(s);
          const okSoort = doel === 'nul' ? (sr === 'stil' || sr === 'constant') : sr === doel;
          return okSoort && (!wilAchteruit || richtingVan(s) < 0);
        });
      if (!past.length) continue;
      const { s, i } = kies(past, rng);
      const soort = soortVan(s);
      const vraag = {
        spoor, level, diagram, beweging, index: i, soort,
        richting: richtingVan(s),
        goed: (diagram === 'a' && s.a === 0) ? ['stil', 'constant'] : [soort]
      };
      if (wilContrast && !isContrast(vraag)) continue;
      return vraag;
    }
  }
  return null;
}

// De extra regel boven de vraag. Bij het a,t-diagram moet de richting erbij,
// anders is de vraag niet te beantwoorden.
function vraagHint(vraag) {
  if (vraag.diagram !== 'a') return '';
  if (!LEVELS[vraag.spoor][vraag.level].achteruit) return 'Het karretje rijdt in deze beweging alleen vooruit.';
  // Bij a = 0 zou de richting verklappen of het karretje rijdt (en zijn
  // stilstand en constante snelheid allebei goed): dan een neutrale hint.
  if (vraag.beweging.segmenten[vraag.index].a === 0)
    return 'In dit level kan het karretje ook achteruit rijden.';
  return vraag.richting < 0
    ? 'In het gemarkeerde stuk rijdt het karretje achteruit.'
    : 'In het gemarkeerde stuk rijdt het karretje vooruit (of staat het stil).';
}

/* ── FEEDBACK ── */

// Uitleg bij het goede antwoord: wat zie je in dit diagram, en wat betekent het.
function uitlegTekst(vraag) {
  const { spoor, diagram, soort, richting } = vraag;
  const s = vraag.beweging.segmenten[vraag.index];
  const ob = spoor === 'onderbouw';
  const terug = richting < 0;

  if (diagram === 'x') {
    if (ob) {
      if (soort === 'stil') return 'De lijn is horizontaal: de afstand tot de start verandert niet. Hij staat stil.';
      if (soort === 'constant') return terug
        ? 'De lijn is recht en daalt: elke seconde komt hij evenveel dichter bij de start. Hij loopt met constante snelheid terug.'
        : 'De lijn is recht en loopt schuin omhoog: elke seconde komt er evenveel afstand bij. Dat is een constante snelheid.';
      if (soort === 'versnellen') return terug
        ? 'De lijn daalt steeds steiler: hij gaat steeds sneller terug naar de start.'
        : 'De lijn wordt steeds steiler: elke seconde komt er meer afstand bij dan de seconde ervoor. Hij gaat steeds sneller.';
      return terug
        ? 'De lijn daalt steeds minder steil: hij gaat steeds langzamer terug naar de start.'
        : 'De lijn wordt steeds vlakker: elke seconde komt er minder afstand bij. Hij gaat steeds langzamer.';
    }
    if (soort === 'stil') return 'De lijn is horizontaal: x verandert niet, dus v = 0. Hij staat stil.';
    if (soort === 'constant') return terug
      ? 'De lijn is recht en daalt: x neemt elke seconde evenveel af. De snelheid is constant en negatief: hij rijdt achteruit.'
      : 'De lijn is recht: x neemt elke seconde evenveel toe. De steilheid is de snelheid, en die blijft gelijk.';
    if (soort === 'versnellen') return terug
      ? 'De lijn daalt steeds steiler: de steilheid (de snelheid) wordt steeds negatiever. Hij rijdt achteruit en gaat steeds sneller.'
      : 'De lijn wordt steeds steiler: de steilheid is de snelheid, en die neemt toe.';
    return terug
      ? 'De lijn daalt steeds minder steil: hij rijdt achteruit, maar steeds langzamer.'
      : 'De lijn wordt steeds vlakker: de steilheid (de snelheid) neemt af.';
  }

  if (diagram === 'v') {
    const totStil = s.v1 === 0 ? ' tot hij stilstaat' : '';
    if (ob) {
      if (soort === 'stil') return 'De lijn ligt op nul: de snelheid is nul. Hij staat stil.';
      if (soort === 'constant') return 'De lijn is horizontaal, maar niet op nul: hij rijdt, en zijn snelheid blijft gelijk.';
      if (soort === 'versnellen') return 'De lijn stijgt: de snelheid wordt groter.';
      return 'De lijn daalt: de snelheid wordt kleiner' + totStil + '.';
    }
    if (soort === 'stil') return 'De lijn ligt op de t-as: v = 0. Hij staat stil.';
    if (soort === 'constant') return terug
      ? 'De lijn is horizontaal onder de t-as: v is constant en negatief. Hij rijdt met constante snelheid achteruit.'
      : 'De lijn is horizontaal, maar niet op de t-as: v blijft gelijk.';
    if (soort === 'versnellen') return terug
      ? 'De lijn daalt, maar ligt onder de t-as: v wordt steeds negatiever, dus de snelheid wordt groter. Hij gaat steeds sneller achteruit.'
      : 'De lijn stijgt: v wordt groter.';
    return terug
      ? 'De lijn stijgt, maar ligt onder de t-as en komt dichter bij nul: de snelheid wordt kleiner' + totStil + '. Hij remt af.'
      : 'De lijn daalt naar de t-as: v wordt kleiner' + totStil + '.';
  }

  // a,t-diagram
  if (s.a === 0) return 'De lijn ligt op de t-as: a = 0, dus de snelheid verandert niet. Dat kan stilstand zijn of een constante snelheid. Aan het a,t-diagram alleen zie je dat niet, daarom zijn beide antwoorden goed.';
  const plus = s.a > 0;
  if (!terug) return plus
    ? 'a is positief en hij rijdt vooruit: de snelheid neemt toe.'
    : 'a is negatief terwijl hij vooruit rijdt: de snelheid neemt af. Hij remt af.';
  return plus
    ? 'a is positief, maar hij rijdt achteruit: a en v hebben een tegengesteld teken. Dan neemt de snelheid af. Hij remt af.'
    : 'a is negatief en hij rijdt achteruit: a en v hebben hetzelfde teken. Dan neemt de snelheid toe, ook al is a negatief.';
}

// Waarom was dit antwoord fout? Eerst de richtingsfouten, dan het lezen van
// het verkeerde diagram, anders niets specifieks.
function diagnose(vraag, gekozen) {
  if (vraag.goed.includes(gekozen)) return null;
  const { spoor, diagram, soort, richting } = vraag;
  const T = TAAL[spoor];
  const s = vraag.beweging.segmenten[vraag.index];

  if (richting < 0) {
    if (diagram === 'x' && gekozen === 'vertragen') {
      return { code: 'richting', tekst: spoor === 'onderbouw'
        ? 'Een dalende lijn betekent niet dat hij afremt, maar dat hij teruggaat naar de start. Of hij sneller of langzamer gaat, zie je aan de steilheid.'
        : 'Een dalende lijn in een x,t-diagram betekent dat hij achteruit rijdt, niet dat hij afremt. Of hij sneller of langzamer gaat, zie je aan hoe de steilheid verandert.' };
    }
    if (diagram === 'v' && spoor === 'bovenbouw') {
      if (soort === 'versnellen' && gekozen === 'vertragen')
        return { code: 'richting', tekst: 'De lijn daalt, maar hij ligt onder de t-as. De snelheid is de afstand tot de t-as, en die wordt groter.' };
      if (soort === 'vertragen' && gekozen === 'versnellen')
        return { code: 'richting', tekst: 'De lijn stijgt, maar hij ligt onder de t-as en komt dichter bij nul. De snelheid wordt dus kleiner.' };
    }
    if (diagram === 'a' && s.a !== 0) {
      const vooruitAntwoord = s.a > 0 ? 'versnellen' : 'vertragen';
      if (gekozen === vooruitAntwoord)
        return { code: 'richting', tekst: 'Dat zou kloppen als hij vooruit reed, maar in dit stuk rijdt hij achteruit.' };
    }
  }

  for (const als of andereDiagrammen(vraag)) {
    if (leesAls(vraag, als) === gekozen) {
      const hier = T.naam[diagram], daar = T.naam[als];
      let tekst = 'Kijk goed naar de as: dit is een ' + hier + ', geen ' + daar + '. ';
      if (diagram === 'x') tekst += spoor === 'onderbouw'
        ? 'De hoogte van de lijn is hier de afstand, niet de snelheid. De snelheid zie je aan hoe steil de lijn is.'
        : 'De hoogte is hier de plaats. De snelheid zie je aan de steilheid.';
      else if (diagram === 'v') tekst += 'De hoogte van de lijn is hier de snelheid zelf.';
      else tekst += 'De hoogte van de lijn is hier de versnelling, niet de snelheid of de plaats.';
      return { code: 'leesAls', als, tekst };
    }
  }
  return { code: 'anders', tekst: '' };
}

// Bij welke stap van de uitleg hoort deze vraag (of deze fout)?
function uitlegStap(vraag, code) {
  if (code === 'leesAls') return 'zelfdevorm';
  if (code === 'richting') return vraag.spoor === 'onderbouw' ? 'terug' : 'achteruit';
  if (vraag.diagram === 'a') return 'versnelling';
  if (vraag.richting < 0 && vraag.spoor === 'bovenbouw') return 'achteruit';
  if (vraag.richting < 0 && vraag.diagram === 'x') return 'terug';
  return vraag.soort;
}

// Soort fout voor de tussenstand: verschillende vragen met dezelfde fout
// krijgen dezelfde sleutel, zodat ze samen geteld worden.
function foutCategorie(vraag, gekozen) {
  const d = diagnose(vraag, gekozen);
  if (!d) return null;
  const naam = TAAL[vraag.spoor].naam;
  const stap = uitlegStap(vraag, d.code);
  if (d.code === 'leesAls') return {
    sleutel: 'leesAls-' + vraag.diagram + '-' + d.als, stap,
    tekst: 'Een ' + naam[vraag.diagram] + ' gelezen alsof het een ' + naam[d.als] + ' was'
  };
  if (d.code === 'richting') return {
    sleutel: 'richting-' + vraag.diagram, stap,
    tekst: vraag.spoor === 'onderbouw'
      ? 'Teruglopen aangezien voor afremmen'
      : vraag.diagram === 'a'
        ? 'Het teken van a niet vergeleken met de richting'
        : 'Achteruit rijden en afremmen door elkaar gehaald'
  };
  if (vraag.diagram === 'a' && vraag.beweging.segmenten[vraag.index].a === 0) return {
    sleutel: 'anders-a-nul', stap,
    tekst: 'Niet gezien dat a = 0 betekent dat de snelheid niet verandert'
  };
  return {
    sleutel: 'anders-' + vraag.diagram + '-' + vraag.soort, stap,
    tekst: SOORT_NAAM[vraag.soort] + ' niet herkend in een ' + naam[vraag.diagram]
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SOORTEN, SOORT_NAAM, TAAL, LEVELS, DUUR_TOTAAL,
    bouwBeweging, soortVan, richtingVan, segmentOp, toestand, waardeIn,
    genereerBeweging, maakVraag, vraagHint, leesAls, isContrast, vormIn,
    uitlegTekst, diagnose, uitlegStap, kiesGewogen, foutCategorie, asStap, getalTekst, kies
  };
}
