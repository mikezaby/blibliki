import { ContextTime } from "@blibliki/transport";
import { Context, dbToGain } from "@blibliki/utils";
import { GainNode, OscillatorNode } from "@blibliki/utils/web-audio-api";
import { IModule, Module } from "@/core";
import Note from "@/core/Note";
import { IModuleConstructor, SetterHooks } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

const LOW_GAIN = -18;

export type IOscillator = IModule<ModuleType.Oscillator>;

export enum OscillatorWave {
  sine = "sine",
  triangle = "triangle",
  square = "square",
  sawtooth = "sawtooth",
}

/**
 * Props for the Oscillator module.
 *
 * @property wave - Waveform shape of the oscillator.
 *                  One of: "sine", "square", "sawtooth", "triangle", or "custom".
 * @property frequency - Base frequency in Hz (e.g. 440 for A4).
 * @property fine - Fine tuning factor in the range [-1, 1], where ±1 represents ±1 semitone.
 * @property coarse - Coarse tuning factor in the range [-1, 1], scaled to ±12 semitones.
 * @property octave - Octave transposition value (e.g. +1 for one octave up, -2 for two octaves down).
 * @property lowGain - Whether to gain reduction (-18dB). When false, oscillator runs at full gain.
 */
export type IOscillatorProps = {
  wave: OscillatorWave;
  frequency: number;
  fine: number;
  coarse: number;
  octave: number;
  lowGain: boolean;
};

export const oscillatorPropSchema: ModulePropSchema<
  IOscillatorProps,
  {
    wave: EnumProp<OscillatorWave>;
  }
> = {
  wave: {
    kind: "enum",
    options: Object.values(OscillatorWave),
    label: "Waveform",
  },
  frequency: {
    kind: "number",
    min: 0,
    max: 25000,
    step: 1,
    label: "Frequency",
  },
  fine: {
    kind: "number",
    min: -1,
    max: 1,
    step: 0.01,
    label: "Fine",
  },
  coarse: {
    kind: "number",
    min: -12,
    max: 12,
    step: 1,
    label: "Coarse",
  },
  octave: {
    kind: "number",
    min: -1,
    max: 2,
    step: 1,
    label: "Octave",
  },
  lowGain: {
    kind: "boolean",
    label: `Use ${LOW_GAIN}db Gain`,
  },
};

const DEFAULT_PROPS: IOscillatorProps = {
  wave: OscillatorWave.sine,
  frequency: 440,
  fine: 0,
  coarse: 0,
  octave: 0,
  lowGain: false,
};

type OscillatorSetterHooks = Pick<
  SetterHooks<IOscillatorProps>,
  | "onAfterSetWave"
  | "onAfterSetFrequency"
  | "onAfterSetFine"
  | "onAfterSetCoarse"
  | "onAfterSetOctave"
  | "onAfterSetLowGain"
>;

export class MonoOscillator
  extends Module<ModuleType.Oscillator>
  implements OscillatorSetterHooks
{
  declare audioNode: OscillatorNode;
  isStated = false;
  outputGain: GainNode;
  detuneGain!: GainNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.Oscillator>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) =>
      new OscillatorNode(context.audioContext);

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.outputGain = new GainNode(this.context.audioContext, {
      gain: dbToGain(LOW_GAIN),
    });

    this.applyOutputGain();
    this.initializeGainDetune();
    this.registerInputs();
    this.registerOutputs();
  }

  onAfterSetWave: OscillatorSetterHooks["onAfterSetWave"] = (value) => {
    this.audioNode.type = value;
  };

  onAfterSetFrequency: OscillatorSetterHooks["onAfterSetFrequency"] = () => {
    this.updateFrequency();
  };

  onAfterSetFine: OscillatorSetterHooks["onAfterSetFine"] = () => {
    this.updateFrequency();
  };

  onAfterSetCoarse: OscillatorSetterHooks["onAfterSetCoarse"] = () => {
    this.updateFrequency();
  };

  onAfterSetOctave: OscillatorSetterHooks["onAfterSetOctave"] = () => {
    this.updateFrequency();
  };

  onAfterSetLowGain: OscillatorSetterHooks["onAfterSetLowGain"] = (lowGain) => {
    this.outputGain.gain.value = lowGain ? dbToGain(LOW_GAIN) : 1;
  };

  start(time: ContextTime) {
    if (this.isStated) return;

    this.isStated = true;
    this.audioNode.start(time);
  }

  stop(time: ContextTime) {
    if (!this.isStated) return;

    this.audioNode.stop(time);
    this.rePlugAll(() => {
      this.audioNode = new OscillatorNode(this.context.audioContext, {
        type: this.props.wave,
        frequency: this.finalFrequency,
      });
      this.applyOutputGain();
      this.detuneGain.connect(this.audioNode.detune);
    });

    this.isStated = false;
  }

  triggerAttack = (note: Note, triggeredAt: ContextTime) => {
    super.triggerAttack(note, triggeredAt);

    this.props = { frequency: note.frequency };
    this.updateFrequency(triggeredAt);
    this.start(triggeredAt);
  };

  triggerRelease(note: Note, triggeredAt: ContextTime) {
    super.triggerRelease(note, triggeredAt);

    const lastNote = this.activeNotes.length
      ? this.activeNotes[this.activeNotes.length - 1]
      : null;
    if (!lastNote) return;

    this.props = { frequency: lastNote.frequency };
    this.updateFrequency(triggeredAt);
  }

  private get finalFrequency(): number | undefined {
    const { frequency, coarse, octave, fine } = this.props;

    const transposed =
      frequency * Math.pow(2, coarse / 12 + octave + fine / 12);
    return transposed;
  }

  private updateFrequency(actionAt?: ContextTime) {
    if (this.finalFrequency === undefined) return;

    if (actionAt) {
      this.audioNode.frequency.setValueAtTime(this.finalFrequency, actionAt);
    } else {
      this.audioNode.frequency.value = this.finalFrequency;
    }
  }

  private applyOutputGain() {
    this.audioNode.connect(this.outputGain);
  }

  private initializeGainDetune() {
    this.detuneGain = new GainNode(this.context.audioContext, { gain: 100 });
    this.detuneGain.connect(this.audioNode.detune);
  }

  private registerInputs() {
    this.registerAudioInput({
      name: "detune",
      getAudioNode: () => this.detuneGain,
    });

    this.registerAudioInput({
      name: "fm",
      getAudioNode: () => this.audioNode.frequency,
    });
  }

  private registerOutputs() {
    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.outputGain,
    });
  }
}

export default class Oscillator extends PolyModule<ModuleType.Oscillator> {
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.Oscillator>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.Oscillator>,
    ) => new MonoOscillator(engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerInputs();
    this.registerDefaultIOs("out");
  }

  start(time: ContextTime) {
    this.audioModules.forEach((audioModule) => {
      audioModule.start(time);
    });
  }

  stop(time: ContextTime) {
    this.audioModules.forEach((audioModule) => {
      audioModule.stop(time);
    });
  }

  private registerInputs() {
    this.registerAudioInput({ name: "detune" });
    this.registerAudioInput({ name: "fm" });
  }
}
