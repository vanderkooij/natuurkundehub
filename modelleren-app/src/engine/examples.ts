import type { SvRow } from "./simulate";

export interface Example {
  name: string;
  desc: string;
  sv: SvRow[];
  model: string;
  iter: number;
  defaultX: string;
  defaultY: string;
}

// Voorbeeldmodellen, geport uit de vanilla tool.
export const EXAMPLES: Example[] = [
  {
    name: "Constante snelheid",
    desc: "Een object beweegt met constante snelheid. Plot x tegen t voor een rechte lijn. De helling van de lijn is gelijk aan de snelheid. Onderzoeksvraag: wat verandert er als je v aanpast?",
    sv: [
      { name: "t", value: "0", unit: "s" },
      { name: "dt", value: "0.1", unit: "s" },
      { name: "x", value: "0", unit: "m" },
      { name: "v", value: "10", unit: "m/s" },
    ],
    model: "x = x + v*dt\nt = t + dt",
    iter: 1000,
    defaultX: "t",
    defaultY: "x",
  },
  {
    name: "Vrije val",
    desc: "Een object valt vanuit 100 m hoogte naar beneden onder invloed van de zwaartekracht. h is de hoogte en neemt af. De simulatie stopt zodra h ≤ 0. Plot h tegen t voor een kwadratische kromme. Plot v tegen t voor een rechte lijn. Controleer: na ≈ 4,5 s raakt het object de grond met v ≈ 44 m/s. Onderzoeksvraag: hoe groot is de afwijking als je dt vergroot naar 1 s?",
    sv: [
      { name: "t", value: "0", unit: "s" },
      { name: "dt", value: "0.1", unit: "s" },
      { name: "h", value: "100", unit: "m" },
      { name: "v", value: "0", unit: "m/s" },
      { name: "a", value: "9.8", unit: "m/s²" },
    ],
    model: "v = v + a*dt\nh = h - v*dt\nals h <= 0 dan STOP\nt = t + dt",
    iter: 1000,
    defaultX: "t",
    defaultY: "h",
  },
  {
    name: "Val met luchtweerstand",
    desc: "Een object valt van 1000 m hoogte door lucht met luchtweerstand evenredig met v². Plot v tegen t om de eindsnelheid te zien. De eindsnelheid is bereikt als de versnelling nul is: v_eind = √(m·g/k) ≈ 44 m/s. De simulatie stopt zodra h ≤ 0. Onderzoeksvraag: wat gebeurt er als je k verdubbelt? En als je m verdubbelt?",
    sv: [
      { name: "t", value: "0", unit: "s" },
      { name: "dt", value: "0.1", unit: "s" },
      { name: "h", value: "1000", unit: "m" },
      { name: "v", value: "0", unit: "m/s" },
      { name: "m", value: "10", unit: "kg" },
      { name: "k", value: "0.05", unit: "kg/m" },
      { name: "g", value: "9.8", unit: "m/s²" },
    ],
    model: "Fw = k*v*v\nFres = m*g - Fw\na = Fres/m\nv = v + a*dt\nh = h - v*dt\nals h <= 0 dan STOP\nt = t + dt",
    iter: 2000,
    defaultX: "t",
    defaultY: "v",
  },
  {
    name: "Stuiterende bal",
    desc: "Een bal valt en stuitert op de grond. De bouncefactor b bepaalt hoeveel energie behouden blijft bij elke stuit. Plot x tegen t. Onderzoeksvraag: hoeveel stuiteringen zijn er voor de bal tot rust komt? Wat verandert er als je b aanpast?",
    sv: [
      { name: "t", value: "0", unit: "s" },
      { name: "dt", value: "0.01", unit: "s" },
      { name: "x", value: "10", unit: "m" },
      { name: "v", value: "0", unit: "m/s" },
      { name: "a", value: "9.8", unit: "m/s²" },
      { name: "b", value: "0.8", unit: "" },
    ],
    model: "v = v + a*dt\nals x <= 0 dan v = -b*v\nx = x - v*dt\nt = t + dt",
    iter: 2000,
    defaultX: "t",
    defaultY: "x",
  },
  {
    name: "Bungee jumper",
    desc: "Een bungee jumper springt van een brug op hoogte h0. De hoogte h neemt af bij het vallen. Het touw (rustlengte L) begint te trekken als h kleiner is dan h0 - L. De oscillaties doven uit door demping b. Plot h tegen t. Onderzoeksvraag: hoe ver valt de jumper maximaal? Wat is de invloed van k op de eindpositie?",
    sv: [
      { name: "t", value: "0", unit: "s" },
      { name: "dt", value: "0.01", unit: "s" },
      { name: "h", value: "50", unit: "m" },
      { name: "h0", value: "50", unit: "m" },
      { name: "v", value: "0", unit: "m/s" },
      { name: "m", value: "80", unit: "kg" },
      { name: "g", value: "9.8", unit: "m/s²" },
      { name: "k", value: "60", unit: "N/m" },
      { name: "L", value: "10", unit: "m" },
      { name: "b", value: "15", unit: "" },
    ],
    model:
      "als h < h0 - L dan Fe = k*(h0 - L - h)\nals h >= h0 - L dan Fe = 0\nFw = b*v\nFres = m*g - Fe - Fw\na = Fres/m\nv = v + a*dt\nh = h - v*dt\nt = t + dt",
    iter: 3000,
    defaultX: "t",
    defaultY: "h",
  },
  {
    name: "RC-circuit opladen en ontladen",
    desc: "Een condensator laadt op via een weerstand tot t_schakel, daarna ontlaadt hij. Plot U tegen t om beide exponentiële processen te zien. De tijdconstante is τ = R·C = 1 s. Onderzoeksvraag: wat verandert er als je R of C aanpast? Wat als je t_schakel verandert?",
    sv: [
      { name: "t", value: "0", unit: "s" },
      { name: "dt", value: "0.001", unit: "s" },
      { name: "U", value: "0", unit: "V" },
      { name: "Ubron", value: "5", unit: "V" },
      { name: "R", value: "1000", unit: "Ω" },
      { name: "C", value: "0.001", unit: "F" },
      { name: "t_schakel", value: "3", unit: "s" },
    ],
    model:
      "als t < t_schakel dan U = U + (Ubron - U)/(R*C)*dt\nals t >= t_schakel dan U = U - U/(R*C)*dt\nt = t + dt",
    iter: 8000,
    defaultX: "t",
    defaultY: "U",
  },
  {
    name: "Radioactief verval",
    desc: "Het aantal radioactieve kernen neemt exponentieel af. Plot N tegen t om het verval te zien. Plot A tegen t voor de activiteit. Na één halfwaardetijd is N gehalveerd. Lees de halfwaardetijd af uit de grafiek en vergelijk met de startwaarde t_half. Onderzoeksvraag: wat verandert er als je t_half aanpast?",
    sv: [
      { name: "t_half", value: "1e9", unit: "s" },
      { name: "N", value: "1e21", unit: "" },
      { name: "t", value: "0", unit: "s" },
    ],
    model: "dt = t_half/1000\nlambda = 0.693/t_half\nA = lambda*N\nN = N - A*dt\nt = t + dt",
    iter: 1000,
    defaultX: "t",
    defaultY: "N",
  },
  {
    name: "Harmonische oscillator",
    desc: "Een massa aan een veer oscilleert zonder energieverlies. Plot x tegen t voor een sinusvorm. De theoretische periode is T=2π√(m/k)≈2,0 s. Gebruik de pijltjestoetsen om de periode af te lezen. Onderzoeksvraag: verandert de periode als je de beginuitwijking aanpast? En als je m of k aanpast?\n\nDit is een ideaal model zonder demping of wrijving — vandaar de perfecte sinusvorm die nooit uitdooft. In werkelijkheid verliest een oscillator altijd energie. Voeg als uitbreiding een dempingsterm toe aan de kracht, bijvoorbeeld F = -k*x - b*v, waarbij b de dempingscoëfficiënt is. Je ziet dan hoe de oscillatie langzaam uitdooft — dit heet een gedempte harmonische oscillator.",
    sv: [
      { name: "t", value: "0", unit: "s" },
      { name: "dt", value: "0.01", unit: "s" },
      { name: "x", value: "1", unit: "m" },
      { name: "v", value: "0", unit: "m/s" },
      { name: "m", value: "1", unit: "kg" },
      { name: "k", value: "10", unit: "N/m" },
    ],
    model: "Fres = -k*x\na = Fres/m\nv = v + a*dt\nx = x + v*dt\nt = t + dt",
    iter: 2000,
    defaultX: "t",
    defaultY: "x",
  },
  {
    name: "Planetenbaan",
    desc: "De aarde beweegt om de zon onder invloed van de zwaartekracht. Plot y tegen x om de baan te zien. Met dt=3600 s en 10000 iteraties zie je bijna één volledige omloop (≈416 dagen). De baan is bijna cirkelvormig. Onderzoeksvraag: wat gebeurt er als je vy aanpast? Bij welke waarde verlaat de planeet zijn baan?",
    sv: [
      { name: "t", value: "0", unit: "s" },
      { name: "dt", value: "3600", unit: "s" },
      { name: "x", value: "1.5e11", unit: "m" },
      { name: "y", value: "0", unit: "m" },
      { name: "vx", value: "0", unit: "m/s" },
      { name: "vy", value: "29783", unit: "m/s" },
      { name: "M", value: "2e30", unit: "kg" },
      { name: "G", value: "6.67e-11", unit: "" },
    ],
    model:
      "r = sqrt(x*x+y*y)\nF = G*M/(r*r)\nax = -F*x/r\nay = -F*y/r\nvx = vx + ax*dt\nvy = vy + ay*dt\nx = x + vx*dt\ny = y + vy*dt\nt = t + dt",
    iter: 10000,
    defaultX: "x",
    defaultY: "y",
  },
];
