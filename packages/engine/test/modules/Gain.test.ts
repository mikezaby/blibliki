import { beforeEach, describe, expect, it } from "vitest";
import { Module } from "@/core/module/Module";
import { createModule, ModuleType } from "@/modules";
import Constant from "@/modules/Constant";
import { MonoGain } from "@/modules/Gain";
import Inspector from "@/modules/Inspector";
import { waitForValue } from "../utils/waitForCondition";

describe("Gain", () => {
  let gain: MonoGain;
  let audioSource: Constant;
  let inspector: Inspector;

  const waitForOutput = async (expected: number, tolerance = 0.1) =>
    waitForValue(
      () => inspector.getValue(),
      (value) => Math.abs(value - expected) <= tolerance,
      {
        description: `gain output near ${expected}`,
      },
    );

  beforeEach((ctx) => {
    gain = Module.create(MonoGain, ctx.engine.id, {
      name: "gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });

    audioSource = createModule(ctx.engine.id, {
      name: "audioSource",
      moduleType: ModuleType.Constant,
      props: { value: 1 },
    }) as Constant;
    audioSource.start(ctx.context.currentTime);

    inspector = createModule(ctx.engine.id, {
      name: "inspector",
      moduleType: ModuleType.Inspector,
      props: {},
    }) as Inspector;

    audioSource.audioNode.connect(gain.audioNode);
    gain.audioNode.connect(inspector.audioNode);
  });

  it("passes audio through with the default gain", async () => {
    const value = await waitForOutput(1);
    expect(value).toBeCloseTo(1, 1);
  });

  it.each([
    { gainValue: 0, expected: 0, tolerance: 0.01, name: "silences the signal" },
    {
      gainValue: 0.5,
      expected: 0.5,
      tolerance: 0.1,
      name: "attenuates the signal",
    },
    {
      gainValue: 2,
      expected: 2,
      tolerance: 0.1,
      name: "amplifies the signal",
    },
  ])(
    "$name when the gain prop changes",
    async ({ gainValue, expected, tolerance }) => {
      gain.props = { gain: gainValue };

      const value = await waitForOutput(expected, tolerance);
      expect(value).toBeCloseTo(expected, 1);
    },
  );

  it("uses the gain input for modulation", async () => {
    const modulationSource = createModule(gain.engineId, {
      name: "modulationSource",
      moduleType: ModuleType.Constant,
      props: { value: 0.5 },
    }) as Constant;
    modulationSource.start(0);

    gain.props = { gain: 0 };
    modulationSource.plug({ audioModule: gain, from: "out", to: "gain" });

    const value = await waitForOutput(0.5);
    expect(value).toBeCloseTo(0.5, 1);
  });

  it("updates the output when the modulation source changes", async () => {
    const modulationSource = createModule(gain.engineId, {
      name: "modulationSource",
      moduleType: ModuleType.Constant,
      props: { value: 0.25 },
    }) as Constant;
    modulationSource.start(0);

    gain.props = { gain: 0 };
    modulationSource.plug({ audioModule: gain, from: "out", to: "gain" });
    await waitForOutput(0.25);

    modulationSource.props = { value: 1 };

    const value = await waitForOutput(1);
    expect(value).toBeCloseTo(1, 1);
  });
});
