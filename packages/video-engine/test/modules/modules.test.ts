import { describe, expect, it } from "vitest";
import {
  createModule,
  inputsFor,
  outputsFor,
  videoModuleSchemas,
  VideoModuleType,
} from "@/modules";

describe("bootstrap modules", () => {
  it.each([
    [
      VideoModuleType.Source,
      [],
      { mode: "solid", hue: 0, saturation: 1, lightness: 0.5, spread: 180 },
    ],
    [VideoModuleType.HueRotate, ["in"], { amount: 0 }],
    [VideoModuleType.Merge, ["a", "b"], { mode: "crossfade", amount: 0.5 }],
    [VideoModuleType.Output, ["in"], {}],
    [VideoModuleType.AudioProp, [], { moduleId: "", prop: "" }],
  ])("%s has its inputs and default props", (moduleType, inputs, props) => {
    const module = createModule({ name: "m", moduleType });

    expect(module.inputs).toEqual(inputs);
    expect(module.props).toEqual(props);
  });

  it("texture modules are not ticked", () => {
    const module = createModule({
      name: "m",
      moduleType: VideoModuleType.HueRotate,
    });

    expect(module.tick(new Map(), { now: 0, dt: 0 })).toBeNull();
  });

  it("exposes inputs, outputs and schemas by type", () => {
    expect(inputsFor(VideoModuleType.Merge)).toEqual(["a", "b"]);
    expect(outputsFor(VideoModuleType.Merge)).toEqual([
      { name: "out", kind: "texture" },
    ]);
    expect(outputsFor(VideoModuleType.Output)).toEqual([]);
    expect(outputsFor(VideoModuleType.AudioProp)).toEqual([
      { name: "out", kind: "control" },
    ]);
    expect(Object.keys(videoModuleSchemas[VideoModuleType.HueRotate])).toEqual([
      "amount",
    ]);
  });
});
