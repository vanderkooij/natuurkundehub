import {
  MODULES,
  openSpanning,
  RELAIS_APPARATEN,
  SENSOREN,
  RELAIS_SCHAKELTIJD,
  type ModuleDef,
} from "./modules";
import {
  GLOED_TAU,
  KACHEL_TAU,
  nieuwePlek,
  plekStap,
  standaardOmgeving,
  type Invloed,
  type OmgevingInstelling,
  type PlekToestand,
} from "./omgeving";
import { isHoog } from "./signaal";
import type { ModuleInstantie, Schakeling, Toestand } from "./types";

/** Lengte van één tik simulatietijd, in s. */
export const TIK = 0.001;

/**
 * Hoe sterk elk apparaat (aan een relais) op elke sensor werkt: per sensor-id
 * per relais-id een factor, 1 zoals naast de sensor, 0 als het licht of de
 * warmte er niet komt. Hangt af van waar ze op het werkvlak staan; dat rekent
 * het bord uit. Ontbreekt een getal, dan is de factor 1.
 */
export type Opstelling = Record<string, Record<string, number>>;

/** De plek van de ruimte als geheel, voor als er geen sensor is. */
const RUIMTE = "";

/** Rondes per tik zolang de schakeling niet tot rust komt. */
const ONRUSTIG_MAX = 4;

interface Knoop {
  m: ModuleInstantie;
  def: ModuleDef;
  toestand: Toestand;
  uit: Record<string, number>;
  /** Per ingang: welke uitgang erop aangesloten is (of niets). */
  bron: Record<string, { knoop: Knoop; bus: string } | undefined>;
}

/**
 * Rekent de schakeling door in tikken van 1 ms. Binnen een tik wordt elke
 * module in volgorde van de signaalstroom doorgerekend, en dat herhaald tot
 * niets meer verandert. Zo werken terugkoppelingen (een uitgang terug naar een
 * eerdere ingang) zonder dat de rekenkern vastloopt, en geeft een vertakking
 * die weer samenkomt geen valse piekjes die een teller zou meetellen.
 */
export class Simulator {
  private knopen: Knoop[] = [];
  private perId = new Map<string, Knoop>();
  private tijdTeVeel = 0;
  /** Simulatietijd in s. */
  tijd = 0;
  private instelling: OmgevingInstelling = standaardOmgeving();
  /** Licht en temperatuur per plek: bij elke sensor, en in de ruimte (""). */
  private plekken = new Map<string, PlekToestand>();
  private opstelling: Opstelling | null = null;
  /** Een kachel die met de hand aan staat (los van een relais), 0 tot 1. */
  private handGloed = 0;
  /** Kwam de laatste tik niet tot rust (bijvoorbeeld een invertor met zijn uitgang op zijn eigen ingang)? */
  instabiel = false;

  constructor(schakeling: Schakeling) {
    this.zetSchakeling(schakeling);
  }

  /**
   * Nieuwe of gewijzigde schakeling. Modules met hetzelfde id houden hun
   * toestand (geheugen, tellerstand), zodat een draad erbij geen reset geeft.
   */
  zetSchakeling(s: Schakeling): void {
    this.instelling = s.omgeving ?? standaardOmgeving();
    // De ruimte begint bij de buitentemperatuur; een nieuwe sensor begint
    // zoals de ruimte nu is.
    if (!this.plekken.has(RUIMTE))
      this.plekken.set(RUIMTE, nieuwePlek(this.instelling));
    const ruimte = this.plekken.get(RUIMTE)!;
    const plekken = new Map([[RUIMTE, ruimte]]);
    for (const m of s.modules)
      if (m.soort === "sensor")
        plekken.set(m.id, this.plekken.get(m.id) ?? { ...ruimte });
    this.plekken = plekken;
    const oud = this.perId;
    this.perId = new Map();
    const knopen: Knoop[] = s.modules.map((m) => {
      const def = MODULES[m.soort];
      const vorige = oud.get(m.id);
      const knoop: Knoop = {
        m,
        def,
        toestand:
          vorige && vorige.m.soort === m.soort
            ? vorige.toestand
            : (def.toestand?.() ?? {}),
        uit: vorige && vorige.m.soort === m.soort ? vorige.uit : {},
        bron: {},
      };
      for (const bus of def.uitgangen) knoop.uit[bus] ??= 0;
      this.perId.set(m.id, knoop);
      return knoop;
    });
    for (const d of s.draden) {
      const van = this.perId.get(d.van.module);
      const naar = this.perId.get(d.naar.module);
      if (van && naar) naar.bron[d.naar.bus] = { knoop: van, bus: d.van.bus };
    }
    this.knopen = volgorde(knopen);
    this.rust();
  }

  /** Laat dt seconden simulatietijd verlopen. */
  stap(dt: number): void {
    this.tijdTeVeel += dt;
    while (this.tijdTeVeel >= TIK - 1e-12) {
      this.tijdTeVeel -= TIK;
      this.tijd += TIK;
      this.relaisStap(TIK);
      this.omgevingStap(TIK);
      for (const k of this.knopen) k.def.tik?.(k.toestand, k.m.params, TIK);
      this.rust();
    }
  }

  /** Rekent zonder dat de tijd verloopt, bijvoorbeeld na een druk op een knop. */
  rust(): void {
    // Na een onrustige tik (een kring die blijft omslaan, zoals een invertor op
    // zichzelf) maar een paar rondes: die kring wordt toch niet rustig, en zo
    // blijft de tool vlot. De rest van de schakeling loopt over de volgende tikken mee.
    const max = this.instabiel ? ONRUSTIG_MAX : this.knopen.length + 10;
    for (let ronde = 0; ronde < max; ronde++) {
      let veranderd = false;
      for (const k of this.knopen) {
        const nieuw = k.def.bereken({
          in: (bus) => this.ingang(k, bus),
          params: k.m.params,
          toestand: k.toestand,
          // De sensor rekent met wat hij op zijn plek meet (met vertraging).
          omgeving: this.meetOp(k.m.id),
        });
        for (const bus of k.def.uitgangen) {
          const u = nieuw[bus] ?? 0;
          if (Math.abs(u - (k.uit[bus] ?? 0)) > 1e-9) {
            k.uit[bus] = u;
            veranderd = true;
          }
        }
      }
      if (!veranderd) {
        this.instabiel = false;
        return;
      }
    }
    this.instabiel = true;
  }

  private ingang(k: Knoop, bus: string): number {
    const b = k.bron[bus];
    return b ? (b.knoop.uit[b.bus] ?? 0) : openSpanning(k.def, bus);
  }

  /** Spanning op een bus, ingang of uitgang, in V. */
  spanning(moduleId: string, bus: string): number {
    const k = this.perId.get(moduleId);
    if (!k) return 0;
    if (k.def.ingangen.includes(bus)) return this.ingang(k, bus);
    return k.uit[bus] ?? 0;
  }

  /** Wat een sensor op zijn plek meet: licht in lux, temperatuur in °C. */
  private meetOp(id: string): { licht: number; temperatuur: number } {
    const p = this.plekken.get(id) ?? this.plekken.get(RUIMTE)!;
    return { licht: p.gemetenLicht, temperatuur: p.gemetenTemperatuur };
  }

  /**
   * Licht en temperatuur bij één sensor (of in de ruimte, met id ""): wat de
   * sensor meet, de temperatuur zelf en het licht van de lampen daar.
   */
  plek(id: string): {
    licht: number;
    temperatuur: number;
    gemetenTemperatuur: number;
    lamplicht: number;
  } {
    const p = this.plekken.get(id) ?? this.plekken.get(RUIMTE)!;
    return {
      licht: p.gemetenLicht,
      temperatuur: p.temperatuur,
      gemetenTemperatuur: p.gemetenTemperatuur,
      lamplicht: p.lamplicht,
    };
  }

  /** Waar het deze sensor om gaat: licht of temperatuur (of niets). */
  private sensorSoort(id: string) {
    const k = this.perId.get(id);
    return k?.m.soort === "sensor"
      ? SENSOREN[Number(k.m.params.sensor ?? 0)]
      : undefined;
  }

  /**
   * Voor het paneel Omgeving: het licht bij de eerste lichtsensor en de
   * temperatuur bij de eerste temperatuursensor, anders in de ruimte.
   */
  omgeving(): {
    licht: number;
    temperatuur: number;
    gemetenTemperatuur: number;
    lamplicht: number;
  } {
    const eerste = (soort: string) =>
      [...this.plekken.keys()].find((id) => this.sensorSoort(id) === soort) ??
      RUIMTE;
    const l = this.plek(eerste("licht"));
    const t = this.plek(eerste("temperatuur"));
    return {
      licht: l.licht,
      lamplicht: l.lamplicht,
      temperatuur: t.temperatuur,
      gemetenTemperatuur: t.gemetenTemperatuur,
    };
  }

  /** Waar elk apparaat staat ten opzichte van elke sensor (zie `Opstelling`). */
  zetOpstelling(o: Opstelling | null): void {
    this.opstelling = o;
  }

  /** Hoe ver het apparaat aan dit relais aan staat: 0 (uit) tot 1 (vol aan). */
  relaisGloed(moduleId: string): number {
    return Number(this.perId.get(moduleId)?.toestand.gloed ?? 0);
  }

  /** Eén stap voor licht en temperatuur, op elke plek. */
  private omgevingStap(dt: number) {
    const aan = this.instelling.kachel ? 1 : 0;
    this.handGloed += (aan - this.handGloed) * (1 - Math.exp(-dt / KACHEL_TAU));
    const apparaten: { id: string; soort: Invloed["soort"]; gloed: number }[] =
      [];
    for (const k of this.knopen) {
      if (k.m.soort !== "relais") continue;
      const soort = RELAIS_APPARATEN[Number(k.m.params.apparaat ?? 0)];
      if (soort)
        apparaten.push({ id: k.m.id, soort, gloed: this.relaisGloed(k.m.id) });
    }
    for (const [id, p] of this.plekken) {
      const invloeden: Invloed[] = apparaten.map((a) => ({
        soort: a.soort,
        gloed: a.gloed,
        factor: id === RUIMTE ? 1 : (this.opstelling?.[id]?.[a.id] ?? 1),
      }));
      // Een kachel die met de hand aan staat, warmt overal even hard.
      invloeden.push({ soort: "kachel", gloed: this.handGloed, factor: 1 });
      plekStap(p, this.instelling, invloeden, dt);
    }
  }

  /** De contacten van een relais klappen pas om als de ingang lang genoeg in de nieuwe stand blijft. */
  private relaisStap(dt: number) {
    for (const k of this.knopen) {
      if (k.m.soort !== "relais") continue;
      // Het apparaat gloeit op of dooft uit (lamp, kachelelement, ventilator).
      const soort =
        RELAIS_APPARATEN[Number(k.m.params.apparaat ?? 0)] ?? "lamp";
      const doel = k.toestand.gesloten === true ? 1 : 0;
      const gloed = Number(k.toestand.gloed ?? 0);
      k.toestand.gloed =
        gloed + (doel - gloed) * (1 - Math.exp(-dt / GLOED_TAU[soort]));
      const wil = isHoog(this.ingang(k, "in"));
      if (wil === (k.toestand.gesloten === true)) {
        k.toestand.wacht = 0;
        continue;
      }
      k.toestand.wacht = Number(k.toestand.wacht ?? 0) + dt;
      if (Number(k.toestand.wacht) >= RELAIS_SCHAKELTIJD - 1e-9) {
        k.toestand.gesloten = wil;
        k.toestand.wacht = 0;
      }
    }
  }

  /** Zijn de contacten van dit relais dicht? */
  relaisGesloten(moduleId: string): boolean {
    return this.perId.get(moduleId)?.toestand.gesloten === true;
  }

  /** Korte tekst die verandert zodra een spanning (op 0,01 V) of toestand verandert. */
  handtekening(): string {
    let s = "";
    for (const k of this.knopen) {
      for (const bus of k.def.uitgangen)
        s += Math.round((k.uit[bus] ?? 0) * 100) + ",";
      // De tellerstand staat ook op het display; fase en dergelijke tellen niet mee.
      s +=
        (k.toestand.stand ?? "") +
        (k.toestand.gesloten === true ? "g" : "") +
        ";";
    }
    for (const p of this.plekken.values())
      s += `|${Math.round(p.temperatuur * 10)},${Math.round(p.gemetenLicht)}`;
    // De gloed van een apparaat (een lamp die opgloeit) in stappen van 5 %.
    for (const k of this.knopen)
      if (k.m.soort === "relais")
        s += `|${Math.round(this.relaisGloed(k.m.id) * 20)}`;
    return s;
  }

  toestand(moduleId: string): Readonly<Toestand> | undefined {
    return this.perId.get(moduleId)?.toestand;
  }

  /** Iets dat de gebruiker doet zonder een instelling: tikken op de geluidsensor. */
  tikOpGeluidsensor(moduleId: string, piek: number): void {
    const k = this.perId.get(moduleId);
    if (k?.m.soort !== "geluidsensor") return;
    k.toestand.niveau = Math.max(Number(k.toestand.niveau), piek);
    this.rust();
  }
}

/**
 * Volgorde van de signaalstroom: eerst modules waarvan alle bronnen al aan de
 * beurt waren. Bij een kring wordt de module met de minste openstaande bronnen
 * eerst genomen; de herhaling in `rust` doet de rest.
 */
function volgorde(knopen: Knoop[]): Knoop[] {
  const open = new Map<Knoop, number>();
  const volgers = new Map<Knoop, Knoop[]>();
  for (const k of knopen) {
    open.set(k, 0);
    volgers.set(k, []);
  }
  for (const k of knopen) {
    for (const b of Object.values(k.bron)) {
      if (!b) continue;
      open.set(k, open.get(k)! + 1);
      volgers.get(b.knoop)!.push(k);
    }
  }
  const resultaat: Knoop[] = [];
  const gedaan = new Set<Knoop>();
  while (resultaat.length < knopen.length) {
    let volgende: Knoop | undefined;
    for (const k of knopen) {
      if (gedaan.has(k)) continue;
      if (!volgende || open.get(k)! < open.get(volgende)!) volgende = k;
      if (open.get(k) === 0) break;
    }
    const k = volgende!;
    gedaan.add(k);
    resultaat.push(k);
    for (const v of volgers.get(k)!) open.set(v, open.get(v)! - 1);
  }
  return resultaat;
}
