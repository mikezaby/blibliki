import { describe, expect, it } from "vitest";
import type { Frame } from "@/core/Module";
import { createModule, videoModuleSchemas, VideoModuleType } from "@/modules";
import type { IAudioFollowerProps } from "@/modules";

// fftSize 8 at 8 kHz: bin centers 0, 1000, 2000 and 3000 Hz.
const spectra = new Map([
  ["osc", { bins: new Float32Array([-30, -100, -65, -100]), sampleRate: 8000 }],
]);

function follower(props: Partial<IAudioFollowerProps> = {}) {
  return createModule({
    name: "follower",
    moduleType: VideoModuleType.AudioFollower,
    props: {
      moduleId: "osc",
      lowHz: 0,
      highHz: 1000,
      minDb: -100,
      maxDb: -30,
      attack: 0,
      release: 0,
      ...props,
    },
  });
}

const frame: Frame = { now: 0, dt: 1 / 60, spectra };
const values = new Map<string, number>();

const out = (module: ReturnType<typeof follower>, f = frame) =>
  module.tick(values, f)?.out;

describe("AudioFollower", () => {
  it("declares control inputs for the range, one control output", () => {
    const module = follower();

    expect(module.inputs).toEqual([
      { name: "lowHz", kind: "control" },
      { name: "highHz", kind: "control" },
    ]);
    expect(module.outputs).toEqual([{ name: "out", kind: "control" }]);
  });

  it("points at any audio module, defaulting to a bass band over -60..-10 dB", () => {
    const module = createModule({
      name: "f",
      moduleType: VideoModuleType.AudioFollower,
    });

    expect(module.props).toEqual({
      moduleId: "",
      lowHz: 20,
      highHz: 200,
      minDb: -60,
      maxDb: -10,
      attack: 0.01,
      release: 0.15,
    });
    const schema = videoModuleSchemas[VideoModuleType.AudioFollower].moduleId;
    expect(schema).toMatchObject({ kind: "audioModule" });
    expect(schema).not.toHaveProperty("moduleType");
  });

  it("averages the bins whose center falls in the range, mapped over minDb..maxDb", () => {
    expect(out(follower({ lowHz: 0, highHz: 1000 }))).toBeCloseTo(0.5);
    expect(out(follower({ lowHz: 500, highHz: 1500 }))).toBeCloseTo(0);
    expect(out(follower({ minDb: -80, maxDb: -50 }))).toBeCloseTo(0.5);
    expect(out(follower({ minDb: -80, maxDb: -70 }))).toBe(1);
    expect(out(follower({ minDb: -60, maxDb: 0 }))).toBe(0);
  });

  it("falls back to the bin nearest the range's center when none falls inside", () => {
    expect(out(follower({ lowHz: 1600, highHz: 1900 }))).toBeCloseTo(0.5);
  });

  it("rises at the attack rate and falls at the release rate", () => {
    const module = follower({ attack: 1 / 60, release: 1 });
    const silent: Frame = {
      ...frame,
      spectra: new Map([
        ["osc", { bins: new Float32Array(4).fill(-100), sampleRate: 8000 }],
      ]),
    };

    const up = out(module) ?? 0;
    expect(up).toBeCloseTo(0.5 * (1 - Math.exp(-1)));

    const down = out(module, silent) ?? 0;
    expect(down).toBeCloseTo(up * Math.exp(-1 / 60));
  });

  it("keeps a level per instance", () => {
    const module = follower({ attack: 1 / 60, release: 1 / 60 });
    const first = 0.5 * (1 - Math.exp(-1));

    expect(module.tick(values, frame, module.props, 0)?.out).toBeCloseTo(first);
    expect(module.tick(values, frame, module.props, 1)?.out).toBeCloseTo(first);
  });

  it("outputs 0 for an unknown module, silence, or a frame without spectra", () => {
    expect(out(follower({ moduleId: "nope" }))).toBe(0);
    expect(out(follower(), { now: 0, dt: 0 })).toBe(0);

    const silent = new Map([
      ["osc", { bins: new Float32Array(4).fill(-Infinity), sampleRate: 8000 }],
    ]);
    expect(out(follower(), { ...frame, spectra: silent })).toBe(0);
  });
});
