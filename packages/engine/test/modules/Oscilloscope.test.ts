import { describe, it, expect, beforeEach } from "vitest";
import { createModule, ModuleType } from "@/modules";
import Oscilloscope from "@/modules/Oscilloscope";

describe("Oscilloscope", () => {
  let currentModule: Oscilloscope;

  beforeEach((ctx) => {
    currentModule = createModule(ctx.engine.id, {
      name: "oscilloscope",
      moduleType: ModuleType.Oscilloscope,
      props: {},
    }) as Oscilloscope;
  });

  describe("Initialize", () => {
    it("has proper type", () => {
      expect(currentModule.moduleType).toBe(ModuleType.Oscilloscope);
    });

    it("has default props", () => {
      expect(currentModule.props.fftSize).toBe(1024);
    });

    it("applies fftSize to the analyser node immediately", () => {
      expect(currentModule.audioNode.fftSize).toBe(1024);
    });
  });

  describe("getValues", () => {
    it("returns a time-domain buffer sized to fftSize", () => {
      expect(currentModule.getValues().length).toBe(1024);
    });

    it("resizes the buffer when fftSize changes", () => {
      currentModule.props = { fftSize: 256 };
      expect(currentModule.audioNode.fftSize).toBe(256);
      expect(currentModule.getValues().length).toBe(256);
    });
  });
});
