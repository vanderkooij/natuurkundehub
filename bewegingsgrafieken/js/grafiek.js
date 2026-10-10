/* ══════════════════════════════════════════════════════════════════════
   GRAFIEK: x,t-, v,t- en a,t-diagram als SVG, zonder getallen

   maakGrafiek(houder, beweging, { diagram, spoor, markeer })
   geeft { zetTijd(t | null), zetMarkering(i | [i] | null) }.
   Kleuren komen uit css/beweging.css, zodat licht en donker thema werken.
   ══════════════════════════════════════════════════════════════════════ */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(naam, attrs, ouder) {
  const e = document.createElementNS(SVG_NS, naam);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (ouder) ouder.appendChild(e);
  return e;
}

// getallen: true zet een schaalverdeling op beide assen (voor de rekenvragen).
function maakGrafiek(houder, beweging, { diagram = 'x', spoor = 'bovenbouw', markeer = null, klein = false, getallen = false } = {}) {
  // Met getallen breder: dan staan de seconden verder uit elkaar en passen de getallen.
  const W = getallen ? 540 : 420, H = klein ? 240 : 290;
  const vak = { l: getallen ? 64 : 54, r: W - 26, t: 18, b: H - (getallen ? 40 : 36) };
  const taal = TAAL[spoor];

  // Bereik van de verticale as: nul hoort er altijd bij.
  const waarde = t => waardeIn(diagram, beweging, t, spoor);
  let lo = 0, hi = 0;
  const stappen = 240;
  for (let k = 0; k <= stappen; k++) {
    const y = waarde(beweging.T * k / stappen);
    lo = Math.min(lo, y); hi = Math.max(hi, y);
  }
  if (diagram === 'a') {                                   // ook de waarde vlak voor een sprong
    for (const s of beweging.segmenten) { lo = Math.min(lo, s.a); hi = Math.max(hi, s.a); }
  }
  if (hi - lo < 1e-9) { hi = 1; lo = diagram === 'x' && spoor === 'onderbouw' ? 0 : -1; }
  let stap = null;
  if (getallen) {
    // Met getallen: de as loopt van een hele stap tot een hele stap.
    stap = asStap(lo, hi);
    lo = Math.floor(lo / stap + 1e-9) * stap;
    hi = Math.ceil(hi / stap - 1e-9) * stap;
    if (hi <= 0) hi = stap;
  } else {
    // Bij een as die naar beide kanten gaat, de nul niet tegen de rand.
    const marge = (hi - lo) * 0.12;
    if (hi > 0) hi += marge;
    if (lo < 0) lo -= marge;
    // Alleen negatieve waarden: toch een stuk as boven de nul laten zien, zodat
    // duidelijk is dat de lijn onder de t-as ligt (negatief) en de t-as niet
    // tegen de bovenrand plakt.
    if (lo < 0 && hi <= 0) hi = (hi - lo) * 0.22;
  }

  const px = t => vak.l + (t / beweging.T) * (vak.r - vak.l);
  const py = y => vak.b - ((y - lo) / (hi - lo)) * (vak.b - vak.t);
  const y0 = py(0);

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'bg-grafiek', role: 'img' });
  svg.setAttribute('aria-label', taal.naam[diagram]);

  // Raster: zonder getallen alleen om recht en krom te zien; met getallen
  // één lijn per seconde en per stap op de verticale as.
  const raster = svgEl('g', { class: 'bg-raster' }, svg);
  const kol = getallen ? Math.round(beweging.T) : 12, hok = (vak.r - vak.l) / kol;
  for (let k = 1; k <= kol; k++) svgEl('line', { x1: vak.l + k * hok, y1: vak.t, x2: vak.l + k * hok, y2: vak.b }, raster);
  const schaal = svgEl('g', {}, svg);
  if (getallen) {
    for (let w = lo; w <= hi + 1e-9; w += stap) {
      const y = py(w);
      if (Math.abs(w) > 1e-9) {
        svgEl('line', { x1: vak.l, y1: y, x2: vak.r, y2: y }, raster);
        svgEl('text', { x: vak.l - 9, y: y + 4.5, class: 'bg-getal', 'text-anchor': 'end' }, schaal).textContent = getalTekst(w);
      }
    }
    for (let k = 2; k <= kol; k += 2) {
      svgEl('text', { x: vak.l + k * hok, y: vak.b + 16, class: 'bg-getal', 'text-anchor': 'middle' }, schaal).textContent = String(k);
    }
  } else {
    for (let y = y0 - hok; y >= vak.t - 0.5; y -= hok) svgEl('line', { x1: vak.l, y1: y, x2: vak.r, y2: y }, raster);
    for (let y = y0 + hok; y <= vak.b + 0.5; y += hok) svgEl('line', { x1: vak.l, y1: y, x2: vak.r, y2: y }, raster);
  }

  const bandLaag = svgEl('g', {}, svg);

  // Assen met pijlpunt. De t-as ligt op y = 0.
  const assen = svgEl('g', { class: 'bg-as' }, svg);
  svgEl('line', { x1: vak.l, y1: vak.b + 4, x2: vak.l, y2: vak.t - 8 }, assen);
  svgEl('path', { d: `M${vak.l - 5},${vak.t - 2} L${vak.l},${vak.t - 11} L${vak.l + 5},${vak.t - 2}`, class: 'bg-pijl' }, assen);
  svgEl('line', { x1: vak.l - 4, y1: y0, x2: vak.r + 12, y2: y0 }, assen);
  svgEl('path', { d: `M${vak.r + 6},${y0 - 5} L${vak.r + 15},${y0} L${vak.r + 6},${y0 + 5}`, class: 'bg-pijl' }, assen);
  svgEl('text', { x: vak.l - 9, y: y0 + 5.5, class: 'bg-nul', 'text-anchor': 'end' }, assen).textContent = '0';

  const yLabel = svgEl('text', {
    x: 16, y: (vak.t + vak.b) / 2, class: 'bg-label', 'text-anchor': 'middle',
    transform: `rotate(-90 16 ${(vak.t + vak.b) / 2})`
  }, assen);
  yLabel.textContent = taal.as[diagram];
  // Het label van de t-as aan de kant waar de lijn het minst loopt. Met
  // getallen staan die onderaan, dan komt het label boven de as.
  const tLabelY = getallen ? y0 - 10
    : (lo < 0 && y0 - vak.t < vak.b - y0) ? y0 - 10 : Math.min(y0 + 24, H - 6);
  svgEl('text', { x: vak.r + 12, y: tLabelY, class: 'bg-label', 'text-anchor': 'end' }, assen).textContent = taal.as.t;

  // De lijn, per segment een eigen pad zodat er één gemarkeerd kan worden.
  const lijnLaag = svgEl('g', {}, svg);
  const paden = beweging.segmenten.map((s, i) => {
    let d;
    if (diagram === 'a') {
      d = `M${px(s.t0)},${py(s.a)} L${px(s.t0 + s.duur)},${py(s.a)}`;
    } else {
      const n = diagram === 'x' && s.a !== 0 ? 32 : 1;
      const punten = [];
      for (let k = 0; k <= n; k++) {
        const t = s.t0 + s.duur * k / n;
        const dt = t - s.t0;
        let y;
        if (diagram === 'x') y = s.x0 + s.v0 * dt + 0.5 * s.a * dt * dt;
        else { y = s.v0 + s.a * dt; if (spoor === 'onderbouw') y = Math.abs(y); }
        punten.push(`${px(t).toFixed(2)},${py(y).toFixed(2)}`);
      }
      d = 'M' + punten.join(' L');
    }
    return svgEl('path', { d, class: 'bg-lijn' }, lijnLaag);
  });

  // Sprongen (in v of a) als gestippelde verbinding, zodat de lijn niet "breekt".
  const sprongLaag = svgEl('g', { class: 'bg-sprong' }, svg);
  for (let i = 1; i < beweging.segmenten.length; i++) {
    const a = beweging.segmenten[i - 1], b = beweging.segmenten[i];
    let ya, yb;
    if (diagram === 'a') { ya = a.a; yb = b.a; }
    else if (diagram === 'v') {
      ya = spoor === 'onderbouw' ? Math.abs(a.v1) : a.v1;
      yb = spoor === 'onderbouw' ? Math.abs(b.v0) : b.v0;
    } else continue;
    if (Math.abs(ya - yb) > 1e-9) svgEl('line', { x1: px(b.t0), y1: py(ya), x2: px(b.t0), y2: py(yb) }, sprongLaag);
  }

  // Stippen op de grenzen van de segmenten.
  const stipLaag = svgEl('g', {}, svg);
  const grenzen = [];
  beweging.segmenten.forEach((s, i) => {
    if (diagram === 'a') {
      grenzen.push({ t: s.t0, y: s.a, seg: [i] }, { t: s.t0 + s.duur, y: s.a, seg: [i] });
    } else {
      const t1 = s.t0 + s.duur;
      grenzen.push({ t: t1, y: waarde(Math.min(t1, beweging.T - 1e-9)), seg: [i, i + 1] });
      if (i === 0) grenzen.unshift({ t: 0, y: waarde(0), seg: [0] });
    }
  });
  // Voor x en v: de waarde precies op de grens (bij een sprong het eind van het vorige stuk).
  const stippen = grenzen.map(g => {
    let y = g.y;
    if (diagram !== 'a' && g.t > 0) {
      const s = beweging.segmenten[g.seg[0]];
      y = diagram === 'x' ? s.x1 : (spoor === 'onderbouw' ? Math.abs(s.v1) : s.v1);
    }
    return Object.assign(svgEl('circle', { cx: px(g.t), cy: py(y), r: 3.6, class: 'bg-stip' }, stipLaag), { _seg: g.seg });
  });

  // Tijdcursor tijdens het afspelen.
  const cursor = svgEl('g', { class: 'bg-cursor', visibility: 'hidden' }, svg);
  const cLijn = svgEl('line', { y1: vak.t, y2: vak.b }, cursor);
  const cStip = svgEl('circle', { r: 5.5 }, cursor);

  let lijst = [];
  function zetMarkering(m) {
    lijst = m === null || m === undefined ? [] : [].concat(m);
    bandLaag.innerHTML = '';
    for (const i of lijst) {
      const s = beweging.segmenten[i];
      svgEl('rect', { x: px(s.t0), y: vak.t, width: px(s.t0 + s.duur) - px(s.t0), height: vak.b - vak.t, class: 'bg-band' }, bandLaag);
    }
    paden.forEach((p, i) => p.classList.toggle('bg-lijn--mark', lijst.includes(i)));
    // Een stip is gemarkeerd als hij een grens van het gemarkeerde stuk is.
    stippen.forEach(st => st.classList.toggle('bg-stip--mark', st._seg.some(i => lijst.includes(i))));
  }

  function zetTijd(t) {
    if (t === null || t === undefined) {
      cursor.setAttribute('visibility', 'hidden');
      svg.classList.remove('is-actief');
      return;
    }
    cursor.setAttribute('visibility', 'visible');
    // Het gemarkeerde stuk licht op zolang het karretje dat stuk rijdt.
    svg.classList.toggle('is-actief', lijst.includes(segmentOp(beweging, t)));
    const x = px(t);
    cLijn.setAttribute('x1', x); cLijn.setAttribute('x2', x);
    cStip.setAttribute('cx', x); cStip.setAttribute('cy', py(waarde(t)));
  }

  zetMarkering(markeer);
  houder.innerHTML = '';
  houder.appendChild(svg);
  return { zetTijd, zetMarkering, svg };
}
