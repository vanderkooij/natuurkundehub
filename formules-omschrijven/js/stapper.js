/* ══════════════════════════════════════════════════════════════════════
   STAPPER: formules stap voor stap omschrijven

   Zelfstandig te gebruiken in de uitleg en later in de oefenmodus.
   De leerling kiest een bewerking, de stapper past die op beide kanten toe
   en streept weg wat tegen elkaar wegvalt. Er wordt geen route voorgeschreven:
   elke volgorde die klopt komt uit op hetzelfde eindpunt.

   Markup:  <div class="stapper" data-formule="s = v*t" data-doel="t"></div>
   ══════════════════════════════════════════════════════════════════════ */

/* ── Boomstructuur ──────────────────────────────────────────────────── */

let _knoopId = 1;
function knoop(t, extra){ return Object.assign({ t, id: _knoopId++ }, extra); }

// Notatie: a*b, a/b, a+b, a-b, a^2, sqrt(x), haakjes. Namen mogen cijfers
// en underscores bevatten (v_gem, R1).
// Leest een formule als tekst in. Alles wat de stapper niet aankan (onbekende
// tekens, een macht die geen getal is) geeft een foutmelding, zodat de
// aanroeper weet dat die formule hier niet past.
function parse(tekst){
  const s = String(tekst).replace(/\s+/g, '');
  let i = 0;
  const stuk = () => 'bij "' + s.slice(Math.max(0, i - 4), i + 6) + '"';

  function expr(){
    let l = term();
    while(s[i] === '+' || s[i] === '-'){
      const op = s[i++];
      l = knoop(op === '+' ? 'add' : 'sub', { l, r: term() });
    }
    return l;
  }
  function term(){
    let l = factor();
    while(s[i] === '*' || s[i] === '/'){
      const op = s[i++];
      l = knoop(op === '*' ? 'mul' : 'div', { l, r: factor() });
    }
    return l;
  }
  function factor(){
    let b = base();
    if(s[i] === '^'){
      i++;
      let n = '';
      while(/[0-9]/.test(s[i])) n += s[i++];
      if(!n) throw new Error('macht zonder getal ' + stuk());
      b = knoop('pow', { l: b, n: Number(n) });
    }
    return b;
  }
  function base(){
    if(s.startsWith('sqrt(', i)){
      i += 5; const e = expr();
      if(s[i] !== ')') throw new Error('haakje niet gesloten ' + stuk());
      i++; return knoop('sqrt', { l: e });
    }
    if(s[i] === '('){
      i++; const e = expr();
      if(s[i] !== ')') throw new Error('haakje niet gesloten ' + stuk());
      i++; return e;
    }
    let naam = '';
    while(i < s.length && /[A-Za-z0-9_]/.test(s[i])) naam += s[i++];
    if(!naam) throw new Error('onbekend teken ' + stuk());
    if(/^[0-9]+$/.test(naam)) return knoop('num', { waarde: Number(naam) });
    return knoop('var', { naam });
  }
  const uit = expr();
  if(i < s.length) throw new Error('kan dit niet lezen ' + stuk());
  return uit;
}

// Twee knopen zijn gelijk als hun vorm gelijk is; de id telt niet mee.
function zelfde(a, b){
  if(!a || !b || a.t !== b.t) return false;
  switch(a.t){
    case 'var':  return a.naam === b.naam;
    case 'num':  return a.waarde === b.waarde;
    case 'pow':  return a.n === b.n && zelfde(a.l, b.l);
    case 'sqrt': return zelfde(a.l, b.l);
    default:     return zelfde(a.l, b.l) && zelfde(a.r, b.r);
  }
}

function kopie(n){
  if(!n) return n;
  const k = Object.assign({}, n, { id: _knoopId++ });
  if(n.l) k.l = kopie(n.l);
  if(n.r) k.r = kopie(n.r);
  return k;
}

function bevat(n, naam){
  if(!n) return false;
  if(n.t === 'var') return n.naam === naam;
  return bevat(n.l, naam) || bevat(n.r, naam);
}

/* ── Vereenvoudigen, met bijhouden wat wegvalt ───────────────────────── */

function platMaal(n, tellers, noemers, onder){
  if(n.t === 'mul'){ platMaal(n.l, tellers, noemers, onder); platMaal(n.r, tellers, noemers, onder); }
  else if(n.t === 'div'){ platMaal(n.l, tellers, noemers, onder); platMaal(n.r, tellers, noemers, !onder); }
  else (onder ? noemers : tellers).push(n);
}

function platPlus(n, plussen, minnen, negatief){
  if(n.t === 'add'){ platPlus(n.l, plussen, minnen, negatief); platPlus(n.r, plussen, minnen, negatief); }
  else if(n.t === 'sub'){ platPlus(n.l, plussen, minnen, negatief); platPlus(n.r, plussen, minnen, !negatief); }
  else (negatief ? minnen : plussen).push(n);
}

function bouwMaal(tellers, noemers){
  const maal = lijst => lijst.reduce((a, b) => knoop('mul', { l: a, r: b }));
  const boven = tellers.length ? maal(tellers) : knoop('num', { waarde: 1 });
  if(!noemers.length) return boven;
  return knoop('div', { l: boven, r: maal(noemers) });
}

// Een som als geordende lijst termen, met per term of hij eraf gaat. Zo blijft
// de volgorde staan zoals de leerling hem ziet.
function platTermen(n, uit, negatief){
  if(n.t === 'add'){ platTermen(n.l, uit, negatief); platTermen(n.r, uit, negatief); }
  else if(n.t === 'sub'){ platTermen(n.l, uit, negatief); platTermen(n.r, uit, !negatief); }
  else uit.push({ node: n, min: !!negatief });
}

function bouwTermen(termen){
  if(!termen.length) return knoop('num', { waarde: 0 });
  // Begin bij voorkeur met een term die erbij op wordt geteld; de rest houdt
  // zijn eigen volgorde. Staat er alleen aftrek, dan wordt het 0 - a, en dat
  // toont de weergave als −a.
  const eerstePlus = termen.findIndex(t => !t.min);
  const volgorde = eerstePlus > 0
    ? [termen[eerstePlus]].concat(termen.filter((_, i) => i !== eerstePlus))
    : termen.slice();
  let uit = volgorde[0].min
    ? knoop('sub', { l: knoop('num', { waarde: 0 }), r: volgorde[0].node })
    : volgorde[0].node;
  for(const t of volgorde.slice(1)) uit = knoop(t.min ? 'sub' : 'add', { l: uit, r: t.node });
  return uit;
}

// Alle tekens omkeren: dat is wat vermenigvuldigen met −1 met een som doet.
function keerTekensOm(n){
  const termen = [];
  platTermen(n, termen, false);
  const gedraaid = termen.map(t => ({ node: t.node, min: !t.min }));
  // Een 0 die alleen als aanloop van −a diende, hoeft niet mee te draaien.
  const zonderNul = gedraaid.filter(t => !(t.node.t === 'num' && t.node.waarde === 0));
  return bouwTermen(zonderNul.length ? zonderNul : gedraaid);
}

function bouwPlus(plussen, minnen){
  if(!plussen.length && !minnen.length) return knoop('num', { waarde: 0 });
  let uit = plussen.length ? plussen.reduce((a, b) => knoop('add', { l: a, r: b }))
                           : knoop('num', { waarde: 0 });
  for(const m of minnen) uit = knoop('sub', { l: uit, r: m });
  return uit;
}

// Geeft de vereenvoudigde boom terug. `weg` krijgt de ids die wegvallen en dus een
// streep krijgen; `motie` beschrijft wat er beweegt: een letter die onder de wortel
// vandaan komt ('uit'), een wortel die daardoor opengaat ('open') en twee wortels
// die tot één versmelten ('smelt').
function vereenvoudig(n, weg, motie){
  motie = motie || [];
  const beweeg = (id, soort, extra) => { if(id != null) motie.push(Object.assign({ id: id, soort: soort }, extra)); };
  if(!n) return n;
  if(n.l) n.l = vereenvoudig(n.l, weg, motie);
  if(n.r) n.r = vereenvoudig(n.r, weg, motie);

  // Wortel en kwadraat strepen elkaar weg: een streep door het wortelteken en
  // een streep door het kwadraatje. Wat eronder stond, blijft over.
  if(n.t === 'sqrt' && n.l.t === 'pow' && n.l.n === 2){
    beweeg(n.id, 'wortelweg'); weg.push(n.l.id); beweeg(n.l.l.id, 'uit');
    return n.l.l;
  }
  if(n.t === 'pow' && n.n === 2 && n.l.t === 'sqrt'){
    beweeg(n.l.id, 'wortelweg'); weg.push(n.id); beweeg(n.l.l.id, 'uit');
    return n.l.l;
  }
  if(n.t === 'pow' && n.n === 1) return n.l;

  // Twee wortels naast elkaar vloeien samen onder één wortel. Er valt niets weg,
  // dus geen streep: ze schuiven naar elkaar toe en versmelten.
  if(n.t === 'mul' && n.l.t === 'sqrt' && n.r.t === 'sqrt'){
    const samen = knoop('sqrt', { l: knoop('mul', { l: n.l.l, r: n.r.l }) });
    beweeg(n.l.id, 'smelt', { naar: n.l.l.id, anders: samen.id });
    beweeg(n.r.id, 'smelt', { naar: n.r.l.id, anders: samen.id });
    return vereenvoudig(samen, weg, motie);
  }
  if(n.t === 'div' && n.l.t === 'sqrt' && n.r.t === 'sqrt'){
    const samen = knoop('sqrt', { l: knoop('div', { l: n.l.l, r: n.r.l }) });
    beweeg(n.l.id, 'smelt', { naar: n.l.l.id, anders: samen.id });
    beweeg(n.r.id, 'smelt', { naar: n.r.l.id, anders: samen.id });
    return vereenvoudig(samen, weg, motie);
  }

  if(n.t === 'mul' || n.t === 'div'){
    const T = [], N = [];
    platMaal(n, T, N, false);
    // Gelijke factoren boven en onder vallen tegen elkaar weg. Een macht telt
    // daarbij mee: v² gedeeld door v laat v over.
    const ontleed = x => x.t === 'pow' ? { basis: x.l, n: x.n } : { basis: x, n: 1 };
    for(let i = 0; i < T.length; i++){
      const boven = ontleed(T[i]);
      const j = N.findIndex(x => zelfde(ontleed(x).basis, boven.basis));
      if(j < 0) continue;
      const onder = ontleed(N[j]);
      const samen = Math.min(boven.n, onder.n);
      const restant = (deel, oud) => {
        if(deel.n - samen === 0){ weg.push(oud.id); if(oud.t === 'pow') weg.push(oud.l.id); return null; }
        weg.push(oud.id);                                  // alleen de macht gaat omlaag
        return deel.n - samen === 1 ? deel.basis : knoop('pow', { l: deel.basis, n: deel.n - samen });
      };
      const restBoven = restant(boven, T[i]), restOnder = restant(onder, N[j]);
      if(restBoven) T.splice(i, 1, restBoven); else { T.splice(i, 1); i--; }
      if(restOnder) N.splice(j, 1, restOnder); else N.splice(j, 1);
    }
    // Staan er meer wortels in dezelfde teller of noemer, dan gaan die samen
    // onder één wortelteken staan.
    const smeltSamen = lijst => {
      const wortels = lijst.filter(x => x.t === 'sqrt');
      if(wortels.length < 2) return;
      const samen = knoop('sqrt', { l: wortels.map(w => w.l).reduce((a, b) => knoop('mul', { l: a, r: b })) });
      for(const w of wortels) beweeg(w.id, 'smelt', { naar: w.l.id, anders: samen.id });
      lijst.splice(lijst.indexOf(wortels[0]), 0, samen);
      for(const w of wortels) lijst.splice(lijst.indexOf(w), 1);
    };
    smeltSamen(T); smeltSamen(N);

    const eenWeg = lijst => {
      for(let i = lijst.length - 1; i >= 0; i--)
        if(lijst[i].t === 'num' && lijst[i].waarde === 1 && lijst.length > 1){ weg.push(lijst[i].id); lijst.splice(i, 1); }
    };
    eenWeg(T); eenWeg(N);
    if(N.length === 1 && N[0].t === 'num' && N[0].waarde === 1){ weg.push(N[0].id); N.length = 0; }
    return bouwMaal(T, N);
  }

  if(n.t === 'add' || n.t === 'sub'){
    const termen = [];
    platTermen(n, termen, false);
    // Een term en dezelfde term met het andere teken vallen tegen elkaar weg.
    for(let i = 0; i < termen.length; i++){
      if(!termen[i]) continue;
      for(let j = i + 1; j < termen.length; j++){
        if(!termen[j] || termen[i].min === termen[j].min) continue;
        if(!zelfde(termen[i].node, termen[j].node)) continue;
        weg.push(termen[i].node.id, termen[j].node.id);
        termen[i] = null; termen[j] = null;
        break;
      }
    }
    let over = termen.filter(Boolean);
    // Een nul die is overgebleven hoeft er niet te blijven staan.
    const nul = t => t.node.t === 'num' && t.node.waarde === 0;
    if(over.some(nul) && over.length > 1){
      for(const t of over) if(nul(t)) weg.push(t.node.id);
      over = over.filter(t => !nul(t));
    }
    return bouwTermen(over);
  }
  return n;
}

// Staat er meer dan één ding onder een wortel en zit daar een kwadraat bij, dan
// gaat de wortel eerst over elk stuk apart staan. Daarna kan het kwadraat tegen
// zijn eigen wortel worden weggestreept en blijven de andere wortels staan.
function verdeelWortels(n, motie){
  if(!n) return n;
  if(n.l) n.l = verdeelWortels(n.l, motie);
  if(n.r) n.r = verdeelWortels(n.r, motie);
  if(n.t === 'sqrt'){
    const T = [], N = [];
    platMaal(n.l, T, N, false);
    const heeftKwadraat = x => x.t === 'pow' && x.n % 2 === 0;
    if(T.length + N.length > 1 && (T.some(heeftKwadraat) || N.some(heeftKwadraat))){
      for(const x of T.concat(N)) motie.push({ id: x.id, soort: 'uit', groep: true });
      return bouwMaal(T.map(x => knoop('sqrt', { l: x })), N.map(x => knoop('sqrt', { l: x })));
    }
  }
  return n;
}

// Eén ronde vereenvoudigen kan nieuwe kansen opleveren: bij het opnieuw opbouwen
// van een product komen soms twee wortels naast elkaar te staan die nog moeten
// versmelten. Daarom herhalen tot er niets meer verandert.
function vereenvoudigVolledig(n, weg, motie){
  let uit = vereenvoudig(n, weg, motie);
  for(let ronde = 0; ronde < 5; ronde++){
    const voor = kopie(uit);
    uit = vereenvoudig(uit, weg, motie);
    if(zelfde(voor, uit)) break;
  }
  return uit;
}

/* ── Weergave ───────────────────────────────────────────────────────── */

const RANG = { add: 1, sub: 1, mul: 2, div: 2, pow: 3, sqrt: 4, var: 5, num: 5 };

// Griekse namen komen als woord binnen (Delta_x, lambda_max) en worden hier als
// symbool getoond: Δx, λ_max.
const SYMBOLEN = { Delta:'Δ', Omega:'Ω', Sigma:'Σ', Phi:'Φ', Lambda:'Λ', Gamma:'Γ', Theta:'Θ',
  alpha:'α', beta:'β', gamma:'γ', delta:'δ', epsilon:'ε', zeta:'ζ', eta:'η', theta:'θ',
  kappa:'κ', lambda:'λ', mu:'μ', nu:'ν', xi:'ξ', pi:'π', rho:'ρ', sigma:'σ', tau:'τ',
  phi:'φ', chi:'χ', psi:'ψ', omega:'ω' };

function toonNaam(naam){
  const m = naam.match(/^([A-Za-z]+)_?([0-9A-Za-z]*)$/);
  if(!m) return naam;
  const basis = SYMBOLEN[m[1]] || m[1];
  if(!m[2]) return basis;
  if(m[1] === 'Delta') return basis + toonNaam(m[2]);      // Δx is geen subscript
  return basis + '<sub>' + (SYMBOLEN[m[2]] || m[2]) + '</sub>';
}

function renderKnoop(n, wegSet, ouderRang){
  const weg = wegSet && wegSet.has(n.id) ? ' is-weg' : '';
  const wikkel = (html, eigenRang) =>
    (ouderRang !== undefined && eigenRang < ouderRang) ? '<span class="haak">(</span>' + html + '<span class="haak">)</span>' : html;

  switch(n.t){
    case 'var':  return '<span class="sym' + weg + '" data-id="' + n.id + '">' + toonNaam(n.naam) + '</span>';
    case 'num':  return '<span class="sym' + weg + '" data-id="' + n.id + '">' + n.waarde + '</span>';
    case 'mul':  return wikkel(renderKnoop(n.l, wegSet, RANG.mul) + '<span class="op">·</span>' + renderKnoop(n.r, wegSet, RANG.mul), RANG.mul);
    case 'add':  return wikkel(renderKnoop(n.l, wegSet, RANG.add) + '<span class="op">+</span>' + renderKnoop(n.r, wegSet, RANG.add), RANG.add);
    case 'sub':  return (n.l.t === 'num' && n.l.waarde === 0)
             ? wikkel('<span class="op">−</span>' + renderKnoop(n.r, wegSet, RANG.sub + 1), RANG.add)
             : wikkel(renderKnoop(n.l, wegSet, RANG.add) + '<span class="op">−</span>' + renderKnoop(n.r, wegSet, RANG.sub + 1), RANG.add);
    case 'pow':  return '<span class="machtgroep" data-groep="' + n.id + '">' +
             renderKnoop(n.l, wegSet, RANG.pow + 1) +
             '<sup class="macht' + weg + '" data-id="' + n.id + '">' + n.n + '</sup></span>';
    case 'sqrt': return '<span class="wortel' + weg + '" data-id="' + n.id + '">' +
             '<svg class="wortel-teken" viewBox="0 0 12 24" preserveAspectRatio="none" aria-hidden="true">' +
             '<path d="M0.5 13.2 L3.1 13.2 L6.2 23.2 L12 0" fill="none" stroke="currentColor" stroke-width="1.9" ' +
             'vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
             '<span class="onder">' + renderKnoop(n.l, wegSet) + '</span></span>';
    case 'div':  return '<span class="breuk"><span class="teller">' + renderKnoop(n.l, wegSet) + '</span><span class="noemer">' + renderKnoop(n.r, wegSet) + '</span></span>';
  }
  return '';
}

// De boom als gewone invoertekst, zoals een leerling hem zou typen.
function naarTekst(n, ouderRang){
  const haak = (t, rang) => (ouderRang !== undefined && rang < ouderRang) ? '(' + t + ')' : t;
  switch(n.t){
    case 'var':  return n.naam;
    case 'num':  return String(n.waarde);
    case 'sqrt': return 'sqrt(' + naarTekst(n.l) + ')';
    case 'pow':  return naarTekst(n.l, RANG.pow + 1) + '^' + n.n;
    case 'mul':  return haak(naarTekst(n.l, RANG.mul) + '*' + naarTekst(n.r, RANG.mul), RANG.mul);
    case 'div':  return haak(naarTekst(n.l, RANG.div) + '/' + naarTekst(n.r, RANG.div + 1), RANG.div);
    case 'add':  return haak(naarTekst(n.l, RANG.add) + '+' + naarTekst(n.r, RANG.add), RANG.add);
    case 'sub':  return (n.l.t === 'num' && n.l.waarde === 0)
             ? haak('-' + naarTekst(n.r, RANG.sub + 1), RANG.add)
             : haak(naarTekst(n.l, RANG.add) + '-' + naarTekst(n.r, RANG.sub + 1), RANG.add);
  }
  return '';
}

// Namen die als één geheel gelezen moeten worden; de rest van de letters staat
// in LaTeX naast elkaar en betekent dan vermenigvuldigen (mv² is m·v²).
const GRIEKSE_NAMEN = ['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','kappa',
  'lambda','mu','nu','xi','rho','sigma','tau','phi','chi','psi','omega','pi',
  'Delta','Omega','Sigma','Phi','Lambda','Gamma','Theta'];

// Een formule zoals hij in LaTeX getoond wordt, omgezet naar gewone invoer waar
// de stapper mee kan werken. Naast elkaar staande symbolen worden expliciet
// vermenigvuldigd. Een LaTeX-opdracht die de stapper niet kent (\sin, \log)
// blijft met backslash staan, zodat het parsen faalt en de stapmodus daar
// gewoon niet wordt aangeboden.
function formuleUitLatex(latex){
  const bron = String(latex).replace(/\\left\s*/g, '').replace(/\\right\s*/g, '');

  const inhoud = (s, i) => {                   // leest {...} vanaf de accolade op i
    let diep = 0;
    for(let j = i; j < s.length; j++){
      if(s[j] === '{') diep++;
      else if(s[j] === '}'){ diep--; if(!diep) return { tekst: s.slice(i + 1, j), eind: j + 1 }; }
    }
    return { tekst: s.slice(i + 1), eind: s.length };
  };
  const haakjes = (s, i) => {                  // leest (...) vanaf het haakje op i
    let diep = 0;
    for(let j = i; j < s.length; j++){
      if(s[j] === '(') diep++;
      else if(s[j] === ')'){ diep--; if(!diep) return { tekst: s.slice(i + 1, j), eind: j + 1 }; }
    }
    return { tekst: s.slice(i + 1), eind: s.length };
  };

  function om(s){
    let uit = '', waarde = false;              // waarde: er staat al iets waar een * achter kan
    const zetWaarde = (t) => { if(waarde) uit += '*'; uit += t; waarde = true; };
    const zetOp = (t) => { uit += t; waarde = false; };

    // Leest een naam plus eventueel cijfers en een subscript: v_{gem} → v_gem.
    const leesNaam = (i, basis) => {
      let naam = basis;
      while(i < s.length && /[0-9]/.test(s[i])) naam += s[i++];
      if(s[i] === '_'){
        let sub = '';
        if(s[i + 1] === '{'){ const g = inhoud(s, i + 1); sub = g.tekst; i = g.eind; }
        else { sub = s[i + 1] || ''; i += 2; }
        sub = sub.replace(/\\[A-Za-z]+/g, '').replace(/[^A-Za-z0-9]/g, '');
        if(sub) naam += '_' + sub;
      }
      return { naam: naam, eind: i };
    };

    for(let i = 0; i < s.length; ){
      const rest = s.slice(i);
      let m;
      if((m = rest.match(/^\s+/))){ i += m[0].length; continue; }
      if((m = rest.match(/^\\(?:dfrac|frac|tfrac)\s*\{/))){
        const teller = inhoud(s, i + m[0].length - 1);
        const noemer = inhoud(s, teller.eind);
        zetWaarde('((' + om(teller.tekst) + ')/(' + om(noemer.tekst) + '))');
        i = noemer.eind; continue;
      }
      if((m = rest.match(/^\\sqrt\s*\{/))){
        const onder = inhoud(s, i + m[0].length - 1);
        zetWaarde('sqrt(' + om(onder.tekst) + ')');
        i = onder.eind; continue;
      }
      if((m = rest.match(/^\\(?:cdot|times)\s*/))){ zetOp('*'); i += m[0].length; continue; }
      if((m = rest.match(/^\\(?:,|;|!|:|quad|qquad)\s*/))){ i += m[0].length; continue; }
      if((m = rest.match(/^\\([A-Za-z]+)/)) && GRIEKSE_NAMEN.indexOf(m[1]) >= 0){
        // \Delta x hoort bij elkaar: dat is één grootheid.
        const na = s.slice(i + m[0].length);
        const los = na.match(/^\s*([A-Za-z])(?![A-Za-z])/);
        if(m[1] === 'Delta' && los){
          const gelezen = leesNaam(i + m[0].length + los[0].length, 'Delta_' + los[1]);
          zetWaarde(gelezen.naam); i = gelezen.eind; continue;
        }
        const gelezen = leesNaam(i + m[0].length, m[1]);
        zetWaarde(gelezen.naam); i = gelezen.eind; continue;
      }
      if(rest[0] === '\\'){ zetOp('\\'); i++; continue; }   // onbekende opdracht: laat parsen falen
      if((m = rest.match(/^[A-Za-z]/))){
        const gelezen = leesNaam(i + 1, m[0]);
        zetWaarde(gelezen.naam); i = gelezen.eind; continue;
      }
      if((m = rest.match(/^[0-9]+(?:\.[0-9]+)?/))){ zetWaarde(m[0]); i += m[0].length; continue; }
      if(rest[0] === '('){
        const groep = haakjes(s, i);
        zetWaarde('(' + om(groep.tekst) + ')');
        i = groep.eind; continue;
      }
      if(rest[0] === '^'){
        let macht;
        if(s[i + 1] === '{'){ const g = inhoud(s, i + 1); macht = g.tekst; i = g.eind; }
        else { macht = s[i + 1] || ''; i += 2; }
        uit += '^' + om(macht);                // waarde blijft waarde: v^2 is één ding
        continue;
      }
      if('+-*/='.indexOf(rest[0]) >= 0){ zetOp(rest[0]); i++; continue; }
      zetOp(rest[0]); i++;                     // rest laten staan; parsen faalt dan vanzelf
    }
    return uit;
  }

  return om(bron).replace(/\s+/g, '').trim();
}

/* ── Bewerkingen ────────────────────────────────────────────────────── */

const BEWERKINGEN = {
  deel:   { naam: 'deel beide kanten door', teken: '÷', operand: true,
            pas: (z, x) => knoop('div', { l: z, r: kopie(x) }) },
  maal:   { naam: 'vermenigvuldig beide kanten met', teken: '×', operand: true,
            pas: (z, x) => knoop('mul', { l: z, r: kopie(x) }) },
  plus:   { naam: 'tel op bij beide kanten', teken: '+', operand: true,
            pas: (z, x) => knoop('add', { l: z, r: kopie(x) }) },
  min:    { naam: 'trek af van beide kanten', teken: '−', operand: true,
            pas: (z, x) => knoop('sub', { l: z, r: kopie(x) }) },
  tekens: { naam: 'draai alle tekens om (× −1)', teken: '×(−1)', operand: false,
            pas: z => keerTekensOm(z) },
  wortel: { naam: 'neem de wortel van beide kanten', teken: '√', operand: false,
            pas: z => knoop('sqrt', { l: z }) },
  kwad:   { naam: 'kwadrateer beide kanten', teken: 'x²', operand: false,
            pas: z => knoop('pow', { l: z, n: 2 }) },
  wissel: { naam: 'verwissel de kanten', teken: '⇄', operand: false, wisselt: true },
};

// De losse variabelen en getallen die in de vergelijking voorkomen, als operand.
function heeftWortel(n){
  if(!n) return false;
  if(n.t === 'sqrt') return true;
  return heeftWortel(n.l) || heeftWortel(n.r);
}

function operanden(links, rechts){
  const gezien = new Map();
  const atomen = [];
  const voegToe = (n, isAtoom) => {
    const sleutel = naarTekst(n);
    if(gezien.has(sleutel)) return;
    const k = kopie(n);
    gezien.set(sleutel, k);
    if(isAtoom) atomen.push(k);
  };
  const loop = (n) => {
    if(!n) return;
    if(n.t === 'var' || (n.t === 'num' && n.waarde !== 1)) voegToe(n, true);
    // Een hele som die als factor of als noemer voorkomt is ook een bruikbare
    // operand: delen door (b+c) maakt a in x = a*(b+c) in één keer vrij.
    if(n.t === 'mul' || n.t === 'div'){
      const T = [], N = [];
      platMaal(n, T, N, false);
      for(const f of T.concat(N)) if(f.t === 'add' || f.t === 'sub' || f.t === 'pow') voegToe(f, false);
    }
    // Andersom net zo: een heel product dat als term in een som staat, moet je
    // in één keer kunnen aftrekken, zoals v*g in e = x + v*g.
    if(n.t === 'add' || n.t === 'sub'){
      const P = [], M = [];
      platPlus(n, P, M, false);
      for(const term of P.concat(M)) if(term.t === 'mul' || term.t === 'div' || term.t === 'pow') voegToe(term, false);
    }
    loop(n.l); loop(n.r);
  };
  loop(links); loop(rechts);
  const lijst = [...gezien.values()];
  // Wie eerst de wortel neemt, moet daarna ook door een wortel kunnen delen.
  if(heeftWortel(links) || heeftWortel(rechts))
    for(const a of atomen) lijst.push(knoop('sqrt', { l: kopie(a) }));
  return lijst;
}

// Eén stap op een vergelijking, los van het scherm. Zo kunnen de tests nagaan
// of elke opgave in de stapmodus daadwerkelijk op te lossen is.
function doeStap(links, rechts, sleutel, operand){
  const b = BEWERKINGEN[sleutel];
  if(b.wisselt) return { links: kopie(rechts), rechts: kopie(links) };
  const zet = (kant) => {
    let n = b.pas(kopie(kant), operand);
    n = verdeelWortels(n, []);
    return vereenvoudigVolledig(n, [], []);
  };
  return { links: zet(links), rechts: zet(rechts) };
}

/* ── Component ──────────────────────────────────────────────────────── */

function initStapper(el){
  const startTekst = el.dataset.formule || 'x = a*b';
  const doel = el.dataset.doel || 'x';
  const [linkTekst, rechtTekst] = startTekst.split('=');

  let links, rechts, geschiedenis, klaar, gekozenBewerking;

  const kop = document.createElement('div');
  kop.className = 'stapper-kop';

  const regels = document.createElement('div');
  regels.className = 'stapper-regels';

  const knoppen = document.createElement('div');
  knoppen.className = 'stapper-knoppen';

  const operandRij = document.createElement('div');
  operandRij.className = 'stapper-operanden';
  operandRij.hidden = true;

  const voet = document.createElement('div');
  voet.className = 'stapper-voet';

  function begin(){
    _knoopId = 1;
    links = parse(linkTekst);
    rechts = parse(rechtTekst);
    geschiedenis = [];
    klaar = false;
    gekozenBewerking = null;
    tekenAlles();
  }

  function isKlaar(){
    return (links.t === 'var' && links.naam === doel && !bevat(rechts, doel))
        || (rechts.t === 'var' && rechts.naam === doel && !bevat(links, doel));
  }

  function regelHTML(l, r, wegSet){
    return '<span class="kant">' + renderKnoop(l, wegSet) + '</span>' +
           '<span class="isgelijk">=</span>' +
           '<span class="kant">' + renderKnoop(r, wegSet) + '</span>';
  }

  function voegRegelToe(html, klasse){
    const d = document.createElement('div');
    d.className = 'stapper-regel' + (klasse ? ' ' + klasse : '');
    d.innerHTML = html;
    regels.appendChild(d);
    return d;
  }

  function tekenAlles(){
    regels.innerHTML = '';
    voegRegelToe(regelHTML(links, rechts));
    tekenKnoppen();
    tekenVoet();
  }

  function omgekeerdKlaar(){
    return klaar && !(links.t === 'var' && links.naam === doel);
  }

  function tekenKnoppen(){
    knoppen.innerHTML = '';
    operandRij.hidden = true;
    if(klaar){
      if(omgekeerdKlaar()){
        const knop = document.createElement('button');
        knop.type = 'button';
        knop.className = 'bew-btn';
        knop.innerHTML = '<span class="bew-teken">' + BEWERKINGEN.wissel.teken + '</span>';
        knop.title = BEWERKINGEN.wissel.naam;
        knop.onclick = () => pasToe('wissel', null);
        knoppen.appendChild(knop);
      }
      return;
    }
    for(const sleutel in BEWERKINGEN){
      const b = BEWERKINGEN[sleutel];
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'bew-btn' + (gekozenBewerking === sleutel ? ' actief' : '');
      knop.innerHTML = '<span class="bew-teken">' + b.teken + '</span>';
      knop.title = b.naam;
      knop.onclick = () => kiesBewerking(sleutel);
      knoppen.appendChild(knop);
    }
  }

  function kiesBewerking(sleutel){
    const b = BEWERKINGEN[sleutel];
    if(b.wisselt){ pasToe(sleutel, null); return; }
    if(!b.operand){ pasToe(sleutel, null); return; }
    gekozenBewerking = (gekozenBewerking === sleutel) ? null : sleutel;
    tekenKnoppen();
    if(!gekozenBewerking){ operandRij.hidden = true; return; }
    operandRij.innerHTML = '<span class="operand-label">' + BEWERKINGEN[sleutel].naam + '</span>';
    for(const o of operanden(links, rechts)){
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'operand-btn';
      knop.dataset.tekst = naarTekst(o);
      knop.innerHTML = renderKnoop(o, null, RANG.mul);   // haakjes om een hele som
      knop.onclick = () => pasToe(sleutel, o);
      operandRij.appendChild(knop);
    }
    operandRij.hidden = false;
  }

  // Een losse, zwevende kopie van `bron` die naar de plek van `doel` toe vliegt.
  function maakVlieger(bron, doel){
    const b = bron.getBoundingClientRect(), d = doel.getBoundingClientRect();
    const stijl = getComputedStyle(bron);
    const kopie = bron.cloneNode(true);
    kopie.className = bron.className.replace(/(is-weg|streep|mv-[a-z]+)/g, '').trim() + ' vlieger';
    kopie.style.cssText += ';position:fixed;margin:0;left:' + b.left + 'px;top:' + b.top + 'px;' +
      'width:' + b.width + 'px;height:' + b.height + 'px;font:' + stijl.font + ';color:' + stijl.color + ';' +
      'transform-origin:center center;opacity:1';
    document.body.appendChild(kopie);
    const dx = (d.left + d.width / 2) - (b.left + b.width / 2);
    const dy = (d.top + d.height / 2) - (b.top + b.height / 2);
    kopie.animate(
      [{ transform: 'none' }, { transform: 'translate(' + dx + 'px,' + dy + 'px)' }],
      { duration: 660, easing: 'cubic-bezier(.42,.02,.24,1)', fill: 'forwards' });
    return kopie;
  }

  function zoekDeel(regel, m, id){
    const nr = (id != null) ? id : m.id;
    return (m.groep ? regel.querySelector('[data-groep="' + nr + '"]') : null)
        || regel.querySelector('[data-id="' + nr + '"]');
  }

  function markeer(regel, wegSet, motie){
    regel.querySelectorAll('[data-id]').forEach(e => {
      if(wegSet.has(Number(e.dataset.id))) e.classList.add('is-weg');
    });
    for(const m of motie){
      const el = zoekDeel(regel, m);
      if(el) el.classList.add('mv-' + m.soort);
    }
  }

  // Laat elk bewegend stuk als losse kopie van de ene regel naar zijn plek in
  // de volgende vliegen.
  function laatVliegen(vanRegel, naarRegel, lijst){
    const kopieen = [];
    for(const m of lijst){
      const bron = zoekDeel(vanRegel, m);
      const doel = [m.naar, m.anders, m.id].reduce((gevonden, id) =>
        gevonden || (id != null ? zoekDeel(naarRegel, m, id) : null), null);
      if(bron && doel) kopieen.push(maakVlieger(bron, doel));
    }
    return kopieen;
  }

  function ruimVliegersOp(kopieen){
    for(const k of kopieen){
      k.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 170, fill: 'forwards' });
      setTimeout(() => k.remove(), 220);
    }
  }

  function toonRegel(regel){
    regel.style.visibility = '';
    regel.classList.add('nieuw');
  }

  function pasToe(sleutel, operand){
    const b = BEWERKINGEN[sleutel];
    geschiedenis.push({ links, rechts });
    gekozenBewerking = null;

    if(b.wisselt){
      const h = links; links = rechts; rechts = h;
      voegRegelToe('<span class="stap-uitleg">' + b.naam + '</span>', 'uitleg');
      voegRegelToe(regelHTML(links, rechts), 'nieuw');
      naStap();
      return;
    }

    const ruwLinks = b.pas(links, operand);
    const ruwRechts = b.pas(rechts, operand);
    voegRegelToe('<span class="stap-uitleg">' + b.naam + (operand ? ' <b>' + renderKnoop(operand, null, RANG.mul) + '</b>' : '') + '</span>', 'uitleg');

    // Eerst de ruwe regel neerzetten, daarna pas bewerken: die functies passen de
    // boom ter plekke aan, dus na afloop is het ruwe beeld weg.
    const ruwRegel = voegRegelToe(regelHTML(ruwLinks, ruwRechts), 'ruw');
    const snel = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fase 1: de wortel eerst over de losse stukken verdelen, zodat het kwadraat
    // straks tegen zijn eigen wortel wegvalt en de andere wortels blijven staan.
    const verdeeld = [];
    const splitLinks = verdeelWortels(ruwLinks, verdeeld);
    const splitRechts = verdeelWortels(ruwRechts, verdeeld);

    if(!verdeeld.length || snel){ vereenvoudigStap(ruwRegel, splitLinks, splitRechts, snel); return; }

    markeer(ruwRegel, new Set(), verdeeld);
    setTimeout(() => {
      const tussen = voegRegelToe(regelHTML(splitLinks, splitRechts), 'ruw');
      tussen.style.visibility = 'hidden';
      const kopieen = laatVliegen(ruwRegel, tussen, verdeeld);
      const verder = () => {
        toonRegel(tussen);
        ruimVliegersOp(kopieen);
        vereenvoudigStap(tussen, splitLinks, splitRechts, snel);
      };
      kopieen.length ? setTimeout(verder, 600) : verder();
    }, 260);
  }

  // Fase 2: wegstrepen wat tegen elkaar wegvalt en het resultaat eronder zetten.
  function vereenvoudigStap(werkRegel, boomLinks, boomRechts, snel){
    const weg = [], motie = [];
    links = vereenvoudigVolledig(boomLinks, weg, motie);
    rechts = vereenvoudigVolledig(boomRechts, weg, motie);
    markeer(werkRegel, new Set(weg), motie);

    const vliegers = motie.filter(m => m.soort === 'uit' || m.soort === 'smelt');
    const meedoen = [...werkRegel.querySelectorAll('.is-weg,.mv-wortelweg,.mv-smelt')];

    const meteen = () => { voegRegelToe(regelHTML(links, rechts), 'nieuw'); naStap(); };
    if(snel || (!meedoen.length && !vliegers.length)){ meteen(); return; }

    const vliegen = () => {
      const nieuw = voegRegelToe(regelHTML(links, rechts));
      nieuw.style.visibility = 'hidden';
      const kopieen = laatVliegen(werkRegel, nieuw, vliegers);
      const afronden = () => { toonRegel(nieuw); ruimVliegersOp(kopieen); naStap(); };
      kopieen.length ? setTimeout(afronden, 640) : afronden();
    };

    setTimeout(() => {
      meedoen.forEach(e => e.classList.add('streep'));
      setTimeout(vliegers.length ? vliegen : meteen, vliegers.length ? 380 : 700);
    }, 380);
  }

  function naStap(){
    const wasKlaar = klaar;
    klaar = isKlaar();
    tekenKnoppen();
    tekenVoet();
    if(klaar) regels.lastChild.classList.add('gelukt');
    regels.lastChild.scrollIntoView({ block: 'nearest' });
    if(klaar && !wasKlaar){
      const antwoord = (links.t === 'var' && links.naam === doel) ? rechts : links;
      el.dispatchEvent(new CustomEvent('stapper-klaar', {
        bubbles: true, detail: { doel: doel, antwoord: naarTekst(antwoord) }
      }));
    }
  }

  function tekenVoet(){
    voet.innerHTML = '';
    const status = document.createElement('span');
    status.className = 'stapper-status' + (klaar ? ' gelukt' : '');
    status.innerHTML = !klaar
      ? 'Zoek: <b>' + toonNaam(doel) + '</b>'
      : omgekeerdKlaar()
        ? '<b>' + toonNaam(doel) + '</b> staat alleen. Draai hem nog om met ⇄, dan staat het antwoord er zoals je het opschrijft.'
        : '<b>' + toonNaam(doel) + '</b> staat alleen. Klaar.';
    voet.appendChild(status);

    const knoppenRechts = document.createElement('span');
    knoppenRechts.className = 'stapper-voet-knoppen';
    if(geschiedenis.length){
      const terug = document.createElement('button');
      terug.type = 'button'; terug.className = 'mini-btn'; terug.textContent = '← stap terug';
      terug.onclick = () => {
        const vorig = geschiedenis.pop();
        links = vorig.links; rechts = vorig.rechts; klaar = false;
        regels.innerHTML = '';
        voegRegelToe(regelHTML(links, rechts));
        tekenKnoppen(); tekenVoet();
      };
      knoppenRechts.appendChild(terug);
      const opnieuw = document.createElement('button');
      opnieuw.type = 'button'; opnieuw.className = 'mini-btn'; opnieuw.textContent = 'opnieuw';
      opnieuw.onclick = begin;
      knoppenRechts.appendChild(opnieuw);
    }
    voet.appendChild(knoppenRechts);
  }

  kop.innerHTML = 'Kies een bewerking. De stapper past hem op allebei de kanten toe en streept weg wat tegen elkaar wegvalt.';
  el.innerHTML = '';
  el.appendChild(kop);
  el.appendChild(regels);
  el.appendChild(knoppen);
  el.appendChild(operandRij);
  el.appendChild(voet);
  begin();
}

function initStappers(root){
  (root || document).querySelectorAll('.stapper[data-formule]').forEach(initStapper);
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { parse, zelfde, vereenvoudig, vereenvoudigVolledig, verdeelWortels,
                     renderKnoop, naarTekst, formuleUitLatex, operanden, doeStap,
                     BEWERKINGEN, bevat, knoop };
}
