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
const midi = (name: string) => ({ name, kind: "midi" }) as const;

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
        instances: 1,
      },
    ],
    [
      VideoModuleType.HueRotate,
      [tex("in"), ctl("amount")],
      { amount: 0, instances: 1 },
    ],
    [
      VideoModuleType.Color,
      [tex("in"), ctl("brightness"), ctl("contrast"), ctl("saturation")],
      {
        brightness: 0,
        contrast: 1,
        saturation: 1,
        invert: false,
        instances: 1,
      },
    ],
    [
      VideoModuleType.Transform,
      [tex("in"), ctl("zoom"), ctl("rotate"), ctl("x"), ctl("y")],
      { zoom: 1, rotate: 0, x: 0, y: 0, tile: false, instances: 1 },
    ],
    [
      VideoModuleType.Mirror,
      [tex("in"), ctl("segments"), ctl("angle")],
      { mode: "horizontal", segments: 6, angle: 0, instances: 1 },
    ],
    [
      VideoModuleType.Feedback,
      [tex("in"), ctl("decay"), ctl("zoom")],
      { decay: 0.9, zoom: 1, instances: 1 },
    ],
    [
      VideoModuleType.Merge,
      [tex("a"), tex("b"), ctl("amount")],
      { mode: "crossfade", amount: 0.5, instances: 1 },
    ],
    [VideoModuleType.Layout, [tex("in")], { layout: "grid" }],
    [VideoModuleType.Output, [tex("in")], {}],
    [VideoModuleType.AudioProp, [], { moduleId: "", prop: "" }],
    [
      VideoModuleType.LFO,
      [ctl("frequency")],
      { frequency: 1, waveform: "sine", phase: 0, instances: 1 },
    ],
    [
      VideoModuleType.Envelope,
      [midi("in"), ctl("gate")],
      {
        gate: 0,
        attack: 0.1,
        decay: 0.1,
        sustain: 1,
        release: 0.1,
        instances: 1,
      },
    ],
    [VideoModuleType.MidiNotes, [midi("in")], { instances: 1 }],
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
    expect(outputsFor(VideoModuleType.MidiNotes)).toEqual([
      ctl("gate"),
      ctl("note"),
      ctl("velocity"),
    ]);
    expect(Object.keys(videoModuleSchemas[VideoModuleType.HueRotate])).toEqual([
      "instances",
      "amount",
    ]);
  });
});
