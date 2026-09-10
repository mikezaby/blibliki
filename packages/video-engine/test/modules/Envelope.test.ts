import { describe, expect, it } from "vitest";
import { createModule, VideoModuleType } from "@/modules";
import type { IEnvelopeProps } from "@/modules";

const values = new Map<string, number>();

function envelope(props: Partial<IEnvelopeProps> = {}) {
  return createModule({
    name: "env",
    moduleType: VideoModuleType.Envelope,
    props,
  });
}

// One tick of 0.1 s with the given props laid over the stored ones.
function tick(
  module: ReturnType<typeof envelope>,
  props: Partial<IEnvelopeProps>,
  instance = 0,
) {
  return module.tick(
    values,
    { now: 0, dt: 0.1 },
    { ...module.props, ...props },
    instance,
  )?.out;
}

describe("Envelope", () => {
  it("rises over the attack, falls to sustain over the decay, holds, then releases", () => {
    const env = envelope({
      attack: 0.2,
      decay: 0.2,
      sustain: 0.5,
      release: 0.4,
    });

    expect(tick(env, { gate: 1 })).toBeCloseTo(0.5);
    expect(tick(env, { gate: 1 })).toBeCloseTo(1);
    expect(tick(env, { gate: 1 })).toBeCloseTo(0.75);
    expect(tick(env, { gate: 1 })).toBeCloseTo(0.5);
    expect(tick(env, { gate: 1 })).toBeCloseTo(0.5);
    expect(tick(env, { gate: 0 })).toBeCloseTo(0.25);
    expect(tick(env, { gate: 0 })).toBeCloseTo(0);
    expect(tick(env, { gate: 0 })).toBe(0);
  });

  it("jumps through a zero-length segment", () => {
    const env = envelope({ attack: 0, decay: 0, sustain: 0.3 });

    expect(tick(env, { gate: 1 })).toBe(1);
    expect(tick(env, { gate: 1 })).toBe(0.3);
  });

  it("keeps one envelope per instance", () => {
    const env = envelope({ attack: 0.2 });

    expect(tick(env, { gate: 1 }, 0)).toBeCloseTo(0.5);
    expect(tick(env, { gate: 0 }, 1)).toBe(0);
    expect(tick(env, { gate: 1 }, 0)).toBeCloseTo(1);
  });

  it("retriggers from the current level during a release", () => {
    const env = envelope({ attack: 0.2, decay: 0, sustain: 1, release: 0.4 });
    tick(env, { gate: 1 });
    tick(env, { gate: 1 });
    tick(env, { gate: 1 });

    expect(tick(env, { gate: 0 })).toBeCloseTo(0.75);
    expect(tick(env, { gate: 1, attack: 1 })).toBeCloseTo(0.85);
  });

  it("opens and closes an instance from its MIDI note, untagged notes on instance 0", () => {
    const env = envelope({ instances: 2, attack: 0, decay: 0, sustain: 1 });
    env.receiveMidi("in", {
      type: "noteOn",
      note: 60,
      velocity: 1,
      instance: 1,
    });

    expect(tick(env, {}, 0)).toBe(0);
    expect(tick(env, {}, 1)).toBe(1);

    env.receiveMidi("in", {
      type: "noteOff",
      note: 60,
      velocity: 0,
      instance: 1,
    });
    env.receiveMidi("in", { type: "noteOn", note: 62, velocity: 1 });

    expect(tick(env, {}, 1)).toBe(0);
    expect(tick(env, {}, 0)).toBe(1);
  });
});
