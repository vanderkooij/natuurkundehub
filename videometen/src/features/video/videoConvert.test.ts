import { describe, expect, it, vi } from "vitest";

// De echte ffmpeg-bestanden laden we in node niet.
vi.mock("@ffmpeg/core?url", () => ({ default: "core.js" }));
vi.mock("@ffmpeg/core/wasm?url", () => ({ default: "core.wasm" }));

const { convertedName, ffmpegArgs, parseLogTime } = await import("./videoConvert");

describe("videoConvert", () => {
  it("leest de voortgang uit een ffmpeg-logregel", () => {
    expect(
      parseLogTime("frame=  120 fps= 25 q=-1.0 size=  199kB time=00:01:03.53 bitrate= 414kbits/s"),
    ).toBeCloseTo(63.53);
    expect(parseLogTime("Stream #0:0: Video: hevc")).toBeNull();
  });

  it("geeft de omgezette video een herkenbare naam", () => {
    expect(convertedName("IMG_0042.MOV")).toBe("IMG_0042 (omgezet).mp4");
    expect(convertedName("worp")).toBe("worp (omgezet).mp4");
  });

  it("houdt de frametijden van het origineel aan en laat het geluid weg", () => {
    const args = ffmpegArgs("/in/a.mov", "/uit.mp4");
    expect(args.join(" ")).toContain("-fps_mode passthrough");
    expect(args).toContain("-an");
    expect(args).toContain("libx264");
    expect(args[args.length - 1]).toBe("/uit.mp4");
  });
});
