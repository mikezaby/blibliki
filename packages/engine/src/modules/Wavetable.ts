import { ContextTime } from "@blibliki/transport";
import { Context, dbToGain } from "@blibliki/utils";
import { GainNode } from "@blibliki/utils/web-audio-api";
import { IModule, Module } from "@/core";
import Note from "@/core/Note";
import { IModuleConstructor, SetterHooks } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { ModulePropSchema } from "@/core/schema";
import { CustomWorklet, newAudioWorklet } from "@/processors";
import { ICreateModule, ModuleType } from ".";
import {
  DEFAULT_WAVETABLE_TABLES,
  sanitizeWavetableTables,
} from "./WavetablePeriodicWaveFactory";

const LOW_GAIN = -18;
const POSITION_MODULATION_SCALE = 0.5;
const POSITION_STATE_EPSILON = 0.0005;
const SET_TABLES_MESSAGE = "setTables";
const ACTUAL_POSITION_MESSAGE = "actualPosition";
const DEFAULT_PRESET_TABLE_COUNT = 16;
const DEFAULT_PRESET_HARMONIC_COUNT = 48;
const COEFFICIENT_TOLERANCE = 1e-6;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

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

export type IWavetablePreset = {
  id: string;
  name: string;
  description?: string;
  tables: IWavetableTable[];
};

type HarmonicShape = {
  tableCount?: number;
  harmonicCount?: number;
  amplitude: (harmonic: number, position: number) => number;
  phase?: (harmonic: number, position: number) => number;
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
    shortLabel: "tbls",
  },
  position: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.001,
    label: "Position",
    shortLabel: "pos",
  },
  frequency: {
    kind: "number",
    min: 0,
    max: 25000,
    step: 1,
    label: "Frequency",
    shortLabel: "freq",
  },
  fine: {
    kind: "number",
    min: -1,
    max: 1,
    step: 0.01,
    label: "Fine",
    shortLabel: "fine",
  },
  coarse: {
    kind: "number",
    min: -12,
    max: 12,
    step: 1,
    label: "Coarse",
    shortLabel: "crs",
  },
  octave: {
    kind: "number",
    min: -1,
    max: 2,
    step: 1,
    label: "Octave",
    shortLabel: "oct",
  },
  lowGain: {
    kind: "boolean",
    label: `Use ${LOW_GAIN}db Gain`,
    shortLabel: "low",
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

const createTablesFromShape = ({
  tableCount = DEFAULT_PRESET_TABLE_COUNT,
  harmonicCount = DEFAULT_PRESET_HARMONIC_COUNT,
  amplitude,
  phase,
}: HarmonicShape): IWavetableTable[] => {
  return Array.from({ length: tableCount }, (_, tableIndex) => {
    const position = tableCount > 1 ? tableIndex / (tableCount - 1) : 0;
    const real = Array.from({ length: harmonicCount + 1 }, () => 0);
    const imag = Array.from({ length: harmonicCount + 1 }, () => 0);

    for (let harmonic = 1; harmonic <= harmonicCount; harmonic += 1) {
      const amp = clamp(amplitude(harmonic, position), 0, 1);
      const currentPhase = phase ? phase(harmonic, position) : 0;

      real[harmonic] = amp * Math.sin(currentPhase);
      imag[harmonic] = amp * Math.cos(currentPhase);
    }

    return { real, imag };
  });
};

const PRESET_DEFINITIONS: (Omit<IWavetablePreset, "tables"> & HarmonicShape)[] =
  [
    {
      id: "warm-morph",
      name: "Warm Morph",
      description: "Sine to warm saw transition",
      amplitude: (harmonic, position) => {
        if (harmonic === 1) return 1;
        return (position * 0.75) / harmonic;
      },
    },
    {
      id: "triangle-bloom",
      name: "Triangle Bloom",
      description: "Odd harmonics with brightening tail",
      amplitude: (harmonic, position) => {
        if (harmonic % 2 === 0) return 0;
        const oddSlope = 1 / (harmonic * harmonic);
        return oddSlope * (1 + position * 1.8);
      },
    },
    {
      id: "saw-drive",
      name: "Saw Drive",
      description: "Progressive high-end saw growth",
      amplitude: (harmonic, position) => {
        const cutoff = 8 + Math.floor(position * 30);
        if (harmonic > cutoff) return 0;
        return (1 / harmonic) * (0.65 + position * 0.35);
      },
    },
    {
      id: "square-tilt",
      name: "Square Tilt",
      description: "Square base with evolving tilt",
      amplitude: (harmonic, position) => {
        if (harmonic % 2 === 0) return 0;
        return 1 / Math.pow(harmonic, 1.2 + position * 1.5);
      },
    },
    {
      id: "hollow-shift",
      name: "Hollow Shift",
      description: "Band-notch hollow movement",
      amplitude: (harmonic, position) => {
        const center = 6 + position * 18;
        const distance = Math.abs(harmonic - center);
        return (1 / harmonic) * (distance > 3 ? 1 : distance / 3);
      },
    },
    {
      id: "glass-bell",
      name: "Glass Bell",
      description: "Bell-like inharmonic shimmer",
      amplitude: (harmonic, position) => {
        const inharmonic = (Math.sin(harmonic * 1.7 + position * 4) + 1) * 0.5;
        return (inharmonic * (0.5 + position * 0.5)) / Math.sqrt(harmonic);
      },
      phase: (harmonic, position) =>
        harmonic * 0.14 + position * harmonic * 0.08,
    },
    {
      id: "drawbar-organ",
      name: "Drawbar Organ",
      description: "Organ-like additive mix",
      amplitude: (harmonic, position) => {
        const drawbars = [
          { harmonic: 1, level: 0.9 },
          { harmonic: 2, level: 0.45 + position * 0.2 },
          { harmonic: 3, level: 0.5 - position * 0.2 },
          { harmonic: 4, level: 0.2 + position * 0.25 },
          { harmonic: 6, level: 0.25 },
          { harmonic: 8, level: 0.15 + position * 0.25 },
        ];

        const match = drawbars.find((item) => item.harmonic === harmonic);
        return match?.level ?? 0;
      },
    },
    {
      id: "vowel-sweep",
      name: "Vowel Sweep",
      description: "Moving formant-inspired timbre",
      amplitude: (harmonic, position) => {
        const f1 = 4 + position * 4;
        const f2 = 10 + position * 8;
        const f3 = 18 + position * 10;
        const band =
          Math.exp(-Math.pow((harmonic - f1) / 2.8, 2)) * 0.8 +
          Math.exp(-Math.pow((harmonic - f2) / 3.6, 2)) * 0.55 +
          Math.exp(-Math.pow((harmonic - f3) / 4.2, 2)) * 0.35;

        return band / Math.pow(harmonic, 0.15);
      },
      phase: (harmonic, position) => position * harmonic * 0.05,
    },
    {
      id: "metal-edge",
      name: "Metal Edge",
      description: "Brighter metallic upper partials",
      amplitude: (harmonic, position) => {
        const emphasis = 0.3 + position * 0.7;
        return (
          (Math.pow(harmonic / DEFAULT_PRESET_HARMONIC_COUNT, 0.7) * emphasis) /
          2
        );
      },
      phase: (harmonic, position) => harmonic * 0.22 + position * 1.6,
    },
    {
      id: "chorus-strings-lite",
      name: "Chorus Strings Lite",
      description: "Soft ensemble-like spread",
      amplitude: (harmonic, position) => {
        if (harmonic === 1) return 1;

        const even = harmonic % 2 === 0 ? 1 : 0.75;
        const spread =
          0.6 + 0.4 * Math.sin(position * Math.PI * 2 + harmonic * 0.4);
        return (even * spread) / Math.pow(harmonic, 0.9);
      },
      phase: (harmonic, position) =>
        Math.sin(position * Math.PI * 2) * harmonic * 0.03,
    },
    {
      id: "phase-shatter",
      name: "Phase Shatter",
      description: "Quantized phase jumps with discontinuous harmonic blocks",
      tableCount: 20,
      amplitude: (harmonic, position) => {
        const step = Math.floor(position * 20);
        const block = step % 4;

        if (block === 0) {
          return harmonic <= 6 ? 1 / Math.max(1, harmonic * 0.9) : 0;
        }
        if (block === 1) {
          if (harmonic < 7 || harmonic > 16) return 0;
          return 0.95 / Math.max(1, harmonic - 6);
        }
        if (block === 2) {
          return harmonic % 2 === 0 ? 0.9 / Math.sqrt(harmonic) : 0;
        }

        return harmonic % 3 === 0 ? 0.85 / Math.max(1, harmonic / 2) : 0;
      },
      phase: (harmonic, position) => {
        const step = Math.floor(position * 20);
        return (step % 2 === 0 ? 0 : Math.PI) + harmonic * ((step % 5) * 0.18);
      },
    },
    {
      id: "comb-breaker",
      name: "Comb Breaker",
      description: "Moving comb notches with brutal bucket transitions",
      tableCount: 18,
      amplitude: (harmonic, position) => {
        const step = Math.floor(position * 18);
        const bucket = step % 6;

        if (harmonic % 6 === bucket) {
          return 0.02;
        }

        if (bucket % 2 === 0) {
          return harmonic % 2 === 0 ? 0.92 / Math.max(1, harmonic * 0.6) : 0;
        }

        return harmonic % 2 === 1 ? 0.92 / Math.max(1, harmonic * 0.55) : 0;
      },
      phase: (harmonic, position) => {
        const step = Math.floor(position * 18);
        const polarity = step % 3 === 0 ? 1 : -1;
        return polarity * harmonic * 0.3;
      },
    },
    {
      id: "mirror-jumps",
      name: "Mirror Jumps",
      description: "Alternating mirrored spectra per-step",
      tableCount: 22,
      amplitude: (harmonic, position) => {
        const step = Math.floor(position * 22);
        const mirroredHarmonic = 49 - harmonic;
        const isEven = step % 2 === 0;

        if (isEven) {
          return harmonic <= 12 ? 0.95 / harmonic : 0;
        }

        if (mirroredHarmonic <= 12) {
          return 0.95 / Math.max(1, mirroredHarmonic);
        }

        return 0;
      },
      phase: (harmonic, position) => {
        const step = Math.floor(position * 22);
        return step % 2 === 0 ? harmonic * 0.04 : Math.PI - harmonic * 0.04;
      },
    },
  ];

export const WAVETABLE_PRESETS: IWavetablePreset[] = PRESET_DEFINITIONS.map(
  (preset) => {
    return {
      id: preset.id,
      name: preset.name,
      description: preset.description,
      tables: createTablesFromShape(preset),
    };
  },
);

export const cloneWavetablePresetTables = (
  tables: IWavetableTable[],
): IWavetableTable[] => {
  return tables.map((table) => ({
    real: [...table.real],
    imag: [...table.imag],
  }));
};

export const getWavetablePresetById = (
  presetId: string,
): IWavetablePreset | undefined => {
  return WAVETABLE_PRESETS.find((preset) => preset.id === presetId);
};

const areArraysEquivalent = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;

  return a.every((value, index) => {
    return Math.abs(value - b[index]!) <= COEFFICIENT_TOLERANCE;
  });
};

const areTablesEquivalent = (
  a: IWavetableTable[],
  b: IWavetableTable[],
): boolean => {
  if (a.length !== b.length) return false;

  return a.every((table, index) => {
    const other = b[index];
    if (!other) return false;

    return (
      areArraysEquivalent(table.real, other.real) &&
      areArraysEquivalent(table.imag, other.imag)
    );
  });
};

export const getWavetablePresetIdByTables = (
  tables: IWavetableTable[],
): string | undefined => {
  return WAVETABLE_PRESETS.find((preset) =>
    areTablesEquivalent(preset.tables, tables),
  )?.id;
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

type WavetableProcessorMessage = {
  type: string;
  value?: unknown;
};

export class MonoWavetable
  extends Module<ModuleType.Wavetable>
  implements WavetableSetterHooks
{
  declare audioNode: AudioWorkletNode;
  private isStarted = false;
  private outputGain: GainNode;
  private detuneGain: GainNode;
  private positionModulationGain: GainNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.Wavetable>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    const audioNodeConstructor = (context: Context) => {
      const node = newAudioWorklet(context, CustomWorklet.WavetableProcessor);
      node.parameters.get("frequency")!.value = transposeFrequency(props);
      node.parameters.get("detune")!.value = 0;
      node.parameters.get("position")!.value = clamp(props.position, 0, 1);
      node.parameters.get("active")!.value = 0;
      return node;
    };

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.outputGain = new GainNode(this.context.audioContext, {
      gain: props.lowGain ? dbToGain(LOW_GAIN) : 1,
    });
    this.detuneGain = new GainNode(this.context.audioContext, {
      gain: 100,
    });
    this.positionModulationGain = new GainNode(this.context.audioContext, {
      gain: POSITION_MODULATION_SCALE,
    });

    this.audioNode.connect(this.outputGain);
    this.detuneGain.connect(this.detuneParam);
    this.positionModulationGain.connect(this.positionParam);

    this.audioNode.port.onmessage = this.onProcessorMessage;
    this.sendTablesToProcessor(this.props.tables);
    this.updateFrequency();
    this.registerInputs();
    this.registerOutputs();
  }

  onSetPosition: WavetableSetterHooks["onSetPosition"] = (value) => {
    return clamp(value, 0, 1);
  };

  onAfterSetTables: WavetableSetterHooks["onAfterSetTables"] = (tables) => {
    this.sendTablesToProcessor(tables);
  };

  onAfterSetPosition: WavetableSetterHooks["onAfterSetPosition"] = (value) => {
    this.positionParam.value = value;
    if (!this.isStarted) {
      this.parentModule?.setActualPosition(value, this.voiceNo);
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
    if (this.isStarted) return;

    this.activeParam.setValueAtTime(1, time);
    this.isStarted = true;
  }

  stop(time: ContextTime) {
    if (!this.isStarted) return;

    this.activeParam.setValueAtTime(0, time);
    this.isStarted = false;
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

  override dispose(): void {
    this.audioNode.port.onmessage = null;
    super.dispose();
  }

  private get finalFrequency(): number {
    return transposeFrequency(this.props);
  }

  private get frequencyParam() {
    return this.audioNode.parameters.get("frequency")!;
  }

  private get detuneParam() {
    return this.audioNode.parameters.get("detune")!;
  }

  private get positionParam() {
    return this.audioNode.parameters.get("position")!;
  }

  private get activeParam() {
    return this.audioNode.parameters.get("active")!;
  }

  private updateFrequency(actionAt?: ContextTime) {
    if (actionAt) {
      this.frequencyParam.setValueAtTime(this.finalFrequency, actionAt);
      return;
    }

    this.frequencyParam.value = this.finalFrequency;
  }

  private sendTablesToProcessor(tables: IWavetableTable[]) {
    this.audioNode.port.postMessage({
      type: SET_TABLES_MESSAGE,
      tables: sanitizeWavetableTables(tables),
    });
  }

  private onProcessorMessage = (event: MessageEvent<unknown>) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;

    const message = data as WavetableProcessorMessage;
    if (message.type !== ACTUAL_POSITION_MESSAGE) return;
    if (typeof message.value !== "number") return;

    this.parentModule?.setActualPosition(message.value, this.voiceNo);
  };

  private registerInputs() {
    this.registerAudioInput({
      name: "detune",
      getAudioNode: () => this.detuneGain,
    });

    this.registerAudioInput({
      name: "position",
      getAudioNode: () => this.positionModulationGain,
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

    this._state = { actualPosition: clamp(props.position, 0, 1) };

    this.registerInputs();
    this.registerDefaultIOs("out");
  }

  onSetTables: PolyWavetableSetterHooks["onSetTables"] = (tables) => {
    return sanitizeWavetableTables(tables);
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
    if (
      Math.abs(this._state.actualPosition - actualPosition) <
      POSITION_STATE_EPSILON
    ) {
      return;
    }

    this._state = {
      ...this._state,
      actualPosition,
    };

    this.triggerPropsUpdate();
  }

  private registerInputs() {
    this.registerAudioInput({ name: "detune" });
    this.registerAudioInput({ name: "position" });
  }
}
