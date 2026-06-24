import { describe, expect, it } from "vitest";
import { createModule, ModuleType } from "@/modules";
import Compressor, { compressorPropSchema } from "@/modules/Compressor";
import { waitForValue } from "../utils/waitForCondition";

const waitForCloseValue = async (
  read: () => number,
  expected: number,
  description: string,
  precision = 5,
) => {
  const tolerance = 10 ** -precision;
  const value = await waitForValue(
    read,
    (candidate) => Math.abs(candidate - expected) <= tolerance,
    {
      timeoutMs: 500,
      intervalMs: 1,
      description,
    },
  );

  expect(value).toBeCloseTo(expected, precision);
};

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
    it("initializes native compressor parameters from props", async (ctx) => {
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

      await waitForCloseValue(
        () => compressorNode.threshold.value,
        -18,
        "compressor threshold initialization",
      );
      await waitForCloseValue(
        () => compressorNode.ratio.value,
        8,
        "compressor ratio initialization",
      );
      await waitForCloseValue(
        () => compressorNode.knee.value,
        12,
        "compressor knee initialization",
      );
      await waitForCloseValue(
        () => compressorNode.attack.value,
        0.02,
        "compressor attack initialization",
      );
      await waitForCloseValue(
        () => compressorNode.release.value,
        0.4,
        "compressor release initialization",
      );
    });

    it("updates native parameters when props change", async (ctx) => {
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

      await waitForCloseValue(
        () => compressorNode.threshold.value,
        -30,
        "compressor threshold update",
      );
      await waitForCloseValue(
        () => compressorNode.ratio.value,
        10,
        "compressor ratio update",
      );
      await waitForCloseValue(
        () => compressorNode.knee.value,
        3,
        "compressor knee update",
      );
      await waitForCloseValue(
        () => compressorNode.attack.value,
        0.1,
        "compressor attack update",
      );
      await waitForCloseValue(
        () => compressorNode.release.value,
        0.6,
        "compressor release update",
      );
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

    it("converts makeup gain from decibels to linear gain", async (ctx) => {
      const compressor = createCompressor(ctx, { makeup: 6 });
      const makeupNode = (
        compressor as unknown as {
          makeupNode: GainNode;
        }
      ).makeupNode;

      await waitForCloseValue(
        () => makeupNode.gain.value,
        10 ** (6 / 20),
        "compressor makeup initialization",
      );

      compressor.props = { makeup: -6 };

      await waitForCloseValue(
        () => makeupNode.gain.value,
        10 ** (-6 / 20),
        "compressor makeup update",
      );
    });

    it("delays the dry path to match compressor look-ahead", async (ctx) => {
      const compressor = createCompressor(ctx);
      const dryDelayNode = (
        compressor as unknown as {
          dryDelayNode: DelayNode;
        }
      ).dryDelayNode;

      await waitForCloseValue(
        () => dryDelayNode.delayTime.value,
        0.006,
        "compressor dry delay initialization",
      );
    });

    it("uses a zero-latency dry path when mix is zero", async (ctx) => {
      const compressor = createCompressor(ctx, { mix: 0 });
      const dryDelayNode = (
        compressor as unknown as {
          dryDelayNode: DelayNode;
        }
      ).dryDelayNode;

      await waitForCloseValue(
        () => dryDelayNode.delayTime.value,
        0,
        "compressor dry delay disabled",
      );

      compressor.props = { mix: 0.5 };
      await waitForCloseValue(
        () => dryDelayNode.delayTime.value,
        0.006,
        "compressor dry delay enabled",
      );

      compressor.props = { mix: 0 };
      await waitForCloseValue(
        () => dryDelayNode.delayTime.value,
        0,
        "compressor dry delay disabled after update",
      );
    });

    it("updates the equal-power dry and wet gains from mix", async (ctx) => {
      const compressor = createCompressor(ctx, { mix: 0 });
      const wetDryMixer = (
        compressor as unknown as {
          wetDryMixer: {
            dryGainNode: GainNode;
            wetGainNode: GainNode;
          };
        }
      ).wetDryMixer;

      await waitForCloseValue(
        () => wetDryMixer.dryGainNode.gain.value,
        1,
        "compressor dry gain initialization",
      );
      await waitForCloseValue(
        () => wetDryMixer.wetGainNode.gain.value,
        0,
        "compressor wet gain initialization",
      );

      compressor.props = { mix: 1 };

      await waitForCloseValue(
        () => wetDryMixer.dryGainNode.gain.value,
        0,
        "compressor dry gain update",
      );
      await waitForCloseValue(
        () => wetDryMixer.wetGainNode.gain.value,
        1,
        "compressor wet gain update",
      );
    });

    it("exposes current gain reduction without serializing it", (ctx) => {
      const compressor = createCompressor(ctx);

      expect(compressor.getReduction()).toEqual(expect.any(Number));
      expect(compressor.serialize()).not.toHaveProperty("reduction");
      expect(compressor.serialize()).not.toHaveProperty("state.reduction");
    });
  });
});
