import { ContextTime } from "@blibliki/transport";
import {
  cancelAnimationFrame,
  Context,
  dbToGain,
  requestAnimationFrame,
} from "@blibliki/utils";
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

const LOW_GAIN = -18;
const MIN_COEFFICIENT_LENGTH = 2;
const MAX_HARMONICS = 128;
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
  disableNormalization: boolean;
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
  disableNormalization: {
    kind: "boolean",
    label: "Disable normalization",
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

const DEFAULT_TABLES: IWavetableTable[] = [
  { real: [0, 0], imag: [0, 0] },
  { real: [0, 0], imag: [0, 1] },
];

const DEFAULT_PROPS: IWavetableProps = {
  tables: DEFAULT_TABLES,
  position: 0,
  frequency: 440,
  fine: 0,
  coarse: 0,
  octave: 0,
  lowGain: false,
  disableNormalization: false,
};

type WavetableSetterHooks = Pick<
  SetterHooks<IWavetableProps>,
  | "onSetTables"
  | "onSetPosition"
  | "onAfterSetTables"
  | "onAfterSetPosition"
  | "onAfterSetDisableNormalization"
  | "onAfterSetFrequency"
  | "onAfterSetFine"
  | "onAfterSetCoarse"
  | "onAfterSetOctave"
  | "onAfterSetLowGain"
>;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const sanitizeCoefficients = (values: number[]): number[] => {
  const sanitized = values
    .map((value) => (Number.isFinite(value) ? value : 0))
    .slice(0, MAX_HARMONICS);

  if (sanitized.length >= MIN_COEFFICIENT_LENGTH) {
    return sanitized;
  }

  const padding = Array.from(
    { length: MIN_COEFFICIENT_LENGTH - sanitized.length },
    () => 0,
  );

  return [...sanitized, ...padding];
};

const normalizeCoefficientPair = (
  real: number[],
  imag: number[],
): { real: number[]; imag: number[] } => {
  const nextReal = sanitizeCoefficients(real);
  const nextImag = sanitizeCoefficients(imag);
  const targetLength = Math.max(nextReal.length, nextImag.length);
  const realPadding = Array.from(
    { length: targetLength - nextReal.length },
    () => 0,
  );
  const imagPadding = Array.from(
    { length: targetLength - nextImag.length },
    () => 0,
  );

  return {
    real: [...nextReal, ...realPadding],
    imag: [...nextImag, ...imagPadding],
  };
};

const sanitizeTable = (table: IWavetableTable): IWavetableTable => {
  const { real, imag } = normalizeCoefficientPair(table.real, table.imag);
  return { real, imag };
};

const sanitizeTables = (tables: IWavetableTable[]): IWavetableTable[] => {
  if (!tables.length) return DEFAULT_TABLES.map(sanitizeTable);

  return tables.map((table) => sanitizeTable(table));
};

const blendTables = (
  from: IWavetableTable,
  to: IWavetableTable,
  t: number,
): IWavetableTable => {
  const normalizedFrom = sanitizeTable(from);
  const normalizedTo = sanitizeTable(to);
  const length = Math.max(normalizedFrom.real.length, normalizedTo.real.length);

  const blend = (fromValues: number[], toValues: number[]) => {
    return Array.from({ length }, (_, index) => {
      const fromValue = fromValues[index] ?? 0;
      const toValue = toValues[index] ?? 0;
      return fromValue + (toValue - fromValue) * t;
    });
  };

  return {
    real: blend(normalizedFrom.real, normalizedTo.real),
    imag: blend(normalizedFrom.imag, normalizedTo.imag),
  };
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
  private positionAnimationFrame: number | null = null;

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

  onSetTables: WavetableSetterHooks["onSetTables"] = (tables) => {
    return sanitizeTables(tables);
  };

  onSetPosition: WavetableSetterHooks["onSetPosition"] = (value) => {
    return clamp(value, 0, 1);
  };

  onAfterSetTables: WavetableSetterHooks["onAfterSetTables"] = () => {
    this.applyPeriodicWave();
  };

  onAfterSetPosition: WavetableSetterHooks["onAfterSetPosition"] = (_value) => {
    if (!this.isStated) {
      this.smoothedPosition = clamp(this.props.position, 0, 1);
      this.applyPeriodicWave();
      return;
    }

    this.ensurePositionAnimation();
  };

  onAfterSetDisableNormalization: WavetableSetterHooks["onAfterSetDisableNormalization"] =
    () => {
      this.applyPeriodicWave();
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
    this.ensurePositionAnimation();
  }

  stop(time: ContextTime) {
    if (!this.isStated) return;

    this.stopPositionAnimation();
    this.audioNode.stop(time);
    this.rePlugAll(() => {
      this.audioNode = new OscillatorNode(this.context.audioContext, {
        frequency: this.finalFrequency,
      });
      this.applyOutputGain();
      this.detuneGain.connect(this.audioNode.detune);
      this.applyPeriodicWave();
    });

    this.isStated = false;
  }

  override dispose() {
    this.stopPositionAnimation();

    super.dispose();
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

  private updatePosition(): boolean {
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
    return true;
  }

  private ensurePositionAnimation() {
    if (this.positionAnimationFrame !== null) return;

    const tick = () => {
      this.updatePosition();
      this.positionAnimationFrame = requestAnimationFrame(tick);
    };

    this.positionAnimationFrame = requestAnimationFrame(tick);
  }

  private stopPositionAnimation() {
    if (this.positionAnimationFrame === null) return;

    cancelAnimationFrame(this.positionAnimationFrame);
    this.positionAnimationFrame = null;
  }

  getActualPosition() {
    return clamp(this.smoothedPosition, 0, 1);
  }

  private getInterpolatedTable(position: number): IWavetableTable {
    const tables = sanitizeTables(this.props.tables);
    if (tables.length === 1) return tables[0]!;

    const mapped = clamp(position, 0, 1) * (tables.length - 1);
    const startIndex = Math.floor(mapped);
    const endIndex = Math.min(startIndex + 1, tables.length - 1);
    const factor = mapped - startIndex;

    return blendTables(tables[startIndex]!, tables[endIndex]!, factor);
  }

  private applyPeriodicWave() {
    const processed = this.getInterpolatedTable(this.smoothedPosition);
    const periodicWave = this.context.audioContext.createPeriodicWave(
      new Float32Array(processed.real),
      new Float32Array(processed.imag),
      {
        disableNormalization: this.props.disableNormalization,
      },
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

export default class Wavetable extends PolyModule<ModuleType.Wavetable> {
  private state: IWavetableState = {
    actualPosition: DEFAULT_PROPS.position,
  };
  private stateAnimationFrame: number | null = null;

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

    this.registerInputs();
    this.registerDefaultIOs("out");
    this.startStateSync();
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

  override dispose() {
    this.stopStateSync();
    super.dispose();
  }

  private startStateSync() {
    if (this.stateAnimationFrame !== null) return;

    const tick = () => {
      this.syncStateFromVoices();
      this.stateAnimationFrame = requestAnimationFrame(tick);
    };

    this.stateAnimationFrame = requestAnimationFrame(tick);
  }

  private stopStateSync() {
    if (this.stateAnimationFrame === null) return;

    cancelAnimationFrame(this.stateAnimationFrame);
    this.stateAnimationFrame = null;
  }

  private syncStateFromVoices() {
    const firstVoice = this.audioModules[0] as MonoWavetable | undefined;
    const nextPosition = firstVoice
      ? firstVoice.getActualPosition()
      : clamp(this.props.position, 0, 1);

    if (Math.abs(this.state.actualPosition - nextPosition) < 0.0005) return;

    this.state = { actualPosition: nextPosition };
    this.engine._triggerPropsUpdate({
      id: this.id,
      moduleType: this.moduleType,
      voices: this.voices,
      name: this.name,
      props: this.props,
      state: this.state,
    });
  }

  private registerInputs() {
    this.registerAudioInput({ name: "detune" });
    this.registerAudioInput({ name: "position" });
  }
}
