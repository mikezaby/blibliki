import { describe, expect, it } from "vitest";
import { createModule, VideoModuleType } from "@/modules";
import type { ITriggerProps } from "@/modules";

const values = new Map<string, number>();

function trigger(props: Partial<ITriggerProps> = {}) {
  return createModule({
    name: "trig",
    moduleType: VideoModuleType.Trigger,
    props,
  });
}

const tick = (
  module: ReturnType<typeof trigger>,
  input: number,
  instance = 0,
  dt = 0.05,
) =>
  module.tick(values, { now: 0, dt }, { ...module.props, input }, instance)
    ?.out;

describe("Trigger", () => {
  it("gates while the input is above the threshold", () => {
    const trig = trigger({ mode: "gate", threshold: 0.5 });

    expect(tick(trig, 0.2)).toBe(0);
    expect(tick(trig, 0.7)).toBe(1);
    expect(tick(trig, 0.9)).toBe(1);
    expect(tick(trig, 0.4)).toBe(0);
  });

  it("pulses for the hold time on each upward crossing", () => {
    const trig = trigger({ mode: "pulse", threshold: 0.5, hold: 0.1 });

    expect(tick(trig, 0.2)).toBe(0);
    expect(tick(trig, 0.8)).toBe(1);
    expect(tick(trig, 0.8)).toBe(1);
    expect(tick(trig, 0.8)).toBe(0);
    expect(tick(trig, 0.8)).toBe(0);
    expect(tick(trig, 0.1)).toBe(0);
    expect(tick(trig, 0.9)).toBe(1);
  });

  it("keeps a state per instance", () => {
    const trig = trigger({ mode: "pulse", hold: 0.1 });

    expect(tick(trig, 0.9, 0)).toBe(1);
    expect(tick(trig, 0.9, 1)).toBe(1);
    expect(tick(trig, 0.9, 1)).toBe(1);
    expect(tick(trig, 0.9, 1)).toBe(0);
    expect(tick(trig, 0.9, 0)).toBe(1);
  });
});
