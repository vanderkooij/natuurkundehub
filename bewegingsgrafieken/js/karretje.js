/* ══════════════════════════════════════════════════════════════════════
   KARRETJE: de beweging naspelen op een baan, plus de scène die het
   karretje en de diagrammen samen afspeelt

   maakKarretje(houder, beweging, { spoor, markeer }) → { zetTijd(t) }
   Onderbouw: startvlag met een maatlijn tot het karretje (de afstand tot de
   start). Bovenbouw: een liniaal met 0 en een negatieve kant.
   Onder de baan vallen afdrukjes op gelijke tijdstappen, zoals een
   tikkerband: ver uit elkaar is snel, dicht op elkaar is langzaam.

   maakScene({ karretje, grafieken, beweging, spoor, markeer }) speelt alles
   synchroon af.
   ══════════════════════════════════════════════════════════════════════ */

const AFDRUK_STAPPEN = 24;

function maakKarretje(houder, beweging, { spoor = 'bovenbouw', markeer = null, toonRichting = true } = {}) {
  const ob = spoor === 'onderbouw';
  // De onderbouw heeft ruimte nodig voor de startvlag boven de baan.
  const W = 640, H = ob ? 124 : 96, BAAN = ob ? 76 : 48;   // breed en laag: past boven de grafiek

  let lo = Math.min(0, beweging.x0), hi = Math.max(0, beweging.x0);
  for (const s of beweging.segmenten) { lo = Math.min(lo, s.x1); hi = Math.max(hi, s.x1); }
  if (hi - lo < 1e-9) hi = lo + 1;
  // Zonder zichtbare richting ook de startplek niet laten verraden welke kant
  // het op gaat: de baan loopt dan even ver naar links als naar rechts.
  if (!toonRichting && !ob) { const m = Math.max(-lo, hi); lo = -m; hi = m; }
  const links = 40, rechts = W - 34;
  const px = x => links + (x - lo) / (hi - lo) * (rechts - links);
  let markeerLijst = markeer === null || markeer === undefined ? [] : [].concat(markeer);

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'bg-baan', role: 'img', 'aria-label': 'Karretje op een baan' });

  svgEl('line', { x1: 14, y1: BAAN, x2: W - 14, y2: BAAN, class: 'bg-baan-lijn' }, svg);

  if (ob) {
    // Startvlag op de plek waar de afstand nul is.
    const x0 = px(0);
    const vlag = svgEl('g', { class: 'bg-vlag' }, svg);
    svgEl('line', { x1: x0, y1: BAAN, x2: x0, y2: BAAN - 58 }, vlag);
    svgEl('path', { d: `M${x0},${BAAN - 58} L${x0 + 16},${BAAN - 52} L${x0},${BAAN - 46} Z` }, vlag);
    svgEl('text', { x: x0, y: BAAN - 62, 'text-anchor': 'middle', class: 'bg-baan-tekst' }, vlag).textContent = 'start';
  } else {
    // Liniaal: streepjes op gelijke afstand, 0 groot, pijl met x aan het eind.
    const lin = svgEl('g', { class: 'bg-liniaal' }, svg);
    const stap = (rechts - links) / 16;
    for (let x = px(0), k = 0; x <= W - 20; x += stap, k++) svgEl('line', { x1: x, y1: H - 22, x2: x, y2: H - (k % 4 === 0 ? 14 : 18) }, lin);
    for (let x = px(0) - stap, k = 1; x >= 16; x -= stap, k++) svgEl('line', { x1: x, y1: H - 22, x2: x, y2: H - (k % 4 === 0 ? 14 : 18) }, lin);
    svgEl('line', { x1: 14, y1: H - 22, x2: W - 14, y2: H - 22 }, lin);
    svgEl('path', { d: `M${W - 20},${H - 26} L${W - 12},${H - 22} L${W - 20},${H - 18}`, class: 'bg-pijl' }, lin);
    svgEl('text', { x: px(0), y: H - 2, 'text-anchor': 'middle', class: 'bg-baan-tekst' }, lin).textContent = '0';
    svgEl('text', { x: W - 14, y: H - 30, 'text-anchor': 'end', class: 'bg-baan-tekst bg-baan-tekst--as' }, lin).textContent = 'x';
  }

  const afdrukLaag = svgEl('g', { class: 'bg-afdrukken' }, svg);

  // De maatlijn (onderbouw) van de vlag tot het karretje.
  let maat = null;
  if (ob) {
    maat = svgEl('g', { class: 'bg-maat' }, svg);
    maat.lijn = svgEl('line', { y1: H - 18, y2: H - 18 }, maat);
    maat.a = svgEl('line', { y1: H - 23, y2: H - 13 }, maat);
    maat.b = svgEl('line', { y1: H - 23, y2: H - 13 }, maat);
    maat.tekst = svgEl('text', { y: H - 4, 'text-anchor': 'middle', class: 'bg-baan-tekst' }, maat);
    maat.tekst.textContent = 'afstand';
  }

  // Het karretje zelf. De voorkant (cabine met schuine ruit, koplamp en een
  // pijltje) wijst in de rijrichting. Zonder richting een neutraal karretje:
  // dan verklapt het vóór het antwoord niet welke kant het op gaat.
  const kar = svgEl('g', { class: 'bg-kar' }, svg);
  const romp = svgEl('g', {}, kar);
  svgEl('rect', { x: -22, y: -21, width: 44, height: 14, rx: 4, class: 'bg-kar-romp' }, romp);
  const voorkant = svgEl('g', {}, romp);
  svgEl('path', { d: 'M-8,-21 L-8,-32 L5,-32 L14,-21 Z', class: 'bg-kar-romp' }, voorkant);
  svgEl('path', { d: 'M-5,-23 L-5,-29.5 L3.6,-29.5 L9,-23 Z', class: 'bg-kar-ruit' }, voorkant);
  svgEl('circle', { cx: 20, cy: -16, r: 2.4, class: 'bg-kar-lamp' }, voorkant);
  svgEl('path', { d: 'M-12,-14 L5,-14 M1,-17.5 L5.5,-14 L1,-10.5', class: 'bg-kar-pijl' }, voorkant);
  const neutraal = svgEl('rect', { x: -9, y: -31, width: 18, height: 10, rx: 3, class: 'bg-kar-romp' }, romp);
  function zetRichtingZichtbaar(aan) {
    voorkant.setAttribute('visibility', aan ? 'visible' : 'hidden');
    neutraal.setAttribute('visibility', aan ? 'hidden' : 'visible');
  }
  zetRichtingZichtbaar(toonRichting);
  const wielen = [-12, 12].map(dx => {
    const w = svgEl('g', { transform: `translate(${dx},-5)` }, kar);
    svgEl('circle', { r: 5.2, class: 'bg-kar-wiel' }, w);
    const spaak = svgEl('line', { x1: 0, y1: -4, x2: 0, y2: 4, class: 'bg-kar-spaak' }, w);
    return { w, spaak, dx };
  });

  let richting = 1;
  function zetTijd(t) {
    const st = toestand(beweging, t);
    if (Math.abs(st.v) > 1e-6) richting = Math.sign(st.v);
    else if (t <= 0) richting = Math.sign(beweging.segmenten.find(s => richtingVan(s) !== 0)?.v0 || 1) || 1;
    const X = px(st.x);
    kar.setAttribute('transform', `translate(${X},${BAAN})`);
    romp.setAttribute('transform', richting < 0 ? 'scale(-1,1)' : '');
    const hoek = (X - px(beweging.x0)) / 5.2 * 180 / Math.PI;
    wielen.forEach(({ spaak }) => spaak.setAttribute('transform', `rotate(${hoek})`));

    // Afdrukjes tot en met nu; in het gemarkeerde stuk in amber.
    afdrukLaag.innerHTML = '';
    for (let k = 0; k <= AFDRUK_STAPPEN; k++) {
      const tk = beweging.T * k / AFDRUK_STAPPEN;
      if (tk > t + 1e-9) break;
      const i = segmentOp(beweging, Math.min(tk, beweging.T - 1e-9));
      svgEl('circle', {
        cx: px(toestand(beweging, tk).x), cy: BAAN + 9, r: 2.6,
        class: 'bg-afdruk' + (markeerLijst.includes(i) ? ' bg-afdruk--mark' : '')
      }, afdrukLaag);
    }

    if (maat) {
      const a = px(0);
      maat.lijn.setAttribute('x1', a); maat.lijn.setAttribute('x2', X);
      maat.a.setAttribute('x1', a); maat.a.setAttribute('x2', a);
      maat.b.setAttribute('x1', X); maat.b.setAttribute('x2', X);
      maat.tekst.setAttribute('x', (a + X) / 2);
      maat.setAttribute('visibility', X - a > 4 ? 'visible' : 'hidden');
      maat.tekst.setAttribute('visibility', X - a > 62 ? 'visible' : 'hidden');
    }
  }

  zetTijd(0);
  houder.innerHTML = '';
  houder.appendChild(svg);
  return { zetTijd, zetRichtingZichtbaar, zetMarkering(m) { markeerLijst = m === null || m === undefined ? [] : [].concat(m); }, svg };
}

/* ── SCÈNE: karretje en diagrammen samen afspelen ── */

const AFSPEELDUUR = { normaal: 7000, langzaam: 16000 };   // ms voor de hele beweging

// richtingVooraf: false geeft vóór het afspelen een karretje zonder voorkant.
function maakScene({ karretje, grafieken = [], beweging, spoor, markeer = null, klein = false, opEinde = null, richtingVooraf = true, getallen = false }) {
  const kar = karretje ? maakKarretje(karretje, beweging, { spoor, markeer, toonRichting: richtingVooraf }) : null;
  const lijst = grafieken.map(({ houder, diagram }) => maakGrafiek(houder, beweging, { diagram, spoor, markeer, klein, getallen }));
  let frame = null, t = 0, speelt = false;

  function zet(tijd, metCursor) {
    t = tijd;
    if (kar) kar.zetTijd(tijd);
    lijst.forEach(g => g.zetTijd(metCursor ? tijd : null));
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = null; speelt = false;
  }

  function speel(tempo = 'normaal') {
    stop();
    speelt = true;
    if (kar) kar.zetRichtingZichtbaar(true);
    const duur = AFSPEELDUUR[tempo] || AFSPEELDUUR.normaal;
    const start = performance.now();
    const stap = nu => {
      const tijd = Math.min(beweging.T, (nu - start) / duur * beweging.T);
      zet(tijd, true);
      if (tijd < beweging.T) frame = requestAnimationFrame(stap);
      else { frame = null; speelt = false; if (opEinde) opEinde(); }
    };
    frame = requestAnimationFrame(stap);
  }

  zet(0, false);
  return {
    speel, stop,
    get speelt() { return speelt; },
    reset() { stop(); zet(0, false); },
    toonEind() { stop(); zet(beweging.T, false); },
    voegGrafiekToe(houder, diagram) {
      const g = maakGrafiek(houder, beweging, { diagram, spoor, markeer, klein, getallen });
      lijst.push(g);
      g.zetTijd(speelt ? t : null);
      return g;
    },
    zetMarkering(m) { lijst.forEach(g => g.zetMarkering(m)); if (kar) { kar.zetMarkering(m); kar.zetTijd(t); } }
  };
}
