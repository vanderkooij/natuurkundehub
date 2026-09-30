/**
 * Kant-en-klare voorbeeldschakelingen. De id's zijn placeholders; `loadDoc`
 * hernummert ze bij het inladen naar verse id's.
 */
import type { CircuitComponent, CircuitDoc, ComponentType } from "./types";

class Build {
  vertices: Record<string, { id: string; x: number; y: number }> = {};
  components: CircuitComponent[] = [];
  wires: { id: string; nodes: string[] }[] = [];
  labels: { id: string; x: number; y: number; text: string; boxed?: boolean }[] = [];
  private n = 0;

  v(x: number, y: number): string {
    const id = `pv${this.n++}`;
    this.vertices[id] = { id, x, y };
    return id;
  }
  comp(type: ComponentType, v0: string, v1: string, values: CircuitComponent["values"] = {}): void {
    this.components.push({ id: `pc${this.n++}`, type, v0, v1, mirrored: false, values });
  }
  wire(...nodes: string[]): void {
    this.wires.push({ id: `pw${this.n++}`, nodes });
  }
  label(x: number, y: number, text: string, boxed = false): void {
    this.labels.push({ id: `pt${this.n++}`, x, y, text, boxed });
  }
  doc(): CircuitDoc {
    return { vertices: this.vertices, components: this.components, wires: this.wires, labels: this.labels };
  }
}

// Alle coördinaten zijn veelvouden van het raster (30 px) en componenten zijn
// standaard 120 lang (vier rasterstappen), net als wanneer je ze zelf neerzet.
// Dan lijnt alles uit en kun je er meteen aan verder bouwen.

// ── Serieschakeling: bron + 2 lampen in serie ────────────────────────────────
function serie(): CircuitDoc {
  const b = new Build();
  const aPlus = b.v(300, 420);
  const aMin = b.v(420, 420);
  const c = b.v(180, 180);
  const d = b.v(300, 180);
  const e = b.v(420, 180);
  const f = b.v(540, 180);
  const bl = b.v(180, 420);
  const br = b.v(540, 420);
  b.comp("source", aPlus, aMin, { emf: 6 });
  b.comp("lamp", c, d, { resistance: 6 });
  b.comp("lamp", e, f, { resistance: 6 });
  b.wire(aPlus, bl, c);
  b.wire(d, e);
  b.wire(f, br, aMin);
  return b.doc();
}

// ── Parallelschakeling: bron + 2 lampen parallel ─────────────────────────────
function parallel(): CircuitDoc {
  const b = new Build();
  const sPlus = b.v(180, 180);
  const sMin = b.v(180, 300);
  const l1t = b.v(360, 180);
  const l1b = b.v(360, 300);
  const l2t = b.v(540, 180);
  const l2b = b.v(540, 300);
  b.comp("source", sPlus, sMin, { emf: 6 });
  b.comp("lamp", l1t, l1b, { resistance: 6 });
  b.comp("lamp", l2t, l2b, { resistance: 6 });
  b.wire(sPlus, l1t, l2t);
  b.wire(sMin, l1b, l2b);
  return b.doc();
}

// ── Combischakeling: R1 en R2 parallel, samen in serie met R3 ────────────────
function combiParallelSerie(): CircuitDoc {
  const b = new Build();
  const sPlus = b.v(150, 150);
  const sMin = b.v(150, 390);
  const links = b.v(300, 150);
  const rechts = b.v(480, 150);
  const r1l = b.v(330, 90);
  const r1r = b.v(450, 90);
  const r2l = b.v(330, 210);
  const r2r = b.v(450, 210);
  const r3t = b.v(600, 210);
  const r3b = b.v(600, 330);
  b.comp("source", sPlus, sMin, { emf: 6 });
  b.comp("resistor", r1l, r1r, { resistance: 20 });
  b.comp("resistor", r2l, r2r, { resistance: 30 });
  b.comp("resistor", r3t, r3b, { resistance: 10 });
  b.wire(sPlus, links);
  b.wire(r1l, b.v(300, 90), links, b.v(300, 210), r2l);
  b.wire(r1r, b.v(480, 90), rechts, b.v(480, 210), r2r);
  b.wire(rechts, b.v(600, 150), r3t);
  b.wire(r3b, b.v(600, 390), sMin);
  b.label(150, 30, "R1 en R2 parallel, samen in serie met R3.", true);
  return b.doc();
}

// ── Combischakeling: R1 en R2 in serie, samen parallel aan R3 ────────────────
function combiSerieParallel(): CircuitDoc {
  const b = new Build();
  const sPlus = b.v(150, 150);
  const sMin = b.v(150, 390);
  const r1t = b.v(360, 150);
  const mid = b.v(360, 270);
  const r2b = b.v(360, 390);
  const r3t = b.v(540, 210);
  const r3b = b.v(540, 330);
  b.comp("source", sPlus, sMin, { emf: 6 });
  b.comp("resistor", r1t, mid, { resistance: 10 });
  b.comp("resistor", mid, r2b, { resistance: 20 });
  b.comp("resistor", r3t, r3b, { resistance: 20 });
  b.wire(sPlus, r1t, b.v(540, 150), r3t);
  b.wire(sMin, r2b, b.v(540, 390), r3b);
  b.label(150, 60, "R1 en R2 in serie, samen parallel aan R3.", true);
  return b.doc();
}

// ── LED met voorschakelweerstand (brandt) ────────────────────────────────────
function ledCircuit(): CircuitDoc {
  const b = new Build();
  const sPlus = b.v(180, 180);
  const sMin = b.v(180, 300);
  const rL = b.v(300, 180);
  const rR = b.v(420, 180);
  const ledA = b.v(540, 180);
  const ledK = b.v(540, 300);
  b.comp("source", sPlus, sMin, { emf: 6 });
  b.comp("resistor", rL, rR, { resistance: 270 });
  b.comp("led", ledA, ledK, { color: "rood" });
  b.wire(sPlus, rL);
  b.wire(rR, ledA);
  b.wire(ledK, sMin);
  return b.doc();
}

// ── Spanningsdeler: 2 weerstanden + voltmeter over de onderste ───────────────
function spanningsdeler(): CircuitDoc {
  const b = new Build();
  const sPlus = b.v(180, 150);
  const sMin = b.v(180, 390);
  const r1t = b.v(420, 150);
  const mid = b.v(420, 270);
  const r2b = b.v(420, 390);
  b.comp("source", sPlus, sMin, { emf: 12 });
  b.comp("resistor", r1t, mid, { resistance: 10 });
  b.comp("resistor", mid, r2b, { resistance: 20 });
  b.wire(sPlus, r1t);
  b.wire(sMin, r2b);
  // voltmeter parallel over R2 (van middenknoop naar min)
  const vmA = b.v(600, 270);
  const vmB = b.v(600, 390);
  b.comp("voltmeter", vmA, vmB);
  b.wire(mid, vmA);
  b.wire(r2b, vmB);
  return b.doc();
}

// ── Lamp + schakelaar (open: klik de schakelaar dicht) ───────────────────────
function schakelaar(): CircuitDoc {
  const b = new Build();
  const sPlus = b.v(180, 180);
  const sMin = b.v(180, 300);
  const swL = b.v(300, 180);
  const swR = b.v(420, 180);
  const lampT = b.v(540, 180);
  const lampB = b.v(540, 300);
  b.comp("source", sPlus, sMin, { emf: 6 });
  b.comp("switch", swL, swR, { closed: false });
  b.comp("lamp", lampT, lampB, { resistance: 6 });
  b.wire(sPlus, swL);
  b.wire(swR, lampT);
  b.wire(lampB, sMin);
  return b.doc();
}

// ── Kortsluiting-demo: zekering beschermt de kring ───────────────────────────
// Sluit de schakelaar (parallel aan de lamp) → kortsluiting → de zekering
// draagt de piekstroom en brandt door; de lamp overleeft.
function zekering(): CircuitDoc {
  const b = new Build();
  const sPlus = b.v(180, 180);
  const sMin = b.v(180, 300);
  const fL = b.v(300, 180);
  const fR = b.v(420, 180);
  const lampT = b.v(540, 180);
  const lampB = b.v(540, 300);
  const swT = b.v(690, 180);
  const swB = b.v(690, 300);
  b.comp("source", sPlus, sMin, { emf: 6 });
  b.comp("fuse", fL, fR, { imax: 1 });
  b.comp("lamp", lampT, lampB, { resistance: 12 });
  b.comp("switch", swT, swB, { closed: false });
  b.wire(sPlus, fL);
  b.wire(fR, lampT, swT);
  b.wire(sMin, lampB, swB);
  return b.doc();
}

// ── Schemerschakelaar: spanningsdeler met LDR + voltmeter ────────────────────
// Minder licht → hogere R_LDR → hogere spanning over de LDR (de "sensorspanning").
function schemer(): CircuitDoc {
  const b = new Build();
  const sPlus = b.v(180, 150);
  const sMin = b.v(180, 390);
  const rT = b.v(420, 150);
  const mid = b.v(420, 270);
  const ldrB = b.v(420, 390);
  b.comp("source", sPlus, sMin, { emf: 6 });
  b.comp("resistor", rT, mid, { resistance: 1000 });
  b.comp("ldr", mid, ldrB, { env: 30 });
  b.wire(sPlus, rT);
  b.wire(sMin, ldrB);
  const vmA = b.v(600, 270);
  const vmB = b.v(600, 390);
  b.comp("voltmeter", vmA, vmB);
  b.wire(mid, vmA);
  b.wire(ldrB, vmB);
  b.label(180, 90, "Schemerschakelaar: klik de LDR en draai aan het licht.", true);
  return b.doc();
}

// ── Temperatuursensor: spanningsdeler met NTC + voltmeter over de vaste R ────
// Warmer → lagere R_NTC → hogere spanning over de vaste weerstand.
function ntcSensor(): CircuitDoc {
  const b = new Build();
  const sPlus = b.v(180, 150);
  const sMin = b.v(180, 390);
  const ntcT = b.v(420, 150);
  const mid = b.v(420, 270);
  const rB = b.v(420, 390);
  b.comp("source", sPlus, sMin, { emf: 6 });
  b.comp("ntc", ntcT, mid, { env: 20 });
  b.comp("resistor", mid, rB, { resistance: 1000 });
  b.wire(sPlus, ntcT);
  b.wire(sMin, rB);
  const vmA = b.v(600, 270);
  const vmB = b.v(600, 390);
  b.comp("voltmeter", vmA, vmB);
  b.wire(mid, vmA);
  b.wire(rB, vmB);
  b.label(180, 90, "Temperatuursensor: klik de NTC en verwarm 'm.", true);
  return b.doc();
}

export interface Preset {
  key: string;
  label: string;
  build: () => CircuitDoc;
}

export const PRESETS: Preset[] = [
  { key: "serie", label: "Serie (2 lampen)", build: serie },
  { key: "parallel", label: "Parallel (2 lampen)", build: parallel },
  { key: "combiParallelSerie", label: "Combi: parallel, dan serie", build: combiParallelSerie },
  { key: "combiSerieParallel", label: "Combi: serie, dan parallel", build: combiSerieParallel },
  { key: "schakelaar", label: "Lamp + schakelaar", build: schakelaar },
  { key: "led", label: "LED + voorschakelweerstand", build: ledCircuit },
  { key: "deler", label: "Spanningsdeler + voltmeter", build: spanningsdeler },
  { key: "schemer", label: "Schemerschakelaar (LDR)", build: schemer },
  { key: "ntc", label: "Temperatuursensor (NTC)", build: ntcSensor },
  { key: "zekering", label: "Kortsluiting-demo (zekering)", build: zekering },
];
