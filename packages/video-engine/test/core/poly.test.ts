import { describe, expect, it } from "vitest";
import { voiceRect, voicesProp } from "@/core/poly";

describe("voiceRect", () => {
  it("fills a grid row-major from the top left", () => {
    expect(voiceRect(0, 4, "grid")).toEqual({
      x: 0,
      y: 0.5,
      width: 0.5,
      height: 0.5,
    });
    expect(voiceRect(3, 4, "grid")).toEqual({
      x: 0.5,
      y: 0,
      width: 0.5,
      height: 0.5,
    });
  });

  it("picks the squarest grid and leaves the tail of the last row empty", () => {
    expect(voiceRect(4, 5, "grid")).toEqual({
      x: 1 / 3,
      y: 0,
      width: 1 / 3,
      height: 0.5,
    });
  });

  it("stacks strips top to bottom", () => {
    expect(voiceRect(0, 3, "strips")).toEqual({
      x: 0,
      y: 1 - 1 / 3,
      width: 1,
      height: 1 / 3,
    });
  });
});

describe("voicesProp", () => {
  it("defaults to one and rounds a modulated count", () => {
    expect(voicesProp({})).toBe(1);
    expect(voicesProp({ voices: 0.2 })).toBe(1);
    expect(voicesProp({ voices: 8.6 })).toBe(9);
  });
});
