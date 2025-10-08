import { dbToGain } from "@blibliki/utils";
import { IAnyAudioContext, IModule, Module } from "@/core";
import Note from "@/core/Note";
import { nt, TTime } from "@/core/Timing/Time";
import { IModuleConstructor } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { PropSchema } from "@/core/schema";
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

export const oscillatorPropSchema: PropSchema<IOscillatorProps> = {
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
    min: -4,
    max: 4,
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

export class MonoOscillator extends Module<ModuleType.Oscillator> {
  declare audioNode: OscillatorNode;
  isStated: boolean = false;
  lowOutputGain: GainNode;
  detuneGain!: GainNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.Oscillator>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: IAnyAudioContext) =>
      new OscillatorNode(context);

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.lowOutputGain = new GainNode(this.context, {
      gain: dbToGain(LOW_GAIN),
    });

    this.applyOutputGain();
    this.initializeGainDetune();
    this.registerInputs();
    this.registerOutputs();
  }

  protected onAfterSetWave(value: OscillatorWave) {
    this.audioNode.type = value;
  }

  protected onAfterSetFrequency() {
    this.updateFrequency();
  }

  protected onAfterSetFine() {
    this.updateFrequency();
  }

  protected onAfterSetCoarse() {
    this.updateFrequency();
  }

  protected onAfterSetOctave() {
    this.updateFrequency();
  }

  protected onAfterSetLowGain() {
    if (!this.superInitialized) return;

    this.rePlugAll();
  }

  start(time: TTime) {
    if (this.isStated) return;

    this.isStated = true;
    this.audioNode.start(nt(time));
  }

  stop(time: TTime) {
    this.audioNode.stop(nt(time));
    this.rePlugAll(() => {
      this.audioNode = new OscillatorNode(this.context, {
        type: this.props["wave"],
        frequency: this.finalFrequency,
      });
      this.applyOutputGain();
      this.detuneGain.connect(this.audioNode.detune);
    });

    this.isStated = false;
  }

  triggerAttack = (note: Note, triggeredAt: TTime) => {
    super.triggerAttack(note, triggeredAt);

    this.props = { frequency: note.frequency };
    this.updateFrequency(triggeredAt);
    this.start(triggeredAt);
  };

  triggerRelease(note: Note, triggeredAt: TTime) {
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
    if (!this.superInitialized) return;

    const transposed =
      frequency * Math.pow(2, coarse / 12 + octave + fine / 12);
    return transposed;
  }

  private updateFrequency(actionAt?: TTime) {
    if (this.finalFrequency === undefined) return;

    if (actionAt) {
      this.audioNode.frequency.setValueAtTime(
        this.finalFrequency,
        nt(actionAt),
      );
    } else {
      this.audioNode.frequency.value = this.finalFrequency;
    }
  }

  private applyOutputGain() {
    this.audioNode.connect(this.lowOutputGain);
  }

  private initializeGainDetune() {
    this.detuneGain = new GainNode(this.context, { gain: 100 });
    this.detuneGain.connect(this.audioNode.detune);
  }

  private registerInputs() {
    this.registerAudioInput({
      name: "detune",
      getAudioNode: () => this.detuneGain,
    });
  }

  private registerOutputs() {
    this.registerAudioOutput({
      name: "out",
      getAudioNode: () =>
        this.props.lowGain ? this.lowOutputGain : this.audioNode,
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

  start(time: TTime) {
    this.audioModules.forEach((audioModule) => {
      audioModule.start(time);
    });
  }

  stop(time: TTime) {
    this.audioModules.forEach((audioModule) => {
      audioModule.stop(time);
    });
  }

  private registerInputs() {
    this.registerAudioInput({ name: "detune" });
  }
}
