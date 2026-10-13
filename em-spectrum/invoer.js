/* Invoerveld van de EM-spectrumtool: een getypte golflengte, frequentie of energie lezen.

   Leerlingen en docenten werken op Chromebooks, waar ^3 het teken ³ wordt. Daarom eerst
   normaliseren (zie workflow.md, Invoer van leerlingen): superscripttekens terug naar gewone
   tekens, het echte minteken naar een koppelteken, komma als decimaalteken, spaties tussen
   cijfers weg en een kale tienmacht (10³) als 1·10³.

   leesInvoer(tekst) geeft {lambda} (in meter) of {fout} (een zin in gewone taal). */

const INVOER_C = 2.99792458e8, INVOER_H = 6.62607015e-34, INVOER_E = 1.602176634e-19;

// Eenheden in kleine letters; 'mhz' is dus megahertz (millihertz komt hier niet voor).
const INVOER_EENHEDEN = {
  km: ['l', 1e3], m: ['l', 1], dm: ['l', 1e-1], cm: ['l', 1e-2], mm: ['l', 1e-3],
  'µm': ['l', 1e-6], 'μm': ['l', 1e-6], um: ['l', 1e-6], micrometer: ['l', 1e-6],
  nm: ['l', 1e-9], pm: ['l', 1e-12], fm: ['l', 1e-15],
  hz: ['f', 1], khz: ['f', 1e3], mhz: ['f', 1e6], ghz: ['f', 1e9], thz: ['f', 1e12],
  phz: ['f', 1e15], ehz: ['f', 1e18], zhz: ['f', 1e21],
  ev: ['e', INVOER_E], kev: ['e', 1e3 * INVOER_E], mev: ['e', 1e6 * INVOER_E], gev: ['e', 1e9 * INVOER_E],
  j: ['e', 1],
};

const SUPERSCRIPT = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-'};

function normaliseer(tekst){
  let s = String(tekst).trim().toLowerCase();
  // Superscripts: een reeks wordt ^(...), zodat 10⁻³ hetzelfde is als 10^-3.
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, m => '^' + [...m].map(c => SUPERSCRIPT[c]).join(''));
  s = s.replace(/[−–—]/g, '-').replace(/,/g, '.');
  s = s.replace(/(\d)\s+(?=\d)/g, '$1');            // 5 000 → 5000
  return s;
}

// Een getal als 5000, 5e3, 5*10^3, 5·10³, 4,5·10⁻³ of 10³. Geeft NaN als het niet lukt.
function leesGetalDeel(s){
  s = s.replace(/\s+/g, '');
  s = s.replace(/^(?:[*x×·])?10\^\(?([+-]?\d+)\)?$/, '1e$1');              // kale tienmacht
  s = s.replace(/[*x×·]10\^\(?([+-]?\d+)\)?$/, 'e$1');                     // a·10^n
  s = s.replace(/[*x×·]10([+-]\d+)$/, 'e$1');      // a·10−7 (superscript weggevallen bij kopiëren uit Binas)
  if(!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(s)) return NaN;
  return Number(s);
}

function leesInvoer(tekst){
  const s = normaliseer(tekst);
  if(!s) return {fout: 'Typ een golflengte, frequentie of energie, bijvoorbeeld 589 nm of 2,45 GHz.'};
  const m = s.match(/^(.*?)\s*([a-zµμ]+)$/);
  if(!m) return {fout: 'Zet er een eenheid achter, bijvoorbeeld nm, m, MHz, GHz of eV.'};
  const [, getalTekst, eenheid] = m;
  const e = INVOER_EENHEDEN[eenheid];
  if(!e) return {fout: `De eenheid "${eenheid}" ken ik niet. Gebruik bijvoorbeeld nm, m, MHz, GHz of eV.`};
  const x = leesGetalDeel(getalTekst);
  if(!isFinite(x)) return {fout: 'Dat getal kan ik niet lezen. Probeer bijvoorbeeld 589 nm of 4,5·10^-7 m.'};
  if(x <= 0) return {fout: 'Het getal moet groter zijn dan nul.'};
  const waarde = x * e[1];
  const lambda = e[0] === 'l' ? waarde : e[0] === 'f' ? INVOER_C / waarde : INVOER_H * INVOER_C / waarde;
  return {lambda, soort: e[0]};
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { leesInvoer, normaliseer, leesGetalDeel };
}
