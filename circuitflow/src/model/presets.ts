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

// ── Serieschakeling: bron + 2 lampen in serie ────────────────────────────────
function serie(): CircuitDoc {
  const b = new Build();
  const aPlus = b.v(320, 420);
  const aMin = b.v(480, 420);
  const c = b.v(200, 180);
  const d = b.v(360, 180);
  const e = b.v(440, 180);
  const f = b.v(600, 180);
  const bl = b.v(200, 420);
  const br = b.v(600, 420);
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
  const sPlus = b.v(200, 180);
  const sMin = b.v(200, 340);
  const l1t = b.v(360, 180);
  const l1b = b.v(360, 340);
  const l2t = b.v(520, 180);
  const l2b = b.v(520, 340);
  b.comp("source", sPlus, sMin, { emf: 6 });
  b.comp("lamp", l1t, l1b, { resistance: 6 });
  b.comp("lamp", l2t, l2b, { resistance: 6 });
  b.wire(sPlus, l1t, l2t);
  b.wire(sMin, l1b, l2b);
  return b.doc();
}

// ── LED met voorschakelweerstand (brandt) ────────────────────────────────────
function ledCircuit(): CircuitDoc {
  const b = new Build();
  const sPlus = b.v(200, 180);
  const sMin = b.v(200, 380);
  const rL = b.v(300, 180);
  const rR = b.v(420, 180);
  const ledA = b.v(520, 180);
  const ledK = b.v(520, 380);
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
  const sPlus = b.v(200, 160);
  const sMin = b.v(200, 440);
  const r1t = b.v(420, 160);
  const mid = b.v(420, 300);
  const r2b = b.v(420, 440);
  b.comp("source", sPlus, sMin, { emf: 12 });
  b.comp("resistor", r1t, mid, { resistance: 10 });
  b.comp("resistor", mid, r2b, { resistance: 20 });
  b.wire(sPlus, r1t);
  b.wire(sMin, r2b);
  // voltmeter parallel over R2 (van middenknoop naar min)
  const vmA = b.v(600, 300);
  const vmB = b.v(600, 440);
  b.comp("voltmeter", vmA, vmB);
  b.wire(mid, vmA);
  b.wire(r2b, vmB);
  return b.doc();
}

// ── Lamp + schakelaar (open: klik de schakelaar dicht) ───────────────────────
function schakelaar(): CircuitDoc {
  const b = new Build();
  const sPlus = b.v(200, 180);
  const sMin = b.v(200, 380);
  const swL = b.v(340, 180);
  const swR = b.v(460, 180);
  const lampT = b.v(560, 180);
  const lampB = b.v(560, 380);
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
  const sMin = b.v(180, 420);
  const fL = b.v(320, 180);
  const fR = b.v(440, 180);
  const lampT = b.v(560, 180);
  const lampB = b.v(560, 420);
  const swT = b.v(700, 180);
  const swB = b.v(700, 420);
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
  const sPlus = b.v(180, 160);
  const sMin = b.v(180, 460);
  const rT = b.v(420, 160);
  const mid = b.v(420, 310);
  const ldrB = b.v(420, 460);
  b.comp("source", sPlus, sMin, { emf: 6 });
  b.comp("resistor", rT, mid, { resistance: 1000 });
  b.comp("ldr", mid, ldrB, { env: 30 });
  b.wire(sPlus, rT);
  b.wire(sMin, ldrB);
  const vmA = b.v(620, 310);
  const vmB = b.v(620, 460);
  b.comp("voltmeter", vmA, vmB);
  b.wire(mid, vmA);
  b.wire(ldrB, vmB);
  b.label(180, 80, "Schemerschakelaar: klik de LDR en draai aan het licht.", true);
  return b.doc();
}

// ── Temperatuursensor: spanningsdeler met NTC + voltmeter over de vaste R ────
// Warmer → lagere R_NTC → hogere spanning over de vaste weerstand.
function ntcSensor(): CircuitDoc {
  const b = new Build();
  const sPlus = b.v(180, 160);
  const sMin = b.v(180, 460);
  const ntcT = b.v(420, 160);
  const mid = b.v(420, 310);
  const rB = b.v(420, 460);
  b.comp("source", sPlus, sMin, { emf: 6 });
  b.comp("ntc", ntcT, mid, { env: 20 });
  b.comp("resistor", mid, rB, { resistance: 1000 });
  b.wire(sPlus, ntcT);
  b.wire(sMin, rB);
  const vmA = b.v(620, 310);
  const vmB = b.v(620, 460);
  b.comp("voltmeter", vmA, vmB);
  b.wire(mid, vmA);
  b.wire(rB, vmB);
  b.label(180, 80, "Temperatuursensor: klik de NTC en verwarm 'm.", true);
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
  { key: "schakelaar", label: "Lamp + schakelaar", build: schakelaar },
  { key: "led", label: "LED + voorschakelweerstand", build: ledCircuit },
  { key: "deler", label: "Spanningsdeler + voltmeter", build: spanningsdeler },
  { key: "schemer", label: "Schemerschakelaar (LDR)", build: schemer },
  { key: "ntc", label: "Temperatuursensor (NTC)", build: ntcSensor },
  { key: "zekering", label: "Kortsluiting-demo (zekering)", build: zekering },
];
