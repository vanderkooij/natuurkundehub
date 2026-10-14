import { begrens } from "./signaal";

/**
 * De buitenwereld rond het bord: hoeveel licht er op de lichtsensor valt en
 * hoe warm het bij de temperatuursensor is. Een lamp, kachel of ventilator aan
 * het relais werkt hierop terug, zodat een thermostaat echt regelt en een
 * straatlantaarn met de sensor onder de lamp gaat knipperen (werkboek, opdracht 8b).
 */

/** Wat de gebruiker instelt; hoort bij de schakeling. */
export interface OmgevingInstelling {
  /** Daglicht op de lichtsensor, in lux. */
  licht: number;
  /** Temperatuur waar alles naartoe zakt zonder kachel, in °C. */
  buiten: number;
  /** De kachel met de hand aangezet (los van het relais). */
  kachel: boolean;
}

export const standaardOmgeving = (): OmgevingInstelling => ({
  licht: 400,
  buiten: 20,
  kachel: false,
});

/**
 * Wat er gebeurt op één plek: bij een sensor, of in de ruimte als geheel
 * (de plek ""). Verandert met de tijd.
 */
export interface PlekToestand {
  /** Temperatuur op deze plek, in °C. */
  temperatuur: number;
  /** Extra licht van lampen op deze plek, in lux. */
  lamplicht: number;
  /** Wat een lichtsensor hier meet: volgt het licht met wat vertraging, zoals een LDR. */
  gemetenLicht: number;
  /** Wat een temperatuursensor hier meet: volgt de temperatuur met wat vertraging. */
  gemetenTemperatuur: number;
}

export const nieuwePlek = (inst: OmgevingInstelling): PlekToestand => ({
  temperatuur: inst.buiten,
  lamplicht: 0,
  gemetenLicht: inst.licht,
  gemetenTemperatuur: inst.buiten,
});

/**
 * Een apparaat aan een relais, zoals het op een plek werkt. `gloed` is hoe
 * ver het aan staat (0 tot 1, de lamp gloeit op, het element warmt op);
 * `factor` hoe sterk het op deze plek werkt: 1 zoals naast de sensor, 0 als
 * het licht of de warmte er niet komt.
 */
export interface Invloed {
  soort: "lamp" | "kachel" | "ventilator";
  gloed: number;
  factor: number;
}

export const LICHT_MAX = 1000;
/** Licht van de lamp aan het relais op de lichtsensor, in lux. */
export const LAMP_LUX = 600;
/** Zo snel gloeit de lamp op of dooft hij uit, in s. */
export const LAMP_TAU = 0.4;
/** Een LDR reageert traag op licht, in s. */
export const LDR_TAU = 1;
/** Zo snel warmt het element van de kachel op of koelt het af, in s. */
export const KACHEL_TAU = 4;
/** Zo snel draait de ventilator op of uit, in s. */
export const VENTILATOR_TAU = 0.4;
/** Zo snel volgt de temperatuursensor de temperatuur, in s. */
export const TEMPSENSOR_TAU = 3;
/** Zonder kachel zakt de temperatuur met deze tijdconstante naar buiten, in s. */
export const KOEL_TAU = 25;
/** Met de ventilator aan gaat afkoelen zoveel keer sneller. */
export const VENTILATOR_FACTOR = 3;
/** Een kachel die blijft branden haalt deze temperatuur boven buiten, in °C. */
export const KACHEL_MAX = 40;

/** Licht in lux naar spanning: hoe lichter, hoe hoger, maar steeds minder per lux (zoals een LDR). */
export const lichtNaarSpanning = (lux: number): number =>
  begrens((5 * Math.max(0, lux)) / (Math.max(0, lux) + 250));

/** Temperatuur naar spanning: hoe warmer, hoe hoger (0 °C is 0,5 V, 100 °C is 4,5 V). */
export const temperatuurNaarSpanning = (t: number): number =>
  begrens(0.5 + 0.04 * t);

/** Hoe snel elk apparaat aan- of uitgaat, in s. */
export const GLOED_TAU = {
  lamp: LAMP_TAU,
  kachel: KACHEL_TAU,
  ventilator: VENTILATOR_TAU,
} as const;

/** Eén stap in de tijd voor één plek. */
export function plekStap(
  p: PlekToestand,
  inst: OmgevingInstelling,
  invloeden: Invloed[],
  dt: number,
): void {
  let lamp = 0,
    kachel = 0,
    wind = 0;
  for (const i of invloeden) {
    const w = i.gloed * i.factor;
    if (i.soort === "lamp") lamp += w;
    else if (i.soort === "kachel") kachel += w;
    else wind += w;
  }
  p.lamplicht = LAMP_LUX * lamp;
  const licht = Math.max(0, inst.licht + p.lamplicht);
  p.gemetenLicht += (licht - p.gemetenLicht) * (1 - Math.exp(-dt / LDR_TAU));

  // Newton: opwarmen door de kachel, afkoelen naar buiten; de ventilator laat
  // sneller afkoelen. Het element warmt eerst op (de gloed): zonder die
  // traagheid zou een thermostaat elke milliseconde aan en uit klapperen.
  const tau = KOEL_TAU / (1 + (VENTILATOR_FACTOR - 1) * Math.min(1, wind));
  const verwarmen = (KACHEL_MAX / KOEL_TAU) * kachel;
  p.temperatuur += (verwarmen - (p.temperatuur - inst.buiten) / tau) * dt;
  p.gemetenTemperatuur +=
    (p.temperatuur - p.gemetenTemperatuur) *
    (1 - Math.exp(-dt / TEMPSENSOR_TAU));
}
