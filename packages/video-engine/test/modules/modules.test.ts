import { describe, expect, it } from "vitest";
import {
  createModule,
  inputsFor,
  outputsFor,
  videoModuleSchemas,
  VideoModuleType,
} from "@/modules";

const tex = (name: string) => ({ name, kind: "texture" }) as const;
const ctl = (name: string) => ({ name, kind: "control" }) as const;

describe("bootstrap modules", () => {
  it.each([
    [
      VideoModuleType.Source,
      [ctl("hue"), ctl("saturation"), ctl("lightness"), ctl("spread")],
      {
        mode: "solid",
        hue: 0,
        saturation: 1,
        lightness: 0.5,
        spread: 180,
        voices: 1,
      },
    ],
    [VideoModuleType.HueRotate, [tex("in"), ctl("amount")], { amount: 0 }],
    [
      VideoModuleType.Merge,
      [tex("a"), tex("b"), ctl("amount")],
      { mode: "crossfade", amount: 0.5 },
    ],
    [VideoModuleType.Layout, [tex("in")], { layout: "grid" }],
    [VideoModuleType.Output, [tex("in")], {}],
    [VideoModuleType.AudioProp, [], { moduleId: "", prop: "" }],
    [
      VideoModuleType.LFO,
      [ctl("frequency")],
      { frequency: 1, waveform: "sine", phase: 0 },
    ],
    [
      VideoModuleType.Envelope,
      [ctl("gate")],
      { gate: 0, attack: 0.1, decay: 0.1, sustain: 1, release: 0.1, voices: 1 },
    ],
    [VideoModuleType.MidiVoices, [], { moduleId: "", voices: 1 }],
    [
      VideoModuleType.Band,
      [ctl("lowHz"), ctl("highHz"), ctl("gain")],
      { moduleId: "", lowHz: 20, highHz: 200, gain: 1, smoothing: 0 },
    ],
  ])(
    "%s declares its inputs and default props",
    (moduleType, inputs, props) => {
      const module = createModule({ name: "m", moduleType });

      expect(module.inputs).toEqual(inputs);
      expect(module.props).toEqual(props);
    },
  );

  it("texture modules are not ticked", () => {
    const module = createModule({
      name: "m",
      moduleType: VideoModuleType.HueRotate,
    });

    expect(module.tick(new Map(), { now: 0, dt: 0 })).toBeNull();
  });

  it("exposes inputs, outputs and schemas by type", () => {
    expect(inputsFor(VideoModuleType.Merge)).toEqual([
      tex("a"),
      tex("b"),
      ctl("amount"),
    ]);
    expect(outputsFor(VideoModuleType.Merge)).toEqual([tex("out")]);
    expect(outputsFor(VideoModuleType.Output)).toEqual([]);
    expect(outputsFor(VideoModuleType.AudioProp)).toEqual([ctl("out")]);
    expect(outputsFor(VideoModuleType.MidiVoices)).toEqual([
      ctl("gate"),
      ctl("note"),
      ctl("velocity"),
    ]);
    expect(Object.keys(videoModuleSchemas[VideoModuleType.HueRotate])).toEqual([
      "amount",
    ]);
  });
});
