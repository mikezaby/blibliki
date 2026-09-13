import { describe, expect, it } from "vitest";
import { createModule, VideoModuleType } from "@/modules";
import type { ISampleHoldProps } from "@/modules";

const values = new Map<string, number>();

function sampleHold(props: Partial<ISampleHoldProps> = {}) {
  return createModule({
    name: "sh",
    moduleType: VideoModuleType.SampleHold,
    props,
  });
}

const tick = (
  module: ReturnType<typeof sampleHold>,
  input: number,
  trigger: number,
  instance = 0,
) =>
  module.tick(
    values,
    { now: 0, dt: 1 / 60 },
    { ...module.props, input, trigger },
    instance,
  )?.out;

describe("SampleHold", () => {
  it("declares control inputs for the value and the trigger, one output", () => {
    const module = sampleHold();

    expect(module.inputs).toEqual([
      { name: "input", kind: "control" },
      { name: "trigger", kind: "control" },
    ]);
    expect(module.outputs).toEqual([{ name: "out", kind: "control" }]);
    expect(module.props).toEqual({ input: 0, trigger: 0, instances: 1 });
  });

  it("copies the input on each rising edge of the trigger and holds it between", () => {
    const sh = sampleHold();

    expect(tick(sh, 0.3, 0)).toBe(0);
    expect(tick(sh, 0.3, 1)).toBe(0.3);
    expect(tick(sh, 0.8, 1)).toBe(0.3);
    expect(tick(sh, 0.8, 0)).toBe(0.3);
    expect(tick(sh, 0.6, 1)).toBe(0.6);
  });

  it("keeps a held value per instance", () => {
    const sh = sampleHold();

    expect(tick(sh, 0.2, 1, 0)).toBe(0.2);
    expect(tick(sh, 0.9, 1, 1)).toBe(0.9);
    expect(tick(sh, 0.5, 1, 0)).toBe(0.2);
    expect(tick(sh, 0.5, 0, 1)).toBe(0.9);
  });
});
