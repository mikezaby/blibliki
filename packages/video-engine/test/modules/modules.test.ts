import { describe, expect, it } from "vitest";
import {
  createModule,
  inputsFor,
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
    [VideoModuleType.Merge, ["a", "b"], { mix: 0.5 }],
    [VideoModuleType.Overlay, ["base", "layer"], { opacity: 1 }],
    [VideoModuleType.Output, ["in"], {}],
  ])("%s has its inputs and default props", (moduleType, inputs, props) => {
    const module = createModule({ name: "m", moduleType });

    expect(module.inputs).toEqual(inputs);
    expect(module.props).toEqual(props);
  });

  it("exposes inputs and schemas by type", () => {
    expect(inputsFor(VideoModuleType.Merge)).toEqual(["a", "b"]);
    expect(Object.keys(videoModuleSchemas[VideoModuleType.HueRotate])).toEqual([
      "amount",
    ]);
  });
});
