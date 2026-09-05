import { describe, expect, it } from "vitest";
import {
  applyBindings,
  IBinding,
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

describe("applyBindings", () => {
  const binding: IBinding = {
    id: "b1",
    moduleId: "m",
    prop: "hue",
    control: "spectrum:low",
    inMin: 0,
    inMax: 1,
    outMin: 0,
    outMax: 360,
  };

  it("overrides a prop from a control value", () => {
    const props = applyBindings(
      { hue: 10, spread: 1 },
      [binding],
      new Map([["spectrum:low", 0.5]]),
    );

    expect(props).toEqual({ hue: 180, spread: 1 });
  });

  it("applies the binding's exp", () => {
    const props = applyBindings(
      { hue: 10 },
      [{ ...binding, inMax: 100, exp: 2 }],
      new Map([["spectrum:low", 25]]),
    );

    expect(props.hue).toBeCloseTo(180);
  });

  it("keeps the stored prop when the control has no value yet", () => {
    const props = applyBindings({ hue: 10 }, [binding], new Map());

    expect(props).toEqual({ hue: 10 });
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
