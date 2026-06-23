import { describe, expect, it } from "vitest";
import { createModule, ModuleType } from "@/modules";
import Compressor, { compressorPropSchema } from "@/modules/Compressor";

describe("Compressor", () => {
  const createCompressor = (
    ctx: { engine: { id: string } },
    props: Partial<{
      threshold: number;
      ratio: number;
      knee: number;
      attack: number;
      release: number;
      makeup: number;
      mix: number;
    }> = {},
  ) =>
    createModule(ctx.engine.id, {
      name: "compressor",
      moduleType: ModuleType.Compressor,
      props,
    }) as Compressor;

  describe("registration", () => {
    it("creates a compressor with the approved defaults", (ctx) => {
      const compressor = createCompressor(ctx);

      expect(compressor).toBeInstanceOf(Compressor);
      expect(compressor.props).toEqual({
        threshold: 0,
        ratio: 4,
        knee: 6,
        attack: 0.001,
        release: 0.003,
        makeup: 0,
        mix: 1,
      });
    });

    it("defines the approved numeric ranges", () => {
      expect(compressorPropSchema).toEqual({
        threshold: expect.objectContaining({ min: -60, max: 0 }),
        ratio: expect.objectContaining({ min: 1, max: 20 }),
        knee: expect.objectContaining({ min: 0, max: 18 }),
        attack: expect.objectContaining({ min: 0, max: 1 }),
        release: expect.objectContaining({ min: 0, max: 1 }),
        makeup: expect.objectContaining({ min: -24, max: 24 }),
        mix: expect.objectContaining({ min: 0, max: 1 }),
      });
    });
  });

  describe("audio graph", () => {
    it("initializes native compressor parameters from props", (ctx) => {
      const compressor = createCompressor(ctx, {
        threshold: -18,
        ratio: 8,
        knee: 12,
        attack: 0.02,
        release: 0.4,
      });
      const compressorNode = (
        compressor as unknown as {
          compressorNode: DynamicsCompressorNode;
        }
      ).compressorNode;

      expect(compressorNode.threshold.value).toBeCloseTo(-18);
      expect(compressorNode.ratio.value).toBeCloseTo(8);
      expect(compressorNode.knee.value).toBeCloseTo(12);
      expect(compressorNode.attack.value).toBeCloseTo(0.02);
      expect(compressorNode.release.value).toBeCloseTo(0.4);
    });

    it("updates native parameters when props change", (ctx) => {
      const compressor = createCompressor(ctx);
      const compressorNode = (
        compressor as unknown as {
          compressorNode: DynamicsCompressorNode;
        }
      ).compressorNode;

      compressor.props = {
        threshold: -30,
        ratio: 10,
        knee: 3,
        attack: 0.1,
        release: 0.6,
      };

      expect(compressorNode.threshold.value).toBeCloseTo(-30);
      expect(compressorNode.ratio.value).toBeCloseTo(10);
      expect(compressorNode.knee.value).toBeCloseTo(3);
      expect(compressorNode.attack.value).toBeCloseTo(0.1);
      expect(compressorNode.release.value).toBeCloseTo(0.6);
    });

    it("clamps values before storing or applying them", (ctx) => {
      const compressor = createCompressor(ctx, {
        threshold: 6,
        ratio: 40,
        knee: 30,
        attack: -1,
        release: 2,
        makeup: 30,
        mix: -1,
      });

      expect(compressor.props).toEqual({
        threshold: 0,
        ratio: 20,
        knee: 18,
        attack: 0,
        release: 1,
        makeup: 24,
        mix: 0,
      });
    });

    it("converts makeup gain from decibels to linear gain", (ctx) => {
      const compressor = createCompressor(ctx, { makeup: 6 });
      const makeupNode = (
        compressor as unknown as {
          makeupNode: GainNode;
        }
      ).makeupNode;

      expect(makeupNode.gain.value).toBeCloseTo(10 ** (6 / 20), 5);

      compressor.props = { makeup: -6 };

      expect(makeupNode.gain.value).toBeCloseTo(10 ** (-6 / 20), 5);
    });

    it("delays the dry path to match compressor look-ahead", (ctx) => {
      const compressor = createCompressor(ctx);
      const dryDelayNode = (
        compressor as unknown as {
          dryDelayNode: DelayNode;
        }
      ).dryDelayNode;

      expect(dryDelayNode.delayTime.value).toBeCloseTo(0.006, 5);
    });

    it("uses a zero-latency dry path when mix is zero", (ctx) => {
      const compressor = createCompressor(ctx, { mix: 0 });
      const dryDelayNode = (
        compressor as unknown as {
          dryDelayNode: DelayNode;
        }
      ).dryDelayNode;

      expect(dryDelayNode.delayTime.value).toBe(0);

      compressor.props = { mix: 0.5 };
      expect(dryDelayNode.delayTime.value).toBeCloseTo(0.006, 5);

      compressor.props = { mix: 0 };
      expect(dryDelayNode.delayTime.value).toBe(0);
    });

    it("updates the equal-power dry and wet gains from mix", (ctx) => {
      const compressor = createCompressor(ctx, { mix: 0 });
      const wetDryMixer = (
        compressor as unknown as {
          wetDryMixer: {
            dryGainNode: GainNode;
            wetGainNode: GainNode;
          };
        }
      ).wetDryMixer;

      expect(wetDryMixer.dryGainNode.gain.value).toBeCloseTo(1);
      expect(wetDryMixer.wetGainNode.gain.value).toBeCloseTo(0);

      compressor.props = { mix: 1 };

      expect(wetDryMixer.dryGainNode.gain.value).toBeCloseTo(0);
      expect(wetDryMixer.wetGainNode.gain.value).toBeCloseTo(1);
    });

    it("exposes current gain reduction without serializing it", (ctx) => {
      const compressor = createCompressor(ctx);
      const compressorNode = (
        compressor as unknown as {
          compressorNode: DynamicsCompressorNode;
        }
      ).compressorNode;

      expect(compressor.getReduction()).toBe(compressorNode.reduction);
      expect(compressor.serialize()).not.toHaveProperty("reduction");
      expect(compressor.serialize()).not.toHaveProperty("state.reduction");
    });
  });
});
