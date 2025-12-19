import { TPB } from "@blibliki/transport";
import { Context } from "@blibliki/utils";
import { ConstantSourceNode, GainNode } from "@blibliki/utils/web-audio-api";
import { IModule, Module } from "@/core";
import { IModuleConstructor, SetterHooks } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { CustomWorklet, newAudioWorklet } from "@/processors";
import { ICreateModule, ModuleType } from ".";

export type ILFO = IModule<ModuleType.LFO>;

export enum LFOMode {
  free = "free",
  bpm = "bpm",
}

export enum LFOWaveform {
  sine = "sine",
  triangle = "triangle",
  square = "square",
  sawtooth = "sawtooth",
  rampDown = "rampDown",
  random = "random",
}

export type NoteDivision =
  | "1/64"
  | "1/48"
  | "1/32"
  | "1/24"
  | "1/16"
  | "1/12"
  | "1/8"
  | "1/6"
  | "3/16"
  | "1/4"
  | "5/16"
  | "1/3"
  | "3/8"
  | "1/2"
  | "3/4"
  | "1"
  | "1.5"
  | "2"
  | "3"
  | "4"
  | "6"
  | "8"
  | "16"
  | "32";

export const NOTE_DIVISIONS: NoteDivision[] = [
  "1/64",
  "1/48",
  "1/32",
  "1/24",
  "1/16",
  "1/12",
  "1/8",
  "1/6",
  "3/16",
  "1/4",
  "5/16",
  "1/3",
  "3/8",
  "1/2",
  "3/4",
  "1",
  "1.5",
  "2",
  "3",
  "4",
  "6",
  "8",
  "16",
  "32",
];

export type ILFOProps = {
  mode: LFOMode;
  frequency: number;
  division: NoteDivision;
  waveform: LFOWaveform;
  offset: number;
  amount: number;
};

const DEFAULT_PROPS: ILFOProps = {
  mode: LFOMode.free,
  frequency: 1.0,
  division: "1/4",
  waveform: LFOWaveform.sine,
  offset: 0,
  amount: 1,
};

export const lfoPropSchema: ModulePropSchema<
  ILFOProps,
  {
    mode: EnumProp<LFOMode>;
    division: EnumProp<NoteDivision>;
    waveform: EnumProp<LFOWaveform>;
  }
> = {
  mode: {
    kind: "enum",
    options: Object.values(LFOMode),
    label: "Mode",
  },
  frequency: {
    kind: "number",
    min: 0.01,
    max: 40,
    step: 0.01,
    exp: 3,
    label: "Frequency (Hz)",
  },
  division: {
    kind: "enum",
    options: NOTE_DIVISIONS,
    label: "Division",
  },
  waveform: {
    kind: "enum",
    options: Object.values(LFOWaveform),
    label: "Waveform",
  },
  offset: {
    kind: "number",
    min: -1,
    max: 1,
    step: 0.01,
    label: "Offset",
  },
  amount: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Amount",
  },
};

// Map note divisions to ticks
const DIVISION_TO_TICKS: Record<NoteDivision, number> = {
  "1/64": TPB / 16,
  "1/48": TPB / 12,
  "1/32": TPB / 8,
  "1/24": TPB / 6,
  "1/16": TPB / 4,
  "1/12": TPB / 3,
  "1/8": TPB / 2,
  "1/6": (TPB * 2) / 3,
  "3/16": (TPB * 3) / 4,
  "1/4": TPB,
  "5/16": (TPB * 5) / 4,
  "1/3": (TPB * 4) / 3,
  "3/8": (TPB * 3) / 2,
  "1/2": TPB * 2,
  "3/4": TPB * 3,
  "1": TPB * 4,
  "1.5": TPB * 6,
  "2": TPB * 8,
  "3": TPB * 12,
  "4": TPB * 16,
  "6": TPB * 24,
  "8": TPB * 32,
  "16": TPB * 64,
  "32": TPB * 128,
};

function divisionToFrequency(division: NoteDivision, bpm: number): number {
  const ticksPerDivision = DIVISION_TO_TICKS[division];
  const beatsPerDivision = ticksPerDivision / TPB;
  const secondsPerDivision = beatsPerDivision * (60 / bpm);
  return 1 / secondsPerDivision;
}

type LFOSetterHooks = SetterHooks<ILFOProps>;

export class MonoLFO
  extends Module<ModuleType.LFO>
  implements
    Pick<
      LFOSetterHooks,
      | "onAfterSetMode"
      | "onAfterSetFrequency"
      | "onAfterSetDivision"
      | "onAfterSetWaveform"
      | "onAfterSetOffset"
      | "onAfterSetAmount"
    >
{
  declare audioNode: AudioWorkletNode;
  private offsetConstant!: ConstantSourceNode;
  private offsetGain!: GainNode;
  private amplitudeGain!: GainNode;
  private mixerGain!: GainNode;
  private amountGain!: GainNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.LFO>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) =>
      newAudioWorklet(context, CustomWorklet.LFOProcessor);

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.setupAudioGraph();
    this.setupBPMListener();
    this.registerOutputs();
    this.updateFrequency();
  }

  private setupAudioGraph() {
    const ctx = this.context.audioContext;

    // Create nodes
    this.offsetConstant = new ConstantSourceNode(ctx, { offset: 1 });
    this.offsetGain = new GainNode(ctx, { gain: 0 });
    this.amplitudeGain = new GainNode(ctx, { gain: 1 });
    this.mixerGain = new GainNode(ctx, { gain: 1 });
    this.amountGain = new GainNode(ctx, { gain: this.props.amount });

    // Set initial waveform
    const waveformIndex = Object.values(LFOWaveform).indexOf(
      this.props.waveform,
    );
    this.waveformParam.value = waveformIndex;

    // Apply offset calculation
    this.updateOffsetGains();

    // Connect audio graph:
    // LFO → amplitudeGain → mixerGain
    this.audioNode.connect(this.amplitudeGain);
    this.amplitudeGain.connect(this.mixerGain);

    // ConstantSource(1) → offsetGain → mixerGain
    this.offsetConstant.connect(this.offsetGain);
    this.offsetGain.connect(this.mixerGain);

    // mixerGain → amountGain → (output registered separately)
    this.mixerGain.connect(this.amountGain);

    // Start constant source
    this.offsetConstant.start();
  }

  private setupBPMListener() {
    this.engine.transport.addClockCallback(() => {
      if (this.props.mode === LFOMode.bpm) {
        this.updateFrequencyFromBPM();
      }
    });
  }

  private registerOutputs() {
    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.amountGain,
    });
  }

  private updateFrequency() {
    if (this.props.mode === LFOMode.free) {
      this.frequencyParam.value = this.props.frequency;
    } else {
      this.updateFrequencyFromBPM();
    }
  }

  private updateFrequencyFromBPM() {
    const bpm = this.engine.transport.bpm;
    const frequency = divisionToFrequency(this.props.division, bpm);
    this.frequencyParam.value = frequency;
  }

  private updateOffsetGains() {
    const offset = this.props.offset;
    // Formula: output = lfo_signal * (1 - |offset|/2) + offset/2
    const amplitude = 1 - Math.abs(offset) / 2;
    const dcOffset = offset / 2;

    this.amplitudeGain.gain.value = amplitude;
    this.offsetGain.gain.value = dcOffset;
  }

  get frequencyParam() {
    return this.audioNode.parameters.get("frequency")!;
  }

  get waveformParam() {
    return this.audioNode.parameters.get("waveform")!;
  }

  get phaseParam() {
    return this.audioNode.parameters.get("phase")!;
  }

  onAfterSetMode: LFOSetterHooks["onAfterSetMode"] = () => {
    this.updateFrequency();
  };

  onAfterSetFrequency: LFOSetterHooks["onAfterSetFrequency"] = (value) => {
    if (this.props.mode === LFOMode.free) {
      this.frequencyParam.value = value;
    }
  };

  onAfterSetDivision: LFOSetterHooks["onAfterSetDivision"] = () => {
    if (this.props.mode === LFOMode.bpm) {
      this.updateFrequencyFromBPM();
    }
  };

  onAfterSetWaveform: LFOSetterHooks["onAfterSetWaveform"] = (value) => {
    const waveformIndex = Object.values(LFOWaveform).indexOf(value);
    this.waveformParam.value = waveformIndex;
  };

  onAfterSetOffset: LFOSetterHooks["onAfterSetOffset"] = () => {
    this.updateOffsetGains();
  };

  onAfterSetAmount: LFOSetterHooks["onAfterSetAmount"] = (value) => {
    this.amountGain.gain.value = value;
  };

  dispose() {
    this.offsetConstant.stop();
    super.dispose();
  }
}

export default class LFO extends PolyModule<ModuleType.LFO> {
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.LFO>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.LFO>,
    ) => new MonoLFO(engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerDefaultIOs("out");
  }
}
