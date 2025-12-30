import { Context } from "@blibliki/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { WetDryMixer } from "@/utils";

describe("WetDryMixer", () => {
  let mixer: WetDryMixer;
  let context: Context;

  beforeEach((ctx) => {
    context = ctx.context;
    mixer = new WetDryMixer(context);
  });

  describe("initialization", () => {
    it("should create with correct initial state", () => {
      const dryInput = mixer.getDryInput();
      const wetInput = mixer.getWetInput();
      const output = mixer.getOutput();

      expect(dryInput).toBeDefined();
      expect(wetInput).toBeDefined();
      expect(output).toBeDefined();

      // Initial mix should be 0 (full dry)
      expect(dryInput.gain.value).toBe(1);
      expect(wetInput.gain.value).toBe(0);
      expect(output.gain.value).toBe(1);
    });
  });

  describe("setMix", () => {
    it("should set full dry when mix = 0", () => {
      mixer.setMix(0);

      expect(mixer.getDryInput().gain.value).toBeCloseTo(1, 5);
      expect(mixer.getWetInput().gain.value).toBeCloseTo(0, 5);
    });

    it("should set equal power when mix = 0.5", () => {
      mixer.setMix(0.5);

      const dryGain = mixer.getDryInput().gain.value;
      const wetGain = mixer.getWetInput().gain.value;

      // Both should be approximately 0.707 (1/sqrt(2))
      expect(dryGain).toBeCloseTo(0.707, 2);
      expect(wetGain).toBeCloseTo(0.707, 2);

      // Power sum should equal 1
      expect(dryGain * dryGain + wetGain * wetGain).toBeCloseTo(1, 5);
    });

    it("should set full wet when mix = 1", () => {
      mixer.setMix(1);

      expect(mixer.getDryInput().gain.value).toBeCloseTo(0, 5);
      expect(mixer.getWetInput().gain.value).toBeCloseTo(1, 5);
    });

    it("should use equal-power crossfade curve", () => {
      // Test several points along the curve
      const testPoints = [
        { mix: 0, dry: 1, wet: 0 },
        { mix: 0.25, dry: 0.924, wet: 0.383 },
        { mix: 0.5, dry: 0.707, wet: 0.707 },
        { mix: 0.75, dry: 0.383, wet: 0.924 },
        { mix: 1, dry: 0, wet: 1 },
      ];

      for (const point of testPoints) {
        mixer.setMix(point.mix);

        const dryGain = mixer.getDryInput().gain.value;
        const wetGain = mixer.getWetInput().gain.value;

        expect(dryGain).toBeCloseTo(point.dry, 2);
        expect(wetGain).toBeCloseTo(point.wet, 2);

        // Verify equal power: dry² + wet² = 1
        const powerSum = dryGain * dryGain + wetGain * wetGain;
        expect(powerSum).toBeCloseTo(1, 5);
      }
    });
  });

  describe("connectInput", () => {
    it("should connect source to dry input", () => {
      const sourceNode = context.audioContext.createOscillator();

      // This should not throw
      expect(() => mixer.connectInput(sourceNode)).not.toThrow();
    });
  });

  describe("disconnect", () => {
    it("should disconnect all nodes", () => {
      // This should not throw
      expect(() => mixer.disconnect()).not.toThrow();
    });
  });
});
