import { describe, expect, it } from "vitest";

import {
  deserializeProject,
  PROJECT_SCHEMA_VERSION,
  ProjectLoadError,
  sanitizeFilename,
  serializeProject,
  stripExtension,
  type ProjectSnapshot,
} from "./projectSchema";

function snapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return {
    toolVersion: "1.0.0",
    videoFileName: "val.mp4",
    fps: 30,
    lastFrame: 299,
    trim: { start: 10, end: 250 },
    scale: { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 }, length: 1, unit: "m" },
    axes: {
      origin: { x: 50, y: 500 },
      angle: 0.1,
      xPositiveDirection: "right",
      yPositiveDirection: "up",
    },
    points: [
      { frame: 10, pixel: { x: 1, y: 2 } },
      { frame: 15, pixel: { x: 3, y: 4 } },
    ],
    frameStep: 5,
    mode: "analyseren",
    trailColor: "teal",
    panes: [
      {
        type: "x-t",
        showLine: true,
        showFit: false,
        zoom: { xMin: 0, xMax: 1, yMin: -2, yMax: 2 },
        tangentActive: false,
        measureActive: false,
        measureX1: null,
        measureX2: null,
      },
    ],
    fitConfig: { xFit: "linear", yFit: "none", range: { start: 10, end: 100 } },
    ...overrides,
  };
}

describe("serialize → deserialize roundtrip", () => {
  it("levert dezelfde inhoud terug", () => {
    const json = serializeProject(snapshot());
    const back = deserializeProject(JSON.parse(JSON.stringify(json)));
    expect(back.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(back.video).toEqual(json.video);
    expect(back.calibration).toEqual(json.calibration);
    expect(back.tracking).toEqual(json.tracking);
    expect(back.ui).toEqual(json.ui);
  });

  it("scale null blijft null", () => {
    const back = deserializeProject(serializeProject(snapshot({ scale: null })));
    expect(back.calibration.scale).toBeNull();
  });
});

describe("migraties van oude versies", () => {
  /** Minimaal geldig v1-bestand (zonder fit-velden en richting-velden). */
  function v1File() {
    return {
      schemaVersion: 1,
      meta: { toolName: "videometen", toolVersion: "0.1.0", savedAt: "x", videoFileName: null },
      video: { fps: 30, lastFrame: 100, trim: { start: 0, end: 100 } },
      calibration: {
        scale: null,
        axes: { origin: { x: 1, y: 2 }, angle: 0 },
      },
      tracking: { points: [], frameStep: 5 },
      ui: {
        mode: "verken",
        trailColor: "amber",
        graphs: { panes: [] },
      },
    };
  }

  it("v1 migreert door alle stappen heen naar v8 met defaults", () => {
    const back = deserializeProject(v1File());
    expect(back.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(back.ui.mode).toBe("meten"); // 'verken' → 'meten' (v7)
    expect(back.calibration.axes.xPositiveDirection).toBe("right"); // v8-default
    expect(back.calibration.axes.yPositiveDirection).toBe("up");
    expect(back.ui.graphs.fitConfig).toEqual({ xFit: "none", yFit: "none", range: null });
  });

  it("v4 met 'exponential' fit migreert naar 'none'", () => {
    const file = {
      ...v1File(),
      schemaVersion: 4,
      ui: {
        mode: "meten",
        trailColor: "teal",
        graphs: { panes: [], fitConfig: { xFit: "exponential", yFit: "linear", range: null } },
      },
    };
    const back = deserializeProject(file);
    expect(back.ui.graphs.fitConfig.xFit).toBe("none");
    expect(back.ui.graphs.fitConfig.yFit).toBe("linear");
  });
});

describe("foutpaden", () => {
  it("weigert bestanden zonder of met onbekende schemaVersion", () => {
    expect(() => deserializeProject({})).toThrow(ProjectLoadError);
    expect(() => deserializeProject({ schemaVersion: 999 })).toThrow(/projectversie 999/);
    expect(() => deserializeProject("tekst")).toThrow(ProjectLoadError);
  });

  it("weigert een project van een andere tool", () => {
    const json = JSON.parse(JSON.stringify(serializeProject(snapshot())));
    json.meta.toolName = "circuitflow";
    expect(() => deserializeProject(json)).toThrow(/niet voor videometen/);
  });

  it("weigert ongeldige meetpunten en negatieve fps", () => {
    const base = JSON.parse(JSON.stringify(serializeProject(snapshot())));
    const badPoint = { ...base, tracking: { ...base.tracking, points: [{ frame: "x" }] } };
    expect(() => deserializeProject(badPoint)).toThrow(/tracking.points/);
    const badFps = { ...base, video: { ...base.video, fps: -1 } };
    expect(() => deserializeProject(badFps)).toThrow(/video.fps/);
  });

  it("weigert een ongeldige trail-kleur en ongeldig pane-type", () => {
    const base = JSON.parse(JSON.stringify(serializeProject(snapshot())));
    const badColor = { ...base, ui: { ...base.ui, trailColor: "paars" } };
    expect(() => deserializeProject(badColor)).toThrow(/trail-kleur/);
    const badPane = JSON.parse(JSON.stringify(base));
    badPane.ui.graphs.panes[0].type = "z-t";
    expect(() => deserializeProject(badPane)).toThrow(/panes\[0\]/);
  });
});

describe("filename-helpers", () => {
  it("sanitizeFilename vervangt gereserveerde tekens", () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j.json')).toBe("a_b_c_d_e_f_g_h_i_j.json");
  });

  it("stripExtension haalt alleen de laatste extensie weg", () => {
    expect(stripExtension("val.oud.mp4")).toBe("val.oud");
    expect(stripExtension("zonder")).toBe("zonder");
    expect(stripExtension(".verborgen")).toBe(".verborgen");
  });
});
