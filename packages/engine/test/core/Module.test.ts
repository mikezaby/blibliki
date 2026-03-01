import { Context } from "@blibliki/utils";
import { describe, it, expect, beforeEach } from "vitest";
import { Module, SetterHooks } from "@/core/module/Module";
import { ICreateModule, ModuleType } from "@/modules";
import Gain, { MonoGain } from "@/modules/Gain";
import { CustomWorklet, newAudioWorklet } from "@/processors";
import {
  TestGainModule,
  TestAudioWorkletModule,
  TestRegularAudioNodeModule,
} from "./helpers/TestModules";

const DEFAULT_SCALE_PROPS = {
  min: 0,
  max: 1,
  current: 0.5,
  mode: "exponential" as const,
};

describe("Module", () => {
  let gain: MonoGain;

  beforeEach(async (ctx) => {
    gain = Module.create(MonoGain, ctx.engine.id, {
      name: "gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });
    // Wait for queueMicrotask in constructor to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  describe("initialize", () => {
    describe("hooks", () => {
      it("should call afterSet hooks during initialization", (ctx) => {
        const module = Module.create(TestGainModule, ctx.engine.id, {
          name: "test",
          moduleType: ModuleType.Gain,
          props: { gain: 0.5 },
        });

        // EXPECTED: Hook should be called during initialization
        // so that AudioNode values are set immediately
        expect(module.hookCalled).toBe(true);
        expect(module.audioNode.gain.value).toBe(0.5);
      });

      it("should initialize AudioWorklet parameters immediately", (ctx) => {
        const module = Module.create(TestAudioWorkletModule, ctx.engine.id, {
          name: "test",
          moduleType: ModuleType.Scale,
          props: {
            min: 100,
            max: 20000,
            current: 440,
            mode: "exponential" as const,
          },
        });

        // EXPECTED: Hook should be called during initialization
        expect(module.hookCalled).toBe(true);

        // EXPECTED: AudioWorklet parameter should have correct value immediately
        // not default value, so audio processing starts with correct values
        const minParam = module.audioNode.parameters.get("min")!;
        expect(minParam.value).toBe(100);
      });

      it("should ensure regular AudioNode params are set immediately", (ctx) => {
        const module = Module.create(
          TestRegularAudioNodeModule,
          ctx.engine.id,
          {
            name: "test",
            moduleType: ModuleType.Gain,
            props: { gain: 0.75 },
          },
        );

        // EXPECTED: Gain should be set immediately, not left at default
        expect(module.audioNode.gain.value).toBe(0.75);
      });
    });
  });

  describe("parent module access", () => {
    it("should expose parent poly module for voice modules", async (ctx) => {
      const polyGain = new Gain(ctx.engine.id, {
        name: "polyGain",
        moduleType: ModuleType.Gain,
        props: { gain: 1 },
        voices: 2,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(polyGain.audioModules).toHaveLength(2);
      expect(polyGain.audioModules[0]!.parentModule).toBe(polyGain);
      expect(polyGain.audioModules[1]!.parentModule).toBe(polyGain);
    });

    it("should keep parent poly module undefined for standalone modules", () => {
      expect(gain.parentModule).toBeUndefined();
    });
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
      static initInConstructor = false;

      constructor(engineId: string, params: ICreateModule<ModuleType.Scale>) {
        const props = { ...DEFAULT_SCALE_PROPS, ...params.props };
        const { initInConstructor } = TestAudioWorkletModule;

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
          ...params,
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
      TestAudioWorkletModule.initInConstructor = true;
      const module = TestAudioWorkletModule.create(
        TestAudioWorkletModule,
        ctx.engine.id,
        {
          name: "test",
          moduleType: ModuleType.Scale,
          props: { min: 100 },
        },
      );

      // Check immediately - should have correct value from audioNodeConstructor
      // This is the Envelope pattern: set params BEFORE returning the node
      expect(module.minParam.value).toBe(100);
    });

    it("should still have correct param value immediately when relying on hooks", (ctx) => {
      TestAudioWorkletModule.initInConstructor = false;
      const module = TestAudioWorkletModule.create(
        TestAudioWorkletModule,
        ctx.engine.id,
        {
          name: "test",
          moduleType: ModuleType.Scale,
          props: { min: 100 },
        },
      );

      // Hooks run during Module.create initialization.
      expect(module.hookValue).toBe(100);
      expect(module.minParam.value).toBe(100);
    });

    it("should keep the same correct value after microtask", async (ctx) => {
      TestAudioWorkletModule.initInConstructor = false;
      const module = TestAudioWorkletModule.create(
        TestAudioWorkletModule,
        ctx.engine.id,
        {
          name: "test",
          moduleType: ModuleType.Scale,
          props: { min: 100 },
        },
      );

      // Already correct immediately.
      expect(module.hookValue).toBe(100);
      expect(module.minParam.value).toBe(100);

      // Should stay stable after microtask.
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

      expect(module.hookValue).toBe(100);
      expect(module.minParam.value).toBe(100);
    });

    it("should demonstrate hook execution within Module.create initialization", (ctx) => {
      // Track what values are seen at different stages
      const timeline: Array<{
        stage: string;
        propsMin: number;
        paramValue: number;
      }> = [];

      class TimingTestModule extends Module<ModuleType.Scale> {
        declare audioNode: AudioWorkletNode;

        constructor(engineId: string, params: ICreateModule<ModuleType.Scale>) {
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
            ...params,
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

      const module = TimingTestModule.create(TimingTestModule, ctx.engine.id, {
        name: "TimingTestModule",
        moduleType: ModuleType.Scale,
        props: {},
      });

      // Hooks are triggered before Module.create returns.
      expect(module).toBeDefined();
      expect(timeline.length).toBe(4);
      expect(timeline[0]!.stage).toBe("audioNodeConstructor");
      expect(timeline[0]!.propsMin).toBe(500);
      expect(timeline[0]!.paramValue).toBeCloseTo(1e-10, 10); // Default!

      expect(timeline[1]!.stage).toBe("constructor_after_super");
      expect(timeline[1]!.propsMin).toBe(500);
      expect(timeline[1]!.paramValue).toBeCloseTo(1e-10, 10); // Still default!

      expect(timeline[2]!.stage).toBe("onAfterSetMin_hook");
      expect(timeline[2]!.propsMin).toBe(500);
      expect(timeline[2]!.paramValue).toBeCloseTo(1e-10, 10); // Before set

      expect(timeline[3]!.stage).toBe("onAfterSetMin_after_set");
      expect(timeline[3]!.propsMin).toBe(500);
      expect(timeline[3]!.paramValue).toBe(500);
    });
  });

  describe("Hook effectiveness", () => {
    class HookTestModule extends Module<ModuleType.Scale> {
      declare audioNode: AudioWorkletNode;
      hookWasCalled = false;
      hookReceivedValue: number | null = null;
      hookSuccessfullySet = false;

      constructor(engineId: string, params: ICreateModule<ModuleType.Scale>) {
        const props = { ...DEFAULT_SCALE_PROPS, ...params.props };

        const audioNodeConstructor = (context: Context) => {
          // Do NOT initialize - let hooks do it
          return newAudioWorklet(context, CustomWorklet.ScaleProcessor);
        };

        super(engineId, {
          ...params,
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

    it("should call hooks during initialization", async (ctx) => {
      const module = HookTestModule.create(HookTestModule, ctx.engine.id, {
        name: "hookTest",
        moduleType: ModuleType.Scale,
        props: { min: 777 },
      });

      // Hooks run during Module.create.
      expect(module.hookWasCalled).toBe(true);
      expect(module.hookReceivedValue).toBe(777);

      // Still true after microtask.
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

      expect(module.hookWasCalled).toBe(true);
      expect(module.hookReceivedValue).toBe(777);
    });

    it("should successfully modify AudioParam values in hooks", async (ctx) => {
      const module = HookTestModule.create(HookTestModule, ctx.engine.id, {
        name: "hookTest",
        moduleType: ModuleType.Scale,
        props: { min: 888 },
      });

      // Wait for hooks
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

      // Check if hook actually succeeded in setting the value
      expect(module.hookSuccessfullySet).toBe(true);
      expect(module.minParam.value).toBe(888);
    });

    it("should have access to this.audioNode in hooks", async (ctx) => {
      const module = HookTestModule.create(HookTestModule, ctx.engine.id, {
        name: "hookTest",
        moduleType: ModuleType.Scale,
        props: { min: 999 },
      });

      // Wait for hooks
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

      // Check audioNode is defined
      expect(module.audioNode).toBeDefined();
      expect(module.audioNode.parameters).toBeDefined();
      expect(module.audioNode.parameters.get("min")).toBeDefined();
    });

    it("should demonstrate hooks set values immediately and remain stable", async (ctx) => {
      const module = HookTestModule.create(HookTestModule, ctx.engine.id, {
        name: "hookTest",
        moduleType: ModuleType.Scale,
        props: { min: 123 },
      });

      const immediateValue = module.minParam.value;
      expect(immediateValue).toBe(123);
      expect(module.hookSuccessfullySet).toBe(true);

      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

      expect(module.minParam.value).toBe(123);
      expect(module.hookSuccessfullySet).toBe(true);
    });
  });
});
