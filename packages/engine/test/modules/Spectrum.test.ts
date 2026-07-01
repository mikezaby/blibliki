import { describe, it, expect, beforeEach } from "vitest";
import { createModule, ModuleType } from "@/modules";
import Spectrum from "@/modules/Spectrum";

describe("Spectrum", () => {
  let currentModule: Spectrum;

  beforeEach((ctx) => {
    currentModule = createModule(ctx.engine.id, {
      name: "spectrum",
      moduleType: ModuleType.Spectrum,
      props: {},
    }) as Spectrum;
  });

  describe("Initialize", () => {
    it("has proper type", () => {
      expect(currentModule.moduleType).toBe(ModuleType.Spectrum);
    });

    it("applies all analyser props immediately", () => {
      expect(currentModule.audioNode.fftSize).toBe(2048);
      expect(currentModule.audioNode.minDecibels).toBe(-100);
      expect(currentModule.audioNode.maxDecibels).toBe(-30);
      expect(currentModule.audioNode.smoothingTimeConstant).toBe(0.8);
    });
  });

  describe("getFrequencies", () => {
    it("returns one magnitude per frequency bin (fftSize / 2)", () => {
      expect(currentModule.getFrequencies().length).toBe(1024);
    });
  });

  describe("prop updates", () => {
    it("propagates decibel range changes to the analyser node", () => {
      currentModule.props = { minDecibels: -120, maxDecibels: -20 };
      expect(currentModule.audioNode.minDecibels).toBe(-120);
      expect(currentModule.audioNode.maxDecibels).toBe(-20);
    });
  });
});
