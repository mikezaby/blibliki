import { Context } from "@blibliki/utils";
import { describe, it, expect, beforeEach } from "vitest";
import { Module, SetterHooks } from "@/core/module/Module";
import { ModuleType } from "@/modules";
import { MonoGain } from "@/modules/Gain";
import { CustomWorklet, newAudioWorklet } from "@/processors";

describe("Module", () => {
  let gain: MonoGain;

  beforeEach(async (ctx) => {
    gain = new MonoGain(ctx.engine.id, {
      name: "gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });
    // Wait for queueMicrotask in constructor to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  describe("props setter", () => {
    describe("when setting a different value", () => {
      it("should update the prop", () => {
        gain.props = { gain: 0.5 };
        expect(gain.props.gain).toBe(0.5);
      });

      it("should create a new props object", () => {
        const propsBefore = gain["_props"];
        gain.props = { gain: 0.5 };
        const propsAfter = gain["_props"];
        expect(propsBefore).not.toBe(propsAfter);
      });
    });

    describe("when setting the same value", () => {
      it("should not update internal _props object", () => {
        const propsBefore = gain["_props"];
        gain.props = { gain: 1 };
        const propsAfter = gain["_props"];
        expect(propsBefore).toBe(propsAfter); // Same object reference
      });

      it("should keep the same prop value", () => {
        expect(gain.props.gain).toBe(1);
        gain.props = { gain: 1 };
        expect(gain.props.gain).toBe(1);
      });
    });

    describe("when setting multiple props", () => {
      it("should only update changed values", () => {
        const propsBefore = gain["_props"];

        // Setting same value again should not create new object
        gain.props = { gain: 1 };
        expect(gain["_props"]).toBe(propsBefore);

        // Setting different value should create new object
        gain.props = { gain: 2 };
        expect(gain["_props"]).not.toBe(propsBefore);
        expect(gain.props.gain).toBe(2);
      });
    });

    describe("when setting undefined value", () => {
      it("should not update the prop", () => {
        gain.props = { gain: 0.5 };
        gain.props = { gain: undefined };
        expect(gain.props.gain).toBe(0.5);
      });
    });

    describe("when no values change", () => {
      it("should return early without creating new props object", () => {
        gain.props = { gain: 1 };
        const propsBefore = gain["_props"];
        gain.props = { gain: 1 };
        const propsAfter = gain["_props"];

        // Should be same object reference (not spread)
        expect(propsBefore).toBe(propsAfter);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle rapid successive prop changes", () => {
      gain.props = { gain: 0.1 };
      gain.props = { gain: 0.2 };
      gain.props = { gain: 0.3 };
      expect(gain.props.gain).toBe(0.3);
    });

    it("should handle prop changes with same value multiple times", () => {
      const propsAfterFirstSet = ((gain.props = { gain: 0.5 }), gain["_props"]);
      gain.props = { gain: 0.5 };
      gain.props = { gain: 0.5 };

      // Should still be the same object (no new object created)
      expect(gain["_props"]).toBe(propsAfterFirstSet);
    });

    it("should handle alternating between two values", () => {
      const propsInitial = gain["_props"];

      gain.props = { gain: 0.5 };
      const propsAfter1 = gain["_props"];
      expect(propsAfter1).not.toBe(propsInitial);

      gain.props = { gain: 1 };
      const propsAfter2 = gain["_props"];
      expect(propsAfter2).not.toBe(propsAfter1);

      gain.props = { gain: 0.5 };
      const propsAfter3 = gain["_props"];
      expect(propsAfter3).not.toBe(propsAfter2);

      gain.props = { gain: 1 };
      const propsAfter4 = gain["_props"];
      expect(propsAfter4).not.toBe(propsAfter3);
    });
  });

  describe("AudioWorklet parameter initialization", () => {
    // Test module for AudioWorklet initialization patterns
    class TestAudioWorkletModule extends Module<ModuleType.Scale> {
      declare audioNode: AudioWorkletNode;
      hookValue: number | null = null;

      constructor(engineId: string, value: number, initInConstructor: boolean) {
        const props = {
          min: value,
          max: 20000,
          current: 440,
          mode: "exponential" as const,
        };

        const audioNodeConstructor = (context: Context) => {
          const audioNode = newAudioWorklet(
            context,
            CustomWorklet.ScaleProcessor,
          );

          if (initInConstructor) {
            // Envelope pattern - initialize in audioNodeConstructor
            // NOTE: Cannot access 'this' here - runs during super() before derived class initialized
            audioNode.parameters.get("min")!.value = props.min;
          }

          return audioNode;
        };

        super(engineId, {
          name: "test",
          moduleType: ModuleType.Scale,
          props,
          audioNodeConstructor,
        });
      }

      get minParam() {
        return this.audioNode.parameters.get("min")!;
      }

      onAfterSetMin: SetterHooks<any>["onAfterSetMin"] = (value) => {
        this.minParam.value = value;
        this.hookValue = value;
      };
    }

    it("should have correct param value immediately when initialized in audioNodeConstructor", (ctx) => {
      const module = new TestAudioWorkletModule(ctx.engine.id, 100, true);

      // Check immediately - should have correct value from audioNodeConstructor
      // This is the Envelope pattern: set params BEFORE returning the node
      expect(module.minParam.value).toBe(100);
    });

    it("should have wrong param value immediately when NOT initialized in audioNodeConstructor", (ctx) => {
      const module = new TestAudioWorkletModule(ctx.engine.id, 100, false);

      // Check immediately - should have DEFAULT value (1e-10), not 100
      // This demonstrates the problem: without explicit initialization,
      // AudioWorklet starts with processor's default values
      expect(module.minParam.value).not.toBe(100);
      expect(module.minParam.value).toBeCloseTo(1e-10, 10); // Default from ScaleProcessor
    });

    it("should have correct value after microtask when hooks run", async (ctx) => {
      const module = new TestAudioWorkletModule(ctx.engine.id, 100, false);

      // Initially wrong
      expect(module.minParam.value).toBeCloseTo(1e-10, 10);
      expect(module.hookValue).toBeNull();

      // Wait for hooks
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

      // After hooks - should be correct
      expect(module.hookValue).toBe(100);
      expect(module.minParam.value).toBe(100);
    });

    it("should demonstrate the timing issue with props access during construction", (ctx) => {
      // Track what values are seen at different stages
      const timeline: Array<{
        stage: string;
        propsMin: number;
        paramValue: number;
      }> = [];

      class TimingTestModule extends Module<ModuleType.Scale> {
        declare audioNode: AudioWorkletNode;

        constructor(engineId: string) {
          const props = {
            min: 500,
            max: 20000,
            current: 440,
            mode: "exponential" as const,
          };

          const audioNodeConstructor = (context: Context) => {
            const audioNode = newAudioWorklet(
              context,
              CustomWorklet.ScaleProcessor,
            );

            // Record: audioNodeConstructor stage
            timeline.push({
              stage: "audioNodeConstructor",
              propsMin: props.min,
              paramValue: audioNode.parameters.get("min")!.value,
            });

            return audioNode;
          };

          super(engineId, {
            name: "test",
            moduleType: ModuleType.Scale,
            props,
            audioNodeConstructor,
          });

          // Record: after super() but before hooks
          timeline.push({
            stage: "constructor_after_super",
            propsMin: this.props.min,
            paramValue: this.audioNode.parameters.get("min")!.value,
          });
        }

        onAfterSetMin: SetterHooks<any>["onAfterSetMin"] = (value) => {
          // Record: hook execution
          timeline.push({
            stage: "onAfterSetMin_hook",
            propsMin: value,
            paramValue: this.audioNode.parameters.get("min")!.value,
          });

          this.audioNode.parameters.get("min")!.value = value;

          // Record: after setting in hook
          timeline.push({
            stage: "onAfterSetMin_after_set",
            propsMin: value,
            paramValue: this.audioNode.parameters.get("min")!.value,
          });
        };
      }

      const module = new TimingTestModule(ctx.engine.id);

      // Check timeline before hooks run
      expect(module).toBeDefined();
      expect(timeline.length).toBe(2);
      expect(timeline[0]!.stage).toBe("audioNodeConstructor");
      expect(timeline[0]!.propsMin).toBe(500);
      expect(timeline[0]!.paramValue).toBeCloseTo(1e-10, 10); // Default!

      expect(timeline[1]!.stage).toBe("constructor_after_super");
      expect(timeline[1]!.propsMin).toBe(500);
      expect(timeline[1]!.paramValue).toBeCloseTo(1e-10, 10); // Still default!
    });
  });

  describe("Hook effectiveness", () => {
    class HookTestModule extends Module<ModuleType.Scale> {
      declare audioNode: AudioWorkletNode;
      hookWasCalled = false;
      hookReceivedValue: number | null = null;
      hookSuccessfullySet = false;

      constructor(engineId: string, minValue: number) {
        const props = {
          min: minValue,
          max: 20000,
          current: 440,
          mode: "exponential" as const,
        };

        const audioNodeConstructor = (context: Context) => {
          // Do NOT initialize - let hooks do it
          return newAudioWorklet(context, CustomWorklet.ScaleProcessor);
        };

        super(engineId, {
          name: "hookTest",
          moduleType: ModuleType.Scale,
          props,
          audioNodeConstructor,
        });
      }

      get minParam() {
        return this.audioNode.parameters.get("min")!;
      }

      onAfterSetMin: SetterHooks<any>["onAfterSetMin"] = (value) => {
        this.hookWasCalled = true;
        this.hookReceivedValue = value;

        // Try to set the value
        const paramBefore = this.minParam.value;
        this.minParam.value = value;
        const paramAfter = this.minParam.value;

        // Verify it actually changed
        this.hookSuccessfullySet =
          paramAfter === value && paramBefore !== value;
      };
    }

    it("should call hooks after microtask", async (ctx) => {
      const module = new HookTestModule(ctx.engine.id, 777);

      // Before hooks
      expect(module.hookWasCalled).toBe(false);

      // Wait for hooks
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

      // After hooks
      expect(module.hookWasCalled).toBe(true);
      expect(module.hookReceivedValue).toBe(777);
    });

    it("should successfully modify AudioParam values in hooks", async (ctx) => {
      const module = new HookTestModule(ctx.engine.id, 888);

      // Wait for hooks
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

      // Check if hook actually succeeded in setting the value
      expect(module.hookSuccessfullySet).toBe(true);
      expect(module.minParam.value).toBe(888);
    });

    it("should have access to this.audioNode in hooks", async (ctx) => {
      const module = new HookTestModule(ctx.engine.id, 999);

      // Wait for hooks
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

      // Check audioNode is defined
      expect(module.audioNode).toBeDefined();
      expect(module.audioNode.parameters).toBeDefined();
      expect(module.audioNode.parameters.get("min")).toBeDefined();
    });

    it("should demonstrate hooks work correctly but timing matters", async (ctx) => {
      const module = new HookTestModule(ctx.engine.id, 123);

      // Immediately check - wrong value
      const immediateValue = module.minParam.value;
      expect(immediateValue).toBeCloseTo(1e-10, 10); // Default

      // Wait for hooks
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

      // After hooks - correct value
      expect(module.minParam.value).toBe(123);
      expect(module.hookSuccessfullySet).toBe(true);

      // This proves: Hooks DO work and DO set values correctly.
      // The problem is NOT that hooks fail - it's that AudioWorklet
      // already processed audio with wrong defaults before hooks ran.
    });
  });
});
