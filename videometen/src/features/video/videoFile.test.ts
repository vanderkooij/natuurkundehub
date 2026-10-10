import { describe, expect, it } from "vitest";

import {
  checkVideoFile,
  describeMediaError,
  describeNoPicture,
  fileExtension,
  slowdownFactor,
  timeFpsOf,
} from "./videoFile";

describe("checkVideoFile", () => {
  it("accepteert alles met een video-MIME-type", () => {
    expect(checkVideoFile({ name: "worp.mp4", type: "video/mp4" })).toBeNull();
    expect(checkVideoFile({ name: "worp", type: "video/quicktime" })).toBeNull();
  });

  it("valt terug op de extensie als het type leeg is (Chromebook, Drive)", () => {
    expect(checkVideoFile({ name: "worp.MP4", type: "" })).toBeNull();
    expect(checkVideoFile({ name: "IMG_0042.mov", type: "" })).toBeNull();
    expect(checkVideoFile({ name: "clip.webm", type: "application/octet-stream" })).toBeNull();
  });

  it("weigert met uitleg in plaats van stil", () => {
    expect(checkVideoFile({ name: "foto.jpg", type: "image/jpeg" })?.title).toMatch(/foto/);
    expect(checkVideoFile({ name: "meting.json", type: "application/json" })?.title).toMatch(
      /projectbestand/,
    );
    expect(checkVideoFile({ name: "verslag.pdf", type: "application/pdf" })?.title).toMatch(
      /geen video/,
    );
    expect(checkVideoFile({ name: "zonderextensie", type: "" })?.fileName).toBe("zonderextensie");
  });
});

describe("foutmeldingen", () => {
  it("geeft bij een decodeerfout de tips over WhatsApp/Signal en de iPhone", () => {
    const err = describeMediaError({ name: "worp.mp4", type: "video/mp4" }, 4, "DEMUXER_ERROR");
    expect(err.title).toMatch(/kan je browser niet lezen/);
    expect(err.tips.join(" ")).toMatch(/WhatsApp of Signal/);
    expect(err.tips.join(" ")).toMatch(/Meest compatibel/);
    expect(err.detail).toContain("MEDIA_ERR_SRC_NOT_SUPPORTED");
    expect(err.detail).toContain("DEMUXER_ERROR");
  });

  it("meldt een afgebroken laadactie anders dan een kapot bestand", () => {
    expect(describeMediaError({ name: "a.mp4", type: "" }, 1).title).toMatch(/afgebroken/);
    expect(describeMediaError({ name: "a.mp4", type: "" }, null).detail).toBe("Geen foutcode");
  });

  it("herkent een bestand zonder beeld", () => {
    expect(describeNoPicture({ name: "geluid.m4v", type: "" }).title).toMatch(/geen beeld/);
  });

  it("fileExtension", () => {
    expect(fileExtension("a.b.MOV")).toBe("mov");
    expect(fileExtension("geen")).toBe("");
  });
});

describe("slowmotion", () => {
  it("rekent met de opname-fps als die er is", () => {
    expect(timeFpsOf({ fps: 30, captureFps: null })).toBe(30);
    expect(timeFpsOf({ fps: 30, captureFps: 240 })).toBe(240);
    expect(slowdownFactor({ fps: 30, captureFps: 240 })).toBe(8);
    expect(slowdownFactor({ fps: 30, captureFps: null })).toBe(1);
  });
});
