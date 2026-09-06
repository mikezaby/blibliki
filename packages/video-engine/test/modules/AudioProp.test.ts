import { describe, expect, it } from "vitest";
import { createModule, VideoModuleType } from "@/modules";

function audioProp() {
  return createModule({
    name: "ap",
    moduleType: VideoModuleType.AudioProp,
    props: { moduleId: "osc", prop: "frequency" },
  });
}

describe("AudioProp", () => {
  it("has no texture inputs and one control output", () => {
    const module = audioProp();

    expect(module.inputs).toEqual([]);
    expect(module.outputs).toEqual([{ name: "out", kind: "control" }]);
  });

  it("outputs the mirrored audio prop's value", () => {
    const values = new Map([["patch:osc:frequency", 440]]);

    expect(audioProp().tick(values, { now: 0, dt: 0 })).toEqual({ out: 440 });
  });

  it("outputs 0 while the audio prop has no value", () => {
    expect(audioProp().tick(new Map(), { now: 0, dt: 0 })).toEqual({ out: 0 });
  });
});
