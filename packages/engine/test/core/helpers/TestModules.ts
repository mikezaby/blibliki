import { Context } from "@blibliki/utils";
import { Module, SetterHooks } from "@/core/module/Module";
import { ModuleType } from "@/modules";
import { CustomWorklet, newAudioWorklet } from "@/processors";

/**
 * Test module for testing basic hook behavior with GainNode
 */
export class TestGainModule extends Module<ModuleType.Gain> {
  declare audioNode: GainNode;
  hookCalled = false;

  constructor(engineId: string) {
    super(engineId, {
      name: "test",
      moduleType: ModuleType.Gain,
      props: { gain: 0.5 },
      audioNodeConstructor: (context: Context) => {
        return context.audioContext.createGain();
      },
    });
  }

  onAfterSetGain = (value: number) => {
    this.hookCalled = true;
    this.audioNode.gain.value = value;
  };
}

/**
 * Test module for testing AudioWorklet parameter initialization
 */
export class TestAudioWorkletModule extends Module<ModuleType.Scale> {
  declare audioNode: AudioWorkletNode;
  hookCalled = false;

  constructor(engineId: string) {
    super(engineId, {
      name: "test",
      moduleType: ModuleType.Scale,
      props: {
        min: 100,
        max: 20000,
        current: 440,
        mode: "exponential" as const,
      },
      audioNodeConstructor: (context: Context) => {
        return newAudioWorklet(context, CustomWorklet.ScaleProcessor);
      },
    });
  }

  onAfterSetMin = (value: number) => {
    this.hookCalled = true;
    this.audioNode.parameters.get("min")!.value = value;
  };
}

/**
 * Test module for testing regular AudioNode params initialization
 */
export class TestRegularAudioNodeModule extends Module<ModuleType.Gain> {
  declare audioNode: GainNode;

  constructor(engineId: string) {
    super(engineId, {
      name: "test",
      moduleType: ModuleType.Gain,
      props: { gain: 0.75 },
      audioNodeConstructor: (context: Context) => {
        return context.audioContext.createGain();
      },
    });
  }

  onAfterSetGain: SetterHooks<{ gain: number }>["onAfterSetGain"] = (
    value,
  ) => {
    this.audioNode.gain.value = value;
  };
}
