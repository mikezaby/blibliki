import { describe, expect, it } from "vitest";
import type { Frame } from "@/core/Module";
import { createModule, videoModuleSchemas, VideoModuleType } from "@/modules";
import type { IBandProps } from "@/modules";

// fftSize 8 at 8 kHz: bin centers 0, 1000, 2000 and 3000 Hz.
const spectra = new Map([
  ["osc", { bins: new Float32Array([-30, -100, -65, -100]), sampleRate: 8000 }],
]);

function band(props: Partial<IBandProps> = {}) {
  return createModule({
    name: "band",
    moduleType: VideoModuleType.Band,
    props: { moduleId: "osc", lowHz: 0, highHz: 1000, ...props },
  });
}

const frame: Frame = { now: 0, dt: 1 / 60, spectra };
const values = new Map<string, number>();

const out = (module: ReturnType<typeof band>, f = frame) =>
  module.tick(values, f)?.out;

describe("Band", () => {
  it("declares control inputs for the range and gain, one control output", () => {
    const module = band();

    expect(module.inputs).toEqual([
      { name: "lowHz", kind: "control" },
      { name: "highHz", kind: "control" },
      { name: "gain", kind: "control" },
    ]);
    expect(module.outputs).toEqual([{ name: "out", kind: "control" }]);
  });

  it("points at any audio module, defaulting to a bass band with unity gain", () => {
    const module = createModule({
      name: "b",
      moduleType: VideoModuleType.Band,
    });

    expect(module.props).toEqual({
      moduleId: "",
      lowHz: 20,
      highHz: 200,
      gain: 1,
      smoothing: 0,
    });
    const schema = videoModuleSchemas[VideoModuleType.Band].moduleId;
    expect(schema).toMatchObject({ kind: "audioModule" });
    expect(schema).not.toHaveProperty("moduleType");
  });

  it("averages the bins whose center falls in the range, normalized over -100..-30 dB", () => {
    expect(out(band({ lowHz: 0, highHz: 1000 }))).toBeCloseTo(0.5);
    expect(out(band({ lowHz: 500, highHz: 1500 }))).toBeCloseTo(0);
  });

  it("falls back to the bin nearest the range's center when none falls inside", () => {
    expect(out(band({ lowHz: 1600, highHz: 1900 }))).toBeCloseTo(0.5);
  });

  it("applies gain and clamps to 0..1", () => {
    expect(out(band({ gain: 2 }))).toBeCloseTo(1);
    expect(out(band({ gain: 0.5 }))).toBeCloseTo(0.25);
  });

  it("smooths with a one-pole filter per frame", () => {
    const module = band({ smoothing: 0.5 });

    expect(out(module)).toBeCloseTo(0.25);
    expect(out(module)).toBeCloseTo(0.375);
  });

  it("outputs 0 for an unknown module, silence, or a frame without spectra", () => {
    expect(out(band({ moduleId: "nope" }))).toBe(0);
    expect(out(band(), { now: 0, dt: 0 })).toBe(0);

    const silent = new Map([
      ["osc", { bins: new Float32Array(4).fill(-Infinity), sampleRate: 8000 }],
    ]);
    expect(out(band(), { ...frame, spectra: silent })).toBe(0);
  });
});
