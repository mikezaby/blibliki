import { describe, it, expect, beforeEach } from "vitest";
import { createModule, ModuleType } from "@/modules";
import VuMeter from "@/modules/VuMeter";

describe("VuMeter", () => {
  let currentModule: VuMeter;

  beforeEach((ctx) => {
    currentModule = createModule(ctx.engine.id, {
      name: "vuMeter",
      moduleType: ModuleType.VuMeter,
      props: {},
    }) as VuMeter;
  });

  describe("Initialize", () => {
    it("has proper type", () => {
      expect(currentModule.moduleType).toBe(ModuleType.VuMeter);
    });

    it("has default props", () => {
      expect(currentModule.props.smoothing).toBe(0.8);
    });
  });

  describe("getPeaks", () => {
    it("returns a finite, non-negative level per channel", () => {
      const [left, right] = currentModule.getPeaks();
      expect(Number.isFinite(left)).toBe(true);
      expect(Number.isFinite(right)).toBe(true);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeGreaterThanOrEqual(0);
    });

    it("reports silence as zero on both channels", () => {
      expect(currentModule.getPeaks()).toEqual([0, 0]);
    });
  });
});
