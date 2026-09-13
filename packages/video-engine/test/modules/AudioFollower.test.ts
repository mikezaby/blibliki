import { describe, expect, it } from "vitest";
import type { Frame } from "@/core/Module";
import {
  AUDIO_FOLLOWER_PRESETS,
  createModule,
  resolvePropsUpdate,
  videoModuleSchemas,
  VideoModuleType,
} from "@/modules";
import type { IAudioFollowerProps, ILFOProps } from "@/modules";

// fftSize 8 at 8 kHz: bin centers 0, 1000, 2000 and 3000 Hz.
const spectra = new Map([
  [
    "osc",
    {
      bins: new Float32Array([-30, -100, -65, -100]),
      sampleRate: 8000,
      levelDb: -40,
    },
  ],
]);

function follower(props: Partial<IAudioFollowerProps> = {}) {
  return createModule({
    name: "follower",
    moduleType: VideoModuleType.AudioFollower,
    props: {
      moduleId: "osc",
      preset: "custom",
      source: "band",
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
      preset: "custom",
      moduleId: "",
      source: "band",
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

  it("reads the host's overall level, ignoring the range, when the source is level", () => {
    expect(out(follower({ source: "level", minDb: -50, maxDb: -30 }))).toBe(
      0.5,
    );
    expect(
      out(follower({ source: "level", lowHz: 500, highHz: 1500 })),
    ).toBeCloseTo(6 / 7);
  });

  it("falls back to the bin nearest the range's center when none falls inside", () => {
    expect(out(follower({ lowHz: 1600, highHz: 1900 }))).toBeCloseTo(0.5);
  });

  it("rises at the attack rate and falls at the release rate", () => {
    const module = follower({ attack: 1 / 60, release: 1 });
    const silent: Frame = {
      ...frame,
      spectra: new Map([
        [
          "osc",
          {
            bins: new Float32Array(4).fill(-100),
            sampleRate: 8000,
            levelDb: -100,
          },
        ],
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

  it("lists its presets first, custom then the built-ins", () => {
    const schema = videoModuleSchemas[VideoModuleType.AudioFollower];

    expect(Object.keys(schema)[0]).toBe("preset");
    expect(schema.preset).toMatchObject({
      kind: "enum",
      options: ["custom", ...AUDIO_FOLLOWER_PRESETS.map((p) => p.id)],
    });
    expect(AUDIO_FOLLOWER_PRESETS.map((p) => p.id)).toEqual([
      "kick",
      "bass",
      "snare",
      "hats",
      "mids",
      "loudness",
      "swell",
    ]);
  });

  it("choosing a preset writes its props in the same update", () => {
    const current = follower().props as IAudioFollowerProps;

    expect(
      resolvePropsUpdate(VideoModuleType.AudioFollower, current, {
        preset: "kick",
      }),
    ).toEqual({
      preset: "kick",
      source: "band",
      lowHz: 40,
      highHz: 120,
      minDb: -60,
      maxDb: -10,
      attack: 0.005,
      release: 0.15,
    });
    expect(
      resolvePropsUpdate(VideoModuleType.AudioFollower, current, {
        preset: "loudness",
      }),
    ).toMatchObject({ preset: "loudness", source: "level", minDb: -50 });
  });

  it("editing a preset's prop flips the preset to custom, the module does not", () => {
    const current = {
      ...(follower().props as IAudioFollowerProps),
      preset: "kick",
    };

    expect(
      resolvePropsUpdate(VideoModuleType.AudioFollower, current, {
        lowHz: 60,
      }),
    ).toEqual({ lowHz: 60, preset: "custom" });
    expect(
      resolvePropsUpdate(VideoModuleType.AudioFollower, current, {
        moduleId: "other",
      }),
    ).toEqual({ moduleId: "other" });
    expect(
      resolvePropsUpdate(VideoModuleType.AudioFollower, current, {
        preset: "custom",
      }),
    ).toEqual({ preset: "custom" });
  });

  it("leaves other modules' updates alone", () => {
    const lfo = createModule({ name: "lfo", moduleType: VideoModuleType.LFO });

    expect(
      resolvePropsUpdate(VideoModuleType.LFO, lfo.props as ILFOProps, {
        frequency: 2,
      }),
    ).toEqual({ frequency: 2 });
  });

  it("outputs 0 for an unknown module, silence, or a frame without spectra", () => {
    expect(out(follower({ moduleId: "nope" }))).toBe(0);
    expect(out(follower(), { now: 0, dt: 0 })).toBe(0);

    const silent = new Map([
      [
        "osc",
        {
          bins: new Float32Array(4).fill(-Infinity),
          sampleRate: 8000,
          levelDb: -Infinity,
        },
      ],
    ]);
    expect(out(follower(), { ...frame, spectra: silent })).toBe(0);
  });
});
