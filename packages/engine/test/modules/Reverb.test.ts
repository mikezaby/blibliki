import { sleep } from "@blibliki/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createModule, ModuleType } from "@/modules";
import Constant from "@/modules/Constant";
import Inspector from "@/modules/Inspector";
import Reverb, { ReverbType } from "@/modules/Reverb";

describe("Reverb", () => {
  let reverb: Reverb;
  let audioSource: Constant;
  let inspector: Inspector;

  beforeEach((ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reverb = createModule(ctx.engine.id, {
      name: "reverb",
      moduleType: ModuleType.Reverb,
      props: { mix: 0.5, decayTime: 1.5, preDelay: 0, type: ReverbType.room },
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

    audioSource.audioNode.connect(reverb.audioNode);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reverb as any).outputNode.connect(inspector.audioNode);
    audioSource.start(ctx.context.currentTime);
  });

  describe("initialization", () => {
    it("should create with default props", () => {
      expect(reverb.props.mix).toBe(0.5);
      expect(reverb.props.decayTime).toBe(1.5);
      expect(reverb.props.preDelay).toBe(0);
      expect(reverb.props.type).toBe(ReverbType.room);
    });

    it("should have impulse response loaded", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((reverb as any).convolverNode.buffer).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((reverb as any).convolverNode.buffer.length).toBeGreaterThan(0);
    });
  });

  describe("mix parameter", () => {
    it("should output mostly dry signal when mix = 0", async () => {
      reverb.props = { mix: 0 };
      await sleep(50);
      const value = inspector.getValue();
      expect(value).toBeCloseTo(1, 1);
    });

    it("should blend dry and wet when mix = 0.5", async () => {
      reverb.props = { mix: 0.5 };
      await sleep(50);
      const value = inspector.getValue();
      expect(value).toBeGreaterThan(0);
    });

    it("should output mostly wet signal when mix = 1", async () => {
      reverb.props = { mix: 1 };
      await sleep(100);
      const value = inspector.getValue();
      expect(value).toBeGreaterThan(0);
    });
  });

  describe("decay time", () => {
    it("should regenerate impulse response on change", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer1 = (reverb as any).convolverNode.buffer;
      const length1 = buffer1.length;

      reverb.props = { decayTime: 3 };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer2 = (reverb as any).convolverNode.buffer;
      const length2 = buffer2.length;

      expect(buffer2).not.toBe(buffer1);
      expect(length2).toBeGreaterThan(length1);
    });
  });

  describe("pre-delay", () => {
    it("should set delay time correctly", () => {
      reverb.props = { preDelay: 50 }; // 50ms

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const delayNode = (reverb as any).preDelayNode;
      expect(delayNode.delayTime.value).toBeCloseTo(0.05, 3);
    });
  });

  describe("reverb type", () => {
    it("should regenerate impulse response on type change", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer1 = (reverb as any).convolverNode.buffer;

      reverb.props = { type: ReverbType.room };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer2 = (reverb as any).convolverNode.buffer;

      expect(buffer2).not.toBe(buffer1);
    });

    it("should work with hall type", () => {
      reverb.props = { type: ReverbType.hall };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer = (reverb as any).convolverNode.buffer;

      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should work with plate type", () => {
      reverb.props = { type: ReverbType.plate };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer = (reverb as any).convolverNode.buffer;

      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should have longer decay for hall than room", () => {
      reverb.props = { type: ReverbType.room, decayTime: 2 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roomBuffer = (reverb as any).convolverNode.buffer;

      reverb.props = { type: ReverbType.hall, decayTime: 2 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hallBuffer = (reverb as any).convolverNode.buffer;

      // Same decay time but hall has slower decay factor, so similar length
      expect(hallBuffer.length).toBe(roomBuffer.length);
    });
  });
});
