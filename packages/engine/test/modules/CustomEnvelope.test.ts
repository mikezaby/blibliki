import { sleep } from "@blibliki/utils";
import { describe, expect, it } from "vitest";
import { ModuleType } from "@/modules";
import Constant from "@/modules/Constant";
import CustomEnvelope from "@/modules/CustomEnvelope";
import Inspector from "@/modules/Inspector";

const DEFAULT_PROPS = {
  attack: 0.01,
  attackCurve: 0.5,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3,
};

describe("CustomEnvelope", () => {
  describe("Initialize", () => {
    it("has proper type", (ctx) => {
      const envelope = new CustomEnvelope(ctx.engine.id, {
        name: "envelope",
        moduleType: ModuleType.CustomEnvelope,
        props: DEFAULT_PROPS,
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      expect(envelope.moduleType).toBe(ModuleType.CustomEnvelope);
    });

    it("has default ADSR values", (ctx) => {
      const envelope = new CustomEnvelope(ctx.engine.id, {
        name: "envelope",
        moduleType: ModuleType.CustomEnvelope,
        props: DEFAULT_PROPS,
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      expect(envelope.props.attack).toBe(0.01);
      expect(envelope.props.decay).toBe(0.1);
      expect(envelope.props.sustain).toBe(0.7);
      expect(envelope.props.release).toBe(0.3);
    });

    it("accepts custom ADSR values", (ctx) => {
      const envelope = new CustomEnvelope(ctx.engine.id, {
        name: "envelope",
        moduleType: ModuleType.CustomEnvelope,
        props: {
          attack: 0.05,
          attackCurve: 0.5,
          decay: 0.2,
          sustain: 0.5,
          release: 0.5,
        },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      expect(envelope.props.attack).toBe(0.05);
      expect(envelope.props.decay).toBe(0.2);
      expect(envelope.props.sustain).toBe(0.5);
      expect(envelope.props.release).toBe(0.5);
    });
  });

  describe("Triggering with Constant module", () => {
    it("should output silence when not triggered", async (ctx) => {
      const envelope = new CustomEnvelope(ctx.engine.id, {
        name: "envelope",
        moduleType: ModuleType.CustomEnvelope,
        props: DEFAULT_PROPS,
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      const inspector = new Inspector(ctx.engine.id, {
        name: "inspector",
        moduleType: ModuleType.Inspector,
        props: {},
      });

      // Wait for audioModules to be created (happens in queueMicrotask)
      await sleep(10);

      // Connect envelope audioNode to inspector
      const monoEnvelope = envelope.audioModules[0]!;
      (monoEnvelope.audioNode as AudioWorkletNode).connect(inspector.audioNode);

      await sleep(50);

      const value = inspector.getValue();

      // Should be essentially silent (close to MIN_GAIN = 0.00001)
      expect(value).toBeLessThan(0.0001);
    });

    it("should rise during attack when triggered", async (ctx) => {
      const envelope = new CustomEnvelope(ctx.engine.id, {
        name: "envelope",
        moduleType: ModuleType.CustomEnvelope,
        props: {
          attack: 0.1, // 100ms attack
          attackCurve: 0.5,
          decay: 0.1,
          sustain: 0.7,
          release: 0.1,
        },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      const constant = new Constant(ctx.engine.id, {
        name: "constant",
        moduleType: ModuleType.Constant,
        props: {
          value: 1, // Trigger on
        },
      });
      constant.start(ctx.context.currentTime);

      const inspector = new Inspector(ctx.engine.id, {
        name: "inspector",
        moduleType: ModuleType.Inspector,
        props: {},
      });

      // Wait for audioModules to be created
      await sleep(10);

      // Get the mono envelope module
      const monoEnvelope = envelope.audioModules[0]!;
      const workletNode = monoEnvelope.audioNode as AudioWorkletNode;

      // Connect constant to trigger param
      constant.audioNode.connect(workletNode.parameters.get("trigger")!);

      // Connect envelope to inspector
      workletNode.connect(inspector.audioNode);

      await sleep(50);

      const value = inspector.getValue();

      // Should be rising or have reached peak
      expect(value).toBeGreaterThan(0.1);
    });

    it("should reach sustain level and hold", async (ctx) => {
      const envelope = new CustomEnvelope(ctx.engine.id, {
        name: "envelope",
        moduleType: ModuleType.CustomEnvelope,
        props: {
          attack: 0.02, // 20ms attack (fast)
          attackCurve: 0.5,
          decay: 0.02, // 20ms decay (fast)
          sustain: 0.5,
          release: 0.1,
        },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      const constant = new Constant(ctx.engine.id, {
        name: "constant",
        moduleType: ModuleType.Constant,
        props: {
          value: 1, // Trigger on
        },
      });
      constant.start(ctx.context.currentTime);

      const inspector = new Inspector(ctx.engine.id, {
        name: "inspector",
        moduleType: ModuleType.Inspector,
        props: {},
      });

      await sleep(10);

      const monoEnvelope = envelope.audioModules[0]!;
      const workletNode = monoEnvelope.audioNode as AudioWorkletNode;
      constant.audioNode.connect(workletNode.parameters.get("trigger")!);
      workletNode.connect(inspector.audioNode);

      await sleep(100);

      const value = inspector.getValue();

      // Should be around sustain level (0.5)
      expect(value).toBeGreaterThan(0.4);
      expect(value).toBeLessThan(0.6);
    });

    it("should release when trigger goes to 0", async (ctx) => {
      const envelope = new CustomEnvelope(ctx.engine.id, {
        name: "envelope",
        moduleType: ModuleType.CustomEnvelope,
        props: {
          attack: 0.01, // 10ms attack (very fast)
          attackCurve: 0.5,
          decay: 0.01, // 10ms decay (very fast)
          sustain: 0.8,
          release: 0.05, // 50ms release
        },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      const constant = new Constant(ctx.engine.id, {
        name: "constant",
        moduleType: ModuleType.Constant,
        props: {
          value: 1, // Trigger on
        },
      });
      constant.start(ctx.context.currentTime);

      const inspector = new Inspector(ctx.engine.id, {
        name: "inspector",
        moduleType: ModuleType.Inspector,
        props: {},
      });

      await sleep(10);

      const monoEnvelope = envelope.audioModules[0]!;
      const workletNode = monoEnvelope.audioNode as AudioWorkletNode;
      constant.audioNode.connect(workletNode.parameters.get("trigger")!);
      workletNode.connect(inspector.audioNode);

      await sleep(50);

      const sustainValue = inspector.getValue();

      // Should be at sustain level
      expect(sustainValue).toBeGreaterThan(0.7);

      // Now release by setting constant to 0
      constant.props = { value: 0 };
      await sleep(50);

      const releaseValue = inspector.getValue();

      // Should be lower than sustain (releasing)
      expect(releaseValue).toBeLessThan(sustainValue);
    });

    it("should handle retriggering during release", async (ctx) => {
      const envelope = new CustomEnvelope(ctx.engine.id, {
        name: "envelope",
        moduleType: ModuleType.CustomEnvelope,
        props: {
          attack: 0.02,
          attackCurve: 0.5,
          decay: 0.02,
          sustain: 0.7,
          release: 0.2, // Long release (200ms)
        },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      const constant = new Constant(ctx.engine.id, {
        name: "constant",
        moduleType: ModuleType.Constant,
        props: {
          value: 1, // Trigger on
        },
      });
      constant.start(ctx.context.currentTime);

      const inspector = new Inspector(ctx.engine.id, {
        name: "inspector",
        moduleType: ModuleType.Inspector,
        props: {},
      });

      await sleep(10);

      const monoEnvelope = envelope.audioModules[0]!;
      const workletNode = monoEnvelope.audioNode as AudioWorkletNode;
      constant.audioNode.connect(workletNode.parameters.get("trigger")!);
      workletNode.connect(inspector.audioNode);

      // Wait for sustain
      await sleep(50);

      // Release
      constant.props = { value: 0 };
      await sleep(30);

      // Retrigger during release
      constant.props = { value: 1 };
      await sleep(50);

      const value = inspector.getValue();

      // Should be back at sustain level after retriggering
      expect(value).toBeGreaterThan(0.5);
    });
  });

  describe("Parameter updates", () => {
    it("should update attack parameter", (ctx) => {
      const envelope = new CustomEnvelope(ctx.engine.id, {
        name: "envelope",
        moduleType: ModuleType.CustomEnvelope,
        props: { ...DEFAULT_PROPS, attack: 0.01 },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      envelope.props = { ...envelope.props, attack: 0.5 };
      expect(envelope.props.attack).toBe(0.5);
    });

    it("should update decay parameter", (ctx) => {
      const envelope = new CustomEnvelope(ctx.engine.id, {
        name: "envelope",
        moduleType: ModuleType.CustomEnvelope,
        props: { ...DEFAULT_PROPS, decay: 0.1 },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      envelope.props = { ...envelope.props, decay: 0.3 };
      expect(envelope.props.decay).toBe(0.3);
    });

    it("should update sustain parameter", (ctx) => {
      const envelope = new CustomEnvelope(ctx.engine.id, {
        name: "envelope",
        moduleType: ModuleType.CustomEnvelope,
        props: { ...DEFAULT_PROPS, sustain: 0.7 },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      envelope.props = { ...envelope.props, sustain: 0.4 };
      expect(envelope.props.sustain).toBe(0.4);
    });

    it("should update release parameter", (ctx) => {
      const envelope = new CustomEnvelope(ctx.engine.id, {
        name: "envelope",
        moduleType: ModuleType.CustomEnvelope,
        props: { ...DEFAULT_PROPS, release: 0.3 },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      envelope.props = { ...envelope.props, release: 0.8 };
      expect(envelope.props.release).toBe(0.8);
    });
  });
});
