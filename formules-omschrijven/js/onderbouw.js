/* ══════════════════════════════════════════════════════════════════════
   ONDERBOUW: gedeelde gegevens en opgaven voor uitleg en oefenen

   De opbouw loopt van getallen naar letters, zodat een letter een getal wordt
   waarvan je de waarde (nog) niet weet:
     1. een som met een vlek        2 = 6 / ●
     2. een woordformule met getallen   3 = afstand / 4
     3. woord en symbool samen      v (snelheid) = s (afstand) / t (tijd)
     4. alleen symbolen             v = s / t, a = b · c
   Keer en delen óf plus en min, hooguit vier grootheden, geen haakjes, wortels
   of machten. Onderaan staat het klas 3-spoor.
   Heeft stapper.js nodig (parse, rekenWaarde, knoop, kopie).
   ══════════════════════════════════════════════════════════════════════ */

const VLEK_SVG =
  '<svg class="vlek" viewBox="0 0 48 40" role="img" aria-label="vlek">' +
  '<path d="M24 4C29 3 31 8 35 7C40 6 44 9 42 14C41 17 45 19 44 23C43 28 39 27 37 31' +
  'C35 35 30 37 26 35C22 33 19 37 14 35C9 33 10 29 7 27C3 24 3 19 7 16C10 13 8 9 12 7C16 5 19 5 24 4Z"/>' +
  '<circle cx="45.5" cy="6" r="2"/><circle cx="3.5" cy="33" r="1.8"/><circle cx="41" cy="37" r="1.4"/></svg>';

function vlekWoord(woord){ return '<span class="vlek-woord">' + woord + '</span>'; }
function woordNaam(woord){ return '<span class="woordnaam">' + woord + '</span>'; }
function hybrideNaam(sym, woord){
  return '<span class="hybride"><span class="h-sym">' + sym + '</span><span class="h-woord">' + woord + '</span></span>';
}

const NIVEAUS = {
  1: { naam: 'Vlekkensommen',   kort: 'vlek',            uitleg: 'Getallen met een vlek' },
  2: { naam: 'Woordformules',   kort: 'woorden',         uitleg: 'Woorden met getallen' },
  3: { naam: 'Woord en letter', kort: 'woord en letter', uitleg: 'Het woord en de letter samen' },
  4: { naam: 'Letters',         kort: 'letters',         uitleg: 'Alleen letters' },
};
// Het vroegere level 5 (losse letters, soms vier) zit nu in het klas 3-spoor
// (zie onderaan); maakOpgave(5) maakt die opgaven nog wel.

/* ── Hulpjes ────────────────────────────────────────────────────────── */

function rnd(a, b){ return a + Math.floor(Math.random() * (b - a + 1)); }
function kies(lijst){ return lijst[Math.floor(Math.random() * lijst.length)]; }
function schud(lijst){
  const a = lijst.slice();
  for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function kiesGewogen(lijst){
  const totaal = lijst.reduce((s, x) => s + (x.gewicht || 1), 0);
  let r = Math.random() * totaal;
  for(const x of lijst){ r -= (x.gewicht || 1); if(r < 0) return x; }
  return lijst[lijst.length - 1];
}

// Vervangt een naam in een formule door een getal: 'snelheid = afstand/tijd'
// met { tijd: 4 } wordt 'snelheid = afstand/4'.
function vulIn(formule, waarden){
  return formule.replace(/[A-Za-z][A-Za-z0-9_]*/g, naam => naam in waarden ? String(waarden[naam]) : naam);
}

// De waarde van beide kanten, met de namen ingevuld.
function kantWaarden(formule, waarden){
  const [l, r] = formule.split('=');
  return [rekenWaarde(parse(l), waarden), rekenWaarde(parse(r), waarden)];
}

// Vul een gekozen getal in op de plek van de onbekende en kijk of het klopt.
// Zo zie je dat de vlek (of het woord) gewoon voor een getal staat. Geeft de
// HTML van de controle terug; `weergave` bepaalt hoe de formule getoond wordt.
function invulControle(formule, doel, getal, getalFn){
  const fmt = getalFn || getalTekst;
  const ingevuld = vulIn(formule, { [doel]: getal });
  const [lt, rt] = ingevuld.split('=');
  const [lw, rw] = kantWaarden(ingevuld, {});
  const klopt = Math.abs(lw - rw) < 1e-9;
  const weergave = { maal: '×', getal: getalFn || null };
  const som = '<span class="controle-som">' + toonVergelijking(ingevuld, weergave) + '</span>';
  if(klopt) return { klopt: true, html: 'Vul ' + fmt(getal) + ' in: ' + som + ' Dat klopt.' };
  // De kant waar de onbekende in een som stond, rekenen we voor. Stond hij al
  // alleen, dan juist de andere kant: daar staat wat hij had moeten zijn.
  const [fl, fr] = formule.split('=').map(x => x.trim());
  let voorLinks = new RegExp('\\b' + doel + '\\b').test(fl);
  if(fl === doel || fr === doel) voorLinks = fl !== doel;
  const kant = voorLinks ? lt : rt, waarde = voorLinks ? lw : rw, ander = voorLinks ? rw : lw;
  const kantHTML = '<span class="controle-som">' + toonUitdrukking(kant, weergave) + '</span>';
  const afgerond = Math.round(waarde * 100) / 100;
  const is = Math.abs(afgerond - waarde) < 1e-9 ? ' is ' : ' is ongeveer ';
  return { klopt: false, html: 'Vul ' + fmt(getal) + ' in: ' + som + ' Maar ' + kantHTML + is +
           fmt(afgerond) + ', en dat is geen ' + fmt(ander) + '.' };
}

/* ── Getallen als antwoord (niveau 1 en 2) ──────────────────────────── */

// Foute keuzes zijn de uitkomsten van de verkeerde bewerking met dezelfde twee
// getallen: keer in plaats van delen, andersom delen, optellen, aftrekken.
function getalOpties(goed, x, y){
  const kandidaten = [x * y, x / y, y / x, x + y, Math.abs(x - y), goed * 2, goed + x];
  const fout = [];
  for(const k of schud(kandidaten)){
    if(!Number.isInteger(k) || k <= 0 || k === goed || fout.includes(k)) continue;
    fout.push(k);
    if(fout.length === 3) break;
  }
  while(fout.length < 3){
    const k = goed + rnd(1, 9);
    if(!fout.includes(k)) fout.push(k);
  }
  return schud([goed].concat(fout));
}

/* ── Niveau 1: sommen met een vlek ──────────────────────────────────── */

function maakVleksom(){
  const b = rnd(2, 9), c = rnd(2, 9), p = b * c;
  const vorm = kies([
    { f: b + ' = ' + p + '/vlek', goed: c, x: b, y: p },
    { f: b + ' = ' + p + '/vlek', goed: c, x: b, y: p },
    { f: b + ' = vlek/' + c,      goed: p, x: b, y: c },
    { f: p + ' = ' + b + '*vlek', goed: c, x: p, y: b },
    { f: p + ' = vlek*' + c,      goed: b, x: p, y: c },
    { f: 'vlek*' + c + ' = ' + p, goed: b, x: p, y: c },
    { f: 'vlek/' + c + ' = ' + b, goed: p, x: b, y: c },
  ]);
  return {
    niveau: 1,
    formule: vorm.f,
    doel: 'vlek',
    goed: vorm.goed,
    opties: getalOpties(vorm.goed, vorm.x, vorm.y),
    namen: { vlek: VLEK_SVG },
  };
}

/* ── Niveau 2: woordformules met getallen ───────────────────────────── */

// Snelheid staat er vaker in: daar begint leerjaar 2 mee, in de vorm
// snelheid = afstand / tijd. De andere contexten kennen ze van thuis of van
// wiskunde, zonder dat er een nieuwe grootheid bij komt.
const WOORD_CONTEXTEN = [
  { gewicht: 4, formule: 'snelheid = afstand/tijd',
    woorden:  { snelheid: 'snelheid', afstand: 'afstand', tijd: 'tijd' },
    eenheden: { snelheid: 'm/s', afstand: 'm', tijd: 's' },
    vraag:    { snelheid: 'Hoe groot is de snelheid?', afstand: 'Hoe groot is de afstand?', tijd: 'Hoe lang is de tijd?' },
    waarden(){ const t = rnd(2, 12), v = rnd(2, 15); return { snelheid: v, tijd: t, afstand: v * t }; } },
  { gewicht: 1, formule: 'totaal = prijs*aantal',
    woorden:  { totaal: 'totaalprijs', prijs: 'prijs per stuk', aantal: 'aantal' },
    eenheden: { totaal: 'euro', prijs: 'euro', aantal: 'stuks' },
    vraag:    { totaal: 'Hoe groot is de totaalprijs?', prijs: 'Hoeveel kost één stuk?', aantal: 'Hoeveel stuks zijn het?' },
    waarden(){ const p = rnd(2, 9), n = rnd(2, 12); return { prijs: p, aantal: n, totaal: p * n }; } },
  { gewicht: 1, formule: 'oppervlakte = lengte*breedte',
    woorden:  { oppervlakte: 'oppervlakte', lengte: 'lengte', breedte: 'breedte' },
    eenheden: { oppervlakte: 'm²', lengte: 'm', breedte: 'm' },
    vraag:    { oppervlakte: 'Hoe groot is de oppervlakte?', lengte: 'Hoe groot is de lengte?', breedte: 'Hoe groot is de breedte?' },
    waarden(){ const l = rnd(3, 12), b = rnd(2, 9); return { lengte: l, breedte: b, oppervlakte: l * b }; } },
  { gewicht: 1, formule: 'perkind = snoepjes/kinderen',
    woorden:  { perkind: 'snoepjes per kind', snoepjes: 'snoepjes', kinderen: 'kinderen' },
    eenheden: { perkind: '', snoepjes: '', kinderen: '' },
    vraag:    { perkind: 'Hoeveel snoepjes krijgt elk kind?', snoepjes: 'Hoeveel snoepjes zijn er?', kinderen: 'Hoeveel kinderen zijn er?' },
    waarden(){ const k = rnd(2, 9), s = rnd(2, 8); return { kinderen: k, perkind: s, snoepjes: k * s }; } },
];

function maakWoordsom(contexten){
  const ctx = kiesGewogen(contexten || WOORD_CONTEXTEN);
  const w = ctx.waarden();
  const namen = Object.keys(ctx.woorden);
  // Soms staat de onbekende al alleen en hoef je alleen in te vullen en uit te
  // rekenen. Meestal niet: dan moet je echt nadenken.
  const links = ctx.formule.split('=')[0].trim();
  const doel = Math.random() < 0.2 ? links : kies(namen.filter(n => n !== links));
  const bekend = {};
  for(const n of namen) if(n !== doel) bekend[n] = w[n];
  const [x, y] = Object.values(bekend);
  const woordWeergave = {};
  for(const n of namen) woordWeergave[n] = woordNaam(ctx.woorden[n]);
  return {
    niveau: 2,
    ctx: ctx,
    formuleWoorden: ctx.formule,
    formule: vulIn(ctx.formule, bekend),
    doel: doel,
    goed: w[doel],
    bekend: bekend,
    opties: getalOpties(w[doel], x, y),
    getal: ctx.getal || null,
    woordWeergave: woordWeergave,
    namen: { [doel]: vlekWoord(ctx.woorden[doel]) },
    eenheid: ctx.eenheden[doel],
    vraag: ctx.vraag[doel],
  };
}

/* ── Niveau 3 en 4: formules met letters ────────────────────────────── */

// Formules die ze kennen, in elke vorm. De standaardvorm v = s / t komt het
// vaakst voor.
const SYMBOOL_FORMULES = [
  { gewicht: 3, vormen: ['v = s/t', 'v = s/t', 's = v*t', 't = s/v'],
    woorden: { v: 'snelheid', s: 'afstand', t: 'tijd' } },
  { gewicht: 1, vormen: ['A = l*b', 'l = A/b', 'b = A/l'],
    woorden: { A: 'oppervlakte', l: 'lengte', b: 'breedte' } },
];

// Letters zonder betekenis: dan helpt het niet om de formule te herkennen en
// moet je echt kijken wat er staat. Geen e, i, j, l of o (lijken op cijfers
// of op elkaar).
const LOSSE_LETTERS = 'abcdfghkmnpqrsuvwxyz'.split('');

function namenInVolgorde(formule){
  return [...new Set(formule.match(/[A-Za-z][A-Za-z0-9_]*/g) || [])];
}

// Exponenten van elke naam: v = s/t geeft { v: 1, s: -1, t: 1 } (alles naar
// links gebracht). Alleen keer en delen, dus elke exponent is +1 of -1.
function exponenten(n, teken, uit){
  if(n.t === 'var') uit[n.naam] = (uit[n.naam] || 0) + teken;
  else if(n.t === 'mul'){ exponenten(n.l, teken, uit); exponenten(n.r, teken, uit); }
  else if(n.t === 'div'){ exponenten(n.l, teken, uit); exponenten(n.r, -teken, uit); }
  return uit;
}

// De omschrijving naar `doel` als { naam: +1 of -1 }.
function oplossing(formule, doel){
  const [l, r] = formule.split('=');
  const e = exponenten(parse(r), -1, exponenten(parse(l), 1, {}));
  const uit = {};
  for(const naam of namenInVolgorde(formule)) if(naam !== doel && e[naam]) uit[naam] = -e[naam] / e[doel];
  return uit;
}

function monoomVan(tekst){ return exponenten(parse(tekst), 1, {}); }

function zelfdeMonoom(a, b){
  const namen = new Set(Object.keys(a).concat(Object.keys(b)));
  for(const n of namen) if((a[n] || 0) !== (b[n] || 0)) return false;
  return true;
}

function monoomTekst(m, volgorde){
  const boven = volgorde.filter(n => m[n] > 0), onder = volgorde.filter(n => m[n] < 0);
  let t = boven.length ? boven.join('*') : '1';
  if(onder.length === 1) t += '/' + onder[0];
  else if(onder.length) t += '/(' + onder.join('*') + ')';
  return t;
}

// Alle vormen met dezelfde letters, elk boven of onder de deelstreep. Eén
// daarvan is goed; de rest zijn de fouten die je maakt als je keer en delen
// door elkaar haalt.
function letterOpties(formule, doel){
  const goed = oplossing(formule, doel);
  const namen = Object.keys(goed);
  const volgorde = namenInVolgorde(formule).filter(n => n !== doel);
  const vormen = [];
  for(let code = 0; code < (1 << namen.length); code++){
    const m = {};
    namen.forEach((n, i) => { m[n] = (code >> i) & 1 ? -1 : 1; });
    if(!Object.values(m).some(x => x > 0)) continue;       // 1/(a·b) laten we weg
    if(zelfdeMonoom(m, goed)) continue;
    vormen.push(m);
  }
  const fout = schud(vormen).slice(0, 3);
  return schud([{ tekst: monoomTekst(goed, volgorde), goed: true }]
    .concat(fout.map(m => ({ tekst: monoomTekst(m, volgorde), goed: false }))));
}

// Een fout gekozen omschrijving narekenen met getallen: kies nette getallen die
// in de formule kloppen, en laat zien dat de gekozen vorm iets anders geeft.
// Zo blijft een letter een getal. Geeft HTML terug, of null als het niet lukt.
function getalProef(formule, doel, optieTekst){
  const namen = namenInVolgorde(formule);
  for(let poging = 0; poging < 200; poging++){
    // Kies getallen voor alle letters op één na, en reken die laatste uit met
    // de formule. Alleen als dat een net heel getal is, gebruiken we het.
    const uitTeRekenen = kies(namen);
    const w = {};
    for(const n of namen) if(n !== uitTeRekenen) w[n] = rnd(2, 9);
    const vorm = oplossing(formule, uitTeRekenen);
    const waarde = Object.keys(vorm).reduce((p, n) => p * Math.pow(w[n], vorm[n]), 1);
    if(Math.abs(waarde - Math.round(waarde)) > 1e-9 || waarde < 2 || waarde > 200) continue;
    w[uitTeRekenen] = Math.round(waarde);
    const bekend = {};
    for(const n of namen) if(n !== doel) bekend[n] = w[n];
    const uit = rekenWaarde(parse(optieTekst), bekend);
    if(Math.abs(uit - w[doel]) < 1e-9) continue;          // toevallig gelijk: andere getallen
    const weergave = { maal: '×' };
    const som = s => '<span class="controle-som">' + toonVergelijking(s, weergave) + '</span>';
    const kent = namen.filter(n => n !== doel).map(n => som(n + ' = ' + w[n]));
    const afgerond = Math.round(uit * 100) / 100;
    return 'Probeer het met getallen. Neem ' + kent.join(' en ') + '. Dan is ' + som(doel + ' = ' + w[doel]) +
           ', want dat klopt in de formule. Jouw antwoord geeft ' +
           som(doel + ' = ' + vulIn(optieTekst, bekend)) + ' = ' + getalTekst(afgerond) +
           (Math.abs(afgerond - uit) < 1e-9 ? '' : ' (ongeveer)') + ', en dat is geen ' + w[doel] + '.';
  }
  return null;
}

// Losse letters. Met vier: a = b·c/d en zo; dat is voor klas 3.
function maakLetterFormule(vier){
  const [x, a, b, c] = schud(LOSSE_LETTERS).slice(0, 4);
  const rechts = vier
    ? kies([a + '*' + b + '*' + c, a + '*' + b + '/' + c, a + '/(' + b + '*' + c + ')'])
    : kies([a + '*' + b, a + '/' + b]);
  return x + ' = ' + rechts;
}

// Niveau 3: de formules die ze kennen, met het woord erbij. Niveau 4: alleen
// letters, de bekende formules en losse letters als a = b·c (drie grootheden).
// Niveau 5 is voor klas 3: losse letters, meestal vier.
function maakSymboolsom(niveau){
  let formule, woorden = null;
  if(niveau === 3 || (niveau === 4 && Math.random() < 0.5)){
    const f = kiesGewogen(SYMBOOL_FORMULES);
    formule = kies(f.vormen);
    woorden = f.woorden;
  } else {
    formule = maakLetterFormule(niveau === 5 && Math.random() < 0.7);
  }
  const links = formule.split('=')[0].trim();
  const doel = kies(namenInVolgorde(formule).filter(n => n !== links));
  const namen = {};
  if(niveau === 3) for(const n in woorden) namen[n] = hybrideNaam(toonNaam(n), woorden[n]);
  const goed = oplossing(formule, doel);
  return {
    niveau: niveau,
    soort: 'keerdeel',
    formule: formule,
    doel: doel,
    woorden: woorden,
    namen: niveau === 3 ? namen : null,
    goed: goed,
    goedTekst: doel + ' = ' + monoomTekst(goed, namenInVolgorde(formule).filter(n => n !== doel)),
    opties: niveau === 5 ? letterOpties(formule, doel) : null,
  };
}

/* ══ Plus en min ═══════════════════════════════════════════════════════
   Een apart spoor met dezelfde vier treden. Nooit door keer en delen heen:
   een formule is óf keer en delen, óf plus en min. */

// Tijden rekenen we in minuten sinds middernacht; op het scherm staan ze als
// klok. Alles vanaf 5:00 is een kloktijd, kleinere getallen zijn minuten.
function klok(min){
  const m = Math.round(min);
  if(m < 300) return getalTekst(m);
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
}

function maakVleksomPlusMin(){
  const a = rnd(2, 30), b = rnd(2, 30), s = a + b;
  const vorm = kies([
    { f: s + ' = ' + a + '+vlek', goed: b },
    { f: s + ' = vlek+' + b,      goed: a },
    { f: 'vlek+' + b + ' = ' + s, goed: a },
    { f: a + ' = vlek-' + b,      goed: s },
    { f: 'vlek-' + b + ' = ' + a, goed: s },
    { f: a + ' = ' + s + '-vlek', goed: b },
    { f: s + '-vlek = ' + a,      goed: b },
  ]);
  return { niveau: 1, soort: 'plusmin', formule: vorm.f, doel: 'vlek', goed: vorm.goed, namen: { vlek: VLEK_SVG } };
}

// Situaties die ze kennen: tijd (hoe laat moet je weg), geld, plaats op een
// lijn en het verschil tussen begin- en eindsnelheid.
const WOORD_CONTEXTEN_PM = [
  { gewicht: 3, formule: 'aankomst = vertrek+reistijd',
    woorden:  { aankomst: 'aankomsttijd', vertrek: 'vertrektijd', reistijd: 'reistijd' },
    eenheden: { aankomst: 'uur', vertrek: 'uur', reistijd: 'minuten' },
    vraag:    { aankomst: 'Hoe laat kom je aan?', vertrek: 'Hoe laat moet je weg?', reistijd: 'Hoeveel minuten duurt de reis?' },
    getal: klok,
    waarden(){ const r = rnd(8, 55), a = rnd(8, 16) * 60 + 5 * rnd(0, 11); return { aankomst: a, reistijd: r, vertrek: a - r }; } },
  { gewicht: 2, formule: 'wisselgeld = betaald-prijs',
    woorden:  { wisselgeld: 'wisselgeld', betaald: 'betaald', prijs: 'prijs' },
    eenheden: { wisselgeld: 'euro', betaald: 'euro', prijs: 'euro' },
    vraag:    { wisselgeld: 'Hoeveel krijg je terug?', betaald: 'Hoeveel heb je betaald?', prijs: 'Hoeveel kostte het?' },
    waarden(){ const b = kies([10, 20, 50, 100]), p = rnd(2, b - 1); return { betaald: b, prijs: p, wisselgeld: b - p }; } },
  { gewicht: 1, formule: 'eindplaats = beginplaats+verplaatsing',
    woorden:  { eindplaats: 'eindplaats', beginplaats: 'beginplaats', verplaatsing: 'verplaatsing' },
    eenheden: { eindplaats: 'm', beginplaats: 'm', verplaatsing: 'm' },
    vraag:    { eindplaats: 'Waar sta je aan het eind?', beginplaats: 'Waar stond je aan het begin?', verplaatsing: 'Hoe ver heb je je verplaatst?' },
    waarden(){ const b = rnd(2, 40), v = rnd(2, 60); return { beginplaats: b, verplaatsing: v, eindplaats: b + v }; } },
  { gewicht: 2, formule: 'verschil = eindsnelheid-beginsnelheid',
    woorden:  { verschil: 'snelheidsverschil', eindsnelheid: 'eindsnelheid', beginsnelheid: 'beginsnelheid' },
    eenheden: { verschil: 'm/s', eindsnelheid: 'm/s', beginsnelheid: 'm/s' },
    vraag:    { verschil: 'Hoeveel is de snelheid toegenomen?', eindsnelheid: 'Hoe groot is de eindsnelheid?', beginsnelheid: 'Hoe groot was de beginsnelheid?' },
    waarden(){ const b = rnd(2, 20), d = rnd(2, 15); return { beginsnelheid: b, verschil: d, eindsnelheid: b + d }; } },
];

const SYMBOOL_FORMULES_PM = [
  { gewicht: 2, vormen: ['s = s_1+s_2', 's_1 = s-s_2', 's_2 = s-s_1'],
    woorden: { s: 'totale afstand', s_1: 'eerste stuk', s_2: 'tweede stuk' } },
  { gewicht: 2, vormen: ['t_aankomst = t_vertrek+t_reis', 't_vertrek = t_aankomst-t_reis', 't_reis = t_aankomst-t_vertrek'],
    woorden: { t_aankomst: 'aankomsttijd', t_vertrek: 'vertrektijd', t_reis: 'reistijd' } },
  { gewicht: 1, vormen: ['t = t_1+t_2', 't_2 = t-t_1'],
    woorden: { t: 'totale tijd', t_1: 'eerste deel', t_2: 'tweede deel' } },
];

function maakLetterFormulePM(){
  const [x, a, b] = schud(LOSSE_LETTERS).slice(0, 3);
  return x + ' = ' + kies([a + '+' + b, a + '-' + b]);
}

function maakSymboolsomPM(niveau){
  let formule, woorden = null;
  if(niveau === 3 || Math.random() < 0.5){
    const f = kiesGewogen(SYMBOOL_FORMULES_PM);
    formule = kies(f.vormen);
    woorden = f.woorden;
  } else formule = maakLetterFormulePM();
  const links = formule.split('=')[0].trim();
  const doel = kies(namenInVolgorde(formule).filter(n => n !== links));
  const namen = {};
  if(niveau === 3) for(const n in woorden) namen[n] = hybrideNaam(toonNaam(n), woorden[n]);
  const route = kortsteRoute(formule, doel, false, 4, PLUSMIN_STAPPEN);
  return {
    niveau: niveau,
    soort: 'plusmin',
    formule: formule,
    doel: doel,
    woorden: woorden,
    namen: niveau === 3 ? namen : null,
    goedTekst: doel + ' = ' + naarTekst(route.antwoord),
    opties: null,
  };
}

/* ── Opgave maken, voor beide sporen ──────────────────────────────────── */

// Een nieuwe opgave, maar niet een die net al voorkwam. `recent` is een lijst
// sleutels van de laatste opgaven. `soort` is 'keerdeel' (standaard) of 'plusmin'.
function maakOpgave(niveau, recent, soort){
  const pm = soort === 'plusmin';
  let o;
  for(let poging = 0; poging < 30; poging++){
    if(niveau === 1) o = pm ? maakVleksomPlusMin() : maakVleksom();
    else if(niveau === 2) o = maakWoordsom(pm ? WOORD_CONTEXTEN_PM : WOORD_CONTEXTEN);
    else o = pm ? maakSymboolsomPM(niveau) : maakSymboolsom(niveau);
    o.soort = pm ? 'plusmin' : 'keerdeel';
    o.bewerkingen = pm ? PLUSMIN_STAPPEN : KEERDEEL_STAPPEN;
    o.sleutel = o.soort + '|' + niveau + '|' + o.formule.replace(/\s+/g, '') + '|' + o.doel;
    if(!recent || recent.indexOf(o.sleutel) < 0) break;
  }
  return o;
}

const KEERDEEL_STAPPEN = ['maal', 'deel'];
const PLUSMIN_STAPPEN = ['plus', 'min'];

// Het kleinste aantal stappen waarmee de stapper met de onderbouwknoppen bij
// het antwoord komt: de bewerkingen van het spoor, plus omdraaien en uitrekenen.
function kortsteRoute(formule, doel, uitrekenen, maxDiepte, bewerkingen){
  const soorten = bewerkingen || KEERDEEL_STAPPEN;
  const [l, r] = formule.split('=');
  let rij = [{ links: parse(l), rechts: parse(r) }];
  // Een stand die al eens langskwam, hoeft niet opnieuw: anders groeit de rij
  // bij gemengde formules (vier knoppen, veel operanden) explosief.
  const gezien = new Set([naarTekst(rij[0].links) + '=' + naarTekst(rij[0].rechts)]);
  const klaar = (a, b) => a.t === 'var' && a.naam === doel && !bevat(b, doel) && (!uitrekenen || b.t === 'num');
  for(let diepte = 0; diepte <= (maxDiepte || 5); diepte++){
    const volgende = [];
    const nieuw = s => {
      const sleutel = naarTekst(s.links) + '=' + naarTekst(s.rechts);
      if(!gezien.has(sleutel)){ gezien.add(sleutel); volgende.push(s); }
    };
    for(const s of rij){
      // Net als in de stapper: alleen staan telt, links of rechts.
      if(klaar(s.links, s.rechts)) return { stappen: diepte, antwoord: s.rechts };
      if(klaar(s.rechts, s.links)) return { stappen: diepte, antwoord: s.links };
      if(diepte === (maxDiepte || 5)) continue;
      for(const o of operanden(s.links, s.rechts, doel))
        for(const soort of soorten) nieuw(doeStap(s.links, s.rechts, soort, o));
      nieuw(doeStap(s.links, s.rechts, 'wissel'));
      if(uitrekenen && (kanRekenen(s.links) || kanRekenen(s.rechts)))
        nieuw(doeStap(s.links, s.rechts, 'reken'));
    }
    rij = volgende;
  }
  return null;
}

/* ══ Klas 3 ═════════════════════════════════════════════════════════════
   Klas 3 kent letters al en begint daar meteen: geen vlek en geen woorden. De
   levels volgen wat ze bij natuurkunde tegenkomen: keer en delen, plus en min,
   vier letters met keer en delen, en een som gedeeld door een getal zoals
   v_gem = (v_b + v_e)/2. Level 5 is extra, buiten de reeks: keer en plus door
   elkaar. Bij oefenen is de stapper de opgave; bij test jezelf typ je. */

const KLAS3_NIVEAUS = {
  1: { naam: 'Keer en delen', kort: 'keer en delen', uitleg: 'Drie letters, alleen keer en delen',          voorbeeld: 'a = b*c' },
  2: { naam: 'Plus en min',   kort: 'plus en min',   uitleg: 'Drie letters, alleen plus en min',            voorbeeld: 'a = b-c' },
  3: { naam: 'Vier letters',  kort: 'vier letters',  uitleg: 'Vier letters, alleen keer en delen',          voorbeeld: 'a = b*c/d' },
  4: { naam: 'Gemiddelde',    kort: 'gemiddelde',    uitleg: 'Een som gedeeld door een getal',              voorbeeld: 'a = (b+c)/2' },
  5: { naam: 'Extra: door elkaar', kort: 'extra',    uitleg: 'Extra: keer en plus door elkaar in één formule', voorbeeld: 'a = 2*b+c' },
};
const KLAS3_REEKS = [1, 2, 3, 4];
const KLAS3_STAPPEN = ['plus', 'min', 'maal', 'deel'];

// Vormen per level, met x links en a t/m d rechts; k is een getal. Elke vorm
// wordt met losse letters ingevuld.
const KLAS3_VORMEN = {
  4: ['x = (a+b)/k', 'x = (a+b)/k', 'x = (a-b)/k'],
  5: ['x = k*a+b', 'x = k*a-b', 'x = a/k+b', 'x = a+k*b', 'x = a*b+k', 'x = a*b-k',
      'x = k*(a+b)', 'x = k*(a-b)', 'x = (a+k)/b', 'x = a*(b+k)',
      'x = a+b*c', 'x = a*b-c', 'x = (a+b)/c', 'x = a*(b+c)'],
};

function vulVormIn(vorm){
  const [x, a, b, c, d] = schud(LOSSE_LETTERS).slice(0, 5);
  // Bij het gemiddelde is het bijna altijd door 2.
  const k = /\)\/k/.test(vorm) ? kies([2, 2, 2, 3]) : kies([2, 3, 4, 5, 10]);
  const letters = { x, a, b, c, d, k: String(k) };
  return vorm.replace(/[xabcdk]/g, t => letters[t]);
}

// Staat `doel` ergens onder een deelstreep?
function staatOnder(n, doel, onder){
  if(!n) return false;
  if(n.t === 'var') return !!onder && n.naam === doel;
  if(n.t === 'div') return staatOnder(n.l, doel, onder) || staatOnder(n.r, doel, true);
  return staatOnder(n.l, doel, onder) || staatOnder(n.r, doel, onder);
}

// Maakt `doel` vrij door de formule van buiten naar binnen af te pellen: elke
// laag die om het doel heen zit, gaat er met het tegenovergestelde af. Het doel
// komt maar één keer voor. Geeft de stappen terug (de bewerking die je aan
// allebei de kanten doet) en het antwoord als boom.
function pelAf(formule, doel){
  const [l, r] = formule.split('=');
  let kant = parse(r), ander = parse(l);
  if(bevat(ander, doel)){ const h = kant; kant = ander; ander = h; }
  const stappen = [];
  while(kant.t !== 'var'){
    const links = bevat(kant.l, doel);
    const rest = links ? kant.r : kant.l;
    if(kant.t === 'add') stappen.push({ soort: 'min', operand: rest });
    else if(kant.t === 'mul') stappen.push({ soort: 'deel', operand: rest });
    // Staat het doel achter een min of onder de deelstreep, dan haal je eerst
    // dat hele blok naar de andere kant; `blok` is dat stuk, voor de hint.
    else if(kant.t === 'sub') stappen.push(links ? { soort: 'plus', operand: rest } : { soort: 'omdraaien', operand: rest, blok: kant.r });
    else if(kant.t === 'div') stappen.push(links ? { soort: 'maal', operand: rest } : { soort: 'onder', operand: rest, blok: kant.r });
    else throw new Error('kan ' + kant.t + ' niet afpellen');
    kant = links ? kant.l : kant.r;
  }
  return { stappen: stappen, antwoord: pasStappenToe(ander, stappen) };
}

// Voert de stappen uit op de andere kant. Een getal of een som als factor zet
// je ervoor: 2·(x − b), niet (x − b)·2.
function pasStappenToe(start, stappen){
  let n = kopie(start);
  for(const s of stappen){
    const o = kopie(s.operand);
    const isSom = n.t === 'add' || n.t === 'sub';
    if(s.soort === 'min') n = knoop('sub', { l: n, r: o });
    else if(s.soort === 'plus') n = knoop('add', { l: n, r: o });
    else if(s.soort === 'deel') n = knoop('div', { l: n, r: o });
    else if(s.soort === 'maal') n = (isSom || o.t === 'num') ? knoop('mul', { l: o, r: n }) : knoop('mul', { l: n, r: o });
    else if(s.soort === 'omdraaien') n = knoop('sub', { l: o, r: n });   // a − doel = n  →  doel = a − n
    else if(s.soort === 'onder') n = knoop('div', { l: o, r: n });       // a / doel = n  →  doel = a / n
  }
  return n;
}

// De stap in woorden, voor de hints: "haal b eraf", "deel door 2".
// De uitleg bij g2: een getal hoort vóór de letter.
function getalAchterTekst(r){
  return 'Je typte <b>' + r.naam + '</b>. Een getal achter een letter is een nummertje, zoals bij s<sub>1</sub> en s<sub>2</sub>. ' +
         'Bedoel je ' + r.getal + ' keer ' + r.letter + ', zet het getal dan vóór de letter: <b>' + r.getal + r.letter + '</b> of <b>' + r.getal + '*' + r.letter + '</b>.';
}

function stapTekst(s){
  const toon = n => '<b class="f-stap">' + toonUitdrukking(naarTekst(n), { maal: '×' }) + '</b>';
  const o = toon(s.operand);
  if(s.soort === 'min') return 'haal ' + o + ' van allebei de kanten af';
  if(s.soort === 'plus') return 'tel ' + o + ' bij allebei de kanten op';
  if(s.soort === 'deel') return 'deel allebei de kanten door ' + o;
  if(s.soort === 'maal') return 'doe allebei de kanten keer ' + o;
  if(s.soort === 'omdraaien') return 'tel ' + toon(s.blok) + ' bij allebei de kanten op, zodat er geen min meer voor staat';
  return 'doe allebei de kanten keer ' + toon(s.blok) + ', zodat het niet meer onder de deelstreep staat';
}

function maakKlas3Opgave(niveau, recent){
  let o;
  for(let poging = 0; poging < 60; poging++){
    let formule;
    if(niveau === 1) formule = maakLetterFormule(false);
    else if(niveau === 2) formule = maakLetterFormulePM();
    else if(niveau === 3) formule = maakLetterFormule(true);
    else formule = vulVormIn(kies(KLAS3_VORMEN[niveau]));
    const links = formule.split('=')[0].trim();
    const rechts = parse(formule.split('=')[1]);
    let kandidaten = namenInVolgorde(formule).filter(n => n !== links);
    // Met plus en min erbij staat wat je zoekt niet onder de deelstreep: dan
    // wordt het meteen een stap of drie langer.
    if(niveau >= 4) kandidaten = kandidaten.filter(n => !staatOnder(rechts, n));
    if(!kandidaten.length) continue;
    const doel = kies(kandidaten);
    const opl = pelAf(formule, doel);
    // Alleen keer en delen: schrijf het op als één breuk, n/(z·f) in plaats
    // van n/f/z, net als in klas 2.
    if(!/[+-]/.test(formule))
      opl.antwoord = parse(monoomTekst(oplossing(formule, doel), namenInVolgorde(formule).filter(n => n !== doel)));
    o = {
      klas: 3,
      niveau: niveau,
      formule: formule,
      doel: doel,
      stappen: opl.stappen,
      antwoord: opl.antwoord,
      goedTekst: doel + ' = ' + naarTekst(opl.antwoord),
      sleutel: 'klas3|' + niveau + '|' + formule.replace(/\s+/g, '') + '|' + doel,
    };
    if(!recent || recent.indexOf(o.sleutel) < 0) break;
  }
  return o;
}

// Het kleinste aantal klikken in de stapper. Afpellen geeft een bovengrens
// (omdraaien en onder kosten twee stappen); de zoektocht vindt de echte route
// met de knoppen die de stapper aanbiedt, tot die grens.
function klas3Kortste(o){
  const grens = o.stappen.reduce((n, s) => n + (s.soort === 'omdraaien' || s.soort === 'onder' ? 2 : 1), 0);
  const r = kortsteRoute(o.formule, o.doel, false, grens, KLAS3_STAPPEN);
  // Niet gevonden binnen de grens: dan zeggen we liever niets over een omweg.
  return r ? r.stappen : null;
}

// Wat een leerling typt, omgezet naar wat parse() leest: × en · worden *, ÷
// en : worden /, een kommagetal wordt een breuk, en wat tegen elkaar aan staat
// (2a, ab, 2(a+b), (a+b)c) wordt keer. Losse letters zijn altijd één teken,
// dus ab is a keer b.
function normaliseerInvoer(tekst){
  let s = String(tekst).replace(/\s+/g, '')
    .replace(/[×·∙⋅]/g, '*').replace(/[÷:]/g, '/').replace(/[−–—]/g, '-')
    .replace(/\[/g, '(').replace(/\]/g, ')');
  s = s.replace(/(\d+)[.,](\d+)/g, (m, a, b) => '(' + a + b + '/' + Math.pow(10, b.length) + ')');
  let uit = '';
  for(const c of s){
    const p = uit[uit.length - 1];
    if(p && /[A-Za-z0-9)]/.test(p) && (/[A-Za-z(]/.test(c) || (p === ')' && /[0-9]/.test(c)))) uit += '*';
    uit += c;
  }
  return uit;
}

// Kijkt een getypt antwoord na. Geeft { status, ... } terug:
//   goed, fout (met de rechterkant), leeg, onleesbaar, links (er staat links
//   niet alleen wat je zoekt), doelRechts (wat je zoekt staat rechts ook nog),
//   getalAchter (g2 getypt, 2g bedoeld), onbekend (een letter die niet in de
//   formule staat).
function nakijkKlas3(invoer, o){
  const s = normaliseerInvoer(invoer);
  const delen = s.split('=');
  if(delen.length > 2) return { status: 'onleesbaar' };
  const linksTekst = delen.length === 2 ? delen[0] : o.doel;
  const rechtsTekst = delen.length === 2 ? delen[1] : delen[0];
  if(!rechtsTekst) return { status: 'leeg' };
  if(linksTekst !== o.doel) return { status: 'links', links: linksTekst };
  let boom;
  try{ boom = parse(rechtsTekst); }catch(e){ return { status: 'onleesbaar' }; }
  if(bevat(boom, o.doel)) return { status: 'doelRechts' };
  const bekend = namenInVolgorde(o.formule).filter(n => n !== o.doel);
  const vreemd = namenInVolgorde(rechtsTekst).filter(n => bekend.indexOf(n) < 0);
  // g2 is geen 2 keer g: een getal achter een letter is een nummertje (s₂).
  const achter = vreemd.find(n => /^[A-Za-z]\d+$/.test(n) && bekend.indexOf(n[0]) >= 0);
  if(achter) return { status: 'getalAchter', naam: achter, letter: achter[0], getal: achter.slice(1) };
  if(vreemd.length) return { status: 'onbekend', namen: vreemd };
  for(let i = 0; i < 6; i++){
    const w = {};
    for(const n of bekend) w[n] = 1.5 + Math.random() * 8;
    const moet = rekenWaarde(o.antwoord, w), is = rekenWaarde(boom, w);
    if(!Number.isFinite(moet)) continue;
    if(!Number.isFinite(is) || Math.abs(moet - is) > 1e-9 * Math.max(1, Math.abs(moet)))
      return { status: 'fout', rechts: rechtsTekst, volgorde: zelfdeWaarde(boom, verkeerdeVolgorde(o), bekend) };
  }
  return { status: 'goed', rechts: rechtsTekst };
}

// De veelgemaakte fout bij gemengde formules: de goede stappen, maar van
// binnen naar buiten in plaats van van buiten naar binnen.
function verkeerdeVolgorde(o){
  if(o.stappen.length < 2) return null;
  const [l, r] = o.formule.split('=');
  const ander = bevat(parse(r), o.doel) ? parse(l) : parse(r);
  return pasStappenToe(ander, o.stappen.slice().reverse());
}

function zelfdeWaarde(a, b, namen){
  if(!a || !b) return false;
  for(let i = 0; i < 4; i++){
    const w = {};
    for(const n of namen) w[n] = 1.5 + Math.random() * 8;
    const x = rekenWaarde(a, w), y = rekenWaarde(b, w);
    if(!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x - y) > 1e-9 * Math.max(1, Math.abs(x))) return false;
  }
  return true;
}

// Een fout antwoord narekenen met getallen. Kies nette getallen voor alles
// rechts, reken de linkerkant uit, en laat zien dat het antwoord van de
// leerling dan niet op het goede getal uitkomt. Geeft HTML of null.
function getalProefKlas3(o, rechtsTekst){
  const links = o.formule.split('=')[0].trim();
  const namen = namenInVolgorde(o.formule);
  let boom;
  try{ boom = parse(rechtsTekst); }catch(e){ return null; }
  // Met 10, 20 en 30 erbij gaat ook a/10 netjes op.
  const GETALLEN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 20, 30, 40, 50, 60];
  for(let poging = 0; poging < 2000; poging++){
    const w = {};
    for(const n of namen) if(n !== links) w[n] = kies(GETALLEN);
    const waarde = rekenWaarde(parse(o.formule.split('=')[1]), w);
    if(!Number.isInteger(Math.round(waarde * 1e9) / 1e9) || waarde < 1 || waarde > 200) continue;
    w[links] = Math.round(waarde);
    const bekend = {};
    for(const n of namen) if(n !== o.doel) bekend[n] = w[n];
    const uit = rekenWaarde(boom, bekend);
    if(!Number.isFinite(uit) || Math.abs(uit - w[o.doel]) < 1e-9) continue;
    const weergave = { maal: '×' };
    const som = s => '<span class="controle-som">' + toonVergelijking(s, weergave) + '</span>';
    const kent = namen.filter(n => n !== o.doel).map(n => som(n + ' = ' + w[n]));
    const afgerond = Math.round(uit * 100) / 100;
    return 'Probeer het met getallen. Neem ' + kent.join(' en ') + '. Dan is ' + som(o.doel + ' = ' + w[o.doel]) +
           ', want dat klopt in de formule. Jouw antwoord geeft ' +
           som(o.doel + ' = ' + vulIn(rechtsTekst, bekend)) + ' = ' + getalTekst(afgerond) +
           (Math.abs(afgerond - uit) < 1e-9 ? '' : ' (ongeveer)') + ', en dat is geen ' + w[o.doel] + '.';
  }
  return null;
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { VLEK_SVG, NIVEAUS, maakOpgave, maakVleksom, maakWoordsom, maakSymboolsom,
                     getalOpties, letterOpties, oplossing, monoomVan, zelfdeMonoom, monoomTekst,
                     vulIn, kantWaarden, namenInVolgorde, invulControle, getalProef, kortsteRoute, klok,
                     WOORD_CONTEXTEN_PM, SYMBOOL_FORMULES_PM, PLUSMIN_STAPPEN, KEERDEEL_STAPPEN,
                     WOORD_CONTEXTEN, SYMBOOL_FORMULES,
                     KLAS3_NIVEAUS, KLAS3_REEKS, KLAS3_STAPPEN, KLAS3_VORMEN, klas3Kortste, maakKlas3Opgave, pelAf, staatOnder,
                     normaliseerInvoer, nakijkKlas3, getalAchterTekst, verkeerdeVolgorde, getalProefKlas3, stapTekst };
}
