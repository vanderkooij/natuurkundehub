// Plaatjes voor de EM-spectrumtool: lijn met kleurvlak (stijl B, gekozen door Jop op 2026-10-12).
// Elke tekening is de binnenkant van een SVG met viewBox 0 0 48 48. Lijnen zijn wit en rond.
//   class="v"  kleurvlak: krijgt de kleur van het gebied (of neutraal bij voorwerpen), met lijn
//   class="d"  donker vlak (uitsparing), met lijn
//   class="w"  klein wit vlak zonder lijn (knopjes, stippen)
//   class="k"  blauwe vlekken, alleen bij de kosmische achtergrond
// Een tekening vervangen: pas alleen de regel bij die naam aan.
const PLAATJES = {
  // ----- Radio -----
  radio:       '<rect class="v" x="6" y="18" width="36" height="22" rx="4"/><circle class="d" cx="17" cy="29" r="6"/><path d="M28 25h9M28 30h9M28 35h6M12 18L34 6"/>',
  oudeRadio:   '<path class="v" d="M8 40V22a16 12 0 0 1 32 0v18z"/><path class="d" d="M14 31a10 8 0 0 1 20 0v3H14z"/><path d="M24 23v11M18 39h12"/>',
  dab:         '<rect class="v" x="6" y="14" width="36" height="24" rx="4"/><rect class="d" x="11" y="19" width="16" height="8" rx="1.5"/><circle cx="34" cy="26" r="4"/><path d="M11 32h16M14 23h6"/>',
  mast:        '<path class="v" d="M24 6l-6 36h12z"/><path d="M20 30h8M21.6 19h4.8M24 6L8 38M24 6l16 32M14 42h20"/>',
  onderzeeer:  '<path class="v" d="M7 30c0-5 6-8 15-8h12c6 0 9 3 9 8s-3 8-9 8H22c-9 0-15-3-15-8z"/><path class="v" d="M24 22v-6h8v6"/><path d="M28 16v-6h4M3 25v10"/><circle class="d" cx="17" cy="30" r="2"/><circle class="d" cx="25" cy="30" r="2"/><circle class="d" cx="33" cy="30" r="2"/>',
  vliegtuig:   '<path class="v" d="M24 4c2 0 3 2 3 5v9l15 8v4l-15-4v9l5 4v3l-8-2-8 2v-3l5-4v-9L6 30v-4l15-8V9c0-3 1-5 3-5z"/>',
  portofoon:   '<rect class="v" x="15" y="14" width="18" height="30" rx="3"/><path d="M19 14V4"/><rect class="d" x="19" y="18" width="10" height="7" rx="1"/><path d="M19 31h10M19 35h10M19 39h10"/>',
  helm:        '<path class="v" d="M7 32c0-11 8-20 17-20s17 9 17 20z"/><path d="M3 32h42M15 32l2 6h14l2-6M18 19c4-1.5 8-1.5 12 0"/>',
  lofar:       '<rect class="v" x="3" y="38" width="42" height="5" rx="1"/><path d="M10 12v26M10 15L4 38M10 15l6 23M24 12v26M24 15l-6 23M24 15l6 23M38 12v26M38 15l-6 23M38 15l6 23"/>',
  satelliet:   '<rect class="v" x="2" y="19" width="13" height="10" rx="1"/><rect class="v" x="33" y="19" width="13" height="10" rx="1"/><rect class="d" x="18" y="15" width="12" height="18" rx="2"/><path d="M15 24h3M30 24h3M8.5 19v10M39.5 19v10M24 33v4M19 41a5 4 0 0 1 10 0"/>',
  telescoop:   '<path class="v" d="M5 17a19 11 0 0 0 38 0z"/><path d="M24 28v8M15 44l9-8 9 8M24 17V6M20 10l4-4 4 4"/>',
  // ----- Microgolven -----
  router:      '<rect class="v" x="6" y="28" width="36" height="12" rx="3"/><circle class="w" cx="14" cy="34" r="1.6"/><circle class="w" cx="20" cy="34" r="1.6"/><path d="M12 28l-2-8M36 28l2-8M17 18a10 10 0 0 1 14 0M12.5 13.5a16 16 0 0 1 23 0M21 22.5a4.5 4.5 0 0 1 6 0"/>',
  magnetron:   '<rect class="v" x="4" y="10" width="40" height="28" rx="3"/><rect class="d" x="9" y="15" width="22" height="18" rx="2"/><path d="M37 16v4M37 26v2M8 38v3M40 38v3"/>',
  mobiel:      '<rect class="v" x="13" y="4" width="22" height="40" rx="4"/><rect class="d" x="16.5" y="9" width="15" height="26" rx="1"/><path d="M21 39.5h6"/>',
  schotel:     '<path class="v" d="M10 12a22 22 0 0 0 26 26z"/><path d="M23 25l10-10M33 15l3-3M18 33l-4 9h14"/>',
  flitspaal:   '<rect class="v" x="12" y="6" width="22" height="15" rx="2"/><circle class="d" cx="19" cy="13.5" r="4"/><path d="M27 11h3M23 21v21M16 42h14M38 9l6-3M38 14h7M38 19l6 3"/>',
  // Kosmische achtergrond: de bekende ovale hemelkaart, met blauwe en oranje vlekken.
  kosmos:      '<ellipse class="v" cx="24" cy="24" rx="21.5" ry="12"/><g class="k"><path d="M8 22c2-2 5-1 5 1s-3 3-5 2-1-2 0-3z"/><path d="M16 15c3-1.5 6 0 5.5 2s-4 2.5-6 1 0-2.5.5-3z"/><path d="M29 16c2-2 6-1.5 6 1.5s-3 4-6 2-1.5-2.5 0-3.5z"/><path d="M13 27c2-1.5 5.5 0 5 2.5s-4.5 3-6 1 0-2.5 1-3.5z"/><path d="M24 23c3-2 7.5 0 6.5 3.5s-5.5 3-7.5 1 0-3.5 1-4.5z"/><path d="M36 25c2-1 4.5 1 3.5 3.5s-4 1.5-3.5-3.5z"/><path d="M21 32c2-1 5 0 4.5 1.5s-3.5 2-4.5-1.5z"/><path d="M38 18c1.5-1 3 .5 2.5 2s-3 .5-2.5-2z"/><path d="M6 27.5c1-1 2.5 0 2 1.5s-2 .5-2-1.5z"/><path d="M26 11.5c1.5-.5 3 .5 2.5 1.5s-3 .5-2.5-1.5z"/></g><g class="w"><circle cx="19" cy="22" r="1"/><circle cx="33" cy="29" r="1"/><circle cx="11" cy="18.5" r=".9"/><circle cx="31" cy="21.5" r=".9"/><circle cx="17" cy="33" r=".9"/></g><ellipse cx="24" cy="24" rx="21.5" ry="12"/>',
  // ----- Infrarood -----
  lichaam:     '<circle class="v" cx="21" cy="9" r="5"/><path class="v" d="M12 18h18l-2 13h-3l-1 13h-6l-1-13h-3z"/><path d="M36 14c2 2.5 2 5 0 7.5s-2 5 0 7.5M42 12c2 2.5 2 5 0 7.5s-2 5 0 7.5"/>',
  warmtecamera:'<rect class="v" x="4" y="12" width="32" height="20" rx="3"/><circle class="d" cx="17" cy="22" r="6"/><path d="M36 17l8-4v18l-8-4M11 32l-2 11h8l2-11"/><circle class="w" cx="29" cy="17" r="1.6"/>',
  glasvezel:   '<path d="M3 36c11 0 15-11 25-11M3 40c13 0 17-9 27-9M3 32c9 0 13-13 23-13"/><circle class="v" cx="28" cy="25" r="3.2"/><circle class="v" cx="30.5" cy="31" r="3.2"/><circle class="v" cx="26.5" cy="19" r="3.2"/><path d="M35 15l7-3M37 25h8M36 34l7 3"/>',
  afstandsbediening: '<rect class="v" x="16" y="4" width="16" height="40" rx="4"/><circle class="d" cx="24" cy="11" r="3"/><circle class="w" cx="20.5" cy="20" r="1.6"/><circle class="w" cx="27.5" cy="20" r="1.6"/><circle class="w" cx="20.5" cy="26" r="1.6"/><circle class="w" cx="27.5" cy="26" r="1.6"/><circle class="w" cx="20.5" cy="32" r="1.6"/><circle class="w" cx="27.5" cy="32" r="1.6"/>',
  // ----- Zichtbaar -----
  laser:       '<rect class="v" x="3" y="26" width="25" height="8" rx="3"/><path d="M10 26v-2.5M31 30h9"/><circle class="w" cx="43.5" cy="30" r="2.5"/>',
  lantaarn:    '<path d="M14 44V13c0-4 3-7 7-7h10"/><path class="v" d="M27 6h14l-2 6H29z"/><path d="M34 15v4M29.5 17l-2 3.5M38.5 17l2 3.5M9 44h10"/>',
  // ----- Ultraviolet -----
  tlbuis:      '<rect class="v" x="6" y="20" width="36" height="8" rx="4"/><path d="M3 24h3M42 24h3M14 34l-2 5M24 34v6M34 34l2 5M14 14l-2-5M24 14V8M34 14l2-5"/>',
  uvlamp:      '<rect class="d" x="11" y="3" width="26" height="5" rx="1"/><path class="v" d="M14 8v20a10 10 0 0 0 20 0V8h-6v20a4 4 0 0 1-8 0V8z"/><path d="M8 40l-3 3M24 42v4M40 40l3 3"/>',
  // ----- Röntgen en gamma -----
  tand:        '<path class="v" d="M14 8c-6 0-8 6-7 12 1 5 3 7 4 13 1 5 2 8 4 8 3 0 3-10 9-10s6 10 9 10c2 0 3-3 4-8 1-6 3-8 4-13 1-6-1-12-7-12-4 0-6 2-10 2s-6-2-10-2z"/>',
  ctscan:      '<circle class="v" cx="24" cy="19" r="15"/><circle class="d" cx="24" cy="19" r="7"/><path d="M2 30h44M8 30v8M40 30v8"/>',
  petscan:     '<circle class="v" cx="24" cy="24" r="18"/><circle class="d" cx="24" cy="24" r="10.5"/><circle class="w" cx="24" cy="24" r="2"/><path d="M22 26l-5 5M26 22l5-5M17 27v4h4M31 21v-4h-4"/>',
  spuit:       '<g transform="rotate(-45 24 24)"><rect class="v" x="11" y="19" width="22" height="10" rx="1"/><path d="M33 24h10M7 24h4M5 19v10M17 19v4M22 19v4M27 19v4"/></g>',
  straling:    '<circle class="w" cx="24" cy="24" r="3"/><path class="v" d="M21 18.8L15 8.4A18 18 0 0 1 33 8.4L27 18.8A6 6 0 0 0 21 18.8z"/><path class="v" d="M30 24h12A18 18 0 0 1 33 39.6L27 29.2A6 6 0 0 0 30 24z"/><path class="v" d="M21 29.2L15 39.6A18 18 0 0 1 6 24h12A6 6 0 0 0 21 29.2z"/>',
  // ----- Voorwerpen bij "Hoe klein is zichtbaar?" -----
  atoom:       '<ellipse cx="24" cy="24" rx="20" ry="7.5"/><ellipse cx="24" cy="24" rx="20" ry="7.5" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="20" ry="7.5" transform="rotate(120 24 24)"/><circle class="v" cx="24" cy="24" r="4.5"/>',
  molecuul:    '<path class="v" d="M24 10l11 6.5v13L24 36l-11-6.5v-13z"/><path d="M35 16.5l6-3.5M13 29.5l-6 3.5M24 36v6M24 10V5"/><circle class="w" cx="42" cy="12.5" r="2.5"/><circle class="w" cx="6" cy="33.5" r="2.5"/><circle class="w" cx="24" cy="43" r="2.5"/><circle class="w" cx="24" cy="4" r="2.5"/>',
  virus:       '<circle class="v" cx="24" cy="24" r="11"/><path d="M24 13V7M24 35v6M13 24H7M35 24h6M16.2 16.2l-4.2-4.2M31.8 31.8l4.2 4.2M31.8 16.2l4.2-4.2M16.2 31.8L12 36"/><circle class="w" cx="24" cy="6" r="2.2"/><circle class="w" cx="24" cy="42" r="2.2"/><circle class="w" cx="6" cy="24" r="2.2"/><circle class="w" cx="42" cy="24" r="2.2"/><circle class="w" cx="11" cy="11" r="2.2"/><circle class="w" cx="37" cy="37" r="2.2"/><circle class="w" cx="37" cy="11" r="2.2"/><circle class="w" cx="11" cy="37" r="2.2"/>',
  bacterie:    '<rect class="v" x="5" y="15" width="29" height="17" rx="8.5"/><path d="M34 23.5c3-3.5 5 3.5 8 0s4 3.5 5 0"/><circle class="w" cx="14" cy="22" r="1.8"/><circle class="w" cx="21" cy="26" r="1.8"/><circle class="w" cx="26" cy="20" r="1.8"/>',
  bloedcel:    '<ellipse class="v" cx="24" cy="24" rx="19" ry="14"/><ellipse cx="24" cy="24" rx="8.5" ry="5.5"/>',
  haar:        '<path class="v" d="M7 41C15 31 11 18 21 6l6 2C17 20 21 32 13 43z"/><path d="M27 41c6-6 6-14 12-22"/>',
  zandkorrel:  '<path class="v" d="M9 30c-2-8 4-16 12-18 8-2 17 2 18 10 1 9-6 15-15 15-7 0-13-2-15-7z"/><path d="M17 24l3 2M27 19l2.5-1M28 30l3 1"/>',
  mier:        '<path d="M17.5 25.5L13 31l-3 6M20 26.5l-1 6-2.5 6.5M22.5 25.5L27 31l3 6M8.5 17L5 11l-3 .5M11.5 16L12 9.5l3-1.5"/><circle class="v" cx="10.5" cy="20" r="4.5"/><ellipse class="v" cx="20" cy="23.5" rx="4.5" ry="3.5"/><ellipse class="v" cx="34" cy="25" rx="9.5" ry="6.5"/>',
  euro:        '<circle class="v" cx="24" cy="24" r="19"/><circle cx="24" cy="24" r="14"/><path d="M30 18.5a8 8 0 1 0 0 11M15 22h12M15 26.5h12"/>',
  deur:        '<rect class="v" x="12" y="4" width="24" height="39" rx="1"/><circle class="w" cx="31" cy="25" r="2"/><path d="M7 43h34"/>',
  bus:         '<rect class="v" x="3" y="11" width="42" height="25" rx="4"/><rect class="d" x="7" y="15" width="9" height="8" rx="1"/><rect class="d" x="19.5" y="15" width="9" height="8" rx="1"/><rect class="d" x="32" y="15" width="9" height="8" rx="1"/><path d="M3 28h42"/><circle class="d" cx="13" cy="37" r="4"/><circle class="d" cx="35" cy="37" r="4"/>',
  voetbalveld: '<rect class="v" x="3" y="8" width="42" height="32" rx="2"/><path d="M24 8v32M3 17h7v14H3M45 17h-7v14h7"/><circle cx="24" cy="24" r="5.5"/>',
  eiffeltoren: '<path class="v" d="M22.5 7h3L27 20h2l1 4h-1l7 20h-6a7 7 0 0 0-14 0h-4l7-20h-1l1-4h2z"/><path d="M24 7V2M19 20h10M18 24h12M6 44h36"/>',
  toren:       '<path class="v" d="M24 2l1.5 10H27l1 10h2l1 10h2l2 12H13l2-12h2l1-10h2l1-10h1.5z"/><path d="M6 44h36M22.5 12h3M20 22h8M17 32h14"/>',
  raket:       '<path class="v" d="M24 4c6 6 8 14 8 24H16c0-10 2-18 8-24z"/><circle class="d" cx="24" cy="17" r="3.2"/><path d="M16 23l-6 8v5l6-2M32 23l6 8v5l-6-2M20 32l4 10 4-10"/>',
};

// SVG-tekst met de juiste kleur voor het vlak.
function plaatjeSVG(naam, kleur, grootte){
  // De kleuren direct op de vlakken: een <style> in een SVG op de pagina zou voor de hele
  // pagina gelden, en dan krijgen alle plaatjes de kleur van het laatste.
  const binnen = (PLAATJES[naam] || '')
    .replaceAll('class="v"', `fill="${kleur}" fill-opacity=".6"`)
    .replaceAll('class="d"', 'fill="#0b0e15"')
    .replaceAll('class="w"', 'fill="#f1f5f9" stroke="none"')
    .replaceAll('class="k"', 'fill="#3f8fe0" fill-opacity=".9" stroke="none"');   // tweede kleur, alleen bij de kosmische achtergrond
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${grootte}" height="${grootte}" fill="none" stroke="#f1f5f9" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${binnen}</svg>`;
}

// Als afbeelding voor het canvas; per naam en kleur één keer gemaakt.
const plaatjesCache = new Map();
function plaatjeBeeld(naam, kleur, klaar){
  const sleutel = naam + kleur;
  let img = plaatjesCache.get(sleutel);
  if(!img){
    img = new Image();
    img.onload = () => { img.klaar = true; if(klaar) klaar(); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(plaatjeSVG(naam, kleur, 96));
    plaatjesCache.set(sleutel, img);
  }
  return img.klaar ? img : null;
}
