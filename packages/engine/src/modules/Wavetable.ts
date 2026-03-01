import { ContextTime } from "@blibliki/transport";
import { Context, dbToGain } from "@blibliki/utils";
import {
  AnalyserNode,
  GainNode,
  OscillatorNode,
} from "@blibliki/utils/web-audio-api";
import { IModule, Module } from "@/core";
import { AudioInput } from "@/core/IO/AudioIO";
import Note from "@/core/Note";
import { IModuleConstructor, SetterHooks } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";
import {
  DEFAULT_WAVETABLE_TABLES,
  sanitizeWavetableTables,
  WavetablePeriodicWaveFactory,
} from "./WavetablePeriodicWaveFactory";

const LOW_GAIN = -18;
const POSITION_SMOOTHING_FACTOR = 0.25;
const POSITION_SMOOTHING_EPSILON = 0.0005;
const POSITION_MODULATION_SCALE = 0.5;
const POSITION_ANALYSER_FFT_SIZE = 32;

export type IWavetable = IModule<ModuleType.Wavetable>;
export type IWavetableDefinition = {
  real: number[];
  imag: number[];
};

export type IWavetableState = {
  actualPosition: number;
};

export type IWavetableTable = {
  real: number[];
  imag: number[];
};

export type IWavetableConfig = {
  tables: IWavetableTable[];
};

export type IWavetableProps = {
  tables: IWavetableTable[];
  position: number;
  frequency: number;
  fine: number;
  coarse: number;
  octave: number;
  lowGain: boolean;
};

export const wavetablePropSchema: ModulePropSchema<IWavetableProps> = {
  tables: {
    kind: "array",
    label: "Tables",
  },
  position: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.001,
    label: "Position",
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

const NUMBER_PATTERN = /-?\d*\.?\d+(?:e[+-]?\d+)?/gi;

const parseNumberArray = (arraySource: string): number[] => {
  const matches = arraySource.match(NUMBER_PATTERN);
  if (!matches) return [];

  return matches.map(Number).filter(Number.isFinite);
};

const extractArrayByKey = (source: string, key: "real" | "imag") => {
  const pattern = new RegExp(
    `["']?${key}["']?\\s*:\\s*\\[([\\s\\S]*?)\\]`,
    "i",
  );
  const match = source.match(pattern);
  if (!match) return undefined;

  return parseNumberArray(match[1] ?? "");
};

export const parseWavetableDefinition = (
  source: string,
): IWavetableDefinition => {
  const real = extractArrayByKey(source, "real");
  const imag = extractArrayByKey(source, "imag");

  if (!real || !imag) {
    throw new Error(
      "Wavetable definition must include both real and imag arrays",
    );
  }

  return {
    real,
    imag,
  };
};

export const formatWavetableDefinition = (
  definition: IWavetableDefinition,
): string => {
  const { real, imag } = definition;
  return JSON.stringify({ real, imag }, null, 2);
};

const TABLE_PATTERN =
  /["']?real["']?\s*:\s*\[([\s\S]*?)\]\s*,?\s*["']?imag["']?\s*:\s*\[([\s\S]*?)\]/gi;

export const parseWavetableConfig = (source: string): IWavetableConfig => {
  const tables: IWavetableTable[] = [];
  TABLE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = TABLE_PATTERN.exec(source);

  while (match) {
    const real = parseNumberArray(match[1] ?? "");
    const imag = parseNumberArray(match[2] ?? "");
    tables.push({ real, imag });
    match = TABLE_PATTERN.exec(source);
  }

  if (!tables.length) {
    throw new Error(
      "Wavetable config must include at least one table with real and imag arrays",
    );
  }

  return { tables };
};

export const formatWavetableConfig = (config: IWavetableConfig): string => {
  return JSON.stringify({ tables: config.tables }, null, 2);
};

const DEFAULT_TABLES: IWavetableTable[] = DEFAULT_WAVETABLE_TABLES.map(
  (table) => ({ real: [...table.real], imag: [...table.imag] }),
);

const DEFAULT_PROPS: IWavetableProps = {
  tables: DEFAULT_TABLES,
  position: 0,
  frequency: 440,
  fine: 0,
  coarse: 0,
  octave: 0,
  lowGain: false,
};

type WavetableSetterHooks = Pick<
  SetterHooks<IWavetableProps>,
  | "onSetPosition"
  | "onAfterSetTables"
  | "onAfterSetPosition"
  | "onAfterSetFrequency"
  | "onAfterSetFine"
  | "onAfterSetCoarse"
  | "onAfterSetOctave"
  | "onAfterSetLowGain"
>;

type PolyWavetableSetterHooks = Pick<
  SetterHooks<IWavetableProps>,
  "onSetTables"
>;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const transposeFrequency = ({
  frequency,
  coarse,
  octave,
  fine,
}: Pick<
  IWavetableProps,
  "frequency" | "coarse" | "octave" | "fine"
>): number => {
  return frequency * Math.pow(2, coarse / 12 + octave + fine / 12);
};

export class MonoWavetable
  extends Module<ModuleType.Wavetable>
  implements WavetableSetterHooks
{
  declare audioNode: OscillatorNode;
  isStated = false;
  outputGain: GainNode;
  detuneGain!: GainNode;
  positionControlInput!: GainNode;
  positionAnalyser!: AnalyserNode;
  positionInputIO!: AudioInput;
  positionBuffer: Float32Array;
  private smoothedPosition = DEFAULT_PROPS.position;

  constructor(engineId: string, params: ICreateModule<ModuleType.Wavetable>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    const audioNodeConstructor = (context: Context) =>
      new OscillatorNode(context.audioContext, {
        frequency: transposeFrequency(props),
      });

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.smoothedPosition = this.props.position;
    this.positionBuffer = new Float32Array(POSITION_ANALYSER_FFT_SIZE);

    this.outputGain = new GainNode(this.context.audioContext, {
      gain: dbToGain(LOW_GAIN),
    });

    this.applyOutputGain();
    this.initializeGainDetune();
    this.initializePositionControlInput();
    this.applyPeriodicWave();
    this.updateFrequency();
    this.registerInputs();
    this.registerOutputs();
  }

  onSetPosition: WavetableSetterHooks["onSetPosition"] = (value) => {
    const newValue = clamp(value, 0, 1);
    this.parentModule?.setActualPosition(newValue, this.voiceNo);

    return newValue;
  };

  onAfterSetTables: WavetableSetterHooks["onAfterSetTables"] = () => {
    this.applyPeriodicWave();
  };

  onAfterSetPosition: WavetableSetterHooks["onAfterSetPosition"] = (_value) => {
    if (!this.isStated) {
      this.applyPeriodicWave();
      return;
    }
  };

  onAfterSetFrequency: WavetableSetterHooks["onAfterSetFrequency"] = () => {
    this.updateFrequency();
  };

  onAfterSetFine: WavetableSetterHooks["onAfterSetFine"] = () => {
    this.updateFrequency();
  };

  onAfterSetCoarse: WavetableSetterHooks["onAfterSetCoarse"] = () => {
    this.updateFrequency();
  };

  onAfterSetOctave: WavetableSetterHooks["onAfterSetOctave"] = () => {
    this.updateFrequency();
  };

  onAfterSetLowGain: WavetableSetterHooks["onAfterSetLowGain"] = (lowGain) => {
    this.outputGain.gain.value = lowGain ? dbToGain(LOW_GAIN) : 1;
  };

  start(time: ContextTime) {
    if (this.isStated) return;

    this.isStated = true;
    this.audioNode.start(time);
    this.engine.transport.addClockCallback(this.updatePosition);
  }

  stop(time: ContextTime) {
    if (!this.isStated) return;

    this.audioNode.stop(time);
    this.rePlugAll(() => {
      this.audioNode = new OscillatorNode(this.context.audioContext, {
        frequency: this.finalFrequency,
      });
      this.applyOutputGain();
      this.detuneGain.connect(this.audioNode.detune);
      this.applyPeriodicWave();
    });

    this.engine.transport.removeClockCallback(this.updatePosition);
    this.isStated = false;
  }

  triggerAttack = (note: Note, triggeredAt: ContextTime) => {
    super.triggerAttack(note, triggeredAt);

    this._props.frequency = note.frequency;
    this.updateFrequency(triggeredAt);
    this.start(triggeredAt);
  };

  triggerRelease(note: Note, triggeredAt: ContextTime) {
    super.triggerRelease(note, triggeredAt);

    const lastNote = this.activeNotes.length
      ? this.activeNotes[this.activeNotes.length - 1]
      : null;
    if (!lastNote) return;

    this._props.frequency = lastNote.frequency;
    this.updateFrequency(triggeredAt);
  }

  private get finalFrequency(): number {
    return transposeFrequency(this.props);
  }

  private updateFrequency(actionAt?: ContextTime) {
    if (actionAt) {
      this.audioNode.frequency.setValueAtTime(this.finalFrequency, actionAt);
    } else {
      this.audioNode.frequency.value = this.finalFrequency;
    }
  }

  private initializePositionControlInput() {
    this.positionControlInput = new GainNode(this.context.audioContext, {
      gain: 1,
    });
    this.positionAnalyser = new AnalyserNode(this.context.audioContext, {
      fftSize: POSITION_ANALYSER_FFT_SIZE,
      smoothingTimeConstant: 0,
    });

    this.positionControlInput.connect(this.positionAnalyser);
  }

  private hasPositionModulation(): boolean {
    return this.positionInputIO.connections.length > 0;
  }

  private readPositionModulation(): number {
    if (!this.hasPositionModulation()) return 0;

    this.positionAnalyser.getFloatTimeDomainData(
      this.positionBuffer as Float32Array<ArrayBuffer>,
    );
    const sample = this.positionBuffer[this.positionBuffer.length - 1] ?? 0;
    if (!Number.isFinite(sample)) return 0;

    return sample * POSITION_MODULATION_SCALE;
  }

  private getCurrentTargetPosition(): number {
    return clamp(this.props.position + this.readPositionModulation(), 0, 1);
  }

  private updatePosition = (): boolean => {
    const nextPosition = this.getCurrentTargetPosition();
    const delta = nextPosition - this.smoothedPosition;

    if (Math.abs(delta) < POSITION_SMOOTHING_EPSILON) {
      if (Math.abs(nextPosition - this.smoothedPosition) > 0) {
        this.smoothedPosition = nextPosition;
        this.applyPeriodicWave();
      }
      return false;
    }

    this.smoothedPosition += delta * POSITION_SMOOTHING_FACTOR;
    this.applyPeriodicWave();
    this.parentModule?.setActualPosition(
      this.getActualPosition(),
      this.voiceNo,
    );
    return true;
  };

  getActualPosition() {
    return clamp(this.smoothedPosition, 0, 1);
  }

  private get periodicWaveFactory() {
    return this.parentModule!.periodicWaveFactory;
  }

  private applyPeriodicWave() {
    const periodicWave = this.periodicWaveFactory.getPeriodicWave(
      this.smoothedPosition,
    );
    this.audioNode.setPeriodicWave(periodicWave);
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

    this.positionInputIO = this.registerAudioInput({
      name: "position",
      getAudioNode: () => this.positionControlInput,
    });
  }

  private registerOutputs() {
    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.outputGain,
    });
  }
}

export default class Wavetable
  extends PolyModule<ModuleType.Wavetable>
  implements PolyWavetableSetterHooks
{
  periodicWaveFactory: WavetablePeriodicWaveFactory;

  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.Wavetable>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.Wavetable>,
    ) => Module.create(MonoWavetable, engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this._state = { actualPosition: props.position };

    this.periodicWaveFactory = new WavetablePeriodicWaveFactory({
      audioContext: this.context.audioContext,
      tables: this.props.tables,
      disableNormalization: false,
    });

    this.registerInputs();
    this.registerDefaultIOs("out");
  }

  onSetTables: PolyWavetableSetterHooks["onSetTables"] = (tables) => {
    const sanitizedTables = sanitizeWavetableTables(tables);
    this.periodicWaveFactory.setTables(sanitizedTables);

    return sanitizedTables;
  };

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

  setActualPosition(position: number, voiceNo: number) {
    if (voiceNo !== 0) return;

    const actualPosition = clamp(position, 0, 1);

    if (this._state.actualPosition === actualPosition) return;

    this._state = {
      ...this._state,
      actualPosition,
    };

    this.triggerPropsUpdate();
  }

  override dispose() {
    super.dispose();
  }

  private registerInputs() {
    this.registerAudioInput({ name: "detune" });
    this.registerAudioInput({ name: "position" });
  }
}
