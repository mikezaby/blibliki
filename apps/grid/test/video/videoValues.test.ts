// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { outputValue, videoValues } from "../../src/video/videoValues";

describe("videoValues", () => {
  it("notifies subscribers of a new snapshot", () => {
    const listener = vi.fn();
    const stop = videoValues.subscribe(listener);

    videoValues.set({ "lfo:out": 0.5 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(videoValues.get()).toEqual({ "lfo:out": 0.5 });

    stop();
    videoValues.set({});

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reads a single output, or instance 0 of an instanced one", () => {
    const all = { "lfo:out": 0.5, "env:out:0": 0.25, "env:out:1": 0.75 };

    expect(outputValue(all, "lfo", "out")).toBe(0.5);
    expect(outputValue(all, "env", "out")).toBe(0.25);
    expect(outputValue(all, "gone", "out")).toBeUndefined();
  });
});
