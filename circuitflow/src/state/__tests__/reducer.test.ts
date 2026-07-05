import { describe, it, expect } from "vitest";

import { TERMINAL_SPAN } from "@/model/componentDefs";
import type { CircuitDoc } from "@/model/types";
import { EMPTY_DOC } from "@/model/types";
import { historyReducer, INITIAL_HISTORY, reducer, remapDoc } from "../useCircuit";

const v = (id: string, x = 0, y = 0) => ({ id, x, y });

/** Doc-bouwertje voor leesbare testopstellingen. */
function doc(partial: Partial<CircuitDoc>): CircuitDoc {
  return { vertices: {}, components: [], wires: [], ...partial };
}

describe("reducer — kernacties", () => {
  it("addComponent: component + 2 terminal-vertices op ±halve span", () => {
    const d = reducer(EMPTY_DOC, {
      t: "addComponent", id: "c1", type: "resistor", v0: "a", v1: "b", cx: 100, cy: 50,
    });
    expect(d.components).toHaveLength(1);
    expect(d.components[0].values.resistance).toBe(10); // default
    expect(d.vertices.a.x).toBe(100 - TERMINAL_SPAN / 2);
    expect(d.vertices.b.x).toBe(100 + TERMINAL_SPAN / 2);
  });

  it("setValue: patch wordt gemerged, andere waarden blijven", () => {
    let d = reducer(EMPTY_DOC, { t: "addComponent", id: "c1", type: "led", v0: "a", v1: "b", cx: 0, cy: 0 });
    d = reducer(d, { t: "setValue", id: "c1", patch: { burned: true } });
    expect(d.components[0].values.burned).toBe(true);
    expect(d.components[0].values.color).toBe("rood"); // default bleef staan
  });

  it("reversePolarity: wisselt v0/v1 zonder vertices te verplaatsen", () => {
    let d = reducer(EMPTY_DOC, { t: "addComponent", id: "c1", type: "led", v0: "a", v1: "b", cx: 0, cy: 0 });
    const ax = d.vertices.a.x;
    d = reducer(d, { t: "reversePolarity", id: "c1" });
    expect(d.components[0].v0).toBe("b");
    expect(d.components[0].v1).toBe("a");
    expect(d.vertices.a.x).toBe(ax);
  });

  it("deleteComponent: draden blijven, verweesde vertices worden opgeruimd", () => {
    const d0 = doc({
      vertices: { a: v("a"), b: v("b", 120), w: v("w", 200) },
      components: [{ id: "c1", type: "resistor", v0: "a", v1: "b", mirrored: false, values: {} }],
      wires: [{ id: "w1", nodes: ["b", "w"] }],
    });
    const d = reducer(d0, { t: "deleteComponent", id: "c1" });
    expect(d.components).toHaveLength(0);
    expect(d.wires).toHaveLength(1); // draad blijft liggen
    expect(d.vertices.b).toBeDefined(); // nog gebruikt door de draad
    expect(d.vertices.a).toBeUndefined(); // verweesd → weg
  });

  it("mergeVertex: hernoemt overal en gooit ingeklapte draden weg", () => {
    const d0 = doc({
      vertices: { a: v("a"), b: v("b", 50), c: v("c", 100) },
      components: [{ id: "c1", type: "lamp", v0: "a", v1: "b", mirrored: false, values: {} }],
      wires: [
        { id: "w1", nodes: ["b", "c"] },
        { id: "w2", nodes: ["c", "b"] },
      ],
    });
    const d = reducer(d0, { t: "mergeVertex", keep: "b", drop: "c" });
    expect(d.wires).toHaveLength(0); // beide draden klappen in (b→b)
    expect(d.components[0].v1).toBe("b");
    expect(d.vertices.c).toBeUndefined();
  });

  it("cutNode: eerste aansluiting blijft, de rest waaiert uit naar nieuwe vertices", () => {
    const d0 = doc({
      vertices: { a: v("a"), x: v("x", 100), b: v("b", 200) },
      wires: [
        { id: "w1", nodes: ["a", "x"] },
        { id: "w2", nodes: ["b", "x"] },
      ],
    });
    const d = reducer(d0, { t: "cutNode", vid: "x", newVertexIds: ["n1"], newWireIds: [] });
    const ends = d.wires.map((w) => w.nodes[1]).sort();
    expect(ends).toEqual(["n1", "x"]); // één blijft op x, één op de nieuwe vertex
    expect(d.vertices.n1).toBeDefined();
  });

  it("detachComponent met poorten: meter krijgt nieuwe poort, draad houdt de oude vertex", () => {
    const d0 = doc({
      vertices: { p0: v("p0"), p1: v("p1"), p2: v("p2"), p3: v("p3"), z: v("z", 300) },
      components: [
        {
          id: "m1", type: "analogVoltmeter", v0: "p0", v1: "p1", mirrored: false,
          values: {}, cx: 0, cy: 0, ports: ["p0", "p1", "p2", "p3"],
        },
      ],
      wires: [{ id: "w1", nodes: ["p2", "z"] }],
    });
    const d = reducer(d0, { t: "detachComponent", id: "m1", newVertexIds: ["q0", "q1", "q2", "q3"] });
    const m = d.components[0];
    expect(m.ports![2]).toBe("q2"); // bedrade poort → nieuwe vertex
    expect(m.ports![0]).toBe("p0"); // onbedrade poort blijft
    expect(d.wires[0].nodes).toContain("p2"); // draad houdt de oude vertex
  });

  it("remapDoc: alle id's vers, structuur behouden", () => {
    const d0 = doc({
      vertices: { a: v("a"), b: v("b", 120) },
      components: [{ id: "c1", type: "resistor", v0: "a", v1: "b", mirrored: false, values: { resistance: 47 } }],
      wires: [{ id: "w1", nodes: ["a", "b"] }],
    });
    const d = remapDoc(d0);
    expect(d.components[0].id).not.toBe("c1");
    expect(d.components[0].values.resistance).toBe(47);
    expect(d.vertices[d.components[0].v0]).toBeDefined(); // v0 verwijst naar bestaande vertex
    expect(d.wires[0].nodes).toEqual([d.components[0].v0, d.components[0].v1]);
    expect(Object.keys(d.vertices)).not.toContain("a"); // oude id's zijn weg
  });
});

describe("historyReducer — undo/redo", () => {
  const add = (id: string) =>
    ({ t: "addComponent", id, type: "resistor", v0: `${id}a`, v1: `${id}b`, cx: 0, cy: 0 }) as const;

  it("undo/redo herstellen de vorige/volgende staat", () => {
    let h = historyReducer(INITIAL_HISTORY, add("c1"));
    h = historyReducer(h, add("c2"));
    expect(h.past).toHaveLength(2);
    h = historyReducer(h, { t: "undo" });
    expect(h.present.components).toHaveLength(1);
    expect(h.future).toHaveLength(1);
    h = historyReducer(h, { t: "redo" });
    expect(h.present.components).toHaveLength(2);
    expect(h.future).toHaveLength(0);
  });

  it("sleep-acties coalescen tot één stap; commit sluit het gebaar af", () => {
    let h = historyReducer(INITIAL_HISTORY, add("c1"));
    const before = h.past.length;
    h = historyReducer(h, { t: "moveVertex", vid: "c1a", x: 10, y: 0 });
    h = historyReducer(h, { t: "moveVertex", vid: "c1a", x: 20, y: 0 });
    h = historyReducer(h, { t: "moveVertex", vid: "c1a", x: 30, y: 0 });
    expect(h.past.length).toBe(before + 1); // hele sleep = één undo-stap
    h = historyReducer(h, { t: "commit" });
    h = historyReducer(h, { t: "moveVertex", vid: "c1a", x: 40, y: 0 });
    expect(h.past.length).toBe(before + 2); // na commit een nieuwe stap
    h = historyReducer(h, { t: "undo" });
    expect(h.present.vertices.c1a.x).toBe(30); // terug naar het einde van de eerste sleep
  });

  it("nieuwe actie wist de redo-stapel", () => {
    let h = historyReducer(INITIAL_HISTORY, add("c1"));
    h = historyReducer(h, { t: "undo" });
    expect(h.future).toHaveLength(1);
    h = historyReducer(h, add("c2"));
    expect(h.future).toHaveLength(0);
  });
});
