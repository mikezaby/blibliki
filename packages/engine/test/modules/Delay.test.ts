import { sleep } from "@blibliki/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createModule, DelayTimeMode, ModuleType } from "@/modules";
import Constant from "@/modules/Constant";
import Delay from "@/modules/Delay";
import Inspector from "@/modules/Inspector";

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

    it("should have delay node configured", () => {
      expect((delay as any).delayNode).toBeDefined();
      expect((delay as any).delayNode.delayTime.value).toBeCloseTo(0.5, 3);
    });
  });

  describe("mix parameter", () => {
    it("should output mostly dry signal when mix = 0", async () => {
      delay.props = { mix: 0 };
      await sleep(50);
      const value = inspector.getValue();
      expect(value).toBeCloseTo(1, 1);
    });

    it("should blend dry and wet when mix = 0.5", async () => {
      delay.props = { mix: 0.5 };
      await sleep(50);
      const value = inspector.getValue();
      expect(value).toBeGreaterThan(0);
    });

    it("should output mostly wet signal when mix = 1", async () => {
      delay.props = { mix: 1 };
      await sleep(600); // Wait for delay + feedback
      const value = inspector.getValue();
      expect(value).toBeGreaterThan(0);
    });
  });

  describe("delay time", () => {
    it("should update delay time parameter", () => {
      delay.props = { time: 750 };

      const delayNode = (delay as any).delayNode;
      expect(delayNode.delayTime.value).toBeCloseTo(0.75, 3);
    });

    it("should handle very short delay times", () => {
      delay.props = { time: 10 };

      const delayNode = (delay as any).delayNode;
      expect(delayNode.delayTime.value).toBeCloseTo(0.01, 3);
    });
  });

  describe("feedback", () => {
    it("should set feedback gain correctly", () => {
      delay.props = { feedback: 0.7 };

      const feedbackGain = (delay as any).feedbackGain;
      expect(feedbackGain.gain.value).toBeCloseTo(0.7, 3);
    });

    it("should cap feedback at 0.95", () => {
      delay.props = { feedback: 1.5 }; // Try to exceed

      const feedbackGain = (delay as any).feedbackGain;
      expect(feedbackGain.gain.value).toBeLessThanOrEqual(0.95);
    });

    it("should allow zero feedback", () => {
      delay.props = { feedback: 0 };

      const feedbackGain = (delay as any).feedbackGain;
      expect(feedbackGain.gain.value).toBe(0);
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

    it("should sync delay times in stereo mode", () => {
      delay.props = { stereo: true, time: 400 };

      const delayLeft = (delay as any).delayLeft;
      const delayRight = (delay as any).delayRight;

      expect(delayLeft.delayTime.value).toBeCloseTo(0.4, 3);
      expect(delayRight.delayTime.value).toBeCloseTo(0.4, 3);
    });

    it("should sync feedback gains in stereo mode", () => {
      delay.props = { stereo: true, feedback: 0.7 };

      const feedbackLeft = (delay as any).feedbackLeft;
      const feedbackRight = (delay as any).feedbackRight;

      expect(feedbackLeft.gain.value).toBeCloseTo(0.7, 3);
      expect(feedbackRight.gain.value).toBeCloseTo(0.7, 3);
    });
  });

  describe("sync mode", () => {
    it("should use manual time when sync is disabled", () => {
      delay.props = { sync: false, time: 750 };

      const delayNode = (delay as any).delayNode;
      expect(delayNode.delayTime.value).toBeCloseTo(0.75, 3);
    });

    it("should store sync and division properties", () => {
      delay.props = { sync: true, division: "1/8" };

      expect(delay.props.sync).toBe(true);
      expect(delay.props.division).toBe("1/8");
    });

    it("should not update delay time when division changes in manual mode", () => {
      delay.props = { sync: false, time: 750, division: "1/4" };

      // Change division (should not affect delay time in manual mode)
      delay.props = { division: "1/8" };

      const delayNode = (delay as any).delayNode;
      expect(delayNode.delayTime.value).toBeCloseTo(0.75, 3);
    });
  });
});
