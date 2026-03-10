import { describe, expect, it } from "vitest";
import { Module } from "@/core/module/Module";
import { ModuleType } from "@/modules";
import { MonoDistortion } from "@/modules/Distortion";

describe("Distortion", () => {
  it("should initialize and allow drive updates without throwing", (ctx) => {
    expect(() => {
      const distortion = Module.create(MonoDistortion, ctx.engine.id, {
        name: "distortion",
        moduleType: ModuleType.Distortion,
        props: {
          drive: 2,
          tone: 8000,
          mix: 1,
        },
      });

      distortion.props = { drive: 4 };
      distortion.props = { drive: 1 };
    }).not.toThrow();
  });

  it("should keep a fixed waveshaper curve when drive changes", (ctx) => {
    const distortion = Module.create(MonoDistortion, ctx.engine.id, {
      name: "distortion",
      moduleType: ModuleType.Distortion,
      props: {
        drive: 2,
        tone: 8000,
        mix: 1,
      },
    });

    const sampleIndex = 49152; // x ~= 0.5 for 65536-sample curve
    const initialCurveValue = (distortion as any).waveshaper.curve[sampleIndex];

    distortion.props = { drive: 8 };

    const updatedCurveValue = (distortion as any).waveshaper.curve[sampleIndex];
    expect(updatedCurveValue).toBeCloseTo(initialCurveValue, 6);
  });
});
