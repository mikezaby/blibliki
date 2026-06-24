import { beforeEach, describe, expect, it } from "vitest";
import { createModule, DelayTimeMode, ModuleType } from "@/modules";
import Constant from "@/modules/Constant";
import Delay from "@/modules/Delay";
import Inspector from "@/modules/Inspector";
import { waitForInspectorValue } from "../utils/audioWaits";
import { waitForValue } from "../utils/waitForCondition";

const waitForCloseValue = async (
  read: () => number,
  expected: number,
  description: string,
  precision = 3,
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

describe("Delay", () => {
  let delay: Delay;
  let audioSource: Constant;
  let inspector: Inspector;

  beforeEach((ctx) => {
    delay = createModule(ctx.engine.id, {
      name: "delay",
      moduleType: ModuleType.Delay,
      props: {
        time: 500,
        timeMode: DelayTimeMode.short,
        sync: false,
        division: "1/4",
        feedback: 0.5,
        mix: 0.5,
        stereo: false,
      },
    }) as any;

    audioSource = createModule(ctx.engine.id, {
      name: "audioSource",
      moduleType: ModuleType.Constant,
      props: { value: 1 },
    }) as Constant;

    inspector = createModule(ctx.engine.id, {
      name: "inspector",
      moduleType: ModuleType.Inspector,
      props: {},
    }) as Inspector;

    audioSource.audioNode.connect(delay.audioNode);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (delay as any).outputNode.connect(inspector.audioNode);
    audioSource.start(ctx.context.currentTime);
  });

  describe("initialization", () => {
    it("should create with default props", () => {
      expect(delay.props.time).toBe(500);
      expect(delay.props.timeMode).toBe(DelayTimeMode.short);
      expect(delay.props.sync).toBe(false);
      expect(delay.props.division).toBe("1/4");
      expect(delay.props.feedback).toBe(0.5);
      expect(delay.props.mix).toBe(0.5);
      expect(delay.props.stereo).toBe(false);
    });

    it("should have delay node configured", async () => {
      expect((delay as any).delayNode).toBeDefined();
      await waitForCloseValue(
        () => (delay as any).delayNode.delayTime.value,
        0.5,
        "initial delay time",
      );
    });

    it("should not over-allocate delay buffer capacity in manual mode", () => {
      const delayCapacitySeconds = (delay as any).delayCapacitySeconds;
      expect(delayCapacitySeconds).toBeLessThanOrEqual(5);
    });
  });

  describe("mix parameter", () => {
    it("should output mostly dry signal when mix = 0", async () => {
      delay.props = { mix: 0 };
      const wetDryMixer = (delay as any).wetDryMixer;

      await waitForCloseValue(
        () => wetDryMixer.getDryInput().gain.value,
        1,
        "dry delay mix gain",
      );
      await waitForCloseValue(
        () => wetDryMixer.getWetInput().gain.value,
        0,
        "wet delay mix gain",
      );
      const value = await waitForInspectorValue(
        inspector,
        (currentValue) => Math.abs(currentValue - 1) < 0.1,
        { description: "dry delay output" },
      );
      expect(value).toBeCloseTo(1, 1);
    });

    it("should blend dry and wet when mix = 0.5", async () => {
      delay.props = { mix: 0.5 };
      const wetDryMixer = (delay as any).wetDryMixer;

      await waitForCloseValue(
        () => wetDryMixer.getDryInput().gain.value,
        Math.SQRT1_2,
        "dry blended delay mix gain",
      );
      await waitForCloseValue(
        () => wetDryMixer.getWetInput().gain.value,
        Math.SQRT1_2,
        "wet blended delay mix gain",
      );
      const value = await waitForInspectorValue(
        inspector,
        (currentValue) => Math.abs(currentValue - Math.SQRT1_2) < 0.1,
        { description: "blended delay output" },
      );
      expect(value).toBeCloseTo(Math.SQRT1_2, 1);
    });

    it("should output mostly wet signal when mix = 1", async () => {
      delay.props = { mix: 1 };
      const wetDryMixer = (delay as any).wetDryMixer;

      await waitForCloseValue(
        () => wetDryMixer.getDryInput().gain.value,
        0,
        "dry muted delay mix gain",
      );
      await waitForCloseValue(
        () => wetDryMixer.getWetInput().gain.value,
        1,
        "wet delay mix gain",
      );
      await waitForInspectorValue(
        inspector,
        (currentValue) => Math.abs(currentValue) < 0.05,
        { description: "muted dry delay output" },
      );
      const value = await waitForInspectorValue(
        inspector,
        (currentValue) => Math.abs(currentValue) > 0,
        { description: "wet delay output", timeoutMs: 1500 },
      );
      expect(value).toBeGreaterThan(0);
    });
  });

  describe("delay time", () => {
    it("should update delay time parameter", async () => {
      delay.props = { time: 750 };

      const delayNode = (delay as any).delayNode;
      await waitForCloseValue(
        () => delayNode.delayTime.value,
        0.75,
        "updated delay time",
      );
    });

    it("should handle very short delay times", async () => {
      delay.props = { time: 10 };

      const delayNode = (delay as any).delayNode;
      await waitForCloseValue(
        () => delayNode.delayTime.value,
        0.01,
        "short delay time",
      );
    });
  });

  describe("feedback", () => {
    it("should set feedback gain correctly", async () => {
      delay.props = { feedback: 0.7 };

      const feedbackGain = (delay as any).feedbackGain;
      await waitForCloseValue(
        () => feedbackGain.gain.value,
        0.7,
        "updated feedback gain",
      );
    });

    it("should cap feedback at 0.95", async () => {
      delay.props = { feedback: 1.5 }; // Try to exceed

      const feedbackGain = (delay as any).feedbackGain;
      await waitForCloseValue(
        () => feedbackGain.gain.value,
        0.95,
        "capped feedback gain",
      );
    });

    it("should allow zero feedback", async () => {
      delay.props = { feedback: 0 };

      const feedbackGain = (delay as any).feedbackGain;
      await waitForCloseValue(
        () => feedbackGain.gain.value,
        0,
        "zero feedback gain",
      );
    });
  });

  describe("time mode", () => {
    it("should clamp time when switching from long to short mode", () => {
      delay.props = { timeMode: DelayTimeMode.long, time: 4000 };
      expect(delay.props.time).toBe(4000);

      delay.props = { timeMode: DelayTimeMode.short };
      expect(delay.props.time).toBe(2000); // Clamped to short max
    });

    it("should not clamp time when within short mode range", () => {
      delay.props = { timeMode: DelayTimeMode.long, time: 1500 };
      delay.props = { timeMode: DelayTimeMode.short };
      expect(delay.props.time).toBe(1500); // Unchanged
    });
  });

  describe("stereo mode", () => {
    it("should switch to stereo ping-pong mode", () => {
      delay.props = { stereo: true };

      expect((delay as any).delayLeft).toBeDefined();
      expect((delay as any).delayRight).toBeDefined();
      expect((delay as any).feedbackLeft).toBeDefined();
      expect((delay as any).feedbackRight).toBeDefined();
      expect((delay as any).merger).toBeDefined();
    });

    it("should switch back to mono mode", () => {
      delay.props = { stereo: true };
      delay.props = { stereo: false };

      // Should still have stereo nodes but using mono graph
      expect((delay as any).outputNode).toBeDefined();
    });

    it("should sync delay times in stereo mode", async () => {
      delay.props = { stereo: true, time: 400 };

      const delayLeft = (delay as any).delayLeft;
      const delayRight = (delay as any).delayRight;

      await waitForCloseValue(
        () => delayLeft.delayTime.value,
        0.4,
        "left stereo delay time",
      );
      await waitForCloseValue(
        () => delayRight.delayTime.value,
        0.4,
        "right stereo delay time",
      );
    });

    it("should sync feedback gains in stereo mode", async () => {
      delay.props = { stereo: true, feedback: 0.7 };

      const feedbackLeft = (delay as any).feedbackLeft;
      const feedbackRight = (delay as any).feedbackRight;

      await waitForCloseValue(
        () => feedbackLeft.gain.value,
        0.7,
        "left stereo feedback gain",
      );
      await waitForCloseValue(
        () => feedbackRight.gain.value,
        0.7,
        "right stereo feedback gain",
      );
    });
  });

  describe("sync mode", () => {
    it("should use manual time when sync is disabled", async () => {
      delay.props = { sync: false, time: 750 };

      const delayNode = (delay as any).delayNode;
      await waitForCloseValue(
        () => delayNode.delayTime.value,
        0.75,
        "manual delay time with sync disabled",
      );
    });

    it("should store sync and division properties", () => {
      delay.props = { sync: true, division: "1/8" };

      expect(delay.props.sync).toBe(true);
      expect(delay.props.division).toBe("1/8");
    });

    it("should not update delay time when division changes in manual mode", async () => {
      delay.props = { sync: false, time: 750, division: "1/4" };

      // Change division (should not affect delay time in manual mode)
      delay.props = { division: "1/8" };

      const delayNode = (delay as any).delayNode;
      await waitForCloseValue(
        () => delayNode.delayTime.value,
        0.75,
        "manual delay time after division change",
      );
    });
  });
});
