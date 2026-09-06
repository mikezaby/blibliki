import { describe, expect, it } from "vitest";
import { IRoute } from "@/core/Routes";
import {
  applyControlRoutes,
  mapRange,
  spectrumToControls,
} from "@/core/controls";

describe("mapRange", () => {
  it("maps and clamps", () => {
    expect(mapRange(5, 0, 10, 0, 360)).toBe(180);
    expect(mapRange(-1, 0, 10, 0, 360)).toBe(0);
    expect(mapRange(11, 0, 10, 0, 360)).toBe(360);
    expect(mapRange(0.5, 0, 1, 360, 0)).toBe(180);
  });

  it("follows an exponential slider's position when exp is given", () => {
    // With exp 2 over 0..100, a value of 25 sits at half the slider travel.
    expect(mapRange(25, 0, 100, 0, 360, 2)).toBeCloseTo(180);
    expect(mapRange(100, 0, 100, 0, 360, 2)).toBe(360);
    expect(mapRange(0, 0, 100, 0, 360, 2)).toBe(0);
  });

  it("returns outMin for a zero-width input range", () => {
    expect(mapRange(3, 2, 2, 10, 20)).toBe(10);
  });
});

describe("applyControlRoutes", () => {
  const route: IRoute = {
    id: "r1",
    kind: "control",
    source: { moduleId: "lfo", ioName: "out" },
    destination: { moduleId: "m", ioName: "hue" },
    inMin: 0,
    inMax: 1,
    outMin: 0,
    outMax: 360,
  };

  it("overrides a prop from the source's value", () => {
    const props = applyControlRoutes(
      { hue: 10, spread: 1 },
      [route],
      new Map([["lfo:out", 0.5]]),
    );

    expect(props).toEqual({ hue: 180, spread: 1 });
  });

  it("applies the route's exp", () => {
    const props = applyControlRoutes(
      { hue: 10 },
      [{ ...route, inMax: 100, exp: 2 }],
      new Map([["lfo:out", 25]]),
    );

    expect(props.hue).toBeCloseTo(180);
  });

  it("keeps the stored prop when the source has no value yet", () => {
    const props = applyControlRoutes({ hue: 10 }, [route], new Map());

    expect(props).toEqual({ hue: 10 });
  });

  it("adds the swings of several routes into one prop", () => {
    const second: IRoute = {
      ...route,
      id: "r2",
      source: { moduleId: "band", ioName: "out" },
      outMin: 0,
      outMax: 100,
    };
    const props = applyControlRoutes(
      { hue: 10 },
      [route, second],
      new Map([
        ["lfo:out", 0.5],
        ["band:out", 0.5],
      ]),
    );

    expect(props.hue).toBe(230);
  });

  it("uses the route's full range when the mapping fields are missing", () => {
    const bare: IRoute = {
      id: "r",
      kind: "control",
      source: { moduleId: "lfo", ioName: "out" },
      destination: { moduleId: "m", ioName: "hue" },
    };
    const props = applyControlRoutes(
      { hue: 10 },
      [bare],
      new Map([["lfo:out", 0.25]]),
    );

    expect(props.hue).toBe(0.25);
  });
});

describe("spectrumToControls", () => {
  it("splits bins into three bands and a level, normalized 0..1", () => {
    const bins = new Float32Array([-30, -30, -100, -100, -65, -65]);

    expect(spectrumToControls(bins)).toEqual({
      "spectrum:low": 1,
      "spectrum:mid": 0,
      "spectrum:high": 0.5,
      "spectrum:level": 0.5,
    });
  });

  it("names the bands by the given prefix", () => {
    const bins = new Float32Array([-30, -30, -100, -100, -65, -65]);

    expect(spectrumToControls(bins, "spectrum:m1")).toEqual({
      "spectrum:m1:low": 1,
      "spectrum:m1:mid": 0,
      "spectrum:m1:high": 0.5,
      "spectrum:m1:level": 0.5,
    });
  });

  it("treats silence (-Infinity) as zero", () => {
    const bins = new Float32Array(6).fill(-Infinity);

    expect(spectrumToControls(bins)["spectrum:level"]).toBe(0);
  });
});
