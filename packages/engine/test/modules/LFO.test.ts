import { describe, expect, it } from "vitest";
import { Module } from "@/core";
import { ModuleType } from "@/modules";
import { MonoLFO } from "@/modules/LFO";
import { waitForMicrotasks } from "../utils/waitForCondition";

describe("LFO", () => {
  it("initializes the phase parameter immediately from props", (ctx) => {
    const lfo = Module.create(MonoLFO, ctx.engine.id, {
      name: "LFO",
      moduleType: ModuleType.LFO,
      props: {
        phase: 0.25,
      },
    });

    expect(lfo.props.phase).toBe(0.25);
    expect(lfo.phaseParam.value).toBeCloseTo(0.25, 5);
  });

  it("updates the phase parameter when props change", async (ctx) => {
    const lfo = Module.create(MonoLFO, ctx.engine.id, {
      name: "LFO",
      moduleType: ModuleType.LFO,
      props: {
        phase: 0,
      },
    });

    lfo.props = { phase: 0.75 };
    await waitForMicrotasks();

    expect(lfo.props.phase).toBe(0.75);
    expect(lfo.phaseParam.value).toBeCloseTo(0.75, 5);
  });
});
