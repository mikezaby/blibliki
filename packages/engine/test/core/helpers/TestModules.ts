import { Context } from "@blibliki/utils";
import { Module } from "@/core/module/Module";
import { ICreateModule, ModuleType } from "@/modules";
import { CustomWorklet, newAudioWorklet } from "@/processors";

const DEFAULT_GAIN_PROPS = { gain: 1 };
const DEFAULT_SCALE_PROPS = {
  min: 0,
  max: 1,
  current: 0.5,
  mode: "exponential" as const,
};

/**
 * Test module for testing basic hook behavior with GainNode
 */
export class TestGainModule extends Module<ModuleType.Gain> {
  declare audioNode: GainNode;
  hookCalled = false;

  constructor(engineId: string, params: ICreateModule<ModuleType.Gain>) {
    const props = { ...DEFAULT_GAIN_PROPS, ...params.props };
    super(engineId, {
      ...params,
      props,
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

  constructor(engineId: string, params: ICreateModule<ModuleType.Scale>) {
    const props = { ...DEFAULT_SCALE_PROPS, ...params.props };
    super(engineId, {
      ...params,
      props,
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

  constructor(engineId: string, params: ICreateModule<ModuleType.Gain>) {
    const props = { ...DEFAULT_GAIN_PROPS, ...params.props };
    super(engineId, {
      ...params,
      props,
      audioNodeConstructor: (context: Context) => {
        return context.audioContext.createGain();
      },
    });
  }

  onAfterSetGain = (value: number) => {
    this.audioNode.gain.value = value;
  };
}
