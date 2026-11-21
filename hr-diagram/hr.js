// HR-diagram: rekenwerk en tekenen. Gemaakt door Gijs Koetsenruijter; voor NatuurkundeHub in de huisstijl gezet.
// De gegevens staan in data.js.

/* ---------- constanten ---------- */
const TSUN = 5840, LOGTSUN = Math.log10(TSUN);   // zonnetemperatuur zoals in de HR 1-gegevens en het oorspronkelijke werkblad
/* assen: x is log T (omgekeerd, zoals in BINAS), y is log (P/Pzon); het bereik past bij de dataset */
const AXES = {
  hr1: { XMAX: 4.6, XMIN: 3.4, YMIN: -1,   YMAX: 5.5 },   // 50 helderste sterren
  hr2: { XMAX: 4.9, XMIN: 3.3, YMIN: -4.2, YMAX: 5.5 },   // sterren binnen 1000 lj
  zon: { XMAX: 4.9, XMIN: 3.3, YMIN: -4.2, YMAX: 5.5 }    // de zon door de tijd (zelfde assen als de sterren binnen 1000 lj)
};
let { XMAX, XMIN, YMIN, YMAX } = AXES.hr1;
const CMIN = 3.3, CMAX = 4.9;                              // vaste schaal voor de kleur (zelfde kleur bij dezelfde T)
const PL = 66, PR = 16, PT = 14, PB = 54;

const SUBTEXT = {
  hr1: 'De 50 helderste sterren aan de hemel, gezien vanaf de aarde. Sleep een kader om een groep sterren.',
  hr2: 'Sterren binnen 1000 lichtjaar, gemeten door de Hipparcos-satelliet. Verander de afstand en sleep een kader om een groep sterren.',
  zon: 'Een ster in het HR-diagram, van geboorte tot einde. Kies de massa en schuif door de tijd, of vergelijk sterren op dezelfde leeftijd.'
};
const FOOT = {
  hr1: 'Data: HR 1 gegevens van astronomie.nl/lesmateriaal. Beweeg over een ster voor de gegevens.',
  hr2: 'Data: Hipparcos-satelliet (ESA), bestand HR 2 gegevens van astronomie.nl/lesmateriaal. Beweeg over een ster voor de gegevens.',
  zon: 'De zon (1 M_zon): model van Schröder & Smith (2008, MNRAS 386, 155); de ronde punten zijn modelwaarden, tussen de punten is het spoor schematisch. 3, 5 en 15 M_zon: indicatieve sporen uit de rekenformules van Hurley, Pols & Tout (2000), uitgerekend met het pakket COSMIC.'
};

/* ---------- huidige dataset ---------- */
let N = 0, T, LL, LT, D = null, colorIdx, hasDist = false;
const D2 = Float32Array.from(DS.hr2.d);           // afstanden van hr2 (oplopend), ook voor de dichtheidsgrafiek
const state = { ds: 'hr1', dist: 1000, nVis: 0, sel: null, hover: -1, zs: 0.165, zsc: 'log', zm: 1, zcmp: false, zsel: [1, 5], zc: 0.455 };

/* ---------- hulpfuncties ---------- */
const SUP = {'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
const sup = n => String(n).split('').map(c => SUP[c] || c).join('');
const fmt = (x, dec) => x.toLocaleString('nl-NL', {minimumFractionDigits: dec, maximumFractionDigits: dec}).replace('-', '−');
const fmtSci = x => {
  if (!(x > 0)) return '0';
  let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e), ms = m.toFixed(1);
  if (ms === '10.0') { ms = '1.0'; e++; }
  return ms.replace('.', ',') + ' · 10' + sup(e);
};
const fmtP = p => p < 0.01 ? fmtSci(p) : p < 10 ? fmt(p, 2) : p < 1000 ? fmt(p, 1) : fmt(p, 0);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const volume = d => 4 / 3 * Math.PI * d * d * d;
const $ = id => document.getElementById(id);
function countIn(arr, d) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] <= d) lo = m + 1; else hi = m; }
  return lo;
}

/* ---------- kleur naar temperatuur ---------- */
const TEMP_STOPS = [
  [2500,[255,86,54]],[3500,[255,138,61]],[4500,[255,184,102]],[5800,[255,240,194]],
  [7500,[244,244,255]],[10000,[207,224,255]],[20000,[157,189,255]],[40000,[122,156,255]],[80000,[110,140,255]]
];
function tempColor(logT) {
  const t = Math.pow(10, logT);
  if (t <= TEMP_STOPS[0][0]) return TEMP_STOPS[0][1];
  for (let i = 1; i < TEMP_STOPS.length; i++) {
    if (t <= TEMP_STOPS[i][0]) {
      const a = TEMP_STOPS[i-1], b = TEMP_STOPS[i];
      const f = (Math.log10(t) - Math.log10(a[0])) / (Math.log10(b[0]) - Math.log10(a[0]));
      return a[1].map((v, k) => v + (b[1][k] - v) * f);
    }
  }
  return TEMP_STOPS[TEMP_STOPS.length - 1][1];
}
const BUCKETS = 160;
const palette = [];
for (let b = 0; b < BUCKETS; b++) {
  const c = tempColor(CMIN + (b + 0.5) / BUCKETS * (CMAX - CMIN));
  palette.push(`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`);
}

/* ---------- hoofdcanvas ---------- */
const stage = $('stage'), canvas = $('hrd'), ctx = canvas.getContext('2d');
const base = document.createElement('canvas'), bctx = base.getContext('2d');
let W = 0, H = 0, dpr = 1, dirty = true, raf = 0;

const px = lt => PL + (XMAX - lt) / (XMAX - XMIN) * (W - PL - PR);
const py = ll => PT + (YMAX - ll) / (YMAX - YMIN) * (H - PT - PB);
const invX = x => XMAX - (x - PL) / (W - PL - PR) * (XMAX - XMIN);
const invY = y => YMAX - (y - PT) / (H - PT - PB) * (YMAX - YMIN);

function resize() {
  dpr = window.devicePixelRatio || 1;
  W = stage.clientWidth; H = stage.clientHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  base.width = canvas.width; base.height = canvas.height;
  dirty = true; schedule();
}

function renderBase() {
  const c = bctx;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#070b16'; c.fillRect(0, 0, W, H);

  c.font = '12px "Space Grotesk",system-ui,sans-serif';
  c.lineWidth = 1; c.textAlign = 'center'; c.textBaseline = 'top';
  const narrow = W < 600;
  for (let i = 0; i <= 20; i++) {
    const k = Math.round((3.3 + i * 0.1) * 10) / 10;           // log T, stap 0,1
    if (k < XMIN - 1e-9 || k > XMAX + 1e-9) continue;
    const x = px(k);
    c.strokeStyle = '#161f3c'; c.beginPath(); c.moveTo(x, PT); c.lineTo(x, H - PB); c.stroke();
    if (Math.round(k * 10) % (narrow ? 4 : 2) === 0) { c.fillStyle = '#97a3c7'; c.fillText(fmt(k, 1), x, H - PB + 6); }
  }
  c.textAlign = 'right'; c.textBaseline = 'middle';
  for (let k = Math.ceil(YMIN); k <= Math.floor(YMAX); k++) {
    const y = py(k);
    c.strokeStyle = '#161f3c'; c.beginPath(); c.moveTo(PL, y); c.lineTo(W - PR, y); c.stroke();
    c.fillStyle = '#97a3c7'; c.fillText(fmt(k, 0), PL - 8, y);
  }
  c.strokeStyle = '#26315a'; c.strokeRect(PL, PT, W - PL - PR, H - PT - PB);

  c.fillStyle = '#c3cce8'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.font = '13px "Space Grotesk",system-ui,sans-serif';
  c.fillText('log T (T in K)', PL + (W - PL - PR) / 2, H - 10);
  c.save(); c.translate(15, PT + (H - PT - PB) / 2); c.rotate(-Math.PI / 2);
  c.fillText('log (P/Pzon)', 0, 0); c.restore();

  /* lijnen van gelijke straal (alleen bij 'De zon door de tijd') */
  if (state.ds === 'zon') {
    c.save(); c.beginPath(); c.rect(PL, PT, W - PL - PR, H - PT - PB); c.clip();
    c.lineWidth = 1; c.strokeStyle = 'rgba(151,163,199,.4)'; c.font = '11px "Space Grotesk",system-ui,sans-serif';
    c.fillStyle = 'rgba(151,163,199,.95)'; c.textAlign = 'right'; c.textBaseline = 'bottom';
    for (const [R, labT] of [[0.01, 3.86], [0.1, 3.42], [1, 3.42], [10, 3.42], [100, 3.42], [1000, 3.42]]) {
      const lr = Math.log10(R), l0 = Math.log10(ZRS);
      c.setLineDash([5, 5]); c.beginPath(); c.moveTo(px(XMAX), py(2 * lr + 4 * (XMAX - l0))); c.lineTo(px(XMIN), py(2 * lr + 4 * (XMIN - l0))); c.stroke();
      const yl = 2 * lr + 4 * (labT - l0);
      if (yl > YMIN && yl < YMAX) { c.setLineDash([]); c.fillText(String(R).replace('.', ',') + ' R_zon'.replace('_zon', 'zon'), px(labT), py(yl) - 3); }
    }
    c.restore();
  }

  /* sterren */
  const n = state.nVis;
  const faint = state.ds === 'zon';                      // bij 'De zon door de tijd' zijn de sterren alleen achtergrond
  const s = faint ? 2 : (n < 100 ? 7 : n < 600 ? 5 : n < 6000 ? 3 : 2);
  c.globalAlpha = faint ? 0.26 : 0.9;                    // achtergrond: zelfde posities, één rustige kleur, zwakker
  if (faint) c.fillStyle = '#a9b8e0';
  let last = -1;
  for (let i = 0; i < n; i++) {
    if (!faint) {
      const ci = colorIdx[i];
      if (ci !== last) { c.fillStyle = palette[ci]; last = ci; }
    }
    c.fillRect(px(LT[i]) - s / 2, py(LL[i]) - s / 2, s, s);
  }
  c.globalAlpha = 1;

  /* zon */
  if (!faint) {
    const x = px(LOGTSUN), y = py(0);
    c.strokeStyle = '#ffd34d'; c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#ffd34d'; c.font = '600 12px "Space Grotesk",system-ui,sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.lineWidth = 4; c.strokeStyle = '#070b16'; c.lineJoin = 'round'; c.strokeText('Zon', x + 12, y);
    c.fillText('Zon', x + 12, y);
  }
}

function render() {
  if (dirty) { renderBase(); dirty = false; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(base, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state.ds === 'zon') { drawZon(); return; }
  const sel = state.sel;
  if (sel) {
    const x0 = px(sel.x1), x1 = px(sel.x0), y0 = py(sel.y1), y1 = py(sel.y0);
    ctx.fillStyle = 'rgba(108,198,255,.10)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = '#6cc6ff'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.setLineDash([]);
  }
  if (state.hover >= 0) {
    const i = state.hover;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(px(LT[i]), py(LL[i]), 8, 0, Math.PI * 2); ctx.stroke();
  }
}
function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }

/* ---------- statistiek ---------- */
function updateStats() {
  const n = state.nVis;
  if (hasDist) {
    const d = state.dist;
    $('distVal').textContent = d;
    document.querySelectorAll('#presets button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.d === d)));
  }
  const s = state.sel;
  if (!s) { ['sCount','sShare','sDens','sT','sL'].forEach(k => $(k).textContent = '–'); return; }
  let cnt = 0;
  for (let i = 0; i < n; i++) if (LT[i] >= s.x0 && LT[i] <= s.x1 && LL[i] >= s.y0 && LL[i] <= s.y1) cnt++;
  $('sCount').textContent = cnt.toLocaleString('nl-NL');
  $('sShare').textContent = n ? fmt(cnt / n * 100, 1) + ' %' : '–';
  if (hasDist) $('sDens').textContent = fmtSci(cnt / volume(state.dist));
  $('sT').textContent = fmt(s.x0, 2) + ' tot ' + fmt(s.x1, 2);
  $('sL').textContent = fmt(s.y0, 2) + ' tot ' + fmt(s.y1, 2);
}

/* ---------- dichtheidsgrafiek (alleen hr2) ---------- */
const dc = $('dens'), dctx = dc.getContext('2d');
const DSTEPS = []; for (let d = 20; d <= 1000; d += 10) DSTEPS.push(d);
const DVALS = DSTEPS.map(d => countIn(D2, d) / volume(d));
function drawDens() {
  const w = dc.clientWidth, h = dc.clientHeight, r = window.devicePixelRatio || 1;
  if (!w || !h) return;
  dc.width = Math.round(w * r); dc.height = Math.round(h * r);
  const c = dctx; c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, w, h);
  const L = 50, R = 8, Tp = 6, B = 22;
  const logs = DVALS.map(v => Math.log10(v));
  const lo = Math.floor(Math.min(...logs)), hi = Math.ceil(Math.max(...logs));
  const X = d => L + d / 1000 * (w - L - R);
  const Y = v => Tp + (hi - v) / (hi - lo) * (h - Tp - B);
  c.font = '11px "Space Grotesk",system-ui,sans-serif'; c.lineWidth = 1;
  c.fillStyle = '#97a3c7'; c.textAlign = 'right'; c.textBaseline = 'middle';
  for (let k = lo; k <= hi; k++) {
    c.strokeStyle = '#1d2748'; c.beginPath(); c.moveTo(L, Y(k)); c.lineTo(w - R, Y(k)); c.stroke();
    c.fillText('10' + sup(k), L - 5, Y(k));
  }
  c.textAlign = 'center'; c.textBaseline = 'top';
  for (const d of [0, 250, 500, 750, 1000]) c.fillText(d, X(d), h - B + 5);
  c.strokeStyle = '#26315a'; c.strokeRect(L, Tp, w - L - R, h - Tp - B);
  c.strokeStyle = '#6cc6ff'; c.lineWidth = 2; c.beginPath();
  DSTEPS.forEach((d, i) => { const x = X(d), y = Y(logs[i]); i ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.stroke();
  const d = Math.max(state.dist, 20), v = countIn(D2, d) / volume(d);
  c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(X(d), Y(Math.log10(v)), 4.5, 0, Math.PI * 2); c.fill();
}


/* ---------- Sterren door de tijd ---------- */
const ZRS = 5774;                        // zonnetemperatuur in de modellen (K)
const AU_IN_RSUN = 215.03;               // 1 AE in zonsstralen
const TWD = 1.77e-4;                     // (R/R_zon)^2 van een witte dwerg van ca. 0,55 M_zon (R ≈ 0,0133 R_zon)
const ZCOL = { 1: '#ffd34d', 3: '#6cc6ff', 5: '#7be3a0', 15: '#ff7ab6' };
const ZMASSES = [1, 3, 5, 15];
const PHNAME = { ms: 'hoofdreeks', sub: 'subreus', rgb: 'rode reus', flash: 'heliumflits', hb: 'heliumverbr.', agb: 'AGB', pagb: '→ witte dwerg', wd: 'witte dwerg', cross: '→ reus', heb: 'heliumverbr.', jump: '→ witte dwerg', sn: 'supernova' };
const FASTPH = new Set(['flash', 'pagb', 'cross', 'jump']);
const SSEPH = ['ms', 'cross', 'heb', 'agb', 'jump', 'wd', 'sn'];
const LOGMAX = Math.log10(25000);        // gezamenlijke klok: 1 miljoen tot 25 miljard jaar

const rOf = (lt, lp) => Math.sqrt(Math.pow(10, lp)) / Math.pow(Math.pow(10, lt) / ZRS, 2);

/* --- de zon: ronde punten uit tabel 1 van Schröder & Smith (2008), tussen de punten schematisch --- */
function wp(s, ageGyr, Tk, P, extra) { return Object.assign({ s, age: ageGyr * 1000, lt: Math.log10(Tk), lp: Math.log10(P) }, extra || {}); }
const ZA = [
  wp(0,    0.00,  5596, 0.70, { info: { name: 'Begin hoofdreeks', T: 5596, P: 0.70, R: 0.89, M: 1.000 }, lab: ['begin', -10, 4, 'right'] }),
  wp(.165, 4.58,  5774, 1.00, { info: { name: 'Nu', T: 5774, P: 1.00, R: 1.00, M: 1.000 }, lab: ['nu', 12, 13, 'left'] }),
  wp(.257, 7.13,  5820, 1.26, { info: { name: 'Heetste punt op de hoofdreeks', T: 5820, P: 1.26, R: 1.11, M: 1.000 } }),
  wp(.36,  10.00, 5751, 1.84, { info: { name: 'Einde hoofdreeks', T: 5751, P: 1.84, R: 1.37, M: 1.000 }, lab: ['einde hoofdreeks', 12, -8, 'left'] }),
  wp(.41, 10.70, 5250, 2.3), wp(.45, 11.30, 4800, 3.2), wp(.48, 11.60, 4650, 6), wp(.51, 11.80, 4500, 20),
  wp(.54, 11.95, 4250, 100), wp(.57, 12.05, 3900, 500), wp(.595, 12.12, 3500, 1500), wp(.61, 12.15, 3000, 2400),
  wp(.62, 12.17, 2602, 2730, { info: { name: 'Top van de rode reuzentak', T: 2602, P: 2730, R: 256, M: 0.668 }, lab: ['top rode reus', 0, -15, 'center'] })
];
const ZB = [
  wp(.64, 12.17, 4667, 53.7, { info: { name: 'Start heliumverbranding', T: 4667, P: 53.7, R: 11.2, M: 0.668 }, lab: ['heliumverbranding', 12, 4, 'left'] }),
  wp(.68, 12.23, 4800, 58), wp(.71, 12.27, 4200, 300), wp(.725, 12.29, 3600, 1100),
  wp(.74, 12.30, 3200, 2090, { info: { name: 'Top van de tweede reuzentak (AGB)', T: 3200, P: 2090, R: 149, M: 0.546 }, lab: ['top AGB', -11, 15, 'right'] }),
  wp(.744, 12.30, 6000, 2300), wp(.747, 12.30, 18000, 2500), wp(.75, 12.30, 38000, 2400), wp(.753, 12.30, 58000, 1300), wp(.755, 12.30, 70000, 350), wp(.757, 12.30, 70000, 60), wp(.759, 12.30, 64000, 10)
];
for (let k = 0; k <= 12; k++) {          // witte dwerg: afkoelen met vaste straal; leeftijd volgens een afkoelwet (benadering)
  const Tk = 60000 * Math.pow(5500 / 60000, k / 12);
  ZB.push(wp(.76 + .24 * k / 12, 12.30 + 0.126 * Math.pow(25000 / Tk, 1 / 0.35), Tk, TWD * Math.pow(Tk / ZRS, 4)));
}
function crPoint(p0, p1, p2, p3, t) {     // centripetale Catmull-Rom-spline: het pad loopt exact door alle punten
  const dist = (a, b) => Math.pow(Math.hypot(a[0] - b[0], a[1] - b[1]), 0.5) || 1e-6;
  const t1 = dist(p0, p1), t2 = t1 + dist(p1, p2), t3 = t2 + dist(p2, p3), tt = t1 + (t2 - t1) * t;
  const lin = (a, b, ta, tb) => [((tb - tt) * a[0] + (tt - ta) * b[0]) / (tb - ta), ((tb - tt) * a[1] + (tt - ta) * b[1]) / (tb - ta)];
  const A1 = lin(p0, p1, 0, t1), A2 = lin(p1, p2, t1, t2), A3 = lin(p2, p3, t2, t3);
  return lin(lin(A1, A2, 0, t2), lin(A2, A3, t1, t3), t1, t2);
}
function smoothPath(L, out) {
  const P = L.map(w => [w.lt * 7, w.lp]);
  const n = L.length;
  const at = i => i < 0 ? [2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1]] : i >= n ? [2 * P[n - 1][0] - P[n - 2][0], 2 * P[n - 1][1] - P[n - 2][1]] : P[i];
  out.push({ s: L[0].s, age: L[0].age, lt: L[0].lt, lp: L[0].lp });
  for (let i = 0; i < n - 1; i++) {
    for (let k = 1; k <= 10; k++) {
      const t = k / 10, q = crPoint(at(i - 1), P[i], P[i + 1], at(i + 2), t);
      out.push({ s: L[i].s + (L[i + 1].s - L[i].s) * t, age: L[i].age + (L[i + 1].age - L[i].age) * t, lt: q[0] / 7, lp: q[1] });
    }
  }
}
const SUN = [];
smoothPath(ZA, SUN);
for (let k = 1; k <= 7; k++) {            // de heliumflits: een snelle sprong
  const t = k / 8, a = ZA[ZA.length - 1], b = ZB[0];
  SUN.push({ s: a.s + (b.s - a.s) * t, age: 12170, lt: a.lt + (b.lt - a.lt) * t, lp: a.lp + (b.lp - a.lp) * t });
}
smoothPath(ZB, SUN);
function sunPh(s) {
  const e = 1e-9;
  if (s < .36 - e) return 'ms'; if (s < .45 - e) return 'sub'; if (s <= .62 + e) return 'rgb'; if (s < .64 - e) return 'flash';
  if (s <= .68 + e) return 'hb'; if (s <= .74 + e) return 'agb'; if (s < .76 - e) return 'pagb'; return 'wd';
}
const SUNM = [[0, 1], [11000, 1], [11600, .995], [11950, .96], [12100, .85], [12150, .76], [12170, .668], [12230, .66], [12270, .62], [12290, .58], [12300, .546], [40000, .546]];
function sunMass(a) { for (let i = 1; i < SUNM.length; i++) if (a <= SUNM[i][0]) { const [a0, m0] = SUNM[i - 1], [a1, m1] = SUNM[i]; return a1 > a0 ? m0 + (m1 - m0) * (a - a0) / (a1 - a0) : m1; } return .546; }
SUN.forEach(q => { q.ph = sunPh(q.s); q.m = sunMass(q.age); q.dash = FASTPH.has(q.ph); });

/* --- alle sporen in één vorm --- */
const LABPOS = { 'begin': ['begin', -10, -8, 'right'], 'einde hoofdreeks': ['einde hoofdreeks', 12, -8, 'left'], 'heliumverbranding': ['heliumverbranding', 12, 8, 'left'], 'top AGB': ['top AGB', -12, -10, 'right'], 'witte dwerg': ['witte dwerg', 12, -6, 'left'], 'supernova': ['supernova', 12, -6, 'left'] };
const MARKNAME = { 'begin': 'Begin hoofdreeks', 'einde hoofdreeks': 'Einde hoofdreeks', 'heliumverbranding': 'Start heliumverbranding', 'top AGB': 'Top van de AGB', 'witte dwerg': 'Witte dwerg gevormd', 'supernova': 'Supernova' };
const TR = {};
TR[1] = {
  id: 1, color: ZCOL[1], S: SUN, end: 'wd', fast: [[.62, .64], [.74, .76]], meta: {},
  marks: ZA.concat(ZB).filter(w => w.info).map(w => ({ s: w.s, age: w.age, lt: w.lt, lp: w.lp, lab: w.lab, info: w.info })),
  jumps: [['Nu', .165], ['Einde hoofdreeks', .36], ['Top rode reus', .62], ['Heliumverbranding', .64], ['Witte dwerg', .9]]
};
for (const key of Object.keys(SSE_RAW)) {
  const raw = SSE_RAW[key], id = +key;
  const S = raw.samples.map(a => { const ph = SSEPH[a[5]]; return { s: a[0], age: a[1], lt: a[2], lp: a[3], m: a[4], ph, dash: FASTPH.has(ph) }; });
  const marks = raw.marks.map(([i, name]) => {
    const q = S[i];
    return { s: q.s, age: q.age, lt: q.lt, lp: q.lp, lab: LABPOS[name], info: { name: MARKNAME[name], T: Math.pow(10, q.lt), P: Math.pow(10, q.lp), R: rOf(q.lt, q.lp), M: q.m } };
  });
  const sn = raw.meta.end === 'sn';
  if (sn) { marks.forEach(m => { if (m.lab[0] === 'heliumverbranding') m.lab = ['heliumverbranding', 0, 16, 'center']; if (m.lab[0] === 'supernova') m.lab = ['supernova', 0, -14, 'center']; }); }
  const jumps = [['Begin', 0], ['Einde hoofdreeks', .35], ['Heliumverbranding', .37], [sn ? 'Supernova' : 'Top AGB', sn ? .9 : marks.find(m => m.lab[0] === 'top AGB').s]];
  if (!sn) jumps.push(['Witte dwerg', .9]);
  TR[id] = { id, color: ZCOL[id], S, marks, end: raw.meta.end, fast: sn ? [[.35, .37]] : [[.35, .37], [.72, .74]], meta: raw.meta, jumps };
}

/* --- opzoeken van een toestand --- */
function trackAt(tr, s) {                 // op schuifstand s (één ster)
  const S = tr.S; let ended = false;
  for (const [a, b] of tr.fast) if (s > a && s < b) s = s < (a + b) / 2 ? a : b;           // niet door snelle fasen heen glijden
  const last = S[S.length - 1];
  if (s > last.s) { s = last.s; if (tr.end === 'sn') ended = true; }
  let lo = 0, hi = S.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m].s <= s) lo = m; else hi = m; }
  const a = S[lo], b = S[hi], f = b.s > a.s ? clamp((s - a.s) / (b.s - a.s), 0, 1) : 0;
  return { i: lo, lt: a.lt + (b.lt - a.lt) * f, lp: a.lp + (b.lp - a.lp) * f, age: a.age + (b.age - a.age) * f, m: a.m + (b.m - a.m) * f, ph: a.ph, ended };
}
function stateAtAge(tr, t) {              // op leeftijd t in miljoen jaar (vergelijken)
  const S = tr.S, last = S[S.length - 1];
  if (t <= S[0].age) return { i: 0, lt: S[0].lt, lp: S[0].lp, m: S[0].m, ph: S[0].ph, ended: false };
  if (t >= last.age) return { i: S.length - 1, lt: last.lt, lp: last.lp, m: last.m, ph: last.ph, ended: tr.end === 'sn' };
  let lo = 0, hi = S.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m].age <= t) lo = m; else hi = m; }
  if (S[hi].age <= t) lo = hi;
  const a = S[lo], b = S[Math.min(lo + 1, S.length - 1)], f = b.age > a.age ? clamp((t - a.age) / (b.age - a.age), 0, 1) : 0;
  return { i: lo, lt: a.lt + (b.lt - a.lt) * f, lp: a.lp + (b.lp - a.lp) * f, m: a.m + (b.m - a.m) * f, ph: a.ph, ended: false };
}
const cmpAge = () => Math.pow(10, state.zc * LOGMAX);

/* --- tekenen --- */
const rgbOf = lt => { const c = tempColor(lt); return `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`; };
function strokePts(c, pts, color, width) {
  let i = 0;
  while (i < pts.length - 1) {
    const d = pts[i].dash || pts[i + 1].dash;
    let j = i + 1;
    while (j < pts.length - 1 && (pts[j].dash || pts[j + 1].dash) === d) j++;
    c.beginPath(); c.moveTo(px(pts[i].lt), py(pts[i].lp));
    for (let k = i + 1; k <= j; k++) c.lineTo(px(pts[k].lt), py(pts[k].lp));
    c.setLineDash(d ? [5, 5] : []); c.strokeStyle = color; c.lineWidth = width; c.lineJoin = 'round'; c.stroke();
    i = j;
  }
  c.setLineDash([]);
}
function haloText(c, txt, x, y, color) { c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = '#070b16'; c.strokeText(txt, x, y); c.fillStyle = color; c.fillText(txt, x, y); }
function dotPos(lt, lp) {                  // een punt buiten het diagram schuift naar de rand
  let x = px(lt), y = py(lp), off = false;
  const x0 = PL + 7, x1 = W - PR - 7, y0 = PT + 7, y1 = H - PB - 7;
  if (x < x0) { x = x0; off = true; } if (x > x1) { x = x1; off = true; }
  if (y < y0) { y = y0; off = true; } if (y > y1) { y = y1; off = true; }
  return { x, y, off };
}
function drawDot(c, lt, lp, fill, label) {
  const d = dotPos(lt, lp);
  c.beginPath(); c.arc(d.x, d.y, 8, 0, Math.PI * 2);
  if (d.off) { c.fillStyle = 'rgba(7,11,22,.85)'; c.fill(); c.setLineDash([3, 3]); c.strokeStyle = fill; c.lineWidth = 2; c.stroke(); c.setLineDash([]); }
  else { c.fillStyle = fill; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke(); }
  c.font = '12px "Space Grotesk",system-ui,sans-serif'; c.textBaseline = 'middle';
  if (label) {
    const onRight = d.x > W / 2;
    c.textAlign = onRight ? 'right' : 'left';
    haloText(c, label, d.x + (onRight ? -12 : 12), d.y - (d.y > H - PB - 20 ? 14 : 0), fill === '#ffffff' ? '#ffffff' : '#e8ecf7');
  }
}
function clipPlot(c) { c.save(); c.beginPath(); c.rect(PL, PT, W - PL - PR, H - PT - PB); c.clip(); }

function drawSingle() {
  const c = ctx, tr = TR[state.zm], cur = trackAt(tr, state.zs), S = tr.S;
  const nxt = S[Math.min(cur.i + 1, S.length - 1)];
  const dot = { lt: cur.lt, lp: cur.lp, dash: nxt.dash };
  clipPlot(c);
  strokePts(c, [dot].concat(S.slice(cur.i + 1)), 'rgba(151,163,199,.6)', 1.6);       // nog te komen
  strokePts(c, S.slice(0, cur.i + 1).concat([dot]), '#e8ecf7', 2.6);                 // al afgelegd
  c.restore();
  c.font = '12px "Space Grotesk",system-ui,sans-serif'; c.textBaseline = 'middle';
  for (const m of tr.marks) {
    const x = px(m.lt), y = py(m.lp), passed = m.s <= state.zs + 1e-9;
    if (x < PL || x > W - PR || y < PT || y > H - PB) continue;
    c.beginPath(); c.arc(x, y, 4.5, 0, Math.PI * 2);
    c.fillStyle = passed ? '#ffd34d' : '#070b16'; c.fill();
    c.strokeStyle = passed ? '#ffd34d' : '#97a3c7'; c.lineWidth = 1.5; c.stroke();
    if (m.lab) {
      const tw = c.measureText(m.lab[0]).width; let dx = m.lab[1], al = m.lab[3];
      if (al === 'left' && x + dx + tw > W - PR - 4) { al = 'right'; dx = -Math.abs(dx); }
      else if (al === 'right' && x + dx - tw < PL + 4) { al = 'left'; dx = Math.abs(dx); }
      c.textAlign = al; haloText(c, m.lab[0], x + dx, y + m.lab[2], '#c3cce8');
    }
  }
  if (cur.ended) {                                     // supernova: het spoor is op en er is geen ster meer
    const last = S[S.length - 1], x = px(last.lt), y = py(last.lp);
    c.strokeStyle = '#ff7ab6'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(x - 7, y - 7); c.lineTo(x + 7, y + 7); c.moveTo(x + 7, y - 7); c.lineTo(x - 7, y + 7); c.stroke();
    nsArrow(c);
  } else {
    drawDot(c, cur.lt, cur.lp, rgbOf(cur.lt), dotPos(cur.lt, cur.lp).off ? 'buiten beeld' : '');
  }
}
function nsArrow(c) {                                  // waar een neutronenster zou staan (links buiten beeld)
  const y = py(-0.7), x = PL + 4;
  c.fillStyle = '#ff7ab6'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10, y - 6); c.lineTo(x + 10, y + 6); c.closePath(); c.fill();
  c.font = '12px "Space Grotesk",system-ui,sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
  haloText(c, 'neutronenster (buiten beeld)', x + 16, y, '#ff7ab6');
}
function drawCompare() {
  const c = ctx, t = cmpAge();
  let showNS = false;
  for (const id of state.zsel) {
    const tr = TR[id], st = stateAtAge(tr, t), S = tr.S, nxt = S[Math.min(st.i + 1, S.length - 1)];
    const dot = { lt: st.lt, lp: st.lp, dash: nxt.dash };
    clipPlot(c);
    strokePts(c, [dot].concat(S.slice(st.i + 1)), tr.color + '40', 1.3);
    strokePts(c, S.slice(0, st.i + 1).concat([dot]), tr.color, 2.6);
    c.restore();
    if (st.ended) {
      const last = S[S.length - 1], x = px(last.lt), y = py(last.lp);
      c.strokeStyle = tr.color; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(x - 7, y - 7); c.lineTo(x + 7, y + 7); c.moveTo(x + 7, y - 7); c.lineTo(x - 7, y + 7); c.stroke();
      c.font = '600 12px "Space Grotesk",system-ui,sans-serif'; c.textBaseline = 'middle';
      const rt = x > W - PR - 150; c.textAlign = rt ? 'right' : 'left';
      haloText(c, tr.id + ' Mzon: supernova', x + (rt ? -12 : 12), y - 12, tr.color);
      showNS = true;
    } else {
      const d = dotPos(st.lt, st.lp);
      c.beginPath(); c.arc(d.x, d.y, 7, 0, Math.PI * 2);
      if (d.off) { c.fillStyle = 'rgba(7,11,22,.85)'; c.fill(); c.setLineDash([3, 3]); c.strokeStyle = tr.color; c.lineWidth = 2; c.stroke(); c.setLineDash([]); }
      else { c.fillStyle = tr.color; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke(); }
      c.font = '600 12px "Space Grotesk",system-ui,sans-serif'; c.textBaseline = 'middle';
      const right = d.x > W - PR - 110;
      c.textAlign = right ? 'right' : 'left';
      haloText(c, tr.id + ' Mzon' + (d.off ? ' (buiten beeld)' : ''), d.x + (right ? -12 : 12), d.y - 10, tr.color);
    }
  }
  if (showNS) nsArrow(c);
}
function drawZon() { if (state.zcmp) drawCompare(); else drawSingle(); }

/* --- grootte van de ster --- */
const zc = $('zSize'), zctx = zc.getContext('2d');
const ZCAP = {
  log: 'Logaritmische schaal: elke grijze ring is 10 keer zo groot als de vorige (0,1, 1, 10 en 100 R<sub>zon</sub>). Zo passen een witte dwerg en een rode reus in één plaatje, maar de verhoudingen zijn niet op schaal. De blauwe stippellijn is de baan van de aarde (215 R<sub>zon</sub>).',
  ware: 'Op ware schaal, met de baan van de aarde (1 AE ≈ 215 R<sub>zon</sub>) als vaste maatstaf. De zon nu is maar een stipje; kleine sterren zijn te klein om te tekenen.'
};
function drawSize(Tk, R, what) {
  const w = zc.clientWidth, h = zc.clientHeight, r = window.devicePixelRatio || 1;
  if (!w || !h) return;
  zc.width = Math.round(w * r); zc.height = Math.round(h * r);
  const c = zctx; c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, w, h);
  $('zCap').innerHTML = ZCAP[state.zsc];
  c.font = '11px "Space Grotesk",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const cx = w / 2, cy = h / 2;
  const col = rgbOf(Math.log10(Tk));
  const ring = (rp, color, dash, width) => { c.beginPath(); c.arc(cx, cy, rp, 0, Math.PI * 2); c.setLineDash(dash || []); c.strokeStyle = color; c.lineWidth = width || 1; c.stroke(); c.setLineDash([]); };
  const disc = rp => { c.beginPath(); c.arc(cx, cy, Math.max(rp, 1.3), 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.stroke(); };
  const label = (s, x, y, color) => { c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = 'rgba(7,11,22,.9)'; c.strokeText(s, x, y); c.fillStyle = color; c.fillText(s, x, y); };
  if (state.zsc === 'log') {
    const rad = x => Math.min(18 * (Math.log10(x) + 2.2), h / 2 - 2);
    disc(rad(R));
    [0.1, 1, 10, 100].forEach(v => { ring(rad(v), 'rgba(200,210,235,.6)'); label(v === 0.1 ? '0,1' : String(v), cx, cy - rad(v) - 2, 'rgba(220,228,245,.95)'); });
    ring(rad(AU_IN_RSUN), '#6cc6ff', [4, 4], 1.5);
    label('baan aarde', cx, cy + rad(AU_IN_RSUN) + 12, '#6cc6ff');
    if (R < 0.001) label((what ? what + ': ' : '') + 'te klein om te tekenen', cx, cy - 12, 'rgba(220,228,245,.95)');
  } else {
    const ro = Math.min(w, h) / 2 - 20, rp = x => x / AU_IN_RSUN * ro;                // de baan van de aarde is altijd even groot
    disc(rp(R));
    ring(ro, '#6cc6ff', [4, 4], 1.5);
    label('baan aarde (1 AE)', cx, cy + ro + 13, '#6cc6ff');
    if (rp(R) < 1.3) label((what ? what + ': ' : '') + 'te klein om te tekenen', cx, cy - 12, 'rgba(220,228,245,.95)');
    else if (rp(R) > h / 2) label('past niet in beeld: ' + fmt(R / AU_IN_RSUN, 1) + ' AE', cx, 14, '#ffffff');
  }
}

/* --- teksten per fase --- */
function fmtDur(Myr) {
  if (Myr < 1) return 'ruwweg ' + (Math.round(Myr * 1000) * 1000).toLocaleString('nl-NL') + ' jaar';
  return 'ruwweg ' + fmt(Myr, Myr < 10 ? 1 : 0) + ' miljoen jaar';
}
function sunText(s) {
  switch (sunPh(s)) {
    case 'ms': return '<b>Hoofdreeks.</b> In de kern wordt waterstof omgezet in helium. De zon wordt heel langzaam helderder. Een zwaardere ster maakt aan het einde van de hoofdreeks een kleine haak (even heter en helderder). De zon niet: zijn kern is niet convectief en de waterstof raakt geleidelijk op.';
    case 'sub': return '<b>Subreus.</b> De waterstof in de kern is op; de fusie schuift naar een schil om de kern.';
    case 'rgb': return '<b>Rode reus.</b> De buitenlagen zwellen op en koelen af: grote straal, lage temperatuur, groot vermogen.';
    case 'flash': return '<b>Heliumflits.</b> De kern ontsteekt helium. Dit gaat veel sneller dan de schuif kan laten zien: de zon springt over de stippellijn naar de horizontale tak.';
    case 'hb': return '<b>Horizontale tak.</b> In de kern wordt helium omgezet in koolstof en zuurstof.';
    case 'agb': return '<b>Tweede reuzenfase (AGB).</b> De zon zwelt opnieuw op en verliest massa.';
    case 'pagb': return '<b>Overgang naar witte dwerg.</b> De buitenlagen worden afgestoten en de hete kern blijft over. Dit duurt ruwweg tienduizend jaar, een fractie van wat de schuif kan laten zien. De zon springt daarom over de stippellijn.';
    default: return '<b>Witte dwerg.</b> Er is geen kernfusie meer. De zon is zo groot als de aarde en koelt langzaam af.';
  }
}
function sseText(tr, s, cur) {
  const M = tr.id, e = tr.end === 'sn';
  if (cur.ended) return '<b>Supernova en neutronenster.</b> Als rode superreus stort de kern in en explodeert de ster. Er blijft een neutronenster over: nog steeds een ster, maar met een straal van maar ongeveer 10 km en een temperatuur van ongeveer 10<sup>6</sup> K. Hij is te klein om te tekenen en zou links buiten beeld liggen, bij log P ≈ −0,7. De waarden hieronder zijn schattingen voor een jonge neutronenster.';
  if (s < .35) return '<b>Hoofdreeks.</b> In de kern wordt waterstof omgezet in helium. Een ster van ' + M + ' M<sub>zon</sub> is veel heter en helderder dan de zon en leeft daarom veel korter: ongeveer ' + (tr.meta.tTAMS >= 1000 ? fmt(tr.meta.tTAMS / 1000, 2) + ' miljard jaar' : fmt(tr.meta.tTAMS, 0) + ' miljoen jaar') + '. Aan het einde van de hoofdreeks maakt het spoor een kleine haak: de kern is waterstofarm, de ster krimpt even in zijn geheel en wordt kort heter en helderder.';
  if (s < .37) return '<b>Snelle oversteek.</b> Na de hoofdreeks zwelt de ster in ' + fmtDur(tr.meta.tHe - tr.meta.tTAMS) + ' op tot reus. Daarom staan er bijna geen sterren tussen de hoofdreeks en de reuzentak. De ster springt hier over de stippellijn.';
  if (s < (e ? .72 + 1e-9 : .60)) return e
    ? '<b>Heliumverbranding.</b> De ster is een rode superreus, net als Betelgeuze. In de kern wordt helium omgezet in koolstof en zuurstof. Let op: dit rekenmodel overschat het massaverlies van zeer zware sterren, de massa hier is dus een ondergrens.'
    : '<b>Heliumverbranding.</b> In de kern wordt helium omgezet in koolstof en zuurstof. Bij deze massa begint dat rustig, zonder heliumflits. Het spoor maakt een kleine lus: eerst wordt de ster zwakker en heter, daarna weer helderder en koeler. De grootte van die lus hangt in gedetailleerde modellen sterk af van de aannames; dit snelle rekenmodel vereenvoudigt hem.';
  if (s <= .72) return '<b>Tweede reuzenfase (AGB).</b> De ster zwelt opnieuw op en verliest veel massa. Aan het einde is hij het koelst; dan blaast hij zijn buitenlagen weg en warmt hij op bij ongeveer gelijk vermogen (de stippellijn naar links).';
  if (s < .74) return '<b>Overgang naar witte dwerg.</b> De buitenlagen worden afgestoten en de hete kern blijft over. Dit gaat veel sneller dan de schuif kan laten zien, dus de ster springt over de stippellijn. (Dit rekenmodel werkt de tussenfase niet uit.)';
  return '<b>Witte dwerg.</b> Er is geen kernfusie meer. De restmassa is ' + fmt(cur.m, 2) + ' M<sub>zon</sub>: de rest is de ruimte in geblazen. De ster koelt langzaam af.';
}

/* --- uitlezing en bediening --- */
const nfT = Tk => Math.round(Tk).toLocaleString('nl-NL');
const nfR = R => R < 0.1 ? fmt(R, 3) : R < 10 ? fmt(R, 2) : fmt(R, 0);
function setAge(ageMyr, sunStyle) {
  if (sunStyle || ageMyr >= 1000) { $('zAge').textContent = fmt(ageMyr / 1000, 2); $('zUnit').textContent = 'miljard jaar'; }
  else { $('zAge').textContent = fmt(ageMyr, ageMyr < 10 ? 1 : 0); $('zUnit').textContent = 'miljoen jaar'; }
}
function updateSingle() {
  const tr = TR[state.zm], cur = trackAt(tr, state.zs);
  const Tk = Math.pow(10, cur.lt), P = Math.pow(10, cur.lp), R = rOf(cur.lt, cur.lp);
  setAge(cur.age, tr.id === 1);
  if (cur.ended) {
    $('zAge').textContent = fmt(tr.S[tr.S.length - 1].age, 1); $('zUnit').textContent = 'miljoen jaar';
    $('zT').textContent = '≈ 10⁶ K'; $('zP').textContent = '≈ 0,2'; $('zR').textContent = '≈ 10 km (1,4·10⁻⁵)'; $('zM').textContent = '≈ 1,4 tot 1,6';
    $('zPhase').innerHTML = sseText(tr, state.zs, cur);
    drawSize(1e6, 1.4e-5, 'neutronenster'); return;
  }
  $('zT').textContent = nfT(Tk) + ' K';
  $('zP').textContent = fmtP(P);
  $('zR').textContent = nfR(R) + (R > 50 ? ' (' + fmt(R / AU_IN_RSUN, 1) + ' × afstand aarde–zon)' : '');
  $('zM').textContent = (tr.id === 1 && cur.age > 10000 && cur.age < 12300 ? '≈ ' : '') + fmt(cur.m, 2);
  $('zPhase').innerHTML = tr.id === 1 ? sunText(state.zs) : sseText(tr, state.zs, cur);
  drawSize(Tk, R);
}
function updateCompare() {
  const age = cmpAge();
  if (age >= 1000) { $('zAge').textContent = fmt(age / 1000, 2); $('zUnit').textContent = 'miljard jaar'; }
  else { $('zAge').textContent = fmt(age, age < 10 ? 1 : 0); $('zUnit').textContent = 'miljoen jaar'; }
  const body = $('zTabBody'); body.innerHTML = '';
  for (const id of state.zsel) {
    const tr = TR[id], st = stateAtAge(tr, age), tre = document.createElement('tr');
    const cells = st.ended
      ? ['neutronenster', '≈ 10⁶', '≈ 0,2', '1,4·10⁻⁵', '≈ 1,5']
      : [PHNAME[st.ph], nfT(Math.pow(10, st.lt)), fmtP(Math.pow(10, st.lp)), nfR(rOf(st.lt, st.lp)), fmt(st.m, 2)];
    tre.innerHTML = '<td style="color:' + tr.color + ';font-weight:600">' + id + '</td>' + cells.map(x => '<td>' + x + '</td>').join('');
    body.appendChild(tre);
  }
}
function buildJumps() {
  const box = $('zJump'); box.innerHTML = '';
  const add = (name, fn) => { const b = document.createElement('button'); b.textContent = name; b.addEventListener('click', fn); box.appendChild(b); };
  if (state.zcmp) {
    [['10 miljoen jaar', 10], ['100 miljoen jaar', 100], ['1 miljard jaar', 1000], ['10 miljard jaar', 10000]].forEach(([name, a]) =>
      add(name, () => { state.zc = Math.log10(a) / LOGMAX; syncZon(); }));
  } else {
    TR[state.zm].jumps.forEach(([name, s]) => add(name, () => { state.zs = s; syncZon(); }));
  }
}
function syncZon() {
  const cmp = state.zcmp;
  document.querySelectorAll('#zMass button').forEach(b => {
    const id = +b.dataset.m;
    b.setAttribute('aria-pressed', String(cmp ? state.zsel.includes(id) : id === state.zm));
  });
  $('zCmp').checked = cmp; $('zCmpHint').hidden = !cmp;
  $('zSizeSec').hidden = cmp; $('zSingle').hidden = cmp; $('zTabWrap').hidden = !cmp;
  $('zH').textContent = cmp ? 'Leeftijd (gezamenlijke klok)' : (state.zm === 1 ? 'Leeftijd van de zon' : 'Leeftijd van de ster');
  $('zSlHint').textContent = cmp ? 'De schuif is logaritmisch: van 1 miljoen tot 25 miljard jaar. Alle sterren hebben dezelfde leeftijd.' : 'De schuif loopt niet gelijkmatig met de tijd. Kijk naar de leeftijd erboven.';
  $('zS').value = Math.round((cmp ? state.zc : state.zs) * 1000);
  document.querySelectorAll('#zScale button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sc === state.zsc)));
  buildJumps();
  updateZon();
}
function updateZon() {
  if (state.zcmp) updateCompare(); else updateSingle();
  schedule();
}
ZMASSES.forEach(m => {
  const b = document.createElement('button');
  b.dataset.m = m; b.textContent = m === 1 ? '1 (de zon)' : String(m); b.style.boxShadow = 'inset 4px 0 0 ' + ZCOL[m];
  b.addEventListener('click', () => {
    if (state.zcmp) {
      const i = state.zsel.indexOf(m);
      if (i >= 0) { if (state.zsel.length > 2) state.zsel.splice(i, 1); } else state.zsel.push(m);
      state.zsel.sort((a, c2) => a - c2);
    } else { state.zm = m; state.zs = m === 1 ? 0.165 : 0; }
    syncZon();
  });
  $('zMass').appendChild(b);
});
$('zCmp').addEventListener('change', e => { state.zcmp = e.target.checked; if (state.zcmp && state.zsel.length < 2) state.zsel = [1, 5]; syncZon(); });
document.querySelectorAll('#zScale button').forEach(b => b.addEventListener('click', () => { state.zsc = b.dataset.sc; syncZon(); }));
$('zS').addEventListener('input', e => { const v = +e.target.value / 1000; if (state.zcmp) state.zc = v; else state.zs = v; updateZon(); });

function placeTip(x, y) {
  tip.style.display = 'block';
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  tip.style.left = (x + 16 + tw > W ? x - 16 - tw : x + 16) + 'px';
  tip.style.top = (y + 16 + th > H ? y - 16 - th : y + 16) + 'px';
}
function hoverMarker(x, y) {
  if (state.zcmp) { tip.style.display = 'none'; return; }
  let best = null, bd = 150;
  for (const m of TR[state.zm].marks) {
    const dx = px(m.lt) - x, dy = py(m.lp) - y, dd = dx * dx + dy * dy;
    if (dd < bd) { bd = dd; best = m; }
  }
  if (!best) { tip.style.display = 'none'; return; }
  const i = best.info, ageTxt = (state.zm === 1 || best.age >= 1000) ? fmt(best.age / 1000, 2) + ' miljard jaar' : fmt(best.age, best.age < 10 ? 1 : 0) + ' miljoen jaar';
  tip.innerHTML = '<b>' + i.name + '</b> · ' + ageTxt + '<br>' +
    'T = ' + nfT(i.T) + ' K · P = ' + fmtP(i.P) + ' P<sub>zon</sub><br>' +
    'R = ' + nfR(i.R) + ' R<sub>zon</sub> · M = ' + fmt(i.M, 3) + ' M<sub>zon</sub>';
  placeTip(x, y);
}

/* ---------- dataset wisselen ---------- */
function loadDataset(key) {
  const s = key === 'zon' ? DS.hr2 : DS[key];       // bij de zon zijn de Hipparcos-sterren alleen de achtergrond
  state.ds = key; state.sel = null; state.hover = -1; $('tip').style.display = 'none';
  ({ XMAX, XMIN, YMIN, YMAX } = AXES[key]);
  N = s.t.length; hasDist = key !== 'zon' && !!s.d;
  T = Float32Array.from(s.t); LL = Float32Array.from(s.l);
  LT = new Float32Array(N); colorIdx = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    LT[i] = Math.log10(T[i]);
    colorIdx[i] = clamp(Math.floor((LT[i] - CMIN) / (CMAX - CMIN) * BUCKETS), 0, BUCKETS - 1);
  }
  D = hasDist ? D2 : null;
  state.dist = 1000; state.nVis = key === 'zon' ? N : (hasDist ? countIn(D2, 1000) : N);
  $('dist').value = 1000;
  document.querySelectorAll('[data-for]').forEach(el => { el.hidden = !el.dataset.for.split(' ').includes(key); });
  document.querySelectorAll('.ds button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ds === key)));
  $('sub').textContent = SUBTEXT[key]; $('foot').textContent = FOOT[key];
  canvas.style.cursor = key === 'zon' ? 'default' : 'crosshair';
  dirty = true; updateStats(); if (hasDist) drawDens(); if (key === 'zon') syncZon(); schedule();
  /* link bijwerken; in sommige omgevingen (bijv. een iframe) mag dit niet, dat is geen probleem */
  try {
    const h = { hr1: 'helderste', hr2: 'buurt', zon: 'zon' }[key];
    if (location.hash !== '#' + h) history.replaceState(null, '', '#' + h);
  } catch (e) { /* negeren */ }
}
document.querySelectorAll('.ds button').forEach(b => b.addEventListener('click', () => loadDataset(b.dataset.ds)));

/* ---------- interactie ---------- */
function setDist(d) {
  state.dist = d; state.nVis = countIn(D2, d);
  $('dist').value = d;
  dirty = true; updateStats(); drawDens(); schedule();
}
$('dist').addEventListener('input', e => setDist(+e.target.value));
[50, 100, 250, 500, 1000].forEach(d => {
  const b = document.createElement('button');
  b.textContent = d + ' lj'; b.dataset.d = d;
  b.addEventListener('click', () => setDist(d));
  $('presets').appendChild(b);
});
$('clear').addEventListener('click', () => { state.sel = null; updateStats(); schedule(); });
$('pG').addEventListener('click', () => { state.sel = {x0: XMIN, x1: 3.7, y0: 1, y1: YMAX}; updateStats(); schedule(); });
$('pWD').addEventListener('click', () => { setDist(50); state.sel = {x0: 3.7, x1: XMAX, y0: YMIN, y1: -1}; updateStats(); schedule(); });

let dragging = false, start = null;
const tip = $('tip');
const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const inPlot = (x, y) => x >= PL && x <= W - PR && y >= PT && y <= H - PB;

canvas.addEventListener('pointerdown', e => {
  if (state.ds === 'zon') return;
  const [x, y] = pos(e);
  if (!inPlot(x, y)) return;
  dragging = true; start = [x, y]; canvas.setPointerCapture(e.pointerId);
  tip.style.display = 'none'; state.hover = -1;
});
canvas.addEventListener('pointermove', e => {
  const [x, y] = pos(e);
  if (state.ds === 'zon') { hoverMarker(x, y); return; }
  if (dragging) {
    const cx = clamp(x, PL, W - PR), cy = clamp(y, PT, H - PB);
    const a = invX(start[0]), b = invX(cx), p = invY(start[1]), q = invY(cy);
    state.sel = {x0: Math.min(a, b), x1: Math.max(a, b), y0: Math.min(p, q), y1: Math.max(p, q)};
    updateStats(); schedule(); return;
  }
  if (e.pointerType === 'touch' || !inPlot(x, y)) { hideHover(); return; }
  let best = -1, bd = 120;
  for (let i = 0; i < state.nVis; i++) {
    const dx = px(LT[i]) - x, dy = py(LL[i]) - y, dd = dx * dx + dy * dy;
    if (dd < bd) { bd = dd; best = i; }
  }
  if (best !== state.hover) { state.hover = best; schedule(); }
  if (best < 0) { tip.style.display = 'none'; return; }
  const t = T[best], p = Math.pow(10, LL[best]), R = Math.sqrt(p) / Math.pow(t / TSUN, 2);
  tip.innerHTML =
    (hasDist ? 'Afstand: ' + fmt(D[best], 1) + ' lj<br>' : '') +
    'T = ' + Math.round(t).toLocaleString('nl-NL') + ' K (log T = ' + fmt(LT[best], 3) + ')<br>' +
    'P = ' + fmtP(p) + ' P<sub>zon</sub> (log P/P<sub>zon</sub> = ' + fmt(LL[best], 2) + ')<br>' +
    'Straal ≈ ' + (R < 0.1 ? fmt(R, 3) : R < 10 ? fmt(R, 2) : fmt(R, 0)) + ' R<sub>zon</sub>';
  tip.style.display = 'block';
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  tip.style.left = (x + 16 + tw > W ? x - 16 - tw : x + 16) + 'px';
  tip.style.top = (y + 16 + th > H ? y - 16 - th : y + 16) + 'px';
});
function hideHover() { if (state.hover !== -1) { state.hover = -1; schedule(); } tip.style.display = 'none'; }
canvas.addEventListener('pointerleave', () => { if (!dragging) hideHover(); });
canvas.addEventListener('pointerup', e => {
  if (!dragging) return;
  dragging = false;
  const [x, y] = pos(e);
  if (Math.abs(x - start[0]) < 4 && Math.abs(y - start[1]) < 4) { state.sel = null; updateStats(); schedule(); }
});

/* ---------- start ---------- */
new ResizeObserver(() => { resize(); if (hasDist) drawDens(); if (state.ds === 'zon') updateZon(); }).observe(stage);
window.addEventListener('resize', () => { if (hasDist) drawDens(); });
loadDataset(location.hash === '#buurt' ? 'hr2' : location.hash === '#zon' ? 'zon' : 'hr1');
resize();
// Canvas-tekst pas goed tekenen als het lettertype van de site geladen is.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { dirty = true; schedule(); if (hasDist) drawDens(); if (state.ds === "zon") updateZon(); });
