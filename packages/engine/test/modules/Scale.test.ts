import { beforeEach, describe, expect, it } from "vitest";
import { Module } from "@/core";
import { createModule, ModuleType } from "@/modules";
import Constant from "@/modules/Constant";
import Inspector from "@/modules/Inspector";
import { MonoScale } from "@/modules/Scale";
import { waitForValue } from "../utils/waitForCondition";

describe("Scale", () => {
  let scale: MonoScale;
  let amount: Constant;
  let inspector: Inspector;

  const waitForOutput = async (expected: number, tolerance = 1) =>
    waitForValue(
      () => inspector.getValue(),
      (value) => Math.abs(value - expected) <= tolerance,
      {
        description: `scale output near ${expected}`,
      },
    );

  const waitForFiniteOutput = async () =>
    waitForValue(() => inspector.getValue(), Number.isFinite, {
      description: "finite scale output",
    });

  beforeEach((ctx) => {
    scale = Module.create(MonoScale, ctx.engine.id, {
      name: "filterScale",
      moduleType: ModuleType.Scale,
      props: { min: 20, max: 20000, current: 440, mode: "exponential" },
    });

    amount = createModule(ctx.engine.id, {
      name: "amount",
      moduleType: ModuleType.Constant,
      props: { value: 1 },
    }) as Constant;
    amount.start(ctx.context.currentTime);

    inspector = createModule(ctx.engine.id, {
      name: "inspector",
      moduleType: ModuleType.Inspector,
      props: {},
    }) as Inspector;

    amount.plug({ audioModule: scale, from: "out", to: "in" });
    scale.audioNode.connect(inspector.audioNode);
  });

  it.each([
    {
      amountValue: -1,
      expected: 20,
      name: "returns min at full negative input",
    },
    { amountValue: 0, expected: 440, name: "returns current at zero input" },
    {
      amountValue: 1,
      expected: 20000,
      name: "returns max at full positive input",
    },
    {
      amountValue: 0.5,
      expected: 2966,
      tolerance: 5,
      name: "moves toward max in exponential mode",
    },
  ])("$name", async ({ amountValue, expected, tolerance }) => {
    amount.props = { value: amountValue };

    const value = await waitForOutput(expected, tolerance);
    expect(value).toBeCloseTo(expected, 0);
  });

  it("updates the output when current changes", async () => {
    amount.props = { value: 0 };
    scale.props = { current: 220 };

    const value = await waitForOutput(220);
    expect(value).toBeCloseTo(220, 1);
  });

  it.each([
    {
      amountValue: -0.5,
      expected: 25,
      name: "moves halfway toward min in linear mode",
    },
    {
      amountValue: 0.5,
      expected: 75,
      name: "moves halfway toward max in linear mode",
    },
  ])("$name", async ({ amountValue, expected }) => {
    scale.props = { min: 0, max: 100, current: 50, mode: "linear" };
    amount.props = { value: amountValue };

    const value = await waitForOutput(expected);
    expect(value).toBeCloseTo(expected, 1);
  });

  it("keeps the output finite when the exponential range collapses to zero", async () => {
    scale.props = { min: 0, max: 0, current: 0 };
    amount.props = { value: 0 };

    const value = await waitForFiniteOutput();
    expect(value).toBe(0);
  });

  it("supports negative ranges in linear mode", async () => {
    scale.props = { min: -100, max: -20, current: -60, mode: "linear" };
    amount.props = { value: 0.5 };

    const value = await waitForOutput(-40);
    expect(value).toBeCloseTo(-40, 1);
  });
});
