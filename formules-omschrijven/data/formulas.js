// formulas.js
// Elke formule heeft:
//   solveFor: array van {key, display} objecten
//     key: de sleutel in answers (genormaliseerde naam zonder speciale tekens)
//     display: LaTeX-string voor weergave aan de leerling
//   answers: object met key → rechterlid van het correcte antwoord (genormaliseerde notatie)

// niveau (volgens de kolommen van Binas 7e editie, tabel 35):
//   'beide' = kolom havo/vwo · 'havo' = havo/vwo met ▶ (hoort niet bij vwo)
//   'vwo'   = kolom vwo      · 'extra' = kolom overige (buiten het examenprogramma)
// Optica (thema F) staat in Binas onder 'overige' en is daarom een optioneel thema.

const FORMULAS = [

  // ── A MECHANICA ──────────────────────────────────────────────

  {
    id: 'kin_s_vt',
    display: 's = v \\cdot t',
    variables: { s: 'verplaatsing', v: 'snelheid', t: 'tijd' },
    solveFor: [
      { key: 'v', display: 'v' },
      { key: 't', display: 't' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { v: 's/t', t: 's/v' },
  },
  {
    id: 'vgem',
    display: 'v_{gem} = \\dfrac{\\Delta x}{\\Delta t}',
    variables: { 'v_{gem}': 'gemiddelde snelheid', '\\Delta x': 'verplaatsing', '\\Delta t': 'tijdsduur' },
    solveFor: [
      { key: 'dx', display: '\\Delta x' },
      { key: 'dt', display: '\\Delta t' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { dx: 'vgem*dt', dt: 'dx/vgem' },
  },
  {
    id: 'agem',
    display: 'a_{gem} = \\dfrac{\\Delta v}{\\Delta t}',
    variables: { 'a_{gem}': 'gemiddelde versnelling', '\\Delta v': 'snelheidsverandering', '\\Delta t': 'tijdsduur' },
    solveFor: [
      { key: 'dv', display: '\\Delta v' },
      { key: 'dt', display: '\\Delta t' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { dv: 'agem*dt', dt: 'dv/agem' },
  },
  {
    id: 'newton2',
    display: 'F_{res} = m \\cdot a',
    variables: { 'F_{res}': 'resulterende kracht', m: 'massa', a: 'versnelling' },
    solveFor: [
      { key: 'm', display: 'm' },
      { key: 'a', display: 'a' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { m: 'Fres/a', a: 'Fres/m' },
  },
  {
    id: 'zwaarte',
    display: 'F_z = m \\cdot g',
    variables: { 'F_z': 'zwaartekracht', m: 'massa', g: 'valversnelling' },
    solveFor: [
      { key: 'm', display: 'm' },
      { key: 'g', display: 'g' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { m: 'Fz/g', g: 'Fz/m' },
  },
  {
    id: 'veer',
    display: 'F_v = C \\cdot u',
    variables: { 'F_v': 'veerkracht', C: 'veerconstante', u: 'uitwijking/uitrekking' },
    solveFor: [
      { key: 'C', display: 'C' },
      { key: 'u', display: 'u' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { C: 'Fv/u', u: 'Fv/C' },
  },
  {
    id: 'cirkel_v',
    display: 'v = \\dfrac{2\\pi r}{T}',
    variables: { v: 'baansnelheid', r: 'straal', T: 'omlooptijd' },
    solveFor: [
      { key: 'r', display: 'r' },
      { key: 'T', display: 'T' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { r: '(v*T)/(2*pi)', T: '(2*pi*r)/v' },
  },
  {
    id: 'mpz',
    display: 'F_{mpz} = \\dfrac{mv^2}{r}',
    variables: { 'F_{mpz}': 'middelpuntzoekende kracht', m: 'massa', v: 'snelheid', r: 'straal' },
    solveFor: [
      { key: 'm', display: 'm' },
      { key: 'v', display: 'v' },
      { key: 'r', display: 'r' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { m: '(Fmpz*r)/v^2', v: 'sqrt((Fmpz*r)/m)', r: '(m*v^2)/Fmpz' },
  },
  {
    id: 'eenparig_versneld',
    display: 's = \\tfrac{1}{2} a t^2',
    variables: { s: 'afgelegde afstand', a: 'versnelling', t: 'tijd' },
    solveFor: [
      { key: 'a', display: 'a' },
      { key: 't', display: 't' },
    ],
    niveau: 'extra', thema: 'mechanica',
    answers: { a: '(2*s)/t^2', t: 'sqrt((2*s)/a)' },
  },
  {
    id: 'druk',
    display: 'p = \\dfrac{F}{A}',
    variables: { p: 'druk', F: 'kracht', A: 'oppervlakte' },
    solveFor: [
      { key: 'F', display: 'F' },
      { key: 'A', display: 'A' },
    ],
    niveau: 'extra', thema: 'mechanica',
    answers: { F: 'p*A', A: 'F/p' },
  },
  {
    id: 'impuls',
    display: 'p = m \\cdot v',
    variables: { p: 'impuls', m: 'massa', v: 'snelheid' },
    solveFor: [
      { key: 'm', display: 'm' },
      { key: 'v', display: 'v' },
    ],
    niveau: 'extra', thema: 'mechanica',
    answers: { m: 'p/v', v: 'p/m' },
  },
  {
    id: 'arbeid',
    display: 'W = F \\cdot s',
    variables: { W: 'arbeid', F: 'kracht', s: 'verplaatsing' },
    solveFor: [
      { key: 'F', display: 'F' },
      { key: 's', display: 's' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { F: 'W/s', s: 'W/F' },
  },
  {
    id: 'ekin',
    display: 'E_k = \\tfrac{1}{2}mv^2',
    variables: { 'E_k': 'kinetische energie', m: 'massa', v: 'snelheid' },
    solveFor: [
      { key: 'm', display: 'm' },
      { key: 'v', display: 'v' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { m: '(2*Ek)/v^2', v: 'sqrt((2*Ek)/m)' },
  },
  {
    id: 'veerenergie',
    display: 'E_v = \\tfrac{1}{2} C u^2',
    variables: { 'E_v': 'veerenergie', C: 'veerconstante', u: 'uitrekking' },
    solveFor: [
      { key: 'C', display: 'C' },
      { key: 'u', display: 'u' },
    ],
    niveau: 'vwo', thema: 'mechanica',
    answers: { C: '(2*Ev)/u^2', u: 'sqrt((2*Ev)/C)' },
  },
  {
    id: 'ez',
    display: 'E_z = m \\cdot g \\cdot h',
    variables: { 'E_z': 'zwaarte-energie', m: 'massa', g: 'valversnelling', h: 'hoogte' },
    solveFor: [
      { key: 'm', display: 'm' },
      { key: 'g', display: 'g' },
      { key: 'h', display: 'h' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { m: 'Ez/(g*h)', g: 'Ez/(m*h)', h: 'Ez/(m*g)' },
  },
  {
    id: 'verm_wt',
    display: 'P = \\dfrac{W}{t}',
    variables: { P: 'vermogen', W: 'arbeid', t: 'tijd' },
    solveFor: [
      { key: 'W', display: 'W' },
      { key: 't', display: 't' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { W: 'P*t', t: 'W/P' },
  },
  {
    id: 'verm_fv',
    display: 'P = F \\cdot v',
    variables: { P: 'vermogen', F: 'kracht', v: 'snelheid' },
    solveFor: [
      { key: 'F', display: 'F' },
      { key: 'v', display: 'v' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { F: 'P/v', v: 'P/F' },
  },
  {
    id: 'rendement',
    display: '\\eta = \\dfrac{P_{nuttig}}{P_{in}}',
    variables: { '\\eta': 'rendement', 'P_{nuttig}': 'nuttig vermogen', 'P_{in}': 'opgenomen vermogen' },
    solveFor: [
      { key: 'Pnuttig', display: 'P_{nuttig}' },
      { key: 'Pin', display: 'P_{in}' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { Pnuttig: 'eta*Pin', Pin: 'Pnuttig/eta' },
  },
  {
    id: 'rendement_e',
    display: '\\eta = \\dfrac{E_{nuttig}}{E_{in}}',
    variables: { '\\eta': 'rendement', 'E_{nuttig}': 'nuttige energie', 'E_{in}': 'opgenomen energie' },
    solveFor: [
      { key: 'Enuttig', display: 'E_{nuttig}' },
      { key: 'Ein', display: 'E_{in}' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { Enuttig: 'eta*Ein', Ein: 'Enuttig/eta' },
  },
  {
    id: 'gravitatie',
    display: 'F_g = G \\cdot \\dfrac{mM}{r^2}',
    variables: { 'F_g': 'gravitatiekracht', G: 'gravitatieconstante', m: 'massa 1', M: 'massa 2', r: 'afstand' },
    solveFor: [
      { key: 'm', display: 'm' },
      { key: 'M', display: 'M' },
      { key: 'r', display: 'r' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { m: '(Fg*r^2)/(G*M)', M: '(Fg*r^2)/(G*m)', r: 'sqrt((G*m*M)/Fg)' },
  },
  {
    id: 'hefboom',
    display: 'F_1 \\cdot r_1 = F_2 \\cdot r_2',
    variables: { 'F_1': 'kracht 1', 'r_1': 'arm 1', 'F_2': 'kracht 2', 'r_2': 'arm 2' },
    solveFor: [
      { key: 'F1', display: 'F_1' },
      { key: 'r1', display: 'r_1' },
      { key: 'F2', display: 'F_2' },
      { key: 'r2', display: 'r_2' },
    ],
    niveau: 'havo', thema: 'mechanica',
    answers: { F1: '(F2*r2)/r1', r1: '(F2*r2)/F1', F2: '(F1*r1)/r2', r2: '(F1*r1)/F2' },
  },
  {
    id: 'massa_veer',
    display: 'T = 2\\pi\\sqrt{\\dfrac{m}{C}}',
    variables: { T: 'trillingstijd', m: 'massa', C: 'veerconstante' },
    solveFor: [
      { key: 'm', display: 'm' },
      { key: 'C', display: 'C' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { m: '(C*T^2)/(4*pi^2)', C: '(4*pi^2*m)/T^2' },
  },
  {
    id: 'slinger',
    display: 'T = 2\\pi\\sqrt{\\dfrac{l}{g}}',
    variables: { T: 'slingertijd', l: 'slingerlengte', g: 'valversnelling' },
    solveFor: [
      { key: 'l', display: 'l' },
      { key: 'g', display: 'g' },
    ],
    niveau: 'extra', thema: 'mechanica',
    answers: { l: '(g*T^2)/(4*pi^2)', g: '(4*pi^2*l)/T^2' },
  },

  {
    id: 'ech_v',
    display: 'E_{ch} = r_V \\cdot V',
    variables: { 'E_{ch}': 'chemische energie', 'r_V': 'stookwaarde per volume', V: 'volume' },
    solveFor: [
      { key: 'rV', display: 'r_V' },
      { key: 'V', display: 'V' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { rV: 'Ech/V', V: 'Ech/rV' },
  },
  {
    id: 'ech_m',
    display: 'E_{ch} = r_m \\cdot m',
    variables: { 'E_{ch}': 'chemische energie', 'r_m': 'stookwaarde per massa', m: 'massa' },
    solveFor: [
      { key: 'rm', display: 'r_m' },
      { key: 'm', display: 'm' },
    ],
    niveau: 'beide', thema: 'mechanica',
    answers: { rm: 'Ech/m', m: 'Ech/rm' },
  },
  {
    id: 'arbeid_cos',
    display: 'W = F \\cdot s \\cdot \\cos \\alpha',
    variables: { W: 'arbeid', F: 'kracht', s: 'verplaatsing', '\\alpha': 'hoek tussen kracht en verplaatsing' },
    solveFor: [
      { key: 'F', display: 'F' },
      { key: 's', display: 's' },
    ],
    niveau: 'vwo', thema: 'mechanica',
    answers: { F: 'W/(s*cos(alpha))', s: 'W/(F*cos(alpha))' },
  },
  {
    id: 'wrijving',
    display: 'F_{w,s,max} = f \\cdot F_n',
    variables: { 'F_{w,s,max}': 'maximale schuifwrijvingskracht', f: 'wrijvingscoëfficiënt', 'F_n': 'normaalkracht' },
    solveFor: [
      { key: 'f', display: 'f' },
      { key: 'Fn', display: 'F_n' },
    ],
    niveau: 'vwo', thema: 'mechanica',
    answers: { f: 'Fwsmax/Fn', Fn: 'Fwsmax/f' },
  },
  {
    id: 'luchtweerstand',
    display: 'F_{w,l} = \\tfrac{1}{2} \\rho \\cdot C_w \\cdot A \\cdot v^2',
    variables: { 'F_{w,l}': 'luchtweerstandskracht', '\\rho': 'dichtheid van de lucht', 'C_w': 'luchtweerstandscoëfficiënt', A: 'frontale oppervlakte', v: 'snelheid' },
    solveFor: [
      { key: 'Cw', display: 'C_w' },
      { key: 'A', display: 'A' },
      { key: 'v', display: 'v' },
    ],
    niveau: 'vwo', thema: 'mechanica',
    answers: { Cw: '(2*Fwl)/(rho*A*v^2)', A: '(2*Fwl)/(rho*Cw*v^2)', v: 'sqrt((2*Fwl)/(rho*Cw*A))' },
  },
  {
    id: 'gravitatie_energie',
    display: 'E_g = -G \\cdot \\dfrac{mM}{r}',
    variables: { 'E_g': 'gravitatie-energie', G: 'gravitatieconstante', m: 'massa 1', M: 'massa 2', r: 'afstand' },
    solveFor: [
      { key: 'm', display: 'm' },
      { key: 'r', display: 'r' },
    ],
    niveau: 'vwo', thema: 'mechanica',
    answers: { m: '-(Eg*r)/(G*M)', r: '-(G*m*M)/Eg' },
  },

  // ── B TRILLINGEN & GOLVEN ─────────────────────────────────────

  {
    id: 'freq_periode',
    display: 'f = \\dfrac{1}{T}',
    variables: { f: 'frequentie', T: 'periode' },
    solveFor: [
      { key: 'T', display: 'T' },
    ],
    niveau: 'beide', thema: 'trillingen',
    answers: { T: '1/f' },
  },
  {
    id: 'golfsnelheid',
    display: 'v = f \\cdot \\lambda',
    variables: { v: 'golfsnelheid', f: 'frequentie', '\\lambda': 'golflengte' },
    solveFor: [
      { key: 'f', display: 'f' },
      { key: 'lambda', display: '\\lambda' },
    ],
    niveau: 'beide', thema: 'trillingen',
    answers: { f: 'v/lambda', lambda: 'v/f' },
  },
  {
    id: 'vmax',
    display: 'v_{max} = \\dfrac{2\\pi A}{T}',
    variables: { 'v_{max}': 'maximale snelheid', A: 'amplitude', T: 'trillingstijd' },
    solveFor: [
      { key: 'A', display: 'A' },
      { key: 'T', display: 'T' },
    ],
    niveau: 'vwo', thema: 'trillingen',
    answers: { A: '(vmax*T)/(2*pi)', T: '(2*pi*A)/vmax' },
  },

  {
    id: 'fase_t',
    display: '\\Delta \\phi = \\dfrac{\\Delta t}{T}',
    variables: { '\\Delta \\phi': 'faseverschil', '\\Delta t': 'tijdsverschil', T: 'trillingstijd' },
    solveFor: [
      { key: 'dt', display: '\\Delta t' },
      { key: 'T', display: 'T' },
    ],
    niveau: 'vwo', thema: 'trillingen',
    answers: { dt: 'Deltaphi*T', T: 'dt/Deltaphi' },
  },
  {
    id: 'fase_x',
    display: '\\Delta \\phi = \\dfrac{\\Delta x}{\\lambda}',
    variables: { '\\Delta \\phi': 'faseverschil', '\\Delta x': 'afstand tussen de punten', '\\lambda': 'golflengte' },
    solveFor: [
      { key: 'dx', display: '\\Delta x' },
      { key: 'lambda', display: '\\lambda' },
    ],
    niveau: 'vwo', thema: 'trillingen',
    answers: { dx: 'Deltaphi*lambda', lambda: 'dx/Deltaphi' },
  },
  {
    id: 'uitwijking',
    display: 'u = A \\cdot \\sin\\left(\\dfrac{2\\pi}{T} \\cdot t\\right)',
    variables: { u: 'uitwijking', A: 'amplitude', T: 'trillingstijd', t: 'tijd' },
    solveFor: [
      { key: 'A', display: 'A' },
    ],
    niveau: 'vwo', thema: 'trillingen',
    answers: { A: 'u/sin((2*pi*t)/T)' },
  },
  {
    id: 'harmonische_kracht',
    display: 'F_{res} = -C \\cdot u',
    variables: { 'F_{res}': 'terugdrijvende kracht', C: 'veerconstante', u: 'uitwijking' },
    solveFor: [
      { key: 'C', display: 'C' },
      { key: 'u', display: 'u' },
    ],
    niveau: 'vwo', thema: 'trillingen',
    answers: { C: '-Fres/u', u: '-Fres/C' },
  },
  {
    id: 'staande_golf_dicht',
    display: 'l = n \\cdot \\tfrac{1}{2} \\lambda',
    variables: { l: 'lengte (twee vaste of twee open uiteinden)', n: 'rangnummer', '\\lambda': 'golflengte' },
    solveFor: [
      { key: 'n', display: 'n' },
      { key: 'lambda', display: '\\lambda' },
    ],
    niveau: 'vwo', thema: 'trillingen',
    answers: { n: '(2*l)/lambda', lambda: '(2*l)/n' },
  },
  {
    id: 'staande_golf_open',
    display: 'l = (2n - 1) \\cdot \\tfrac{1}{4} \\lambda',
    variables: { l: 'lengte (een open en een gesloten uiteinde)', n: 'rangnummer', '\\lambda': 'golflengte' },
    solveFor: [
      { key: 'lambda', display: '\\lambda' },
      { key: 'n', display: 'n' },
    ],
    niveau: 'vwo', thema: 'trillingen',
    answers: { lambda: '(4*l)/(2*n-1)', n: '((4*l)/lambda+1)/2' },
  },
  {
    id: 'kwadratenwet',
    display: 'I = \\dfrac{P_{bron}}{4\\pi r^2}',
    variables: { I: 'intensiteit', 'P_{bron}': 'vermogen van de bron', r: 'afstand tot de bron' },
    solveFor: [
      { key: 'Pbron', display: 'P_{bron}' },
      { key: 'r', display: 'r' },
    ],
    niveau: 'vwo', thema: 'trillingen',
    answers: { Pbron: '4*pi*r^2*I', r: 'sqrt(Pbron/(4*pi*I))' },
  },
  {
    id: 'tralie',
    display: 'd \\cdot \\sin \\alpha = n \\cdot \\lambda',
    variables: { d: 'tralieconstante', '\\alpha': 'hoek van het maximum', n: 'orde', '\\lambda': 'golflengte' },
    solveFor: [
      { key: 'd', display: 'd' },
      { key: 'n', display: 'n' },
      { key: 'lambda', display: '\\lambda' },
    ],
    niveau: 'vwo', thema: 'trillingen',
    answers: { d: '(n*lambda)/sin(alpha)', n: '(d*sin(alpha))/lambda', lambda: '(d*sin(alpha))/n' },
  },

  // ── C VLOEISTOFFEN & WARMTE ───────────────────────────────────

  {
    id: 'dichtheid',
    display: '\\rho = \\dfrac{m}{V}',
    variables: { '\\rho': 'dichtheid', m: 'massa', V: 'volume' },
    solveFor: [
      { key: 'm', display: 'm' },
      { key: 'V', display: 'V' },
    ],
    niveau: 'beide', thema: 'warmte',
    answers: { m: 'rho*V', V: 'm/rho' },
  },
  {
    id: 'debiet',
    display: 'Q = \\dfrac{\\Delta V}{\\Delta t}',
    variables: { Q: 'debiet (volumestroom)', '\\Delta V': 'verplaatst volume', '\\Delta t': 'tijdsduur' },
    solveFor: [
      { key: 'dV', display: '\\Delta V' },
      { key: 'dt', display: '\\Delta t' },
    ],
    niveau: 'havo', thema: 'warmte',
    answers: { dV: 'Q*dt', dt: 'dV/Q' },
  },
  {
    id: 'soortelijke_warmte',
    display: 'Q = c \\cdot m \\cdot \\Delta T',
    variables: { Q: 'warmte', c: 'soortelijke warmte', m: 'massa', '\\Delta T': 'temperatuursverschil' },
    solveFor: [
      { key: 'c', display: 'c' },
      { key: 'm', display: 'm' },
      { key: 'dT', display: '\\Delta T' },
    ],
    niveau: 'beide', thema: 'warmte',
    answers: { c: 'Q/(m*dT)', m: 'Q/(c*dT)', dT: 'Q/(c*m)' },
  },
  {
    id: 'warmtestroom',
    display: 'P = \\lambda \\cdot A \\cdot \\dfrac{\\Delta T}{d}',
    variables: { P: 'warmtestroom', '\\lambda': 'warmtegeleidingscoëfficiënt', A: 'oppervlakte', '\\Delta T': 'temperatuursverschil', d: 'dikte' },
    solveFor: [
      { key: 'lambda', display: '\\lambda' },
      { key: 'A', display: 'A' },
      { key: 'dT', display: '\\Delta T' },
      { key: 'd', display: 'd' },
    ],
    niveau: 'havo', thema: 'warmte',
    answers: { lambda: '(P*d)/(A*dT)', A: '(P*d)/(lambda*dT)', dT: '(P*d)/(lambda*A)', d: '(lambda*A*dT)/P' },
  },

  {
    id: 'debiet_av',
    display: 'Q = A \\cdot v',
    variables: { Q: 'debiet', A: 'oppervlakte van de doorsnede', v: 'stroomsnelheid' },
    solveFor: [
      { key: 'A', display: 'A' },
      { key: 'v', display: 'v' },
    ],
    niveau: 'havo', thema: 'warmte',
    answers: { A: 'Q/v', v: 'Q/A' },
  },

  // ── D ELEKTRICITEIT ───────────────────────────────────────────

  {
    id: 'stroom',
    display: 'I = \\dfrac{Q}{t}',
    variables: { I: 'stroomsterkte', Q: 'lading', t: 'tijd' },
    solveFor: [
      { key: 'Q', display: 'Q' },
      { key: 't', display: 't' },
    ],
    niveau: 'beide', thema: 'elektriciteit',
    answers: { Q: 'I*t', t: 'Q/I' },
  },
  {
    id: 'ohm',
    display: 'U = I \\cdot R',
    variables: { U: 'spanning', I: 'stroomsterkte', R: 'weerstand' },
    solveFor: [
      { key: 'I', display: 'I' },
      { key: 'R', display: 'R' },
    ],
    niveau: 'beide', thema: 'elektriciteit',
    answers: { I: 'U/R', R: 'U/I' },
  },
  {
    id: 'verm_ui',
    display: 'P = U \\cdot I',
    variables: { P: 'vermogen', U: 'spanning', I: 'stroomsterkte' },
    solveFor: [
      { key: 'U', display: 'U' },
      { key: 'I', display: 'I' },
    ],
    niveau: 'beide', thema: 'elektriciteit',
    answers: { U: 'P/I', I: 'P/U' },
  },
  {
    id: 'energie_elek',
    display: 'E = P \\cdot t',
    variables: { E: 'energie', P: 'vermogen', t: 'tijd' },
    solveFor: [
      { key: 'P', display: 'P' },
      { key: 't', display: 't' },
    ],
    niveau: 'beide', thema: 'elektriciteit',
    answers: { P: 'E/t', t: 'E/P' },
  },
  {
    id: 'soort_weerstand',
    display: '\\rho = \\dfrac{R \\cdot A}{l}',
    variables: { '\\rho': 'soortelijke weerstand', R: 'weerstand', A: 'doorsnede', l: 'lengte' },
    solveFor: [
      { key: 'R', display: 'R' },
      { key: 'A', display: 'A' },
      { key: 'l', display: 'l' },
    ],
    niveau: 'beide', thema: 'elektriciteit',
    answers: { R: '(rho*l)/A', A: '(rho*l)/R', l: '(R*A)/rho' },
  },
  {
    id: 'serie_r',
    display: 'R_{tot} = R_1 + R_2',
    variables: { 'R_{tot}': 'totale weerstand (serie)', 'R_1': 'weerstand 1', 'R_2': 'weerstand 2' },
    solveFor: [
      { key: 'R1', display: 'R_1' },
      { key: 'R2', display: 'R_2' },
    ],
    niveau: 'beide', thema: 'elektriciteit',
    answers: { R1: 'Rtot-R2', R2: 'Rtot-R1' },
  },
  {
    id: 'parallel_r',
    display: '\\dfrac{1}{R_{tot}} = \\dfrac{1}{R_1} + \\dfrac{1}{R_2}',
    variables: { 'R_{tot}': 'totale weerstand', 'R_1': 'weerstand 1', 'R_2': 'weerstand 2' },
    solveFor: [
      { key: 'Rtot', display: 'R_{tot}' },
      { key: 'R1', display: 'R_1' },
      { key: 'R2', display: 'R_2' },
    ],
    niveau: 'beide', thema: 'elektriciteit',
    answers: { Rtot: '(R1*R2)/(R1+R2)', R1: '(Rtot*R2)/(R2-Rtot)', R2: '(Rtot*R1)/(R1-Rtot)' },
  },

  {
    id: 'spanning_energie',
    display: 'U = \\dfrac{\\Delta E}{Q}',
    variables: { U: 'spanning', '\\Delta E': 'energie per lading', Q: 'lading' },
    solveFor: [
      { key: 'dE', display: '\\Delta E' },
      { key: 'Q', display: 'Q' },
    ],
    niveau: 'vwo', thema: 'elektriciteit',
    answers: { dE: 'U*Q', Q: 'dE/U' },
  },
  {
    id: 'coulomb',
    display: 'F_{el} = f \\cdot \\dfrac{q \\cdot Q}{r^2}',
    variables: { 'F_{el}': 'elektrische kracht', f: 'constante van Coulomb', q: 'lading 1', Q: 'lading 2', r: 'afstand' },
    solveFor: [
      { key: 'q', display: 'q' },
      { key: 'r', display: 'r' },
    ],
    niveau: 'vwo', thema: 'elektriciteit',
    answers: { q: '(Fel*r^2)/(f*Q)', r: 'sqrt((f*q*Q)/Fel)' },
  },
  {
    id: 'veldkracht',
    display: 'F_{el} = q \\cdot E',
    variables: { 'F_{el}': 'elektrische kracht', q: 'lading', E: 'elektrische veldsterkte' },
    solveFor: [
      { key: 'q', display: 'q' },
      { key: 'E', display: 'E' },
    ],
    niveau: 'vwo', thema: 'elektriciteit',
    answers: { q: 'Fel/E', E: 'Fel/q' },
  },
  {
    id: 'elektrische_energie',
    display: '\\Delta E_{el} = q \\cdot U',
    variables: { '\\Delta E_{el}': 'toename elektrische energie', q: 'lading', U: 'spanning' },
    solveFor: [
      { key: 'q', display: 'q' },
      { key: 'U', display: 'U' },
    ],
    niveau: 'vwo', thema: 'elektriciteit',
    answers: { q: 'dEel/U', U: 'dEel/q' },
  },
  {
    id: 'lorentz_draad',
    display: 'F_L = B \\cdot I \\cdot l',
    variables: { 'F_L': 'lorentzkracht', B: 'magnetische inductie', I: 'stroomsterkte', l: 'lengte van de draad in het veld' },
    solveFor: [
      { key: 'B', display: 'B' },
      { key: 'I', display: 'I' },
      { key: 'l', display: 'l' },
    ],
    niveau: 'vwo', thema: 'elektriciteit',
    answers: { B: 'FL/(I*l)', I: 'FL/(B*l)', l: 'FL/(B*I)' },
  },
  {
    id: 'lorentz_deeltje',
    display: 'F_L = B \\cdot q \\cdot v',
    variables: { 'F_L': 'lorentzkracht', B: 'magnetische inductie', q: 'lading', v: 'snelheid' },
    solveFor: [
      { key: 'B', display: 'B' },
      { key: 'q', display: 'q' },
      { key: 'v', display: 'v' },
    ],
    niveau: 'vwo', thema: 'elektriciteit',
    answers: { B: 'FL/(q*v)', q: 'FL/(B*v)', v: 'FL/(B*q)' },
  },
  {
    id: 'flux',
    display: '\\Phi = B \\cdot A',
    variables: { '\\Phi': 'magnetische flux', B: 'magnetische inductie (loodrecht)', A: 'oppervlakte' },
    solveFor: [
      { key: 'B', display: 'B' },
      { key: 'A', display: 'A' },
    ],
    niveau: 'vwo', thema: 'elektriciteit',
    answers: { B: 'Phi/A', A: 'Phi/B' },
  },

  // ── E OVERIGE ─────────────────────────────────────────────────

  {
    id: 'wien',
    display: '\\lambda_{max} \\cdot T = k_W',
    variables: { '\\lambda_{max}': 'piekgolflengte', T: 'temperatuur', 'k_W': 'constante van Wien' },
    solveFor: [
      { key: 'lambdamax', display: '\\lambda_{max}' },
      { key: 'T', display: 'T' },
    ],
    niveau: 'beide', thema: 'overige',
    answers: { lambdamax: 'kW/T', T: 'kW/lambdamax' },
  },
  {
    id: 'foton',
    display: 'E = h \\cdot f',
    variables: { E: 'energie foton', h: 'constante van Planck', f: 'frequentie' },
    solveFor: [
      { key: 'h', display: 'h' },
      { key: 'f', display: 'f' },
    ],
    niveau: 'beide', thema: 'overige',
    answers: { h: 'E/f', f: 'E/h' },
  },
  {
    id: 'foton_golflengte',
    display: 'E = \\dfrac{h \\cdot c}{\\lambda}',
    variables: { E: 'energie foton', h: 'constante van Planck', c: 'lichtsnelheid', '\\lambda': 'golflengte' },
    solveFor: [
      { key: 'lambda', display: '\\lambda' },
      { key: 'h', display: 'h' },
    ],
    niveau: 'vwo', thema: 'overige',
    answers: { lambda: '(h*c)/E', h: '(E*lambda)/c' },
  },
  {
    id: 'lichtsnelheid',
    display: 'c = f \\cdot \\lambda',
    variables: { c: 'lichtsnelheid', f: 'frequentie', '\\lambda': 'golflengte' },
    solveFor: [
      { key: 'f', display: 'f' },
      { key: 'lambda', display: '\\lambda' },
    ],
    niveau: 'beide', thema: 'overige',
    answers: { f: 'c/lambda', lambda: 'c/f' },
  },
  {
    id: 'massagetal',
    display: 'A = N + Z',
    variables: { A: 'massagetal', N: 'aantal neutronen', Z: 'atoomnummer' },
    solveFor: [
      { key: 'N', display: 'N' },
      { key: 'Z', display: 'Z' },
    ],
    niveau: 'beide', thema: 'overige',
    answers: { N: 'A-Z', Z: 'A-N' },
  },
  {
    id: 'dosis',
    display: 'D = \\dfrac{E}{m}',
    variables: { D: 'geabsorbeerde dosis', E: 'energie', m: 'massa' },
    solveFor: [
      { key: 'E', display: 'E' },
      { key: 'm', display: 'm' },
    ],
    niveau: 'beide', thema: 'overige',
    answers: { E: 'D*m', m: 'E/D' },
  },
  {
    id: 'halvering',
    display: 'N = N_0 \\cdot \\left(\\tfrac{1}{2}\\right)^{n}',
    variables: { N: 'aantal kernen na n halveringstijden', 'N_0': 'beginhoeveelheid', n: 'aantal halveringstijden' },
    solveFor: [
      { key: 'N0', display: 'N_0' },
    ],
    niveau: 'beide', thema: 'overige',
    answers: { N0: 'N/0.5^n' },
  },
  {
    id: 'einstein',
    display: 'E = m \\cdot c^2',
    variables: { E: 'energie', m: 'massa', c: 'lichtsnelheid' },
    solveFor: [
      { key: 'm', display: 'm' },
    ],
    niveau: 'vwo', thema: 'overige',
    answers: { m: 'E/c^2' },
  },

  {
    id: 'stefan_boltzmann',
    display: 'P_{bron} = \\sigma \\cdot A \\cdot T^4',
    variables: { 'P_{bron}': 'uitgestraald vermogen', '\\sigma': 'constante van Stefan-Boltzmann', A: 'oppervlakte', T: 'temperatuur' },
    solveFor: [
      { key: 'A', display: 'A' },
      { key: 'T', display: 'T' },
    ],
    niveau: 'vwo', thema: 'overige',
    answers: { A: 'Pbron/(sigma*T^4)', T: '(Pbron/(sigma*A))^(1/4)' },
  },
  {
    id: 'dopplerverschuiving',
    display: 'v = \\dfrac{\\Delta \\lambda}{\\lambda} \\cdot c',
    variables: { v: 'snelheid van de bron', '\\Delta \\lambda': 'verschuiving van de golflengte', '\\lambda': 'golflengte', c: 'lichtsnelheid' },
    solveFor: [
      { key: 'Deltalambda', display: '\\Delta \\lambda' },
      { key: 'lambda', display: '\\lambda' },
    ],
    niveau: 'vwo', thema: 'overige',
    answers: { Deltalambda: '(v*lambda)/c', lambda: '(Deltalambda*c)/v' },
  },
  {
    id: 'debroglie',
    display: '\\lambda = \\dfrac{h}{m \\cdot v}',
    variables: { '\\lambda': 'debroglie-golflengte', h: 'constante van Planck', m: 'massa', v: 'snelheid' },
    solveFor: [
      { key: 'm', display: 'm' },
      { key: 'v', display: 'v' },
    ],
    niveau: 'vwo', thema: 'overige',
    answers: { m: 'h/(lambda*v)', v: 'h/(lambda*m)' },
  },
  {
    id: 'deeltje_doosje',
    display: 'E_n = \\dfrac{n^2 h^2}{8 m L^2}',
    variables: { 'E_n': 'energie van niveau n', n: 'kwantumgetal', h: 'constante van Planck', m: 'massa', L: 'lengte van het doosje' },
    solveFor: [
      { key: 'm', display: 'm' },
      { key: 'L', display: 'L' },
      { key: 'n', display: 'n' },
    ],
    niveau: 'vwo', thema: 'overige',
    answers: { m: '(n^2*h^2)/(8*En*L^2)', L: 'sqrt((n^2*h^2)/(8*En*m))', n: 'sqrt(8*m*L^2*En)/h' },
  },
  {
    id: 'dosisequivalent',
    display: 'H = w_R \\cdot D',
    variables: { H: 'dosisequivalent', 'w_R': 'stralingsweegfactor', D: 'stralingsdosis' },
    solveFor: [
      { key: 'wR', display: 'w_R' },
      { key: 'D', display: 'D' },
    ],
    niveau: 'beide', thema: 'overige',
    answers: { wR: 'H/D', D: 'H/wR' },
  },
  {
    id: 'activiteit_halvering',
    display: 'A = A_0 \\cdot \\left(\\tfrac{1}{2}\\right)^{n}',
    variables: { A: 'activiteit na n halveringstijden', 'A_0': 'beginactiviteit', n: 'aantal halveringstijden' },
    solveFor: [
      { key: 'A0', display: 'A_0' },
    ],
    niveau: 'beide', thema: 'overige',
    answers: { A0: 'A/0.5^n' },
  },
  {
    id: 'verzwakking',
    display: 'I = I_0 \\cdot \\left(\\tfrac{1}{2}\\right)^{n}',
    variables: { I: 'doorgelaten intensiteit', 'I_0': 'opvallende intensiteit', n: 'aantal halveringsdiktes (d gedeeld door d½)' },
    solveFor: [
      { key: 'I0', display: 'I_0' },
    ],
    niveau: 'beide', thema: 'overige',
    answers: { I0: 'I/0.5^n' },
  },

  // ── F OPTICA ──────────────────────────────────────────────────

  {
    id: 'snellius',
    display: '\\dfrac{\\sin i}{\\sin r} = n_{1 \\to 2}',
    variables: { i: 'invalshoek', r: 'brekingshoek', 'n_{1\\to2}': 'brekingsindex' },
    solveFor: [
      { key: 'n', display: 'n_{1 \\to 2}' },
    ],
    niveau: 'beide', thema: 'optica',
    answers: { n: 'sin(i)/sin(r)' },
  },
  {
    id: 'lenzen',
    display: '\\dfrac{1}{b} + \\dfrac{1}{v} = \\dfrac{1}{f}',
    variables: { b: 'beeldafstand', v: 'voorwerpsafstand', f: 'brandpuntsafstand' },
    solveFor: [
      { key: 'b', display: 'b' },
      { key: 'v', display: 'v' },
      { key: 'f', display: 'f' },
    ],
    niveau: 'beide', thema: 'optica',
    answers: { b: '(v*f)/(v-f)', v: '(b*f)/(b-f)', f: '(b*v)/(b+v)' },
  },
  {
    id: 'vergroting',
    display: 'N = \\dfrac{b}{v}',
    variables: { N: 'lineaire vergroting', b: 'beeldafstand', v: 'voorwerpsafstand' },
    solveFor: [
      { key: 'b', display: 'b' },
      { key: 'v', display: 'v' },
    ],
    niveau: 'beide', thema: 'optica',
    answers: { b: 'N*v', v: 'b/N' },
  },
  {
    id: 'lenssterkte',
    display: 'S = \\dfrac{1}{f}',
    variables: { S: 'lenssterkte', f: 'brandpuntsafstand' },
    solveFor: [
      { key: 'f', display: 'f' },
    ],
    niveau: 'beide', thema: 'optica',
    answers: { f: '1/S' },
  },
  {
    id: 'brekingsindex',
    display: 'n_{1 \\to 2} = \\dfrac{n_2}{n_1} = \\dfrac{c_1}{c_2}',
    variables: { 'n_{1\\to2}': 'relatieve brekingsindex', 'n_1': 'brekingsindex medium 1', 'n_2': 'brekingsindex medium 2', 'c_1': 'lichtsnelheid in medium 1', 'c_2': 'lichtsnelheid in medium 2' },
    solveFor: [
      { key: 'n1', display: 'n_1' },
      { key: 'n2', display: 'n_2' },
      { key: 'c1', display: 'c_1' },
      { key: 'c2', display: 'c_2' },
    ],
    niveau: 'beide', thema: 'optica',
    answers: { n1: 'n2/n12', n2: 'n12*n1', c1: 'n12*c2', c2: 'c1/n12' },
  },
];

const THEMAS = {
  mechanica:     { label: 'Mechanica',              letter: 'A', kleur: '#3b82f6' },
  trillingen:    { label: 'Trillingen & golven',    letter: 'B', kleur: '#8b5cf6' },
  warmte:        { label: 'Vloeistoffen & warmte',  letter: 'C', kleur: '#f97316' },
  elektriciteit: { label: 'Elektriciteit',          letter: 'D', kleur: '#eab308' },
  overige:       { label: 'Overige onderwerpen',    letter: 'E', kleur: '#ec4899' },
  optica:        { label: 'Optica (optioneel)',      letter: 'F', kleur: '#14b8a6', optioneel: true },
};

// Node-export voor unit tests (genegeerd in de browser)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FORMULAS, THEMAS };
}