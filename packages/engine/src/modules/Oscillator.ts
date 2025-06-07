import { IAnyAudioContext, IModule, Module } from "@/core";
import Note from "@/core/Note";
import { nt, TTime } from "@/core/Timing/Time";
import { PropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

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
 */
export type IOscillatorProps = {
  wave: OscillatorWave;
  frequency: number;
  fine: number;
  coarse: number;
  octave: number;
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
};

const DEFAULT_PROPS: IOscillatorProps = {
  wave: OscillatorWave.sine,
  frequency: 440,
  fine: 0,
  coarse: 0,
  octave: 0,
};

export default class Oscillator extends Module<ModuleType.Oscillator> {
  declare audioNode: OscillatorNode;
  isStated: boolean = false;
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

    this.initializeGainDetune();
    this.registerInputs();
    this.registerDefaultIOs("out");
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
      this.detuneGain.connect(this.audioNode.detune);
    });

    this.isStated = false;
  }

  triggerAttack = (note: Note, triggeredAt: TTime) => {
    this.props = { frequency: note.frequency };
    this.updateFrequency(triggeredAt);
    this.start(triggeredAt);
  };

  triggerRelease = () => {
    // Do nothing
  };

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
}
